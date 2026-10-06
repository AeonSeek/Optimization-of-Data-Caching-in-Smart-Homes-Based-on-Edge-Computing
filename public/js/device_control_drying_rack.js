/**
 * public/js/device_control_drying_rack.js
 * Control logic for the drying rack device page.
 */

function initializeDryingRackControl() {
    console.log('Initializing Drying Rack Control');

    // --- Configuration ---
    const FAKE_DEVICE_ID = 'drying_rack_balcony_1'; // Replace with actual ID fetching
    const STATUS_POLL_INTERVAL = 5000; // Poll every 5 seconds

    // --- Element References ---
    const deviceNameElement = document.getElementById('device-name');
    const moveUpButton = document.getElementById('move-up-button');
    const moveDownButton = document.getElementById('move-down-button');
    const stopButton = document.getElementById('stop-button');
    const lightToggleButton = document.getElementById('light-toggle');
    const lightButtonText = lightToggleButton?.querySelector('.button-text');
    const fanToggleButton = document.getElementById('fan-toggle');
    const fanButtonText = fanToggleButton?.querySelector('.button-text');
    const disinfectToggleButton = document.getElementById('disinfect-toggle');
    const disinfectButtonText = disinfectToggleButton?.querySelector('.button-text');
    const controlFeedbackSpan = document.getElementById('control-feedback');

    const positionStatusDisplay = document.getElementById('position-status');
    const lightStatusDisplay = document.getElementById('light-status');
    const fanStatusDisplay = document.getElementById('fan-status');
    const disinfectStatusDisplay = document.getElementById('disinfect-status');
    const lastUpdatedDisplay = document.getElementById('last-updated-time');

    let statusIntervalId = null;
    let currentDeviceState = {};

    // --- Utility Functions ---
     function showFeedback(message, isError = false) {
        if (!controlFeedbackSpan) return;
        controlFeedbackSpan.textContent = message;
        controlFeedbackSpan.style.color = isError ? 'var(--status-error-text)' : 'var(--text-muted)';
        setTimeout(() => {
            if (controlFeedbackSpan.textContent === message) {
                 controlFeedbackSpan.textContent = '';
            }
        }, 3000);
    }

    // --- UI Update Function ---
    function updateUI(state) {
        currentDeviceState = state;
        console.log('Updating Drying Rack UI with state:', state);

        // Update Control Panel Buttons State (e.g., toggle state)
        if (lightToggleButton && lightButtonText) {
            const isOn = state.light === 'on';
            lightButtonText.textContent = isOn ? '关闭照明' : '开启照明';
            lightToggleButton.classList.toggle('on', isOn);
        }
        if (fanToggleButton && fanButtonText) {
            const isOn = state.fan === 'on';
            fanButtonText.textContent = isOn ? '关闭风干' : '开启风干';
            fanToggleButton.classList.toggle('on', isOn);
        }
         if (disinfectToggleButton && disinfectButtonText) {
            const isOn = state.disinfect === 'on';
            disinfectButtonText.textContent = isOn ? '关闭消毒' : '开启消毒';
            disinfectToggleButton.classList.toggle('on', isOn);
        }

        // Disable movement buttons based on state?
        // e.g., disable up if already at top or moving up
        const isMoving = state.position === 'moving_up' || state.position === 'moving_down';
        if (moveUpButton) moveUpButton.disabled = isMoving || state.position === 'top';
        if (moveDownButton) moveDownButton.disabled = isMoving || state.position === 'bottom';
        if (stopButton) stopButton.disabled = !isMoving;

        // Update Status Panel
        if (positionStatusDisplay) positionStatusDisplay.textContent = translatePosition(state.position);
        if (lightStatusDisplay) lightStatusDisplay.textContent = state.light === 'on' ? '开启' : '关闭';
        if (fanStatusDisplay) fanStatusDisplay.textContent = state.fan === 'on' ? '开启' : '关闭';
        if (disinfectStatusDisplay) disinfectStatusDisplay.textContent = state.disinfect === 'on' ? '开启' : '关闭';

        // Update Last Updated Time
        if (lastUpdatedDisplay) lastUpdatedDisplay.textContent = new Date().toLocaleTimeString();
    }

    // --- Translation Helpers ---
    function translatePosition(position) {
        const map = {
            'top': '顶部',
            'bottom': '底部',
            'stopped': '已停止',
            'moving_up': '上升中',
            'moving_down': '下降中'
        };
        return map[position] || position || '未知';
    }

    // --- API Communication ---
    async function fetchDeviceStatus() {
        // const deviceId = new URLSearchParams(window.location.search).get('deviceId') || FAKE_DEVICE_ID;
        const deviceId = FAKE_DEVICE_ID; // Using fake ID
        console.log(`Fetching drying rack status for ${deviceId}...`);
        try {
            // --- FAKE STATUS --- REMOVE FOR REAL API
            if (!window.fakeDryingRackState) {
                window.fakeDryingRackState = { position: 'stopped', light: 'off', fan: 'off', disinfect: 'off' };
            }
             // Simulate movement ending
            if (window.fakeDryingRackState.position === 'moving_up' && window.movementTimeout) { /* Already handled by sendCommand */ }
            else if (window.fakeDryingRackState.position === 'moving_down' && window.movementTimeout) { /* Already handled by sendCommand */ }

            updateUI(window.fakeDryingRackState);
            // --- END FAKE STATUS ---

            // const response = await fetch(`/api/device/${deviceId}/status`);
            // if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            // const state = await response.json();
            // updateUI(state);
            // showFeedback('状态已更新');

        } catch (error) {
            console.error('Error fetching drying rack status:', error);
            showFeedback('无法获取设备状态', true);
        }
    }

    async function sendCommand(command, value = null) {
        // const deviceId = new URLSearchParams(window.location.search).get('deviceId') || FAKE_DEVICE_ID;
        const deviceId = FAKE_DEVICE_ID; // Using fake ID
        console.log(`Sending drying rack command to ${deviceId}:`, { command, value });
        showFeedback('正在发送指令...');

         // Clear any existing movement simulation timeout
        if (window.movementTimeout) {
            clearTimeout(window.movementTimeout);
            window.movementTimeout = null;
        }

        try {
             // --- FAKE COMMAND HANDLING --- REMOVE FOR REAL API
             if (!window.fakeDryingRackState) window.fakeDryingRackState = { position: 'stopped', light: 'off', fan: 'off', disinfect: 'off' };
            let state = window.fakeDryingRackState;
            let simulateMovementEnd = false;
            let targetPosition = state.position; // Keep current position if stopping

            switch (command) {
                case 'move_up':
                    if (state.position !== 'top') {
                        state.position = 'moving_up';
                        targetPosition = 'top';
                        simulateMovementEnd = true;
                    }
                    break;
                case 'move_down':
                     if (state.position !== 'bottom') {
                        state.position = 'moving_down';
                        targetPosition = 'bottom';
                        simulateMovementEnd = true;
                    }
                    break;
                case 'stop':
                    if (state.position === 'moving_up' || state.position === 'moving_down') {
                        state.position = 'stopped'; // Or maybe a specific 'midway_stopped' state?
                    }
                    break;
                case 'set_light':
                    state.light = value;
                    break;
                case 'set_fan':
                    state.fan = value;
                    break;
                case 'set_disinfect':
                    state.disinfect = value;
                    break;
            }
            console.log('New fake state:', state);
            updateUI(state);
            showFeedback('指令已发送');

            // Simulate movement completion
            if (simulateMovementEnd) {
                 window.movementTimeout = setTimeout(() => {
                     window.fakeDryingRackState.position = targetPosition;
                     updateUI(window.fakeDryingRackState);
                     console.log('Simulated movement finished');
                     window.movementTimeout = null;
                 }, 4000); // Simulate 4 seconds movement time
            }
            // --- END FAKE COMMAND HANDLING ---

            // const response = await fetch(`/api/device/${deviceId}/command`, {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ command, value }),
            // });
            // if (!response.ok) {
            //      const errorData = await response.json().catch(() => ({}));
            //      throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`);
            // }
            // const result = await response.json();
            // showFeedback(result.message || '指令已发送');
            // fetchDeviceStatus(); // Fetch status quickly

        } catch (error) {
            console.error('Error sending drying rack command:', error);
            showFeedback(`指令发送失败: ${error.message}`, true);
        }
    }

    // --- Event Listeners ---
    if (moveUpButton) moveUpButton.addEventListener('click', () => sendCommand('move_up'));
    if (moveDownButton) moveDownButton.addEventListener('click', () => sendCommand('move_down'));
    if (stopButton) stopButton.addEventListener('click', () => sendCommand('stop'));

    if (lightToggleButton) {
        lightToggleButton.addEventListener('click', () => {
            const newState = currentDeviceState.light === 'on' ? 'off' : 'on';
            sendCommand('set_light', newState);
        });
    }
    if (fanToggleButton) {
        fanToggleButton.addEventListener('click', () => {
            const newState = currentDeviceState.fan === 'on' ? 'off' : 'on';
            sendCommand('set_fan', newState);
        });
    }
    if (disinfectToggleButton) {
        disinfectToggleButton.addEventListener('click', () => {
            const newState = currentDeviceState.disinfect === 'on' ? 'off' : 'on';
            sendCommand('set_disinfect', newState);
        });
    }

    // --- Initialization ---
    fetchDeviceStatus(); // Initial fetch
    if (statusIntervalId) clearInterval(statusIntervalId);
    statusIntervalId = setInterval(fetchDeviceStatus, STATUS_POLL_INTERVAL);

    // Polling visibility handling (same as washing machine)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (statusIntervalId) {
                clearInterval(statusIntervalId);
                statusIntervalId = null;
                 console.log('Polling stopped due to page visibility');
            }
        } else {
            if (!statusIntervalId) {
                fetchDeviceStatus();
                statusIntervalId = setInterval(fetchDeviceStatus, STATUS_POLL_INTERVAL);
                 console.log('Polling resumed');
            }
        }
    });

}

// Check for function existence is in the HTML 