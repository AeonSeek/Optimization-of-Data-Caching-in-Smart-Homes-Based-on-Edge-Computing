let currentDeviceId = null;
let refreshIntervalId = null;
const REFRESH_INTERVAL_MS = 30000; // 冰箱数据变化较慢，刷新间隔长一些
let lastValidDeviceData = null;
let temperatureChart = null;

// --- API Endpoints ---
const API_BASE_URL = '/api';
const GET_DEVICE_DATA_ENDPOINT = (deviceId) => `${API_BASE_URL}/devices/${deviceId}`;
const SEND_CONTROL_COMMAND_ENDPOINT = (deviceId) => `${API_BASE_URL}/devices/${deviceId}/command`;
// 可能需要单独的 history endpoint 获取 fridge 和 freezer 温度
const GET_DEVICE_HISTORY_ENDPOINT = (deviceId, dataType, limit = 24) => `${API_BASE_URL}/devices/${deviceId}/history?type=${dataType}&limit=${limit}`;

// --- DOM Elements ---
let deviceNameElement, fridgeTempSlider, fridgeTempValueElement,
    freezerTempSlider, freezerTempValueElement, modeSelect, modeStatusElement,
    icemakerToggleButton, icemakerStatusElement, controlStatusElement,
    setFridgeTempElement, currentFridgeTempElement, setFreezerTempElement,
    currentFreezerTempElement, currentModeElement, currentIcemakerStatusElement,
    lastUpdatedElement;
let temperatureChartCanvas, chartLoadingMsg;

// --- Initialization ---
function initializeRefrigeratorControl() {
    console.log("Initializing Refrigerator Control Page...");
    const urlParams = new URLSearchParams(window.location.search);
    currentDeviceId = urlParams.get('deviceId');

    if (!currentDeviceId) { /* ...错误处理... */ return; }
    console.log(`Controlling Device ID: ${currentDeviceId}`);

    // Get DOM elements
    deviceNameElement = document.getElementById('device-name');
    fridgeTempSlider = document.getElementById('fridge-temp-slider');
    fridgeTempValueElement = document.getElementById('fridge-temp-value');
    freezerTempSlider = document.getElementById('freezer-temp-slider');
    freezerTempValueElement = document.getElementById('freezer-temp-value');
    modeSelect = document.getElementById('mode-select');
    modeStatusElement = document.getElementById('mode-status');
    icemakerToggleButton = document.getElementById('icemaker-toggle');
    icemakerStatusElement = document.getElementById('current-icemaker-status');
    controlStatusElement = document.getElementById('control-status');
    setFridgeTempElement = document.getElementById('set-fridge-temp');
    currentFridgeTempElement = document.getElementById('current-fridge-temp');
    setFreezerTempElement = document.getElementById('set-freezer-temp');
    currentFreezerTempElement = document.getElementById('current-freezer-temp');
    currentModeElement = document.getElementById('current-mode');
    currentIcemakerStatusElement = document.getElementById('current-icemaker-status');
    lastUpdatedElement = document.getElementById('last-updated-time');

    // 获取图表相关 DOM 元素
    temperatureChartCanvas = document.getElementById('temperature-chart');
    chartLoadingMsg = document.getElementById('chart-loading-msg');

    bindEventListeners();
    loadDeviceData();
    loadChartData();

    if (refreshIntervalId) clearInterval(refreshIntervalId);
    refreshIntervalId = setInterval(loadDeviceData, REFRESH_INTERVAL_MS);
    window.addEventListener('beforeunload', () => clearInterval(refreshIntervalId));
}

// --- Event Listeners ---
function bindEventListeners() {
    if (fridgeTempSlider) {
        fridgeTempSlider.addEventListener('input', () => { if(fridgeTempValueElement) fridgeTempValueElement.textContent = fridgeTempSlider.value; });
        fridgeTempSlider.addEventListener('change', handleFridgeTempChange);
    }
    if (freezerTempSlider) {
        freezerTempSlider.addEventListener('input', () => { if(freezerTempValueElement) freezerTempValueElement.textContent = freezerTempSlider.value; });
        freezerTempSlider.addEventListener('change', handleFreezerTempChange);
    }
    if (modeSelect) modeSelect.addEventListener('change', handleModeChange);
    if (icemakerToggleButton) icemakerToggleButton.addEventListener('click', handleIcemakerToggle);
}

