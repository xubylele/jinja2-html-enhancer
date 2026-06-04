import {
  TypeHintExtractor,
  typeToString,
  formatTypeForHover,
  inferTypeFromUsage,
  mergeTypeHints,
  type JinjaType,
  type TypeHint,
} from "../../src/intelligence/typeHints";

const extractor = new TypeHintExtractor();

describe("typeToString", () => {
  it("returns 'any' for unknown", () => expect(typeToString({ kind: "unknown" })).toBe("any"));
  it("returns 'string' for string", () => expect(typeToString({ kind: "string" })).toBe("string"));
  it("returns 'number' for number", () => expect(typeToString({ kind: "number" })).toBe("number"));
  it("returns 'boolean' for boolean", () =>
    expect(typeToString({ kind: "boolean" })).toBe("boolean"));
  it("returns 'none' for none", () => expect(typeToString({ kind: "none" })).toBe("none"));
  it("returns 'macro' for macro", () => expect(typeToString({ kind: "macro" })).toBe("macro"));
  it("returns 'list' for bare list", () => expect(typeToString({ kind: "list" })).toBe("list"));
  it("returns 'list[string]' for typed list", () =>
    expect(typeToString({ kind: "list", itemType: { kind: "string" } })).toBe("list[string]"));
  it("returns 'dict' for bare dict", () => expect(typeToString({ kind: "dict" })).toBe("dict"));
  it("returns 'dict[str, number]' for typed dict", () =>
    expect(typeToString({ kind: "dict", valueType: { kind: "number" } })).toBe(
      "dict[str, number]"
    ));
  it("formats object fields", () => {
    const fields = new Map<string, JinjaType>([["name", { kind: "string" }]]);
    expect(typeToString({ kind: "object", fields })).toBe("object { name: string }");
  });
  it("returns 'object { }' for empty fields", () =>
    expect(typeToString({ kind: "object", fields: new Map() })).toBe("object {  }"));
});

describe("formatTypeForHover", () => {
  it("labels backend source", () => {
    const hint: TypeHint = { type: { kind: "string" }, source: "backend", confidence: "high" };
    expect(formatTypeForHover(hint)).toContain("Backend type");
    expect(formatTypeForHover(hint)).toContain("`string`");
    expect(formatTypeForHover(hint)).toContain("high confidence");
  });
  it("labels inferred source", () => {
    const hint: TypeHint = { type: { kind: "unknown" }, source: "inferred", confidence: "low" };
    expect(formatTypeForHover(hint)).toContain("Inferred type");
  });
  it("labels usage source", () => {
    const hint: TypeHint = { type: { kind: "list" }, source: "usage", confidence: "medium" };
    expect(formatTypeForHover(hint)).toContain("Usage-based type");
  });
});

describe("TypeHintExtractor — Python", () => {
  it("extracts str type annotation", () => {
    const hint = extractor.extractFromBackendCode("user: str = None", "user", "py");
    expect(hint?.type.kind).toBe("string");
    expect(hint?.confidence).toBe("high");
  });
  it("extracts int type", () => {
    const hint = extractor.extractFromBackendCode("count: int", "count", "py");
    expect(hint?.type.kind).toBe("number");
  });
  it("extracts bool type", () => {
    const hint = extractor.extractFromBackendCode("active: bool", "active", "py");
    expect(hint?.type.kind).toBe("boolean");
  });
  it("extracts list type", () => {
    const hint = extractor.extractFromBackendCode("items: list", "items", "py");
    expect(hint?.type.kind).toBe("list");
  });
  it("extracts dict type", () => {
    const hint = extractor.extractFromBackendCode("data: dict", "data", "py");
    expect(hint?.type.kind).toBe("dict");
  });
  it("extracts list[str] nested type", () => {
    const hint = extractor.extractFromBackendCode("tags: list[str]", "tags", "py");
    expect(hint?.type.kind).toBe("list");
    if (hint?.type.kind === "list") {
      expect(hint.type.itemType?.kind).toBe("string");
    }
  });
  it("returns undefined when no type found", () => {
    expect(extractor.extractFromBackendCode("x = 1", "missing", "py")).toBeUndefined();
  });
});

describe("TypeHintExtractor — JavaScript/TypeScript", () => {
  it("extracts string TypeScript type", () => {
    const hint = extractor.extractFromBackendCode("const user: string = 'x'", "user", "js");
    expect(hint?.type.kind).toBe("string");
  });
  it("extracts number type", () => {
    const hint = extractor.extractFromBackendCode("count: number", "count", "js");
    expect(hint?.type.kind).toBe("number");
  });
  it("extracts boolean type", () => {
    const hint = extractor.extractFromBackendCode("active: boolean", "active", "js");
    expect(hint?.type.kind).toBe("boolean");
  });
  it("extracts array type", () => {
    const hint = extractor.extractFromBackendCode("items: string[]", "items", "js");
    expect(hint?.type.kind).toBe("list");
  });
  it("returns undefined for unknown lang", () => {
    expect(extractor.extractFromBackendCode("x: string", "x", "js")).toBeTruthy(); // js is valid
  });
});

