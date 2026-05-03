import * as vscode from 'vscode';
import { getConfiguration, getVscodeConfigTarget } from '../../src/config/configService';

describe('configService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns workspace-folder target when editor is provided', () => {
    const editor = {
      document: {
        uri: { fsPath: '/tmp/file.html' },
      },
    } as any;

    expect(getVscodeConfigTarget(editor)).toBe(vscode.ConfigurationTarget.WorkspaceFolder);
    expect(getVscodeConfigTarget()).toBe(vscode.ConfigurationTarget.Global);
  });

  it('reads extension configuration value by key', async () => {
    const get = jest.fn().mockReturnValue(true);
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({ get });

    const value = await getConfiguration('toggleVariableCheck');

    expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('jinja2-html-enhancer');
    expect(value).toBe(true);
  });
});
