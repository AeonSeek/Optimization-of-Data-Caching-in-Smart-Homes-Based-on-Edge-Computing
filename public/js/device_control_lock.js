let currentDeviceId = null;
let refreshIntervalId = null;
const REFRESH_INTERVAL_MS = 10000; // 门锁状态刷新可以快一点
let lastValidDeviceData = null;
let lastValidLogData = null; // Store last valid log data

// --- API Endpoints ---
const API_BASE_URL = '/api';
const GET_DEVICE_DATA_ENDPOINT = (deviceId) => `${API_BASE_URL}/devices/${deviceId}`;
const SEND_CONTROL_COMMAND_ENDPOINT = (deviceId) => `${API_BASE_URL}/devices/${deviceId}/command`;
const GET_DEVICE_LOG_ENDPOINT = (deviceId, limit = 10) => `${API_BASE_URL}/devices/${deviceId}/log?limit=${limit}`; // Endpoint for activity log

// --- DOM Elements ---
let deviceNameElement, lockButton, unlockButton,
    lockStatusVisualElement, lockStatusTextElement, batteryStatusElement,
    controlStatusElement, activityLogListElement, logLoadingMsgElement,
    lastUpdatedElement;

// --- Initialization ---
function initializeLockControl() {
    console.log("Initializing Lock Control Page...");
    const urlParams = new URLSearchParams(window.location.search);
    currentDeviceId = urlParams.get('deviceId');

    if (!currentDeviceId) { /* ...error handling... */ return; }
    console.log(`Controlling Device ID: ${currentDeviceId}`);

    // Get DOM elements
    deviceNameElement = document.getElementById('device-name');
    lockButton = document.getElementById('lock-button');
    unlockButton = document.getElementById('unlock-button');
    lockStatusVisualElement = document.getElementById('lock-status-visual');
    lockStatusTextElement = document.getElementById('lock-status-text');
    batteryStatusElement = document.getElementById('battery-status');
    controlStatusElement = document.getElementById('control-status');
    activityLogListElement = document.getElementById('activity-log-list');
    logLoadingMsgElement = document.getElementById('log-loading-msg');
    lastUpdatedElement = document.getElementById('last-updated-time');

    bindEventListeners();
    loadDeviceData(); // Load status
    loadActivityLog(); // Load log

    if (refreshIntervalId) clearInterval(refreshIntervalId);
    // Refresh both status and log periodically
    refreshIntervalId = setInterval(() => {
        loadDeviceData();
        loadActivityLog();
    } , REFRESH_INTERVAL_MS);
    window.addEventListener('beforeunload', () => clearInterval(refreshIntervalId));
}

// --- Event Listeners ---
function bindEventListeners() {
    if (lockButton) lockButton.addEventListener('click', () => handleLockUnlock('lock'));
    if (unlockButton) unlockButton.addEventListener('click', () => handleLockUnlock('unlock'));
}

// --- Optimistic Action Handler ---
async function handleLockUnlock(action) { // 'lock' or 'unlock'
    console.log(`Attempting to ${action} the lock (Optimistic)`);
    const previousState = getCurrentUIData();

    // Optimistic UI update
    const optimisticStatus = (action === 'lock') ? 'LOCKED' : 'UNLOCKED';
    updateUI({ data: { ...previousState, status: optimisticStatus } }); // Update internal state
    setControlsTemporaryDisabled(true);
    showFeedback(`正在${action === 'lock' ? '上锁' : '解锁'}...`, 'info');

    try {
        // TODO: Adapt payload, e.g., { command: 'setState', value: 'lock'/'unlock' } or { state: { status: 'LOCKED'/'UNLOCKED' } }
        await sendControlCommand({ command: 'setState', value: action });
        showFeedback(`门锁已${action === 'lock' ? '上锁' : '解锁'}`, 'success');
        // Refresh log after action might be good
        setTimeout(loadActivityLog, 600);
    } catch (error) {
        console.error(`Lock action '${action}' failed, reverting UI.`);
        updateUI({ data: previousState }); // Revert
        showFeedback(`门锁操作失败: ${error.message}`, 'error');
    } finally {
        setTimeout(() => setControlsTemporaryDisabled(false), 500);
    }
}

// --- Helpers ---
function getCurrentUIData() {
    if (lastValidDeviceData) {
        return { ...lastValidDeviceData };
    } else {
        return {
            // Infer status from class or text (less reliable)
            status: lockStatusTextElement?.textContent.includes('已上锁') ? 'LOCKED' :
                    lockStatusTextElement?.textContent.includes('已解锁') ? 'UNLOCKED' :
                    lockStatusTextElement?.textContent.includes('卡住') ? 'JAMMED' : 'UNKNOWN',
            battery: parseInt(batteryStatusElement?.textContent.replace(/[^0-9]/g, ''), 10) || null
        };
    }
}

function setControlsTemporaryDisabled(disabled) {
    const controls = [lockButton, unlockButton];
    controls.forEach(el => { if (el) el.disabled = disabled; });
    // No complex re-enabling needed
}

