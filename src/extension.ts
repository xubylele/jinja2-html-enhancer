import * as vscode from 'vscode';
import { QuickFixProvider } from './codeActions/quickFixProvider';
import { CommandManager } from './commands/commandManager';
import { DiagnosticsManager } from './diagnostics/diagnosticsManager';
import I18n, { setupI18n } from './translations';
import { VariablePanelManager } from './ui/panels/variablePanel';
import { FileWatcher } from './watchers/fileWatcher';

let diagnosticsManager: DiagnosticsManager;
let fileWatcher: FileWatcher;

export function activate(context: vscode.ExtensionContext) {
	setupI18n(context);

	diagnosticsManager = new DiagnosticsManager();
	fileWatcher = new FileWatcher(diagnosticsManager);
	const variablePanelManager = new VariablePanelManager(context, fileWatcher);

	const commandManager = new CommandManager(fileWatcher, variablePanelManager);

	const checkVariablesDisposable = vscode.commands.registerCommand('extension.checkJinja2Variables', () => commandManager.checkVariables());
	const openPanelDisposable = vscode.commands.registerCommand('extension.openVariablePanel', () => commandManager.openVariablePanel());
	const saveVariableDisposable = vscode.commands.registerCommand('extension.saveVariable', (diagnosticMessage: string) => commandManager.saveVariable(diagnosticMessage));


	context.subscriptions.push(checkVariablesDisposable);
	context.subscriptions.push(openPanelDisposable);
	context.subscriptions.push(saveVariableDisposable);
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider(
			{ scheme: 'file', language: 'html' },
			new QuickFixProvider(),
		)
	)

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
