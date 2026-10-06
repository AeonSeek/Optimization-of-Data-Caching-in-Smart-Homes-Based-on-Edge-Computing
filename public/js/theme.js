document.addEventListener('DOMContentLoaded', () => {
    // const themeToggleButton = document.getElementById('theme-toggle-button'); // Removed, handled by sharedComponents.js
    const body = document.body;
    const themeKey = 'smartHomeTheme';

    // 1. 應用初始主題 (優先 localStorage, 其次系統偏好, 最後默認 light)
    function applyInitialTheme() {
        const savedTheme = localStorage.getItem(themeKey);
        const prefersDark =
            window.matchMedia &&
            window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            body.classList.add('dark-theme');
            console.log('Theme Script: Applied dark theme.');
        } else {
            body.classList.remove('dark-theme');
            console.log('Theme Script: Applied light theme.');
        }
    }

    // 2. 監聽切換按鈕點擊事件 REMOVED - Handled by sharedComponents.js
    /*
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            body.classList.toggle('dark-theme');
            const currentTheme = body.classList.contains('dark-theme') ? 'dark' : 'light';
            localStorage.setItem(themeKey, currentTheme);
            console.log(`主題已切換並保存為: ${currentTheme}`);
        });
    } else {
        // Button might not exist on login page, or not yet inserted by sharedComponents
        // console.warn('未找到主題切換按鈕。');
    }
    */

    // 3. 初始加載時應用主題
    applyInitialTheme();

    // 4. (可選) 監聽系統主題變化
    if (window.matchMedia) {
        window
            .matchMedia('(prefers-color-scheme: dark)')
            .addEventListener('change', (e) => {
                // 只有在用戶沒有明確設置偏好時才跟隨系統變化
                if (!localStorage.getItem(themeKey)) {
                    if (e.matches) {
                        body.classList.add('dark-theme');
                        console.log(
                            'Theme Script: System switched to dark theme.'
                        );
                    } else {
                        body.classList.remove('dark-theme');
                        console.log(
                            'Theme Script: System switched to light theme.'
                        );
                    }
                }
            });
    }
});
