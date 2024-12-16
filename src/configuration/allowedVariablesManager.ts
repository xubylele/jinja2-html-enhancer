import * as vscode from 'vscode'

export class AllowedVariablesManager {
  private readonly configSection = 'variableAnalyzer';

  public getAllowedVariablesForFile(uri: vscode.Uri): string[] {
    const config = vscode.workspace.getConfiguration(this.configSection, uri);
    return config.get('allowedVariables', []);
  }

  public async allowVariableInFile(uri: vscode.Uri, variable: string): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.configSection, uri);
    const currentAllowed = config.get<string[]>('allowedVariables', []);

    if (!currentAllowed.includes(variable)) {
      await config.update(
        'allowedVariables',
        [...currentAllowed, variable],
        vscode.ConfigurationTarget.WorkspaceFolder
      );
    }
  }

  public async removeAllowedVariableFromFile(uri: vscode.Uri, variable: string): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.configSection, uri);
    const currentAllowed = config.get<string[]>('allowedVariables', []);

    await config.update(
      'allowedVariables',
      currentAllowed.filter(v => v !== variable),
      vscode.ConfigurationTarget.WorkspaceFolder
    );
  }
}