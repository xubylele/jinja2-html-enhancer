import * as vscode from "vscode";
import { BackendIndex } from "../../src/intelligence/backendIndex";

const readFileMock = vscode.workspace.fs.readFile as jest.Mock;
const findFilesMock = vscode.workspace.findFiles as jest.Mock;

function makeUri(path: string) {
  return vscode.Uri.file(path);
}

function encodeContent(content: string): Uint8Array {
  return Buffer.from(content, "utf8") as unknown as Uint8Array;
}

describe("BackendIndex", () => {
  let index: BackendIndex;

  beforeEach(() => {
    readFileMock.mockReset();
    findFilesMock.mockReset();
    index = new BackendIndex();
  });

  afterEach(() => {
    index.dispose();
  });

  it("build() calls findFiles and indexes .py/.js/.ts files", async () => {
    const u1 = makeUri("/ws/app.py");
    const u2 = makeUri("/ws/views.py");
    findFilesMock.mockResolvedValue([u1, u2]);
    readFileMock
      .mockResolvedValueOnce(encodeContent(`render_template('hello.html', name=n)`))
      .mockResolvedValueOnce(encodeContent(`render(request, 'hello.html', {'count': c})`));

    await index.build();

    const vars = index.getVarsFor(vscode.Uri.file("/ws/templates/hello.html"));
    expect(vars).toBeDefined();
    expect([...vars!].sort()).toEqual(["count", "name"]);
  });

  it("update() reads a file and populates getVarsFor()", async () => {
    findFilesMock.mockResolvedValue([]);
    const uri = makeUri("/ws/app.py");
    readFileMock.mockResolvedValue(encodeContent(`render_template('hello.html', user=u)`));

    await index.update(uri);

    const vars = index.getVarsFor(vscode.Uri.file("/ws/hello.html"));
    expect(vars).toBeDefined();
    expect([...vars!]).toEqual(["user"]);
  });

  it("forget() removes a file's contribution", async () => {
    findFilesMock.mockResolvedValue([]);
    const uri = makeUri("/ws/a.py");
    readFileMock.mockResolvedValue(encodeContent(`render_template('only.html', x=1)`));

    await index.update(uri);
    expect(index.getVarsFor(vscode.Uri.file("/ws/only.html"))).toBeDefined();

    index.forget(uri);
    expect(index.getVarsFor(vscode.Uri.file("/ws/only.html"))).toBeUndefined();
  });

  it("getVarsFor() returns vars for a template URI", async () => {
    findFilesMock.mockResolvedValue([]);
    const uri = makeUri("/ws/app.py");
    readFileMock.mockResolvedValue(encodeContent(`render_template('hello.html', user=u, count=1)`));

    await index.update(uri);

    const vars = index.getVarsFor(vscode.Uri.file("/ws/hello.html"));
    expect(vars).toBeDefined();
    expect([...vars!].sort()).toEqual(["count", "user"]);
  });

  it("getSummaryFor() returns sorted summaries", async () => {
    findFilesMock.mockResolvedValue([]);
    const uri = makeUri("/ws/app.py");
    readFileMock.mockResolvedValue(
      encodeContent(`render_template('hello.html', user=u, count=1, alpha=a)`)
    );

    await index.update(uri);

    const summary = index.getSummaryFor(vscode.Uri.file("/ws/hello.html"));
    expect(summary.map((s) => s.name)).toEqual(["alpha", "count", "user"]);
  });

  it("getLocationsFor() returns locations for a specific var", async () => {
    findFilesMock.mockResolvedValue([]);
    const uri = makeUri("/ws/app.py");
    readFileMock.mockResolvedValue(encodeContent(`render_template('hello.html', user=u)`));

    await index.update(uri);

    const locs = index.getLocationsFor(vscode.Uri.file("/ws/hello.html"), "user");
    expect(locs).toHaveLength(1);
    expect(locs[0].uri).toBe(uri);
  });

  it("getVarsFor() matches by suffix on relative template keys", async () => {
    findFilesMock.mockResolvedValue([]);
    const uri = makeUri("/ws/app.py");
    readFileMock.mockResolvedValue(encodeContent(`render_template('auth/login.html', user=u)`));

    await index.update(uri);

    const vars = index.getVarsFor(vscode.Uri.file("/ws/templates/auth/login.html"));
    expect(vars).toBeDefined();
    expect([...vars!]).toEqual(["user"]);
  });

  it("update() only invalidates the changed file, preserves others", async () => {
    findFilesMock.mockResolvedValue([]);
    const a = makeUri("/ws/a.py");
    const b = makeUri("/ws/b.py");
    readFileMock
      .mockResolvedValueOnce(encodeContent(`render_template('p.html', alpha=1)`))
      .mockResolvedValueOnce(encodeContent(`render_template('p.html', beta=2)`));

    await index.update(a);
    await index.update(b);
    expect([...index.getVarsFor(vscode.Uri.file("/ws/p.html"))!].sort()).toEqual(["alpha", "beta"]);

    // Edit file a — drop alpha, add gamma. b is untouched.
    readFileMock.mockResolvedValueOnce(encodeContent(`render_template('p.html', gamma=3)`));
    await index.update(a);
    expect([...index.getVarsFor(vscode.Uri.file("/ws/p.html"))!].sort()).toEqual(["beta", "gamma"]);
  });

  it("emits onDidUpdate after update with templatesTouched", async () => {
    findFilesMock.mockResolvedValue([]);
    const uri = makeUri("/ws/a.py");
    readFileMock.mockResolvedValue(encodeContent(`render_template('p.html', x=1)`));

    const events: { templatesTouched: string[] }[] = [];
    index.onDidUpdate((e) => events.push({ templatesTouched: e.templatesTouched }));

    await index.update(uri);
    expect(events).toHaveLength(1);
    expect(events[0].templatesTouched).toEqual(["p.html"]);
  });

  it("build() emits a single aggregate onDidUpdate (silent per-file)", async () => {
    const a = makeUri("/ws/a.py");
    const b = makeUri("/ws/b.py");
    findFilesMock.mockResolvedValue([a, b]);
    readFileMock
      .mockResolvedValueOnce(encodeContent(`render_template('a.html', x=1)`))
      .mockResolvedValueOnce(encodeContent(`render_template('b.html', y=2)`));

    const events: { templatesTouched: string[] }[] = [];
    index.onDidUpdate((e) => events.push({ templatesTouched: [...e.templatesTouched].sort() }));

    await index.build();
    expect(events).toHaveLength(1);
    expect(events[0].templatesTouched).toEqual(["a.html", "b.html"]);
  });
});