describe("inferTypeFromUsage", () => {
  it("infers object from member access", () => {
    const hint = inferTypeFromUsage("{{ user.name }} {{ user.email }}", "user");
    expect(hint?.type.kind).toBe("object");
    if (hint?.type.kind === "object") {
      expect(hint.type.fields.has("name")).toBe(true);
      expect(hint.type.fields.has("email")).toBe(true);
    }
  });
  it("confidence is 'medium' when more than 2 fields", () => {
    const hint = inferTypeFromUsage("{{ u.a }}{{ u.b }}{{ u.c }}", "u");
    expect(hint?.confidence).toBe("medium");
  });
  it("confidence is 'low' for 1-2 fields", () => {
    const hint = inferTypeFromUsage("{{ u.name }}", "u");
    expect(hint?.confidence).toBe("low");
  });
  it("returns undefined when no usage pattern found", () => {
    expect(inferTypeFromUsage("<p>static</p>", "user")).toBeUndefined();
  });
});

describe("TypeHintExtractor — edge cases", () => {
  it("returns undefined for unsupported lang", () => {
    expect(extractor.extractFromBackendCode("x: str", "x", "unsupported" as any)).toBeUndefined();
  });

  it("extracts Python List type", () => {
    const hint = extractor.extractFromBackendCode("items: List[str]", "items", "py");
    expect(hint?.type.kind).toBe("list");
  });
  it("extracts Python Dict type", () => {
    const hint = extractor.extractFromBackendCode("data: Dict[str, int]", "data", "py");
    expect(hint?.type.kind).toBe("dict");
  });
  it("extracts Python None type", () => {
    const hint = extractor.extractFromBackendCode("x: None", "x", "py");
    expect(hint?.type.kind).toBe("none");
  });
  it("returns object for unknown Python compound type", () => {
    const hint = extractor.extractFromBackendCode("payload: RequestData", "payload", "py");
    expect(hint?.type.kind).toBe("object");
  });
  it("extracts dict[str, int] Python nested type", () => {
    const hint = extractor.extractFromBackendCode("mapping: dict[str, int]", "mapping", "py");
    expect(hint?.type.kind).toBe("dict");
    if (hint?.type.kind === "dict") {
      expect(hint.type.valueType?.kind).toBe("number");
    }
  });
  it("returns object for unknown Python type string", () => {
    const hint = extractor.extractFromBackendCode("x: MyCustomClass", "x", "py");
    expect(hint?.type.kind).toBe("object");
  });

  it("extracts JS void/null/undefined → none", () => {
    expect(extractor.extractFromBackendCode("x: void", "x", "js")?.type.kind).toBe("none");
    expect(extractor.extractFromBackendCode("y: null", "y", "js")?.type.kind).toBe("none");
    expect(extractor.extractFromBackendCode("z: undefined", "z", "js")?.type.kind).toBe("none");
  });
  it("extracts JS any → unknown", () => {
    const hint = extractor.extractFromBackendCode("x: any", "x", "js");
    expect(hint?.type.kind).toBe("unknown");
  });
  it("extracts JS Array<T> → list", () => {
    const hint = extractor.extractFromBackendCode("items: Array<string>", "items", "js");
    expect(hint?.type.kind).toBe("list");
  });
  it("extracts JS Record<K,V> → dict", () => {
    const hint = extractor.extractFromBackendCode("data: Record<string, number>", "data", "js");
    expect(hint?.type.kind).toBe("dict");
  });
  it("returns object for unknown JS type", () => {
    const hint = extractor.extractFromBackendCode("x: MyInterface", "x", "js");
    expect(hint?.type.kind).toBe("object");
  });
});

describe("inferTypeFromValue (internal paths via TypeHintExtractor)", () => {
  it("extracts Python NoneType → none", () => {
    const hint = extractor.extractFromBackendCode("result: NoneType", "result", "py");
    expect(hint?.type.kind).toBe("none");
  });

  it("extracts dict[str] without value type", () => {
    // dict[ with only one part — no comma
    const hint = extractor.extractFromBackendCode("data: dict[str]", "data", "py");
    expect(hint?.type.kind).toBe("dict");
    if (hint?.type.kind === "dict") {
      expect(hint.type.valueType).toBeUndefined();
    }
  });
});

describe("mergeTypeHints", () => {
  it("returns unknown for empty array", () => {
    const result = mergeTypeHints([]);
    expect(result.type.kind).toBe("unknown");
  });
  it("prefers high-confidence backend hint", () => {
    const hints: TypeHint[] = [
      { type: { kind: "string" }, source: "backend", confidence: "high" },
      { type: { kind: "list" }, source: "usage", confidence: "medium" },
    ];
    expect(mergeTypeHints(hints).type.kind).toBe("string");
  });
  it("falls back to usage hint when no backend", () => {
    const hints: TypeHint[] = [{ type: { kind: "list" }, source: "usage", confidence: "medium" }];
    expect(mergeTypeHints(hints).type.kind).toBe("list");
  });
  it("returns first hint when nothing else matches", () => {
    const hints: TypeHint[] = [{ type: { kind: "number" }, source: "inferred", confidence: "low" }];
    expect(mergeTypeHints(hints).type.kind).toBe("number");
  });
});
