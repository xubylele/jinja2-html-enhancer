import * as vscode from "vscode";
import {
  getInheritedScope,
  resolveToNode,
} from "../../src/resolver/inheritedScope";
import { TemplateGraphIndex } from "../../src/resolver/templateGraphIndex";
import { TemplateRootsProvider } from "../../src/resolver/templateRoots";

const readFileMock = vscode.workspace.fs.readFile as jest.Mock;
const findFilesMock = vscode.workspace.findFiles as jest.Mock;
const statMock = vscode.workspace.fs.stat as jest.Mock;

function makeUri(path: string) {
  return vscode.Uri.file(path);
}

function enc(content: string): Uint8Array {
  return Buffer.from(content, "utf8") as unknown as Uint8Array;
}

describe("resolveToNode", () => {
  it("returns undefined when the path cannot be resolved to an indexed node", async () => {
    const readFileMock2 = vscode.workspace.fs.readFile as jest.Mock;
    readFileMock2.mockResolvedValue(enc("{{ x }}"));
    const index = new TemplateGraphIndex();
    const fromUri = makeUri("/proj/templates/child.html");
    await index.update(fromUri);
    const fromNode = index.getNode(fromUri)!;
    const result = resolveToNode("base.html", fromNode, index, ["/proj/templates"]);
    expect(result).toBeUndefined();
    index.dispose();
  });

  it("returns the node when the path resolves to an indexed file", async () => {
    readFileMock.mockResolvedValue(enc("{{ x }}"));
    const index = new TemplateGraphIndex();
    const baseUri = makeUri("/proj/templates/base.html");
    const childUri = makeUri("/proj/templates/child.html");
    await index.update(baseUri);
    await index.update(childUri);
    const fromNode = index.getNode(childUri)!;
    const result = resolveToNode("base.html", fromNode, index, ["/proj/templates"]);
    expect(result).toBeDefined();
    expect(result!.uri.fsPath).toBe("/proj/templates/base.html");
    index.dispose();
  });
});

