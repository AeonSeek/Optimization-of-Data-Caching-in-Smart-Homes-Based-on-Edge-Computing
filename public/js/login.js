document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // 防止表单的默认提交行为

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            errorMessage.textContent = ''; // 清除之前的错误消息

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                });

                const result = await response.json();

                if (response.ok) {
                    // 登录成功，重定向到主页面 (现在是 /html/index.html)
                    window.location.href = '/html/index.html';
                } else {
                    // 登录失败，显示错误消息
                    errorMessage.textContent =
                        result.message || '登录失败，请检查您的用户名和密码。';
                }
            } catch (error) {
                console.error('登录请求出错:', error);
                errorMessage.textContent = '发生错误，请稍后再试。';
            }
        });
    }
});
