// Check for browser support for Web Speech API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const SpeechSynthesis = window.speechSynthesis;

document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('assistant-toggle-button');
    const chatPanel = document.getElementById('assistant-chat-panel');
    const closeButton = document.getElementById('assistant-close-button');
    const messagesContainer = document.getElementById('assistant-messages');
    const inputField = document.getElementById('assistant-input');
    const sendButton = document.getElementById('assistant-send-button');
    const micButton = document.getElementById('assistant-mic-button');

    let recognition = null;
    let isRecording = false;

    // --- Basic Panel Toggle --- 
    if (toggleButton && chatPanel) {
        toggleButton.addEventListener('click', () => {
            chatPanel.classList.toggle('visible');
            if (chatPanel.classList.contains('visible')) {
                // Optional: Add a welcome message when opened
                // addMessage("你好！有什么可以帮您的吗？", "ai");
                inputField.focus();
            }
        });
    }
    if (closeButton && chatPanel) {
        closeButton.addEventListener('click', () => {
            chatPanel.classList.remove('visible');
        });
    }

    // --- Send Text Message --- 
    const handleSendMessage = async () => {
        const messageText = inputField.value.trim();
        if (!messageText) return;

        addMessage(messageText, 'user');
        inputField.value = ''; // Clear input
        inputField.focus();

        // Show thinking indicator (optional)
        addMessage("思考中...", "ai", true);

        // --- Send to backend (now calls the real API) ---
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: messageText })
            });
            
            // Always remove thinking indicator regardless of success/failure
            removeThinkingMessage();

            if (!response.ok) {
                 // Try to get error message from response body
                 let errorData = null;
                 try { errorData = await response.json(); } catch(e) {}
                 throw new Error(`Network response was not ok (${response.status}): ${errorData?.error || response.statusText}`);
            }
            const data = await response.json();
            
            if(data.reply) {
                addMessage(data.reply, "ai");
                speakText(data.reply); // Speak the actual AI response
            } else {
                 addMessage("AI 未返回有效回复。", "ai");
            }
            
        } catch (error) {
            console.error('Error sending message:', error);
             // Ensure thinking indicator is removed on error too
             removeThinkingMessage(); 
            addMessage(`抱歉，与 AI 通信时出错: ${error.message}`, "ai");
        }
    };

    if (sendButton) {
        sendButton.addEventListener('click', handleSendMessage);
    }
    if (inputField) {
        inputField.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                handleSendMessage();
            }
        });
    }

    // --- Add Message to UI --- 
    function addMessage(text, sender, isThinking = false) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('assistant-message', `${sender}-message`);
        if (isThinking) {
            messageElement.classList.add('thinking-indicator'); 
            messageElement.innerHTML = `<span class="thinking-dots"></span> ${text}`; // Add dots or spinner
        } else {
             messageElement.textContent = text;
        }
        messagesContainer.appendChild(messageElement);
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Function to remove thinking indicator (if needed)
    function removeThinkingMessage() {
        const thinkingMsg = messagesContainer.querySelector('.thinking-indicator');
        if (thinkingMsg) thinkingMsg.remove();
    }
    
    // --- Speech Recognition (STT) --- 
    if (SpeechRecognition && micButton) {
        recognition = new SpeechRecognition();
        recognition.continuous = false; // Stop after first utterance
        recognition.lang = 'zh-CN'; // Set language (change if needed)
        recognition.interimResults = false; // We only want final results
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
            const speechResult = event.results[0][0].transcript;
            inputField.value = speechResult; // Put result in input field
            // Optionally, send immediately after recognition:
             handleSendMessage();
            stopRecording();
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            let errorMsg = '语音识别出错';
            if (event.error === 'no-speech') errorMsg = '未检测到语音';
            if (event.error === 'audio-capture') errorMsg = '无法捕获麦克风音频';
            if (event.error === 'not-allowed') errorMsg = '麦克风权限被拒绝';
             addMessage(errorMsg, 'info'); // Use an info style
            stopRecording();
        };

        recognition.onend = () => {
            // Ensure recording stops visually even if ended prematurely
            stopRecording();
        };
        
        micButton.addEventListener('click', () => {
            if (!isRecording) {
                startRecording();
            } else {
                stopRecording();
                recognition.stop(); // Manually stop if user clicks again
            }
        });
        
        function startRecording() {
             // Check for microphone permission first (good practice)
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    // Permission granted, start recognition
                    console.log("Mic permission granted");
                    inputField.value = ''; // Clear input field
                    recognition.start();
                    isRecording = true;
                    micButton.classList.add('recording');
                    micButton.textContent = '...'; // Indicate recording
                    addMessage("请说话...", "info");
                })
                .catch(err => {
                    console.error('Error getting mic permission:', err);
                     addMessage('无法访问麦克风，请检查权限设置。', 'info');
                     stopRecording(); // Ensure UI is reset
                });
        }

        function stopRecording() {
            if (isRecording) {
                // recognition.stop(); // Often stops automatically on result/end
                isRecording = false;
                micButton.classList.remove('recording');
                 micButton.textContent = '🎤';
                // Remove the "请说话..." message (optional)
                const infoMsg = Array.from(messagesContainer.children).find(el => el.textContent === "请说话...");
                if (infoMsg) infoMsg.remove();
            }
        }

    } else if (micButton) {
        micButton.disabled = true;
        micButton.title = "浏览器不支持语音识别";
         console.warn("Web Speech Recognition API is not supported in this browser.");
    }

    // --- Speech Synthesis (TTS) --- 
    function speakText(text) {
        if (!SpeechSynthesis || !text) return;
        if (SpeechSynthesis.speaking) {
            console.warn('SpeechSynthesis is already speaking. Cancelling previous.');
            SpeechSynthesis.cancel(); // Cancel previous speech if any
        }
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN'; // Set desired language

        // --- Attempt to select a better voice and adjust parameters ---
        try {
            let voices = SpeechSynthesis.getVoices();
            if (voices.length === 0) {
                 console.warn('Voice list empty, likely waiting for voiceschanged event.');
                 // In a production scenario, you might wait for the 'voiceschanged' event
                 // and retry speaking, but for simplicity, we proceed with default.
            } else {
                // Try to find a preferred Chinese voice (example criteria)
                 let preferredVoice = voices.find(voice => 
                    voice.lang === 'zh-CN' && 
                    voice.localService === true && // Prefer local voices
                    !voice.name.toLowerCase().includes('google') // Sometimes Google voices are lower quality offline
                 );
                 
                 // Fallback: Find any zh-CN voice
                 if (!preferredVoice) {
                     preferredVoice = voices.find(voice => voice.lang === 'zh-CN');
                 }

                 if (preferredVoice) {
                    console.log('Using voice:', preferredVoice.name, preferredVoice.lang);
                    utterance.voice = preferredVoice;
                 } else {
                     console.warn('Could not find a suitable zh-CN voice, using default.');
                 }
            }

            // Adjust rate and pitch (experiment with values)
            utterance.rate = 0.9; // Slightly slower than default (default=1)
            utterance.pitch = 1.0; // Default pitch (default=1)

        } catch (e) {
            console.error('Error during voice selection/parameter setting:', e);
        }
        // ------

        utterance.onerror = (event) => {
            console.error('SpeechSynthesis Error', event);
            addMessage('无法播放语音回复。', 'info');
        };
        
        SpeechSynthesis.speak(utterance);
    }
    
     // Example: Speak the placeholder response (uncomment in handleSendMessage to enable)
     // speakText("AI回复: " + messageText);

     // Add helper class for info messages
    function addMessage(text, type) { // Overload addMessage slightly
        const messageElement = document.createElement('div');
        if (type === 'info') {
            messageElement.classList.add('info-message-chat');
            messageElement.textContent = text;
        } else { // user or ai
            messageElement.classList.add('assistant-message', `${type}-message`);
            messageElement.textContent = text;
        }
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

}); 