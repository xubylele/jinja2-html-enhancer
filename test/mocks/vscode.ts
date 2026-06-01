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

class RelativePattern {
  base: string;
  pattern: string;
  constructor(base: any, pattern: string) {
    this.base = typeof base === "string" ? base : (base?.uri?.fsPath ?? base?.fsPath ?? "");
    this.pattern = pattern;
  }
}

class Uri {
  fsPath: string;
  path: string;

  constructor(fsPath: string) {
    this.fsPath = fsPath;
    this.path = fsPath;
  }

  toString() {
    return this.fsPath;
  }

  static file(path: string) {
    return new Uri(path);
  }

  static parse(value: string) {
    return new Uri(value);
  }
}

class CancellationTokenSource {
  token: CancellationToken;
  constructor() {
    this.token = new CancellationToken();
  }
  cancel() {}
  dispose() {}
}

class CancellationToken {
  isCancellationRequested = false;
  onCancellationRequested: any = undefined;
}

class Position {
  line: number;
  character: number;

  constructor(line: number, character: number) {
    this.line = line;
    this.character = character;
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

class TextEdit {
  range: any;
  newText: string;

  constructor(range: any, newText: string) {
    this.range = range;
    this.newText = newText;
  }

  static replace(range: any, newText: string) {
    return new TextEdit(range, newText);
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

class Hover {
  contents: any[];
  range?: any;

  constructor(contents: any, range?: any) {
    this.contents = Array.isArray(contents) ? contents : [contents];
    this.range = range;
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

class Location {
  uri: any;
  range: any;
  constructor(uri: any, rangeOrPosition: any) {
    this.uri = uri;
    this.range = rangeOrPosition;
  }
}

const DiagnosticSeverity = {
  Error: 0,
  Warning: 1,
  Information: 2,
  Hint: 3,
};

const TextEditorRevealType = { InCenter: 2 };
const ViewColumn = { One: 1, Beside: 2 };

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

class WorkspaceEdit {
  private _entries: Map<string, TextEdit[]> = new Map();

  set(uri: Uri, edits: TextEdit[]) {
    this._entries.set(uri.fsPath, edits);
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
  setStatusBarMessage: jest.fn(() => ({ dispose: jest.fn() })),
  activeTextEditor: undefined as any,
  showTextDocument: jest.fn(),
  createWebviewPanel: jest.fn(() => ({
    reveal: jest.fn(),
    onDidDispose: jest.fn(),
    webview: { html: "", onDidReceiveMessage: jest.fn(), postMessage: jest.fn() },
    dispose: jest.fn(),
  })),
  onDidChangeActiveTextEditor: jest.fn(() => ({ dispose: jest.fn() })),
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
    onDidDelete: jest.fn(),
    dispose: jest.fn(),
  })),
  onDidChangeConfiguration: jest.fn(() => ({ dispose: jest.fn() })),
  onDidChangeWorkspaceFolders: jest.fn(() => ({ dispose: jest.fn() })),
  workspaceFolders: undefined as any,
  textDocuments: [] as any[],
  findFiles: jest.fn(async () => [] as any[]),
  fs: {
    stat: jest.fn(),
    readFile: jest.fn(),
  },
  openTextDocument: jest.fn(),
  applyEdit: jest.fn(),
};

const languages = {
  createDiagnosticCollection,
  registerCompletionItemProvider: jest.fn(() => ({ dispose: jest.fn() })),
  registerSignatureHelpProvider: jest.fn(() => ({ dispose: jest.fn() })),
  registerDocumentFormattingEditProvider: jest.fn(() => ({ dispose: jest.fn() })),
  registerDefinitionProvider: jest.fn(() => ({ dispose: jest.fn() })),
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
  RelativePattern,
  Range,
  Diagnostic,
  Hover,
  CodeAction,
  DiagnosticSeverity,
  TextEditorRevealType,
  ViewColumn,
  ConfigurationTarget,
  CodeActionKind,
  CompletionItem,
  CompletionItemKind,
  MarkdownString,
  SnippetString,
  ParameterInformation,
  SignatureInformation,
  SignatureHelp,
  Position,
  Location,
  TextEdit,
  WorkspaceEdit,
  CancellationToken,
  CancellationTokenSource,
  window,
  workspace,
  languages,
  env,
  extensions,
  commands,
};
