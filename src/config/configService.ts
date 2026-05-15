import * as vscode from "vscode";

export interface ContextProfileSet {
  default: string;
  profiles: Record<string, Record<string, unknown>>;
}

export type ContextProfilesMap = Record<string, ContextProfileSet>;

export const WILDCARD_TEMPLATE_KEY = "*";

export const getVscodeConfigTarget = (
  activeEditor?: vscode.TextEditor | null,
  document?: vscode.TextDocument
) => {
  let hasWorkspaceFolder = false;

  if (activeEditor) {
    hasWorkspaceFolder = !!vscode.workspace.getWorkspaceFolder(activeEditor.document.uri);
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
  nextContextProfiles: ContextProfilesMap
) => {
  const configTarget = getVscodeConfigTarget(editor);
  const config = editor
    ? vscode.workspace.getConfiguration("jinja2-html-enhancer", editor.document.uri)
    : vscode.workspace.getConfiguration("jinja2-html-enhancer");
  await config.update("contextProfiles", nextContextProfiles, configTarget);
};

const normalizeSet = (raw: unknown): ContextProfileSet => {
  if (!raw || typeof raw !== "object") {
    return { default: "", profiles: {} };
  }
  // Deep-clone via JSON to strip any proxies/getters that VS Code's config
  // layer may put on the returned value. Anything that fails to clone (cycles,
  // throwing getters, non-serializable values) is treated as missing.
  let cloned: Partial<ContextProfileSet> | null;
  try {
    cloned = JSON.parse(JSON.stringify(raw));
  } catch {
    cloned = null;
  }
  if (!cloned || typeof cloned !== "object") {
    return { default: "", profiles: {} };
  }
  return {
    default: typeof cloned.default === "string" ? cloned.default : "",
    profiles: cloned.profiles && typeof cloned.profiles === "object" ? cloned.profiles : {},
  };
};

export const resolveProfilesForTemplate = (
  templatePath: string,
  uri?: vscode.Uri
): { key: string; set: ContextProfileSet } => {
  const profiles = getContextProfiles(uri);
  if (profiles[templatePath]) {
    return { key: templatePath, set: normalizeSet(profiles[templatePath]) };
  }
  if (profiles[WILDCARD_TEMPLATE_KEY]) {
    return {
      key: WILDCARD_TEMPLATE_KEY,
      set: normalizeSet(profiles[WILDCARD_TEMPLATE_KEY]),
    };
  }
  return { key: templatePath, set: { default: "", profiles: {} } };
};

export const buildLegacyCustomVarsContext = (
  templatePath: string,
  uri?: vscode.Uri
): Record<string, unknown> => {
  const config = uri
    ? vscode.workspace.getConfiguration("jinja2-html-enhancer", uri)
    : vscode.workspace.getConfiguration("jinja2-html-enhancer");
  const customVariables = config.get<Record<string, string[]>>("customVariables", {});
  const fileVars = customVariables[templatePath] || [];
  const context: Record<string, unknown> = {};
  for (const v of fileVars) {
    context[v] = "";
  }
  return context;
};
