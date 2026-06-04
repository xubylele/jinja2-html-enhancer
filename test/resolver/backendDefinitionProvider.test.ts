import * as vscode from "vscode";
import { BackendDefinitionProvider } from "../../src/resolver/backendDefinitionProvider";

jest.mock("@xubylele/jinja2-enhanced-shared", () => ({
  identifierAtOffset: jest.fn(),
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

describe("BackendDefinitionProvider", () => {
  beforeEach(() => {
    identifierAtOffsetMock.mockReset();
  });

  it("returns undefined when no identifier at cursor", () => {
    identifierAtOffsetMock.mockReturnValue(undefined);
    const provider = new BackendDefinitionProvider(makeBackendIndex());
    const result = provider.provideDefinition(makeDocument("{{ }}"), makePosition(0));
    expect(result).toBeUndefined();
  });

  it("returns undefined when no backend locations found", () => {
    identifierAtOffsetMock.mockReturnValue({ offset: 0, length: 4 });
    const provider = new BackendDefinitionProvider(makeBackendIndex([]));
    const result = provider.provideDefinition(makeDocument("user"), makePosition(0));
    expect(result).toBeUndefined();
  });

  it("returns locations mapped to vscode.Location for a match", () => {
    identifierAtOffsetMock.mockReturnValue({ offset: 0, length: 4 });
    const loc = {
      uri: vscode.Uri.file("/ws/app.py"),
      range: new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 4)),
    };
    const provider = new BackendDefinitionProvider(makeBackendIndex([loc]));
    const result = provider.provideDefinition(makeDocument("user"), makePosition(0));
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect((result as vscode.Location[]).length).toBe(1);
    expect((result as vscode.Location[])[0]).toBeInstanceOf(vscode.Location);
  });

  it("resolves root identifier for dotted access (user.name)", () => {
    identifierAtOffsetMock.mockReturnValue({ offset: 5, length: 4 });
    const loc = {
      uri: vscode.Uri.file("/ws/app.py"),
      range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 4)),
    };
    const index = makeBackendIndex([loc]);
    const provider = new BackendDefinitionProvider(index);
    provider.provideDefinition(makeDocument("user.name"), makePosition(0));
    expect(index.getLocationsFor).toHaveBeenCalled();
  });

  it("returns undefined when root identifier starts with non-alpha char", () => {
    identifierAtOffsetMock.mockReturnValue({ offset: 1, length: 4 });
    const provider = new BackendDefinitionProvider(makeBackendIndex());
    // text starting with digit
    const result = provider.provideDefinition(makeDocument("1user"), makePosition(0));
    expect(result).toBeUndefined();
  });
});