// --- Optimistic Action Handlers ---

async function handleFridgeTempChange() {
    if (!fridgeTempSlider || !fridgeTempValueElement) return;
    const newTemp = parseInt(fridgeTempSlider.value, 10);
    console.log(`Set fridge temp to: ${newTemp}°C (Optimistic)`);
    const previousState = getCurrentUIData();
    fridgeTempValueElement.textContent = newTemp; // Update display
    if (setFridgeTempElement) setFridgeTempElement.textContent = newTemp;
    setControlsTemporaryDisabled(true);
    showFeedback('正在设定冷藏温度...', 'info');
    try {
        // Payload might be like: { state: { fridge_temp_set: newTemp } }
        await sendControlCommand({ state: { fridge_temp_set: newTemp } });
        showFeedback(`冷藏温度设定为 ${newTemp}°C 成功`, 'success');
        if(lastValidDeviceData) lastValidDeviceData.fridge_temp_set = newTemp;
    } catch (error) {
        console.error("Set fridge temp failed, reverting.");
        const revertTemp = previousState?.fridge_temp_set || 4;
        fridgeTempSlider.value = revertTemp;
        fridgeTempValueElement.textContent = revertTemp;
        if (setFridgeTempElement) setFridgeTempElement.textContent = revertTemp;
        showFeedback(`冷藏温度设定失败: ${error.message}`, 'error');
    } finally {
        setTimeout(() => setControlsTemporaryDisabled(false), 500);
    }
}

async function handleFreezerTempChange() {
    if (!freezerTempSlider || !freezerTempValueElement) return;
    const newTemp = parseInt(freezerTempSlider.value, 10);
    console.log(`Set freezer temp to: ${newTemp}°C (Optimistic)`);
    const previousState = getCurrentUIData();
    freezerTempValueElement.textContent = newTemp;
    if (setFreezerTempElement) setFreezerTempElement.textContent = newTemp;
    setControlsTemporaryDisabled(true);
    showFeedback('正在设定冷冻温度...', 'info');
    try {
        // Payload might be like: { state: { freezer_temp_set: newTemp } }
        await sendControlCommand({ state: { freezer_temp_set: newTemp } });
        showFeedback(`冷冻温度设定为 ${newTemp}°C 成功`, 'success');
        if(lastValidDeviceData) lastValidDeviceData.freezer_temp_set = newTemp;
    } catch (error) {
        console.error("Set freezer temp failed, reverting.");
        const revertTemp = previousState?.freezer_temp_set || -18;
        freezerTempSlider.value = revertTemp;
        freezerTempValueElement.textContent = revertTemp;
        if (setFreezerTempElement) setFreezerTempElement.textContent = revertTemp;
        showFeedback(`冷冻温度设定失败: ${error.message}`, 'error');
    } finally {
        setTimeout(() => setControlsTemporaryDisabled(false), 500);
    }
}

async function handleModeChange() {
    if (!modeSelect || !currentModeElement) return;
    const newMode = modeSelect.value;
    console.log(`Set mode to: ${newMode} (Optimistic)`);
    const previousState = getCurrentUIData();
    if (currentModeElement) currentModeElement.textContent = translateMode(newMode);
    if (modeStatusElement) modeStatusElement.textContent = translateMode(newMode); // Also update control panel status if exists
    setControlsTemporaryDisabled(true);
    showFeedback('正在切换模式...', 'info');
    try {
        // Payload: { state: { mode: newMode } }
        await sendControlCommand({ state: { mode: newMode } });
        showFeedback(`模式切换为 ${translateMode(newMode)} 成功`, 'success');
        if(lastValidDeviceData) lastValidDeviceData.mode = newMode;
    } catch (error) {
        console.error("Mode change failed, reverting.");
        const revertMode = previousState?.mode || 'standard';
        modeSelect.value = revertMode;
        if (currentModeElement) currentModeElement.textContent = translateMode(revertMode);
        if (modeStatusElement) modeStatusElement.textContent = translateMode(revertMode);
        showFeedback(`模式切换失败: ${error.message}`, 'error');
    } finally {
        setTimeout(() => setControlsTemporaryDisabled(false), 500);
    }
}

