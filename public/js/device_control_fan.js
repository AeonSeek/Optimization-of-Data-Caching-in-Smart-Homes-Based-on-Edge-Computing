let currentDeviceId = null;
let refreshIntervalId = null;
const REFRESH_INTERVAL_MS = 15000;
let lastValidDeviceData = null;

// --- API Endpoints ---
const API_BASE_URL = '/api';
const GET_DEVICE_DATA_ENDPOINT = (deviceId) => `${API_BASE_URL}/devices/${deviceId}`;
const SEND_CONTROL_COMMAND_ENDPOINT = (deviceId) => `${API_BASE_URL}/devices/${deviceId}/command`;

// --- DOM Elements ---
let deviceNameElement, powerToggleButton, powerStatusElement,
    speedSelect, speedStatusElement, controlStatusElement,
    fanStatusElement, currentSpeedElement, lastUpdatedElement;

// --- Initialization ---
function initializeFanControl() {
    console.log("Initializing Fan Control Page...");
    const urlParams = new URLSearchParams(window.location.search);
    currentDeviceId = urlParams.get('deviceId');
    const currentScene = document.body.dataset.scene || 'default';

    if (!currentDeviceId) {
        console.error("Device ID not found.");
        const mainContent = document.querySelector('.device-control-container');
        if (mainContent) {
            const backLink = mainContent.querySelector('.back-link');
            if (backLink) backLink.href = `${currentScene}.html`;
            mainContent.innerHTML = `<p style="color: red;">错误：未找到设备 ID。</p>${mainContent.innerHTML}`;
        }
        return;
    }
    console.log(`Controlling Device ID: ${currentDeviceId} in scene: ${currentScene}`);

    // Get DOM elements
    deviceNameElement = document.getElementById('device-name');
    powerToggleButton = document.getElementById('power-toggle');
    powerStatusElement = document.getElementById('power-status');
    speedSelect = document.getElementById('speed-select');
    speedStatusElement = document.getElementById('speed-status');
    controlStatusElement = document.getElementById('control-status');
    fanStatusElement = document.getElementById('fan-status'); // Main status
    currentSpeedElement = document.getElementById('current-speed'); // Main status
    lastUpdatedElement = document.getElementById('last-updated-time');

    bindEventListeners();
    loadDeviceData();

    if (refreshIntervalId) clearInterval(refreshIntervalId);
    refreshIntervalId = setInterval(loadDeviceData, REFRESH_INTERVAL_MS);
    window.addEventListener('beforeunload', () => clearInterval(refreshIntervalId));
}

// --- Event Listeners ---
function bindEventListeners() {
    if (powerToggleButton) powerToggleButton.addEventListener('click', handlePowerToggle);
    if (speedSelect) speedSelect.addEventListener('change', handleSpeedChange);
}

// --- Optimistic Action Handlers ---
async function handlePowerToggle() {
    if (!powerToggleButton) return;
    console.log("Power toggle clicked (Optimistic)");
    const previousState = getCurrentUIData();
    const isCurrentlyOn = previousState?.status === 'on';
    const newState = isCurrentlyOn ? 'off' : 'on';

    updateUI({ data: { ...previousState, status: newState } });
    setControlsTemporaryDisabled(true);
    showFeedback('发送命令中...', 'info');

    try {
        // Payload: { state: { power: 'on'/'off' } }
        await sendControlCommand({ state: { power: newState } });
        showFeedback(`风扇已${newState === 'on' ? '开启' : '关闭'}`, 'success');
        if (lastValidDeviceData) lastValidDeviceData.status = newState;
    } catch (error) {
        console.error("Power toggle failed, reverting UI.");
        updateUI({ data: previousState });
        showFeedback(`电源切换失败: ${error.message}`, 'error');
    } finally {
        setTimeout(() => setControlsTemporaryDisabled(false), 500);
    }
}

async function handleSpeedChange() {
    if (!speedSelect) return;
    const newSpeed = speedSelect.value;
    console.log(`Speed changed to: ${newSpeed} (Optimistic)`);
    const previousState = getCurrentUIData();

    updateUI({ data: { ...previousState, speed: newSpeed } });
    setControlsTemporaryDisabled(true);
    showFeedback('发送命令中...', 'info');

    try {
        // Payload: { state: { speed: newSpeed } } (e.g., 'low', 'medium', 'high')
        await sendControlCommand({ state: { speed: newSpeed } });
        showFeedback(`风速设定为 ${translateFanSpeed(newSpeed)} 成功`, 'success');
        if (lastValidDeviceData) lastValidDeviceData.speed = newSpeed;
    } catch (error) {
        console.error("Speed change failed, reverting UI.");
        updateUI({ data: previousState });
        showFeedback(`风速设定失败: ${error.message}`, 'error');
    } finally {
        setTimeout(() => setControlsTemporaryDisabled(false), 500);
    }
}

// --- Helpers ---
function getCurrentUIData() {
    if (lastValidDeviceData) {
        return { ...lastValidDeviceData };
    } else {
        console.warn("Falling back to reading UI state for getCurrentUIData (Fan)");
        return {
            status: powerStatusElement?.textContent === '开启' ? 'on' : 'off',
            speed: speedSelect?.value || 'low',
        };
    }
}

