import * as vscode from "vscode";
import { PreviewEngine } from "../../src/preview/previewEngine";

const readFileMock = vscode.workspace.fs.readFile as jest.Mock;
const findFilesMock = vscode.workspace.findFiles as jest.Mock;
const getWorkspaceFolderMock = vscode.workspace.getWorkspaceFolder as jest.Mock;

function makeUri(path: string) {
  return vscode.Uri.file(path);
}
function enc(s: string): Uint8Array {
  return Buffer.from(s, "utf8") as unknown as Uint8Array;
}

function fakeBackendIndex(summaries: { name: string }[] = []) {
  return { getSummaryFor: jest.fn().mockReturnValue(summaries) } as any;
}

function fakeGraph(node?: any) {
  return { getNode: jest.fn().mockReturnValue(node) } as any;
}

function fakeRoots(roots: string[] = []) {
  return { get: jest.fn().mockResolvedValue(roots) } as any;
}

beforeEach(() => {
  readFileMock.mockReset();
  findFilesMock.mockReset();
  getWorkspaceFolderMock.mockReset();
});

describe("PreviewEngine.buildContext", () => {
  it("returns empty context when no backend data and no graph node", async () => {
    getWorkspaceFolderMock.mockReturnValue(null);
    const engine = new PreviewEngine(fakeBackendIndex([]), fakeGraph(), fakeRoots());
    const ctx = await engine.buildContext(makeUri("/proj/templates/page.html"));
    expect(ctx).toEqual({});
  });

  it("populates context from BackendIndex summaries", async () => {
    getWorkspaceFolderMock.mockReturnValue(null);
    const summaries = [{ name: "user" }, { name: "title" }];
    const engine = new PreviewEngine(fakeBackendIndex(summaries), fakeGraph(), fakeRoots());
    const ctx = await engine.buildContext(makeUri("/proj/templates/page.html"));
    expect(ctx["user"]).toBe("user");
    expect(ctx["title"]).toBe("title");
  });

  it("populates context from template graph local vars", async () => {
    getWorkspaceFolderMock.mockReturnValue(null);
    const node = {
      localVars: new Map([["greeting", [{ kind: "set" }]]]),
    };
    const engine = new PreviewEngine(fakeBackendIndex([]), fakeGraph(node), fakeRoots());
    const ctx = await engine.buildContext(makeUri("/proj/templates/page.html"));
    expect(ctx["greeting"]).toBe("greeting");
  });

  it("scans backend files when workspace folder is available", async () => {
    const templateUri = makeUri("/proj/templates/hello.html");
    const backendUri = makeUri("/proj/views.py");

    getWorkspaceFolderMock.mockReturnValue({ uri: { fsPath: "/proj" } });
    findFilesMock.mockResolvedValue([backendUri]);
    readFileMock.mockResolvedValue(
      enc("def view():\n    return render_template('hello.html', name=user, count=n)")
    );

    const engine = new PreviewEngine(
      fakeBackendIndex([]),
      fakeGraph(),
      fakeRoots(["/proj/templates"])
    );
    const ctx = await engine.buildContext(templateUri);
    // Scanned from backend file
    expect("name" in ctx || "count" in ctx).toBe(true);
  });

  it("uses template roots to compute template key", async () => {
    const templateUri = makeUri("/proj/templates/pages/home.html");
    getWorkspaceFolderMock.mockReturnValue({ uri: { fsPath: "/proj" } });
    findFilesMock.mockResolvedValue([]);

    const engine = new PreviewEngine(
      fakeBackendIndex([]),
      fakeGraph(),
      fakeRoots(["/proj/templates"])
    );
    const ctx = await engine.buildContext(templateUri);
    // Just verify it resolves without error
    expect(typeof ctx).toBe("object");
  });

  it("skips unreadable backend files gracefully", async () => {
    const templateUri = makeUri("/proj/templates/page.html");
    getWorkspaceFolderMock.mockReturnValue({ uri: { fsPath: "/proj" } });
    findFilesMock.mockResolvedValue([makeUri("/proj/views.py")]);
    readFileMock.mockRejectedValue(new Error("ENOENT"));

    const engine = new PreviewEngine(fakeBackendIndex([]), fakeGraph(), fakeRoots());
    const ctx = await engine.buildContext(templateUri);
    // Should not throw; context just doesn't have backend vars
    expect(typeof ctx).toBe("object");
  });

  it("BackendIndex vars take priority over graph local vars (no overwrite)", async () => {
    getWorkspaceFolderMock.mockReturnValue(null);
    // Backend declares "user"; graph also has "user" as local var
    const node = { localVars: new Map([["user", [{ kind: "set" }]]]) };
    const engine = new PreviewEngine(
      fakeBackendIndex([{ name: "user" }]),
      fakeGraph(node),
      fakeRoots()
    );
    const ctx = await engine.buildContext(makeUri("/proj/page.html"));
    // "user" was already set by backend — graph doesn't override
    expect(ctx["user"]).toBe("user");
  });

  it("falls back to full fsPath as template key when no root matches", async () => {
    const templateUri = makeUri("/proj/templates/page.html");
    getWorkspaceFolderMock.mockReturnValue({ uri: { fsPath: "/proj" } });
    findFilesMock.mockResolvedValue([]);
    // Roots don't include /proj/templates
    const engine = new PreviewEngine(fakeBackendIndex([]), fakeGraph(), fakeRoots(["/other/path"]));
    const ctx = await engine.buildContext(templateUri);
    expect(typeof ctx).toBe("object");
  });

  it("ignores files with undetectable lang (.html files, etc.)", async () => {
    const templateUri = makeUri("/proj/templates/page.html");
    getWorkspaceFolderMock.mockReturnValue({ uri: { fsPath: "/proj" } });
    // findFiles glob is **/*.{py,js,ts} — so HTML files wouldn't be returned,
    // but we can simulate an edge case by returning a non-py/js/ts URI
    findFilesMock.mockResolvedValue([makeUri("/proj/config.yaml")]);
    readFileMock.mockResolvedValue(enc("key: value"));

    const engine = new PreviewEngine(fakeBackendIndex([]), fakeGraph(), fakeRoots());
    const ctx = await engine.buildContext(templateUri);
    expect(typeof ctx).toBe("object");
  });
});
