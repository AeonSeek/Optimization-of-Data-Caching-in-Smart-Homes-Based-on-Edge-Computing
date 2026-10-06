let currentDeviceId = null;
let refreshIntervalId = null;
const REFRESH_INTERVAL_MS = 15000;

// --- API Endpoints (Adjust as needed) ---
const API_BASE_URL = '/api';
const GET_DEVICE_DATA_ENDPOINT = (deviceId) => `${API_BASE_URL}/devices/${deviceId}`;
const SEND_CONTROL_COMMAND_ENDPOINT = (deviceId) => `${API_BASE_URL}/devices/${deviceId}/command`;

// --- DOM Elements ---
let deviceNameElement, powerToggleButton, powerStatusElement,
    volumeDownButton, volumeSlider, volumeUpButton, muteToggleButton, volumeValueElement,
    channelDownButton, channelInput, channelUpButton, channelSetButton, channelStatusElement,
    sourceSelect, sourceStatusElement, controlStatusElement,
    tvPowerStatusElement, currentChannelElement, currentVolumeElement, muteIndicatorElement, currentSourceElement, lastUpdatedElement;

// --- Initialization ---
function initializeTvControl() {
    console.log("Initializing TV Control Page...");

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

    // Get DOM elements
    deviceNameElement = document.getElementById('device-name');
    powerToggleButton = document.getElementById('power-toggle');
    powerStatusElement = document.getElementById('power-status'); // Control panel status
    volumeDownButton = document.getElementById('volume-down');
    volumeSlider = document.getElementById('volume-slider');
    volumeUpButton = document.getElementById('volume-up');
    muteToggleButton = document.getElementById('mute-toggle');
    volumeValueElement = document.getElementById('volume-value');
    channelDownButton = document.getElementById('channel-down');
    channelInput = document.getElementById('channel-input');
    channelUpButton = document.getElementById('channel-up');
    channelSetButton = document.getElementById('channel-set');
    channelStatusElement = document.getElementById('channel-status');
    sourceSelect = document.getElementById('source-select');
    sourceStatusElement = document.getElementById('source-status');
    controlStatusElement = document.getElementById('control-status');

    // Status display elements
    tvPowerStatusElement = document.getElementById('tv-power-status');
    currentChannelElement = document.getElementById('current-channel');
    currentVolumeElement = document.getElementById('current-volume');
    muteIndicatorElement = document.getElementById('mute-indicator');
    currentSourceElement = document.getElementById('current-source');
    lastUpdatedElement = document.getElementById('last-updated-time');

    bindEventListeners();
    loadDeviceData();

    // Set refresh interval
    if (refreshIntervalId) clearInterval(refreshIntervalId);
    refreshIntervalId = setInterval(loadDeviceData, REFRESH_INTERVAL_MS);

    window.addEventListener('beforeunload', () => {
        if (refreshIntervalId) clearInterval(refreshIntervalId);
    });
}

// --- Event Listeners ---
function bindEventListeners() {
    if (powerToggleButton) powerToggleButton.addEventListener('click', handlePowerToggle);
    if (volumeDownButton) volumeDownButton.addEventListener('click', () => handleVolumeChange('down'));
    if (volumeUpButton) volumeUpButton.addEventListener('click', () => handleVolumeChange('up'));
    if (volumeSlider) {
         volumeSlider.addEventListener('input', () => {
             if(volumeValueElement) volumeValueElement.textContent = volumeSlider.value;
         });
         volumeSlider.addEventListener('change', handleVolumeSliderChange);
    }
    if (muteToggleButton) muteToggleButton.addEventListener('click', handleMuteToggle);
    if (channelDownButton) channelDownButton.addEventListener('click', () => handleChannelChange('down'));
    if (channelUpButton) channelUpButton.addEventListener('click', () => handleChannelChange('up'));
    if (channelSetButton) channelSetButton.addEventListener('click', handleChannelSet);
    if (channelInput) channelInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') handleChannelSet(); }); // Allow Enter key
    if (sourceSelect) sourceSelect.addEventListener('change', handleSourceChange);
}