async function handleIcemakerToggle() {
    if (!icemakerToggleButton || !icemakerStatusElement) return;
    console.log("Toggle icemaker (Optimistic)");
    const previousState = getCurrentUIData();
    const currentStateIsOn = previousState?.ice_maker === 'on';
    const newState = currentStateIsOn ? 'off' : 'on'; // Toggle 'on'/'off' state

    if (icemakerStatusElement) icemakerStatusElement.textContent = newState === 'on' ? '开启' : '关闭';

    setControlsTemporaryDisabled(true);
    showFeedback('正在切换制冰机...', 'info');
    try {
        // Payload: { state: { ice_maker: newState } }
        await sendControlCommand({ state: { ice_maker: newState } });
        showFeedback(`制冰机已${newState === 'on' ? '开启' : '关闭'}`, 'success');
        if(lastValidDeviceData) lastValidDeviceData.ice_maker = newState;
    } catch (error) {
        console.error("Icemaker toggle failed, reverting.");
        if (icemakerStatusElement) icemakerStatusElement.textContent = currentStateIsOn ? '开启' : '关闭'; // Revert display
        showFeedback(`制冰机切换失败: ${error.message}`, 'error');
    } finally {
        setTimeout(() => setControlsTemporaryDisabled(false), 500);
    }
}


// --- Helpers (getCurrentUIData, setControlsTemporaryDisabled, showFeedback) ---
function getCurrentUIData() {
    if (lastValidDeviceData) {
        return { ...lastValidDeviceData };
    } else {
        console.warn("Falling back to reading UI state for getCurrentUIData in refrigerator");
        return {
            fridge_temp_set: parseInt(fridgeTempSlider?.value, 10),
            fridge_temp_actual: parseFloat(currentFridgeTempElement?.textContent),
            freezer_temp_set: parseInt(freezerTempSlider?.value, 10),
            freezer_temp_actual: parseFloat(currentFreezerTempElement?.textContent),
            mode: modeSelect?.value,
            ice_maker: icemakerStatusElement?.textContent === '开启' ? 'on' : 'off'
        };
    }
}

function setControlsTemporaryDisabled(disabled) {
    const controls = [fridgeTempSlider, freezerTempSlider, modeSelect, icemakerToggleButton];
    controls.forEach(el => { if (el) el.disabled = disabled; });
}

let feedbackTimeoutFridge;
function showFeedback(message, type = 'info') {
    if (!controlStatusElement) { alert(message); return; }
    clearTimeout(feedbackTimeoutFridge);
    controlStatusElement.textContent = message;
    controlStatusElement.className = `status-indicator feedback-${type}`;
    controlStatusElement.style.display = 'block';
    feedbackTimeoutFridge = setTimeout(() => {
       if (controlStatusElement) {
          controlStatusElement.textContent = '';
          controlStatusElement.style.display = 'none';
          controlStatusElement.className = 'status-indicator';
       }
    }, type === 'error' ? 4000 : 2500);
}


