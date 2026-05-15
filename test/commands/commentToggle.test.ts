import * as vscode from "vscode";
import { CommentToggle } from "../../src/commands/commentToggle";

jest.mock("../../src/translations", () => ({
  __esModule: true,
  default: {
    __: (key: string) => key,
  },
}));

function makeTextLine(text: string, lineNumber = 0): vscode.TextLine {
  const firstNonWs = text.search(/\S/);
  return {
    lineNumber,
    text,
    range: new vscode.Range(
      { line: lineNumber, character: 0 } as any,
      { line: lineNumber, character: text.length } as any
    ),
    rangeIncludingLineBreak: new vscode.Range(
      { line: lineNumber, character: 0 } as any,
      { line: lineNumber + 1, character: 0 } as any
    ),
    firstNonWhitespaceCharacterIndex: firstNonWs === -1 ? text.length : firstNonWs,
    isEmptyOrWhitespace: text.trim().length === 0,
  } as vscode.TextLine;
}

function makeEditor(
  lines: string[],
  selectionStart?: { line: number; char: number },
  selectionEnd?: { line: number; char: number }
) {
  const start = selectionStart ?? { line: 0, char: 0 };
  const end = selectionEnd ?? start;

  const selection = {
    isEmpty: start.line === end.line && start.char === end.char,
    active: { line: start.line, character: start.char },
    start: { line: start.line, character: start.char },
    end: { line: end.line, character: end.char },
  } as unknown as vscode.Selection;

  const editCalls: Array<{ range: vscode.Range; newText: string }> = [];

  const editBuilder = {
    replace: (range: vscode.Range, newText: string) => editCalls.push({ range, newText }),
  } as unknown as vscode.TextEditorEdit;

  const editor = {
    selections: [selection],
    document: {
      lineAt: (n: number) => makeTextLine(lines[n], n),
    },
    edit: (callback: (builder: vscode.TextEditorEdit) => void) => {
      callback(editBuilder);
      return Promise.resolve(true);
    },
  } as unknown as vscode.TextEditor;

  return { editor, editCalls };
}

describe("CommentToggle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    vscode.window.activeTextEditor = undefined as any;
  });

  it("warns when no active editor is open", () => {
    const toggle = new CommentToggle();
    toggle.toggle();
    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith("error.noActiveEditor");
  });

  it("comments an uncommented line", () => {
    const { editor, editCalls } = makeEditor(["{{ user.name }}"], { line: 0, char: 0 });
    vscode.window.activeTextEditor = editor;

    const toggle = new CommentToggle();
    toggle.toggle();

    expect(editCalls).toHaveLength(1);
    expect(editCalls[0].newText).toBe("{# {{ user.name }} #}");
  });

  it("uncomments a Jinja2 commented line", () => {
    const { editor, editCalls } = makeEditor(["{# {{ user.name }} #}"], { line: 0, char: 0 });
    vscode.window.activeTextEditor = editor;

    const toggle = new CommentToggle();
    toggle.toggle();

    expect(editCalls).toHaveLength(1);
    expect(editCalls[0].newText).toBe("{{ user.name }}");
  });

  it("preserves indentation when commenting", () => {
    const { editor, editCalls } = makeEditor(["  <p>{{ title }}</p>"], { line: 0, char: 0 });
    vscode.window.activeTextEditor = editor;

    const toggle = new CommentToggle();
    toggle.toggle();

    expect(editCalls[0].newText).toBe("  {# <p>{{ title }}</p> #}");
  });

  it("preserves indentation when uncommenting", () => {
    const { editor, editCalls } = makeEditor(["  {# <p>{{ title }}</p> #}"], { line: 0, char: 0 });
    vscode.window.activeTextEditor = editor;

    const toggle = new CommentToggle();
    toggle.toggle();

    expect(editCalls[0].newText).toBe("  <p>{{ title }}</p>");
  });

  it("comments all lines when selection spans multiple uncommented lines", () => {
    const lines = ["{% for item in items %}", "  {{ item }}", "{% endfor %}"];
    const { editor, editCalls } = makeEditor(lines, { line: 0, char: 0 }, { line: 2, char: 12 });
    vscode.window.activeTextEditor = editor;

    const toggle = new CommentToggle();
    toggle.toggle();

    expect(editCalls).toHaveLength(3);
    expect(editCalls[0].newText).toBe("{# {% for item in items %} #}");
    expect(editCalls[1].newText).toBe("  {# {{ item }} #}");
    expect(editCalls[2].newText).toBe("{# {% endfor %} #}");
  });

  it("uncomments all lines when all selected lines are already commented", () => {
    const lines = ["{# {% for item in items %} #}", "  {# {{ item }} #}", "{# {% endfor %} #}"];
    const { editor, editCalls } = makeEditor(lines, { line: 0, char: 0 }, { line: 2, char: 22 });
    vscode.window.activeTextEditor = editor;

    const toggle = new CommentToggle();
    toggle.toggle();

    expect(editCalls).toHaveLength(3);
    expect(editCalls[0].newText).toBe("{% for item in items %}");
    expect(editCalls[1].newText).toBe("  {{ item }}");
    expect(editCalls[2].newText).toBe("{% endfor %}");
  });

  it("skips empty lines in a multi-line selection", () => {
    const lines = ["{% if user %}", "", "{% endif %}"];
    const { editor, editCalls } = makeEditor(lines, { line: 0, char: 0 }, { line: 2, char: 11 });
    vscode.window.activeTextEditor = editor;

    const toggle = new CommentToggle();
    toggle.toggle();

    expect(editCalls).toHaveLength(2);
    expect(editCalls[0].newText).toBe("{# {% if user %} #}");
    expect(editCalls[1].newText).toBe("{# {% endif %} #}");
  });

  it("comments when mixed commented and uncommented lines are selected", () => {
    const lines = ["{# {% if user %} #}", "  {{ user.name }}"];
    const { editor, editCalls } = makeEditor(lines, { line: 0, char: 0 }, { line: 1, char: 16 });
    vscode.window.activeTextEditor = editor;

    const toggle = new CommentToggle();
    toggle.toggle();

    expect(editCalls).toHaveLength(2);
    expect(editCalls[0].newText).toBe("{# {# {% if user %} #} #}");
    expect(editCalls[1].newText).toBe("  {# {{ user.name }} #}");
  });
});
