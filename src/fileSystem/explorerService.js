const vscode = require('vscode');
const path = require('path');
const pdfjsLib = require('pdfjs-dist/build/pdf.mjs');
const { createCanvas } = require('canvas');
const DOMMatrix = require('dommatrix'); // Using the dommatrix package directly
const { pathToFileURL } = require('url'); // Import pathToFileURL

// Helper function to format log messages with a timestamp
function logWithTimestamp(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
}

// POLYFILLS GLOBALES PARA PDF.JS EN NODE.JS
global.DOMMatrix = DOMMatrix;

// CLASES DE CANVAS PARA PDF.JS EN NODE
class NodeCanvasFactory {
    create(width, height) {
        const canvas = createCanvas(width, height);
        const context = canvas.getContext("2d");
        return { canvas, context };
    }
    reset(canvasAndContext, width, height) {
        canvasAndContext.canvas.width = width;
        canvasAndContext.canvas.height = height;
    }
    destroy(canvasAndContext) {
        canvasAndContext.canvas.width = 0;
        canvasAndContext.canvas.height = 0;
        canvasAndContext.canvas = null;
        canvasAndContext.context = null;
    }
}

// Set the worker source for pdfjs-dist
// For Node.js, we need to point directly to the worker file within node_modules
// This ensures that pdfjs-dist can find its worker in the Node.js environment.
pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(path.resolve(__dirname, '../../node_modules/pdfjs-dist/build/pdf.worker.mjs')).toString();
logWithTimestamp(`Syntropic[Ext]: Global pdf.js worker source set to: ${pdfjsLib.GlobalWorkerOptions.workerSrc}`);

class ExplorerService {
    /** @param {vscode.ExtensionContext} context @param {object} initialSettings */
    constructor(context, initialSettings) {
        this.context = context;
        this.initialSettings = initialSettings || {};
        // pdfWorkerSrc is no longer needed as workerSrc is set globally
        logWithTimestamp("Syntropic[Ext]: ExplorerService initialized.");
    }

    // setPdfWorkerSrc is no longer needed if workerSrc is set globally
    // setPdfWorkerSrc(src) {
    //     this.pdfWorkerSrc = src;
    //     pdfjsLib.GlobalWorkerOptions.workerSrc = src;
    //     logWithTimestamp(`Syntropic[Ext]: pdf.js worker source set to: ${src}`);
    // }

    isBlacklisted(name) {
        const config = vscode.workspace.getConfiguration('syntropic');
        const inspected = config.inspect('blacklistNames');
        const blacklistNames = inspected && inspected.globalValue !== undefined ? inspected.globalValue : '';
        const blacklist = blacklistNames.split(',').map(s => s.trim()).filter(s => s.length > 0);
        return blacklist.includes(name);
    }

    /** @param {vscode.WebviewView} view */
    async sendWorkspaceTree(view) {
        logWithTimestamp("Syntropic[Ext]: sendWorkspaceTree START. Sending initial root to webview.");
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) {
            logWithTimestamp("Syntropic[Ext]: No workspace folders found.");
            view.webview.postMessage({ type: 'initTree', root: null, error: "No workspace folder open." });
            return;
        }
        const rootPath = folders[0].uri.fsPath;
        logWithTimestamp(`Syntropic[Ext]: Workspace root path: ${rootPath}`);

        const rootNodeData = {
            name: path.basename(rootPath),
            type: 'folder',
            path: rootPath,
            children: [],
            hasUnloadedChildren: true, // Will trigger a 'fetchChildren' from the webview
            isExpanded: true
        };
        
        view.webview.postMessage({
            type: 'initTree',
            root: rootNodeData
        });
        logWithTimestamp("Syntropic[Ext]: 'initTree' message with root stub posted successfully.");
        logWithTimestamp("Syntropic[Ext]: sendWorkspaceTree END.");
    }

    /** 
     * Fetches entries for a directory and sends them to the webview in chunks.
     * @param {string} dirPath The path of the directory to read.
     * @param {vscode.WebviewView} view The webview to post messages to.
     */
    async getDirectoryEntries(dirPath, view) {
        logWithTimestamp(`Syntropic[Ext]: getDirectoryEntries (chunked) START for directory: ${dirPath}`);
        try {
            const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(dirPath));
            logWithTimestamp(`Syntropic[Ext]: Read ${entries.length} entries from ${dirPath}. Processing in chunks...`);
            
            const chunkSize = 10; // Process 10 entries at a time for more progressive loading

            for (let i = 0; i < entries.length; i += chunkSize) {
                const chunk = entries.slice(i, i + chunkSize);
                
                const childrenPromises = chunk.map(async ([name, type]) => {
                    const fullPath = path.join(dirPath, name);
                    if (this.isBlacklisted(name)) {
                        return null;
                    }
                    
                    if (type === vscode.FileType.Directory) {
                        return { name, type: 'folder', path: fullPath, children: [], hasUnloadedChildren: true, isExpanded: false };
                    }
                    return { name, type: 'file', path: fullPath, children: [], hasUnloadedChildren: false };
                });

                const resolvedChildren = (await Promise.all(childrenPromises)).filter(child => child !== null);
                
                if (resolvedChildren.length > 0) {
                    view.webview.postMessage({
                        type: 'childrenChunkLoaded',
                        parentPath: dirPath,
                        children: resolvedChildren
                    });
                     logWithTimestamp(`Syntropic[Ext]: Sent chunk of ${resolvedChildren.length} children for ${dirPath}.`);
                }
                // Yield to the event loop to prevent blocking, reduced to 1ms
                await new Promise(resolve => setTimeout(resolve, 1));
            }

            // Signal that all chunks have been sent
            view.webview.postMessage({
                type: 'childrenLoadFinished',
                parentPath: dirPath
            });
            logWithTimestamp(`Syntropic[Ext]: Finished sending all chunks for ${dirPath}.`);

        } catch (error) {
            logWithTimestamp(`Syntropic[Ext]: Error in getDirectoryEntries for ${dirPath}: ${error.message || error}`);
            view.webview.postMessage({
                type: 'childrenLoadError',
                parentPath: dirPath,
                error: String(error.message || error)
            });
        }
    }
}

module.exports = { ExplorerService };
