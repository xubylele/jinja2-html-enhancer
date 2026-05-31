import * as vscode from "vscode";
import { TemplateGraphIndex } from "../../src/resolver/templateGraphIndex";

const readFileMock = vscode.workspace.fs.readFile as jest.Mock;
const findFilesMock = vscode.workspace.findFiles as jest.Mock;

function makeUri(path: string) {
  return vscode.Uri.file(path);
}

function encodeContent(content: string): Uint8Array {
  return Buffer.from(content, "utf8") as unknown as Uint8Array;
}

describe("TemplateGraphIndex", () => {
  let index: TemplateGraphIndex;

  beforeEach(() => {
    readFileMock.mockReset();
    findFilesMock.mockReset();
    index = new TemplateGraphIndex();
  });

  afterEach(() => {
    index.dispose();
  });

  it("getNode returns undefined for unknown URI", () => {
    const uri = makeUri("/proj/templates/home.html");
    expect(index.getNode(uri)).toBeUndefined();
  });

  it("size returns 0 when no files indexed", () => {
    expect(index.size()).toBe(0);
  });

  it("update indexes a template and getNode returns the node", async () => {
    const uri = makeUri("/proj/templates/home.html");
    readFileMock.mockResolvedValue(encodeContent("<h1>{{ title }}</h1>"));
    await index.update(uri);
    const node = index.getNode(uri);
    expect(node).toBeDefined();
    expect(node!.uri.fsPath).toBe("/proj/templates/home.html");
    expect(index.size()).toBe(1);
  });

  it("update extracts usedVariables from {{ }} expressions", async () => {
    const uri = makeUri("/proj/templates/home.html");
    readFileMock.mockResolvedValue(encodeContent("{{ title }}\n{{ user.name }}"));
    await index.update(uri);
    const node = index.getNode(uri);
    expect(node!.usedVariables.has("title")).toBe(true);
  });

  it("update extracts set variable declarations", async () => {
    const uri = makeUri("/proj/templates/page.html");
    readFileMock.mockResolvedValue(
      encodeContent("{% set greeting = 'Hello' %}\n{{ greeting }}")
    );
    await index.update(uri);
    const node = index.getNode(uri);
    expect(node!.localVars.has("greeting")).toBe(true);
    const locs = node!.localVars.get("greeting")!;
    expect(locs[0].kind).toBe("set");
  });

  it("update marks for-loop variables as 'for' kind (not inherited)", async () => {
    const uri = makeUri("/proj/templates/list.html");
    readFileMock.mockResolvedValue(
      encodeContent("{% for item in items %}\n{{ item }}\n{% endfor %}")
    );
    await index.update(uri);
    const node = index.getNode(uri);
    expect(node!.localVars.has("item")).toBe(true);
    expect(node!.localVars.get("item")![0].kind).toBe("for");
  });

  it("update parses extends relation", async () => {
    const uri = makeUri("/proj/templates/page.html");
    readFileMock.mockResolvedValue(
      encodeContent('{% extends "base.html" %}{% block content %}body{% endblock %}')
    );
    await index.update(uri);
    const node = index.getNode(uri);
    expect(node!.relations.extends?.path).toBe("base.html");
    expect(node!.extendsRange).not.toBeNull();
  });

  it("update parses macro definitions", async () => {
    const uri = makeUri("/proj/templates/macros.html");
    readFileMock.mockResolvedValue(
      encodeContent("{% macro button(label) %}<button>{{ label }}</button>{% endmacro %}")
    );
    await index.update(uri);
    const node = index.getNode(uri);
    expect(node!.macros.has("button")).toBe(true);
  });

  it("forget removes an indexed node", async () => {
    const uri = makeUri("/proj/templates/home.html");
    readFileMock.mockResolvedValue(encodeContent("{{ title }}"));
    await index.update(uri);
    expect(index.size()).toBe(1);
    index.forget(uri);
    expect(index.size()).toBe(0);
    expect(index.getNode(uri)).toBeUndefined();
  });

  it("update forgets the node when readFile throws", async () => {
    const uri = makeUri("/proj/templates/home.html");
    readFileMock.mockResolvedValue(encodeContent("{{ x }}"));
    await index.update(uri);
    expect(index.size()).toBe(1);
    readFileMock.mockRejectedValue(new Error("ENOENT"));
    await index.update(uri);
    expect(index.size()).toBe(0);
  });

  it("build calls findFiles and indexes all results", async () => {
    const uri1 = makeUri("/proj/templates/a.html");
    const uri2 = makeUri("/proj/templates/b.html");
    findFilesMock.mockResolvedValue([uri1, uri2]);
    readFileMock.mockResolvedValue(encodeContent("{{ x }}"));
    await index.build();
    expect(findFilesMock).toHaveBeenCalledWith(
      "**/*.{html,jinja2,j2,jinja}",
      "**/node_modules/**"
    );
    expect(index.size()).toBe(2);
  });

  it("allNodes iterates over all indexed nodes", async () => {
    const uri = makeUri("/proj/templates/x.html");
    readFileMock.mockResolvedValue(encodeContent("{{ x }}"));
    await index.update(uri);
    const nodes = [...index.allNodes()];
    expect(nodes).toHaveLength(1);
    expect(nodes[0].uri.fsPath).toBe("/proj/templates/x.html");
  });

  it("fires onDidUpdate after update", async () => {
    const uri = makeUri("/proj/templates/home.html");
    readFileMock.mockResolvedValue(encodeContent("{{ x }}"));
    const updates: vscode.Uri[] = [];
    index.onDidUpdate(({ uri: u }) => updates.push(u));
    await index.update(uri, false);
    expect(updates).toHaveLength(1);
  });

  it("does not fire onDidUpdate when silent=true", async () => {
    const uri = makeUri("/proj/templates/home.html");
    readFileMock.mockResolvedValue(encodeContent("{{ x }}"));
    const updates: vscode.Uri[] = [];
    index.onDidUpdate(({ uri: u }) => updates.push(u));
    await index.update(uri, true);
    expect(updates).toHaveLength(0);
  });
});
