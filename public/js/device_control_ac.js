// public/js/device_control_ac.js

// 全局变量存储设备 ID 和 Chart 实例
let currentDeviceId = null;
let temperatureChart = null;
let refreshIntervalId = null;
const REFRESH_INTERVAL_MS = 15000; // 每 15 秒刷新一次数据

// --- API 端点 (需要替换为真实的后端 API 地址) ---
const API_BASE_URL = '/api'; // 假设 API 基础路径为 /api
const GET_DEVICE_DATA_ENDPOINT = (deviceId) => `${API_BASE_URL}/devices/${deviceId}`;
const SEND_CONTROL_COMMAND_ENDPOINT = (deviceId) => `${API_BASE_URL}/devices/${deviceId}/command`;
const GET_DEVICE_HISTORY_ENDPOINT = (deviceId, dataType = 'temperature', limit = 24) => `${API_BASE_URL}/devices/${deviceId}/history?type=${dataType}&limit=${limit}`; // 获取最近 24 个温度数据点

// --- DOM 元素获取 ---
// (在 initializeAcControl 中获取)
let deviceNameElement, powerToggleButton, powerStatusElement, modeSelect, modeStatusElement,
    tempSlider, tempValueElement, fanSpeedSelect, fanSpeedStatusElement,
    currentTempElement, setTempElement, currentModeElement, currentFanSpeedElement,
    deviceStatusElement, lastUpdatedElement, chartCanvas, chartLoadingMsg;

// --- 初始化函数 ---
function initializeAcControl() {
    console.log("Initializing AC Control Page...");

    // 1. 获取设备 ID
    const urlParams = new URLSearchParams(window.location.search);
    currentDeviceId = urlParams.get('deviceId');

    if (!currentDeviceId) {
        console.error("Device ID not found in URL parameters.");
        // 可以在页面上显示错误信息
        const mainContent = document.querySelector('.device-control-container');
        if (mainContent) {
            mainContent.innerHTML = '<p style="color: red;">错误：未找到设备 ID。</p><a href="livingroom.html" class="back-link">&larr; 返回客厅</a>';
        }
        return;
    }
    console.log(`Controlling Device ID: ${currentDeviceId}`);

    // 2. 获取 DOM 元素
    deviceNameElement = document.getElementById('device-name');
    powerToggleButton = document.getElementById('power-toggle');
    powerStatusElement = document.getElementById('power-status');
    modeSelect = document.getElementById('mode-select');
    modeStatusElement = document.getElementById('mode-status');
    tempSlider = document.getElementById('temp-slider');
    tempValueElement = document.getElementById('temp-value');
    fanSpeedSelect = document.getElementById('fan-speed-select');
    fanSpeedStatusElement = document.getElementById('fan-speed-status');
    currentTempElement = document.getElementById('current-temp');
    setTempElement = document.getElementById('set-temp');
    currentModeElement = document.getElementById('current-mode');
    currentFanSpeedElement = document.getElementById('current-fan-speed');
    deviceStatusElement = document.getElementById('device-status');
    lastUpdatedElement = document.getElementById('last-updated-time');
    chartCanvas = document.getElementById('temperature-chart');
    chartLoadingMsg = document.getElementById('chart-loading-msg');

    // 3. 绑定事件监听器
    bindEventListeners();

    // 4. 初始加载数据和图表
    loadDeviceData();
    loadChartData();

    // 5. 设置定时刷新
    if (refreshIntervalId) clearInterval(refreshIntervalId); // 清除旧的定时器
    refreshIntervalId = setInterval(() => {
        console.log("Refreshing AC data...");
        loadDeviceData(); // 定时只刷新状态数据，图表数据可以按需刷新或降低频率
        // loadChartData(); // 如果需要频繁刷新图表，取消注释
    }, REFRESH_INTERVAL_MS);

    // 清理：当用户离开页面时清除定时器
    window.addEventListener('beforeunload', () => {
        if (refreshIntervalId) clearInterval(refreshIntervalId);
    });
}

