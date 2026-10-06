document.addEventListener('DOMContentLoaded', () => {
    const weatherHeaderElement = document.getElementById('header-weather');
    const weatherDisplayElement = document.getElementById('weather-display');
    const recommendationElement = document.getElementById(
        'clothing-recommendation'
    );
    const sceneGridElement = document.getElementById('scene-buttons-grid');
    const sceneCardTemplate = document.getElementById('scene-card-template'); // Get template
    const quickActionsGridElement = document.getElementById('quick-actions-grid'); // Get quick actions grid
    const statusListElement = document.getElementById('status-items-list'); // Get status list element
    const activityLogListElement = document.getElementById('activity-log-list'); // Get activity log list element

    // --- 天气图标映射 (示例，需要根据 API 返回的 icon 代码调整) ---
    // 您可能需要一个更完整的映射或使用天气图标字体库
    const weatherIconMap = {
        '01d': '☀️',
        '01n': '🌙', // 晴朗
        '02d': '🌤️',
        '02n': '☁️', // 少云
        '03d': '☁️',
        '03n': '☁️', // 多云
        '04d': '☁️',
        '04n': '☁️', // 阴
        '09d': '🌧️',
        '09n': '🌧️', // 阵雨
        '10d': '🌦️',
        '10n': '🌧️', // 雨
        '11d': '⛈️',
        '11n': '⛈️', // 雷暴
        '13d': '❄️',
        '13n': '❄️', // 雪
        '50d': '🌫️',
        '50n': '🌫️', // 雾
        // 添加更多映射...
    };

    // --- 新函数：渲染所有天气相关信息 ---
    function renderWeatherInfo(weatherData) {
        const weatherIcon = weatherData
            ? weatherIconMap[weatherData.icon] || '❔'
            : '❔';

        // 1. 更新页首天气
        if (weatherHeaderElement) {
            if (weatherData) {
                weatherHeaderElement.innerHTML = `
                    <span class="weather-icon">${weatherIcon}</span>
                    <span class="weather-temp">${weatherData.temp}°C</span>
                    <span class="weather-location">${weatherData.location}</span>
                `;
            } else {
                weatherHeaderElement.textContent = '天气 N/A';
            }
        }

        // 2. 更新详细天气显示
        if (weatherDisplayElement) {
            if (weatherData) {
                weatherDisplayElement.innerHTML = `
                    <h3>${weatherData.location} 天气</h3>
                    <p><span class="weather-icon-large">${weatherIcon}</span> ${weatherData.description}, 温度 ${weatherData.temp}°C</p>
                `;
            } else {
                weatherDisplayElement.innerHTML = '<p>无法加载天气信息。</p>';
            }
        }

        // 3. 更新穿衣建议
        if (recommendationElement) {
            let recommendation = '无法获取穿衣建议。'; // Default error/loading message
            if (weatherData) {
                const temp = weatherData.temp;
                if (temp > 28) {
                    recommendation =
                        '天气炎热，建议穿着轻薄透气的衣物，如短袖、短裤。';
                } else if (temp > 22) {
                    recommendation =
                        '天气温暖舒适，建议穿着 T 恤、薄长裤或连衣裙。';
                } else if (temp > 15) {
                    recommendation =
                        '天气凉爽，建议穿着长袖衬衫、薄外套或针织衫。';
                } else if (temp > 8) {
                    recommendation =
                        '天气较冷，建议穿着毛衣、夹克或风衣，注意保暖。';
                } else {
                    recommendation =
                        '天气寒冷，建议穿着厚毛衣、羽绒服或棉衣，做好防寒措施。';
                }
                recommendationElement.innerHTML = `<p><strong>穿衣建议:</strong> ${recommendation}</p>`;
            } else {
                recommendationElement.innerHTML = `<p>${recommendation}</p>`;
            }
        }
    }

    // 从同源后端获取天气，API 密钥仅由服务端读取。
    async function fetchWeather() {
        try {
            const response = await fetch('/api/weather');
            if (!response.ok) throw new Error(`天气接口错误: ${response.status}`);
            const data = await response.json();
            if (!data || !Number.isFinite(data.temp) || !data.description) {
                throw new Error('Invalid data structure received from weather API');
            }
            renderWeatherInfo({
                location: data.location || '哈尔滨',
                temp: Math.round(data.temp),
                description: data.description,
                icon: data.icon || ''
            });
        } catch (error) {
            console.error('获取或处理天气失败:', error);
            renderWeatherInfo(null);
            if (weatherDisplayElement) {
                const message = document.createElement('p');
                message.style.color = 'red';
                message.style.fontSize = '0.8em';
                message.textContent = `错误: ${error.message}`;
                weatherDisplayElement.appendChild(message);
            }
        }
    }

    // --- 获取场景摘要数据并更新 UI ---
    async function fetchSceneSummary() {
        if (!sceneGridElement || !sceneCardTemplate) {
            console.error('Scene grid or template not found.');
            return;
        }
        sceneGridElement.innerHTML = '<p>正在加载场景信息...</p>'; // 清空并显示载入提示

        try {
            const response = await fetch('/api/dashboard-summary');
            if (!response.ok) throw new Error('场景摘要数据获取失败');
            const summaries = await response.json();

            sceneGridElement.innerHTML = ''; // 清空载入提示

            const sceneMap = {
                livingroom: { name: '客厅', icon: '🛋️' },
                bedroom: { name: '卧室', icon: '🛏️' },
                bathroom: { name: '卫生间', icon: '🛁' },
                balcony: { name: '阳台', icon: '☀️' }, // Assuming balcony icon is sun
            };

            summaries.forEach((summary) => {
                const sceneInfo = sceneMap[summary.scene] || {
                    name: summary.scene,
                    icon: '🏠',
                };
                const statusClass =
                    summary.status === '正常' ? 'status-ok' : 'status-error';
                const tempText =
                    summary.temp !== null ? `${summary.temp}°C` : '--°C'; // Add unit back
                const humidityText =
                    summary.humidity !== null ? `${summary.humidity}%` : '--%'; // Add unit back

                // Clone the template content
                const cardFragment = sceneCardTemplate.content.cloneNode(true);

                // Get elements within the cloned fragment
                const linkElement =
                    cardFragment.querySelector('.scene-card-link');
                const iconElement = cardFragment.querySelector('.button-icon');
                const statusElement =
                    cardFragment.querySelector('.scene-status');
                const statusTextElement = statusElement.querySelector('span');
                const nameElement = cardFragment.querySelector('.button-text');
                const tempElement = cardFragment.querySelector('.temp-data');
                const humidityElement =
                    cardFragment.querySelector('.humidity-data');

                // Populate the cloned elements
                if (linkElement) {
                    linkElement.href = `${summary.scene}.html`;
                    linkElement.dataset.scene = summary.scene;
                }
                if (iconElement) iconElement.textContent = sceneInfo.icon;
                if (statusElement) {
                    statusElement.className = `scene-status ${statusClass}`;
                    if (statusTextElement)
                        statusTextElement.textContent = summary.status;
                }
                if (nameElement) nameElement.textContent = sceneInfo.name;
                if (tempElement) tempElement.textContent = tempText;
                if (humidityElement) humidityElement.textContent = humidityText;

                // Append the populated card to the grid
                sceneGridElement.appendChild(cardFragment);
            });
        } catch (error) {
            console.error('获取场景摘要失败:', error);
            if (sceneGridElement)
                sceneGridElement.innerHTML =
                    '<p style="color: red;">无法加载场景信息。</p>';
        }
    }

    // --- 模拟获取系统状态数据 --- 改回前端模拟数据
    async function fetchSystemStatus() {
        console.log('Using mock data for system status.');
        // Simulate a slight delay for realistic loading feel (optional)
        // await new Promise(resolve => setTimeout(resolve, 150)); 

        // Mock data
        return [
            {
                id: 'network',
                icon: '✔️',
                label: '网络连接',
                value: '正常',
                statusClass: 'status-ok',
            },
            {
                id: 'database',
                icon: '💾',
                label: '数据库服务',
                value: '正常',
                statusClass: 'status-ok',
            },
            {
                id: 'security',
                icon: '🔒',
                label: '安全系统',
                value: '设防',
                statusClass: 'status-ok',
            },
             {
                id: 'last_checked',
                icon: '⏱️',
                label: '最后检查时间',
                value: new Date().toLocaleTimeString('zh-CN'), 
                statusClass: 'status-info', 
            },
        ];
    }

    // --- 渲染系统状态列表 ---
    function renderSystemStatus(statusData) {
        if (!statusListElement) {
            console.error('Status list element not found.');
            return;
        }

        statusListElement.innerHTML = ''; // Clear loading message

        if (!statusData || statusData.length === 0) {
            statusListElement.innerHTML = '<p>无法获取系统状态。</p>';
            return;
        }

        statusData.forEach((item) => {
            const statusDiv = document.createElement('div');
            statusDiv.className = `status-item ${item.statusClass || ''}`;
            statusDiv.innerHTML = `
                <span class="status-icon">${item.icon || '-'}</span>
                <span class="status-label">${item.label}</span>
                <span class="status-value">${item.value}</span>
            `;
            statusListElement.appendChild(statusDiv);
        });
    }

    // --- 添加快捷操作按钮 (目前是静态占位符) ---
    function loadQuickActions() {
        if (!quickActionsGridElement) {
            console.error('Quick actions grid not found.');
            return;
        }

        quickActionsGridElement.innerHTML = ''; // Clear loading message

        // 示例数据 (未来应从配置或 API 获取)
        const actions = [
            {
                id: 'livingroom-main-light',
                icon: '💡',
                label: '客厅主灯',
                status: '关',
            },
            {
                id: 'bedroom-ac',
                icon: '💨',
                label: '卧室空调',
                status: '24°C',
                active: true,
            },
            {
                id: 'all-lights-off',
                icon: '🚫',
                label: '关所有灯',
                status: '执行',
            },
            {
                id: 'balcony-curtain',
                icon: '🌅',
                label: '阳台窗帘',
                status: '开',
                active: true,
            },
        ];

        actions.forEach((action) => {
            const button = document.createElement('button');
            button.className = 'quick-action-button';
            if (action.active) {
                button.classList.add('active');
            }
            button.dataset.deviceId = action.id;
            button.innerHTML = `
                <span class="qa-icon">${action.icon}</span>
                <span class="qa-label">${action.label}</span>
                <span class="qa-status">${action.status}</span>
            `;

            // 添加点击事件监听器 (未来实现具体操作)
            button.addEventListener('click', () => {
                console.log(`Quick action clicked: ${action.id}`);
                // 在这里添加调用 API 控制设备的逻辑
                // 例如： toggleDeviceState(action.id);
                // 为了演示，可以简单地切换 active 状态和显示文字
                button.classList.toggle('active');
                const statusElement = button.querySelector('.qa-status');
                if (statusElement) {
                    statusElement.textContent =
                        statusElement.textContent === '开' ||
                        statusElement.textContent === '执行'
                            ? '关'
                            : '开';
                }
            });

            quickActionsGridElement.appendChild(button);
        });
    }

    // Function to handle status toggles - Implement Expand/Collapse
    function setupStatusToggle() {
        const statusArea = document.querySelector('.system-status-area');
        const statusTitle = statusArea?.querySelector('.status-title'); // Use optional chaining

        if (statusArea && statusTitle) {
             // Start collapsed by default (optional)
            statusArea.classList.add('collapsed');

            statusTitle.addEventListener('click', () => {
                statusArea.classList.toggle('collapsed');
                console.log('System status toggled');
            });
            // Make the title clickable
            statusTitle.style.cursor = 'pointer';
            console.log('Status toggle setup complete.');
        } else {
            console.warn('Could not find status area or title for toggle setup.');
        }
    }

    // --- 模拟获取活动日誌 --- (Moved Inside DOMContentLoaded)
    async function fetchActivityLog() {
        // TODO: Replace with actual API call to /api/activity-log
        console.log('Fetching activity log (mock data)...');
        await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate delay

        // Mock data - more realistic entries
        return [
            {
                id: 'log001',
                icon: '💡',
                message: '客厅主灯已开启',
                time: '下午 6:30',
            },
            {
                id: 'log002',
                icon: '🚪',
                message: '前门已上锁',
                time: '上午 8:05',
            },
            {
                id: 'log003',
                icon: '🌡️',
                message: '卧室温度达到 22°C',
                time: '昨天 10:15',
            },
            {
                id: 'log004',
                icon: '💧',
                message: '侦测到卫生间漏水！',
                time: '3 小时前',
            },
            {
                id: 'log005',
                icon: '🌅',
                message: '阳台窗帘已关闭',
                time: '下午 7:00',
            },
             {
                id: 'log006',
                icon: '🤖',
                message: '扫地机器人开始清洁',
                time: '下午 2:00',
            },
        ];
    }

    // --- 渲染活动日志列表 --- (Moved Inside DOMContentLoaded)
    function renderActivityLog(logData) {
        if (!activityLogListElement) {
            console.error('Activity log list element not found.');
            return;
        }

        activityLogListElement.innerHTML = ''; // Clear loading

        if (!logData || logData.length === 0) {
            activityLogListElement.innerHTML = '<p>暂无活动记录。</p>';
            return;
        }

        logData.forEach((item) => {
            const logDiv = document.createElement('div');
            logDiv.className = 'log-item';
            logDiv.innerHTML = `
                <span class="log-icon">${item.icon || '🔔'}</span>
                <span class="log-message">${item.message}</span>
                <span class="log-time">${item.time}</span>
            `;
            activityLogListElement.appendChild(logDiv);
        });
    }

    // --- 初始化加载 ---
    // Listen for header ready event to fetch weather (if header exists)
    document.addEventListener('headerReady', fetchWeather, { once: true });
    // If header might already be ready or doesn't exist, also try fetching immediately
    if(document.querySelector('.app-header')) fetchWeather();

    // Fetch and render system status
    fetchSystemStatus()
        .then(renderSystemStatus)
        .catch((error) => {
            console.error('获取或渲染系统状态时出错:', error);
            // Explicitly call renderSystemStatus with null to display the error message inside the function
            renderSystemStatus(null);
        });

    // Fetch and render activity log
    fetchActivityLog()
        .then(renderActivityLog)
        .catch((error) => {
            console.error('渲染活动记录失败:', error);
            if (activityLogListElement)
                activityLogListElement.innerHTML =
                    '<p style="color:red;">无法加载活动记录。</p>';
        });

    setupStatusToggle(); // Setup the toggle functionality
    loadQuickActions(); // Load quick actions
    fetchSceneSummary();
});

// --- 模拟获取活动日誌 --- (Remove from here)
/* async function fetchActivityLog() { ... } */

// --- 渲染活动日志列表 --- (Remove from here)
/* function renderActivityLog(logData) { ... } */
