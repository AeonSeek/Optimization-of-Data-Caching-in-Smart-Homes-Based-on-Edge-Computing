document.addEventListener('DOMContentLoaded', async () => {
    const deviceList = document.getElementById('device-list');
    const sceneName = document.body.getAttribute('data-scene');
    const deviceCardTemplate = document.getElementById('device-card-template'); // Get template

    const CACHE_DURATION_MS = 60 * 1000; // 缓存有效时间：60 秒

    if (!sceneName || !deviceList || !deviceCardTemplate) {
        console.error('无法获取场景名称、设备列表元素或设备卡片模板。');
        if (deviceList)
            deviceList.innerHTML = '<p style="color: red;">页面加载错误。</p>';
        return;
    }

    // --- 根据设备类型获取图标 (Emoji) ---
    function getDeviceIcon(type) {
        // 使用 toLowerCase() 确保匹配不区分大小写
        switch (type.toLowerCase()) {
            // --- Restore Traditional Chinese keys alongside Simplified ---
            case '空调': // Simplified
            case '空調': // Traditional
                return '💨';
            case '电视': // Simplified
            case '電視': // Traditional
                return '📺';
            case '冰箱': // Simplified (Same)
                return '🧊';
            case '电动窗帘': // Simplified
            case '電動窗簾': // Traditional
                return '🪜'; // 没有完美的窗帘 emoji
            case '智能锁': // Simplified
            case '智能鎖': // Traditional
                return '🔒';
            case '投影仪': // Simplified
            case '投影儀': // Traditional
                return '📽️';
            case '热水器': // Simplified
            case '熱水器': // Traditional
                return '🚿';
            case '智能马桶': // Simplified
            case '智能馬桶': // Traditional
                return '🚽';
            case '洗衣机': // Simplified
            case '洗衣機': // Traditional
                return '🧺';
            case '智能晾衣杆': // Simplified
            case '智能晾衣桿': // Traditional
                return '☀️'; // 用太阳代替
            case '灯': // Simplified
            case '燈': // Traditional
                 return '💡';
             case '风扇': // Simplified
             case '風扇': // Traditional
                 return '🌬️';
             case '浴霸': // Simplified (Same)
                 return '🔥'; // 暂时用火
             case '植物监测仪': // Simplified
             case '植物監測儀': // Traditional
                 return '🌿';
            default:
                return '⚙️'; // 默认图标
        }
    }

    // --- 格式化时间戳 ---
    function formatTime(timestamp) {
        try {
            // 对于模拟数据或无效时间戳，提供默认值
            if (!timestamp || new Date(timestamp).toString() === 'Invalid Date') {
                 return '--:--';
            }
            return new Date(timestamp).toLocaleTimeString('zh-CN', {
                timeZone: 'Asia/Shanghai', // 或者 'Asia/Shanghai', 根据需要调整
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch (e) {
            console.error('格式化时间出错:', e);
            return 'N/A';
        }
    }

    // --- 渲染设备列表的函数 (使用 Template) ---
    function renderDeviceList(devices) {
        deviceList.innerHTML = ''; // 清空现有内容
        if (devices && devices.length > 0) {
            devices.forEach((device) => {
                const cardFragment = deviceCardTemplate.content.cloneNode(true);
                const deviceElement = cardFragment.querySelector('.device');
                const iconElement =
                    cardFragment.querySelector('.device-icon span');
                const nameElement =
                    cardFragment.querySelector('.device-info h3');
                const statusElement =
                    cardFragment.querySelector('.device-status');
                const detailsContainer =
                    cardFragment.querySelector('.device-details');
                const lastUpdatedElement =
                    cardFragment.querySelector('.last-updated span');

                if (
                    !deviceElement ||
                    !iconElement ||
                    !nameElement ||
                    !statusElement ||
                    !detailsContainer ||
                    !lastUpdatedElement
                ) {
                    console.error('设备卡片模板结构错误。');
                    return; // Skip this device if template is broken
                }

                // -- 添加设备 ID 和类型 --
                // 确保 device.id 和 device.type 存在且有效
                 if (device && device.id) {
                     deviceElement.dataset.deviceId = device.id;
                 } else {
                     console.warn("设备缺少 ID:", device);
                     // 可能需要跳过此设备或提供默认值
                 }
                 if (device && device.type) {
                     deviceElement.dataset.deviceType = device.type; // 存储原始类型名称（可能是中文）
                 } else {
                      console.warn("设备缺少类型:", device);
                      // 可能需要跳过此设备或提供默认值
                 }

                // --- Debug Log for TV device data ---
                if (device.type && (device.type.includes('电视') || device.type.includes('電視'))) {
                    console.log('[renderDeviceList] 处理潜在的电视设备:', JSON.stringify(device));
                }
                // ------

                // 填充基本信息
                iconElement.textContent = getDeviceIcon(device.type || ''); // 传递类型给图标函数
                nameElement.textContent = device.name || '未知设备'; // Simplified

                let statusText = '离线'; // 默认状态
                let isActive = false; // 默认非活动状态

                // 清空模板中的详细信息占位符 (保留 last-updated)
                // More robustly remove only elements before .last-updated
                 const childrenToRemove = [];
                 let currentNode = detailsContainer.firstChild;
                 while (currentNode && !currentNode.classList?.contains('last-updated')) {
                     childrenToRemove.push(currentNode);
                     currentNode = currentNode.nextSibling;
                 }
                 childrenToRemove.forEach(node => detailsContainer.removeChild(node));


                if (device.data && typeof device.data === 'object') {
                    // --- 提取主要状态 ---
                    // 更灵活地查找状态信息，优先特定关键字
                    let mainStatusFound = false;
                    const statusKeywords = ['状态', '开关', '电源', '模式']; // 优先查找这些
                    for (const keyword of statusKeywords) {
                        if (device.data[keyword] !== undefined) {
                            statusText = String(device.data[keyword]); // 确保是字符串
                             // 特殊处理布尔值状态
                             if (typeof device.data[keyword] === 'boolean') {
                                 statusText = device.data[keyword] ? '开启' : '关闭';
                             }
                             // 附加单位（如果需要）
                             if (keyword.includes('温度')) statusText += ' °C';
                             if (keyword.includes('亮度')) statusText += ' %';
                            mainStatusFound = true;
                            break;
                        }
                    }
                     // 如果没找到优先关键字，尝试使用第一个属性，但排除ID/Name/Type等元数据
                     if (!mainStatusFound) {
                         const metaKeys = ['id', 'name', 'type', 'last_updated']; // Keys to ignore for status
                         for (const key in device.data) {
                             if (!metaKeys.includes(key.toLowerCase())) {
                                 statusText = `${key}: ${device.data[key]}`;
                                  if (key.includes('温度') || key.includes('湿度') || key.includes('亮度')) {
                                     const unit = key.includes('温度') ? '°C' : '%';
                                     statusText = `${device.data[key]} ${unit}`;
                                 }
                                 mainStatusFound = true;
                                 break;
                             }
                         }
                     }
                     if (!mainStatusFound) { statusText = '未知状态'; } // 最终默认

                    // --- 判断是否为活动状态 ---
                    const activeStatusKeywords = ['开', '开启', '制热', '制冷', '播放中', '运行中', '锁定', '设防', 'on', true];
                    // 检查状态文本或特定属性值
                    isActive = activeStatusKeywords.some(keyword =>
                         (typeof statusText === 'string' && statusText.includes(keyword)) ||
                         (typeof keyword === 'boolean' && device.data['状态'] === keyword) ||
                         (device.data['status'] === 'on') // Check common 'status' field
                    );


                    // --- 添加详细数据到 detailsContainer ---
                    const lastUpdatedNode =
                        detailsContainer.querySelector('.last-updated');
                    for (const key in device.data) {
                        // 避免重复显示已用作主状态的简单状态 (如 "状态: 开")
                         if (mainStatusFound && statusKeywords.includes(key) && typeof device.data[key] !== 'object') {
                           // Optionally add simple status here too if needed, or skip
                            // continue;
                         }
                         if (key === 'status' && typeof device.data[key] === 'string') continue; // Skip simple status field if already handled

                        let value = device.data[key];
                        let unit = '';
                        if (key.includes('温度') || key.includes('座圈温度')) unit = ' °C';
                        if (key.includes('亮度') || key.includes('湿度') || key.includes('电量')) unit = ' %';

                        // 对布尔值进行转换
                         if (typeof value === 'boolean') {
                             value = value ? '是' : '否'; // 或者 '开启'/'关闭'
                         }

                        const detailP = document.createElement('p');
                        // 格式化 key，例如 "targetTemperature" -> "目标温度" (可选，需要翻译函数)
                        const formattedKey = key; // Replace with translation if available
                        detailP.innerHTML = `<span class="data-key">${formattedKey}:</span> <span class="data-value">${value}${unit}</span>`;
                        // Insert before the last-updated node if it exists
                        if (lastUpdatedNode) {
                            detailsContainer.insertBefore(detailP, lastUpdatedNode);
                        } else {
                             detailsContainer.appendChild(detailP); // Fallback if no last-updated node
                        }
                    }
                } else if (typeof device.data === 'string' && device.data) {
                    statusText = device.data; // 如果 data 是简单字符串
                    const activeStatusKeywords = ['开', '开启', '制热', '制冷', '播放中', '运行中', '锁定', '设防', 'on'];
                    isActive = activeStatusKeywords.some(keyword => statusText.includes(keyword));
                }

                statusElement.textContent = statusText;
                lastUpdatedElement.textContent = formatTime(device.last_updated);

                // --- 添加 active class ---
                if(isActive && deviceElement) {
                    deviceElement.classList.add('active');
                } else if (deviceElement) {
                    deviceElement.classList.remove('active'); // Ensure inactive state is set
                }


                // --- 添加点击监听器 ---
                if(deviceElement) {
                    /* // --- Debug Log for listener attachment (Keep commented for now) ---
                     if (device.type && (device.type.includes('电视') || device.type.includes('電視'))) {
                        console.log('[renderDeviceList] 为电视设备元素添加点击监听器:', deviceElement);
                    }
                    // ------ */
                    deviceElement.addEventListener('click', handleDeviceClick);
                }

                deviceList.appendChild(cardFragment);
            });
        } else {
            deviceList.innerHTML = '<p>此场景目前没有设备数据。</p>';
        }
    }

    // --- 处理设备卡片点击事件 (已修复) ---
    function handleDeviceClick(event) {
        const card = event.currentTarget;
        const deviceId = card.dataset.deviceId;
        const deviceType = card.dataset.deviceType; // 这是从 dataset 获取的，可能是中文
        const currentScene = document.body.dataset.scene;

        // --- Debugging Logs ---
        console.log('[handleDeviceClick] 点击卡片数据:', {
             deviceId,
             deviceType,
             currentScene
         });
        // ------

        if (!deviceId || !deviceType || !currentScene) {
            console.error('设备卡片或 body 缺少用于导航的数据属性。', card.dataset);
            return;
        }

        let targetUrl = null;

        // --- REMOVED: Hardcoded logic for Bedroom AC and Curtain ---
        // The fallback logic below will now handle all cases using relative paths.
        /*
        if (currentScene === 'bedroom') {
            // Check for both Simplified and Traditional Chinese names
            if (deviceType === '空调' || deviceType === '空調') {
                targetUrl = `file:///C:/Users/16418/Desktop/smart_home_16/public/html/air_conditioner_bedroom.html?deviceId=${deviceId}`;
                console.log('[handleDeviceClick] Hardcoded ABSOLUTE navigation for Bedroom AC:', targetUrl);
            } else if (deviceType === '电动窗帘' || deviceType === '電動窗簾') {
                targetUrl = `file:///C:/Users/16418/Desktop/smart_home_16/public/html/curtain_bedroom.html?deviceId=${deviceId}`;
                console.log('[handleDeviceClick] Hardcoded ABSOLUTE navigation for Bedroom Curtain:', targetUrl);
            }
        }
        */
        // --- END: REMOVED --- 

        // --- 构建目标 URL (Fallback logic now handles all cases) ---
        // if (!targetUrl) { // No longer needed as we removed the hardcoded part
            const targetFileName = getTargetFileName(deviceType, currentScene); // 调用辅助函数

            // --- Debugging Logs ---
            console.log('[handleDeviceClick] 生成的目标文件名:', targetFileName);
            // ------

            if (targetFileName) {
                // Use relative path generated by getTargetFileName
                 targetUrl = `${targetFileName}?deviceId=${deviceId}`;
            }
        // }


        if (targetUrl) {
            console.log(`导航到: ${targetUrl}`);
            window.location.href = targetUrl; // 执行跳转
        } else {
            console.warn(`未为场景 '${currentScene}' 中的设备类型 '${deviceType}' 定义目标页面`);
            alert(`尚未为 ${deviceType} 设置控制页面。`);
        }
    }

    // --- 新增：获取目标文件名的辅助函数 ---
    function getTargetFileName(deviceType, scene) {
        // No need for typeLower here as we check exact matches in mapping
        const sceneLower = scene?.toLowerCase() || '';

        // 定义映射规则 (中文类型 -> 英文基础名)
        // ** IMPORTANT: Restore both Simplified and Traditional keys **
        const mapping = {
            '电视': 'television',         // Simplified
            '電視': 'television',         // Traditional (Restored)
            '空调': 'air_conditioner',    // Simplified
            '空調': 'air_conditioner',    // Traditional (Restored)
            '冰箱': 'refrigerator',       // Simplified (Same)
            '洗衣机': 'washing_machine',  // Simplified
            '洗衣機': 'washing_machine',  // Traditional (Restored)
            '智能晾衣杆': 'drying_rack', // Simplified
            '智能晾衣桿': 'drying_rack', // Traditional (Restored)
            '灯': 'light',               // Simplified
            '燈': 'light',               // Traditional (Restored)
            '风扇': 'fan',               // Simplified
            '風扇': 'fan',               // Traditional (Restored)
            '智能马桶': 'toilet',         // Simplified
            '智能馬桶': 'toilet',         // Traditional (Restored)
            '热水器': 'water_heater',     // Simplified
            '熱水器': 'water_heater',     // Traditional (Restored)
            '电动窗帘': 'curtain',        // Simplified
            '電動窗簾': 'curtain',        // Traditional (Restored)
            '智能锁': 'lock',             // Simplified
            '智能鎖': 'lock',             // Traditional (Restored)
            '投影仪': 'projector',        // Simplified
            '投影儀': 'projector',        // Traditional (Restored)
            '植物监测仪': 'plant_monitor',// Simplified
            '植物監測儀': 'plant_monitor',// Traditional (Restored)
            '浴霸': 'heater',            // Simplified (Same)
            // 根据需要添加更多设备类型...
        };

        const baseName = mapping[deviceType]; // 使用原始中文名匹配

        if (baseName) {
            // 标准化文件名格式: type_scene.html
            return `${baseName}_${sceneLower}.html`;
        } else {
            console.warn(`无法将设备类型 '${deviceType}' 映射到文件名基础。`);
            return null;
        }
    }

    // --- 控制设备函数 (可能不再需要) ---
    // async function controlDevice(deviceId, deviceCardElement) { ... }


    // --- 加载数据逻辑 (与您提供的一致) ---
    async function loadSceneData() {
        const cacheKey = `sceneData_${sceneName}`;
        const cachedDataString = sessionStorage.getItem(cacheKey);
        let isDataFromCache = false;

        if (cachedDataString) {
            try {
                const cachedData = JSON.parse(cachedDataString);
                const now = Date.now();
                if (
                    cachedData &&
                    cachedData.timestamp &&
                    now - cachedData.timestamp < CACHE_DURATION_MS
                ) {
                    console.log(
                        `从 sessionStorage 加载场景 [${sceneName}] 的缓存数据。`
                    );
                    // deviceList.innerHTML = '<p>正在从缓存加载设备数据...</p>'; // 避免闪烁
                    renderDeviceList(cachedData.devices);
                    isDataFromCache = true;
                } else {
                    console.log(`场景 [${sceneName}] 的缓存已过期或无效。`);
                    sessionStorage.removeItem(cacheKey);
                }
            } catch (e) {
                console.error('解析缓存数据时出错:', e);
                sessionStorage.removeItem(cacheKey);
            }
        }

        // 如果没有从缓存加载，或者缓存已过期，则从服务器获取
        if (!isDataFromCache) {
            deviceList.innerHTML = '<p>正在从服务器加载设备数据...</p>';
            try {
                console.log(`从 API 获取场景 [${sceneName}] 的数据。`);
                const response = await fetch(`/api/scene/${sceneName}`);
                if (!response.ok) {
                     console.warn(`获取 /api/scene/${sceneName} 失败，尝试 /api/devices?scene=${sceneName}`);
                     const response2 = await fetch(`/api/devices?scene=${sceneName}`);
                      if (!response2.ok) {
                           throw new Error(`HTTP 错误！状态: ${response2.status}`);
                      }
                      const devices = await response2.json();
                      // Log the received data
                      console.log(`[loadSceneData] 从 /api/devices?scene=${sceneName} 接收到的数据:`, JSON.stringify(devices, null, 2)); 
                      renderDeviceList(devices);
                      const dataToCache = { devices: devices, timestamp: Date.now() };
                      sessionStorage.setItem(cacheKey, JSON.stringify(dataToCache));
                      console.log(`场景 [${sceneName}] 的数据(来自/api/devices)已存入 sessionStorage。`);

                } else {
                    const devices = await response.json();
                    // Log the received data
                    console.log(`[loadSceneData] 从 /api/scene/${sceneName} 接收到的数据:`, JSON.stringify(devices, null, 2));
                    renderDeviceList(devices);
                    const dataToCache = { devices: devices, timestamp: Date.now() };
                    sessionStorage.setItem(cacheKey, JSON.stringify(dataToCache));
                    console.log(`场景 [${sceneName}] 的数据(来自/api/scene)已存入 sessionStorage。`);
                }

            } catch (error) {
                console.error('获取场景数据时出错:', error);
                 console.warn("加载设备失败，尝试显示模拟设备数据...");
                 displayMockDevices(sceneName);
            }
        }
    }

     // --- 显示模拟设备 (新增) ---
     function displayMockDevices(scene) {
         console.log(`显示场景的模拟设备: ${scene}`);
         let mockDevices = [];
         // 根据场景生成不同的模拟设备
         switch(scene) {
             case 'livingroom':
                 mockDevices = [
                     { id: 'lr-ac-1', name: '客厅空调', type: '空调', data: { '状态': '关闭', '温度': 24 } },
                     { id: 'lr-tv-1', name: '客厅电视', type: '电视', data: { '状态': '关闭' } },
                     { id: 'lr-curtain-1', name: '客厅窗帘', type: '电动窗帘', data: { '状态': '打开', '位置': 100 } },
                     { id: 'lr-fridge-1', name: '客厅冰箱', type: '冰箱', data: { '状态': '运行中' } },
                      { id: 'lr-lock-1', name: '客厅门锁', type: '智能锁', data: { '状态': '已上锁' } },
                 ];
                 break;
             case 'bedroom':
                 mockDevices = [
                     { id: 'br-ac-1', name: '卧室空调', type: '空调', data: { '状态': '睡眠', '温度': 26 } },
                     { id: 'br-projector-1', name: '卧室投影仪', type: '投影仪', data: { '状态': '关闭' } },
                     { id: 'br-curtain-1', name: '卧室窗帘', type: '电动窗帘', data: { '状态': '关闭', '位置': 0 } },
                     { id: 'br-light-1', name: '卧室顶灯', type: '灯', data: { '状态': '关闭' } },
                 ];
                 break;
              case 'bathroom':
                 mockDevices = [
                     { id: 'btr-light-1', name: '卫生间灯', type: '灯', data: { '状态': '关闭' } },
                     { id: 'btr-fan-1', name: '卫生间换气扇', type: '风扇', data: { '状态': '关闭' } },
                     { id: 'btr-wh-1', name: '卫生间热水器', type: '热水器', data: { '状态': '关闭', '目标温度': 45 } },
                     { id: 'btr-toilet-1', name: '智能马桶', type: '智能马桶', data: { '状态': '待机', '座圈加热': '关闭' } },
                 ];
                 break;
              case 'balcony':
                 mockDevices = [
                      // { id: 'bal-plant-1', name: '阳台植物监测', type: '植物监测仪', data: { '湿度': 65, '光照': 800 } },
                      // { id: 'bal-light-1', name: '阳台灯', type: '灯', data: { '状态': '关闭' } },
                      // --- Added Mock Data for Balcony Devices ---
                      { id: 'bal-wm-1', name: '阳台洗衣机', type: '洗衣机', data: { '状态': '待机', '模式': '标准洗' } },
                      { id: 'bal-dr-1', name: '智能晾衣杆', type: '智能晾衣杆', data: { '状态': '收起', '灯': '关闭' } },
                      // You can still include others if needed:
                      // { id: 'bal-light-1', name: '阳台灯', type: '灯', data: { '状态': '关闭' } },
                 ];
                 break;
             default:
                  mockDevices = [{ id: 'mock-generic', name: '模拟设备', type: '未知', data: {'信息': '无'} }];
         }
         // 添加 last_updated 属性
         mockDevices.forEach(d => d.last_updated = Date.now() - Math.random() * 60000);
         renderDeviceList(mockDevices);
         deviceList.innerHTML += '<p style="color: orange; font-size: 0.8em; text-align: center; margin-top: 10px;">注意：当前显示的是模拟数据。</p>';
     }


    // --- 更新单个设备卡片视觉效果 (与您提供的一致) ---
    function updateDeviceCardVisuals(deviceId, newStateData) {
        const deviceCard = document.querySelector(`.device[data-device-id="${deviceId}"]`);
        if (!deviceCard) {
            console.warn(`Card not found for device ID to update: ${deviceId}`);
            return;
        }

        const iconElement = deviceCard.querySelector('.device-icon span');
        const statusElement = deviceCard.querySelector('.device-status');
        const detailsContainer = deviceCard.querySelector('.device-details'); // Get details container

        let statusText = '未知';
        let isActive = false;
        const activeStatusKeywords = ['开', '开启', '制热', '制冷', '播放中', '运行中', '锁定', '设防', 'on', true];

         // Clear old details first (before last-updated)
         const childrenToRemove = [];
         let currentNode = detailsContainer.firstChild;
         while (currentNode && !currentNode.classList?.contains('last-updated')) {
             childrenToRemove.push(currentNode);
             currentNode = currentNode.nextSibling;
         }
         childrenToRemove.forEach(node => detailsContainer.removeChild(node));

        if (newStateData && typeof newStateData === 'object') {
            // Simplified status determination (assuming '状态' or 'status' primarily)
             if (newStateData['状态'] !== undefined) {
                 statusText = String(newStateData['状态']);
                  if (typeof newStateData['状态'] === 'boolean') {
                      statusText = newStateData['状态'] ? '开启' : '关闭';
                  }
             } else if (newStateData['status'] !== undefined) {
                 statusText = String(newStateData['status']);
                  if (typeof newStateData['status'] === 'boolean') {
                       statusText = newStateData['status'] ? '开启' : '关闭';
                  } else if (newStateData['status'] === 'on') {
                       statusText = '开启';
                  } else if (newStateData['status'] === 'off') {
                       statusText = '关闭';
                  }
             } else if (newStateData['模式'] !== undefined) {
                 statusText = String(newStateData['模式']);
             } else {
                 // Fallback to first key if no primary status found
                 const firstKey = Object.keys(newStateData)[0];
                 if(firstKey) statusText = `${firstKey}: ${newStateData[firstKey]}`;
             }


            // Determine active state
             isActive = activeStatusKeywords.some(keyword =>
                 (typeof statusText === 'string' && statusText.includes(String(keyword))) || // Compare string part
                 (typeof keyword === 'boolean' && newStateData['状态'] === keyword) ||
                 (newStateData['status'] === 'on')
             );
            const acActiveModes = ['制热', '制冷', '除湿'];
             if (newStateData['模式'] && acActiveModes.includes(newStateData['模式'])) {
                 isActive = true;
             }


            // Re-add details
            const lastUpdatedNode = deviceCard.querySelector('.last-updated');
             for (const key in newStateData) {
                // Skip simple status keys already displayed as main status
                 if ((key === '状态' || key === 'status') && typeof newStateData[key] !== 'object') continue;
                 if (key === '模式' && typeof newStateData[key] === 'string') continue;

                let value = newStateData[key];
                let unit = '';
                 if (key.includes('温度') || key.includes('座圈温度')) unit = ' °C';
                 if (key.includes('亮度') || key.includes('湿度') || key.includes('电量') || key.includes('位置')) unit = ' %';
                 if (typeof value === 'boolean') value = value ? '是' : '否';

                const detailP = document.createElement('p');
                detailP.innerHTML = `<span class="data-key">${key}:</span> <span class="data-value">${value}${unit}</span>`;
                 if (lastUpdatedNode) {
                     detailsContainer.insertBefore(detailP, lastUpdatedNode);
                 } else {
                      detailsContainer.appendChild(detailP);
                 }
            }

        } else if (typeof newStateData === 'string') {
             statusText = newStateData;
             isActive = activeStatusKeywords.some(keyword => statusText.includes(String(keyword)));
        }

        if (statusElement) {
            statusElement.textContent = statusText;
        }

        if (isActive) {
            deviceCard.classList.add('active');
        } else {
            deviceCard.classList.remove('active');
        }
         console.log(`更新设备 ${deviceId} 的视觉效果: 活动=${isActive}, 状态=${statusText}`);
    }


    // --- 切换到深色主题 (与您提供的一致) ---
    function switchToDarkThemeIfNeeded() {
        const body = document.body;
        if (!body.classList.contains('dark-theme')) {
            console.log('由于场景模式切换到深色主题...');
            body.classList.add('dark-theme');
            localStorage.setItem('smartHomeTheme', 'dark');
            const themeToggleButton = document.getElementById('theme-toggle-button');
             if(themeToggleButton) {
                 // Update theme toggle visual state here if needed
             }
        }
    }

    // --- 执行场景模式函数 (与您提供的一致) ---
    async function executeSceneMode(modeId) {
        console.log(`执行场景模式: ${modeId}`);
        const sceneModeButton = document.querySelector(`button[data-mode-id="${modeId}"]`);
        if(sceneModeButton) {
            sceneModeButton.disabled = true;
            sceneModeButton.style.opacity = '0.7';
            sceneModeButton.innerHTML += ' <span class="spinner"></span>'; // Add spinner
        }

        // --- Simulation ---
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random()*1000)); // Simulate network delay
        const success = Math.random() > 0.15;
        let updatedDevices = [];

        if (success) {
            console.log(`场景模式 ${modeId} 执行成功 (模拟).`);
            // --- Simulate specific device state changes based on modeId ---
            // Simplified - just use generic success message for now
            alert(`场景模式 ${modeId} 执行成功 (模拟)`);
            // Reload data to reflect changes after success
             await loadSceneData();


        } else {
            console.error(`执行场景模式 ${modeId} 失败 (模拟)`);
            alert(`执行场景模式 ${modeId} 失败 (模拟)`);
        }
        if(sceneModeButton) {
            sceneModeButton.disabled = false;
            sceneModeButton.style.opacity = '1';
             const spinner = sceneModeButton.querySelector('.spinner');
             if (spinner) spinner.remove(); // Remove spinner
        }
    }


    // --- 添加场景模式按钮监听 ---
    function setupSceneModeButtons() {
        const modeButtons = document.querySelectorAll('.scene-mode-button');
        if (modeButtons.length > 0) {
            modeButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const modeId = button.dataset.modeId;
                    if (!button.disabled) { // Prevent double clicks
                         executeSceneMode(modeId);
                    }
                });
            });
            console.log(`已添加 ${modeButtons.length} 个场景模式按钮监听器。`);
        } else {
            console.log('此页面上未找到场景模式按钮。');
        }
    }

    loadSceneData();
    setupSceneModeButtons(); // Call the setup function
});
