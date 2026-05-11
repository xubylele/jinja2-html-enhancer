type Listener<T> = (event: T) => void;

class EventEmitter<T> {
  private listeners: Listener<T>[] = [];

  public event = (listener: Listener<T>) => {
    this.listeners.push(listener);
    return { dispose: () => undefined };
  };

  public fire(data: T) {
    this.listeners.forEach((listener) => listener(data));
  }

  public dispose() {
    this.listeners = [];
  }
}

class Uri {
  fsPath: string;

  constructor(fsPath: string) {
    this.fsPath = fsPath;
  }

  static file(path: string) {
    return new Uri(path);
  }

  static parse(value: string) {
    return new Uri(value);
  }
}

class Range {
  start: any;
  end: any;

  constructor(start: any, end: any) {
    this.start = start;
    this.end = end;
  }
}

class Diagnostic {
  range: any;
  message: string;
  severity: number;
  code?: string;

  constructor(range: any, message: string, severity: number) {
    this.range = range;
    this.message = message;
    this.severity = severity;
  }
}

class CodeAction {
  title: string;
  kind: string;
  command?: { command: string; title: string; arguments: any[] };

  constructor(title: string, kind: string) {
    this.title = title;
    this.kind = kind;
  }
}

const DiagnosticSeverity = {
  Warning: 1,
};

const ConfigurationTarget = {
  Global: 1,
  WorkspaceFolder: 2,
};

const CodeActionKind = {
  QuickFix: "QuickFix",
};

const CompletionItemKind = {
  Function: 2,
};

class CompletionItem {
  label: string;
  kind: number;
  detail?: string;
  documentation?: any;
  insertText?: any;

  constructor(label: string, kind: number) {
    this.label = label;
    this.kind = kind;
  }
}

class MarkdownString {
  value: string;
  isTrusted = false;
  supportHtml = false;

  constructor(value = "") {
    this.value = value;
  }

  appendMarkdown(value: string) {
    this.value += value;
    return this;
  }
}

class SnippetString {
  value: string;
  constructor(value = "") {
    this.value = value;
  }
}

class ParameterInformation {
  label: string;
  documentation?: any;
  constructor(label: string, documentation?: any) {
    this.label = label;
    this.documentation = documentation;
  }
}

class SignatureInformation {
  label: string;
  documentation?: any;
  parameters: ParameterInformation[] = [];
  constructor(label: string, documentation?: any) {
    this.label = label;
    this.documentation = documentation;
  }
}

class SignatureHelp {
  signatures: SignatureInformation[] = [];
  activeSignature = 0;
  activeParameter = 0;
}

const createDiagnosticCollection = jest.fn(() => ({
  set: jest.fn(),
  clear: jest.fn(),
  dispose: jest.fn(),
}));

const window = {
  showWarningMessage: jest.fn(),
  showInformationMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  showQuickPick: jest.fn(),
  activeTextEditor: undefined as any,
};

const workspace = {
  getConfiguration: jest.fn(() => ({
    get: jest.fn(),
    update: jest.fn(),
  })),
  getWorkspaceFolder: jest.fn(),
  createFileSystemWatcher: jest.fn(() => ({
    onDidChange: jest.fn(),
    onDidCreate: jest.fn(),
    dispose: jest.fn(),
  })),
  openTextDocument: jest.fn(),
};

const languages = {
  createDiagnosticCollection,
  registerCompletionItemProvider: jest.fn(() => ({ dispose: jest.fn() })),
  registerSignatureHelpProvider: jest.fn(() => ({ dispose: jest.fn() })),
};

const env = {
  language: "en",
  openExternal: jest.fn(),
};

const extensions = {
  getExtension: jest.fn(),
};

const commands = {
  executeCommand: jest.fn(),
  registerCommand: jest.fn(),
};

export = {
  EventEmitter,
  Uri,
  Range,
  Diagnostic,
  CodeAction,
  DiagnosticSeverity,
  ConfigurationTarget,
  CodeActionKind,
  CompletionItem,
  CompletionItemKind,
  MarkdownString,
  SnippetString,
  ParameterInformation,
  SignatureInformation,
  SignatureHelp,
  window,
  workspace,
  languages,
  env,
  extensions,
  commands,
};
