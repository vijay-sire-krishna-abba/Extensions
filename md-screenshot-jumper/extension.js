const vscode = require("vscode");

let enabled = true;
let watcher;
let timers = new Map(); // debounce timers per file

function activate(context) {
  // Status bar toggle
  const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBar.text = "🖼️ Screenshot Jumper: ON";
  statusBar.command = "mdScreenshotJumper.toggle";
  statusBar.show();

  const toggleCommand = vscode.commands.registerCommand(
    "mdScreenshotJumper.toggle",
    () => {
      enabled = !enabled;
      statusBar.text = `🖼️ Screenshot Jumper: ${enabled ? "ON" : "OFF"}`;
      vscode.window.showInformationMessage(
        `Screenshot Jumper ${enabled ? "enabled" : "disabled"}`
      );
    }
  );

  // Watch markdown files
  watcher = vscode.workspace.createFileSystemWatcher("**/*.md");

  watcher.onDidChange(async (uri) => {
    if (!enabled) return;

    // debounce per file
    if (timers.has(uri.fsPath)) {
      clearTimeout(timers.get(uri.fsPath));
    }

    timers.set(
      uri.fsPath,
      setTimeout(async () => {
        try {
          // Only act if this file is already open
          const openEditor = vscode.window.visibleTextEditors.find(
            (ed) => ed.document.uri.fsPath === uri.fsPath
          );
          if (!openEditor) return;

          // Reload the updated file
          const freshDoc = await vscode.workspace.openTextDocument(uri);
          const editor = await vscode.window.showTextDocument(freshDoc, {
            preview: false,
            viewColumn: openEditor.viewColumn,
          });

          const text = freshDoc.getText();
          const regex = /!\[Screenshot\]\([^)]+\)/g;

          let match, lastMatch;
          while ((match = regex.exec(text)) !== null) {
            lastMatch = match;
          }

          if (lastMatch) {
            const pos = freshDoc.positionAt(lastMatch.index);

            // Move cursor
            editor.selection = new vscode.Selection(pos, pos);

            // Scroll so it's at the top
            editor.revealRange(
              new vscode.Range(pos, pos),
              vscode.TextEditorRevealType.AtTop
            );

            // Scroll Markdown preview to same line
            await vscode.commands.executeCommand(
              "markdown.preview.scrollEditorToLine",
              pos.line
            );
          }
        } catch (err) {
          console.error("md-screenshot-jumper error:", err);
        }
      }, 300) // wait 200ms after change
    );
  });

  context.subscriptions.push(toggleCommand, watcher, statusBar);
}

function deactivate() {
  if (watcher) watcher.dispose();
  for (const t of timers.values()) clearTimeout(t);
}

module.exports = { activate, deactivate };
