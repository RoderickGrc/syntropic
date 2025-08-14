// Helper function to format log messages with a timestamp
function logWithTimestamp(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
}

logWithTimestamp("EnhancedExplorer[Webview]: SCRIPT START - MAIN.JS EXECUTION. Instance ID: " + Math.random().toString(36).substring(2, 15));
(function () {
    const vscode = acquireVsCodeApi();
    const previousState = vscode.getState(); // Retrieve saved state
    logWithTimestamp("EnhancedExplorer[Webview]: Previous webview state loaded: " + JSON.stringify(previousState));

    let treeRoot = null; // Will be initialized from previousState or 'initTree' message.

    // --- CONFIGURATION VARIABLES (updated dynamically) ---
    let TEXT_EXTENSIONS_WHITELIST = []; 
    let BLACKLIST_NAMES = []; 
    let MAX_FOLDER_ITEMS_DISPLAY = 50;
    let READ_RETRY_COUNT = 1;
    let READ_RETRY_DELAY = 300;
    let ENABLE_TOKEN_COUNTING = false;

    const LOCALSTORAGE_KEY = 'vscodeEnhancedExplorerState';

    // --- DOM ELEMENTS (declared once) ---
    let fileTreeContainer, outputText, charCountEl, tokenCountEl, generateBtn, copyBtn, reloadExplorerBtn, settingsBtn, backButton, mainView, settingsView;
    let textExtensionsWhitelistInput, blacklistNamesInput, maxFolderItemsDisplayInput, readRetryCountInput, readRetryDelayInput, enableTokenCountingInput;
    let saveSettingsBtn, resetSettingsBtn;
    let selectedNodes = []; // To track currently selected nodes (for multi-selection)

    // Store current settings fetched from extension
    let currentSettings = {
        textExtensionsWhitelist: "",
        blacklistNames: "",
        maxFolderItemsDisplay: 50,
        readRetryCount: 1,
        readRetryDelay: 300,
        enableTokenCounting: false
    };

    // --- SVG ICONS (for UI elements) ---
    const ICONS = {
        eye: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="icon"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>',
        eyeOff: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="icon"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.75C21.27 7.11 17 4.5 12 4.5c-1.6 0-3.14.35-4.6.98l2.1 2.1C10.74 7.13 11.35 7 12 7zm-1.07 1.07l2.83 2.83c-.22.1-.46.18-.71.22l-3.04-3.04c.04-.25.12-.49.22-.71zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L21.73 22 23 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>',
        chevronDown: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="icon"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>',
        chevronRight: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="icon"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z"/></svg>',
        settings: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="icon"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.38-1.09-.7-1.72-.94l-.44-2.61C14.07 2.11 13.72 2 13.37 2h-2.74c-.35 0-.7.11-1.02.33l-.44 2.61c-.63.24-1.2.56-1.72.94l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.12.22-.07.49.12.64l2.11 1.65c-.04.32-.07.64-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.38 1.09.7 1.72.94l.44 2.61c.32.22.67.33 1.02.33h2.74c.35 0 .7-.11 1.02-.33l.44-2.61c.63-.24 1.2-.56 1.72-.94l2.49 1c.22.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>',
        arrowBack: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="icon"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>',
        reload: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="icon"><path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.6-.93-.9-2.01-.9-3.14 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.6.93.9 2.01.9 3.14 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"/></svg>'
    };

    // --- TreeNode Class (representing file/folder data in the tree) ---
    class TreeNode {
      constructor(name, type, file = null, path = "") {
        this.name = name;
        this.type = type;
        this.path = path;
        this.children = [];
        this.state = 'unchecked'; // 'checked', 'unchecked', 'indeterminate'
        this.showInOutput = true; // For the eye icon visibility toggle
        this.isExpanded = false; // For folders, tracks UI expansion state
        this.loadState = type === 'folder' ? 'idle' : 'loaded'; // 'idle', 'loading', 'loaded'
        // DOM element references (will be populated during rendering)
        this.liEl = null;
        this.eyeEl = null;
        this.labelEl = null;
        this.checkboxEl = null;
        this.toggleEl = null;
        this.ulEl = null;
        this.parent = null; // Reference to parent TreeNode
      }
    }

    // --- Communication Logic with the VS Code Extension ---
    const pendingFileReads = new Map();
    let fileReadCounter = 0;

    function readFileContentVSCode(filePath, includeLineNumbers) {
        logWithTimestamp(`EnhancedExplorer[Webview]: Requesting 'readFile' for path: ${filePath} (line numbers: ${includeLineNumbers})`);
        return new Promise((resolve, reject) => {
            const requestId = `file-${filePath}-${fileReadCounter++}`;
            pendingFileReads.set(requestId, { resolve, reject, path: filePath });
            vscode.postMessage({ 
                type: 'readFile', 
                path: filePath, 
                requestId: requestId,
                includeLineNumbers: includeLineNumbers // <-- PARÁMETRO CLAVE
            });
        });
    }

    function handleFileContentResponse(path, content, requestId) {
        logWithTimestamp(`EnhancedExplorer[Webview]: Received 'fileContent' for path: ${path}, requestId: ${requestId}.`);
        const promiseCallbacks = pendingFileReads.get(requestId);
        if (promiseCallbacks && promiseCallbacks.path === path) {
            promiseCallbacks.resolve(content);
            pendingFileReads.delete(requestId);
            logWithTimestamp(`EnhancedExplorer[Webview]: Resolved readFile promise for requestId: ${requestId}`);
        } else {
            logWithTimestamp("EnhancedExplorer[Webview]: Received 'fileContent' for unknown/mismatched requestId/path. Request might be stale or duplicate." + JSON.stringify({ requestId, path }));
        }
    }

    function handleFileErrorResponse(path, error, requestId) {
        logWithTimestamp(`EnhancedExplorer[Webview]: Received 'fileError' for path: ${path}, requestId: ${requestId}. Error: ${error}`);
        const promiseCallbacks = pendingFileReads.get(requestId);
        if (promiseCallbacks && promiseCallbacks.path === path) {
            promiseCallbacks.reject(new Error(error));
            pendingFileReads.delete(requestId);
            logWithTimestamp(`EnhancedExplorer[Webview]: Rejected readFile promise for requestId: ${requestId}`);
        } else {
            logWithTimestamp("EnhancedExplorer[Webview]: Received 'fileError' for unknown/mismatched requestId/path. Request might be stale or duplicate." + JSON.stringify({ requestId, path }));
        }
    }
    
    // --- Data Transformation and Sorting ---
    function transformToTreeNodes(nodeData, parent = null) {
        logWithTimestamp(`EnhancedExplorer[Webview]: Transforming node: ${nodeData.name} (type: ${nodeData.type})`);
        const newNode = new TreeNode(nodeData.name, nodeData.type, null, nodeData.path);
        newNode.parent = parent;

        // Restore persisted properties from nodeData
        if (typeof nodeData.state === 'string') {
            newNode.state = nodeData.state;
            logWithTimestamp(`EnhancedExplorer[Webview]: Restored state for ${newNode.name}: ${newNode.state}`);
        }
        if (typeof nodeData.showInOutput === 'boolean') {
            newNode.showInOutput = nodeData.showInOutput;
            logWithTimestamp(`EnhancedExplorer[Webview]: Restored showInOutput for ${newNode.name}: ${newNode.showInOutput}`);
        }
        if (typeof nodeData.isExpanded === 'boolean') {
            newNode.isExpanded = nodeData.isExpanded;
            logWithTimestamp(`EnhancedExplorer[Webview]: Restored isExpanded for ${newNode.name}: ${newNode.isExpanded}`);
        }

        // Restore loadState if it exists in the persisted data
        if (typeof nodeData.loadState === 'string') {
            newNode.loadState = nodeData.loadState;
        }

        if (nodeData.children && Array.isArray(nodeData.children)) {
            logWithTimestamp(`EnhancedExplorer[Webview]: Processing ${nodeData.children.length} children for ${newNode.name}.`);
            newNode.children = nodeData.children.map(childData => transformToTreeNodes(childData, newNode));
            sortChildrenRecursive(newNode);
        } else {
            newNode.children = []; // Ensure children is always an array
            logWithTimestamp(`EnhancedExplorer[Webview]: No children provided for ${newNode.name}.`);
        }
        return newNode;
    }

    function sortChildrenRecursive(node) {
        if (node.type === "folder" && Array.isArray(node.children) && node.children.length > 0) {
            logWithTimestamp(`EnhancedExplorer[Webview]: Sorting children for folder: ${node.name}`);
            node.children.sort((a, b) => {
                if (a.type !== b.type) return a.type === "folder" ? -1 : 1; // Folders before files
                return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }); // Alphabetic
            });
        }
    }
    function getSerializableTree(node) {
        if (!node) return null;
        const serializableNode = {
            name: node.name,
            type: node.type,
            path: node.path,
            state: node.state,
            showInOutput: node.showInOutput,
            isExpanded: node.isExpanded,
            loadState: node.loadState,
            children: []
        };
        if (node.children && node.children.length > 0) {
            serializableNode.children = node.children.map(child => getSerializableTree(child)).filter(n => n !== null);
        }
        return serializableNode;
    }

    function saveTreeRootToWebviewState() {
        if (treeRoot) {
            logWithTimestamp("EnhancedExplorer[Webview]: Saving serializable treeRoot to VS Code webview state.");
            const serializable = getSerializableTree(treeRoot);
            vscode.setState({ treeRootData: serializable });
            logWithTimestamp("EnhancedExplorer[Webview]: Webview state saved.");
        } else {
            logWithTimestamp("EnhancedExplorer[Webview]: treeRoot is null, not saving to webview state.");
            vscode.setState({ treeRootData: null }); // Clear if null
        }
    }
    // --- Persistence (localStorage) ---
    function saveStateToLocalStorageGlobally(rootNode) {
        if (!rootNode || typeof rootNode !== 'object' || !rootNode.type) {
            logWithTimestamp("EnhancedExplorer[Webview]: saveStateToLocalStorageGlobally aborted: invalid rootNode." + JSON.stringify(rootNode));
            return;
        }
        const stateMap = {};
        function traverse(node) {
            if (!node || typeof node !== 'object') return;
            if (typeof node.path === 'string' && node.path !== "") { // Only save nodes with a path
                stateMap[node.path] = { state: node.state, showInOutput: node.showInOutput };
            }
            if (node.type === "folder" && Array.isArray(node.children)) {
                node.children.forEach(traverse);
            }
        }
        traverse(rootNode);
        try {
            localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(stateMap));
            logWithTimestamp("EnhancedExplorer[Webview]: States saved to localStorage for debugging/persistence.");
        } catch (e) {
            logWithTimestamp("EnhancedExplorer[Webview]: Error saving state to localStorage: " + e);
        }
    }

    function loadStateFromLocalStorage(rootNode) {
        logWithTimestamp("EnhancedExplorer[Webview]: Attempting to load state from localStorage.");
        const savedStateJSON = localStorage.getItem(LOCALSTORAGE_KEY);
        if (!savedStateJSON) {
            logWithTimestamp("EnhancedExplorer[Webview]: No saved state found in localStorage.");
            return false;
        }
        try {
            const stateMap = JSON.parse(savedStateJSON);
            function traverse(node) {
                if (!node || typeof node !== 'object') return;
                if (node.path && stateMap[node.path]) {
                    const saved = stateMap[node.path];
                    if (typeof saved.state === 'string' && ['checked', 'unchecked', 'indeterminate'].includes(saved.state)) {
                        node.state = saved.state;
                    }
                    if (typeof saved.showInOutput === 'boolean') {
                        node.showInOutput = saved.showInOutput;
                    }
                }
                if (node.type === "folder" && Array.isArray(node.children)) {
                    node.children.forEach(traverse);
                }
            }
            traverse(rootNode);
            logWithTimestamp("EnhancedExplorer[Webview]: State successfully loaded from localStorage.");
            return true;
        } catch (e) {
            logWithTimestamp("EnhancedExplorer[Webview]: Error loading/parsing state from localStorage: " + e);
            localStorage.removeItem(LOCALSTORAGE_KEY); // Clear corrupt state
            return false;
        }
    }
    
    function applyStateToUI(node) {
        if (!node || !node.liEl) return;
        // logWithTimestamp(`EnhancedExplorer[Webview]: Applying UI state for node: ${node.name}`);

        if (node.checkboxEl) {
            node.checkboxEl.checked = (node.state === 'checked');
            node.checkboxEl.indeterminate = (node.state === 'indeterminate');
        }

        if (node.eyeEl) {
            node.eyeEl.innerHTML = node.showInOutput ? ICONS.eye : ICONS.eyeOff;
        }
        
        if (node.labelEl) {
            node.labelEl.classList.toggle("hidden-in-output", !node.showInOutput);
        }

        if (node.type === 'folder') {
            if (node.toggleEl) {
                if (node.loadState === 'loading') {
                    node.toggleEl.innerHTML = '...'; 
                } else {
                    node.toggleEl.innerHTML = node.isExpanded ? ICONS.chevronDown : ICONS.chevronRight;
                }
            }
            if (node.ulEl) {
                node.ulEl.classList.toggle("hidden", !node.isExpanded);
            }
        }
        
        if (node.children && node.children.length > 0) {
            node.children.forEach(applyStateToUI);
        }
    }


    // --- Rendering and UI (adapted from explorer.html) ---
    function _renderTree(node, container) { 
        // logWithTimestamp(`EnhancedExplorer[Webview]: Rendering node: ${node.name} (type: ${node.type})`);
        const li = document.createElement("li");
        node.liEl = li;
        li.treeNode = node; 

        if (node.type === "folder") {
            const toggle = document.createElement("span");
            toggle.className = "toggle";
            node.toggleEl = toggle;
            li.appendChild(toggle);
        } else {
            const spacer = document.createElement("span");
            spacer.className = "spacer";
            li.appendChild(spacer);
        }

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "checkbox";
        node.checkboxEl = checkbox;
        li.appendChild(checkbox);

        if (node.checkboxEl) {
            node.checkboxEl.checked = (node.state === 'checked');
            node.checkboxEl.indeterminate = (node.state === 'indeterminate');
        }

        if (node.path) {
            const eyeSpan = document.createElement("span");
            eyeSpan.className = "eye-toggle";
            node.eyeEl = eyeSpan;
            li.appendChild(eyeSpan);
        } else {
             const eyeSpacer = document.createElement("span"); 
             eyeSpacer.style.display = 'inline-block'; 
             eyeSpacer.style.minWidth = '1.5em'; 
             eyeSpacer.style.marginRight = '2px';
             li.appendChild(eyeSpacer);
        }

        const label = document.createElement("span");
        label.textContent = node.type === 'folder' ? node.name + '/' : node.name;
        label.className = "node-label";
        label.classList.toggle("hidden-in-output", !node.showInOutput);
        node.labelEl = label;
        li.appendChild(label);

        // Apply initial UI state for this node after its elements are created
        applyStateToUI(node);

        container.appendChild(li);

        if (node.type === "folder") {
            const ul = document.createElement("ul");
            node.ulEl = ul;
            ul.classList.toggle("hidden", !node.isExpanded);

            // Always render children to the DOM if they exist in the model,
            // visibility is controlled by the 'hidden' class on the UL element.
            if (node.children && node.children.length > 0) {
                node.children.forEach(child => _renderTree(child, ul));
            }
            li.appendChild(ul);
        }
    }

    function updateChildrenState(node, state) {
        if (node.type === "folder" && Array.isArray(node.children)) {
            logWithTimestamp(`EnhancedExplorer[Webview]: Updating children state for ${node.name} to ${state}.`);
            node.children.forEach(child => {
                child.state = state;
                if (child.checkboxEl) {
                    child.checkboxEl.checked = (state === 'checked');
                    child.checkboxEl.indeterminate = false;
                }
                if (child.type === "folder") {
                    updateChildrenState(child, state); 
                }
            });
        }
    }

    function updateParentState(parentNode) {
        if (!parentNode || parentNode === treeRoot) {
            // logWithTimestamp("EnhancedExplorer[Webview]: Reached root or invalid parent, stopping parent state update.");
            return;
        }

        if (!parentNode.checkboxEl || !Array.isArray(parentNode.children)) {
            logWithTimestamp("EnhancedExplorer[Webview]: Error updating parent: checkbox or children invalid." + JSON.stringify(parentNode));
            return;
        }

        logWithTimestamp(`EnhancedExplorer[Webview]: Updating parent state for ${parentNode.name}.`);
        const children = parentNode.children;
        if (children.length === 0) {
            parentNode.state = 'unchecked';
        } else {
            let allChecked = true;
            let noneChecked = true;
            children.forEach(child => {
                if (child.state === 'checked' || child.state === 'indeterminate') {
                    noneChecked = false;
                }
                if (child.state === 'unchecked' || child.state === 'indeterminate') {
                    allChecked = false;
                }
            });

            if (allChecked) parentNode.state = 'checked';
            else if (noneChecked) parentNode.state = 'unchecked';
            else parentNode.state = 'indeterminate';
        }
        parentNode.checkboxEl.checked = (parentNode.state === 'checked');
        parentNode.checkboxEl.indeterminate = (parentNode.state === 'indeterminate');
         
        updateParentState(parentNode.parent); // Recursive call upwards
    }
    function toggleDescendantsVisibilityUI(node, visibility) {
        if (node.type === "folder" && Array.isArray(node.children)) {
           logWithTimestamp(`EnhancedExplorer[Webview]: Toggling descendants visibility for ${node.name} to ${visibility}.`);
           node.children.forEach(child => {
               child.showInOutput = visibility;
               applyStateToUI(child);
               toggleDescendantsVisibilityUI(child, visibility);
           });
       }
   }
    
    function setupNodeLinks(node) {
        if (!node) return;
        if (node.liEl) node.liEl.treeNode = node;
        if (node.type === 'folder' && Array.isArray(node.children)) {
            node.children.forEach(child => {
                child.parent = node; // Ensure parent is correctly linked
                setupNodeLinks(child);
            });
        }
    }

    // --- Output Generation ---
    function generateFolderDiagram(node, prefix = "", isRootContext = true) {
        if (!node || (!isRootContext && (!node.showInOutput || BLACKLIST_NAMES.includes(node.name)))) {
            return "";
        }
    
        let output = "";
        if (isRootContext) {
            output = "# Folder Tree\n";
            if (node.showInOutput && !BLACKLIST_NAMES.includes(node.name)) {
                output += node.name + (node.type === 'folder' ? '/' : '') + "\n";
                if (node.type === "folder" && Array.isArray(node.children)) {
                    const visibleChildren = node.children.filter(child => child.showInOutput && !BLACKLIST_NAMES.includes(child.name));
                    let limitedChildren = visibleChildren;
                    if (visibleChildren.length > MAX_FOLDER_ITEMS_DISPLAY) {
                        limitedChildren = visibleChildren.slice(0, MAX_FOLDER_ITEMS_DISPLAY);
                        logWithTimestamp(`EnhancedExplorer[Webview]: Limiting folder diagram children for ${node.name} to ${MAX_FOLDER_ITEMS_DISPLAY}.`);
                    }
    
                    limitedChildren.forEach((child, index) => {
                        const isLast = index === limitedChildren.length - 1 && visibleChildren.length <= MAX_FOLDER_ITEMS_DISPLAY;
                        output += generateFolderDiagram(child, " ", false, isLast); 
                    });
    
                    if (visibleChildren.length > MAX_FOLDER_ITEMS_DISPLAY) {
                        output += `└── ... (${visibleChildren.length - MAX_FOLDER_ITEMS_DISPLAY} more)\n`;
                    }
                }
            }
        } else {
            const connector = arguments[3] ? "└── " : "├── ";
            output = `${prefix}${connector}${node.name}${node.type === 'folder' ? '/' : ''}\n`;
    
            if (node.type === "folder" && Array.isArray(node.children)) {
                const visibleChildren = node.children.filter(child => child.showInOutput && !BLACKLIST_NAMES.includes(child.name));
                let limitedChildren = visibleChildren;
                if (visibleChildren.length > MAX_FOLDER_ITEMS_DISPLAY) {
                    limitedChildren = visibleChildren.slice(0, MAX_FOLDER_ITEMS_DISPLAY);
                }
    
                limitedChildren.forEach((child, index) => {
                    const newPrefix = prefix + (arguments[3] ? "    " : "│   ");
                    const isLast = index === limitedChildren.length - 1 && visibleChildren.length <= MAX_FOLDER_ITEMS_DISPLAY;
                    output += generateFolderDiagram(child, newPrefix, false, isLast);
                });
    
                if (visibleChildren.length > MAX_FOLDER_ITEMS_DISPLAY) {
                    const newPrefix = prefix + (arguments[3] ? "    " : "│   ");
                    output += `${newPrefix}└── ... (${visibleChildren.length - MAX_FOLDER_ITEMS_DISPLAY} more)\n`;
                }
            }
        }
        return output;
    }
    

    function getSelectedFileNodes(node) {
        let selectedNodes = [];
        if (!node) return selectedNodes;

        function isNodeEffectivelyBlocked(n) {
            if (!n) return true;
            if (BLACKLIST_NAMES.includes(n.name)) return true;
            if (!n.showInOutput) return true;
            return false;
        }

        if (isNodeEffectivelyBlocked(node) && node !== treeRoot) {
            return [];
        }

        if (node.type === "file") {
            if (node.state === 'checked') {
                const nameParts = node.name.split(".");
                const ext = nameParts.length > 1 ? nameParts.pop().toLowerCase() : "";
                if (TEXT_EXTENSIONS_WHITELIST.includes(ext) || ext === "") {
                    selectedNodes.push(node);
                } else {
                    logWithTimestamp(`EnhancedExplorer[Webview]: Skipping non-text file: ${node.name} (ext: ${ext})`);
                }
            } else {
                // logWithTimestamp(`EnhancedExplorer[Webview]: File ${node.name} not checked, skipping.`);
            }
        } else if (node.type === "folder") {
            if (Array.isArray(node.children)) {
                 node.children.forEach(child => {
                    selectedNodes = selectedNodes.concat(getSelectedFileNodes(child));
                });
            }
        }
        return selectedNodes;
    }


    // --- Initialization and Event Listeners ---
    function initializeWebview() {
        logWithTimestamp("EnhancedExplorer[Webview]: Initializing DOM elements and event listeners.");
        fileTreeContainer = document.getElementById('fileTree');
        outputText = document.getElementById('outputText');
        charCountEl = document.getElementById('charCount');
        tokenCountEl = document.getElementById('tokenCount');
        generateBtn = document.getElementById('generateText');
        copyBtn = document.getElementById('copyOutput');
        reloadExplorerBtn = document.getElementById('reloadExplorerBtn');
        settingsBtn = document.getElementById('settingsBtn');
        backButton = document.getElementById('backButton');
        mainView = document.getElementById('mainView');
        settingsView = document.getElementById('settingsView');

        textExtensionsWhitelistInput = document.getElementById('textExtensionsWhitelist');
        blacklistNamesInput = document.getElementById('blacklistNames');
        maxFolderItemsDisplayInput = document.getElementById('maxFolderItemsDisplay');
        readRetryCountInput = document.getElementById('readRetryCount');
        readRetryDelayInput = document.getElementById('readRetryDelay');
        enableTokenCountingInput = document.getElementById('enableTokenCounting');
        saveSettingsBtn = document.getElementById('saveSettingsBtn');
        resetSettingsBtn = document.getElementById('resetSettingsBtn');

        let allElementsPresent = true;
        const requiredElements = {
            fileTreeContainer, outputText, charCountEl, generateBtn, copyBtn, reloadExplorerBtn,
            settingsBtn, backButton, mainView, settingsView,
            textExtensionsWhitelistInput, blacklistNamesInput, maxFolderItemsDisplayInput,
            readRetryCountInput, readRetryDelayInput, saveSettingsBtn, resetSettingsBtn
        };
        for (const elName in requiredElements) {
            if (!requiredElements[elName]) {
                logWithTimestamp(`EnhancedExplorer[Webview]: Critical DOM element '${elName}' not found! The extension may not function correctly.`);
                allElementsPresent = false;
            } else {
                // logWithTimestamp(`EnhancedExplorer[Webview]: DOM element '${elName}' found.`);
            }
        }

        if (!allElementsPresent) {
            if (fileTreeContainer) fileTreeContainer.innerHTML = "<p class='error-message'>Error: Essential UI elements are missing. The extension cannot function.</p>";
            return; // Stop initialization if critical elements are missing
        }
        
        // Add delegated listeners to the tree container
        fileTreeContainer.addEventListener('click', handleTreeClickDelegated);
        fileTreeContainer.addEventListener('change', handleTreeChangeDelegated);
        logWithTimestamp("EnhancedExplorer[Webview]: Delegated event listeners for tree container attached.");

        if (reloadExplorerBtn) {
            reloadExplorerBtn.innerHTML = ICONS.reload;
            reloadExplorerBtn.addEventListener('click', () => {
                logWithTimestamp("EnhancedExplorer[Webview]: Reload explorer button clicked. Requesting workspace reload from extension.");
                vscode.postMessage({ type: 'reloadWorkspace' });
            });
        }

        if (settingsBtn) {
            settingsBtn.innerHTML = ICONS.settings;
            settingsBtn.addEventListener('click', () => {
                logWithTimestamp("EnhancedExplorer[Webview]: Settings button clicked.");
                mainView.style.display = 'none';
                settingsView.style.display = 'block';
                populateSettingsForm(); // Populate form with current settings
                saveTreeRootToWebviewState();
            });
        }

        if (backButton) {
            backButton.innerHTML = ICONS.arrowBack;
            backButton.addEventListener('click', () => {
                logWithTimestamp("EnhancedExplorer[Webview]: Back button clicked.");
                settingsView.style.display = 'none';
                mainView.style.display = 'block';
                saveTreeRootToWebviewState();
            });
        }
        
        // Initial settings load (from extension via initialData)
        if (window.initialData && window.initialData.settings) {
            updateSettingsAndUI(window.initialData.settings);
            logWithTimestamp("EnhancedExplorer[Webview]: Initial settings loaded from extension:" + JSON.stringify(currentSettings));
        } else {
            logWithTimestamp("EnhancedExplorer[Webview]: No initial settings found in window.initialData. Requesting settings from extension.");
            vscode.postMessage({ type: 'getSettings' }); // Request settings if not provided on load
        }

        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', saveSettings);
            logWithTimestamp("EnhancedExplorer[Webview]: Save Settings button listener attached.");
        }

        if (resetSettingsBtn) {
            resetSettingsBtn.addEventListener('click', resetSettings);
            logWithTimestamp("EnhancedExplorer[Webview]: Reset Settings button listener attached.");
        }

        if (!generateBtn) { logWithTimestamp("EnhancedExplorer[Webview]: generateText button not found!"); return; }
        generateBtn.addEventListener("click", async () => {
            logWithTimestamp("EnhancedExplorer[Webview]: Generate Text button clicked. Starting output generation process.");
            if (!treeRoot || !Array.isArray(treeRoot.children) || treeRoot.children.length === 0) {
                alert("The explorer is empty or has not loaded yet.");
                logWithTimestamp("EnhancedExplorer[Webview]: Generate text aborted - treeRoot empty or invalid.");
                return;
            }
            generateBtn.disabled = true;
            generateBtn.textContent = "Generating...";
            outputText.value = "Generating folder diagram and file list...";
            charCountEl.textContent = "Calculating...";
            await new Promise(resolve => setTimeout(resolve, 10)); // Allow UI to update

            try {
                // Leer el estado del checkbox ANTES de empezar a procesar
                const includeLineNumbers = document.getElementById('includeLineNumbers').checked;

                logWithTimestamp("EnhancedExplorer[Webview]: Generating folder diagram.");
                const folderDiagram = generateFolderDiagram(treeRoot);
                logWithTimestamp("EnhancedExplorer[Webview]: Identifying selected file nodes.");
                const selectedFileNodes = getSelectedFileNodes(treeRoot);
                logWithTimestamp(`EnhancedExplorer[Webview]: Found ${selectedFileNodes.length} selected file nodes.`);
                
                let filesContent = `\n# Files\n`;
                if (selectedFileNodes.length === 0) {
                    filesContent += "No files selected or selected files are empty/filtered.\n";
                    logWithTimestamp("EnhancedExplorer[Webview]: No files selected for content generation.");
                }

                const workspaceRootAbsolutePath = treeRoot.path;
                const workspaceRootName = treeRoot.name;

                const filesToReadPromises = selectedFileNodes.map(async (node) => {
                    const absoluteNodePath = node.path;
                    logWithTimestamp(`EnhancedExplorer[Webview]: Preparing to read file: ${absoluteNodePath}`);
                    
                    let pathRelativeToWorkspaceRoot = absoluteNodePath;
                    if (absoluteNodePath.startsWith(workspaceRootAbsolutePath)) {
                        pathRelativeToWorkspaceRoot = absoluteNodePath.substring(workspaceRootAbsolutePath.length);
                        if (pathRelativeToWorkspaceRoot.startsWith('/') || pathRelativeToWorkspaceRoot.startsWith('\\')) {
                            pathRelativeToWorkspaceRoot = pathRelativeToWorkspaceRoot.substring(1);
                        }
                    }
                    pathRelativeToWorkspaceRoot = pathRelativeToWorkspaceRoot.replace(/\\/g, '/');
                    const finalDisplayPath = `${workspaceRootName}/${pathRelativeToWorkspaceRoot}`;

                    const nameParts = node.name.split(".");
                    const ext = nameParts.length > 1 ? nameParts.pop().toLowerCase() : "";
                    let fileContentString = "", errorMsg = null;

                    for (let attempt = 1; attempt <= READ_RETRY_COUNT + 1; attempt++) {
                        logWithTimestamp(`EnhancedExplorer[Webview]: Attempt ${attempt} to read file: ${absoluteNodePath}`);
                        try {
                            // Pasar el estado del checkbox a la función
                            fileContentString = await readFileContentVSCode(absoluteNodePath, includeLineNumbers);
                            errorMsg = null;
                            logWithTimestamp(`EnhancedExplorer[Webview]: Content successfully received for: ${absoluteNodePath}`);
                            break;
                        } catch (error) {
                            logWithTimestamp(`EnhancedExplorer[Webview]: Error reading file ${absoluteNodePath} (Attempt ${attempt}): ${error}`);
                            errorMsg = `(Error reading: ${error.message || 'Unknown error'})`;
                            if (attempt <= READ_RETRY_COUNT) {
                                logWithTimestamp(`EnhancedExplorer[Webview]: Retrying read in ${READ_RETRY_DELAY}ms...`);
                                await new Promise(r => setTimeout(r, READ_RETRY_DELAY));
                            }
                        }
                    }

                    if (errorMsg) {
                        return `content "${finalDisplayPath}" ${errorMsg}\n\n`;
                    } else {
                        // Check if the content is already formatted as "content "path"" (e.g., for PDF/DOCX).
                        // This format indicates it's a binary file (PDF/DOCX) processed by the backend.
                        if (fileContentString.startsWith('content "')) {
                            // For PDF/DOCX, the backend already provides the desired format:
                            // content "filename"
                            // [raw text with internal page numbering, but no external line numbering or "nl -ba"]
                            // We return this content directly without further wrapping.
                            // The backend ensures it starts with 'content "filename.pdf"' and includes internal page numbering.
                            return `${fileContentString}\n`; // Add an extra newline for proper separation in the output
                        } else {
                            // Formato condicional basado en el checkbox
                            const fileType = ext; // Use the actual extension for syntax highlighting in the markdown block.
                            if (includeLineNumbers) {
                                // Con números de línea, usa "nl -ba"
                                return `nl -ba "${finalDisplayPath}"\n\`\`\`${fileType}\n${fileContentString}\n\`\`\`\n\n`;
                            } else {
                                // Sin números de línea, solo la ruta
                                return `"${finalDisplayPath}"\n\`\`\`${fileType}\n${fileContentString}\n\`\`\`\n\n`;
                            }
                        }
                    }
                });

                const results = await Promise.all(filesToReadPromises);
                filesContent += results.join('');
                
                const fullOutput = folderDiagram + filesContent;
                outputText.value = fullOutput;
                charCountEl.textContent = "Caracteres: " + fullOutput.length;

                if (ENABLE_TOKEN_COUNTING) {
                    tokenCountEl.style.display = 'block';
                    tokenCountEl.textContent = "Est. tokens: Calculando...";
                    vscode.postMessage({ type: 'getTokenCount', text: fullOutput });
                } else {
                    tokenCountEl.style.display = 'none';
                }

                saveStateToLocalStorageGlobally(treeRoot); // Save state after successful generation
                logWithTimestamp("EnhancedExplorer[Webview]: Output generation completed successfully.");
            } catch (error) {
                logWithTimestamp("EnhancedExplorer[Webview]: General error during text generation: " + error);
                outputText.value += `\n\n--- ERROR GENERAL: ${error.message || error} ---`;
                alert(`Error durante la generación: ${error.message || error}`);
            } finally {
                generateBtn.disabled = false;
                generateBtn.textContent = "A TEXTO";
                logWithTimestamp("EnhancedExplorer[Webview]: Operación de generación de texto finalizada.");
            }
        });

        if (!copyBtn) { logWithTimestamp("EnhancedExplorer[Webview]: copyOutput button not found!"); return; }
        copyBtn.addEventListener("click", () => {
            logWithTimestamp("EnhancedExplorer[Webview]: Copy button clicked.");
            const text = outputText.value;
            if (!text || text.startsWith("Generating")) {
                alert("No valid output to copy.");
                logWithTimestamp("EnhancedExplorer[Webview]: No valid output to copy.");
                return;
            }
            navigator.clipboard.writeText(text).then(() => {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = "Copied!";
                copyBtn.disabled = true;
                logWithTimestamp("EnhancedExplorer[Webview]: Output copied to clipboard.");
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                    copyBtn.disabled = false;
                }, 1500);
            }).catch(err => {
                logWithTimestamp("EnhancedExplorer[Webview]: Error copying to clipboard: " + err);
                alert("Error copying: " + err.message);
            });
        });
        logWithTimestamp("EnhancedExplorer[Webview]: Event listeners for buttons attached.");
    }

    function updateSettingsAndUI(newSettings) {
        currentSettings = newSettings;
        TEXT_EXTENSIONS_WHITELIST = currentSettings.textExtensionsWhitelist.split(',').map(s => s.trim()).filter(s => s.length > 0);
        BLACKLIST_NAMES = currentSettings.blacklistNames.split(',').map(s => s.trim()).filter(s => s.length > 0);
        MAX_FOLDER_ITEMS_DISPLAY = currentSettings.maxFolderItemsDisplay;
        READ_RETRY_COUNT = currentSettings.readRetryCount;
        READ_RETRY_DELAY = currentSettings.readRetryDelay;
        ENABLE_TOKEN_COUNTING = currentSettings.enableTokenCounting;

        populateSettingsForm();
        logWithTimestamp("EnhancedExplorer[Webview]: Settings updated and UI populated.");
    }

    function populateSettingsForm() {
        if (textExtensionsWhitelistInput) textExtensionsWhitelistInput.value = currentSettings.textExtensionsWhitelist;
        if (blacklistNamesInput) blacklistNamesInput.value = currentSettings.blacklistNames;
        if (maxFolderItemsDisplayInput) maxFolderItemsDisplayInput.value = currentSettings.maxFolderItemsDisplay;
        if (readRetryCountInput) readRetryCountInput.value = currentSettings.readRetryCount;
        if (readRetryDelayInput) readRetryDelayInput.value = currentSettings.readRetryDelay;
        if (enableTokenCountingInput) enableTokenCountingInput.checked = currentSettings.enableTokenCounting;
        logWithTimestamp("EnhancedExplorer[Webview]: Settings form populated with current settings.");
    }

    function saveSettings() {
        const newSettings = {
            textExtensionsWhitelist: textExtensionsWhitelistInput.value,
            blacklistNames: blacklistNamesInput.value,
            maxFolderItemsDisplay: parseInt(maxFolderItemsDisplayInput.value, 10),
            readRetryCount: parseInt(readRetryCountInput.value, 10),
            readRetryDelay: parseInt(readRetryDelayInput.value, 10),
            enableTokenCounting: enableTokenCountingInput.checked
        };
        vscode.postMessage({ type: 'saveSettings', settings: newSettings });
        logWithTimestamp("EnhancedExplorer[Webview]: Sent 'saveSettings' message to extension.");
    }

    function resetSettings() {
        // Request current settings from extension to get default values
        vscode.postMessage({ type: 'getSettings' });
        logWithTimestamp("EnhancedExplorer[Webview]: Sent 'getSettings' message to extension to reset form.");
    }

    // --- Initial setup ---
    // Restore state and initialize UI immediately
    if (previousState && previousState.treeRootData) {
        logWithTimestamp("EnhancedExplorer[Webview]: Found tree data in previous state. Initializing tree from saved state.");
        treeRoot = transformToTreeNodes(previousState.treeRootData);
    } else {
        logWithTimestamp("EnhancedExplorer[Webview]: No tree data in previous state. Waiting for 'initTree' message.");
    }
    
    // The DOM is ready when this script runs in a webview.
    initializeWebview();
    
    // Render what we have so far (either the restored tree or the "loading" message)
    renderView();

    // If there was no previous state, request a fresh tree from the extension.
    // Otherwise, we rely on the restored state and don't trigger an automatic reload.
    if (!previousState || !previousState.treeRootData) {
        logWithTimestamp("EnhancedExplorer[Webview]: No previous state found. Requesting initial workspace tree.");
        vscode.postMessage({ type: 'reloadWorkspace' });
    } else {
        logWithTimestamp("EnhancedExplorer[Webview]: Successfully restored tree from previous state. Skipping initial reload.");
    }


    window.addEventListener('message', event => {
        const message = event.data;
        logWithTimestamp("EnhancedExplorer[Webview]: Received message from extension:" + JSON.stringify(message));

        switch (message.type) {
            case 'initTree':
                logWithTimestamp("EnhancedExplorer[Webview]: Processing 'initTree' message. Root data received.");
                if (message.root) {
                    treeRoot = transformToTreeNodes(message.root);
                    // BLACKLIST_NAMES is now managed exclusively by the 'currentSettings' message.
                    logWithTimestamp("EnhancedExplorer[Webview]: Tree transformed. Root name: " + (treeRoot ? treeRoot.name : "null"));
                    if (loadStateFromLocalStorage(treeRoot)) {
                        logWithTimestamp("EnhancedExplorer[Webview]: State loaded from localStorage.");
                    }
                    renderView();
                    
                    // After rendering, if the root is expanded and idle, trigger the initial load.
                    if (treeRoot.isExpanded && treeRoot.loadState === 'idle') {
                        logWithTimestamp("EnhancedExplorer[Webview]: Root is expanded and idle on init. Fetching children.");
                        treeRoot.loadState = 'loading';
                        applyStateToUI(treeRoot);
                        vscode.postMessage({ type: 'fetchChildren', path: treeRoot.path });
                    }
                    saveTreeRootToWebviewState();
                } else {
                    logWithTimestamp("EnhancedExplorer[Webview]: Error: No root data in 'initTree' message. Message error: " + message.error);
                 if(fileTreeContainer) fileTreeContainer.innerHTML = `<p class="error-message">Error loading tree: ${message.error || "No explorer data received."}</p>`;
                }
                break;
            case 'viewBecameHidden':
                logWithTimestamp("EnhancedExplorer[Webview]: Event 'viewBecameHidden' received. Saving current tree state.");
                saveTreeRootToWebviewState();
                break;
            case 'childrenChunkLoaded':
                {
                    logWithTimestamp(`EnhancedExplorer[Webview]: Received 'childrenChunkLoaded' for parent: ${message.parentPath}.`);
                    const parentNode = findNodeByPath(treeRoot, message.parentPath);
                    if (parentNode && parentNode.ulEl) {
                        // Deduplicate by path to avoid duplicates when chunks overlap
                        const existingPaths = new Set((parentNode.children || []).map(c => c.path));
                        const newNodes = message.children
                            .filter(childData => !existingPaths.has(childData.path))
                            .map(childData => {
                                const newNode = transformToTreeNodes(childData, parentNode);
                                newNode.state = parentNode.state === 'indeterminate' ? 'unchecked' : parentNode.state;
                                newNode.showInOutput = parentNode.showInOutput;
                                return newNode;
                            });
                        parentNode.children.push(...newNodes);

                        // Append new nodes to the DOM
                        const fragment = document.createDocumentFragment();
                        newNodes.forEach(child => _renderTree(child, fragment));
                        parentNode.ulEl.appendChild(fragment);

                    } else {
                        logWithTimestamp(`EnhancedExplorer[Webview]: Parent node or its UL element not found for path: ${message.parentPath}`);
                    }
                }
                break;
            case 'childrenLoadFinished':
                {
                    logWithTimestamp(`EnhancedExplorer[Webview]: Received 'childrenLoadFinished' for parent: ${message.parentPath}.`);
                    const parentNode = findNodeByPath(treeRoot, message.parentPath);
                    if (parentNode) {
                        parentNode.loadState = 'loaded'; // Set state to loaded
                        sortChildrenRecursive(parentNode);
                        
                        // Atomically re-render children to ensure correct order and no duplicates
                        if (parentNode.ulEl) {
                           parentNode.ulEl.innerHTML = ''; // Clear previous content (chunks)
                           parentNode.children.forEach(child => _renderTree(child, parentNode.ulEl));
                        }

                        applyStateToUI(parentNode); // Update toggle icon from '...' to chevron
                        saveTreeRootToWebviewState();
                    }
                }
                break;
            case 'childrenLoadError':
                 {
                    logWithTimestamp(`EnhancedExplorer[Webview]: Received 'childrenLoadError' for parent: ${message.parentPath}. Error: ${message.error}`);
                    const parentNode = findNodeByPath(treeRoot, message.parentPath);
                    if (parentNode) {
                        parentNode.loadState = 'idle'; // Reset to idle to allow retry on next click
                        applyStateToUI(parentNode); // Update UI (e.g., remove loading indicator)
                        if(parentNode.ulEl) {
                            const errorLi = document.createElement('li');
                            errorLi.className = 'error-message';
                            errorLi.textContent = `Error: ${message.error}`;
                            parentNode.ulEl.appendChild(errorLi);
                        }
                    }
                }
                break;
            case 'fileContent':
                handleFileContentResponse(message.path, message.content, message.requestId);
                break;
            case 'fileError':
                handleFileErrorResponse(message.path, message.error, message.requestId);
                break;
            case 'currentSettings':
                logWithTimestamp("EnhancedExplorer[Webview]: Received 'currentSettings' message from extension:" + JSON.stringify(message.settings));
                currentSettings = message.settings;
                populateSettingsForm(); // Update the form fields with the received settings
                // Update the global variables used for logic
                TEXT_EXTENSIONS_WHITELIST = currentSettings.textExtensionsWhitelist.split(',').map(s => s.trim()).filter(s => s.length > 0);
                BLACKLIST_NAMES = currentSettings.blacklistNames.split(',').map(s => s.trim()).filter(s => s.length > 0);
                MAX_FOLDER_ITEMS_DISPLAY = currentSettings.maxFolderItemsDisplay;
                READ_RETRY_COUNT = currentSettings.readRetryCount;
                READ_RETRY_DELAY = currentSettings.readRetryDelay;
                ENABLE_TOKEN_COUNTING = currentSettings.enableTokenCounting;
                // Update token count display visibility
                if (tokenCountEl) {
                    tokenCountEl.style.display = ENABLE_TOKEN_COUNTING ? 'block' : 'none';
                }
                break;
            case 'tokenCountResult':
                if (tokenCountEl && message.count !== undefined) {
                    tokenCountEl.textContent = `Est. tokens: ${message.count}`;
                    if (message.error) {
                        logWithTimestamp(`EnhancedExplorer[Webview]: Token counting error: ${message.error}`);
                        tokenCountEl.textContent += ` (Error: ${message.error})`;
                    }
                }
                break;
            case 'error':
                 logWithTimestamp("EnhancedExplorer[Webview]: Received general error from extension:" + message.message);
                 if(outputText) outputText.value = `ERROR FROM EXTENSION: ${message.message}`;
                 break;
            case 'viewBecameVisible':
                logWithTimestamp("EnhancedExplorer[Webview]: Event 'viewBecameVisible' received.");
                if (treeRoot) {
                    logWithTimestamp("EnhancedExplorer[Webview]: treeRoot exists. Re-rendering and checking for unloaded children in expanded folders.");
                    renderView(); // Re-render the entire tree to ensure DOM is in sync

                    // After rendering, find any expanded folders that haven't loaded their children yet
                    function findAndLoadIdleNodes(node) {
                        if (!node) return;
                        if (node.type === 'folder' && node.isExpanded && node.loadState === 'idle') {
                            logWithTimestamp(`EnhancedExplorer[Webview]: Found expanded but idle node on visibility change: ${node.name}. Fetching children.`);
                            node.loadState = 'loading';
                            node.children = []; // Clear to prevent duplicates
                            if (node.ulEl) node.ulEl.innerHTML = '';
                            applyStateToUI(node);
                            vscode.postMessage({ type: 'fetchChildren', path: node.path });
                        }
                        if (node.children) {
                            node.children.forEach(findAndLoadIdleNodes);
                        }
                    }
                    findAndLoadIdleNodes(treeRoot);

                } else {
                    logWithTimestamp("EnhancedExplorer[Webview]: treeRoot is null when view became visible. Requesting tree data.");
                    vscode.postMessage({ type: 'requestTreeData' });
                    if(fileTreeContainer) fileTreeContainer.innerHTML = "<p>Recargando datos del explorador...</p>";
                }
                break;
            default:
                logWithTimestamp("EnhancedExplorer[Webview]: Received unknown message type:" + message.type + "Message:" + JSON.stringify(message));
        }
    });
    function renderView() {
        logWithTimestamp("EnhancedExplorer[Webview]: renderView() called. Starting tree rendering process.");
        if (!fileTreeContainer) {
            logWithTimestamp("EnhancedExplorer[Webview]: fileTreeContainer not found in renderView. Aborting rendering.");
            return;
        }

        if (!treeRoot) {
            logWithTimestamp("EnhancedExplorer[Webview]: treeRoot is null in renderView. Displaying wait message.");
            fileTreeContainer.innerHTML = "<p>Cargando explorador…</p>";
            return;
        }
        logWithTimestamp("EnhancedExplorer[Webview]: Clearing existing fileTreeContainer content.");
        fileTreeContainer.innerHTML = ""; 
        const fragment = document.createDocumentFragment();

        if (treeRoot) {
            logWithTimestamp("EnhancedExplorer[Webview]: Rendering treeRoot node:" + treeRoot.name);
            const ulRootElement = document.createElement("ul");
            _renderTree(treeRoot, ulRootElement);
            fragment.appendChild(ulRootElement);
        } else {
            logWithTimestamp("EnhancedExplorer[Webview]: treeRoot is null. Displaying generic wait/error message.");
            const p = document.createElement("p");
            p.textContent = "Waiting for explorer data or explorer is empty.";
            fragment.appendChild(p);
        }
        fileTreeContainer.appendChild(fragment);
        logWithTimestamp("EnhancedExplorer[Webview]: Tree view (or message) appended to fileTreeContainer via document fragment.");
        
        logWithTimestamp("EnhancedExplorer[Webview]: Calling setupNodeLinks to establish parent-child references.");
        setupNodeLinks(treeRoot);
        logWithTimestamp("EnhancedExplorer[Webview]: Calling applyStateToUI to apply initial/restored UI states.");
        applyStateToUI(treeRoot); 
        if (treeRoot.children) { 
            logWithTimestamp("EnhancedExplorer[Webview]: Calling updateParentState for root children to ensure correct checkbox states.");
            treeRoot.children.forEach(child => {
                if (child.parent) updateParentState(child.parent);
                else logWithTimestamp("EnhancedExplorer[Webview]: Child node has no parent during initial updateParentState, this should not happen for non-root nodes:" + child.name);
            });
        }
        logWithTimestamp("EnhancedExplorer[Webview]: renderView() finished.");
    }

    // --- Delegated Event Handlers ---
    function handleTreeClickDelegated(event) {
        const target = event.target;
        const liElement = target.closest('li');
        if (!liElement || !liElement.treeNode) {
            // logWithTimestamp("EnhancedExplorer[Webview]: Click not on a tree node LI element.");
            return;
        }

        const node = liElement.treeNode;
        const toggleIcon = target.closest('.toggle');
        const eyeIcon = target.closest('.eye-toggle');
        const label = target.closest('.node-label');

        if (toggleIcon && node.type === 'folder') {
            // Log the action of expanding or collapsing a folder by sending a message to the extension host
            const action = node.isExpanded ? 'Collapsing' : 'Expanding';
            vscode.postMessage({
                type: 'logMessage',
                log: `EnhancedExplorer[Webview]: Folder toggle clicked: ${action} ${node.name}.`
            });
            
            node.isExpanded = !node.isExpanded;

            if (node.isExpanded && node.loadState === 'idle') {
                logWithTimestamp(`EnhancedExplorer[Webview]: Expanding idle node ${node.name}. Fetching children.`);
                node.loadState = 'loading';
                node.children = []; // Clear children to avoid duplicates before loading
                if (node.ulEl) node.ulEl.innerHTML = ''; // Clear placeholder/error content
                vscode.postMessage({ type: 'fetchChildren', path: node.path });
            } else {
                logWithTimestamp(`EnhancedExplorer[Webview]: Toggling visibility for ${node.name}. Is expanded: ${node.isExpanded}. Load state: ${node.loadState}.`);
            }
            
            applyStateToUI(node); // This handles the parent's visual state (toggle icon, hidden class on ulEl)
            saveTreeRootToWebviewState(); // Save the new state
        }
        
        else if (eyeIcon) {
            // Determine the target node for the action (either the clicked node or all selected nodes)
            const clickedNode = liElement.treeNode;
            const nodesToAffect = selectedNodes.includes(clickedNode) && selectedNodes.length > 1 ? selectedNodes : [clickedNode];

            const newVisibility = !clickedNode.showInOutput; // Determine target visibility based on clicked node

            logWithTimestamp(`EnhancedExplorer[Webview]: Eye icon clicked. Affecting ${nodesToAffect.length} node(s). New visibility: ${newVisibility}.`);

            nodesToAffect.forEach(node => {
                node.showInOutput = newVisibility;
                
                if (node.type === "folder") {
                    toggleDescendantsVisibilityUI(node, newVisibility);
                }
                
                applyStateToUI(node); // Apply change to the current node as well
            });
            saveTreeRootToWebviewState();
            logWithTimestamp(`EnhancedExplorer[Webview]: Eye icon change processed. States updated and saved.`);
        }

        else if (label) {
            logWithTimestamp(`EnhancedExplorer[Webview]: Node label clicked for: ${node.name}.`);
            const isSelected = selectedNodes.includes(node);

            if (event.ctrlKey || event.metaKey) { // Ctrl/Cmd + click: Toggle selection
                if (isSelected) {
                    selectedNodes = selectedNodes.filter(n => n !== node);
                    liElement.classList.remove('selected');
                    logWithTimestamp(`EnhancedExplorer[Webview]: Deselected node (Ctrl/Cmd+click): ${node.name}.`);
                } else {
                    selectedNodes.push(node);
                    liElement.classList.add('selected');
                    logWithTimestamp(`EnhancedExplorer[Webview]: Selected node (Ctrl/Cmd+click): ${node.name}.`);
                }
            } else if (event.shiftKey) { // Shift + click: Range selection
                if (selectedNodes.length > 0) {
                    const lastSelected = selectedNodes[selectedNodes.length - 1];
                    const allNodes = Array.from(fileTreeContainer.querySelectorAll('li')).map(li => li.treeNode);
                    const lastIndex = allNodes.indexOf(lastSelected);
                    const currentIndex = allNodes.indexOf(node);

                    const [start, end] = [Math.min(lastIndex, currentIndex), Math.max(lastIndex, currentIndex)];
                    
                    // Clear previous range selection
                    selectedNodes.forEach(n => {
                        if (n.liEl) n.liEl.classList.remove('selected');
                    });
                    selectedNodes = [];

                    for (let i = start; i <= end; i++) {
                        const nodeInRange = allNodes[i];
                        if (nodeInRange && !selectedNodes.includes(nodeInRange)) {
                            selectedNodes.push(nodeInRange);
                            if (nodeInRange.liEl) nodeInRange.liEl.classList.add('selected');
                        }
                    }
                    logWithTimestamp(`EnhancedExplorer[Webview]: Range selected from ${lastSelected.name} to ${node.name}.`);
                } else {
                    // If no nodes are selected, treat shift-click as a normal click
                    selectedNodes.push(node);
                    liElement.classList.add('selected');
                    logWithTimestamp(`EnhancedExplorer[Webview]: Selected single node: ${node.name}.`);
                }
            } else { // Normal click: Single selection
                selectedNodes.forEach(n => {
                    if (n.liEl) n.liEl.classList.remove('selected');
                });
                selectedNodes = [node];
                liElement.classList.add('selected');
                logWithTimestamp(`EnhancedExplorer[Webview]: Selected single node: ${node.name}.`);
            }
            saveTreeRootToWebviewState(); // Save the new selection state (though selection itself isn't persisted, the underlying node state might be affected by future actions)
        }
    }

    function handleTreeChangeDelegated(event) {
        const target = event.target;
        if (target.type === 'checkbox' && target.classList.contains('checkbox')) {
            const liElement = target.closest('li');
            if (!liElement || !liElement.treeNode) return;

            // Determine the target node for the action (either the clicked node or all selected nodes)
            const clickedNode = liElement.treeNode;
            const nodesToAffect = selectedNodes.includes(clickedNode) && selectedNodes.length > 1 ? selectedNodes : [clickedNode];

            const newState = target.checked ? 'checked' : 'unchecked';
            logWithTimestamp(`EnhancedExplorer[Webview]: Checkbox changed. Affecting ${nodesToAffect.length} node(s). New state: ${newState}.`);

            const parentsToUpdate = new Set();

            nodesToAffect.forEach(node => {
                node.state = newState;
                if (node.checkboxEl) {
                    node.checkboxEl.checked = (newState === 'checked');
                    node.checkboxEl.indeterminate = false;
                }

                if (node.type === "folder") {
                    updateChildrenState(node, newState); // Update children's data and UI
                }
                if (node.parent) {
                    parentsToUpdate.add(node.parent);
                }
            });

            // Update parents only once to avoid redundant computations
            parentsToUpdate.forEach(parent => updateParentState(parent));
            
            saveTreeRootToWebviewState();
            logWithTimestamp(`EnhancedExplorer[Webview]: Checkbox change processed. States updated and saved.`);
        }
    }

    // --- END Delegated Event Handlers ---

    function findNodeByPath(node, path) {
        if (!node) return null;
        if (node.path === path) return node;
        if (node.children && node.children.length > 0) {
            for (const child of node.children) {
                const found = findNodeByPath(child, path);
                if (found) return found;
            }
        }
        return null;
    }
})();
