import * as vscode from 'vscode';
import {
	registerOriginProvider,
	unregisterOriginProvider,
} from './api/originProviderRegistry';
import { QuickFixProvider } from './codeActions/quickFixProvider';
import { CommandManager } from './commands/commandManager';
import { CommentToggle } from './commands/commentToggle';
import { DiagnosticsManager } from './diagnostics/diagnosticsManager';
import I18n, { setupI18n } from './translations';
import { VariablePanelManager } from './ui/panels/variablePanel';
import { TemplatePreviewPanel } from './ui/panels/templatePreviewPanel';
import { maybePromptProUpsell } from './upsell/proUpsell';
import { FileWatcher } from './watchers/fileWatcher';

let diagnosticsManager: DiagnosticsManager;
let fileWatcher: FileWatcher;

export function activate(context: vscode.ExtensionContext) {
	setupI18n(context);

	diagnosticsManager = new DiagnosticsManager();
	fileWatcher = new FileWatcher(diagnosticsManager);
	const variablePanelManager = new VariablePanelManager(context, fileWatcher);
	const templatePreviewPanel = new TemplatePreviewPanel(context);

	const commandManager = new CommandManager(fileWatcher, variablePanelManager, templatePreviewPanel);
	const commentToggle = new CommentToggle();

	const checkVariablesDisposable = vscode.commands.registerCommand('extension.checkJinja2Variables', () => commandManager.checkVariables());
	const openPanelDisposable = vscode.commands.registerCommand('extension.openVariablePanel', () => commandManager.openVariablePanel());
	const saveVariableDisposable = vscode.commands.registerCommand('extension.saveVariable', (diagnosticMessage: string) => commandManager.saveVariable(diagnosticMessage));
	const toggleVariableCheck = vscode.commands.registerCommand('extension.toggleVariableCheck', () => commandManager.changeConfiguration('toggleVariableCheck'));
	const themeChangeDisposable = vscode.commands.registerCommand('extension.changeTheme', () => commandManager.changeTheme());
	const toggleCommentDisposable = vscode.commands.registerCommand('extension.toggleJinja2Comment', () => commentToggle.toggle());
	const openPreviewDisposable = vscode.commands.registerCommand('extension.openTemplatePreview', () => commandManager.openTemplatePreview());

	context.subscriptions.push(checkVariablesDisposable);
	context.subscriptions.push(openPanelDisposable);
	context.subscriptions.push(saveVariableDisposable);
	context.subscriptions.push(toggleVariableCheck);
	context.subscriptions.push(themeChangeDisposable);
	context.subscriptions.push(toggleCommentDisposable);
	context.subscriptions.push(openPreviewDisposable);
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider(
			{ scheme: 'file', language: 'html' },
			new QuickFixProvider(),
		)
	);

	// Public contribution API — sister extensions (Jinja2 Enhance Pro) inject
	// origin metadata into the Variable Panel. See src/types/originProvider.ts.
	context.subscriptions.push(
		vscode.commands.registerCommand(
			'jinja2-html-enhancer.registerOriginProvider',
			(reg: { id: string; provider: any }) => registerOriginProvider(reg),
		),
		vscode.commands.registerCommand(
			'jinja2-html-enhancer.unregisterOriginProvider',
			(reg: { id: string }) => unregisterOriginProvider(reg),
		),
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

	void maybePromptProUpsell(context);

	context.subscriptions.push(
		vscode.workspace.onDidSaveTextDocument(async document => {
			if (document.languageId === 'html' || document.languageId === 'jinja2') {
				const result = await fileWatcher.analyzeDocument(document);
				if (result) {
					vscode.window.showInformationMessage(I18n.__('analyzer.analysisComplete'));
				}
			}
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument(async document => {
			if (document.languageId === 'html' || document.languageId === 'jinja2') {
				await fileWatcher.analyzeDocument(document);
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
