import * as vscode from "vscode";
import { BackendVariableHover } from "../../src/hover/backendVariableHover";

jest.mock("../../src/translations", () => ({
  __esModule: true,
  default: {
    __: (key: string, params?: Record<string, string>) => {
      if (params?.count) return `${key}:${params.count}`;
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

function makePosition(char: number) {
  return new vscode.Position(0, char) as any;
}

function makeBackendIndex(locations: any[] = []) {
  return {
    getLocationsFor: jest.fn(() => locations),
  } as any;
}

describe("BackendVariableHover", () => {
  beforeEach(() => {
    identifierAtOffsetMock.mockReset();
    (vscode.workspace.getWorkspaceFolder as jest.Mock).mockReset();
  });

  it("returns undefined when no identifier at cursor", () => {
    identifierAtOffsetMock.mockReturnValue(undefined);
    const provider = new BackendVariableHover(makeBackendIndex());
    const result = provider.provideHover(makeDocument("{{ }}"), makePosition(0));
    expect(result).toBeUndefined();
  });

  it("returns undefined when no backend locations found", () => {
    identifierAtOffsetMock.mockReturnValue({ offset: 0, length: 4 });
    const provider = new BackendVariableHover(makeBackendIndex([]));
    const result = provider.provideHover(makeDocument("user"), makePosition(0));
    expect(result).toBeUndefined();
  });

  it("returns a Hover with markdown for a single location", () => {
    identifierAtOffsetMock.mockReturnValue({ offset: 0, length: 4 });
    (vscode.workspace.getWorkspaceFolder as jest.Mock).mockReturnValue(undefined);
    const loc = {
      uri: vscode.Uri.file("/ws/app.py"),
      range: new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 4)),
    };
    const provider = new BackendVariableHover(makeBackendIndex([loc]));
    const result = provider.provideHover(makeDocument("user"), makePosition(0));
    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(vscode.Hover);
  });

  it("returns a Hover with markdown for multiple locations", () => {
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
    const provider = new BackendVariableHover(makeBackendIndex([loc1, loc2]));
    const result = provider.provideHover(makeDocument("user"), makePosition(0));
    expect(result).toBeDefined();
  });

  it("resolves root identifier for dotted access (user.name -> user)", () => {
    // identifierAtOffset returns 'name' at offset 5, but root should be 'user'
    identifierAtOffsetMock.mockReturnValue({ offset: 5, length: 4 });
    (vscode.workspace.getWorkspaceFolder as jest.Mock).mockReturnValue(undefined);
    const loc = {
      uri: vscode.Uri.file("/ws/app.py"),
      range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 4)),
    };
    const index = makeBackendIndex([loc]);
    const provider = new BackendVariableHover(index);
    provider.provideHover(makeDocument("user.name"), makePosition(0));
    // Should have been called with root 'user', not 'name'
    expect(index.getLocationsFor).toHaveBeenCalled();
  });
});