function setControlsTemporaryDisabled(disabled) {
    const controls = [powerToggleButton, speedSelect];
    controls.forEach(el => { if (el) el.disabled = disabled; });

    if (!disabled) {
        const isPowerOn = lastValidDeviceData?.status === 'on';
        if (speedSelect) speedSelect.disabled = !isPowerOn;
        if (powerToggleButton) powerToggleButton.disabled = false;
    }
}

let feedbackTimeoutFan;
function showFeedback(message, type = 'info') {
    if (!controlStatusElement) { alert(message); return; }
    clearTimeout(feedbackTimeoutFan);
    controlStatusElement.textContent = message;
    controlStatusElement.className = `status-indicator feedback-${type}`;
    controlStatusElement.style.display = 'block';
    feedbackTimeoutFan = setTimeout(() => {
       if (controlStatusElement) {
          controlStatusElement.textContent = '';
          controlStatusElement.style.display = 'none';
          controlStatusElement.className = 'status-indicator';
       }
    }, type === 'error' ? 4000 : 2500);
}

// --- Data Loading and UI Update ---
async function loadDeviceData() {
    if (!currentDeviceId) return;
    console.log(`Fetching data for fan: ${currentDeviceId}`);
    try {
        const response = await fetch(GET_DEVICE_DATA_ENDPOINT(currentDeviceId));
        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}. Displaying mock data.`);
            updateUI(null, true); lastValidDeviceData = null; return;
        }
        const deviceData = await response.json();
        console.log("Received fan data:", deviceData);
        lastValidDeviceData = deviceData.data; updateUI(deviceData);
    } catch (error) {
        console.error("Error fetching fan data:", error);
        updateUI(null, true); lastValidDeviceData = null;
    }
}

function updateUI(deviceData, isError = false) {
    let isMockDataUsed = false;
    let data = {};
    let name = '风扇';
    let lastUpdated = null;

    if (isError || !deviceData || !deviceData.data) {
        console.warn("Using mock data for Fan...");
        isMockDataUsed = true;
        name = deviceData?.name || '卫生间风扇';
        const powerState = Math.random() > 0.5 ? 'on' : 'off';
        data = {
            status: powerState,
            speed: powerState === 'on' ? ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] : 'low'
        };
        lastUpdated = Date.now();
    } else {
        data = deviceData.data;
        name = deviceData.name || '风扇';
        lastUpdated = deviceData.last_updated;
        if (data.status === undefined) { data.status = 'off'; isMockDataUsed = true; console.log("Mocking status"); }
        if (data.speed === undefined) { data.speed = 'low'; isMockDataUsed = true; console.log("Mocking speed"); }
    }

    console.log("Updating Fan UI with final data:", data, "Is mock:", isMockDataUsed);

    if (deviceNameElement) deviceNameElement.textContent = name;

    const isPowerOn = data.status === 'on';

    // Update Main Status Display
    if (fanStatusElement) fanStatusElement.textContent = isPowerOn ? '开启' : '关闭';
    if (currentSpeedElement) currentSpeedElement.textContent = isPowerOn ? translateFanSpeed(data.speed) : '-';

    // Update Control Panel Status Indicators
    if (powerStatusElement) powerStatusElement.textContent = isPowerOn ? '开启' : '关闭';
    if (speedStatusElement) speedStatusElement.textContent = isPowerOn ? translateFanSpeed(data.speed) : '-';

    // Update Control Values
    if (speedSelect) {
        speedSelect.value = data.speed || 'low';
        speedSelect.disabled = !isPowerOn;
    }

    // Update Last Updated Time
    if (lastUpdatedElement) {
        if (isMockDataUsed) {
            lastUpdatedElement.textContent = '模拟数据';
            lastUpdatedElement.style.color = 'orange';
        } else if (lastUpdated) {
            try { lastUpdatedElement.textContent = new Date(lastUpdated).toLocaleString('zh-CN'); lastUpdatedElement.style.color = ''; } catch (e) { console.error("Error formatting last updated:", e); lastUpdatedElement.textContent = 'N/A'; lastUpdatedElement.style.color = '';}
        } else {
            lastUpdatedElement.textContent = '--'; lastUpdatedElement.style.color = '';
        }
    }

    if (powerToggleButton) powerToggleButton.disabled = false;

    if (controlStatusElement) controlStatusElement.textContent = '';
    console.log("Fan UI Updated" + (isMockDataUsed ? " with mock data" : ""));
}

// Helper to translate fan speed keys
function translateFanSpeed(speed) {
    const speeds = {
        'low': '低速',
        'medium': '中速',
        'high': '高速',
        // Add other speeds if needed (e.g., 'auto')
    };
    return speeds[speed] || speed;
}

// --- Send Control Command (Assume Success) ---
async function sendControlCommand(payload) {
    if (!currentDeviceId) { console.error("Missing deviceId"); return Promise.resolve(); }
    console.log(`Sending command (assuming success): ${JSON.stringify(payload)}`);
    console.warn("Development Mode: Assuming command success immediately.");
    return Promise.resolve();
}

// --- HTML Initialization Call --- (Handled in HTML)
// document.addEventListener('DOMContentLoaded', initializeFanControl); 