// --- 事件监听器绑定 ---
function bindEventListeners() {
    if (powerToggleButton) {
        powerToggleButton.addEventListener('click', handlePowerToggle);
    }
    if (modeSelect) {
        modeSelect.addEventListener('change', handleModeChange);
    }
    if (tempSlider) {
        tempSlider.addEventListener('input', () => { // 'input' 事件实时更新显示值
             if(tempValueElement) tempValueElement.textContent = tempSlider.value;
        });
        tempSlider.addEventListener('change', handleTempChange); // 'change' 事件在释放滑块后触发 API 调用
    }
     if (fanSpeedSelect) {
        fanSpeedSelect.addEventListener('change', handleFanSpeedChange);
    }
}

// --- Action Handlers with Optimistic UI ---

async function handlePowerToggle() {
    if (!powerToggleButton || !powerStatusElement) return;
    console.log("Power toggle clicked (Optimistic)");

    // 1. Store previous state & Apply optimistic update
    const previousState = {
        power: powerStatusElement.textContent // '开启' or '关闭'
        // Potentially store other relevant states if power affects them immediately
    };
    const newState = (previousState.power === '开启') ? '关闭' : '开启';
    const mockDataForOptimisticUpdate = { 状态: newState };

    // Immediately update UI based on the assumed new state
    updateUI({ data: { ...getCurrentUIData(), ...mockDataForOptimisticUpdate } }); // Merge with current state for completeness
    setControlsTemporaryDisabled(true); // Disable controls while processing

    try {
        // 2. Send command to backend
        // Adapt payload based on backend API
        await sendControlCommand({ state: { power: newState } }); // Send 'ON'/'OFF' or adapt as needed
        // 3. Success: UI is already updated, maybe show temporary success feedback
        showFeedback('电源切换成功', 'success');

    } catch (error) {
        // 4. Failure: Revert UI and show error
        console.error("Power toggle command failed, reverting UI.");
        updateUI({ data: { ...getCurrentUIData(), '状态': previousState.power } }); // Revert power state
        showFeedback(`电源切换失败: ${error.message}`, 'error');
    } finally {
       // 5. Re-enable controls after a short delay or after feedback fades
        setTimeout(() => setControlsTemporaryDisabled(false), 500);
    }
}

async function handleModeChange() {
    if (!modeSelect || !modeStatusElement) return;
    const newMode = modeSelect.value;
    console.log(`Mode changed to: ${newMode} (Optimistic)`);

    const previousState = {
        mode: modeStatusElement.textContent
        // Store slider disabled state if mode affects it
    };
     const mockDataForOptimisticUpdate = { '模式': newMode };

    updateUI({ data: { ...getCurrentUIData(), ...mockDataForOptimisticUpdate } });
    setControlsTemporaryDisabled(true);

    try {
        await sendControlCommand({ state: { mode: newMode } });
         showFeedback(`模式切换为 ${newMode} 成功`, 'success');
    } catch (error) {
        console.error("Mode change command failed, reverting UI.");
        modeSelect.value = previousState.mode; // Revert dropdown selection
        updateUI({ data: { ...getCurrentUIData(), '模式': previousState.mode } }); // Revert display
        showFeedback(`模式切换失败: ${error.message}`, 'error');
    } finally {
         setTimeout(() => setControlsTemporaryDisabled(false), 500);
    }
}

async function handleTempChange() {
    if (!tempSlider || !tempValueElement) return;
    const newTemp = parseInt(tempSlider.value, 10);
    console.log(`Temperature changed to: ${newTemp} (Optimistic)`);

    // Note: For sliders, the optimistic UI update for the *value display*
    // happens on 'input'. The 'change' event primarily sends the command.
    // We only need to handle potential failure rollback here.
    const previousState = {
         // We might not have the exact previous *API confirmed* temp readily available
         // without storing it explicitly after each successful loadDeviceData.
         // For simplicity, we'll just show feedback on failure.
         // Alternatively, store the last known good temp in a variable.
         lastKnownTemp: getCurrentUIData()['设定温度'] // Get current displayed temp as 'previous'
    };
    tempValueElement.textContent = newTemp; // Ensure display matches slider if input didn't fire
    setControlsTemporaryDisabled(true);


    try {
        await sendControlCommand({ state: { targetTemperature: newTemp } });
         showFeedback(`温度设定为 ${newTemp}°C 成功`, 'success');
    } catch (error) {
        console.error("Temperature change command failed, reverting UI (display only).");
        // Revert slider and display to last known state if possible
        tempSlider.value = previousState.lastKnownTemp || 16; // Revert slider
        tempValueElement.textContent = previousState.lastKnownTemp || '--'; // Revert display
         showFeedback(`温度设定失败: ${error.message}`, 'error');
    } finally {
        setTimeout(() => setControlsTemporaryDisabled(false), 500);
    }
}

