let currentDeviceId = null;
let refreshIntervalId = null;
const REFRESH_INTERVAL_MS = 15000;
let lastValidDeviceData = null;

// --- API Endpoints (Adjust if needed for projectors) ---
const API_BASE_URL = '/api';
const GET_DEVICE_DATA_ENDPOINT = (deviceId) => `${API_BASE_URL}/devices/${deviceId}`;
const SEND_CONTROL_COMMAND_ENDPOINT = (deviceId) => `${API_BASE_URL}/devices/${deviceId}/command`;

// --- DOM Elements ---
let deviceNameElement, powerToggleButton, powerStatusElement, // Control panel status
    sourceSelect, sourceStatusElement, // Control panel status
    volumeSlider, volumeValueElement,
    muteToggleButton, muteStatusElement, // Control panel status
    controlStatusElement, // Feedback area
    projectorStatusElement, currentSourceElement, currentVolumeElement, // Main status display
    lastUpdatedElement;

// --- Initialization ---
function initializeProjectorControl() {
    console.log("Initializing Projector Control Page...");

    const urlParams = new URLSearchParams(window.location.search);
    currentDeviceId = urlParams.get('deviceId');

    if (!currentDeviceId) {
        console.error("Device ID not found in URL parameters.");
        const mainContent = document.querySelector('.device-control-container');
        if (mainContent) {
            mainContent.innerHTML = '<p style="color: red;">错误：未找到设备 ID。</p><a href="bedroom.html" class="back-link">&larr; 返回卧室</a>'; // Link back to bedroom
        }
        return;
    }
    console.log(`Controlling Device ID: ${currentDeviceId}`);

    // Get DOM elements
    deviceNameElement = document.getElementById('device-name');
    powerToggleButton = document.getElementById('power-toggle');
    powerStatusElement = document.getElementById('power-status');
    sourceSelect = document.getElementById('source-select');
    sourceStatusElement = document.getElementById('source-status');
    volumeSlider = document.getElementById('volume-slider');
    volumeValueElement = document.getElementById('volume-value');
    muteToggleButton = document.getElementById('mute-toggle');
    muteStatusElement = document.getElementById('mute-status');
    controlStatusElement = document.getElementById('control-status');

    // Main status display elements
    projectorStatusElement = document.getElementById('projector-status');
    currentSourceElement = document.getElementById('current-source');
    currentVolumeElement = document.getElementById('current-volume');
    lastUpdatedElement = document.getElementById('last-updated-time');

    bindEventListeners();
    loadDeviceData();

    if (refreshIntervalId) clearInterval(refreshIntervalId);
    refreshIntervalId = setInterval(loadDeviceData, REFRESH_INTERVAL_MS);

    window.addEventListener('beforeunload', () => {
        if (refreshIntervalId) clearInterval(refreshIntervalId);
    });
}

// --- Event Listeners ---
function bindEventListeners() {
    if (powerToggleButton) powerToggleButton.addEventListener('click', handlePowerToggle);
    if (sourceSelect) sourceSelect.addEventListener('change', handleSourceChange);
    if (volumeSlider) {
         volumeSlider.addEventListener('input', () => {
             if(volumeValueElement) volumeValueElement.textContent = volumeSlider.value;
         });
         volumeSlider.addEventListener('change', handleVolumeSliderChange);
    }
    if (muteToggleButton) muteToggleButton.addEventListener('click', handleMuteToggle);
}

// --- Optimistic Action Handlers ---

async function handlePowerToggle() {
    if (!powerToggleButton || !powerStatusElement) return;
    console.log("Power toggle clicked (Optimistic)");
    const previousState = getCurrentUIData();
    const isCurrentlyOn = previousState?.status === 'on';
    const newState = isCurrentlyOn ? 'off' : 'on';

    // Optimistic UI Update
    updateUI({ data: { ...previousState, status: newState } });
    setControlsTemporaryDisabled(true);
    showFeedback('发送命令中...', 'info');

    try {
        // Payload assumption: { state: { power: 'on'/'off' } }
        await sendControlCommand({ state: { power: newState } });
        showFeedback(`电源已${newState === 'on' ? '开启' : '关闭'}`, 'success');
        if (lastValidDeviceData) lastValidDeviceData.status = newState;
    } catch (error) {
        console.error("Power toggle command failed, reverting UI.");
        updateUI({ data: previousState }); // Revert full state
        showFeedback(`电源切换失败: ${error.message}`, 'error');
    } finally {
        setTimeout(() => setControlsTemporaryDisabled(false), 500);
    }
}