// --- Data Loading & UI Update (with Mock Data) ---
async function loadDeviceData() {
    if (!currentDeviceId) return;
    console.log(`Fetching data for refrigerator: ${currentDeviceId}`);
    try {
        const response = await fetch(GET_DEVICE_DATA_ENDPOINT(currentDeviceId));
        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}. Displaying mock data.`);
            updateUI(null, true);
            lastValidDeviceData = null; return;
        }
        const deviceData = await response.json();
        console.log("Received refrigerator data:", deviceData);
        lastValidDeviceData = deviceData.data;
        updateUI(deviceData);
    } catch (error) {
        console.error("Error fetching refrigerator data:", error);
        updateUI(null, true);
        lastValidDeviceData = null;
        if (refreshIntervalId) clearInterval(refreshIntervalId);
    }
}

/**
 * Updates the UI with the provided device data.
 * @param {object} data - The device data object.
 * @param {boolean} [isMockData=false] - Flag indicating if the data is mock data.
 */
function updateUI(deviceData, isError = false) {
    let isMockDataUsed = false;
    let data = {};
    let name = '冰箱';
    let lastUpdated = null;

    if (isError || !deviceData || !deviceData.data) {
        console.warn("Using mock data for Refrigerator...");
        isMockDataUsed = true;
        name = deviceData?.name || '客厅冰箱';
        data = {
            fridge_temp_set: Math.floor(Math.random() * 6) + 2, // 2-7
            fridge_temp_actual: (Math.random() * 6 + 2.5).toFixed(1), // 2.5-8.5
            freezer_temp_set: Math.floor(Math.random() * 6) - 22, // -22 to -17
            freezer_temp_actual: (Math.random() * 6 - 21.5).toFixed(1), // -21.5 to -15.5
            mode: ['standard', 'eco', 'vacation', 'quick_freeze'][Math.floor(Math.random() * 4)],
            ice_maker: Math.random() > 0.5 ? 'on' : 'off'
        };
        lastUpdated = Date.now();
    } else {
        data = deviceData.data;
        name = deviceData.name || '冰箱';
        lastUpdated = deviceData.last_updated;
        // Fill missing fields if needed
        if (data.fridge_temp_set === undefined) { data.fridge_temp_set = 4; isMockDataUsed = true; console.log("Mocking fridge_temp_set"); }
        if (data.fridge_temp_actual === undefined) { data.fridge_temp_actual = 4.5; isMockDataUsed = true; console.log("Mocking fridge_temp_actual"); }
        if (data.freezer_temp_set === undefined) { data.freezer_temp_set = -18; isMockDataUsed = true; console.log("Mocking freezer_temp_set"); }
        if (data.freezer_temp_actual === undefined) { data.freezer_temp_actual = -17.5; isMockDataUsed = true; console.log("Mocking freezer_temp_actual"); }
        if (data.mode === undefined) { data.mode = 'standard'; isMockDataUsed = true; console.log("Mocking mode"); }
        if (data.ice_maker === undefined) { data.ice_maker = 'on'; isMockDataUsed = true; console.log("Mocking ice_maker"); }
    }

    console.log("Updating Refrigerator UI with final data:", data, "Is mock:", isMockDataUsed);

    // Update Device Name (ensure no mock indicator)
    if (deviceNameElement) deviceNameElement.textContent = name;

    // Update Status Display
    if(setFridgeTempElement) setFridgeTempElement.textContent = data.fridge_temp_set ?? '--';
    if(currentFridgeTempElement) currentFridgeTempElement.textContent = data.fridge_temp_actual ?? '--';
    if(setFreezerTempElement) setFreezerTempElement.textContent = data.freezer_temp_set ?? '--';
    if(currentFreezerTempElement) currentFreezerTempElement.textContent = data.freezer_temp_actual ?? '--';
    if(currentModeElement) currentModeElement.textContent = translateMode(data.mode || '未知');
    if(icemakerStatusElement) icemakerStatusElement.textContent = (data.ice_maker === 'on' ? '开启' : '关闭') || '未知';

    // Update Controls
    if(fridgeTempSlider) fridgeTempSlider.value = data.fridge_temp_set ?? 4;
    if(fridgeTempValueElement) fridgeTempValueElement.textContent = data.fridge_temp_set ?? '--';
    if(freezerTempSlider) freezerTempSlider.value = data.freezer_temp_set ?? -18;
    if(freezerTempValueElement) freezerTempValueElement.textContent = data.freezer_temp_set ?? '--';
    if(modeSelect) modeSelect.value = data.mode || 'standard';
    if(modeStatusElement) modeStatusElement.textContent = translateMode(data.mode || '未知'); // If this element exists
    // Icemaker is a button, no value to set, status is handled above

    // Update Last Updated Time
    if (lastUpdatedElement) {
        if (isMockDataUsed) {
            lastUpdatedElement.textContent = '数据加载失败';
            lastUpdatedElement.style.color = 'red';
        } else if (lastUpdated) {
            try { lastUpdatedElement.textContent = new Date(lastUpdated).toLocaleString('zh-CN'); lastUpdatedElement.style.color = ''; } catch (e) { console.error("Error formatting last updated:", e); lastUpdatedElement.textContent = 'N/A'; lastUpdatedElement.style.color = '';}
        } else {
            lastUpdatedElement.textContent = '--'; lastUpdatedElement.style.color = '';
        }
    }

    // Enable/Disable controls based on actual or mock data
    const controls = [fridgeTempSlider, freezerTempSlider, modeSelect, icemakerToggleButton];
    controls.forEach(el => { if(el) el.disabled = false; }); // Enable all by default

    if (controlStatusElement) controlStatusElement.textContent = ''; // Clear any feedback
    console.log("Refrigerator UI Updated" + (isMockDataUsed ? " with mock data" : ""));
}

// --- Send Control Command (Always Assume Success) ---
async function sendControlCommand(payload) {
    if (!currentDeviceId) { console.error("Missing deviceId"); return Promise.resolve(); }
    console.log(`Sending command (assuming success): ${JSON.stringify(payload)}`);
    console.warn("Development Mode: Assuming command success immediately.");
    return Promise.resolve();
}

/**
 * Translates mode keys to Chinese.
 * @param {string} mode - The mode key (e.g., 'standard', 'eco').
 * @returns {string} - The translated mode name.
 */
function translateMode(mode) {
    const modes = {
        'standard': '标准',
        'eco': '节能',
        'vacation': '假日',
        'quick_freeze': '速冻',
        'smart': '智能', // Added smart if used
        'fast_cool': '速冷' // Added fast_cool if used
    };
    return modes[mode] || mode;
}

// --- Combined Chart Handling ---
async function loadChartData() {
    if (!currentDeviceId) return;
    console.log(`Fetching chart data for refrigerator: ${currentDeviceId}`);

    if (chartLoadingMsg) {
        chartLoadingMsg.textContent = '加载中...';
        chartLoadingMsg.style.display = 'block';
    }

    if (temperatureChart) temperatureChart.destroy();

    let fridgeHistory = null;
    let freezerHistory = null;

    // Use Promise.all for potentially faster parallel fetching
    try {
        [fridgeHistory, freezerHistory] = await Promise.all([
            fetch(GET_DEVICE_HISTORY_ENDPOINT(currentDeviceId, 'fridge_temp')).then(res => {
                if (!res.ok) throw new Error(`Fridge fetch failed: ${res.status}`);
                return res.json();
            }).then(data => {
                 if (!Array.isArray(data) || data.length === 0) throw new Error("Fridge data invalid");
                 console.log("Received valid fridge history");
                 return data;
            }).catch(err => {
                console.warn(err.message + ". Using mock fridge data.");
                return null; // Indicate failure for mock data fallback
            }),
            fetch(GET_DEVICE_HISTORY_ENDPOINT(currentDeviceId, 'freezer_temp')).then(res => {
                if (!res.ok) throw new Error(`Freezer fetch failed: ${res.status}`);
                return res.json();
            }).then(data => {
                 if (!Array.isArray(data) || data.length === 0) throw new Error("Freezer data invalid");
                 console.log("Received valid freezer history");
                 return data;
            }).catch(err => {
                 console.warn(err.message + ". Using mock freezer data.");
                 return null; // Indicate failure for mock data fallback
            })
        ]);
    } catch (error) {
        // Should not happen if individual catches handle errors, but as a safeguard
        console.error("Error fetching history data in Promise.all:", error);
    }

    // Prepare data, using mock if fetch failed (null)
    const fridgeData = fridgeHistory ? formatChartData(fridgeHistory) : generateMockChartData(24, 2, 8);
    const freezerData = freezerHistory ? formatChartData(freezerHistory) : generateMockChartData(24, -22, -15);

    // Ensure both datasets have the same labels (use the longer one, or merge)
    // For simplicity, assuming generateMockChartData and formatChartData produce compatible label sets (e.g., last 24 hours)
    // A more robust solution might involve aligning timestamps.
    const labels = fridgeData.labels.length >= freezerData.labels.length ? fridgeData.labels : freezerData.labels;

    renderCombinedChart(labels, fridgeData.data, freezerData.data);
    if (chartLoadingMsg) chartLoadingMsg.style.display = 'none';
}

// Helper to format API data or generate mock data structure
function formatChartData(historyArray) {
    const labels = [];
    const data = [];
    historyArray.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    historyArray.forEach(item => {
        labels.push(new Date(item.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
        data.push(item.value);
    });
    return { labels, data };
}

// Generates mock chart data structure
function generateMockChartData(points = 24, minTemp = 0, maxTemp = 10) {
    const labels = [];
    const data = [];
    const now = Date.now();
    let temp = Math.random() * (maxTemp - minTemp) + minTemp;
    // Generate points backwards from now
    for (let i = points - 1; i >= 0; i--) {
        const time = new Date(now - i * 60 * 60 * 1000); // Hourly points
        labels.push(time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
        temp += (Math.random() - 0.5) * (maxTemp - minTemp) * 0.15; // Fluctuate slightly
        temp = Math.max(minTemp, Math.min(maxTemp, temp));
        data.push(parseFloat(temp.toFixed(1)));
    }
    console.log(`Generated mock chart data (points:${points}, min:${minTemp}, max:${maxTemp})`);
    return { labels, data };
}

// Renders combined chart for Fridge and Freezer
function renderCombinedChart(labels, fridgeTemps, freezerTemps) {
    if (!temperatureChartCanvas) {
        console.error("Combined temperature chart canvas not found!");
        return;
    }
    const ctx = temperatureChartCanvas.getContext('2d');
    if (temperatureChart) temperatureChart.destroy();

    temperatureChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '冷藏室 (°C)',
                    data: fridgeTemps,
                    borderColor: '#36a2eb', // Blue
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    borderWidth: 2,
                    fill: false, // Keep fill false for clarity with two lines
                    tension: 0.4,
                    yAxisID: 'y', // Use the default Y axis
                    pointRadius: 3,
                    pointHoverRadius: 5
                },
                {
                    label: '冷冻室 (°C)',
                    data: freezerTemps,
                    borderColor: '#4bc0c0', // Teal
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y', // Use the default Y axis
                    pointRadius: 3,
                    pointHoverRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            // Use interaction mode for tooltips across datasets
            interaction: {
                mode: 'index', // Show tooltip for all datasets at that x-index
                intersect: false,
            },
            scales: {
                y: { // Single Y Axis - Chart.js will auto-scale to fit both ranges
                    beginAtZero: false,
                    // suggestedMin/Max might be tricky here, let it auto-scale
                    // suggestedMin: -25,
                    // suggestedMax: 15,
                    position: 'left',
                    title: { display: true, text: '温度 (°C)' },
                    grid: { color: 'rgba(200, 200, 200, 0.1)' }
                },
                x: {
                    title: { display: true, text: '时间' },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { // Keep legend to distinguish lines
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    titleFont: { size: 14 },
                    bodyFont: { size: 12 },
                    padding: 10
                }
            }
        }
    });
    console.log("Combined refrigerator chart rendered.");
}

// ... (HTML call unchanged) ... 