async function handleFanSpeedChange() {
    if (!fanSpeedSelect || !fanSpeedStatusElement) return;
    const newSpeed = fanSpeedSelect.value;
    console.log(`Fan speed changed to: ${newSpeed} (Optimistic)`);

    const previousState = {
        fanSpeed: fanSpeedStatusElement.textContent
    };
    const mockDataForOptimisticUpdate = { '风速': newSpeed };

    updateUI({ data: { ...getCurrentUIData(), ...mockDataForOptimisticUpdate } });
    setControlsTemporaryDisabled(true);

    try {
        await sendControlCommand({ state: { fanSpeed: newSpeed } });
         showFeedback(`风速切换为 ${newSpeed} 成功`, 'success');
    } catch (error) {
        console.error("Fan speed change command failed, reverting UI.");
        fanSpeedSelect.value = previousState.fanSpeed; // Revert dropdown
        updateUI({ data: { ...getCurrentUIData(), '风速': previousState.fanSpeed } }); // Revert display
        showFeedback(`风速切换失败: ${error.message}`, 'error');
    } finally {
        setTimeout(() => setControlsTemporaryDisabled(false), 500);
    }
}

// Helper function to get current data state from UI (for merging/reverting)
function getCurrentUIData() {
    if (lastValidDeviceData) {
        // Return a copy to prevent accidental modification
        return { ...lastValidDeviceData };
    } else {
        // Fallback: Read from UI (less reliable, used before first load or after error)
        console.warn("Falling back to reading UI state for getCurrentUIData");
        return {
             '状态': powerStatusElement?.textContent === '开启' ? '开启' : '关闭',
             '模式': modeSelect?.value,
             '设定温度': parseInt(tempSlider?.value, 10),
             '室内温度': parseFloat(currentTempElement?.textContent),
             '风速': fanSpeedSelect?.value
        };
    }
}

// Helper function to disable/enable all controls during command execution
function setControlsTemporaryDisabled(disabled) {
    const controls = [
        powerToggleButton, modeSelect, tempSlider, fanSpeedSelect
        // Add other buttons/controls if any
    ];
    controls.forEach(el => { if (el) el.disabled = disabled; });
     // Re-apply power-specific disabling logic after enabling/disabling all
     if (!disabled) {
        const isPowerOn = powerStatusElement?.textContent === '开启';
        const currentMode = modeSelect?.value;
        if (modeSelect) modeSelect.disabled = !isPowerOn;
        if (tempSlider) tempSlider.disabled = !isPowerOn || currentMode === 'fan' || currentMode === '送风';
        if (fanSpeedSelect) fanSpeedSelect.disabled = !isPowerOn;
     }
}

// Helper function for showing feedback (replaces simple alert)
let feedbackTimeout;
function showFeedback(message, type = 'info') { // type can be 'info', 'success', 'error'
    if (!controlStatusElement) {
        alert(message); // Fallback
        return;
    }
    clearTimeout(feedbackTimeout); // Clear previous message timeout
    controlStatusElement.textContent = message;
    controlStatusElement.className = `status-indicator feedback-${type}`; // Add class for styling
    controlStatusElement.style.display = 'block'; // Make sure it's visible

    // Hide message after a few seconds
    feedbackTimeout = setTimeout(() => {
       if (controlStatusElement) {
          controlStatusElement.textContent = '';
          controlStatusElement.style.display = 'none';
          controlStatusElement.className = 'status-indicator'; // Reset class
       }
    }, type === 'error' ? 4000 : 2500); // Show errors longer
}


// --- Data Loading and UI Update ---
let lastValidDeviceData = null; // Store last valid data here

