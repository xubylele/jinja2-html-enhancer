import * as vscode from 'vscode';
import { DiagnosticsManager } from './diagnosticsManager';
import { FileWatcher } from './fileWatcher';
import { getMessage } from './messageHandler';
import { VariablePanelManager } from './variablePanel';

let diagnosticsManager: DiagnosticsManager;
let fileWatcher: FileWatcher;

export function activate(context: vscode.ExtensionContext) {
	diagnosticsManager = new DiagnosticsManager();
	const variablePanelManager = new VariablePanelManager(context);
	fileWatcher = new FileWatcher(diagnosticsManager, variablePanelManager);

	let disposable = vscode.commands.registerCommand('extension.checkJinja2Variables', () => {
		vscode.window.showInformationMessage(getMessage('checkingVariables'));
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const result = fileWatcher.analyzeDocument(editor.document);

			if (result) {
				variablePanelManager.show(result.usedVariables, result.setVariables);
			}
		} else {
			vscode.window.showWarningMessage(getMessage('noActiveEditor'));
		}
	});

	context.subscriptions.push(disposable);

	context.subscriptions.push(
		vscode.workspace.onDidSaveTextDocument(document => {
			if (document.languageId === 'html') {
				vscode.window.showInformationMessage(getMessage('analyzingDocument'));
				fileWatcher.analyzeDocument(document);
				vscode.window.showInformationMessage(getMessage('analysisComplete'));
			}
		})
	);
}

export function deactivate() {
	if (diagnosticsManager) {
		diagnosticsManager.clear();
		diagnosticsManager.dispose();
	}
	if (fileWatcher) {
		fileWatcher.dispose();
	}
}
