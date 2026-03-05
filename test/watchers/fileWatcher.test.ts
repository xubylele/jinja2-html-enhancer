import * as vscode from 'vscode';
import { FileWatcher } from '../../src/watchers/fileWatcher';

jest.mock('../../src/translations', () => ({
  __esModule: true,
  default: {
    __: (key: string) => key,
  },
}));

jest.mock('../../src/diagnostics/variableAnalyzer', () => ({
  extractVariables: jest.fn(() => ({ usedVariables: ['user'], setVariables: ['local'] })),
  analyzeNestedStructures: jest.fn(() => ['loopVar']),
}));

jest.mock('../../src/utils/variables', () => ({
  getConfiguration: jest.fn(),
  getVscodeConfigTarget: jest.fn(),
}));

const { getConfiguration, getVscodeConfigTarget } = jest.requireMock('../../src/utils/variables') as {
  getConfiguration: jest.Mock;
  getVscodeConfigTarget: jest.Mock;
};

describe('FileWatcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function createDiagnosticsManager() {
    return {
      updateDiagnostics: jest.fn(),
      onDidUpdateDiagnostics: (listener: any) => {
        listener({ usedVariables: [], setVariables: [] });
        return { dispose: jest.fn() };
      },
    } as any;
  }

  it('shows warning and exits when variable check is disabled', async () => {
    getConfiguration.mockResolvedValue(false);
    const manager = createDiagnosticsManager();
    const watcher = new FileWatcher(manager);

    const result = await watcher.analyzeDocument({} as any);

    expect(result).toBeUndefined();
    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('warning.noToggleVariableCheck');
  });

  it('opens a Uri document and re-analyzes it', async () => {
    getConfiguration.mockResolvedValue(true);
    getVscodeConfigTarget.mockReturnValue(vscode.ConfigurationTarget.Global);
    vscode.window.activeTextEditor = {
      document: { uri: vscode.Uri.file('/tmp/template.html') },
    } as any;
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue({}),
    });

    const manager = createDiagnosticsManager();
    const watcher = new FileWatcher(manager);
    const doc = {
      uri: vscode.Uri.file('/tmp/template.html'),
      getText: () => '{{ user }}',
    };
    (vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue(doc);

    await watcher.analyzeDocument(vscode.Uri.file('/tmp/template.html'));

    expect(vscode.workspace.openTextDocument).toHaveBeenCalled();
  });

  it('warns when there is no active editor', async () => {
    getConfiguration.mockResolvedValue(true);
    vscode.window.activeTextEditor = undefined as any;
    const manager = createDiagnosticsManager();
    const watcher = new FileWatcher(manager);

    const result = await watcher.analyzeDocument({} as any);

    expect(result).toBeUndefined();
    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('error.noActiveEditor');
  });

  it('updates diagnostics using extracted and custom variables', async () => {
    getConfiguration.mockResolvedValue(true);
    getVscodeConfigTarget.mockReturnValue(vscode.ConfigurationTarget.WorkspaceFolder);
    vscode.window.activeTextEditor = {
      document: { uri: vscode.Uri.file('/tmp/template.html') },
    } as any;
    (vscode.workspace.getWorkspaceFolder as jest.Mock).mockReturnValue({
      uri: vscode.Uri.file('/tmp'),
    });
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue({
        '/tmp/template.html': ['customVar'],
      }),
    });

    const manager = createDiagnosticsManager();
    const watcher = new FileWatcher(manager);
    const document = {
      uri: vscode.Uri.file('/tmp/template.html'),
      getText: () => '{{ user }}',
    } as any;

    const result = await watcher.analyzeDocument(document);

    expect(manager.updateDiagnostics).toHaveBeenCalledWith(
      document,
      ['user'],
      expect.arrayContaining(['local', 'loopVar', 'customVar'])
    );
    expect(result?.usedVariables).toEqual(['user']);
  });
});
