document.addEventListener('DOMContentLoaded', () => {
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const messageElement = document.getElementById('message');
    const identifierInput = document.getElementById('identifier');

    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // 阻止表单默认提交
            messageElement.textContent = ''; // 清空之前的消息
            messageElement.className = 'info-message'; // 重置消息样式

            const identifier = identifierInput.value.trim();

            if (!identifier) {
                messageElement.textContent = '请输入用户名或邮箱地址。';
                messageElement.className = 'error-message';
                return;
            }

            // --- 发送请求到后端 --- (后续实现)
            try {
                // 这里将来会调用 fetch 发送请求到后端的 /forgot-password 接口
                console.log(`准备发送重设请求给: ${identifier}`);

                // --- 模拟后端响应 (临时) ---
                // 假设后端处理成功 (实际应根据 fetch 结果判断)
                messageElement.textContent = '如果该用户存在，密码重设指示已发送。请检查您的邮箱。' // 通用提示，不暴露用户是否存在
                messageElement.className = 'success-message'; // 可以添加一个成功样式
                identifierInput.value = ''; // 清空输入框

                // --- 模拟后端响应 (如果失败) ---
                // messageElement.textContent = '处理请求时发生错误，请稍后再试。';
                // messageElement.className = 'error-message';

            } catch (error) {
                console.error('忘记密码请求失败:', error);
                messageElement.textContent = '网络错误或服务器无响应，请稍后再试。';
                messageElement.className = 'error-message';
            }
        });
    }
}); 