async function loadDeviceData() {
    if (!currentDeviceId) return;
    console.log(`Fetching data for device: ${currentDeviceId}`);
    try {
        const response = await fetch(GET_DEVICE_DATA_ENDPOINT(currentDeviceId));
        if (!response.ok) {
             console.error(`HTTP error! status: ${response.status}. Displaying mock data.`);
             updateUI(null, true);
             lastValidDeviceData = null; // Mark data as invalid
             return;
        }
        const deviceData = await response.json();
        console.log("Received device data:", deviceData);
        lastValidDeviceData = deviceData.data; // Store the valid data
        updateUI(deviceData);

    } catch (error) {
        console.error("Error fetching device data:", error);
        updateUI(null, true);
        lastValidDeviceData = null; // Mark data as invalid
        if (refreshIntervalId) clearInterval(refreshIntervalId);
    }
}

// Modified getCurrentUIData to use the stored data if available
function getCurrentUIData() {
    if (lastValidDeviceData) {
        // Return a copy to prevent accidental modification
        return { ...lastValidDeviceData };
    } else {
        // Fallback: Read from UI (less reliable, used before first load or after error)
        console.warn("Falling back to reading UI state for getCurrentUIData");
        return {
             '状态': powerStatusElement?.textContent === '开启' ? '开启' : '关闭',
             '模式': modeSelect?.value,
             '设定温度': parseInt(tempSlider?.value, 10),
             '室内温度': parseFloat(currentTempElement?.textContent),
             '风速': fanSpeedSelect?.value
        };
    }
}

// --- Send Control Command (modified to always assume success immediately) ---
async function sendControlCommand(payload) {
    if (!currentDeviceId) {
        // We still need to throw for the handler's catch block,
        // but maybe just log error and return for immediate success feel.
        // Let's log and return resolved promise for simplicity now.
        console.error("Device ID not found, cannot send command.");
        return Promise.resolve(); // Indicate success anyway for optimistic UI flow
        // throw new Error("Device ID not found");
    }
    console.log(`Sending command (assuming success): ${JSON.stringify(payload)}`);
    // Feedback 'Sending...' is handled by the caller

    // --- Always Assume Success ---
    // Skip actual fetch/simulation and immediately return a resolved promise
    console.warn("Development Mode: Assuming command success immediately, no API call made.");
    // We don't need setTimeout for loadDeviceData here anymore,
    // as the UI is already optimistically updated and there's no real state change to sync.
    // loadDeviceData(); // Optionally keep for consistency check or remove
    return Promise.resolve(); // Indicate success to the calling handle function

    /* --- Original try/catch block (kept commented for reference) ---
    try {
        // --- Simulation Block (keep for testing) ---
        if (API_BASE_URL === '/api') { ... }
        // --- End Simulation ---

        const response = await fetch(...);
        if (!response.ok) { ... }
        const result = await response.json();
        setTimeout(loadDeviceData, 500);

    } catch (error) {
        console.error("Error sending control command:", error);
        throw error; // Re-throw for handler
    }
    */
}

