import * as vscode from "vscode";
import { MacroCompletionProvider, MacroSignatureHelpProvider } from "../../src/completion/macro";

jest.mock("../../src/translations", () => ({
  __esModule: true,
  default: {
    __: (key: string, params?: Record<string, string>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  },
  setupI18n: jest.fn(),
}));

jest.mock("../../src/resolver/inheritedScope", () => ({
  getInheritedScope: jest.fn().mockResolvedValue([]),
  resolveToNode: jest.fn().mockReturnValue(undefined),
}));

const TEMPLATE = `
{% macro card(title, body='') %}<div>{{ title }}{{ body }}</div>{% endmacro %}
{% macro alert(message) %}<p>{{ message }}</p>{% endmacro %}
`;

function makeDocument(text: string, line: string, character: number) {
  return {
    getText: () => text,
    lineAt: (_pos: any) => ({ text: line }),
    offsetAt: (_pos: any) => 0,
    uri: vscode.Uri.file("/x.html"),
  } as any;
}

describe("MacroCompletionProvider (no graph — same-file only)", () => {
  const provider = new MacroCompletionProvider();

  it("returns null outside print context", async () => {
    const doc = makeDocument(TEMPLATE, "<p>hello", 8);
    const result = await provider.provideCompletionItems(doc, { line: 0, character: 8 } as any);
    expect(result).toBeNull();
  });

  it("returns local macros inside {{ … }} with snippet body", async () => {
    const line = "{{ ca";
    const doc = makeDocument(TEMPLATE, line, line.length);
    const items = await provider.provideCompletionItems(doc, {
      line: 0,
      character: line.length,
    } as any);
    expect(items).not.toBeNull();
    expect(items!.map((i: any) => i.label).sort()).toEqual(["alert", "card"]);
    const card = items!.find((i: any) => i.label === "card")!;
    expect(card.detail).toBe("card(title, body = …)");
    expect((card.insertText as any).value).toBe("card(${1:title}, ${2:body})");
  });

  it("returns empty list when document has no macros", async () => {
    const doc = makeDocument("plain", "{{ x", 4);
    const items = await provider.provideCompletionItems(doc, {
      line: 0,
      character: 4,
    } as any);
    expect(items).toEqual([]);
  });
});

describe("MacroSignatureHelpProvider (no graph — same-file only)", () => {
  const provider = new MacroSignatureHelpProvider();

  it("returns null when not inside a call", async () => {
    const doc = makeDocument(TEMPLATE, "{{ card", 7);
    expect(await provider.provideSignatureHelp(doc, { line: 0, character: 7 } as any)).toBeNull();
  });

  it("returns null for namespaced calls when no graph is wired", async () => {
    const line = "{{ forms.card(";
    const doc = makeDocument(TEMPLATE, line, line.length);
    expect(
      await provider.provideSignatureHelp(doc, { line: 0, character: line.length } as any)
    ).toBeNull();
  });

  it("returns null when macro name is unknown", async () => {
    const line = "{{ unknownMacro(";
    const doc = makeDocument(TEMPLATE, line, line.length);
    expect(
      await provider.provideSignatureHelp(doc, { line: 0, character: line.length } as any)
    ).toBeNull();
  });

  it("builds a signature for a known local macro", async () => {
    const line = "{{ card(";
    const doc = makeDocument(TEMPLATE, line, line.length);
    const help = (await provider.provideSignatureHelp(doc, {
      line: 0,
      character: line.length,
    } as any)) as any;
    expect(help).not.toBeNull();
    expect(help.signatures[0].label).toBe("card(title, body = …)");
    expect(help.activeParameter).toBe(0);
    expect(help.signatures[0].parameters).toHaveLength(2);
    expect(help.signatures[0].parameters[0].label).toBe("title");
    expect(help.signatures[0].parameters[1].label).toBe("body = …");
  });

  it("advances activeParameter on commas", async () => {
    const line = "{{ card(title, ";
    const doc = makeDocument(TEMPLATE, line, line.length);
    const help = (await provider.provideSignatureHelp(doc, {
      line: 0,
      character: line.length,
    } as any)) as any;
    expect(help).not.toBeNull();
    expect(help.activeParameter).toBe(1);
  });
});

describe("MacroCompletionProvider (with graph — cross-file)", () => {
  const { getInheritedScope } = jest.requireMock("../../src/resolver/inheritedScope");

  beforeEach(() => {
    (getInheritedScope as jest.Mock).mockReset();
    (vscode.workspace.getWorkspaceFolder as jest.Mock).mockReturnValue(null);
  });

  it("returns local + inherited macros when graph is wired", async () => {
    const macroUri = vscode.Uri.file("/proj/templates/macros.html");
    const macroNode = {
      macros: new Map([
        [
          "button",
          {
            definition: { name: "button", params: [{ name: "label", hasDefault: false }] },
            range: {},
          },
        ],
      ]),
    };
    const fakeGraph = {
      getNode: jest.fn().mockImplementation((uri: vscode.Uri) => {
        if (uri.fsPath === "/proj/templates/macros.html") return macroNode;
        return { relations: { imports: [] } };
      }),
    } as any;
    (getInheritedScope as jest.Mock).mockResolvedValue([
      { name: "button", kind: "macro", originUri: macroUri, originRange: {} },
    ]);

    const fakeRoots = {} as any;
    const provider = new MacroCompletionProvider(fakeGraph, fakeRoots);
    const doc = makeDocument("", "{{ bu", 5);
    const items = await provider.provideCompletionItems(doc, { line: 0, character: 5 } as any);
    expect(items).not.toBeNull();
    expect(items!.map((i: any) => i.label)).toContain("button");
  });

  it("handles namespace dot-trigger and returns empty when node not in graph", async () => {
    const fakeGraph = { getNode: jest.fn().mockReturnValue(undefined) } as any;
    const fakeRoots = { get: jest.fn().mockResolvedValue([]) } as any;
    const provider = new MacroCompletionProvider(fakeGraph, fakeRoots);
    const doc = makeDocument("", "{{ forms.", 9);
    const items = await provider.provideCompletionItems(
      doc,
      { line: 0, character: 9 } as any,
      undefined,
      { triggerCharacter: "." } as any
    );
    expect(items).toEqual([]);
  });

  it("returns empty cross-file when node is not indexed", async () => {
    const fakeGraph = { getNode: jest.fn().mockReturnValue(undefined) } as any;
    const fakeRoots = {} as any;
    const provider = new MacroCompletionProvider(fakeGraph, fakeRoots);
    const doc = makeDocument("", "{{ x", 4);
    const items = await provider.provideCompletionItems(doc, { line: 0, character: 4 } as any);
    expect(items).toEqual([]);
  });

  it("returns namespace macro completions when nsImport + target are resolved", async () => {
    const { resolveToNode } = jest.requireMock("../../src/resolver/inheritedScope");
    const macroUri = vscode.Uri.file("/proj/templates/forms.html");
    const macroNode = {
      uri: macroUri,
      macros: new Map([
        [
          "input",
          {
            definition: { name: "input", params: [{ name: "name", hasDefault: false }] },
            range: {},
          },
        ],
      ]),
    };
    const pageNode = {
      relations: {
        imports: [{ kind: "import", alias: "forms", path: "forms.html" }],
      },
    };
    const fakeGraph = {
      getNode: jest.fn().mockImplementation((uri: vscode.Uri) => {
        if (uri.fsPath === "/proj/templates/forms.html") return macroNode;
        return pageNode;
      }),
    } as any;
    (resolveToNode as jest.Mock).mockReturnValue(macroNode);
    const fakeRoots = { get: jest.fn().mockResolvedValue(["/proj/templates"]) } as any;

    const provider = new MacroCompletionProvider(fakeGraph, fakeRoots);
    const doc = makeDocument("", "{{ forms.", 9);
    const items = await provider.provideCompletionItems(
      doc,
      { line: 0, character: 9 } as any,
      undefined,
      { triggerCharacter: "." } as any
    );
    expect(items).not.toBeNull();
    expect(items!.map((i: any) => i.label)).toContain("input");
  });

  it("returns empty namespace completions when nsImport is not found in imports", async () => {
    const pageNode = { relations: { imports: [] } };
    const fakeGraph = { getNode: jest.fn().mockReturnValue(pageNode) } as any;
    const fakeRoots = { get: jest.fn().mockResolvedValue([]) } as any;

    const provider = new MacroCompletionProvider(fakeGraph, fakeRoots);
    const doc = makeDocument("", "{{ unknown.", 11);
    const items = await provider.provideCompletionItems(
      doc,
      { line: 0, character: 11 } as any,
      undefined,
      { triggerCharacter: "." } as any
    );
    expect(items).toEqual([]);
  });
});

describe("MacroSignatureHelpProvider (with graph — cross-file namespaced)", () => {
  const { getInheritedScope } = jest.requireMock("../../src/resolver/inheritedScope");

  beforeEach(() => {
    (getInheritedScope as jest.Mock).mockReset();
    (vscode.workspace.getWorkspaceFolder as jest.Mock).mockReturnValue(null);
  });

  it("resolves signature for an inherited macro when graph is wired", async () => {
    const macroUri = vscode.Uri.file("/proj/macros.html");
    const macroNode = {
      macros: new Map([
        [
          "card",
          {
            definition: { name: "card", params: [{ name: "title", hasDefault: false }] },
            range: {},
          },
        ],
      ]),
    };
    const fakeGraph = {
      getNode: jest.fn().mockReturnValue(macroNode),
    } as any;
    (getInheritedScope as jest.Mock).mockResolvedValue([
      { name: "card", kind: "macro", originUri: macroUri, originRange: {} },
    ]);

    const fakeRoots = {} as any;
    const provider = new MacroSignatureHelpProvider(fakeGraph, fakeRoots);
    const line = "{{ card(";
    const doc = makeDocument("", line, line.length);
    const help = (await provider.provideSignatureHelp(doc, {
      line: 0,
      character: line.length,
    } as any)) as any;
    expect(help).not.toBeNull();
    expect(help.signatures[0].label).toBe("card(title)");
  });

  it("returns null for inherited macro when not found in graph", async () => {
    const fakeGraph = { getNode: jest.fn().mockReturnValue(undefined) } as any;
    (getInheritedScope as jest.Mock).mockResolvedValue([]);
    const fakeRoots = {} as any;
    const provider = new MacroSignatureHelpProvider(fakeGraph, fakeRoots);
    const line = "{{ unknown(";
    const doc = makeDocument("", line, line.length);
    const help = await provider.provideSignatureHelp(doc, {
      line: 0,
      character: line.length,
    } as any);
    expect(help).toBeNull();
  });

  it("resolves namespaced macro signature when nsImport + target are found", async () => {
    const { resolveToNode } = jest.requireMock("../../src/resolver/inheritedScope");
    const macroUri = vscode.Uri.file("/proj/templates/forms.html");
    const macroNode = {
      uri: macroUri,
      macros: new Map([
        [
          "input",
          {
            definition: { name: "input", params: [{ name: "name", hasDefault: false }] },
            range: {},
          },
        ],
      ]),
      relations: { imports: [] },
    };
    const pageNode = {
      macros: new Map(),
      relations: {
        imports: [{ kind: "import", alias: "forms", path: "forms.html" }],
      },
    };
    const fakeGraph = {
      getNode: jest.fn().mockImplementation((uri: vscode.Uri) => {
        if (uri.fsPath === "/proj/templates/forms.html") return macroNode;
        return pageNode;
      }),
    } as any;
    (resolveToNode as jest.Mock).mockReturnValue(macroNode);
    const fakeRoots = { get: jest.fn().mockResolvedValue(["/proj/templates"]) } as any;

    const provider = new MacroSignatureHelpProvider(fakeGraph, fakeRoots);
    const line = "{{ forms.input(";
    const doc = makeDocument("", line, line.length);
    const help = (await provider.provideSignatureHelp(doc, {
      line: 0,
      character: line.length,
    } as any)) as any;
    expect(help).not.toBeNull();
    expect(help.signatures[0].label).toBe("input(name)");
  });

  it("returns null for namespaced call when nsImport is not in imports", async () => {
    const pageNode = { macros: new Map(), relations: { imports: [] } };
    const fakeGraph = { getNode: jest.fn().mockReturnValue(pageNode) } as any;
    const fakeRoots = { get: jest.fn().mockResolvedValue([]) } as any;
    const provider = new MacroSignatureHelpProvider(fakeGraph, fakeRoots);
    const line = "{{ unknown.macro(";
    const doc = makeDocument("", line, line.length);
    const help = await provider.provideSignatureHelp(doc, {
      line: 0,
      character: line.length,
    } as any);
    expect(help).toBeNull();
  });
});
