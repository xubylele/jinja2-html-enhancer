import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { DiagnosticsManager } from './diagnosticsManager';
import { FileWatcher } from './fileWatcher';
import { getMessage } from './messageHandler';
import { VariablePanelManager } from './variablePanel';

let diagnosticsManager: DiagnosticsManager;
let fileWatcher: FileWatcher;

export function activate(context: vscode.ExtensionContext) {
	diagnosticsManager = new DiagnosticsManager();
	const variablePanelManager = new VariablePanelManager(context);
	fileWatcher = new FileWatcher(diagnosticsManager);

	registerCommands(context, fileWatcher, variablePanelManager);

	context.subscriptions.push(
		vscode.workspace.onDidSaveTextDocument(document => {
			if (document.languageId === 'html') {
				vscode.window.showInformationMessage(getMessage('analyzingDocument'));
				const result = fileWatcher.analyzeDocument(document);

				if (result) {
					vscode.window.showInformationMessage(getMessage('analysisComplete'));
				}
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