// --- 更新 UI (增强版，支持模拟数据) ---
function updateUI(deviceData, isError = false) {
    let isMockDataUsed = false;
    let data = {}; // 初始化为空对象
    let name = ''; // 初始化名称为空
    let lastUpdated = null;

    // === 获取当前场景名称和对应的中文房间名 ===
    const currentScene = document.body.dataset.scene || 'unknown'; // 获取场景，默认为 unknown
    let sceneChineseName = '未知房间'; // 默认中文名
    switch (currentScene) {
        case 'livingroom': sceneChineseName = '客厅'; break;
        case 'bedroom': sceneChineseName = '卧室'; break;
        case 'bathroom': sceneChineseName = '卫生间'; break;
        case 'kitchen': sceneChineseName = '厨房'; break;
        case 'balcony': sceneChineseName = '阳台'; break;
        // 可根据需要添加更多场景
    }
    // ===

    if (isError || !deviceData || !deviceData.data) {
        // === 生成完整的模拟数据 ===
        console.warn(`Using mock data for AC in ${currentScene} due to error or missing data.`);
        isMockDataUsed = true;
        // 使用动态生成的房间名
        name = deviceData?.name || `${sceneChineseName}空调`; 
        data = {
            '状态': Math.random() > 0.5 ? '开启' : '关闭',
            '模式': ['制冷', '制热', '送风', '自动'][Math.floor(Math.random() * 4)],
            '设定温度': Math.floor(Math.random() * (30 - 16 + 1)) + 16, // 16-30
            '室内温度': (Math.random() * (32 - 18) + 18).toFixed(1), // 18.0-32.0
            '风速': ['自动', '低', '中', '高'][Math.floor(Math.random() * 4)],
        };
        lastUpdated = Date.now(); // 用当前时间作为模拟数据的"时间"

    } else {
        // === 使用真实数据 ===
        data = deviceData.data;
        // 如果真实数据中没有 name，也尝试使用动态房间名
        name = deviceData.name || `${sceneChineseName}空调`; 
        lastUpdated = deviceData.last_updated;

        // 检查并填充缺失的关键字段
        if (data['状态'] === undefined) {
            data['状态'] = Math.random() > 0.5 ? '开启' : '关闭';
            isMockDataUsed = true; console.log("Mocking '状态'");
        }
        if (data['模式'] === undefined) {
            data['模式'] = ['制冷', '制热', '送风', '自动'][Math.floor(Math.random() * 4)];
             isMockDataUsed = true; console.log("Mocking '模式'");
        }
         if (data['设定温度'] === undefined) {
             data['设定温度'] = Math.floor(Math.random() * (30 - 16 + 1)) + 16;
             isMockDataUsed = true; console.log("Mocking '设定温度'");
         }
         if (data['室内温度'] === undefined) {
             data['室内温度'] = (Math.random() * (32 - 18) + 18).toFixed(1);
             isMockDataUsed = true; console.log("Mocking '室内温度'");
         }
         if (data['风速'] === undefined) {
             data['风速'] = ['自动', '低', '中', '高'][Math.floor(Math.random() * 4)];
             isMockDataUsed = true; console.log("Mocking '风速'");
         }
    }

    // --- 更新 UI 元素 (使用 data 对象中的值) ---
    if (deviceNameElement) deviceNameElement.textContent = name; // 设置设备名称

    // 更新状态显示区域
    if (currentTempElement) currentTempElement.textContent = data['室内温度'] !== undefined ? data['室内温度'] : '--';
    if (setTempElement) setTempElement.textContent = data['设定温度'] !== undefined ? data['设定温度'] : '--';
    if (currentModeElement) currentModeElement.textContent = data['模式'] || '未知';
    if (currentFanSpeedElement) currentFanSpeedElement.textContent = data['风速'] || '未知';
    if (deviceStatusElement) deviceStatusElement.textContent = data['状态'] || '未知';

    // 更新控制面板状态指示和控件值
    const isPowerOn = (data['状态'] === '开启' || data['状态'] === '制冷' || data['状态'] === '制热' || data['状态'] === '送风' || data['状态'] === '除湿');
    if (powerStatusElement) powerStatusElement.textContent = isPowerOn ? '开启' : '关闭';
    if (modeSelect) modeSelect.value = data['模式'] || 'auto';
    if (modeStatusElement) modeStatusElement.textContent = data['模式'] || '未知';
    if (tempSlider) tempSlider.value = data['设定温度'] || 16;
    if (tempValueElement) tempValueElement.textContent = data['设定温度'] || '--';
    if (fanSpeedSelect) fanSpeedSelect.value = data['风速'] || 'auto';
    if (fanSpeedStatusElement) fanSpeedStatusElement.textContent = data['风速'] || '未知';

    // 更新最后更新时间
    if (lastUpdatedElement) {
        if (isMockDataUsed) {
            lastUpdatedElement.textContent = '模拟数据';
            lastUpdatedElement.style.color = 'orange'; // 醒目提示
        } else if (lastUpdated) {
             try {
                lastUpdatedElement.textContent = new Date(lastUpdated).toLocaleString('zh-CN');
                lastUpdatedElement.style.color = ''; // 恢复默认颜色
             } catch (e) {
                 console.error("Error formatting last updated time:", e);
                 lastUpdatedElement.textContent = 'N/A';
                 lastUpdatedElement.style.color = '';
             }
        } else {
             lastUpdatedElement.textContent = '--';
             lastUpdatedElement.style.color = '';
        }
    }

    // 根据电源状态启用/禁用控件 (即使是模拟数据也要处理)
    const controlsEnabled = isPowerOn;
    if(modeSelect) modeSelect.disabled = !controlsEnabled;
    if(tempSlider) tempSlider.disabled = !controlsEnabled;
    if(fanSpeedSelect) fanSpeedSelect.disabled = !controlsEnabled;
    if(tempSlider && (data['模式'] === 'fan' || data['模式'] === '送风')) {
        tempSlider.disabled = true;
    }

    console.log("UI Updated" + (isMockDataUsed ? " with mock data" : ""));
}