let feedbackTimeoutLock;
function showFeedback(message, type = 'info') { /* ... (same as AC version) ... */
    if (!controlStatusElement) { alert(message); return; }
    clearTimeout(feedbackTimeoutLock);
    controlStatusElement.textContent = message;
    controlStatusElement.className = `status-indicator feedback-${type}`;
    controlStatusElement.style.display = 'block'; // Ensure visibility
    controlStatusElement.style.textAlign = 'center'; // Center align
    feedbackTimeoutLock = setTimeout(() => {
       if (controlStatusElement) {
          controlStatusElement.textContent = '';
          controlStatusElement.style.display = 'none';
          controlStatusElement.className = 'status-indicator';
       }
    }, type === 'error' ? 4000 : 2500);
}


// --- Data Loading & UI Update ---
async function loadDeviceData() {
    // ... (Similar try/catch, store lastValidDeviceData) ...
    if (!currentDeviceId) return;
    try {
        const response = await fetch(GET_DEVICE_DATA_ENDPOINT(currentDeviceId));
        if (!response.ok) {
            console.error(`Lock HTTP error! status: ${response.status}. Displaying mock data.`);
            updateUI(null, true); lastValidDeviceData = null; return;
        }
        const deviceData = await response.json();
        console.log("Received lock data:", deviceData);
        lastValidDeviceData = deviceData.data; // Store valid data
        updateUI(deviceData);
    } catch (error) {
        console.error("Error fetching lock data:", error);
        updateUI(null, true); lastValidDeviceData = null;
        // Do not clear interval on lock error, maybe it recovers
    }
}