// --- Action Handlers ---
async function handlePowerToggle() {
    console.log("Power toggle clicked");
     if (controlStatusElement) controlStatusElement.textContent = '发送命令中...';
    // TODO: Adapt payload based on backend API
    // Example: { command: 'setPower', value: 'toggle' } or { state: { power: 'ON'/'OFF' } }
    const currentPowerState = tvPowerStatusElement?.textContent === '开启';
    await sendControlCommand({ command: 'setPower', value: currentPowerState ? 'OFF' : 'ON' });
}

async function handleVolumeChange(direction) {
    console.log(`Volume ${direction}`);
     if (controlStatusElement) controlStatusElement.textContent = '调节音量中...';
    // TODO: Adapt payload
    // Example: { command: 'setVolume', value: 'up'/'down' }
    await sendControlCommand({ command: 'setVolume', value: direction });
}

async function handleVolumeSliderChange() {
    const newVolume = parseInt(volumeSlider.value, 10);
    console.log(`Set volume to: ${newVolume}`);
    if (volumeValueElement) volumeValueElement.textContent = newVolume;
     if (controlStatusElement) controlStatusElement.textContent = '设置音量中...';
    // TODO: Adapt payload
    // Example: { command: 'setVolume', value: newVolume } or { state: { volume: newVolume } }
    await sendControlCommand({ command: 'setVolume', value: newVolume });
}

async function handleMuteToggle() {
    console.log("Mute toggle clicked");
     if (controlStatusElement) controlStatusElement.textContent = '切换静音中...';
    // TODO: Adapt payload
    // Example: { command: 'setMute', value: 'toggle' } or { state: { muted: true/false } }
     const isCurrentlyMuted = muteIndicatorElement?.textContent.includes('静音');
    await sendControlCommand({ command: 'setMute', value: !isCurrentlyMuted });
}

async function handleChannelChange(direction) {
    console.log(`Channel ${direction}`);
     if (controlStatusElement) controlStatusElement.textContent = '切换频道中...';
    // TODO: Adapt payload
    // Example: { command: 'setChannel', value: 'up'/'down' }
    await sendControlCommand({ command: 'setChannel', value: direction });
}

async function handleChannelSet() {
    if (!channelInput) return;
    const newChannel = parseInt(channelInput.value, 10);
    if (isNaN(newChannel) || newChannel < 1) {
        console.error("Invalid channel number");
        alert("请输入有效的频道号！");
        return;
    }
    console.log(`Set channel to: ${newChannel}`);
     if (controlStatusElement) controlStatusElement.textContent = `跳转频道 ${newChannel} 中...`;
    // TODO: Adapt payload
    // Example: { command: 'setChannel', value: newChannel } or { state: { channel: newChannel } }
    await sendControlCommand({ command: 'setChannel', value: newChannel });
}

async function handleSourceChange() {
    if (!sourceSelect) return;
    const newSource = sourceSelect.value;
    console.log(`Set source to: ${newSource}`);
     if (controlStatusElement) controlStatusElement.textContent = `切换输入源 ${newSource} 中...`;
    // TODO: Adapt payload
    // Example: { command: 'setSource', value: newSource } or { state: { source: newSource } }
    await sendControlCommand({ command: 'setSource', value: newSource });
}


