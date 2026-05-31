import * as vscode from "vscode";
import { InheritedVariableActions } from "../../src/codeActions/inheritedVariableActions";

jest.mock("../../src/translations", () => ({
  __esModule: true,
  default: {
    __: (key: string, params?: Record<string, string>) => {
      if (params?.name) return `${key}:${params.name}`;
      return key;
    },
  },
}));

jest.mock("../../src/resolver/inheritedScope", () => ({
  getInheritedScope: jest.fn(),
}));

jest.mock("../../src/resolver/templateGraphIndex", () => ({
  TemplateGraphIndex: jest.fn(),
}));

jest.mock("../../src/resolver/templateRoots", () => ({
  TemplateRootsProvider: jest.fn(),
}));

import { getInheritedScope } from "../../src/resolver/inheritedScope";

const getInheritedScopeMock = getInheritedScope as jest.Mock;

function makeDiagnostic(code: string, message: string) {
  const d = new vscode.Diagnostic(
    new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 5)),
    message,
    vscode.DiagnosticSeverity.Warning
  ) as any;
  d.code = code;
  return d;
}

describe("InheritedVariableActions", () => {
  let provider: InheritedVariableActions;
  const fakeDocument = { uri: vscode.Uri.file("/proj/page.html") } as any;

  beforeEach(() => {
    getInheritedScopeMock.mockReset();
    provider = new InheritedVariableActions({} as any, {} as any);
  });

  it("returns empty array when no JHE0001 diagnostics", async () => {
    const context = { diagnostics: [makeDiagnostic("JHE1101", "some error")] } as any;
    const result = await provider.provideCodeActions(fakeDocument, {} as any, context);
    expect(result).toEqual([]);
    expect(getInheritedScopeMock).not.toHaveBeenCalled();
  });

  it("returns empty array when inherited scope is empty", async () => {
    getInheritedScopeMock.mockResolvedValue([]);
    const context = {
      diagnostics: [makeDiagnostic("JHE0001", "Variable 'user' is used but not set")],
    } as any;
    const result = await provider.provideCodeActions(fakeDocument, {} as any, context);
    expect(result).toEqual([]);
  });

  it("returns goto + suppress actions when variable is found in inherited scope", async () => {
    const originUri = vscode.Uri.file("/proj/templates/base.html");
    const originRange = new vscode.Range(
      new vscode.Position(2, 4),
      new vscode.Position(2, 8)
    );
    getInheritedScopeMock.mockResolvedValue([
      { name: "user", kind: "set", originUri, originRange, viaPath: "base.html" },
    ]);
    const context = {
      diagnostics: [makeDiagnostic("JHE0001", "Variable 'user' is used but not set")],
    } as any;
    const result = await provider.provideCodeActions(fakeDocument, {} as any, context);
    expect(result.length).toBe(2);
    const gotoAction = result[0];
    expect(gotoAction.isPreferred).toBe(true);
    expect(gotoAction.command?.command).toBe("jinja2-html-enhancer.gotoDefinition");
    const suppressAction = result[1];
    expect(suppressAction.command?.command).toBe("extension.saveVariable");
  });

  it("returns empty when JHE0001 variable name cannot be parsed from message", async () => {
    getInheritedScopeMock.mockResolvedValue([
      {
        name: "user",
        kind: "set",
        originUri: vscode.Uri.file("/base.html"),
        originRange: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 4)),
      },
    ]);
    const context = {
      diagnostics: [makeDiagnostic("JHE0001", "Malformed diagnostic with no variable name")],
    } as any;
    const result = await provider.provideCodeActions(fakeDocument, {} as any, context);
    // extractVariableName returns undefined for malformed messages → no actions for this diagnostic
    expect(result).toEqual([]);
  });

  it("returns empty when inherited scope has variable but not matching the diagnostic", async () => {
    getInheritedScopeMock.mockResolvedValue([
      {
        name: "otherVar",
        kind: "set",
        originUri: vscode.Uri.file("/base.html"),
        originRange: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 8)),
      },
    ]);
    const context = {
      diagnostics: [makeDiagnostic("JHE0001", "Variable 'user' is used but not set")],
    } as any;
    const result = await provider.provideCodeActions(fakeDocument, {} as any, context);
    expect(result).toEqual([]);
  });
});
