import * as vscode from 'vscode';
import { registerCommands } from './commands/commands';
import { DiagnosticsManager } from './diagnostics/diagnosticsManager';
import I18n, { setupI18n } from './I18n';
import { VariablePanelManager } from './ui/panels/variablePanel';
import { FileWatcher } from './watchers/fileWatcher';

let diagnosticsManager: DiagnosticsManager;
let fileWatcher: FileWatcher;

export function activate(context: vscode.ExtensionContext) {
	setupI18n(context);

	diagnosticsManager = new DiagnosticsManager();
	fileWatcher = new FileWatcher(diagnosticsManager);
	const variablePanelManager = new VariablePanelManager(context, fileWatcher);

	registerCommands(context, fileWatcher, variablePanelManager);

	context.subscriptions.push(
		vscode.workspace.onDidSaveTextDocument(document => {
			if (document.languageId === 'html') {
				vscode.window.showInformationMessage(I18n.__('analyzer.analyzingDocument'));
				const result = fileWatcher.analyzeDocument(document);

				if (result) {
					vscode.window.showInformationMessage(I18n.__('analyzer.analysisComplete'));
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
