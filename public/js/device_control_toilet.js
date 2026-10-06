document.addEventListener('DOMContentLoaded', () => {
    // Updated selectors
    const deviceNameElement = document.getElementById('device-name');
    const statusDisplay = document.getElementById('status-display-p')?.querySelector('.value');
    const seatHeatStatus = document.getElementById('seat-heat-status-p')?.querySelector('.value');
    const waterTempLevel = document.getElementById('water-temp-level-p')?.querySelector('.value');
    const waterPressureLevel = document.getElementById('water-pressure-level-p')?.querySelector('.value');
    const lastUpdatedElement = document.querySelector('.status-display .last-updated span');

    // Control Buttons
    const seatHeatButton = document.getElementById('seat-heat-toggle');
    const flushButton = document.getElementById('flush-button');
    const rearWashButton = document.getElementById('rear-wash-button');
    const frontWashButton = document.getElementById('front-wash-button');
    const dryButton = document.getElementById('dry-button');
    const stopButton = document.getElementById('stop-button');
    // Assuming +/- buttons for adjustments, add if needed:
    // const waterTempUp = document.getElementById('water-temp-up');
    // const waterTempDown = document.getElementById('water-temp-down');
    // const waterPressureUp = document.getElementById('water-pressure-up');
    // const waterPressureDown = document.getElementById('water-pressure-down');


    let deviceId = '';
    let lastValidDeviceData = null;
    let isLoading = false;
    let isSendingCommand = false;

    // --- 获取设备 ID ---
    function getDeviceIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('deviceId');
    }

    // --- 格式化时间 ---
    function formatTime(timestamp) {
        if (!timestamp || new Date(timestamp).toString() === 'Invalid Date') {
            return '--:--';
        }
        try {
            return new Date(timestamp).toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch (e) {
            console.error('Error formatting time:', e);
            return 'N/A';
        }
    }

    // --- 生成模拟数据 ---
    function generateMockData() {
        const mockStatuses = ['待机', '使用中', '臀洗中', '妇洗中', '烘干中'];
        const randomStatus = mockStatuses[Math.floor(Math.random() * mockStatuses.length)];
        const seatHeated = Math.random() > 0.5;
        return {
            id: deviceId || 'mock-toilet-id',
            name: '智能马桶',
            type: '智能馬桶',
            data: {
                '状态': randomStatus,
                '座圈加热': seatHeated ? '开启' : '关闭',
                '水温等级': Math.floor(Math.random() * 5) + 1, // 1-5
                '水压等级': Math.floor(Math.random() * 5) + 1, // 1-5
                // Add power state if applicable
                'power': randomStatus !== '待机' ? 'on' : 'off' // Example power logic
            },
            last_updated: Date.now() - Math.floor(Math.random() * 60000),
        };
    }

    // --- 更新 UI ---
    function updateUI(deviceData) {
        console.log("Updating Toilet UI with data:", deviceData);
        if (!deviceData || !deviceData.data || typeof deviceData.data !== 'object') {
            console.warn("Invalid toilet data, using last valid or mock.");
            deviceData = lastValidDeviceData || generateMockData();
        } else {
             lastValidDeviceData = JSON.parse(JSON.stringify(deviceData));
        }

        if(deviceNameElement && deviceData.name) {
            deviceNameElement.textContent = deviceData.name.replace(' (模拟)', '');
        }

        const data = deviceData.data || {};
        const lastUpdated = deviceData.last_updated;

        // Update status display using new selectors
        if (statusDisplay) statusDisplay.textContent = data['状态'] || '未知';
        if (seatHeatStatus) seatHeatStatus.textContent = data['座圈加热'] || '--';
        if (waterTempLevel) waterTempLevel.textContent = data['水温等级'] !== undefined ? `等级 ${data['水温等级']}` : '--';
        if (waterPressureLevel) waterPressureLevel.textContent = data['水压等级'] !== undefined ? `等级 ${data['水压等级']}` : '--';
        if (lastUpdatedElement) lastUpdatedElement.textContent = formatTime(lastUpdated);

        // Update control states
        const isSeatHeatOn = data['座圈加热'] === '开启';
        if (seatHeatButton) {
            if (isSeatHeatOn) {
                seatHeatButton.classList.add('on');
                seatHeatButton.querySelector('.button-text').textContent = '关闭加热';
            } else {
                seatHeatButton.classList.remove('on');
                seatHeatButton.querySelector('.button-text').textContent = '开启加热';
            }
            seatHeatButton.disabled = false; // Generally always enabled?
        }

        const isActiveFunction = ['臀洗中', '妇洗中', '烘干中', '冲水中...'].includes(data['状态']);

        // Enable/Disable functional buttons based on state
        if (flushButton) flushButton.disabled = isActiveFunction;
        if (rearWashButton) rearWashButton.disabled = isActiveFunction;
        if (frontWashButton) frontWashButton.disabled = isActiveFunction;
        if (dryButton) dryButton.disabled = isActiveFunction;
        if (stopButton) stopButton.disabled = !isActiveFunction;

        isSendingCommand = false;
        console.log("Toilet UI Updated. Controls adjusted based on state.");
    }

    // --- 禁用/启用控件 ---
    function disableControls() {
         const buttons = [seatHeatButton, flushButton, rearWashButton, frontWashButton, dryButton, stopButton];
         buttons.forEach(btn => { if(btn) btn.disabled = true; });
         console.log("Toilet controls disabled during command execution.");
     }

    // --- 发送控制命令 (Adjust optimistic update) ---
    async function sendControlCommand(command, value = null) {
        if (isSendingCommand) {
            console.warn("Toilet command already in progress.");
            return;
        }
        if (!deviceId) {
            console.error("Toilet Device ID missing.");
            return;
        }

        console.log(`Sending toilet command: ${command}${value !== null ? `=${value}`: ''} to ${deviceId}`);
        isSendingCommand = true;
        disableControls();

        const originalData = JSON.parse(JSON.stringify(lastValidDeviceData));
        let optimisticData = JSON.parse(JSON.stringify(originalData || generateMockData()));

        try {
             if (!optimisticData.data) optimisticData.data = {}; // Ensure data object exists

             switch (command) {
                 case 'seat_heat':
                     const newState = value === 'on';
                     optimisticData.data['座圈加热'] = newState ? '开启' : '关闭';
                     break;
                 case 'flush':
                     optimisticData.data['状态'] = '冲水中...';
                     // No longer need manual timeout for mock, assume API call would update later
                     break;
                 case 'rear_wash':
                     optimisticData.data['状态'] = '臀洗中';
                     break;
                 case 'front_wash':
                     optimisticData.data['状态'] = '妇洗中';
                     break;
                 case 'dry':
                     optimisticData.data['状态'] = '烘干中';
                     break;
                 case 'stop':
                     optimisticData.data['状态'] = '待机'; // Assume stop returns to idle
                     break;
                 default:
                     console.warn("Unknown toilet command:", command);
                     updateUI(originalData); // Revert UI if command unknown
                     isSendingCommand = false;
                     return;
             }
             updateUI(optimisticData); // Apply optimistic changes
         } catch (error) {
              console.error("Error preparing optimistic toilet update:", error);
              updateUI(originalData); // Rollback on error
              isSendingCommand = false;
              return;
         }

        // --- 开发模式：假定命令成功 ---
        console.warn(`[开发模式] 假设马桶命令 {${command}${value !== null ? `: ${value}`: ''}} 已成功发送至 ${deviceId}。`);
        lastValidDeviceData = optimisticData;
        // UI already updated optimistically

        // --- Actual API call logic (remains commented out) ---
        /* ... */
    }

    // --- 加载设备数据 ---
    async function loadDeviceData() {
        if (isLoading) return;
        isLoading = true;
        console.log(`Loading data for toilet: ${deviceId}`);

        try {
            console.warn("[开发模式] 正在使用模拟马桶数据，跳过 API 调用。");
            const mockData = generateMockData();
            updateUI(mockData);

            /*
            // --- 实际 API 调用逻辑 (注释掉) ---
            const response = await fetch(`/api/devices/${deviceId}`);
             if (!response.ok) {
                 console.warn(`Failed to fetch /api/devices/${deviceId}, trying /api/device/data?id=${deviceId}`);
                 const response2 = await fetch(`/api/device/data?id=${deviceId}`);
                 if (!response2.ok) {
                      throw new Error(`HTTP error! status: ${response2.status}`);
                 }
                 const deviceData = await response2.json();
                 updateUI(deviceData);
            } else {
                const deviceData = await response.json();
                updateUI(deviceData);
            }
            */
        } catch (error) {
            console.error('Failed to load toilet data:', error);
            console.warn('无法加载马桶数据，将显示模拟信息。');
            updateUI(null); // Trigger mock data generation
        } finally {
            isLoading = false;
             // updateUI will handle enabling/disabling controls
        }
    }

    // --- 设置事件监听器 ---
    function setupEventListeners() {
        if (seatHeatButton) {
            seatHeatButton.addEventListener('click', () => {
                const isCurrentlyOn = seatHeatButton.classList.contains('on');
                sendControlCommand('seat_heat', isCurrentlyOn ? 'off' : 'on');
            });
        }
        if (flushButton) flushButton.addEventListener('click', () => sendControlCommand('flush'));
        if (rearWashButton) rearWashButton.addEventListener('click', () => sendControlCommand('rear_wash'));
        if (frontWashButton) frontWashButton.addEventListener('click', () => sendControlCommand('front_wash'));
        if (dryButton) dryButton.addEventListener('click', () => sendControlCommand('dry'));
        if (stopButton) stopButton.addEventListener('click', () => sendControlCommand('stop'));

        // Add listeners for adjustment buttons if they exist
    }

    // --- 初始化 ---
    deviceId = getDeviceIdFromUrl();
    if (deviceId) {
        setupEventListeners();
        loadDeviceData();
        // setInterval(loadDeviceData, 30000); // Optional: Refresh data periodically
    } else {
        console.error('Toilet Device ID not found in URL.');
        if(deviceNameElement) deviceNameElement.textContent = '错误';
        // Use the new selector for status display error message
        const statusP = document.getElementById('status-display-p');
        if (statusP) statusP.innerHTML = '<span class="label">错误:</span> <span class="value" style="color: red;">无法加载设备</span>';
        disableControls(); // Disable all controls if ID is missing
    }
}); 