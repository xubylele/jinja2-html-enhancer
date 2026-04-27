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
	const toggleVariableCheck = vscode.commands.registerCommand('extension.toggleVariableCheck', () => commandManager.changeConfiguration('toggleVariableCheck'));
	const themeChangeDisposable = vscode.commands.registerCommand('extension.changeTheme', () => commandManager.changeTheme());

	context.subscriptions.push(checkVariablesDisposable);
	context.subscriptions.push(openPanelDisposable);
	context.subscriptions.push(saveVariableDisposable);
	context.subscriptions.push(toggleVariableCheck);
	context.subscriptions.push(themeChangeDisposable);
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider(
			{ scheme: 'file', language: 'html' },
			new QuickFixProvider(),
		)
	);

	const firstActivation = context.globalState.get<number>('jinja2.firstActivation');
	if (firstActivation === undefined) {
		context.globalState.update('jinja2.firstActivation', Date.now() - 8 * 24 * 60 * 60 * 1000);
		vscode.window.showInformationMessage(I18n.__('review.welcomeMessage'));
	} else if (!context.globalState.get<boolean>('jinja2.reviewRequested')) {
		const sevenDays = 7 * 24 * 60 * 60 * 1000;
		if (Date.now() - firstActivation >= sevenDays) {
			const leaveLabel = I18n.__('review.action.leave');
			const neverLabel = I18n.__('review.action.never');
			vscode.window.showInformationMessage(
				I18n.__('review.message'),
				leaveLabel,
				I18n.__('review.action.later'),
				neverLabel
			).then(selection => {
				if (selection === leaveLabel) {
					vscode.env.openExternal(vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=Xubylele.jinja2-html-enhancer'));
					vscode.env.openExternal(vscode.Uri.parse('https://open-vsx.org/extension/xubylele/jinja2-html-enhancer'));
					context.globalState.update('jinja2.reviewRequested', true);
				} else if (selection === neverLabel) {
					context.globalState.update('jinja2.reviewRequested', true);
				}
			});
		}
	}

	context.subscriptions.push(
		vscode.workspace.onDidSaveTextDocument(async document => {
			if (document.languageId === 'html') {
				vscode.window.showInformationMessage(I18n.__('analyzer.analyzingDocument'));
				const result = await fileWatcher.analyzeDocument(document);

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
