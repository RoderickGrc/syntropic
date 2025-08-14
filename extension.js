/* eslint-disable  node/no-unsupported-features/node-builtins */
const vscode = require('vscode');
const path = require('path');
const { EnhancedExplorerViewProvider } = require('./src/webview/viewProvider');
const { getNonce } = require('./src/utils/nonce');

// Helper function to format log messages with a timestamp
function logWithTimestamp(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    logWithTimestamp("Syntropic[Ext]: ACTIVATE - Extension 'Syntropic' is now active!");
    logWithTimestamp("Syntropic[Ext]: Context subscriptions will be pushed here.");

    const config = vscode.workspace.getConfiguration('syntropic');
    const readGlobal = (key, def) => {
        const inspected = config.inspect(key);
        return inspected && inspected.globalValue !== undefined ? inspected.globalValue : def;
    };
    const textExtensionsWhitelist = readGlobal('textExtensionsWhitelist', '');
    const blacklistNames = readGlobal('blacklistNames', '');
    const maxFolderItemsDisplay = readGlobal('maxFolderItemsDisplay', 50);
    const readRetryCount = readGlobal('readRetryCount', 1);
    const readRetryDelay = readGlobal('readRetryDelay', 300);
    const enableTokenCounting = readGlobal('enableTokenCounting', false);

    const initialSettings = {
        textExtensionsWhitelist,
        blacklistNames,
        maxFolderItemsDisplay,
        readRetryCount,
        readRetryDelay,
        enableTokenCounting
    };

    const provider = new EnhancedExplorerViewProvider(context, initialSettings);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'syntropicEnhancedExplorerView',
            provider
        )
    );
    logWithTimestamp("Syntropic[Ext]: WebviewViewProvider 'syntropicEnhancedExplorerView' registered.");

    // Register a command to open extension settings directly
    context.subscriptions.push(
        vscode.commands.registerCommand('syntropic.openSettings', () => {
            vscode.commands.executeCommand('workbench.action.openSettings', 'syntropic');
        })
    );
    logWithTimestamp("Syntropic[Ext]: Command 'syntropic.openSettings' registered.");
}

function deactivate() {
    logWithTimestamp("Syntropic[Ext]: DEACTIVATE - Extension 'Syntropic' is now deactivated.");
}

module.exports = { activate, deactivate };
