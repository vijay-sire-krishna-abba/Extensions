# MD Screenshot Jumper

This VS Code extension watches external changes to Markdown files and, when a watched file is already open in the editor, jumps to the **last** match of the regex:

```
!\[Screenshot\]\([^)]+\)
```

and centers it in the editor. It provides a status-bar toggle (ON/OFF).

## Usage (development)

1. Open this folder in VS Code.
2. Run the extension in the Extension Development Host (press F5).
3. Open a `.md` file in the Extension Host window.
4. Modify the file externally (e.g., append a `![Screenshot](img.png)` using a shell), the extension will jump to the last screenshot match.

## Packaging

To create a `.vsix` you can run `vsce package` locally (install `vsce` globally with `npm i -g vsce`) and then install the `.vsix` via "Extensions: Install from VSIX..."