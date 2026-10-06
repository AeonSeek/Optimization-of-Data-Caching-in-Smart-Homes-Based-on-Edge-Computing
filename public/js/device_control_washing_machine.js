/**
 * public/js/device_control_washing_machine.js
 * Control logic for the washing machine device page.
 */

function initializeWashingMachineControl() {
    console.log('Initializing Washing Machine Control');

    // --- Configuration ---
    const FAKE_DEVICE_ID = 'washing_machine_balcony_1'; // Replace with actual ID fetching if needed
    const STATUS_POLL_INTERVAL = 5000; // Poll every 5 seconds

    // --- Element References ---
    const deviceNameElement = document.getElementById('device-name');
    const powerToggleButton = document.getElementById('power-toggle');
    const powerButtonText = powerToggleButton?.querySelector('.button-text');
    const powerStatusIndicator = document.getElementById('power-status-indicator');
    const startPauseButton = document.getElementById('start-pause-button');
    const operationStatusIndicator = document.getElementById('operation-status');
    const modeSelect = document.getElementById('mode-select');
    const modeStatusIndicator = document.getElementById('mode-status-indicator');
    const waterLevelSelect = document.getElementById('water-level-select');
    const waterLevelIndicator = document.getElementById('water-level-indicator');
    const controlFeedbackSpan = document.getElementById('control-feedback');

    const powerStatusDisplay = document.getElementById('power-status');
    const currentStatusDisplay = document.getElementById('current-status');
    const currentModeDisplay = document.getElementById('current-mode');
    const currentWaterLevelDisplay = document.getElementById('current-water-level');
    const remainingTimeDisplay = document.getElementById('remaining-time');
    const lastUpdatedDisplay = document.getElementById('last-updated-time');

    let statusIntervalId = null;
    let currentDeviceState = {};

    // --- Utility Functions ---
    function showFeedback(message, isError = false) {
        if (!controlFeedbackSpan) return;
        controlFeedbackSpan.textContent = message;
        controlFeedbackSpan.style.color = isError ? 'var(--status-error-text)' : 'var(--text-muted)';
        // Clear feedback after a delay
        setTimeout(() => {
            if (controlFeedbackSpan.textContent === message) {
                 controlFeedbackSpan.textContent = '';
            }
        }, 3000);
    }

    function formatTime(minutes) {
        if (typeof minutes !== 'number' || minutes < 0) return '--:--';
        const mins = Math.floor(minutes);
        const secs = Math.round((minutes - mins) * 60);
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    // --- UI Update Function ---
    function updateUI(state) {
        currentDeviceState = state;
        console.log('Updating UI with state:', state);

        // Update Control Panel Indicators
        if (powerToggleButton && powerButtonText) {
            const isOn = state.power === 'on';
            powerButtonText.textContent = isOn ? '关闭' : '开启';
            powerToggleButton.classList.toggle('on', isOn);
        }
        if (powerStatusIndicator) powerStatusIndicator.textContent = state.power === 'on' ? '开' : '关';

        if (startPauseButton) {
            if (state.status === 'running') {
                startPauseButton.textContent = '暂停';
            } else if (state.status === 'paused') {
                startPauseButton.textContent = '继续';
            } else { // idle, completed, error
                startPauseButton.textContent = '启动';
            }
            // Disable start button if power is off
            startPauseButton.disabled = state.power !== 'on';
        }
        if (operationStatusIndicator) operationStatusIndicator.textContent = translateStatus(state.status);

        if (modeSelect) {
            modeSelect.value = state.mode || 'standard';
            modeSelect.disabled = state.power !== 'on' || (state.status === 'running' || state.status === 'paused'); // Can't change mode while running/paused
        }
        if (modeStatusIndicator) modeStatusIndicator.textContent = translateMode(state.mode);

        if (waterLevelSelect) {
            waterLevelSelect.value = state.water_level || 'auto';
            waterLevelSelect.disabled = state.power !== 'on' || (state.status === 'running' || state.status === 'paused');
        }
         if (waterLevelIndicator) waterLevelIndicator.textContent = translateWaterLevel(state.water_level);

        // Update Status Panel
        if (powerStatusDisplay) powerStatusDisplay.textContent = state.power === 'on' ? '开启' : '关闭';
        if (currentStatusDisplay) currentStatusDisplay.textContent = translateStatus(state.status);
        if (currentModeDisplay) currentModeDisplay.textContent = translateMode(state.mode);
        if (currentWaterLevelDisplay) currentWaterLevelDisplay.textContent = translateWaterLevel(state.water_level);
        if (remainingTimeDisplay) remainingTimeDisplay.textContent = formatTime(state.remaining_time_minutes);

        // Update Last Updated Time
        if (lastUpdatedDisplay) lastUpdatedDisplay.textContent = new Date().toLocaleTimeString();
    }

    // --- Translation Helpers (Customize as needed) ---
    function translateStatus(status) {
        const map = {
            'idle': '待机',
            'running': '运行中',
            'paused': '暂停',
            'completed': '完成',
            'error': '故障'
        };
        return map[status] || status || '未知';
    }

    function translateMode(mode) {
        const map = {
            'standard': '标准洗',
            'quick': '快洗',
            'strong': '强力洗',
            'wool': '羊毛',
            'spin': '单脱水',
            'tub_clean': '桶自洁'
        };
        return map[mode] || mode || '--';
    }

     function translateWaterLevel(level) {
        const map = {
            'low': '低',
            'medium': '中',
            'high': '高',
            'auto': '自动'
        };
        return map[level] || level || '--';
    }

    // --- API Communication ---
    async function fetchDeviceStatus() {
        // TODO: Replace with actual API call
        // const deviceId = new URLSearchParams(window.location.search).get('deviceId') || FAKE_DEVICE_ID;
        const deviceId = FAKE_DEVICE_ID; // Using fake ID for now
        console.log(`Fetching status for ${deviceId}...`);
        try {
            // --- FAKE STATUS --- REMOVE THIS BLOCK FOR REAL API
            if (!window.fakeWashingMachineState) {
                window.fakeWashingMachineState = { power: 'off', status: 'idle', mode: 'standard', water_level: 'auto', remaining_time_minutes: 0 };
            }
            updateUI(window.fakeWashingMachineState);
            // --- END FAKE STATUS ---

            // const response = await fetch(`/api/device/${deviceId}/status`);
            // if (!response.ok) {
            //     throw new Error(`HTTP error! status: ${response.status}`);
            // }
            // const state = await response.json();
            // updateUI(state);
            // showFeedback('状态已更新');

        } catch (error) {
            console.error('Error fetching device status:', error);
            showFeedback('无法获取设备状态', true);
            // Optional: Display error state in UI
        }
    }

    async function sendCommand(command, value = null) {
        // const deviceId = new URLSearchParams(window.location.search).get('deviceId') || FAKE_DEVICE_ID;
         const deviceId = FAKE_DEVICE_ID; // Using fake ID for now
        console.log(`Sending command to ${deviceId}:`, { command, value });
        showFeedback('正在发送指令...');
        try {
            // --- FAKE COMMAND HANDLING --- REMOVE FOR REAL API
             if (!window.fakeWashingMachineState) window.fakeWashingMachineState = { power: 'off', status: 'idle', mode: 'standard', water_level: 'auto', remaining_time_minutes: 0 };
            let state = window.fakeWashingMachineState;
            switch (command) {
                case 'set_power':
                    state.power = value;
                    if (value === 'off') state.status = 'idle'; // Reset status if turned off
                    break;
                case 'start_pause':
                    if (state.power === 'on') {
                         if (state.status === 'running') state.status = 'paused';
                         else if (state.status === 'paused') state.status = 'running';
                         else if (state.status === 'idle' || state.status === 'completed') {
                             state.status = 'running';
                             // Set a fake timer based on mode
                             const modeTimes = { standard: 45, quick: 20, strong: 60, wool: 35, spin: 15, tub_clean: 50 };
                             state.remaining_time_minutes = modeTimes[state.mode] || 30;
                         }
                    }
                    break;
                case 'set_mode':
                    if (state.power === 'on' && state.status !== 'running' && state.status !== 'paused') {
                        state.mode = value;
                    }
                    break;
                case 'set_water_level':
                     if (state.power === 'on' && state.status !== 'running' && state.status !== 'paused') {
                        state.water_level = value;
                    }
                    break;
            }
            console.log('New fake state:', state);
            updateUI(state);
             showFeedback('指令已发送');
            // Simulate delay and potential status change for timer
            if (state.status === 'running' && !window.fakeTimerInterval) {
                window.fakeTimerInterval = setInterval(() => {
                    if (window.fakeWashingMachineState.status === 'running' && window.fakeWashingMachineState.remaining_time_minutes > 0) {
                         window.fakeWashingMachineState.remaining_time_minutes -= (1/6); // Decrement approx every 10 sec for demo
                         if (window.fakeWashingMachineState.remaining_time_minutes < 0) window.fakeWashingMachineState.remaining_time_minutes = 0;
                         updateUI(window.fakeWashingMachineState);
                    } else if (window.fakeWashingMachineState.status === 'running' && window.fakeWashingMachineState.remaining_time_minutes <= 0) {
                         window.fakeWashingMachineState.status = 'completed';
                         clearInterval(window.fakeTimerInterval);
                         window.fakeTimerInterval = null;
                         updateUI(window.fakeWashingMachineState);
                    }
                     else {
                        clearInterval(window.fakeTimerInterval);
                        window.fakeTimerInterval = null;
                    }
                }, 10000);
            } else if (state.status !== 'running' && window.fakeTimerInterval) {
                 clearInterval(window.fakeTimerInterval);
                 window.fakeTimerInterval = null;
            }
            // --- END FAKE COMMAND HANDLING ---

            // const response = await fetch(`/api/device/${deviceId}/command`, {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json',
            //     },
            //     body: JSON.stringify({ command, value }),
            // });

            // if (!response.ok) {
            //     const errorData = await response.json().catch(() => ({})); // Try to get error details
            //     throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`);
            // }

            // const result = await response.json();
            // console.log('Command result:', result);
            // showFeedback(result.message || '指令已发送');
            // // Fetch status immediately after sending a command for quick feedback
            // fetchDeviceStatus();

        } catch (error) {
            console.error('Error sending command:', error);
            showFeedback(`指令发送失败: ${error.message}`, true);
        }
    }

    // --- Event Listeners ---
    if (powerToggleButton) {
        powerToggleButton.addEventListener('click', () => {
            const newState = currentDeviceState.power === 'on' ? 'off' : 'on';
            sendCommand('set_power', newState);
        });
    }

    if (startPauseButton) {
        startPauseButton.addEventListener('click', () => {
            sendCommand('start_pause');
        });
    }

    if (modeSelect) {
        modeSelect.addEventListener('change', (event) => {
            sendCommand('set_mode', event.target.value);
        });
    }

    if (waterLevelSelect) {
        waterLevelSelect.addEventListener('change', (event) => {
            sendCommand('set_water_level', event.target.value);
        });
    }

    // --- Initialization ---
    fetchDeviceStatus(); // Initial fetch

    // Start polling
    if (statusIntervalId) clearInterval(statusIntervalId);
    statusIntervalId = setInterval(fetchDeviceStatus, STATUS_POLL_INTERVAL);

    // Optional: Stop polling when the page is hidden
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (statusIntervalId) {
                clearInterval(statusIntervalId);
                 statusIntervalId = null;
                 console.log('Polling stopped due to page visibility');
            }
        } else {
            if (!statusIntervalId) {
                fetchDeviceStatus(); // Fetch immediately when visible again
                statusIntervalId = setInterval(fetchDeviceStatus, STATUS_POLL_INTERVAL);
                console.log('Polling resumed');
            }
        }
    });

    // Cleanup on page unload (though visibilitychange is often better)
    // window.addEventListener('beforeunload', () => {
    //     if (statusIntervalId) clearInterval(statusIntervalId);
    // });

}

// Ensure the DOM is loaded before initializing
// Note: The check for function existence is already in the HTML
// if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', initializeWashingMachineControl);
// } else {
//     initializeWashingMachineControl();
// } 