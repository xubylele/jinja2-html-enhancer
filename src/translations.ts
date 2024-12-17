import * as i18n from 'i18n';
import * as vscode from 'vscode';

export function setupI18n(context: vscode.ExtensionContext) {
  const userLocale = vscode.env.language;

  i18n.configure({
    locales: ['en', 'es'],
    defaultLocale: 'en',
    directory: context.extensionPath + '/locales',
    objectNotation: true,
  });

  i18n.setLocale(userLocale);
}

export default i18n;