// --- Data Loading and UI Update ---
async function loadDeviceData() {
    if (!currentDeviceId) return;
    console.log(`Fetching data for TV: ${currentDeviceId}`);
    try {
        const response = await fetch(GET_DEVICE_DATA_ENDPOINT(currentDeviceId));
        if (!response.ok) {
             console.error(`HTTP error! status: ${response.status}. Displaying mock data.`);
             updateUI(null, true); // 传递错误标记
             return;
        }
        const deviceData = await response.json();
        console.log("Received TV data:", deviceData);
        updateUI(deviceData);
    } catch (error) {
        console.error("Error fetching TV data:", error);
         updateUI(null, true); // 传递错误标记
        // Display error on page (already handled inside updateUI now)
        // const statusDisplay = document.querySelector('.status-display');
        // if (statusDisplay) statusDisplay.innerHTML = "<p style='color: red;'>数据加载失败</p>" + statusDisplay.innerHTML;
        if (refreshIntervalId) clearInterval(refreshIntervalId);
    }
}

/**
 * Updates the UI with the provided device data.
 * @param {object} data - The device data object.
 * @param {boolean} [isMockData=false] - Flag indicating if the data is mock data.
 */
function updateUI(data, isMockData = false) {
    console.log("Updating TV UI with data:", data, "Is mock:", isMockData);
    const statusElement = document.getElementById('tv-status');
    const channelDisplay = document.getElementById('tv-channel-display');
    const volumeDisplay = document.getElementById('tv-volume-display');
    const sourceDisplay = document.getElementById('tv-source-display');

    const powerToggle = document.getElementById('tv-power-toggle');
    const volumeSlider = document.getElementById('tv-volume-slider');
    const volumeValueSpan = document.getElementById('tv-volume-value');
    const channelInput = document.getElementById('tv-channel-input');
    const sourceSelect = document.getElementById('tv-source-select');
    const controls = document.querySelectorAll('#tv-controls button, #tv-controls input, #tv-controls select');

    // Clear previous mock data indicator if it exists
    const existingMockIndicator = document.getElementById('mock-data-indicator');
    if (existingMockIndicator) {
        existingMockIndicator.remove();
    }

    if (!data || typeof data.status === 'undefined') {
        console.warn("Incomplete or no data received for TV UI update. Displaying default state.");
        statusElement.textContent = '离线';
        statusElement.className = 'status-indicator status-offline';
        channelDisplay.textContent = '未知';
        volumeDisplay.textContent = '未知';
        sourceDisplay.textContent = '未知';
        powerToggle.checked = false;
        powerToggle.disabled = true; // Disable toggle if state is unknown
        controls.forEach(control => control.disabled = true);
        powerToggle.disabled = false; // Or keep all disabled? Let's disable all.
        return;
    }

    // Update status display
    statusElement.textContent = data.status === 'on' ? '开机' : '关机';
    statusElement.className = data.status === 'on' ? 'status-indicator status-on' : 'status-indicator status-off';

    // Update specific values if TV is on
    if (data.status === 'on') {
        channelDisplay.textContent = `频道: ${data.channel}`;
        volumeDisplay.textContent = `音量: ${data.volume}`;
        sourceDisplay.textContent = `输入源: ${data.source}`;
    } else {
        channelDisplay.textContent = '-';
        volumeDisplay.textContent = '-';
        sourceDisplay.textContent = '-';
    }

    // Update controls state
    powerToggle.checked = data.status === 'on';
    volumeSlider.value = data.volume;
    volumeValueSpan.textContent = data.volume;
    channelInput.value = data.channel;
    sourceSelect.value = data.source;

    // Enable/disable controls based on power status
    const isOff = data.status === 'off';
    controls.forEach(control => {
        if (control.id !== 'tv-power-toggle') { // Keep power toggle always enabled
            control.disabled = isOff;
        } else {
            control.disabled = false; // Ensure power toggle is enabled
        }
    });

    console.log("TV UI updated successfully.");
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
    // loadDeviceData(); // Optional
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
    feedbackElement.textContent = message; // Ensure messages are Chinese
    feedbackElement.className = `feedback ${type}`;
    feedbackElement.style.display = 'block';

    setTimeout(() => {
        feedbackElement.style.display = 'none';
    }, 3000);
}

// Called from HTML after DOMContentLoaded 