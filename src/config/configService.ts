import * as vscode from "vscode";

export interface ContextProfileSet {
  default: string;
  profiles: Record<string, Record<string, unknown>>;
}

export type ContextProfilesMap = Record<string, ContextProfileSet>;

export const WILDCARD_TEMPLATE_KEY = "*";

export const getVscodeConfigTarget = (
  activeEditor?: vscode.TextEditor | null,
  document?: vscode.TextDocument,
) => {
  let hasWorkspaceFolder = false;

  if (activeEditor) {
    hasWorkspaceFolder = !!vscode.workspace.getWorkspaceFolder(
      activeEditor.document.uri,
    );
  } else if (document) {
    hasWorkspaceFolder = !!vscode.workspace.getWorkspaceFolder(document.uri);
  }

  return hasWorkspaceFolder
    ? vscode.ConfigurationTarget.WorkspaceFolder
    : vscode.ConfigurationTarget.Global;
};

export const getConfiguration = async (type: string) => {
  const config = vscode.workspace.getConfiguration("jinja2-html-enhancer");

  return config.get(type);
};

export const getContextProfiles = (uri?: vscode.Uri): ContextProfilesMap => {
  const config = uri
    ? vscode.workspace.getConfiguration("jinja2-html-enhancer", uri)
    : vscode.workspace.getConfiguration("jinja2-html-enhancer");
  return config.get<ContextProfilesMap>("contextProfiles", {});
};

export const setContextProfiles = async (
  editor: vscode.TextEditor | undefined,
  nextContextProfiles: ContextProfilesMap,
) => {
  const configTarget = getVscodeConfigTarget(editor);
  const config = editor
    ? vscode.workspace.getConfiguration(
        "jinja2-html-enhancer",
        editor.document.uri,
      )
    : vscode.workspace.getConfiguration("jinja2-html-enhancer");
  await config.update("contextProfiles", nextContextProfiles, configTarget);
};

export const resolveProfilesForTemplate = (
  templatePath: string,
  uri?: vscode.Uri,
): { key: string; set: ContextProfileSet } => {
  const profiles = getContextProfiles(uri);
  if (profiles[templatePath]) {
    return { key: templatePath, set: profiles[templatePath] };
  }
  if (profiles[WILDCARD_TEMPLATE_KEY]) {
    return {
      key: WILDCARD_TEMPLATE_KEY,
      set: profiles[WILDCARD_TEMPLATE_KEY],
    };
  }
  return { key: templatePath, set: { default: "", profiles: {} } };
};

export const buildLegacyCustomVarsContext = (
  templatePath: string,
  uri?: vscode.Uri,
): Record<string, unknown> => {
  const config = uri
    ? vscode.workspace.getConfiguration("jinja2-html-enhancer", uri)
    : vscode.workspace.getConfiguration("jinja2-html-enhancer");
  const customVariables = config.get<Record<string, string[]>>(
    "customVariables",
    {},
  );
  const fileVars = customVariables[templatePath] || [];
  const context: Record<string, unknown> = {};
  for (const v of fileVars) {
    context[v] = "";
  }
  return context;
};