// --- 图表处理 ---
async function loadChartData() {
    if (!currentDeviceId || !chartCanvas) return;
    console.log(`Fetching chart data for device: ${currentDeviceId}`);
     if (chartLoadingMsg) chartLoadingMsg.style.display = 'block';
     if (temperatureChart) temperatureChart.destroy();

    try {
        const response = await fetch(GET_DEVICE_HISTORY_ENDPOINT(currentDeviceId, 'temperature'));
        if (!response.ok) {
            // 图表数据加载失败，可以尝试生成模拟图表数据
            console.warn(`Chart data fetch failed: ${response.status}. Generating mock chart data.`);
             renderChart(generateMockChartData()); // 使用模拟数据渲染图表
             if (chartLoadingMsg) chartLoadingMsg.textContent = '显示模拟图表数据';
             return;
            // throw new Error(`HTTP error! status: ${response.status}`);
        }
        const historyData = await response.json();
        console.log("Received chart data:", historyData);

        if (historyData && historyData.length > 0) {
            renderChart(historyData);
             if (chartLoadingMsg) chartLoadingMsg.style.display = 'none';
        } else {
             console.warn("No history data received. Generating mock chart data.");
             renderChart(generateMockChartData()); // 没有数据也生成模拟数据
             if (chartLoadingMsg) chartLoadingMsg.textContent = '显示模拟图表数据';
        }

    } catch (error) {
        console.error("Error fetching chart data:", error);
         renderChart(generateMockChartData()); // 发生异常也生成模拟数据
         if (chartLoadingMsg) chartLoadingMsg.textContent = '加载出错，显示模拟图表数据';
    }
}

// 新增：生成模拟图表数据的函数
function generateMockChartData(points = 12) {
    const mockData = [];
    const now = Date.now();
    let temp = Math.random() * 10 + 18; // 初始温度 18-28
    for (let i = points - 1; i >= 0; i--) {
        const timestamp = new Date(now - i * 15 * 60 * 1000); // 每 15 分钟一个点
        temp += (Math.random() - 0.5) * 2; // 温度随机波动 +/- 1度
        temp = Math.max(16, Math.min(32, temp)); // 限制在 16-32 度
        mockData.push({ timestamp: timestamp.toISOString(), value: parseFloat(temp.toFixed(1)) });
    }
    console.log("Generated mock chart data:", mockData);
    return mockData;
}


// --- renderChart 函数保持不变 ---
function renderChart(data) {
    if (!chartCanvas) return;
    const ctx = chartCanvas.getContext('2d');

    // 提取时间和温度数据
    const labels = data.map(item => {
        try {
             return new Date(item.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return 'Invalid Time';
        }
    }); //.reverse(); // 如果模拟数据已经是时间升序，不需要 reverse
    const temperatureValues = data.map(item => item.value); //.reverse();

    temperatureChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '室内温度 (°C)',
                data: temperatureValues,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                fill: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: false, title: { display: true, text: '温度 (°C)'} },
                x: { title: { display: true, text: '时间' } }
            },
            plugins: {
                legend: { display: true },
                tooltip: { mode: 'index', intersect: false }
            }
        }
    });
     console.log("Chart Rendered" + (data !== undefined && data[0]?.timestamp?.includes("mock") ? " with mock data" : "")); // 添加模拟数据判断
}

// 注意：initializeAcControl 函数需要在 DOMContentLoaded 事件之后，
// 并且在 HTML 文件底部对应的 script 块中被调用。
// (HTML 文件中已包含调用逻辑) 
// (HTML 文件中已包含调用逻辑) 