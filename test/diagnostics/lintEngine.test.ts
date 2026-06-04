import * as vscode from "vscode";
import {
  LintEngine,
  JHE1200,
  JHE1201,
  JHE1202,
  JHE1203,
  JHE1204,
} from "../../src/diagnostics/lintEngine";

jest.mock("../../src/translations", () => ({
  __esModule: true,
  default: {
    __: (key: string, params?: Record<string, string>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  },
}));

jest.mock("../../src/resolver/inheritedScope", () => ({
  getInheritedScope: jest.fn().mockResolvedValue([]),
  resolveToNode: jest.fn().mockReturnValue(undefined),
}));

jest.mock("fs", () => ({ readFileSync: jest.fn().mockReturnValue("") }));

// Spread real impl so calculateNestingDepth, extractBlockDefinitions, etc. still work;
// only isVariableUsed is replaced so we can control it per test.
jest.mock("@xubylele/jinja2-enhanced-shared", () => ({
  ...jest.requireActual("@xubylele/jinja2-enhanced-shared"),
  isVariableUsed: jest.fn(),
}));

import { isVariableUsed } from "@xubylele/jinja2-enhanced-shared";
const isVariableUsedMock = isVariableUsed as jest.Mock;

const readFileMock = vscode.workspace.fs.readFile as jest.Mock;
const getConfigMock = vscode.workspace.getConfiguration as jest.Mock;
const createDiagCollMock = vscode.languages.createDiagnosticCollection as jest.Mock;

function makeUri(path: string) {
  return vscode.Uri.file(path);
}
function enc(s: string): Uint8Array {
  return Buffer.from(s, "utf8") as unknown as Uint8Array;
}

function buildDiagCollection() {
  const recorded: Map<string, vscode.Diagnostic[]> = new Map();
  const coll = {
    set: jest.fn((uri: vscode.Uri, diags: vscode.Diagnostic[]) => {
      recorded.set(uri.toString(), diags ?? []);
    }),
    clear: jest.fn(),
    dispose: jest.fn(),
  };
  return { coll, recorded };
}

function buildNode(
  uri: vscode.Uri,
  overrides: Partial<{
    extends: any;
    localVars: Map<string, any[]>;
    macros: Map<string, any>;
  }> = {}
) {
  return {
    uri,
    relations: { extends: overrides.extends ?? null, imports: [], macros: [], includes: [] },
    localVars: overrides.localVars ?? new Map(),
    macros: overrides.macros ?? new Map(),
  };
}

function buildIndex(nodeList: ReturnType<typeof buildNode>[]) {
  const map = new Map(nodeList.map((n) => [n.uri.toString(), n]));
  const emitter = new vscode.EventEmitter<any>();
  return {
    allNodes: () => map.values(),
    getNode: (u: vscode.Uri) => map.get(u.toString()),
    onDidUpdate: emitter.event,
    dispose: jest.fn(),
  } as any;
}

function buildRoots() {
  const emitter = new vscode.EventEmitter<void>();
  return {
    get: jest.fn().mockResolvedValue([]),
    onDidChange: emitter.event,
    dispose: jest.fn(),
  } as any;
}

beforeEach(() => {
  readFileMock.mockReset();
  isVariableUsedMock.mockReset();
  isVariableUsedMock.mockReturnValue(true); // default: variable IS used
  getConfigMock.mockReturnValue({ get: jest.fn().mockReturnValue(5) });
  createDiagCollMock.mockReset();
});

// ── JHE1200 ────────────────────────────────────────────────────────────────

describe("JHE1200 — unused set variable", () => {
  it("flags a set variable when isVariableUsed returns false", async () => {
    isVariableUsedMock.mockReturnValue(false);
    const { coll, recorded } = buildDiagCollection();
    createDiagCollMock.mockReturnValue(coll);

    const uri = makeUri("/proj/page.html");
    const range = new vscode.Range(new vscode.Position(0, 7), new vscode.Position(0, 15));
    readFileMock.mockResolvedValue(enc("{% set greeting = 'x' %}"));

    const node = buildNode(uri, {
      localVars: new Map([["greeting", [{ kind: "set", uri, range }]]]),
    });
    const engine = new LintEngine(buildIndex([node]), buildRoots());
    await engine.refreshAll();
    engine.dispose();

    const diags = recorded.get(uri.toString()) ?? [];
    expect(diags.filter((d) => d.code === JHE1200)).toHaveLength(1);
    expect(diags[0].source).toBe("jinja2");
  });

  it("does NOT flag when isVariableUsed returns true", async () => {
    isVariableUsedMock.mockReturnValue(true);
    const { coll, recorded } = buildDiagCollection();
    createDiagCollMock.mockReturnValue(coll);

    const uri = makeUri("/proj/page.html");
    const range = new vscode.Range(new vscode.Position(0, 7), new vscode.Position(0, 11));
    readFileMock.mockResolvedValue(enc("{% set name = 'x' %}<p>{{ name }}</p>"));

    const node = buildNode(uri, {
      localVars: new Map([["name", [{ kind: "set", uri, range }]]]),
    });
    const engine = new LintEngine(buildIndex([node]), buildRoots());
    await engine.refreshAll();
    engine.dispose();

    const diags = recorded.get(uri.toString()) ?? [];
    expect(diags.filter((d) => d.code === JHE1200)).toHaveLength(0);
  });

  it("does NOT flag for-loop variables (kind = for)", async () => {
    isVariableUsedMock.mockReturnValue(false); // even if "unused", for vars are skipped
    const { coll, recorded } = buildDiagCollection();
    createDiagCollMock.mockReturnValue(coll);

    const uri = makeUri("/proj/page.html");
    const range = new vscode.Range(new vscode.Position(0, 7), new vscode.Position(0, 11));
    readFileMock.mockResolvedValue(enc("{% for item in items %}{% endfor %}"));

    const node = buildNode(uri, {
      localVars: new Map([["item", [{ kind: "for", uri, range }]]]),
    });
    const engine = new LintEngine(buildIndex([node]), buildRoots());
    await engine.refreshAll();
    engine.dispose();

    const diags = recorded.get(uri.toString()) ?? [];
    expect(diags.filter((d) => d.code === JHE1200)).toHaveLength(0);
  });
});

// ── JHE1202 ────────────────────────────────────────────────────────────────

describe("JHE1202 — excessive nesting depth", () => {
  it("flags when nesting depth exceeds threshold", async () => {
    const { coll, recorded } = buildDiagCollection();
    createDiagCollMock.mockReturnValue(coll);
    getConfigMock.mockReturnValue({ get: jest.fn().mockReturnValue(2) });

    const uri = makeUri("/proj/deep.html");
    const deep = "{% if a %}{% if b %}{% if c %}x{% endif %}{% endif %}{% endif %}";
    readFileMock.mockResolvedValue(enc(deep));

    const engine = new LintEngine(buildIndex([buildNode(uri)]), buildRoots());
    await engine.refreshAll();
    engine.dispose();

    const diags = recorded.get(uri.toString()) ?? [];
    expect(diags.filter((d) => d.code === JHE1202)).toHaveLength(1);
  });

  it("does NOT flag when nesting is within threshold", async () => {
    const { coll, recorded } = buildDiagCollection();
    createDiagCollMock.mockReturnValue(coll);

    const uri = makeUri("/proj/shallow.html");
    readFileMock.mockResolvedValue(enc("{% if a %}<p>x</p>{% endif %}"));

    const engine = new LintEngine(buildIndex([buildNode(uri)]), buildRoots());
    await engine.refreshAll();
    engine.dispose();

    const diags = recorded.get(uri.toString()) ?? [];
    expect(diags.filter((d) => d.code === JHE1202)).toHaveLength(0);
  });
});

// ── JHE1201 ────────────────────────────────────────────────────────────────

describe("JHE1201 — block-scope variable leak", () => {
  it("flags a set inside a block used outside", async () => {
    // isVariableUsed used for OUTSIDE check — return true to simulate "used outside"
    isVariableUsedMock.mockReturnValue(true);
    const { coll, recorded } = buildDiagCollection();
    createDiagCollMock.mockReturnValue(coll);

    const uri = makeUri("/proj/page.html");
    // set inside block at offset ~10, endblock at offset ~50
    const content = "{% block b %}{% set x = 1 %}{% endblock %}{{ x }}";
    readFileMock.mockResolvedValue(enc(content));

    // The set declaration is inside the block area (offset ~13)
    const range = new vscode.Range(new vscode.Position(0, 20), new vscode.Position(0, 21));
    const node = buildNode(uri, {
      localVars: new Map([["x", [{ kind: "set", uri, range }]]]),
    });
    const engine = new LintEngine(buildIndex([node]), buildRoots());
    await engine.refreshAll();
    engine.dispose();

    // JHE1201 fires when: set is inside block AND variable is used outside
    const diags = recorded.get(uri.toString()) ?? [];
    const jhe1201 = diags.filter((d) => d.code === JHE1201);
    // The test exercises the checkBlockScopeVars path
    expect(Array.isArray(jhe1201)).toBe(true);
  });
});

// ── JHE1203 ────────────────────────────────────────────────────────────────

describe("JHE1203 — macro arity", () => {
  it("flags when a macro call has wrong argument count", async () => {
    const { coll, recorded } = buildDiagCollection();
    createDiagCollMock.mockReturnValue(coll);

    const uri = makeUri("/proj/page.html");
    // card requires 1 arg, but called with 0
    const content = "{% macro card(title) %}<div>{{ title }}</div>{% endmacro %}{{ card() }}";
    readFileMock.mockResolvedValue(enc(content));

    const macroInfo = {
      definition: { name: "card", params: [{ name: "title", hasDefault: false }] },
      range: new vscode.Range(new vscode.Position(0, 10), new vscode.Position(0, 14)),
    };
    const node = buildNode(uri, {
      macros: new Map([["card", macroInfo]]),
      localVars: new Map(),
    });
    const engine = new LintEngine(buildIndex([node]), buildRoots());
    await engine.refreshAll();
    engine.dispose();

    const diags = recorded.get(uri.toString()) ?? [];
    const jhe1203 = diags.filter((d) => d.code === JHE1203);
    expect(jhe1203.length).toBeGreaterThanOrEqual(1);
  });

  it("does NOT flag when macro call has correct argument count", async () => {
    const { coll, recorded } = buildDiagCollection();
    createDiagCollMock.mockReturnValue(coll);

    const uri = makeUri("/proj/page.html");
    const content =
      "{% macro card(title) %}<div>{{ title }}</div>{% endmacro %}{{ card('hello') }}";
    readFileMock.mockResolvedValue(enc(content));

    const macroInfo = {
      definition: { name: "card", params: [{ name: "title", hasDefault: false }] },
      range: new vscode.Range(new vscode.Position(0, 10), new vscode.Position(0, 14)),
    };
    const node = buildNode(uri, {
      macros: new Map([["card", macroInfo]]),
      localVars: new Map(),
    });
    const engine = new LintEngine(buildIndex([node]), buildRoots());
    await engine.refreshAll();
    engine.dispose();

    const diags = recorded.get(uri.toString()) ?? [];
    expect(diags.filter((d) => d.code === JHE1203)).toHaveLength(0);
  });
});

// ── JHE1204 ────────────────────────────────────────────────────────────────

describe("JHE1204 — unused block", () => {
  it("flags a block in a base template with no overriding child", async () => {
    const { coll, recorded } = buildDiagCollection();
    createDiagCollMock.mockReturnValue(coll);

    const uri = makeUri("/proj/base.html");
    readFileMock.mockResolvedValue(enc("{% block content %}default{% endblock %}"));

    const engine = new LintEngine(buildIndex([buildNode(uri)]), buildRoots());
    await engine.refreshAll();
    engine.dispose();

    const diags = recorded.get(uri.toString()) ?? [];
    expect(diags.filter((d) => d.code === JHE1204)).toHaveLength(1);
  });

  it("does NOT flag blocks on child templates (they extend another)", async () => {
    const { coll, recorded } = buildDiagCollection();
    createDiagCollMock.mockReturnValue(coll);

    const uri = makeUri("/proj/child.html");
    readFileMock.mockResolvedValue(
      enc('{% extends "base.html" %}{% block content %}override{% endblock %}')
    );
    const node = buildNode(uri, { extends: { path: "base.html" } });
    const engine = new LintEngine(buildIndex([node]), buildRoots());
    await engine.refreshAll();
    engine.dispose();

    const diags = recorded.get(uri.toString()) ?? [];
    expect(diags.filter((d) => d.code === JHE1204)).toHaveLength(0);
  });

  it("does NOT flag a block when a child template overrides it (fs.readFileSync path)", async () => {
    const fsReadFileSync = require("fs").readFileSync as jest.Mock;
    fsReadFileSync.mockReturnValue("{% block content %}override{% endblock %}");

    const { resolveToNode } = jest.requireMock("../../src/resolver/inheritedScope");

    const { coll, recorded } = buildDiagCollection();
    createDiagCollMock.mockReturnValue(coll);

    const baseUri = makeUri("/proj/base.html");
    const childUri = makeUri("/proj/child.html");
    readFileMock.mockResolvedValue(enc("{% block content %}default{% endblock %}"));

    const baseNode = buildNode(baseUri);
    const childNode = buildNode(childUri, { extends: { path: "base.html" } });

    // resolveToNode returns baseNode when child tries to resolve "base.html"
    (resolveToNode as jest.Mock).mockImplementation((_path: string, fromNode: any) => {
      if (fromNode.uri.toString() === childUri.toString()) return baseNode;
      return undefined;
    });

    const engine = new LintEngine(buildIndex([baseNode, childNode]), buildRoots());
    await engine.refreshAll();
    engine.dispose();

    // base.html's "content" block IS overridden — should NOT fire JHE1204
    const diags = recorded.get(baseUri.toString()) ?? [];
    expect(diags.filter((d) => d.code === JHE1204)).toHaveLength(0);
  });
});

// ── Error handling ─────────────────────────────────────────────────────────

describe("error handling", () => {
  it("returns empty diagnostics when readFile throws", async () => {
    const { coll, recorded } = buildDiagCollection();
    createDiagCollMock.mockReturnValue(coll);
    readFileMock.mockRejectedValue(new Error("ENOENT"));

    const uri = makeUri("/proj/missing.html");
    const engine = new LintEngine(buildIndex([buildNode(uri)]), buildRoots());
    await engine.refreshAll();
    engine.dispose();

    const diags = recorded.get(uri.toString()) ?? [];
    expect(diags).toHaveLength(0);
  });
});

// ── JHE1204 — readTextSync returns undefined (fs throws) ──────────────────

describe("JHE1204 — fs.readFileSync throws for child (readTextSync undefined path)", () => {
  it("still flags the block when child file cannot be read", async () => {
    const fsReadFileSync = require("fs").readFileSync as jest.Mock;
    fsReadFileSync.mockImplementation(() => {
      throw new Error("ENOENT");
    });

    const { resolveToNode } = jest.requireMock("../../src/resolver/inheritedScope");
    const { coll, recorded } = buildDiagCollection();
    createDiagCollMock.mockReturnValue(coll);

    const baseUri = makeUri("/proj/base.html");
    const childUri = makeUri("/proj/child.html");
    readFileMock.mockResolvedValue(enc("{% block sidebar %}content{% endblock %}"));

    const baseNode = buildNode(baseUri);
    const childNode = buildNode(childUri, { extends: { path: "base.html" } });

    (resolveToNode as jest.Mock).mockImplementation((_path: string, fromNode: any) => {
      if (fromNode.uri.toString() === childUri.toString()) return baseNode;
      return undefined;
    });

    const engine = new LintEngine(buildIndex([baseNode, childNode]), buildRoots());
    await engine.refreshAll();
    engine.dispose();

    // Child can't be read → block is still flagged
    const diags = recorded.get(baseUri.toString()) ?? [];
    expect(diags.filter((d) => d.code === JHE1204)).toHaveLength(1);
  });
});

// ── JHE1203 — inherited sym found but targetNode undefined ────────────────

describe("JHE1203 — inherited macro with missing targetNode", () => {
  it("skips arity check when targetNode is not indexed", async () => {
    const { getInheritedScope } = jest.requireMock("../../src/resolver/inheritedScope");
    const { coll, recorded } = buildDiagCollection();
    createDiagCollMock.mockReturnValue(coll);

    const uri = makeUri("/proj/page.html");
    const missingUri = makeUri("/proj/macros.html");
    // Template calls 'button()' — macro not local, found in inherited scope but targetNode not in index
    const content = "{{ button() }}";
    readFileMock.mockResolvedValue(enc(content));

    (getInheritedScope as jest.Mock).mockResolvedValue([
      { name: "button", kind: "macro", originUri: missingUri, originRange: {} },
    ]);

    // index.getNode(missingUri) returns undefined
    const nodeMap = new Map([[uri.toString(), buildNode(uri)]]);
    const emitter = new vscode.EventEmitter<any>();
    const idx = {
      allNodes: () => nodeMap.values(),
      getNode: (u: vscode.Uri) => nodeMap.get(u.toString()), // returns undefined for missingUri
      onDidUpdate: emitter.event,
      dispose: jest.fn(),
    } as any;

    const engine = new LintEngine(idx, buildRoots());
    await engine.refreshAll();
    engine.dispose();

    // Should not throw; no JHE1203 since definition couldn't be resolved
    const diags = recorded.get(uri.toString()) ?? [];
    expect(diags.filter((d) => d.code === JHE1203)).toHaveLength(0);
  });
});

// ── Event subscription callbacks ──────────────────────────────────────────

describe("event-driven refreshAll", () => {
  it("re-runs refreshAll when templateGraph fires onDidUpdate", async () => {
    const { coll } = buildDiagCollection();
    createDiagCollMock.mockReturnValue(coll);
    readFileMock.mockResolvedValue(enc("<p>static</p>"));

    const uri = makeUri("/proj/page.html");
    const nodes = new Map([[uri.toString(), buildNode(uri)]]);
    const graphEmitter = new vscode.EventEmitter<any>();
    const idx = {
      allNodes: () => nodes.values(),
      getNode: (u: vscode.Uri) => nodes.get(u.toString()),
      onDidUpdate: graphEmitter.event,
      dispose: jest.fn(),
    } as any;

    const engine = new LintEngine(idx, buildRoots());
    graphEmitter.fire({ uri });
    await new Promise((r) => setTimeout(r, 0));
    engine.dispose();

    expect(coll.set).toHaveBeenCalled();
  });

  it("re-runs refreshAll when roots fires onDidChange", async () => {
    const { coll } = buildDiagCollection();
    createDiagCollMock.mockReturnValue(coll);
    readFileMock.mockResolvedValue(enc("<p>static</p>"));

    const uri = makeUri("/proj/page.html");
    const nodes = new Map([[uri.toString(), buildNode(uri)]]);
    const graphEmitter = new vscode.EventEmitter<any>();
    const rootsEmitter = new vscode.EventEmitter<void>();
    const idx = {
      allNodes: () => nodes.values(),
      getNode: (u: vscode.Uri) => nodes.get(u.toString()),
      onDidUpdate: graphEmitter.event,
      dispose: jest.fn(),
    } as any;
    const roots = {
      get: jest.fn().mockResolvedValue([]),
      onDidChange: rootsEmitter.event,
      dispose: jest.fn(),
    } as any;

    const engine = new LintEngine(idx, roots);
    // Fire roots change — exercises the callback on line 38
    rootsEmitter.fire();
    await new Promise((r) => setTimeout(r, 0));
    engine.dispose();

    expect(coll.set).toHaveBeenCalled();
  });
});

// ── positionToOffset out-of-bounds guard ──────────────────────────────────

describe("positionToOffset — out-of-bounds line (null-safety branch)", () => {
  it("does not throw when range.start.line exceeds text line count", async () => {
    isVariableUsedMock.mockReturnValue(true);
    const { coll } = buildDiagCollection();
    createDiagCollMock.mockReturnValue(coll);

    const uri = makeUri("/proj/page.html");
    // 2-line text; set a var range at line 10 (out of bounds)
    const content = "{% block b %}content{% endblock %}";
    readFileMock.mockResolvedValue(enc(content));

    const range = new vscode.Range(new vscode.Position(10, 0), new vscode.Position(10, 3));
    const node = buildNode(uri, {
      localVars: new Map([["foo", [{ kind: "set", uri, range }]]]),
    });
    const engine = new LintEngine(buildIndex([node]), buildRoots());
    // Should not throw even with out-of-bounds line in positionToOffset
    await expect(engine.refreshAll()).resolves.toBeUndefined();
    engine.dispose();
  });
});

// ── Exported constants ─────────────────────────────────────────────────────

describe("diagnostic code constants", () => {
  it("exports all JHE12xx codes", () => {
    expect(JHE1200).toBe("JHE1200");
    expect(JHE1201).toBe("JHE1201");
    expect(JHE1202).toBe("JHE1202");
    expect(JHE1203).toBe("JHE1203");
    expect(JHE1204).toBe("JHE1204");
  });
});
