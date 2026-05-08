import * as vscode from 'vscode';

const FIRST_USE_KEY = 'jinja2.firstActivation';
const PROMPTED_KEY = 'jinja2.free.proUpsellPrompted';
const PRO_EXTENSION_ID = 'Xubylele.jinja2-html-enhancer-pro';
const PRO_URL = 'https://jinja2.xuby.cl/';
const TRIAL_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export async function maybePromptProUpsell(context: vscode.ExtensionContext): Promise<void> {
  if (vscode.extensions.getExtension(PRO_EXTENSION_ID)) {
    return;
  }
  if (context.globalState.get<boolean>(PROMPTED_KEY)) {
    return;
  }

  const firstUseAt = context.globalState.get<number>(FIRST_USE_KEY);
  if (firstUseAt === undefined) {
    return;
  }
  if (Date.now() - firstUseAt < TRIAL_PERIOD_MS) {
    return;
  }

  await context.globalState.update(PROMPTED_KEY, true);

  const choice = await vscode.window.showInformationMessage(
    'You\'ve been using Jinja2 HTML Enhancer for a month — nice. Upgrade to Pro for backend-aware variables, cross-file go-to-definition, and advanced linting.',
    'Install Pro',
    'Learn More',
    'Don\'t show again',
  );

  if (choice === 'Install Pro') {
    void vscode.commands.executeCommand('workbench.extensions.installExtension', PRO_EXTENSION_ID);
  } else if (choice === 'Learn More') {
    void vscode.env.openExternal(vscode.Uri.parse(PRO_URL));
  }
}
