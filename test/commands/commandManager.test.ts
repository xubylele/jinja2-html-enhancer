import * as vscode from 'vscode';
import { CommandManager } from '../../src/commands/commandManager';

jest.mock('../../src/translations', () => ({
  __esModule: true,
  default: {
    __: (key: string) => key,
  },
}));

jest.mock('../../src/theme/themeChoose', () => ({
  chooseThemeSelector: jest.fn(),
}));

const { chooseThemeSelector } = jest.requireMock('../../src/theme/themeChoose') as {
  chooseThemeSelector: jest.Mock;
};

describe('CommandManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    vscode.window.activeTextEditor = undefined as any;
  });

  it('warns when checking variables without an active editor', async () => {
    const manager = new CommandManager(
      { analyzeDocument: jest.fn() } as any,
      { show: jest.fn() } as any,
      { show: jest.fn() } as any
    );

    await manager.checkVariables();

    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('error.noActiveEditor');
  });

  it('opens variable panel after successful analysis', async () => {
    const analyzeDocument = jest.fn().mockResolvedValue({
      usedVariables: ['user'],
      setVariables: ['user'],
    });
    const show = jest.fn();
    const manager = new CommandManager(
      { analyzeDocument } as any,
      { show } as any,
      { show: jest.fn() } as any
    );
    vscode.window.activeTextEditor = {
      document: { uri: vscode.Uri.file('/tmp/template.html') },
    } as any;

    await manager.openVariablePanel();

    expect(analyzeDocument).toHaveBeenCalled();
    expect(show).toHaveBeenCalledWith(['user'], ['user']);
  });

  it('opens template preview with active editor', async () => {
    const manager = new CommandManager(
      { analyzeDocument: jest.fn() } as any,
      { show: jest.fn() } as any,
      { show: jest.fn() } as any
    );
    vscode.window.activeTextEditor = {
      document: {
        languageId: 'html',
        getText: () => '{{ name }}',
        uri: { fsPath: '/tmp/test.html' }
      }
    } as any;

    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue({})
    });

    await manager.openTemplatePreview();

    expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
  });

  it('toggles boolean configuration value', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue(false),
      update,
    });
    const manager = new CommandManager(
      { analyzeDocument: jest.fn() } as any,
      { show: jest.fn() } as any,
      { show: jest.fn() } as any
    );

    await manager.changeConfiguration('toggleVariableCheck');

    expect(update).toHaveBeenCalledWith('toggleVariableCheck', true);
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('configuration.configurationChanged');
  });

  it('saves variable to workspace customVariables and triggers re-check', async () => {
    const analyzeDocument = jest.fn().mockResolvedValue({ usedVariables: [], setVariables: [] });
    const manager = new CommandManager(
      { analyzeDocument } as any,
      { show: jest.fn() } as any,
      { show: jest.fn() } as any
    );
    const update = jest.fn().mockResolvedValue(undefined);

    const editorUri = vscode.Uri.file('/tmp/template.html');
    vscode.window.activeTextEditor = {
      document: { uri: editorUri, fsPath: '/tmp/template.html' },
    } as any;
    (vscode.workspace.getWorkspaceFolder as jest.Mock).mockReturnValue({ uri: vscode.Uri.file('/tmp') });
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === 'jinja2-html-enhancer') {
        return {
          get: jest.fn().mockReturnValue({}),
          update,
        };
      }
      return {
        get: jest.fn().mockReturnValue({}),
        update: jest.fn(),
      };
    });

    await manager.saveVariable("Variable 'customer' is missing");

    expect(update).toHaveBeenCalledWith(
      'customVariables',
      { '/tmp/template.html': ['customer'] },
      vscode.ConfigurationTarget.WorkspaceFolder
    );
    expect(analyzeDocument).toHaveBeenCalled();
  });

  it('warns when trying to save variable without active editor', async () => {
    const manager = new CommandManager(
      { analyzeDocument: jest.fn() } as any,
      { show: jest.fn() } as any,
      { show: jest.fn() } as any
    );

    await manager.saveVariable("Variable 'customer' is missing");

    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('error.noActiveEditor');
  });

  it('applies removal action in theme change flow', async () => {
    const manager = new CommandManager(
      { analyzeDocument: jest.fn() } as any,
      { show: jest.fn() } as any,
      { show: jest.fn() } as any
    );
    const update = jest.fn().mockResolvedValue(undefined);

    (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({ label: 'remove', value: 'remove' });
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section?: string) => {
      if (section === 'workbench') {
        return {
          get: jest.fn().mockReturnValue({
            textMateRules: [{ scope: 'jinja2.variable' }, { scope: 'other.scope' }],
          }),
        };
      }
      return {
        get: jest.fn().mockReturnValue({}),
        update,
      };
    });

    await manager.changeTheme();

    expect(update).toHaveBeenCalledWith(
      'editor.tokenColorCustomizations',
      { textMateRules: [{ scope: 'other.scope' }] },
      vscode.ConfigurationTarget.Global
    );
  });

  it('delegates apply action to theme selector', async () => {
    const manager = new CommandManager(
      { analyzeDocument: jest.fn() } as any,
      { show: jest.fn() } as any,
      { show: jest.fn() } as any
    );

    (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({ label: 'Apply', value: 'apply' });

    await manager.changeTheme();

    expect(chooseThemeSelector).toHaveBeenCalled();
  });
});
