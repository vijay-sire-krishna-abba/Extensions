const vscode = require("vscode");
const path = require("path");

let enabled = true;
let watcher;

function activate(context) {
  // Status bar toggle
  const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBar.text = "📂 AutoOpen MD: ON";
  statusBar.command = "autoOpenMd.toggle";
  statusBar.show();

  const toggleCommand = vscode.commands.registerCommand(
    "autoOpenMd.toggle",
    () => {
      enabled = !enabled;
      statusBar.text = `📂 AutoOpen MD: ${enabled ? "ON" : "OFF"}`;
      vscode.window.showInformationMessage(
        `Auto-open Markdown ${enabled ? "enabled" : "disabled"}`
      );
    }
  );

  // Watch for new Markdown files
  watcher = vscode.workspace.createFileSystemWatcher("**/*.md");

  watcher.onDidCreate(async (uri) => {
    if (!enabled) return;

    try {
      const filePath = uri.fsPath;
      const baseName = path.basename(filePath, ".md"); // e.g. "050-050-iterating-lists"
      const parentName = path.basename(path.dirname(filePath)); // folder name

      // ✅ Only open if filename (without extension) matches folder name
      if (baseName === parentName) {
        // 1. Close all opened .md editors EXCEPT "titles.md"
        for (const group of vscode.window.tabGroups.all) {
          for (const tab of group.tabs) {
            if (
              tab.input &&
              tab.input.uri &&
              tab.input.uri.fsPath.endsWith(".md")
            ) {
              const name = path.basename(tab.input.uri.fsPath);
              if (name !== "titles.md") {
                await vscode.window.tabGroups.close(tab);
              }
            }
          }
        }

        // 2. Open the target file
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc, { preview: false });

        // 3. 🪄 Collapse folders in Explorer after opening
        await vscode.commands.executeCommand(
          "workbench.files.action.collapseExplorerFolders"
        );
      }
    } catch (err) {
      console.error("auto-open-md error:", err);
    }
  });

  context.subscriptions.push(toggleCommand, watcher, statusBar);
}

function deactivate() {
  if (watcher) watcher.dispose();
}

module.exports = { activate, deactivate };
