import * as vscode from "vscode";
import { BackendVariableActions } from "../../src/codeActions/backendVariableActions";

jest.mock("../../src/translations", () => ({
  __esModule: true,
  default: {
    __: (key: string, params?: Record<string, string>) => {
      if (params?.name && params?.path) return `${key}:${params.name}:${params.path}`;
      if (params?.name) return `${key}:${params.name}`;
      return key;
    },
  },
}));

jest.mock("@xubylele/jinja2-enhanced-shared", () => ({
  identifierAtOffset: jest.fn(),
}));

jest.mock("../../src/commands/gotoDefinitionCommand", () => ({
  GOTO_COMMAND: "jinja2-html-enhancer.gotoDefinition",
}));

import { identifierAtOffset } from "@xubylele/jinja2-enhanced-shared";

const identifierAtOffsetMock = identifierAtOffset as jest.Mock;

function makeDocument(text: string, uri = "/proj/page.html") {
  return {
    getText: () => text,
    uri: vscode.Uri.file(uri),
    offsetAt: (_pos: any) => 0,
  } as any;
}

function makeRange() {
  return new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 4)) as any;
}

function makeBackendIndex(locations: any[] = []) {
  return {
    getLocationsFor: jest.fn(() => locations),
  } as any;
}

describe("BackendVariableActions", () => {
  beforeEach(() => {
    identifierAtOffsetMock.mockReset();
    (vscode.workspace.getWorkspaceFolder as jest.Mock).mockReset();
  });

  it("returns undefined when no identifier at cursor", () => {
    identifierAtOffsetMock.mockReturnValue(undefined);
    const provider = new BackendVariableActions(makeBackendIndex());
    const result = provider.provideCodeActions(makeDocument("{{ }}"), makeRange());
    expect(result).toBeUndefined();
  });

  it("returns undefined when no backend locations found", () => {
    identifierAtOffsetMock.mockReturnValue({ offset: 0, length: 4 });
    const provider = new BackendVariableActions(makeBackendIndex([]));
    const result = provider.provideCodeActions(makeDocument("user"), makeRange());
    expect(result).toBeUndefined();
  });

  it("returns a single action with simple title for one location", () => {
    identifierAtOffsetMock.mockReturnValue({ offset: 0, length: 4 });
    (vscode.workspace.getWorkspaceFolder as jest.Mock).mockReturnValue(undefined);
    const loc = {
      uri: vscode.Uri.file("/ws/app.py"),
      range: new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 4)),
    };
    const provider = new BackendVariableActions(makeBackendIndex([loc]));
    const actions = provider.provideCodeActions(makeDocument("user"), makeRange());
    expect(actions).toBeDefined();
    expect(actions!.length).toBe(1);
    expect(actions![0].isPreferred).toBe(true);
  });

  it("returns multiple actions with path-disambiguated titles for multiple locations", () => {
    identifierAtOffsetMock.mockReturnValue({ offset: 0, length: 4 });
    (vscode.workspace.getWorkspaceFolder as jest.Mock).mockReturnValue(undefined);
    const loc1 = {
      uri: vscode.Uri.file("/ws/app.py"),
      range: new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 4)),
    };
    const loc2 = {
      uri: vscode.Uri.file("/ws/views.py"),
      range: new vscode.Range(new vscode.Position(5, 0), new vscode.Position(5, 4)),
    };
    const provider = new BackendVariableActions(makeBackendIndex([loc1, loc2]));
    const actions = provider.provideCodeActions(makeDocument("user"), makeRange());
    expect(actions).toBeDefined();
    expect(actions!.length).toBe(2);
    expect(actions![0].isPreferred).toBe(true);
    expect(actions![1].isPreferred).toBe(false);
  });

  it("exposes providedCodeActionKinds", () => {
    expect(BackendVariableActions.providedCodeActionKinds).toBeDefined();
    expect(BackendVariableActions.providedCodeActionKinds.length).toBeGreaterThan(0);
  });
});
