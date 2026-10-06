document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const errorMessage = document.getElementById('error-message');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');

    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // 阻止表單默認提交
            errorMessage.textContent = ''; // 清空之前的錯誤消息

            const username = usernameInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (!username || !password || !confirmPassword) {
                errorMessage.textContent = '所有字段皆為必填。';
                return;
            }

            if (password !== confirmPassword) {
                errorMessage.textContent = '兩次輸入的密碼不一致。';
                passwordInput.value = ''; // 清空密碼欄位
                confirmPasswordInput.value = '';
                passwordInput.focus(); // 讓用戶重新輸入
                return;
            }

            // --- 发送注册请求到后端 --- (添加 try...catch 处理网络错误)
            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                });

                const result = await response.json();

                if (response.ok) { // HTTP 狀態碼 200-299
                    // 註冊成功，可以提示用戶並跳轉到登入頁面
                    alert('註冊成功！請使用新帳號登入。');
                    window.location.href = 'login.html'; // 跳轉到登入頁
                } else {
                    // 顯示後端返回的錯誤消息
                    errorMessage.textContent = result.message || '註冊失敗，請稍後再試。';
                    // 清空密碼欄位，保留用戶名
                    passwordInput.value = '';
                    confirmPasswordInput.value = '';
                    passwordInput.focus();
                }
            } catch (error) {
                console.error("Registration network error:", error);
                if (errorMessage) {
                    errorMessage.textContent = '网络错误或服务器无响应，请稍后再试。';
                    errorMessage.style.display = 'block';
                }
            }
        });
    }
}); 