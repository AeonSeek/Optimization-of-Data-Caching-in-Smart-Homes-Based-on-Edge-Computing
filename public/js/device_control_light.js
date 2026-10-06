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
    brightnessSlider, brightnessValueElement, controlStatusElement,
    lightStatusElement, currentBrightnessElement, lastUpdatedElement;

// --- Initialization ---
function initializeLightControl() {
    console.log("Initializing Light Control Page...");
    const urlParams = new URLSearchParams(window.location.search);
    currentDeviceId = urlParams.get('deviceId');
    const currentScene = document.body.dataset.scene || 'default'; // Get scene for back link

    if (!currentDeviceId) {
        console.error("Device ID not found in URL parameters.");
        const mainContent = document.querySelector('.device-control-container');
        if (mainContent) {
            // Ensure back link goes to the correct scene page
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
    brightnessSlider = document.getElementById('brightness-slider');
    brightnessValueElement = document.getElementById('brightness-value');
    controlStatusElement = document.getElementById('control-status');
    lightStatusElement = document.getElementById('light-status'); // Main status
    currentBrightnessElement = document.getElementById('current-brightness'); // Main status
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
    if (brightnessSlider) {
        brightnessSlider.addEventListener('input', () => {
            if (brightnessValueElement) brightnessValueElement.textContent = brightnessSlider.value;
        });
        brightnessSlider.addEventListener('change', handleBrightnessChange);
    }
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
        showFeedback(`灯已${newState === 'on' ? '开启' : '关闭'}`, 'success');
        if (lastValidDeviceData) lastValidDeviceData.status = newState;
    } catch (error) {
        console.error("Power toggle failed, reverting UI.");
        updateUI({ data: previousState });
        showFeedback(`电源切换失败: ${error.message}`, 'error');
    } finally {
        setTimeout(() => setControlsTemporaryDisabled(false), 500);
    }
}

async function handleBrightnessChange() {
    if (!brightnessSlider) return;
    const newBrightness = parseInt(brightnessSlider.value, 10);
    console.log(`Brightness changed to: ${newBrightness}% (Optimistic)`);
    const previousState = getCurrentUIData();

    // Optimistic UI Update
    updateUI({ data: { ...previousState, brightness: newBrightness } });
    setControlsTemporaryDisabled(true); // Disable only brightness slider?
    showFeedback('发送命令中...', 'info');

    try {
        // Payload: { state: { brightness: newBrightness } }
        await sendControlCommand({ state: { brightness: newBrightness } });
        showFeedback(`亮度设定为 ${newBrightness}% 成功`, 'success');
        if (lastValidDeviceData) lastValidDeviceData.brightness = newBrightness;
    } catch (error) {
        console.error("Brightness change failed, reverting UI.");
        // Revert slider and display
        const revertBrightness = previousState?.brightness || 50;
        brightnessSlider.value = revertBrightness;
        if(brightnessValueElement) brightnessValueElement.textContent = revertBrightness;
        if(currentBrightnessElement) currentBrightnessElement.textContent = revertBrightness;
        showFeedback(`亮度设定失败: ${error.message}`, 'error');
    } finally {
        // Re-enable controls respecting power state
        setTimeout(() => setControlsTemporaryDisabled(false), 500);
    }
}

// --- Helpers ---
function getCurrentUIData() {
    if (lastValidDeviceData) {
        return { ...lastValidDeviceData };
    } else {
        console.warn("Falling back to reading UI state for getCurrentUIData (Light)");
        return {
            status: powerStatusElement?.textContent === '开启' ? 'on' : 'off',
            brightness: parseInt(brightnessSlider?.value, 10) || 0,
        };
    }
}

function setControlsTemporaryDisabled(disabled) {
    // Disable all controls during action
    const controls = [powerToggleButton, brightnessSlider];
    controls.forEach(el => { if (el) el.disabled = disabled; });

    // If enabling, re-apply power-off state
    if (!disabled) {
        const isPowerOn = lastValidDeviceData?.status === 'on';
        if (brightnessSlider) brightnessSlider.disabled = !isPowerOn;
        // Keep power button always enabled
        if (powerToggleButton) powerToggleButton.disabled = false;
    }
}

let feedbackTimeoutLight;
function showFeedback(message, type = 'info') {
    if (!controlStatusElement) { alert(message); return; }
    clearTimeout(feedbackTimeoutLight);
    controlStatusElement.textContent = message;
    controlStatusElement.className = `status-indicator feedback-${type}`;
    controlStatusElement.style.display = 'block';
    feedbackTimeoutLight = setTimeout(() => {
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
    console.log(`Fetching data for light: ${currentDeviceId}`);
    try {
        const response = await fetch(GET_DEVICE_DATA_ENDPOINT(currentDeviceId));
        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}. Displaying mock data.`);
            updateUI(null, true); lastValidDeviceData = null; return;
        }
        const deviceData = await response.json();
        console.log("Received light data:", deviceData);
        lastValidDeviceData = deviceData.data; updateUI(deviceData);
    } catch (error) {
        console.error("Error fetching light data:", error);
        updateUI(null, true); lastValidDeviceData = null;
    }
}

function updateUI(deviceData, isError = false) {
    let isMockDataUsed = false;
    let data = {};
    let name = '灯';
    let lastUpdated = null;

    if (isError || !deviceData || !deviceData.data) {
        console.warn("Using mock data for Light...");
        isMockDataUsed = true;
        name = deviceData?.name || '卫生间灯'; // Scene specific default
        const powerState = Math.random() > 0.5 ? 'on' : 'off';
        data = {
            status: powerState,
            brightness: powerState === 'on' ? Math.floor(Math.random() * 101) : 0
        };
        lastUpdated = Date.now();
    } else {
        data = deviceData.data;
        name = deviceData.name || '灯';
        lastUpdated = deviceData.last_updated;
        // Fill missing fields
        if (data.status === undefined) { data.status = 'off'; isMockDataUsed = true; console.log("Mocking status"); }
        if (data.brightness === undefined) { data.brightness = (data.status === 'on' ? 50 : 0); isMockDataUsed = true; console.log("Mocking brightness"); }
    }

    console.log("Updating Light UI with final data:", data, "Is mock:", isMockDataUsed);

    if (deviceNameElement) deviceNameElement.textContent = name; // No (模拟)

    const isPowerOn = data.status === 'on';

    // Update Main Status Display
    if (lightStatusElement) lightStatusElement.textContent = isPowerOn ? '开启' : '关闭';
    if (currentBrightnessElement) currentBrightnessElement.textContent = isPowerOn ? `${data.brightness}%` : '-';

    // Update Control Panel Status Indicators
    if (powerStatusElement) powerStatusElement.textContent = isPowerOn ? '开启' : '关闭';

    // Update Control Values
    if (brightnessSlider) {
        brightnessSlider.value = data.brightness !== undefined ? data.brightness : 0;
        brightnessSlider.disabled = !isPowerOn;
    }
    if (brightnessValueElement) brightnessValueElement.textContent = data.brightness !== undefined ? data.brightness : '--';

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

    // Ensure power button is always enabled
    if (powerToggleButton) powerToggleButton.disabled = false;

    if (controlStatusElement) controlStatusElement.textContent = ''; // Clear feedback
    console.log("Light UI Updated" + (isMockDataUsed ? " with mock data" : ""));
}

// --- Send Control Command (Assume Success) ---
async function sendControlCommand(payload) {
    if (!currentDeviceId) { console.error("Missing deviceId"); return Promise.resolve(); }
    console.log(`Sending command (assuming success): ${JSON.stringify(payload)}`);
    console.warn("Development Mode: Assuming command success immediately.");
    return Promise.resolve();
}

// --- HTML Initialization Call --- (Handled in HTML)
// document.addEventListener('DOMContentLoaded', initializeLightControl); 