import { MacroCompletionProvider, MacroSignatureHelpProvider } from "../../src/completion/macro";

jest.mock("../../src/translations", () => ({
  __esModule: true,
  default: {
    __: (key: string) => key,
  },
  setupI18n: jest.fn(),
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
    uri: { fsPath: "/x.html" },
  } as any;
}

describe("MacroCompletionProvider", () => {
  const provider = new MacroCompletionProvider();

  it("returns null outside print context", () => {
    const doc = makeDocument(TEMPLATE, "<p>hello", 8);
    expect(provider.provideCompletionItems(doc, { line: 0, character: 8 } as any)).toBeNull();
  });

  it("returns local macros inside {{ … }} with snippet body", () => {
    const line = "{{ ca";
    const doc = makeDocument(TEMPLATE, line, line.length);
    const items = provider.provideCompletionItems(doc, { line: 0, character: line.length } as any);
    expect(items).not.toBeNull();
    expect(items!.map((i: any) => i.label).sort()).toEqual(["alert", "card"]);
    const card = items!.find((i: any) => i.label === "card")!;
    expect(card.detail).toBe("card(title, body = …)");
    expect((card.insertText as any).value).toBe("card(${1:title}, ${2:body})");
  });

  it("emits empty list when document has no macros", () => {
    const doc = makeDocument("plain", "{{ x", 4);
    const items = provider.provideCompletionItems(doc, { line: 0, character: 4 } as any);
    expect(items).toEqual([]);
  });
});

describe("MacroSignatureHelpProvider", () => {
  const provider = new MacroSignatureHelpProvider();

  it("returns null when not inside a call", () => {
    const doc = makeDocument(TEMPLATE, "{{ card", 7);
    expect(provider.provideSignatureHelp(doc, { line: 0, character: 7 } as any)).toBeNull();
  });

  it("returns null for namespaced calls (Pro territory)", () => {
    const line = "{{ forms.card(";
    const doc = makeDocument(TEMPLATE, line, line.length);
    expect(
      provider.provideSignatureHelp(doc, { line: 0, character: line.length } as any)
    ).toBeNull();
  });

  it("returns null when macro name is unknown", () => {
    const line = "{{ unknownMacro(";
    const doc = makeDocument(TEMPLATE, line, line.length);
    expect(
      provider.provideSignatureHelp(doc, { line: 0, character: line.length } as any)
    ).toBeNull();
  });

  it("builds a signature for a known local macro", () => {
    const line = "{{ card(";
    const doc = makeDocument(TEMPLATE, line, line.length);
    const help = provider.provideSignatureHelp(doc, {
      line: 0,
      character: line.length,
    } as any) as any;
    expect(help).not.toBeNull();
    expect(help.signatures[0].label).toBe("card(title, body = …)");
    expect(help.activeParameter).toBe(0);
    expect(help.signatures[0].parameters).toHaveLength(2);
    expect(help.signatures[0].parameters[0].label).toBe("title");
    expect(help.signatures[0].parameters[1].label).toBe("body = …");
  });

  it("advances activeParameter on commas", () => {
    const line = "{{ card(title, ";
    const doc = makeDocument(TEMPLATE, line, line.length);
    const help = provider.provideSignatureHelp(doc, {
      line: 0,
      character: line.length,
    } as any) as any;
    expect(help).not.toBeNull();
    expect(help.activeParameter).toBe(1);
  });
});
