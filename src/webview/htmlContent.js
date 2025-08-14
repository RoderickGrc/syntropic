const { getNonce } = require('../utils/nonce');

/** @param {vscode.Uri} jsUri @param {vscode.Uri} cssUri @param {object} initialSettings */
function getWebviewContent(webview, extensionUri, jsUri, cssUri, initialSettings, locales) {
    const nonce = getNonce();
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="${cssUri}">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
</head>
<body>
    <div class="main-view" id="mainView">
        <div class="title-bar">
            <h1>${locales.explorerTitle || 'Explorer'}</h1>
            <div class="title-bar-actions">
                <button id="reloadExplorerBtn" class="icon-button" title="${locales.reloadExplorerTooltip || 'Reload'}"></button>
                <button id="settingsBtn" class="icon-button" title="${locales.settingsTooltip || 'Settings'}"></button>
            </div>
        </div>
        <div class="tree" id="fileTree">${locales.loadingExplorer || 'Loading...'}</div>
        <hr>

<!-- AÑADIR ESTE BLOQUE -->
<div class="options-bar" style="margin-bottom: 10px;">
    <input type="checkbox" id="includeLineNumbers" checked>
    <label for="includeLineNumbers">${locales.includeLineNumbersLabel || 'Include line numbers'}</label>
</div>
<!-- FIN DEL BLOQUE A AÑADIR -->

        <div id="output-controls">
            <button id="generateText">${locales.generateButton || 'TO TEXT'}</button>
            <button id="copyOutput">${locales.copyButton || 'Copy'}</button>
            <p id="charCount">${locales.charCountLabel || 'Characters: '}0</p>
            <p id="tokenCount" style="display:none;">${locales.tokenCountLabel || 'Est. tokens: '}0</p>
        </div>
        <h2>${locales.outputTitle || 'Output:'}</h2>
        <textarea id="outputText" readonly></textarea>
    </div>

    <div class="settings-view" id="settingsView" style="display:none;">
        <div class="title-bar">
            <button id="backButton" class="icon-button" title="${locales.backButtonTooltip || 'Back'}"></button>
            <h1>${locales.settingsTitle || 'Settings'}</h1>
        </div>
        <div class="settings-content">
            <div class="setting-group">
                <label for="textExtensionsWhitelist">${locales.textExtensionsLabel || 'Text Extensions:'}</label>
                <textarea id="textExtensionsWhitelist" rows="3">${initialSettings.textExtensionsWhitelist}</textarea>
            </div>
            <div class="setting-group">
                <label for="blacklistNames">${locales.blacklistNamesLabel || 'Names to Exclude:'}</label>
                <textarea id="blacklistNames" rows="3">${initialSettings.blacklistNames}</textarea>
            </div>
            <div class="setting-group">
                <label for="maxFolderItemsDisplay">${locales.maxFolderItemsLabel || 'Max. Items per Folder:'}</label>
                <input type="number" id="maxFolderItemsDisplay" value="${initialSettings.maxFolderItemsDisplay}">
            </div>
            <div class="setting-group">
                <label for="readRetryCount">${locales.readRetryCountLabel || 'File Read Retries:'}</label>
                <input type="number" id="readRetryCount" value="${initialSettings.readRetryCount}">
            </div>
            <div class="setting-group">
                <label for="readRetryDelay">${locales.readRetryDelayLabel || 'Read Retry Delay (ms):'}</label>
                <input type="number" id="readRetryDelay" value="${initialSettings.readRetryDelay}">
            </div>
            <div class="setting-group">
                <input type="checkbox" id="enableTokenCounting" ${initialSettings.enableTokenCounting ? 'checked' : ''}>
                <label for="enableTokenCounting">${locales.enableTokenCountingLabel || 'Count Tokens'}</label>
            </div>
            <div class="settings-actions">
                <button id="saveSettingsBtn">${locales.saveSettingsButton || 'Save Settings'}</button>
                <button id="resetSettingsBtn">${locales.resetSettingsButton || 'Reset to Defaults'}</button>
            </div>
        </div>
    </div>

    <script nonce="${nonce}">
        window.locales = ${JSON.stringify(locales)};
    </script>
    <script nonce="${nonce}" src="${jsUri}"></script>
</body>
</html>`;
}

module.exports = { getWebviewContent };