describe("getInheritedScope", () => {
  let index: TemplateGraphIndex;
  let roots: TemplateRootsProvider;

  beforeEach(() => {
    readFileMock.mockReset();
    findFilesMock.mockReset();
    statMock.mockReset();
    index = new TemplateGraphIndex();
    roots = new TemplateRootsProvider();
    (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: "/proj" } }];
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({ get: () => ["/proj/templates"] });
    findFilesMock.mockResolvedValue([]);
  });

  afterEach(() => {
    index.dispose();
    roots.dispose();
    (vscode.workspace as any).workspaceFolders = undefined;
  });

  it("returns empty array when template is not indexed", async () => {
    const uri = makeUri("/proj/templates/unknown.html");
    const result = await getInheritedScope(uri, { index, roots });
    expect(result).toEqual([]);
  });

  it("returns empty array when template has no extends/imports", async () => {
    const uri = makeUri("/proj/templates/standalone.html");
    readFileMock.mockResolvedValue(enc("<h1>{{ title }}</h1>"));
    await index.update(uri);
    const result = await getInheritedScope(uri, { index, roots });
    expect(result).toEqual([]);
  });

  it("inherits set variables from parent via extends", async () => {
    const baseUri = makeUri("/proj/templates/base.html");
    const childUri = makeUri("/proj/templates/child.html");
    readFileMock
      .mockResolvedValueOnce(enc("{% set site_name = 'My Site' %}\n{% block content %}{% endblock %}"))
      .mockResolvedValueOnce(enc('{% extends "base.html" %}{% block content %}{{ site_name }}{% endblock %}'));
    await index.update(baseUri);
    await index.update(childUri);
    const result = await getInheritedScope(childUri, { index, roots });
    const setVar = result.find((s) => s.name === "site_name");
    expect(setVar).toBeDefined();
    expect(setVar!.kind).toBe("set");
    expect(setVar!.originUri.fsPath).toBe("/proj/templates/base.html");
  });

  it("does NOT inherit for-loop variables from parent", async () => {
    const baseUri = makeUri("/proj/templates/base.html");
    const childUri = makeUri("/proj/templates/child.html");
    readFileMock
      .mockResolvedValueOnce(enc("{% for item in items %}{{ item }}{% endfor %}"))
      .mockResolvedValueOnce(enc('{% extends "base.html" %}'));
    await index.update(baseUri);
    await index.update(childUri);
    const result = await getInheritedScope(childUri, { index, roots });
    const forVar = result.find((s) => s.name === "item");
    expect(forVar).toBeUndefined();
  });

  it("inherits macros from parent via extends", async () => {
    const baseUri = makeUri("/proj/templates/base.html");
    const childUri = makeUri("/proj/templates/child.html");
    readFileMock
      .mockResolvedValueOnce(enc("{% macro card(title) %}<div>{{ title }}</div>{% endmacro %}"))
      .mockResolvedValueOnce(enc('{% extends "base.html" %}'));
    await index.update(baseUri);
    await index.update(childUri);
    const result = await getInheritedScope(childUri, { index, roots });
    const macro = result.find((s) => s.name === "card");
    expect(macro).toBeDefined();
    expect(macro!.kind).toBe("macro");
  });

  it("does not include variables defined in the child template itself", async () => {
    const baseUri = makeUri("/proj/templates/base.html");
    const childUri = makeUri("/proj/templates/child.html");
    readFileMock
      .mockResolvedValueOnce(enc("{% set base_var = 1 %}"))
      .mockResolvedValueOnce(enc('{% extends "base.html" %}{% set child_var = 2 %}'));
    await index.update(baseUri);
    await index.update(childUri);
    const result = await getInheritedScope(childUri, { index, roots });
    const childVar = result.find((s) => s.name === "child_var");
    expect(childVar).toBeUndefined();
  });

  it("collects imported namespaces from direct imports", async () => {
    const macrosUri = makeUri("/proj/templates/macros.html");
    const pageUri = makeUri("/proj/templates/page.html");
    readFileMock
      .mockResolvedValueOnce(enc("{% macro button(label) %}{{ label }}{% endmacro %}"))
      .mockResolvedValueOnce(enc('{% import "macros.html" as forms %}'));
    await index.update(macrosUri);
    await index.update(pageUri);
    const result = await getInheritedScope(pageUri, { index, roots });
    const ns = result.find((s) => s.name === "forms");
    expect(ns).toBeDefined();
    expect(ns!.kind).toBe("imported-namespace");
  });

  it("collects named imports from {% from … import … %}", async () => {
    const macrosUri = makeUri("/proj/templates/macros.html");
    const pageUri = makeUri("/proj/templates/page.html");
    readFileMock
      .mockResolvedValueOnce(enc("{% macro card(title) %}{{ title }}{% endmacro %}"))
      .mockResolvedValueOnce(enc('{% from "macros.html" import card %}'));
    await index.update(macrosUri);
    await index.update(pageUri);
    const result = await getInheritedScope(pageUri, { index, roots });
    const imported = result.find((s) => s.name === "card");
    expect(imported).toBeDefined();
    expect(imported!.kind).toBe("imported-macro");
  });

  it("guards against circular extends chains", async () => {
    const aUri = makeUri("/proj/templates/a.html");
    const bUri = makeUri("/proj/templates/b.html");
    readFileMock
      .mockResolvedValueOnce(enc('{% extends "b.html" %}{% set x = 1 %}'))
      .mockResolvedValueOnce(enc('{% extends "a.html" %}{% set y = 2 %}'));
    await index.update(aUri);
    await index.update(bUri);
    // Should not throw or loop forever
    const result = await getInheritedScope(aUri, { index, roots });
    expect(Array.isArray(result)).toBe(true);
  });
});
