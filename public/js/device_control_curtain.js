let currentDeviceId = null;
let refreshIntervalId = null;
const REFRESH_INTERVAL_MS = 15000; // 刷新间隔

// --- API 端点 (可能需要调整) ---
const API_BASE_URL = '/api';
const GET_DEVICE_DATA_ENDPOINT = (deviceId) => `${API_BASE_URL}/devices/${deviceId}`;
const SEND_CONTROL_COMMAND_ENDPOINT = (deviceId) => `${API_BASE_URL}/devices/${deviceId}/command`;
// 窗帘通常不需要历史数据端点

// --- DOM 元素 ---
let deviceNameElement, openButton, closeButton, stopButton,
    positionSlider, positionValueElement, controlStatusElement,
    curtainStatusElement, currentPositionElement, lastUpdatedElement;

// --- 初始化函数 ---
function initializeCurtainControl() {
    console.log("Initializing Curtain Control Page...");

    const urlParams = new URLSearchParams(window.location.search);
    currentDeviceId = urlParams.get('deviceId');

    if (!currentDeviceId) {
        console.error("Device ID not found in URL parameters.");
        const mainContent = document.querySelector('.device-control-container');
        if (mainContent) {
            mainContent.innerHTML = '<p style="color: red;">错误：未找到设备 ID。</p><a href="livingroom.html" class="back-link">&larr; 返回客厅</a>';
        }
        return;
    }
    console.log(`Controlling Device ID: ${currentDeviceId}`);

    // 获取 DOM 元素
    deviceNameElement = document.getElementById('device-name');
    openButton = document.getElementById('open-button');
    closeButton = document.getElementById('close-button');
    stopButton = document.getElementById('stop-button');
    positionSlider = document.getElementById('position-slider');
    positionValueElement = document.getElementById('position-value');
    controlStatusElement = document.getElementById('control-status'); // 用于显示操作反馈
    curtainStatusElement = document.getElementById('curtain-status');
    currentPositionElement = document.getElementById('current-position');
    lastUpdatedElement = document.getElementById('last-updated-time');

    bindEventListeners();
    loadDeviceData();

    // 设置定时刷新
    if (refreshIntervalId) clearInterval(refreshIntervalId);
    refreshIntervalId = setInterval(loadDeviceData, REFRESH_INTERVAL_MS);

    window.addEventListener('beforeunload', () => {
        if (refreshIntervalId) clearInterval(refreshIntervalId);
    });
}

// --- 事件监听器 ---
function bindEventListeners() {
    if (openButton) openButton.addEventListener('click', () => handleAction('open'));
    if (closeButton) closeButton.addEventListener('click', () => handleAction('close'));
    if (stopButton) stopButton.addEventListener('click', () => handleAction('stop'));

    if (positionSlider) {
         positionSlider.addEventListener('input', () => {
             if(positionValueElement) positionValueElement.textContent = positionSlider.value;
         });
         positionSlider.addEventListener('change', handlePositionChange);
    }
}

// --- 处理函数 ---
async function handleAction(action) {
    console.log(`Curtain action: ${action}`);
     if (controlStatusElement) controlStatusElement.textContent = '发送命令中...';
    // TODO: 根据后端 API 调整 payload
    // 示例 payload: { command: 'setState', value: 'open'/'close'/'stop' }
    // 或: { state: { status: 'open'/'close'/'stop' } }
    await sendControlCommand({ command: 'setState', value: action });
}

async function handlePositionChange() {
    const newPosition = parseInt(positionSlider.value, 10);
    console.log(`Set curtain position to: ${newPosition}%`);
    if (positionValueElement) positionValueElement.textContent = newPosition;
     if (controlStatusElement) controlStatusElement.textContent = '设置位置中...';
    // TODO: 根据后端 API 调整 payload
    // 示例 payload: { command: 'setPosition', value: newPosition }
    // 或: { state: { position: newPosition } }
    await sendControlCommand({ command: 'setPosition', value: newPosition });
}

