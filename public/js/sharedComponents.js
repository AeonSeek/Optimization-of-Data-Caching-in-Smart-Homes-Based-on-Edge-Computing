function insertHeader(placeholderId = 'header-placeholder') {
    const placeholder = document.getElementById(placeholderId);
    if (!placeholder) {
        console.error(
            `Header placeholder with ID '${placeholderId}' not found.`
        );
        return;
    }

    const headerHTML = `
    <header class="app-header">
        <div class="container header-container">
            <h1>智能家居控制台</h1>
            <div class="header-weather" id="header-weather">
                <!-- Weather info will be loaded by other scripts if needed -->
                 <span class="weather-loading"></span>
            </div>
            <button id="theme-toggle-button" class="theme-toggle-button" aria-label="切换主题">
                <span class="icon-sun">☀️</span>
                <span class="icon-moon">🌙</span>
            </button>
        </div>
    </header>
    `;

    placeholder.outerHTML = headerHTML; // Replace placeholder with header

    // Attach theme toggle button listener (logic moved from theme.js)
    const themeToggleButton = document.getElementById('theme-toggle-button');
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            const body = document.body;
            const themeKey = 'smartHomeTheme';
            body.classList.toggle('dark-theme');
            const currentTheme = body.classList.contains('dark-theme')
                ? 'dark'
                : 'light';
            localStorage.setItem(themeKey, currentTheme);
            console.log(
                `Header Component: Theme toggled and saved as: ${currentTheme}`
            );
        });
    } else {
        // This shouldn't happen if the button is in headerHTML, but good practice
        console.error('Theme toggle button not found after header insertion.');
    }

    // Trigger a custom event to notify other scripts (like weather loading) that the header is ready
    document.dispatchEvent(new CustomEvent('headerReady'));
    console.log('Header inserted and ready.');
}

/**
 * Generates and inserts the standard application footer.
 * @param {string} [placeholderId='app-footer'] - The ID of the element to replace with the footer.
 */
function insertFooter(placeholderId = 'app-footer') {
    const placeholder = document.getElementById(placeholderId);
    if (!placeholder) {
        console.error(`Footer placeholder with ID '${placeholderId}' not found.`);
        return;
    }

    const currentYear = new Date().getFullYear();
    const footerHTML = `
        <div class="container footer-container">
            <p>&copy; ${currentYear} 智能家居系统. 版权所有.</p>
            <!-- 可以添加其他链接或信息 -->
        </div>
    `;

    // Set the innerHTML of the placeholder (assuming it's a <footer> element)
    placeholder.innerHTML = footerHTML;
    console.log('Footer inserted.');
}

// Example usage (will be called from specific page scripts):
// document.addEventListener('DOMContentLoaded', () => {
//     insertHeader(); // Ensure header is inserted first if needed
//     insertFooter();
// });
