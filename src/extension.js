"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
let diagnosticCollection;
function activate(context) {
    diagnosticCollection = vscode.languages.createDiagnosticCollection('jinja2');
    context.subscriptions.push(diagnosticCollection);
    let disposable = vscode.commands.registerCommand('extension.checkJinja2Variables', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            analyzeDocument(editor.document);
        }
    });
    context.subscriptions.push(disposable);
    let watcher = vscode.workspace.createFileSystemWatcher('**/*.jinja2.html');
    watcher.onDidChange(uri => analyzeDocument(uri));
    watcher.onDidCreate(uri => analyzeDocument(uri));
    context.subscriptions.push(watcher);
}
exports.activate = activate;
function analyzeDocument(document) {
    if (document instanceof vscode.Uri) {
        vscode.workspace.openTextDocument(document).then(analyzeDocument);
        return;
    }
    const text = document.getText();
    const variables = extractVariables(text);
    updateDiagnostics(document, variables);
}
function extractVariables(text) {
    const variableRegex = /\{\{\s*(\w+)\s*\}\}/g;
    const matches = text.matchAll(variableRegex);
    return [...new Set([...matches].map(match => match[1]))];
}
function updateDiagnostics(document, variables) {
    const diagnostics = [];
    variables.forEach(variable => {
        const regex = new RegExp(`\\{\\{\\s*(${variable})\\s*\\}\\}`, 'g');
        let match;
        while ((match = regex.exec(document.getText())) !== null) {
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            const range = new vscode.Range(startPos, endPos);
            const diagnostic = new vscode.Diagnostic(range, `Variable "${variable}" is used. Make sure it's defined.`, vscode.DiagnosticSeverity.Information);
            diagnostics.push(diagnostic);
        }
    });
    diagnosticCollection.set(document.uri, diagnostics);
}
function deactivate() {
    if (diagnosticCollection) {
        diagnosticCollection.clear();
        diagnosticCollection.dispose();
    }
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map