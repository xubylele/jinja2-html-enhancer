import * as vscode from "vscode";
import { InheritedVariableHover } from "../../src/hover/inheritedVariableHover";

jest.mock("../../src/translations", () => ({
  __esModule: true,
  default: {
    __: (key: string) => key,
  },
}));

jest.mock("../../src/resolver/inheritedScope", () => ({
  getInheritedScope: jest.fn(),
}));

jest.mock("@xubylele/jinja2-enhanced-shared", () => ({
  identifierAtOffset: jest.fn(),
}));

import { identifierAtOffset } from "@xubylele/jinja2-enhanced-shared";
import { getInheritedScope } from "../../src/resolver/inheritedScope";

const getInheritedScopeMock = getInheritedScope as jest.Mock;
const identifierAtOffsetMock = identifierAtOffset as jest.Mock;

function makeDocument(text: string, uri = "/proj/page.html") {
  return {
    getText: () => text,
    uri: vscode.Uri.file(uri),
    offsetAt: (pos: any) => pos.character,
  } as any;
}

function makePosition(char: number) {
  return { line: 0, character: char } as any;
}

describe("InheritedVariableHover", () => {
  let provider: InheritedVariableHover;
  const fakeIndex = { getNode: jest.fn() } as any;
  const fakeRoots = {} as any;

  beforeEach(() => {
    getInheritedScopeMock.mockReset();
    identifierAtOffsetMock.mockReset();
    fakeIndex.getNode.mockReset();
    provider = new InheritedVariableHover(fakeIndex, fakeRoots);
  });

  it("returns undefined when no identifier at cursor", async () => {
    identifierAtOffsetMock.mockReturnValue(undefined);
    const result = await provider.provideHover(makeDocument("{{ }}"), makePosition(3));
    expect(result).toBeUndefined();
  });

  it("returns undefined when identifier is locally defined", async () => {
    identifierAtOffsetMock.mockReturnValue({ name: "title", offset: 3 });
    fakeIndex.getNode.mockReturnValue({
      localVars: new Map([["title", []]]),
      macros: new Map(),
    });
    const result = await provider.provideHover(makeDocument("{{ title }}"), makePosition(3));
    expect(result).toBeUndefined();
    expect(getInheritedScopeMock).not.toHaveBeenCalled();
  });

  it("returns undefined when variable is not in inherited scope", async () => {
    identifierAtOffsetMock.mockReturnValue({ name: "user", offset: 3 });
    fakeIndex.getNode.mockReturnValue({
      localVars: new Map(),
      macros: new Map(),
    });
    getInheritedScopeMock.mockResolvedValue([]);
    const result = await provider.provideHover(makeDocument("{{ user }}"), makePosition(3));
    expect(result).toBeUndefined();
  });

  it("returns hover with origin info for an inherited variable", async () => {
    identifierAtOffsetMock.mockReturnValue({ name: "site_name", offset: 3 });
    fakeIndex.getNode.mockReturnValue({
      localVars: new Map(),
      macros: new Map(),
    });
    const originUri = vscode.Uri.file("/proj/templates/base.html");
    const originRange = new vscode.Range(new vscode.Position(2, 4), new vscode.Position(2, 13));
    getInheritedScopeMock.mockResolvedValue([
      { name: "site_name", kind: "set", originUri, originRange, viaPath: "base.html" },
    ]);
    (vscode.workspace.getWorkspaceFolder as jest.Mock).mockReturnValue({
      uri: { fsPath: "/proj" },
    });

    const result = await provider.provideHover(makeDocument("{{ site_name }}"), makePosition(3));
    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(vscode.Hover);
    const md = (result as vscode.Hover).contents[0] as vscode.MarkdownString;
    expect(md.value).toContain("site_name");
  });
});
