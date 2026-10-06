document.addEventListener('DOMContentLoaded', () => {
    const deviceNameElement = document.getElementById('device-name');
    const statusDisplay = document.getElementById('status-display-p')?.querySelector('.value');
    const currentTempDisplay = document.getElementById('current-temp-display-p')?.querySelector('.value');
    const targetTempDisplay = document.getElementById('target-temp-display-p')?.querySelector('.value');
    const modeDisplay = document.getElementById('mode-display-p')?.querySelector('.value');
    const lastUpdatedElement = document.querySelector('.status-display .last-updated span');

    const powerSwitchButton = document.getElementById('power-switch');
    const targetTempSlider = document.getElementById('target-temp-slider');
    const targetTempValueDisplay = document.getElementById('target-temp-value');
    const modeSelect = document.getElementById('mode-select');
    const modeStatusIndicator = document.getElementById('mode-status');

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
        const mockStatus = ['加热中', '保温', '关闭'][Math.floor(Math.random() * 3)];
        const isOn = mockStatus !== '关闭';
        return {
            id: deviceId || 'mock-wh-id',
            name: '卫生间热水器',
            type: '熱水器',
            data: {
                '状态': mockStatus,
                '当前温度': isOn ? (40 + Math.floor(Math.random() * 20)) : 25,
                '目标温度': isOn ? (45 + Math.floor(Math.random() * 10)) : 45,
                '模式': ['自动', '手动', '节能'][Math.floor(Math.random() * 3)],
                'power': isOn ? 'on' : 'off',
            },
            last_updated: Date.now() - Math.floor(Math.random() * 60000),
        };
    }

    // --- 更新 UI ---
    function updateUI(deviceData) {
        console.log("Updating UI with data:", deviceData);
        if (!deviceData || !deviceData.data || typeof deviceData.data !== 'object') {
            console.warn("Invalid device data received, using last valid or mock.");
            deviceData = lastValidDeviceData || generateMockData();
        } else {
            lastValidDeviceData = JSON.parse(JSON.stringify(deviceData));
        }

        if(deviceNameElement && deviceData.name) {
            deviceNameElement.textContent = deviceData.name.replace(' (模拟)', '');
        }

        const data = deviceData.data || {};
        const lastUpdated = deviceData.last_updated;

        if (statusDisplay) statusDisplay.textContent = data['状态'] || '未知';
        if (currentTempDisplay) currentTempDisplay.textContent = data['当前温度'] !== undefined ? `${data['当前温度']} °C` : '-- °C';
        if (targetTempDisplay) targetTempDisplay.textContent = data['目标温度'] !== undefined ? `${data['目标温度']} °C` : '-- °C';
        if (modeDisplay) modeDisplay.textContent = data['模式'] || '--';
        if (lastUpdatedElement) lastUpdatedElement.textContent = formatTime(lastUpdated);

        const isOn = data['状态'] !== '关闭' && data['power'] !== 'off';
        if (powerSwitchButton) {
            if (isOn) {
                powerSwitchButton.classList.add('on');
                powerSwitchButton.querySelector('.button-text').textContent = '关闭';
            } else {
                powerSwitchButton.classList.remove('on');
                powerSwitchButton.querySelector('.button-text').textContent = '开启';
            }
            powerSwitchButton.disabled = false;
        }

        if (targetTempSlider && targetTempValueDisplay) {
            if (data['目标温度'] !== undefined) {
                targetTempSlider.value = data['目标温度'];
                targetTempValueDisplay.textContent = data['目标温度'];
                targetTempSlider.disabled = !isOn;
            } else {
                targetTempSlider.value = targetTempSlider.min;
                targetTempValueDisplay.textContent = '--';
                targetTempSlider.disabled = true;
            }
             if (!isOn) targetTempSlider.disabled = true;
        }

        if (modeSelect && modeStatusIndicator) {
             let currentModeText = '--';
            if (data['模式']) {
                 const modeValue = String(data['模式']);
                let foundOption = false;
                 for (let opt of modeSelect.options) {
                     if (opt.value === modeValue || opt.text === modeValue) {
                         modeSelect.value = opt.value;
                         currentModeText = opt.text;
                         foundOption = true;
                         break;
                     }
                 }
                 if (!foundOption) {
                      console.warn(`Mode "${modeValue}" not found in select options.`);
                      modeSelect.value = modeSelect.options[0]?.value || '';
                       currentModeText = modeSelect.options[0]?.text || '--';
                 }
                 modeSelect.disabled = !isOn;
                  modeStatusIndicator.textContent = currentModeText;
             } else {
                 modeSelect.value = modeSelect.options[0]?.value || '';
                 modeSelect.disabled = true;
                  modeStatusIndicator.textContent = '--';
             }
             if (!isOn) {
                 modeSelect.disabled = true;
                 modeStatusIndicator.textContent = data['模式'] || '--';
             }
        }

        isSendingCommand = false;
        console.log("UI Updated. Controls re-enabled/adjusted.");
    }

    // --- 禁用控件 ---
    function disableControls() {
        if (powerSwitchButton) powerSwitchButton.disabled = true;
        if (targetTempSlider) targetTempSlider.disabled = true;
        if (modeSelect) modeSelect.disabled = true;
        console.log("Controls disabled during command execution.");
    }

    // --- 发送控制命令 (Adjust optimistic update logic slightly) ---
    async function sendControlCommand(command, value) {
        if (isSendingCommand) {
            console.warn("Command already in progress.");
            return;
        }
        if (!deviceId) {
            console.error("Device ID missing.");
            return;
        }

        console.log(`Sending command: ${command}=${value} to device ${deviceId}`);
        isSendingCommand = true;
        disableControls();

        const originalData = JSON.parse(JSON.stringify(lastValidDeviceData));
        let optimisticData = JSON.parse(JSON.stringify(originalData || generateMockData()));

        try {
            if (!optimisticData.data) optimisticData.data = {};

            if (command === 'power') {
                const newState = value === 'on';
                optimisticData.data['状态'] = newState ? (optimisticData.data['模式'] === '节能' ? '保温' : '加热中') : '关闭';
                optimisticData.data['power'] = value;
            } else if (command === 'set_temperature') {
                optimisticData.data['目标温度'] = Number(value);
            } else if (command === 'set_mode') {
                 let selectedModeText = value;
                 if(modeSelect) {
                      for (let opt of modeSelect.options) {
                         if (opt.value === value) {
                             selectedModeText = opt.text;
                             break;
                         }
                     }
                 }
                 optimisticData.data['模式'] = selectedModeText;
                 if (optimisticData.data['power'] === 'on') {
                    optimisticData.data['状态'] = selectedModeText === '节能' ? '保温' : '加热中';
                 }
            } else {
                console.warn("Unknown command:", command);
                updateUI(originalData);
                isSendingCommand = false;
                return;
            }
            updateUI(optimisticData);
        } catch (error) {
             console.error("Error preparing optimistic update:", error);
             updateUI(originalData);
             isSendingCommand = false;
             return;
        }

        console.warn(`[开发模式] 假设命令 {${command}: ${value}} 已成功发送至 ${deviceId}。`);
        lastValidDeviceData = optimisticData;
    }

    // --- 加载设备数据 ---
    async function loadDeviceData() {
        if (isLoading) return;
        isLoading = true;
        console.log(`Loading data for device: ${deviceId}`);

        try {
            console.warn("[开发模式] 正在使用模拟数据，跳过 API 调用。");
            const mockData = generateMockData();
            updateUI(mockData);
        } catch (error) {
            console.error('Failed to load device data:', error);
            console.warn('无法加载设备数据，将显示模拟信息。');
            updateUI(null);
        } finally {
            isLoading = false;
        }
    }

    // --- 设置事件监听器 ---
    function setupEventListeners() {
        if (powerSwitchButton) {
            powerSwitchButton.addEventListener('click', () => {
                const currentState = powerSwitchButton.classList.contains('on');
                sendControlCommand('power', currentState ? 'off' : 'on');
            });
        }

        if (targetTempSlider && targetTempValueDisplay) {
            targetTempSlider.addEventListener('input', () => {
                targetTempValueDisplay.textContent = targetTempSlider.value;
            });
            targetTempSlider.addEventListener('change', () => {
                if (!targetTempSlider.disabled) {
                    sendControlCommand('set_temperature', targetTempSlider.value);
                }
            });
        }

        if (modeSelect) {
            modeSelect.addEventListener('change', () => {
                if (!modeSelect.disabled) {
                    sendControlCommand('set_mode', modeSelect.value);
                }
            });
        }
    }

    // --- 初始化 ---
    deviceId = getDeviceIdFromUrl();
    if (deviceId) {
        setupEventListeners();
        loadDeviceData();
    } else {
        console.error('Device ID not found in URL.');
        if (deviceNameElement) deviceNameElement.textContent = '错误';
        if (statusDisplay) statusDisplay.textContent = '无法加载设备';
        disableControls();
    }
}); 