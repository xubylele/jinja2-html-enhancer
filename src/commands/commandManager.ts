import * as vscode from "vscode";
import { getVscodeConfigTarget } from "../config/configService";
import { extractVariableName } from "@xubylele/jinja2-enhanced-shared";
import { chooseThemeSelector } from "../theme/themeChoose";
import I18n from "../translations";
import { VariablePanelManager } from "../ui/panels/variablePanel";
import { TemplatePreviewPanel } from "../ui/panels/templatePreviewPanel";
import { FileWatcher } from "../watchers/fileWatcher";

export class CommandManager {
  private fileWatcher: FileWatcher;
  private variablePanelManager: VariablePanelManager;
  private templatePreviewPanel: TemplatePreviewPanel;

  constructor(
    fileWatcher: FileWatcher,
    variablePanelManager: VariablePanelManager,
    templatePreviewPanel: TemplatePreviewPanel
  ) {
    this.fileWatcher = fileWatcher;
    this.variablePanelManager = variablePanelManager;
    this.templatePreviewPanel = templatePreviewPanel;
  }

  public async checkVariables() {
    vscode.window.showInformationMessage(I18n.__("variable.checkingVariables"));
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const result = await this.fileWatcher.analyzeDocument(editor.document);
      if (result) {
        vscode.window.showInformationMessage(I18n.__("variable.variablesChecked"));
      }
    } else {
      vscode.window.showWarningMessage(I18n.__("error.noActiveEditor"));
    }
  }

  public async openVariablePanel() {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const result = await this.fileWatcher.analyzeDocument(editor.document);
      if (result) {
        this.variablePanelManager.show(result.usedVariables, result.setVariables);
      }
    } else {
      vscode.window.showWarningMessage(I18n.__("error.noActiveEditor"));
    }
  }

  public async changeConfiguration(type: string) {
    const config = vscode.workspace.getConfiguration("jinja2-html-enhancer");
    const currentConfig = config.get(type);
    let newValue;

    if (!currentConfig) {
      newValue = true;
    } else {
      newValue = !currentConfig;
    }

    const typeTranslation = I18n.__(`configuration.${type}`);

    try {
      await config.update(type, newValue);
      vscode.window.showInformationMessage(
        I18n.__("configuration.configurationChanged", { type: typeTranslation })
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        I18n.__("error.configurationChangeFailed", { error: String(error) })
      );
    }
  }

  public async saveVariable(diagnosticMessage: string) {
    const variable = extractVariableName(diagnosticMessage);
    const activeEditor = vscode.window.activeTextEditor;

    if (!variable) {
      vscode.window.showWarningMessage(I18n.__("error.variableNotFound"));
      return;
    }

    if (!activeEditor) {
      vscode.window.showWarningMessage(I18n.__("error.noActiveEditor"));
      return;
    }

    const filePath = activeEditor.document.uri.fsPath;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(activeEditor.document.uri);

    if (!workspaceFolder) {
      vscode.window.showWarningMessage(I18n.__("warning.noWorkspaceFolder"));
    }

    const target = getVscodeConfigTarget(activeEditor);

    const targetTranslation =
      target === vscode.ConfigurationTarget.WorkspaceFolder && workspaceFolder
        ? I18n.__("quickFix.workspaceTarget")
        : I18n.__("quickFix.globalTarget");

    const config =
      target === vscode.ConfigurationTarget.WorkspaceFolder && workspaceFolder
        ? vscode.workspace.getConfiguration("jinja2-html-enhancer", workspaceFolder.uri)
        : vscode.workspace.getConfiguration("jinja2-html-enhancer");

    const currentVariables: { [key: string]: string[] } = config.get("customVariables", {});

    if (currentVariables[filePath] && currentVariables[filePath].includes(variable)) {
      vscode.window.showWarningMessage(
        I18n.__("warning.variableExists", { variable, target: targetTranslation })
      );
      return;
    }

    const variableArray = currentVariables[filePath] || [];
    variableArray.push(variable);

    try {
      await config.update(
        "customVariables",
        { ...currentVariables, [filePath]: variableArray },
        target
      );
      vscode.window.showInformationMessage(
        I18n.__("quickFix.save", { variable, target: targetTranslation })
      );
      await this.checkVariables();
    } catch (error) {
      vscode.window.showErrorMessage(
        I18n.__("error.variableNotSaved", { variable, error: String(error) })
      );
    }
  }

  public async openTemplatePreview() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage(I18n.__("error.noActiveEditor"));
      return;
    }

    const document = editor.document;
    if (document.languageId !== "html" && document.languageId !== "jinja2") {
      vscode.window.showWarningMessage(I18n.__("preview.noActiveTemplate"));
      return;
    }

    this.templatePreviewPanel.openFor(document);
  }

  public async previewWithProfile() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage(I18n.__("error.noActiveEditor"));
      return;
    }
    const document = editor.document;
    if (document.languageId !== "html" && document.languageId !== "jinja2") {
      vscode.window.showWarningMessage(I18n.__("preview.noActiveTemplate"));
      return;
    }

    const { set } = this.templatePreviewPanel.listProfilesForActive();
    const profileNames = Object.keys(set.profiles);
    const items: Array<vscode.QuickPickItem & { name?: string }> = profileNames.map((name) => ({
      label: name,
      description: name === set.default ? `(${I18n.__("preview.defaultBadge")})` : undefined,
      name,
    }));
    items.push({ label: I18n.__("preview.manageProfilesLabel"), name: undefined });

    const picked = await vscode.window.showQuickPick(items, {
      placeHolder: profileNames.length
        ? I18n.__("preview.selectProfilePlaceholder")
        : I18n.__("preview.noProfilesFound"),
    });
    if (!picked) {
      return;
    }

    this.templatePreviewPanel.openFor(document, picked.name);
  }

  public async changeTheme() {
    const action = await vscode.window.showQuickPick(
      [
        { label: I18n.__("theme.apply"), value: "apply" },
        { label: I18n.__("theme.remove"), value: "remove" },
        { label: I18n.__("theme.cancel"), value: "cancel" },
      ],
      {
        title: I18n.__("theme.selectAction"),
        placeHolder: I18n.__("theme.selectActionPlaceholder"),
      }
    );

    if (!action || action.value === "cancel") {
      return;
    }

    if (action.value === "remove") {
      const currentTheme = vscode.workspace
        .getConfiguration("workbench")
        .get("editor.tokenColorCustomizations", {});
      const updatedRules = ((currentTheme as any)?.textMateRules || []).filter(
        (rule: any) => !rule.scope.startsWith("jinja2")
      );

      try {
        await vscode.workspace
          .getConfiguration()
          .update(
            "editor.tokenColorCustomizations",
            { textMateRules: updatedRules },
            vscode.ConfigurationTarget.Global
          );
        vscode.window.showInformationMessage(I18n.__("theme.themeChanged", { theme: "Default" }));
      } catch (error) {
        console.error("Error removing theme:", error);
        vscode.window.showErrorMessage(
          I18n.__("error.themeChangeFailed", { error: String(error) })
        );
      }
      return;
    }
    await chooseThemeSelector();
  }
}