// --- 数据加载与 UI 更新 ---
async function loadDeviceData() {
    if (!currentDeviceId) return;
    console.log(`Fetching data for curtain: ${currentDeviceId}`);
    try {
        const response = await fetch(GET_DEVICE_DATA_ENDPOINT(currentDeviceId));
        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}. Displaying mock data.`);
            updateUI(null, true); // 传递错误标记
            return;
        }
        const deviceData = await response.json();
        console.log("Received curtain data:", deviceData);
        updateUI(deviceData);
    } catch (error) {
        console.error("Error fetching curtain data:", error);
        updateUI(null, true); // 传递错误标记
        if (refreshIntervalId) clearInterval(refreshIntervalId);
    }
}

// --- 更新 UI (增强版，支持模拟数据) ---
function updateUI(deviceData, isError = false) {
    let isMockDataUsed = false;
    let data = {};
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
        console.warn(`Using mock data for Curtain in ${currentScene} due to error or missing data.`);
        isMockDataUsed = true;
        // 使用动态生成的房间名
        name = deviceData?.name || `${sceneChineseName}窗帘`; 
        data = {
            'status': ['open', 'closed', 'stopped'][Math.floor(Math.random() * 3)], // 模拟状态
            'position': Math.floor(Math.random() * 101), // 0-100
        };
         lastUpdated = Date.now();
    } else {
        data = deviceData.data;
        // 如果真实数据中没有 name，也尝试使用动态房间名
        name = deviceData.name || `${sceneChineseName}窗帘`;
        lastUpdated = deviceData.last_updated;

        // 填充缺失字段
        if (data['status'] === undefined) {
            data['status'] = ['open', 'closed', 'stopped'][Math.floor(Math.random() * 3)];
            isMockDataUsed = true; console.log("Mocking 'status'");
        }
         if (data['position'] === undefined) {
             data['position'] = Math.floor(Math.random() * 101);
             isMockDataUsed = true; console.log("Mocking 'position'");
         }
    }


    if (deviceNameElement) deviceNameElement.textContent = name;

    // --- 更新状态显示区域 ---
    const statusMap = {
        'opening': '正在打开', 'closing': '正在关闭', 'stopped': '已停止',
        'open': '已打开', 'closed': '已关闭',
    };
    const currentStatus = data['status'] || '未知';
    if (curtainStatusElement) {
         curtainStatusElement.textContent = statusMap[currentStatus.toLowerCase()] || currentStatus;
    }

    const currentPosition = data['position'];
    if (currentPositionElement) {
        currentPositionElement.textContent = (currentPosition !== undefined) ? currentPosition : '--';
    }

    // --- 更新控制面板状态 ---
    if (positionSlider) {
        positionSlider.value = (currentPosition !== undefined) ? currentPosition : 0;
    }
    if (positionValueElement) {
         positionValueElement.textContent = (currentPosition !== undefined) ? currentPosition : '--';
    }

    // (可选) 根据状态禁用按钮
    const isMoving = (currentStatus === 'opening' || currentStatus === 'closing');
    if(openButton) openButton.disabled = isMoving || (currentPosition === 100);
    if(closeButton) closeButton.disabled = isMoving || (currentPosition === 0);
    if(stopButton) stopButton.disabled = !isMoving;
    if(positionSlider) positionSlider.disabled = isMoving;

    // 更新最后更新时间
    if (lastUpdatedElement) {
         if (isMockDataUsed) {
            lastUpdatedElement.textContent = '模拟数据';
            lastUpdatedElement.style.color = 'orange';
         } else if (lastUpdated) {
             try {
                lastUpdatedElement.textContent = new Date(lastUpdated).toLocaleString('zh-CN');
                 lastUpdatedElement.style.color = '';
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
     if (controlStatusElement) controlStatusElement.textContent = ''; // 清除操作状态提示
    console.log("Curtain UI Updated" + (isMockDataUsed ? " with mock data" : ""));
}


// --- Send Control Command (modified to always assume success immediately) ---
async function sendControlCommand(payload) {
    if (!currentDeviceId) {
        console.error("Device ID not found, cannot send command.");
        return Promise.resolve();
    }
    console.log(`Sending command (assuming success): ${JSON.stringify(payload)}`);

    // --- Always Assume Success ---
    console.warn("Development Mode: Assuming command success immediately, no API call made.");
    // loadDeviceData(); // Optional: Keep for consistency or remove
    return Promise.resolve();

    /* --- Original try/catch block (commented for reference) ---
    try {
        // --- Simulation ---
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

// 在 HTML 中调用 initializeCurtainControl 

/**
 * Shows feedback to the user.
 * @param {string} message - The message to display.
 * @param {'success' | 'error'} type - The type of feedback.
 */
function showFeedback(message, type) {
    const feedbackElement = document.getElementById('feedback-message');
    if (!feedbackElement) {
        console.error("Feedback element not found");
        return;
    }
    feedbackElement.textContent = message; // Ensure messages are in Chinese
    feedbackElement.className = `feedback ${type}`;
    feedbackElement.style.display = 'block';

    setTimeout(() => {
        feedbackElement.style.display = 'none';
    }, 3000);
}

/**
 * Translates status keys to Chinese.
 * @param {string} status - The status key (e.g., 'opening', 'closed').
 * @returns {string} - The translated status name.
 */
function translateStatus(status) {
    const statuses = {
        'opening': '正在打开',
        'closing': '正在关闭',
        'stopped': '已停止',
        'open': '已打开',
        'closed': '已关闭',
        'offline': '离线'
    };
    return statuses[status] || status;
} 