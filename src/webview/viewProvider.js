const vscode = require('vscode');
const path = require('path');
const fs = require('fs'); // ADDED
const { getWebviewContent } = require('./htmlContent');
const { ExplorerService } = require('../fileSystem/explorerService');
const { encoding_for_model } = require('@dqbd/tiktoken');
const pdfjsLib = require('pdfjs-dist/build/pdf.mjs');

// Helper function to format log messages with a timestamp
function logWithTimestamp(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
}

class EnhancedExplorerViewProvider {
    /** @param {vscode.ExtensionContext} context @param {object} initialSettings */
    constructor(context, initialSettings) {
        logWithTimestamp("EnhancedExplorer[Ext]: EnhancedExplorerViewProvider constructor called.");
        this.context = context;
        this.currentWebviewView = undefined;
        this.lastSentTreeData = null; // Stores the last tree data sent to the webview for potential re-sends
        this.explorerService = new ExplorerService(context); // Instantiate the new service
        this.initialSettings = initialSettings; // Store initial settings
        this.locales = {}; // Object to store locale texts ADDED
        this.loadLocales(); // Call the new method ADDED
        logWithTimestamp("EnhancedExplorer[Ext]: ExplorerService instantiated.");
    }

    // NEW METHOD to load locale texts ADDED
    loadLocales() {
        const lang = 'en'; // For now, only English
        const filePath = path.join(this.context.extensionUri.fsPath, 'locales', `${lang}.json`);
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            this.locales = JSON.parse(fileContent);
            logWithTimestamp(`EnhancedExplorer[Ext]: Loaded locales for language: ${lang}`);
        } catch (error) {
            logWithTimestamp(`EnhancedExplorer[Ext]: Error loading locales file: ${error}`);
            vscode.window.showErrorMessage(`Failed to load language file for Syntropic.`);
        }
    }

    /** @param {vscode.WebviewView} webviewView */
    async resolveWebviewView(webviewView) {
        logWithTimestamp(`EnhancedExplorer[Ext]: resolveWebviewView START. View ID: ${webviewView.id}`);
        this.currentWebviewView = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            retainContextWhenHidden: true
        };
        logWithTimestamp("EnhancedExplorer[Ext]: Webview options set (enableScripts: true, retainContextWhenHidden: true).");

        const scriptUri = webviewView.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'media', 'main.js')
        );
        const styleUri = webviewView.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'media', 'style.css')
        );
        const workerUri = webviewView.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'media', 'pdf.worker.mjs')
        );
        logWithTimestamp(`EnhancedExplorer[Ext]: Generated URIs for webview content...`); // MODIFIED for conciseness
        
        // Set the worker source for pdfjs-dist
        // This is done here because the webview URI is available.
        // It needs to be set *before* any call to pdfjsLib.getDocument()
        // No longer needed if useWorkerFetch: false is set.
        // this.explorerService.setPdfWorkerSrc(workerUri.toString());

        logWithTimestamp("EnhancedExplorer[Ext]: Setting webview HTML content...");
        webviewView.webview.html = getWebviewContent(webviewView.webview, this.context.extensionUri, scriptUri, styleUri, this.initialSettings, this.locales); // PASA LOS TEXTOS ADDED
        logWithTimestamp("EnhancedExplorer[Ext]: Webview HTML content set.");
        
        // Add message handlers
        webviewView.webview.onDidReceiveMessage(async (msg) => {
            logWithTimestamp(`EnhancedExplorer[Ext]: Received message from webview: type='${msg.type}'`);
            if (!this.currentWebviewView) {
                logWithTimestamp("EnhancedExplorer[Ext]: Received message but currentWebviewView is undefined. Cannot respond.");
                return;
            }

            // Custom message handlers for settings
            switch (msg.type) {
                case 'logMessage':
                    logWithTimestamp(msg.log);
                    break;
                case 'saveSettings':
                    logWithTimestamp("Syntropic[Ext]: Received 'saveSettings' message from webview.");
                    const config = vscode.workspace.getConfiguration('syntropic');
                    for (const key in msg.settings) {
                        if (Object.prototype.hasOwnProperty.call(msg.settings, key)) {
                            await config.update(key, msg.settings[key], vscode.ConfigurationTarget.Global);
                        }
                    }
                    vscode.window.showInformationMessage('Syntropic: Settings saved successfully.');
                    // After saving, send updated settings back to webview to ensure consistency
                    this.postMessageToWebview({ type: 'currentSettings', settings: this.getSettingsFromConfig() });
                    break;
                case 'getSettings':
                    logWithTimestamp("Syntropic[Ext]: Received 'getSettings' message from webview.");
                    this.postMessageToWebview({ type: 'currentSettings', settings: this.getSettingsFromConfig() });
                    break;
                case 'readFile':
                    logWithTimestamp(`Syntropic[Ext]: Handling 'readFile' request for path: ${msg.path}, requestId: ${msg.requestId}`);
                    try {
                        const fileUri = vscode.Uri.file(msg.path);
                        const fileExtension = path.extname(msg.path).toLowerCase();
                        let content;
                        
                        if (fileExtension === '.pdf') {
                            const data = await vscode.workspace.fs.readFile(fileUri);
                            // pdfjsLib works with ArrayBuffer, so convert VS Code's Uint8Array
                            const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
                            const pdf = await pdfjsLib.getDocument({
                                data: arrayBuffer,
                                isEvalSupported: false, // Crucial for Node.js environment
                                useWorkerFetch: false,  // Crucial for Node.js environment
                            }).promise;
                            
                            const pageTexts = [];
                            for (let i = 1; i <= pdf.numPages; i++) {
                                const page = await pdf.getPage(i);
                                const textContent = await page.getTextContent();
                                // textContent.items is an array of TextItem objects. We just need the `str` property.
                            const pageText = textContent.items.map(item => item.str).join(' ');
                            
                            pageTexts.push(`<!------ Page ${i} -->\n${pageText.trim()}`);
                        }
                        
                        const fullText = pageTexts.join('\n\n');
                        content = `content "${path.basename(msg.path)}"\n\`\`\`pdf\n${fullText}\n\`\`\`\n\n`;
                    } else {
                        const data = await vscode.workspace.fs.readFile(fileUri);
                        let rawContent = Buffer.from(data).toString('utf8');
                        
                        // LÓGICA CONDICIONAL PARA NÚMEROS DE LÍNEA
                        if (msg.includeLineNumbers) {
                            content = rawContent.split('\n').map((line, index) => `${String(index + 1).padStart(2, ' ')}  ${line}`).join('\n');
                        } else {
                            content = rawContent;
                        }
                    }
                    
                        this.currentWebviewView.webview.postMessage({
                            type: 'fileContent',
                            path: msg.path,
                            content: content,
                            requestId: msg.requestId
                        });
                        logWithTimestamp(`EnhancedExplorer[Ext]: Sent 'fileContent' for path: ${msg.path}, requestId: ${msg.requestId}. Content length: ${content.length}`);
                    } catch (err) {
                        logWithTimestamp(`EnhancedExplorer[Ext]: Error reading file ${msg.path}: ${err.message || err}`);
                        this.currentWebviewView.webview.postMessage({
                            type: 'fileError',
                            path: msg.path,
                            error: String(err.message || err),
                            requestId: msg.requestId
                        });
                        logWithTimestamp(`EnhancedExplorer[Ext]: Sent 'fileError' for path: ${msg.path}, requestId: ${msg.requestId}. Error: ${err.message || err}`);
                    }
                    break;
                case 'requestTreeData':
                    logWithTimestamp("EnhancedExplorer[Ext]: Webview explicitly requested full tree data refresh.");
                    await this.explorerService.sendWorkspaceTree(this.currentWebviewView);
                    logWithTimestamp("EnhancedExplorer[Ext]: Full tree data refresh initiated.");
                    break;
                case 'fetchChildren':
                    logWithTimestamp(`EnhancedExplorer[Ext]: Received 'fetchChildren' request for path: ${msg.path}`);
                    // This now calls the chunked method, which sends messages on its own.
                    // No need to await or send a message here.
                    this.explorerService.getDirectoryEntries(msg.path, this.currentWebviewView);
                    break;
                case 'getTokenCount':
                    try {
                        const text = msg.text;
                        const model = 'gpt-4'; // Default model for token counting
                        const encoder = encoding_for_model(model);
                        const tokens = encoder.encode(text);
                        encoder.free();
                        this.postMessageToWebview({ type: 'tokenCountResult', count: tokens.length });
                    } catch (error) {
                        logWithTimestamp(`EnhancedExplorer[Ext]: Error counting tokens: ${error.message}`);
                        this.postMessageToWebview({ type: 'tokenCountResult', count: -1, error: error.message });
                    }
                    break;
                case 'reloadWorkspace':
                    logWithTimestamp("EnhancedExplorer[Ext]: Webview requested workspace reload (full tree re-fetch).");
                    if (this.currentWebviewView) {
                        await this.explorerService.sendWorkspaceTree(this.currentWebviewView);
                        logWithTimestamp("EnhancedExplorer[Ext]: Workspace reload initiated.");
                    } else {
                        logWithTimestamp("EnhancedExplorer[Ext]: 'reloadWorkspace' received but currentWebviewView is undefined. Cannot reload.");
                    }
                    break;
                default:
                    logWithTimestamp(`EnhancedExplorer[Ext]: Unknown message type received from webview: ${msg.type}. Message: ${JSON.stringify(msg)}`);
            }
        });

        // Initial settings load or re-send if webview is visible
        if (this.currentWebviewView && this.currentWebviewView.visible) {
            logWithTimestamp("EnhancedExplorer[Ext]: Webview became visible. Sending initial settings.");
            this.postMessageToWebview({ type: 'currentSettings', settings: this.getSettingsFromConfig() });
        }
        
        webviewView.onDidDispose(() => {
            logWithTimestamp("EnhancedExplorer[Ext]: Webview disposed. Clearing currentWebviewView reference.");
            this.currentWebviewView = undefined;
            this.lastSentTreeData = null;
        }, null, this.context.subscriptions);

        webviewView.onDidChangeVisibility(async () => {
            logWithTimestamp(`EnhancedExplorer[Ext]: Webview visibility changed to: ${this.currentWebviewView ? this.currentWebviewView.visible : 'unknown'}`);
            if (this.currentWebviewView && this.currentWebviewView.visible) {
                logWithTimestamp("EnhancedExplorer[Ext]: Webview became visible. Sending 'viewBecameVisible' message to webview.");
                this.currentWebviewView.webview.postMessage({ type: 'viewBecameVisible' });
            } else if (this.currentWebviewView && !this.currentWebviewView.visible) {
                logWithTimestamp("EnhancedExplorer[Ext]: Webview became hidden. Sending 'viewBecameHidden' message to webview to save state.");
                this.currentWebviewView.webview.postMessage({ type: 'viewBecameHidden' });
            }
        }, null, this.context.subscriptions);

        logWithTimestamp("EnhancedExplorer[Ext]: resolveWebviewView END (onDidReceiveMessage handler set).");
    }

    getSettingsFromConfig() {
        const config = vscode.workspace.getConfiguration('syntropic');
        // Use get() so new users receive defaults declared in package.json
        const readEffective = (key, def) => config.get(key, def);
        return {
            textExtensionsWhitelist: readEffective('textExtensionsWhitelist', ''),
            blacklistNames: readEffective('blacklistNames', ''),
            maxFolderItemsDisplay: readEffective('maxFolderItemsDisplay', 50),
            readRetryCount: readEffective('readRetryCount', 1),
            readRetryDelay: readEffective('readRetryDelay', 300),
            enableTokenCounting: readEffective('enableTokenCounting', false)
        };
    }

    /** @param {any} message */
    postMessageToWebview(message) {
        if (this.currentWebviewView) {
            this.currentWebviewView.webview.postMessage(message);
        } else {
            logWithTimestamp("EnhancedExplorer[Ext]: Cannot post message to webview: currentWebviewView is undefined.");
        }
    }
}

module.exports = { EnhancedExplorerViewProvider };
