import * as vscode from 'vscode';
import I18n from '../translations';
import { darkDefaultTheme } from '../themes/darkDefaultTheme';
import { lightDefaultTheme } from '../themes/lightDefaultTheme';

type ThemeName = 'darkDefault' | 'lightDefault';
type Theme = {
  textMateRules: Array<{
    scope: string;
    settings: {
      foreground: string;
      fontStyle?: string;
    };
  }>;
};

const themes: Record<ThemeName, Theme> = {
  darkDefault: darkDefaultTheme,
  lightDefault: lightDefaultTheme,
};

export const chooseThemeSelector = () => {
  const themesSelection = [
    { label: I18n.__('theme.darkDefault'), value: 'darkDefault' },
    { label: I18n.__('theme.lightDefault'), value: 'lightDefault' },
    { label: I18n.__('theme.darkHighContrast'), value: 'darkHighContrast' },
    { label: I18n.__('theme.lightHighContrast'), value: 'lightHighContrast' },
    { label: I18n.__('theme.jinja2Colors'), value: 'jinja2Colors' },
    { label: I18n.__('theme.xubySelection'), value: 'xubySelection' }
  ];

  return vscode.window.showQuickPick(themesSelection, {
    placeHolder: I18n.__('theme.selectActionPlaceholder')
  }).then(async selection => {
    if (!selection) {
      return;
    }

    const themeName = selection.value;
    const jinja2Colors = themes[themeName as ThemeName];

    if (!jinja2Colors) {
      vscode.window.showErrorMessage(I18n.__('error.themeNotFound', { theme: themeName }));
      return;
    }

    const target = vscode.ConfigurationTarget.Global;
    const currentTheme = vscode.workspace.getConfiguration('workbench').get('editor.tokenColorCustomizations', {});

    const existingScopes = new Set(
      ((currentTheme as any)?.textMateRules || []).map((rule: any) => rule.scope)
    );

    const newRules = jinja2Colors.textMateRules.filter(
      rule => !existingScopes.has(rule.scope)
    );
    const merged = {
      ...currentTheme,
      textMateRules: [
        ...((Array.isArray((currentTheme as any)?.textMateRules) ? (currentTheme as any).textMateRules : [])),
        ...newRules
      ]
    };

    try {
      await vscode.workspace.getConfiguration().update('editor.tokenColorCustomizations', merged, target);
      vscode.window.showInformationMessage(I18n.__('theme.themeChanged', { theme: 'Jinja2' }));
      await vscode.commands.executeCommand('workbench.action.reloadWindow');
    } catch (error) {
      console.error('Error changing theme:', error);
      vscode.window.showErrorMessage(I18n.__('error.themeChangeFailed', { error: String(error) }));
    } finally {
      return;
    }
  });
};