async function handleSourceChange() {
    if (!sourceSelect) return;
    const newSource = sourceSelect.value;
    console.log(`Source changed to: ${newSource} (Optimistic)`);
    const previousState = getCurrentUIData();

    // Optimistic UI Update
    updateUI({ data: { ...previousState, source: newSource } });
    setControlsTemporaryDisabled(true);
    showFeedback('发送命令中...', 'info');

    try {
        // Payload assumption: { state: { source: newSource } }
        await sendControlCommand({ state: { source: newSource } });
        showFeedback(`输入源切换为 ${newSource} 成功`, 'success');
        if (lastValidDeviceData) lastValidDeviceData.source = newSource;
    } catch (error) {
        console.error("Source change command failed, reverting UI.");
        updateUI({ data: previousState });
        showFeedback(`输入源切换失败: ${error.message}`, 'error');
    } finally {
        setTimeout(() => setControlsTemporaryDisabled(false), 500);
    }
}

async function handleVolumeSliderChange() {
    if (!volumeSlider || !volumeValueElement) return;
    const newVolume = parseInt(volumeSlider.value, 10);
    console.log(`Volume changed to: ${newVolume} (Optimistic)`);
    const previousState = getCurrentUIData();

    // Optimistic UI Update (slider value already updated by 'input')
    if (currentVolumeElement) currentVolumeElement.textContent = newVolume;
    setControlsTemporaryDisabled(true);
    showFeedback('发送命令中...', 'info');

    try {
        // Payload assumption: { state: { volume: newVolume } }
        await sendControlCommand({ state: { volume: newVolume } });
        showFeedback(`音量设定为 ${newVolume} 成功`, 'success');
        if (lastValidDeviceData) lastValidDeviceData.volume = newVolume;
    } catch (error) {
        console.error("Volume change command failed, reverting UI.");
        const revertVolume = previousState?.volume || 0;
        volumeSlider.value = revertVolume;
        volumeValueElement.textContent = revertVolume;
        if (currentVolumeElement) currentVolumeElement.textContent = revertVolume;
        showFeedback(`音量设定失败: ${error.message}`, 'error');
    } finally {
        setTimeout(() => setControlsTemporaryDisabled(false), 500);
    }
}

async function handleMuteToggle() {
    if (!muteToggleButton) return;
    console.log("Mute toggle clicked (Optimistic)");
    const previousState = getCurrentUIData();
    const isCurrentlyMuted = previousState?.muted === true;
    const newState = !isCurrentlyMuted;

    // Optimistic UI Update
    updateUI({ data: { ...previousState, muted: newState } });
    setControlsTemporaryDisabled(true);
    showFeedback('发送命令中...', 'info');

    try {
        // Payload assumption: { state: { muted: newState } }
        await sendControlCommand({ state: { muted: newState } });
        showFeedback(newState ? '已静音' : '已取消静音', 'success');
        if (lastValidDeviceData) lastValidDeviceData.muted = newState;
    } catch (error) {
        console.error("Mute toggle command failed, reverting UI.");
        updateUI({ data: previousState });
        showFeedback(`静音切换失败: ${error.message}`, 'error');
    } finally {
        setTimeout(() => setControlsTemporaryDisabled(false), 500);
    }
}

// --- Helpers ---
function getCurrentUIData() {
    if (lastValidDeviceData) {
        return { ...lastValidDeviceData };
    } else {
        // Fallback to reading UI - adjust for projector elements
        console.warn("Falling back to reading UI state for getCurrentUIData (Projector)");
        return {
            status: powerStatusElement?.textContent === '开启' ? 'on' : 'off',
            source: sourceSelect?.value,
            volume: parseInt(volumeSlider?.value, 10) || 0,
            muted: muteStatusElement?.textContent === '静音' // Example, adjust based on how mute state is displayed
        };
    }
}

function setControlsTemporaryDisabled(disabled) {
    const controls = [powerToggleButton, sourceSelect, volumeSlider, muteToggleButton];
    controls.forEach(el => { if (el) el.disabled = disabled; });

    // Re-apply power-off disabling after general enable/disable
    if (!disabled && lastValidDeviceData?.status === 'off') {
        const isPowerOn = false;
        if (sourceSelect) sourceSelect.disabled = !isPowerOn;
        if (volumeSlider) volumeSlider.disabled = !isPowerOn;
        if (muteToggleButton) muteToggleButton.disabled = !isPowerOn;
    }
}