// Restore the previous updateUI function which seemed to work with the HTML
function updateUI(deviceData, isError = false) {
    let isMockDataUsed = false;
    let data = {};
    let name = '门锁'; // Default name without mock
    let lastUpdated = null;

    if (isError || !deviceData || !deviceData.data) {
        console.warn("Using mock data for Lock...");
        isMockDataUsed = true;
        name = deviceData?.name || '客厅门锁'; // Remove (模拟)
        data = {
            // Common lock statuses: LOCKED, UNLOCKED, LOCKING, UNLOCKING, JAMMED, UNKNOWN
            status: ['LOCKED', 'UNLOCKED', 'JAMMED'][Math.floor(Math.random() * 3)],
            battery: Math.floor(Math.random() * 91) + 10 // 10-100%
        };
        lastUpdated = Date.now();
    } else {
        data = deviceData.data;
        name = deviceData.name || '门锁';
        lastUpdated = deviceData.last_updated;
        // Fill missing mock data
        if (data.status === undefined) { data.status = 'UNKNOWN'; isMockDataUsed = true; console.log("Mocking status"); }
        if (data.battery === undefined) { data.battery = 50; isMockDataUsed = true; console.log("Mocking battery"); }
    }

    // Update Device Name (Remove mock indicator)
    if (deviceNameElement) deviceNameElement.textContent = name;

    // Update status visual and text
    const status = (data.status || 'UNKNOWN').toUpperCase();
    let statusText = '状态未知';
    let statusIcon = '?'; // Use text/emoji or FontAwesome class
    let visualClass = 'lock-status-unknown';

    switch (status) {
        case 'LOCKED':
            statusText = '已上锁'; statusIcon = '🔒'; visualClass = 'lock-status-locked'; break;
        case 'UNLOCKED':
            statusText = '已解锁'; statusIcon = '🔓'; visualClass = 'lock-status-unlocked'; break;
        case 'LOCKING': // Assuming these are transient states
            statusText = '上锁中...'; statusIcon = '⏳'; visualClass = 'lock-status-unknown'; break;
        case 'UNLOCKING':
            statusText = '解锁中...'; statusIcon = '⏳'; visualClass = 'lock-status-unknown'; break;
        case 'JAMMED':
            statusText = '门锁卡住'; statusIcon = '⚠️'; visualClass = 'lock-status-jammed'; break;
        default: // UNKNOWN or other
            statusText = '状态未知'; statusIcon = '?'; visualClass = 'lock-status-unknown';
    }

    // Assuming lockStatusVisualElement expects text/emoji content based on HTML
    if (lockStatusVisualElement) {
        lockStatusVisualElement.textContent = statusIcon;
        // Assuming the class is applied for background/color based on HTML <style>
        lockStatusVisualElement.className = `lock-status-indicator ${visualClass}`;
    }
    if (lockStatusTextElement) lockStatusTextElement.textContent = statusText;

    // Update battery status
    if (batteryStatusElement) {
        const batteryLevel = data.battery;
        batteryStatusElement.textContent = (batteryLevel !== undefined && batteryLevel !== null) ? `电池: ${batteryLevel}%` : '电池: --%';
        // Optional: Change color based on battery level
        batteryStatusElement.style.color = (batteryLevel !== null && batteryLevel < 20) ? 'var(--status-error-color, red)' : 'var(--text-muted)';
    }

    // Enable/Disable buttons based on status
    const canInteract = (status === 'LOCKED' || status === 'UNLOCKED');
    if(lockButton) lockButton.disabled = !canInteract || status === 'LOCKED';
    if(unlockButton) unlockButton.disabled = !canInteract || status === 'UNLOCKED';

    // Update Last Updated Time
    if (lastUpdatedElement) {
         if (isMockDataUsed) {
            lastUpdatedElement.textContent = '数据加载失败'; // Change mock text
            lastUpdatedElement.style.color = 'red'; // Make it more visible
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
    if (controlStatusElement) controlStatusElement.textContent = ''; // Clear action status
    console.log("Lock UI Updated" + (isMockDataUsed ? " with mock data" : ""));
}

// --- Activity Log Handling ---
async function loadActivityLog() {
    if (!currentDeviceId || !activityLogListElement) return;
    console.log(`Fetching activity log for lock: ${currentDeviceId}`);
    if (logLoadingMsgElement) logLoadingMsgElement.textContent = '正在加载日志...';

    try {
        // --- Simulation for Log ---
         if (API_BASE_URL === '/api') {
             console.warn("Simulating log fetch.");
             await new Promise(resolve => setTimeout(resolve, 600));
             lastValidLogData = generateMockLogData();
             renderActivityLog(lastValidLogData);
             return;
         }
        // --- End Simulation ---

        const response = await fetch(GET_DEVICE_LOG_ENDPOINT(currentDeviceId));
        if (!response.ok) {
            throw new Error(`Log fetch failed: ${response.status}`);
        }
        const logData = await response.json(); // Expecting array of log entries
        lastValidLogData = logData; // Store valid log
        renderActivityLog(logData);

    } catch (error) {
        console.error("Error fetching activity log:", error);
        if (activityLogListElement) {
             activityLogListElement.innerHTML = '<li>日志加载失败</li>'; // Show error in list
        }
        // Optionally display mock log on error
        // if (!lastValidLogData) { // Only show mock if never loaded successfully
        //    renderActivityLog(generateMockLogData());
        //    if (logLoadingMsgElement) logLoadingMsgElement.textContent = '显示模拟日志';
        // }
    }
}

/**
 * Renders the activity log.
 * @param {Array<object>} logEntries - Array of log entry objects.
 */
function renderActivityLog(logEntries) {
    const logList = document.getElementById('activity-log-list');
    if (!logList) {
        console.error("Activity log list element not found!");
        return;
    }
    logList.innerHTML = ''; // Clear previous entries

    if (!logEntries || logEntries.length === 0) {
        logList.innerHTML = '<li>暂无活动记录。</li>'; // Simplified Chinese
        return;
    }

    logEntries.slice(0, 10).forEach(entry => { // Display latest 10 entries
        const listItem = document.createElement('li');
        const timestamp = new Date(entry.timestamp).toLocaleString('zh-CN'); // Format for Chinese locale
        listItem.textContent = `${timestamp}: ${translateLogAction(entry.action)} ${entry.user || ''}`;
        logList.appendChild(listItem);
    });
    console.log("Activity log rendered.");
}

/**
 * Generates mock activity log data.
 * @returns {Array<object>}
 */
function generateMockLogData() {
    const actions = ['locked', 'unlocked', 'battery_low', 'tamper_detected'];
    const users = ['用户A', '用户B', '管理员', '']; // Include empty for system events
    const mockLogs = [];
    const now = Date.now();
    for (let i = 0; i < 5; i++) { // Generate 5 mock entries
        mockLogs.push({
            timestamp: now - i * Math.random() * 3600 * 1000, // Random time in the last few hours
            action: actions[Math.floor(Math.random() * actions.length)],
            user: users[Math.floor(Math.random() * users.length)]
        });
    }
    // Sort by timestamp descending
    mockLogs.sort((a, b) => b.timestamp - a.timestamp);
    console.log("Generated mock log data:", mockLogs);
    return mockLogs;
}

/**
 * Translates log action keys to Chinese.
 * @param {string} action - The action key.
 * @returns {string} - The translated action name.
 */
function translateLogAction(action) {
    const actions = {
        'locked': '上锁',
        'unlocked': '解锁',
        'unlocked_keypad': '通过键盘解锁',
        'unlocked_fingerprint': '通过指纹解锁',
        'unlocked_app': '通过App解锁',
        'locked_auto': '自动上锁',
        'battery_low': '电池电量低',
        'tamper_detected': '检测到异常操作',
        'door_opened': '门已打开', // If applicable
        'door_closed': '门已关闭'  // If applicable
    };
    return actions[action] || action;
}

// --- Send Control Command (Always Assume Success) ---
async function sendControlCommand(payload) {
    if (!currentDeviceId) { console.error("Missing deviceId"); return Promise.resolve(); }
    console.log(`Sending command (assuming success): ${JSON.stringify(payload)}`);
    console.warn("Development Mode: Assuming command success immediately.");
    return Promise.resolve();
}

// ... (HTML call unchanged) ... 