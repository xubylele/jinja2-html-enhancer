import * as vscode from "vscode";
import { TypeHintHover } from "../../src/hover/typeHintHover";

jest.mock("../../src/translations", () => ({
  __esModule: true,
  default: { __: (key: string) => key },
}));

jest.mock("../../src/resolver/inheritedScope", () => ({
  getInheritedScope: jest.fn().mockResolvedValue([]),
}));

jest.mock("@xubylele/jinja2-enhanced-shared", () => ({
  ...jest.requireActual("@xubylele/jinja2-enhanced-shared"),
  identifierAtOffset: jest.fn(),
}));

import { identifierAtOffset } from "@xubylele/jinja2-enhanced-shared";
import { getInheritedScope } from "../../src/resolver/inheritedScope";

const identMock = identifierAtOffset as jest.Mock;
const inheritedMock = getInheritedScope as jest.Mock;
const readFileMock = vscode.workspace.fs.readFile as jest.Mock;

function makeDoc(text: string, uri = "/proj/page.html") {
  return {
    getText: () => text,
    uri: vscode.Uri.file(uri),
    offsetAt: (_p: any) => 3,
  } as any;
}

function makePos(char = 3) {
  return { line: 0, character: char } as any;
}

function fakeBackendIndex(locations: any[] = []) {
  return { getLocationsFor: jest.fn().mockReturnValue(locations) } as any;
}

function fakeGraph() {
  return { getNode: jest.fn().mockReturnValue(undefined) } as any;
}

function fakeRoots() {
  return { get: jest.fn().mockResolvedValue([]) } as any;
}

beforeEach(() => {
  identMock.mockReset();
  inheritedMock.mockReset();
  inheritedMock.mockResolvedValue([]);
  readFileMock.mockReset();
  (vscode.workspace.getWorkspaceFolder as jest.Mock).mockReturnValue(null);
});

describe("TypeHintHover", () => {
  it("returns undefined when no identifier at cursor", async () => {
    identMock.mockReturnValue(undefined);
    const provider = new TypeHintHover(fakeBackendIndex(), fakeGraph(), fakeRoots());
    const result = await provider.provideHover(makeDoc("{{ }}"), makePos());
    expect(result).toBeUndefined();
  });

  it("returns undefined when identifier has no recognizable root", async () => {
    identMock.mockReturnValue({ name: "123start", offset: 3 });
    const provider = new TypeHintHover(fakeBackendIndex(), fakeGraph(), fakeRoots());
    // Text starts with digit → getRootIdentifier returns undefined
    const result = await provider.provideHover(makeDoc("{{ 123start }}"), makePos());
    expect(result).toBeUndefined();
  });

  it("returns undefined when no hints can be collected", async () => {
    identMock.mockReturnValue({ name: "user", offset: 3 });
    const provider = new TypeHintHover(fakeBackendIndex([]), fakeGraph(), fakeRoots());
    const result = await provider.provideHover(makeDoc("{{ user }}"), makePos());
    expect(result).toBeUndefined();
  });

  it("returns hover when usage hint is found (member access)", async () => {
    identMock.mockReturnValue({ name: "user", offset: 3 });
    const provider = new TypeHintHover(fakeBackendIndex([]), fakeGraph(), fakeRoots());
    const doc = makeDoc("{{ user.name }} {{ user.email }}");
    const result = await provider.provideHover(doc, makePos());
    expect(result).toBeDefined();
    const md = (result as vscode.Hover).contents[0] as vscode.MarkdownString;
    expect(md.value).toContain("object"); // usage inferred as object type
  });

  it("shows Fields section for object type with fields", async () => {
    identMock.mockReturnValue({ name: "user", offset: 3 });
    const provider = new TypeHintHover(fakeBackendIndex([]), fakeGraph(), fakeRoots());
    const doc = makeDoc("{{ user.name }} {{ user.email }} {{ user.role }}");
    const result = await provider.provideHover(doc, makePos());
    expect(result).toBeDefined();
    const md = (result as vscode.Hover).contents[0] as vscode.MarkdownString;
    expect(md.value).toContain("hover.typeHint.fields"); // i18n key since mock returns key
    expect(md.value).toContain("`name`");
  });

  it("uses backend hint when backend has type info for the variable", async () => {
    identMock.mockReturnValue({ name: "count", offset: 3 });
    const backendUri = vscode.Uri.file("/proj/views.py");
    // Make readFile return Python code with type annotation
    readFileMock.mockResolvedValue(Buffer.from("count: int = 0", "utf8") as unknown as Uint8Array);
    const provider = new TypeHintHover(
      fakeBackendIndex([{ uri: backendUri, range: {} }]),
      fakeGraph(),
      fakeRoots()
    );
    const result = await provider.provideHover(makeDoc("{{ count }}"), makePos());
    expect(result).toBeDefined();
    const md = (result as vscode.Hover).contents[0] as vscode.MarkdownString;
    expect(md.value).toContain("number");
  });

  it("handles readFile errors gracefully (backend file unreadable)", async () => {
    identMock.mockReturnValue({ name: "user", offset: 3 });
    readFileMock.mockRejectedValue(new Error("ENOENT"));
    const backendUri = vscode.Uri.file("/proj/views.py");
    const provider = new TypeHintHover(
      fakeBackendIndex([{ uri: backendUri, range: {} }]),
      fakeGraph(),
      fakeRoots()
    );
    // No usage hint either → returns undefined
    const result = await provider.provideHover(makeDoc("{{ user }}"), makePos());
    expect(result).toBeUndefined();
  });

  it("includes inherited hint for a set variable in parent scope", async () => {
    identMock.mockReturnValue({ name: "title", offset: 3 });
    inheritedMock.mockResolvedValue([
      {
        name: "title",
        kind: "set",
        originUri: vscode.Uri.file("/proj/base.html"),
        originRange: {},
      },
    ]);
    const provider = new TypeHintHover(fakeBackendIndex([]), fakeGraph(), fakeRoots());
    const result = await provider.provideHover(makeDoc("{{ title }}"), makePos());
    expect(result).toBeDefined();
    // Inferred hint from inherited set → "any" type
    const md = (result as vscode.Hover).contents[0] as vscode.MarkdownString;
    expect(md.value).toContain("any");
  });
});