let feedbackTimeoutProjector;
function showFeedback(message, type = 'info') {
    if (!controlStatusElement) { alert(message); return; }
    clearTimeout(feedbackTimeoutProjector);
    controlStatusElement.textContent = message;
    controlStatusElement.className = `status-indicator feedback-${type}`;
    controlStatusElement.style.display = 'block';
    feedbackTimeoutProjector = setTimeout(() => {
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
    console.log(`Fetching data for projector: ${currentDeviceId}`);
    try {
        const response = await fetch(GET_DEVICE_DATA_ENDPOINT(currentDeviceId));
        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}. Displaying mock data.`);
            updateUI(null, true);
            lastValidDeviceData = null;
            return;
        }
        const deviceData = await response.json();
        console.log("Received projector data:", deviceData);
        lastValidDeviceData = deviceData.data; // Store valid data
        updateUI(deviceData);

    } catch (error) {
        console.error("Error fetching projector data:", error);
        updateUI(null, true); // Show mock data on error
        lastValidDeviceData = null;
        // Consider clearing interval on persistent errors
    }
}

function updateUI(deviceData, isError = false) {
    let isMockDataUsed = false;
    let data = {};
    let name = '投影仪'; // Default name without mock
    let lastUpdated = null;

    if (isError || !deviceData || !deviceData.data) {
        console.warn("Using mock data for Projector...");
        isMockDataUsed = true;
        name = deviceData?.name || '卧室投影仪'; // Use provided name or default
        const powerState = Math.random() > 0.5 ? 'on' : 'off';
        data = {
            status: powerState,
            source: ['hdmi1', 'hdmi2', 'usb', 'network'][Math.floor(Math.random() * 4)],
            volume: Math.floor(Math.random() * 101),
            muted: Math.random() > 0.8
        };
        // Only assign values if power is on for mock data
        if (powerState === 'off') {
            data.source = undefined;
            data.volume = undefined;
            data.muted = undefined;
        }
        lastUpdated = Date.now();
    } else {
        data = deviceData.data;
        name = deviceData.name || '投影仪';
        lastUpdated = deviceData.last_updated;
        // Fill missing fields if needed
        if (data.status === undefined) { data.status = 'off'; isMockDataUsed = true; console.log("Mocking status"); }
        if (data.source === undefined) { data.source = 'hdmi1'; isMockDataUsed = true; console.log("Mocking source"); }
        if (data.volume === undefined) { data.volume = 50; isMockDataUsed = true; console.log("Mocking volume"); }
        if (data.muted === undefined) { data.muted = false; isMockDataUsed = true; console.log("Mocking muted"); }
    }

    console.log("Updating Projector UI with final data:", data, "Is mock:", isMockDataUsed);

    if (deviceNameElement) deviceNameElement.textContent = name; // No (模拟) here

    const isPowerOn = data.status === 'on';

    // Update Main Status Display
    if (projectorStatusElement) projectorStatusElement.textContent = isPowerOn ? '开启' : '关闭';
    if (currentSourceElement) currentSourceElement.textContent = isPowerOn ? (data.source || '未知') : '-';
    if (currentVolumeElement) currentVolumeElement.textContent = isPowerOn ? (data.volume !== undefined ? `${data.volume}${data.muted ? ' (静音)' : ''}` : '--') : '-';

    // Update Control Panel Status Indicators
    if (powerStatusElement) powerStatusElement.textContent = isPowerOn ? '开启' : '关闭';
    if (sourceStatusElement) sourceStatusElement.textContent = isPowerOn ? (data.source || '未知') : '-';
    if (muteStatusElement) muteStatusElement.textContent = (isPowerOn && data.muted) ? '静音' : ' '; // Show '静音' or nothing

    // Update Control Values
    if (sourceSelect) sourceSelect.value = data.source || 'hdmi1';
    if (volumeSlider) volumeSlider.value = data.volume !== undefined ? data.volume : 0;
    if (volumeValueElement) volumeValueElement.textContent = data.volume !== undefined ? data.volume : '--';

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

    // Enable/Disable controls based on power state
    const controlsEnabled = isPowerOn;
    if (sourceSelect) sourceSelect.disabled = !controlsEnabled;
    if (volumeSlider) volumeSlider.disabled = !controlsEnabled;
    if (muteToggleButton) muteToggleButton.disabled = !controlsEnabled;
    // Power button is always enabled
    if (powerToggleButton) powerToggleButton.disabled = false;

    if (controlStatusElement) controlStatusElement.textContent = ''; // Clear feedback
    console.log("Projector UI Updated" + (isMockDataUsed ? " with mock data" : ""));
}

// --- Send Control Command (Assume Success) ---
async function sendControlCommand(payload) {
    if (!currentDeviceId) { console.error("Missing deviceId"); return Promise.resolve(); }
    console.log(`Sending command (assuming success): ${JSON.stringify(payload)}`);
    console.warn("Development Mode: Assuming command success immediately.");
    // Optionally refresh data after a short delay
    // setTimeout(loadDeviceData, 500);
    return Promise.resolve();
}

// --- HTML Initialization Call --- (Handled in HTML)
// document.addEventListener('DOMContentLoaded', initializeProjectorControl); 