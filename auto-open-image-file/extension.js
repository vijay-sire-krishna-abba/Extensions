const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

let enabled = true;
let watchers = [];

function activate(context) {
  const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    99
  );
  statusBar.text = "🖼️ AutoOpen Images: ON";
  statusBar.command = "autoOpenImages.toggle";
  statusBar.show();

  const toggleCommand = vscode.commands.registerCommand(
    "autoOpenImages.toggle",
    () => {
      enabled = !enabled;
      statusBar.text = `🖼️ AutoOpen Images: ${enabled ? "ON" : "OFF"}`;
      vscode.window.showInformationMessage(
        `Auto-open Images ${enabled ? "enabled" : "disabled"}`
      );
    }
  );

  // Watch all workspace folders recursively
  vscode.workspace.workspaceFolders?.forEach((folder) => {
    const rootPath = folder.uri.fsPath;
    const watcher = fs.watch(
      rootPath,
      { recursive: true },
      async (eventType, filename) => {
        if (!enabled || !filename) return;

        const ext = path.extname(filename).toLowerCase();
        if (![".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"].includes(ext))
          return;

        const filePath = path.join(rootPath, filename);

        // Wait a moment to ensure file fully exists
        await new Promise((res) => setTimeout(res, 400));

        if (!fs.existsSync(filePath)) return;

        try {
          const fileUri = vscode.Uri.file(filePath);

          // 🪄 Open image with VS Code's default viewer (works with Luna Paint)
          await vscode.commands.executeCommand("vscode.open", fileUri);

          // 🧹 Close all other image tabs except the newly opened one
          for (const group of vscode.window.tabGroups.all) {
            for (const tab of group.tabs) {
              if (
                tab.input &&
                tab.input.uri &&
                /\.(png|jpe?g|gif|webp|bmp)$/i.test(tab.input.uri.fsPath) &&
                tab.input.uri.fsPath !== filePath
              ) {
                await vscode.window.tabGroups.close(tab);
              }
            }
          }

          // Optionally collapse Explorer folders
          await vscode.commands.executeCommand(
            "workbench.files.action.collapseExplorerFolders"
          );

          // run Luna commands 500ms after opening the image
          await new Promise((res) => setTimeout(res, 300));
          const commands = [
            "luna.tool.toggleToolsWindow",
            "luna.layer.toggleLayersWindow",
            "luna.history.toggleHistoryWindow",
            "luna.color.toggleColorsWindow",
          ];
          for (const cmd of commands) {
            try {
              await vscode.commands.executeCommand(cmd);
            } catch (cmdErr) {
              console.warn(`Failed to run command "${cmd}":`, cmdErr);
            }
          }

          // Optional feedback
          console.log("Opened new image:", filePath);
        } catch (err) {
          console.error("auto-open-images error:", err);
        }
      }
    );

    watchers.push(watcher);
  });

  context.subscriptions.push(toggleCommand, statusBar);
}

function deactivate() {
  for (const w of watchers) w.close();
  watchers = [];
}

module.exports = { activate, deactivate };
