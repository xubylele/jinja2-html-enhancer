import * as vscode from "vscode";
import {
  TemplatePathDiagnostics,
  JHE1101,
  JHE1102,
} from "../../src/diagnostics/templatePathDiagnostics";
import { TemplateRootsProvider } from "../../src/resolver/templateRoots";

jest.mock("../../src/translations", () => ({
  __esModule: true,
  default: { __: (key: string) => key },
  setupI18n: jest.fn(),
}));

const statMock = vscode.workspace.fs.stat as jest.Mock;
const readFileMock = vscode.workspace.fs.readFile as jest.Mock;
const collectionFactory = vscode.languages.createDiagnosticCollection as jest.Mock;

function makeRoots(roots: string[] = []): TemplateRootsProvider {
  return { get: async () => roots } as unknown as TemplateRootsProvider;
}

function makeDocument(text: string, fsPath: string, languageId = "html") {
  return {
    languageId,
    getText: () => text,
    positionAt: (offset: number) => new vscode.Position(0, offset),
    uri: { fsPath },
  } as any;
}

/** Diagnostics pushed by the most recently constructed instance. */
function lastSetCall() {
  const collection = collectionFactory.mock.results.at(-1)!.value;
  const calls = (collection.set as jest.Mock).mock.calls;
  return calls.at(-1);
}

describe("TemplatePathDiagnostics", () => {
  beforeEach(() => {
    statMock.mockReset();
    readFileMock.mockReset();
    collectionFactory.mockClear();
  });

  it("flags an unresolved include path with JHE1101 (warning)", async () => {
    statMock.mockRejectedValue(new Error("ENOENT"));
    const diag = new TemplatePathDiagnostics(makeRoots());

    await diag.analyzeDocument(makeDocument(`{% include "missing.html" %}`, "/t/page.html"));

    const [, diagnostics] = lastSetCall();
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].code).toBe(JHE1101);
    expect(diagnostics[0].severity).toBe(vscode.DiagnosticSeverity.Warning);
  });

  it("flags a circular extends chain with JHE1102 (error)", async () => {
    statMock.mockResolvedValue({ type: 1 }); // every candidate exists
    readFileMock.mockImplementation(async (uri: { fsPath: string }) => {
      const byPath: Record<string, string> = {
        "/t/a.html": `{% extends "b.html" %}`,
        "/t/b.html": `{% extends "a.html" %}`,
      };
      return Buffer.from(byPath[uri.fsPath] ?? "");
    });

    const diag = new TemplatePathDiagnostics(makeRoots());
    await diag.analyzeDocument(makeDocument(`{% extends "b.html" %}`, "/t/a.html"));

    const [, diagnostics] = lastSetCall();
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].code).toBe(JHE1102);
    expect(diagnostics[0].severity).toBe(vscode.DiagnosticSeverity.Error);
  });

  it("emits no diagnostics for a fully resolvable, acyclic template", async () => {
    statMock.mockResolvedValue({ type: 1 });
    readFileMock.mockResolvedValue(Buffer.from("")); // parent has no extends

    const diag = new TemplatePathDiagnostics(makeRoots());
    await diag.analyzeDocument(makeDocument(`{% extends "base.html" %}`, "/t/page.html"));

    const [, diagnostics] = lastSetCall();
    expect(diagnostics).toHaveLength(0);
  });

  it("ignores non-template documents", async () => {
    const diag = new TemplatePathDiagnostics(makeRoots());
    const collection = collectionFactory.mock.results.at(-1)!.value;

    await diag.analyzeDocument(makeDocument(`{% include "x.html" %}`, "/t/notes.txt", "plaintext"));

    expect(collection.set as jest.Mock).not.toHaveBeenCalled();
  });
});
