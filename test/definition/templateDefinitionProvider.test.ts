import * as vscode from "vscode";
import { TemplateDefinitionProvider } from "../../src/definition/templateDefinitionProvider";
import { TemplateRootsProvider } from "../../src/resolver/templateRoots";

const statMock = vscode.workspace.fs.stat as jest.Mock;

function makeRoots(roots: string[]): TemplateRootsProvider {
  return { get: async () => roots } as unknown as TemplateRootsProvider;
}

function makeDocument(text: string, fsPath: string) {
  return {
    getText: () => text,
    // Map a Position back to the byte offset of the template path so the
    // provider's hit-test lands inside it.
    offsetAt: (pos: { line: number; character: number }) => pos.character,
    uri: { fsPath },
  } as any;
}

describe("TemplateDefinitionProvider", () => {
  beforeEach(() => statMock.mockReset());

  it("jumps to the resolved file when the cursor is on an extends path", async () => {
    const text = `{% extends "base.html" %}`;
    const offset = text.indexOf("base.html");
    statMock.mockResolvedValue({ type: 1 });

    const provider = new TemplateDefinitionProvider(makeRoots([]));
    const result = await provider.provideDefinition(
      makeDocument(text, "/proj/t/page.html"),
      new vscode.Position(0, offset)
    );

    expect(result).toBeInstanceOf(vscode.Location);
    expect((result as vscode.Location).uri.fsPath).toBe("/proj/t/base.html");
  });

  it("resolves include paths too", async () => {
    const text = `{% include "partials/nav.html" %}`;
    const offset = text.indexOf("partials/nav.html");
    statMock.mockResolvedValue({ type: 1 });

    const provider = new TemplateDefinitionProvider(makeRoots([]));
    const result = await provider.provideDefinition(
      makeDocument(text, "/proj/t/page.html"),
      new vscode.Position(0, offset)
    );

    expect((result as vscode.Location).uri.fsPath).toBe("/proj/t/partials/nav.html");
  });

  it("returns undefined when the cursor is not on a path", async () => {
    const text = `{% extends "base.html" %}`;
    const provider = new TemplateDefinitionProvider(makeRoots([]));
    const result = await provider.provideDefinition(
      makeDocument(text, "/proj/t/page.html"),
      new vscode.Position(0, 0) // on `{`
    );
    expect(result).toBeUndefined();
  });

  it("returns undefined when the path cannot be resolved", async () => {
    const text = `{% extends "missing.html" %}`;
    const offset = text.indexOf("missing.html");
    statMock.mockRejectedValue(new Error("ENOENT"));

    const provider = new TemplateDefinitionProvider(makeRoots([]));
    const result = await provider.provideDefinition(
      makeDocument(text, "/proj/t/page.html"),
      new vscode.Position(0, offset)
    );
    expect(result).toBeUndefined();
  });
});
