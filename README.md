# Syntropic: Your Interactive AI Prompt Companion

<!-- [![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/your-publisher.syntropic?style=for-the-badge&label=Marketplace)](https://marketplace.visualstudio.com/items?itemName=your-publisher.syntropic) -->
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**The ultimate bridge between your codebase and Large Language Models (LLMs).** Syntropic revolutionizes how you build context for AI, allowing you to visually explore your project, select relevant files, and generate a perfectly formatted prompt in seconds.

Stop manually copying and pasting code. Start building smarter, more accurate prompts with Syntropic.

![Syntropic Logo](https://res.cloudinary.com/dywctapuj/image/upload/v1755210812/logo_mh0wqa.png)  

---

## ✨ Key Features

Syntropic is packed with features designed to streamline your AI-powered development workflow:

*   🌲 **Intuitive Tree Explorer:** Get a clean, hierarchical view of your current workspace right in the sidebar. Effortlessly navigate through your project's structure.

*   🎯 **Precision Prompt Control:** Don't just send everything. Interactively check the files and folders you want to include. Syntropic gives you granular control over the context you provide to the LLM.

*   📚 **Beyond Code: Full PDF Support:** Seamlessly include PDF documents in your prompt. Perfect for referencing technical documentation, academic papers, or project specifications alongside your code.

*   📄 **Universal File Compatibility:** If it's a plain text file, Syntropic can handle it. From source code in any language (`.js`, `.py`, `.rs`, `.go`) to configuration files (`.json`, `.yaml`, `.toml`) and markdown (`.md`), it's all ready to be included.

*   📊 **Real-time Token Counting:** Know your context size before you send it! Syntropic uses `tiktoken` to provide an accurate token count of your selected files, helping you manage costs and stay within the LLM's context window.

*   ✂️ **Smart Filtering & Blacklisting:** Automatically hide clutter like `node_modules`, `.git`, and build folders. Keep your explorer focused on what matters with a fully configurable blacklist.

*   🚀 **Instant Prompt Generation:** With a single click, Syntropic consolidates your selected file structure and contents into a clean, formatted prompt, ready to be copied and pasted into your favorite AI chat interface.

---

## 🚀 Getting Started

1.  **Install:** Open VS Code, go to the Extensions view (`Ctrl+Shift+X`), search for **"Syntropic"**, and click "Install".
2.  **Open:** Find the new Syntropic icon in your VS Code Activity Bar (the far-left sidebar) and click it.
3.  **Explore:** The Syntropic panel will open, showing your project's file tree.
4.  **Select:** Use the checkboxes to select the files and folders you want to include in your prompt.
5.  **Generate & Copy:** As you select files, the prompt is built in the bottom panel. Use the "Copy to Clipboard" button when you're ready!

---

## ⚙️ Customization

Tailor Syntropic to your exact needs via VS Code settings (`Ctrl+,` or `Cmd+,` and search for "Syntropic"):

| Setting                         | Description                                                                                          | Default Value                                                                                                 |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `syntropic.textExtensionsWhitelist` | Comma-separated list of file extensions to be treated as text. Add any custom extensions here.     | A comprehensive list of over 100 common extensions.                                                           |
| `syntropic.blacklistNames`          | Comma-separated list of file/folder names to exclude from the explorer view (e.g., `node_modules`).  | `.git`, `node_modules`, `dist`, `build`, etc.                                                                 |
| `syntropic.maxFolderItemsDisplay`   | The maximum number of files/folders to show inside a single directory to maintain performance.       | `50`                                                                                                          |
| `syntropic.enableTokenCounting`   | **Enable or disable token counting.** When enabled, a token count appears above the generated prompt. | `false`                                                                                                       |
| `syntropic.readRetryCount`        | Number of times to retry reading a file if it fails (e.g., due to file locks).                     | `1`                                                                                                           |
| `syntropic.readRetryDelay`        | Delay in milliseconds between file read retries.                                                     | `300`                                                                                                         |

---

## 🛣️ Roadmap & Contributing

Syntropic is currently in **Beta** and actively developing! Future plans include:

*   Direct integration with LLM APIs.
*   Support for multi-root workspaces.
*   Advanced prompt templating.

We welcome contributions! If you have an idea, find a bug, or want to improve the extension, please check out our [GitHub Repository](https://github.com/RoderickGrc/syntropic) and open an issue or pull request.

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for more details.

---

**Happy Prompting!**