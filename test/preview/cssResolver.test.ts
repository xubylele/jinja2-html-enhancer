import { extractCssReferences, FALLBACK_CSS } from "../../src/preview/cssResolver";

const src = (text: string, absPath = "/project/templates/base.html") => ({ text, absPath });

describe("extractCssReferences", () => {
  it("returns empty array for plain template", () => {
    expect(extractCssReferences([src("<p>hello</p>")])).toEqual([]);
  });

  it("detects Flask url_for static CSS", () => {
    const text = `<link rel="stylesheet" href="{{ url_for('static', filename='css/main.css') }}">`;
    const refs = extractCssReferences([src(text)]);
    expect(refs).toHaveLength(1);
    expect(refs[0]).toMatchObject({ kind: "local-flask", value: "css/main.css" });
  });

  it("detects hardcoded /static/ path", () => {
    const text = `<link rel="stylesheet" href="/static/css/app.css">`;
    const refs = extractCssReferences([src(text)]);
    expect(refs).toHaveLength(1);
    expect(refs[0]).toMatchObject({ kind: "local-flask", value: "static/css/app.css" });
  });

  it("detects CDN link", () => {
    const text = `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5/dist/css/bootstrap.min.css">`;
    const refs = extractCssReferences([src(text)]);
    expect(refs).toHaveLength(1);
    expect(refs[0].kind).toBe("cdn");
    expect(refs[0].value).toContain("bootstrap.min.css");
  });

  it("detects inline <style> block", () => {
    const text = `<style>body { color: red; }</style>`;
    const refs = extractCssReferences([src(text)]);
    expect(refs).toHaveLength(1);
    expect(refs[0]).toMatchObject({ kind: "inline-style", value: "body { color: red; }" });
  });

  it("ignores empty <style> blocks", () => {
    const text = `<style>   </style>`;
    const refs = extractCssReferences([src(text)]);
    expect(refs).toHaveLength(0);
  });

  it("deduplicates same reference across parent and child", () => {
    const text = `<link rel="stylesheet" href="https://cdn.example.com/a.css">`;
    const refs = extractCssReferences([src(text, "/t/child.html"), src(text, "/t/base.html")]);
    expect(refs).toHaveLength(1);
  });

  it("collects mixed references from multiple sources", () => {
    const child = src(`<style>.x{}</style>`, "/t/child.html");
    const base = src(
      `<link rel="stylesheet" href="{{ url_for('static', filename='css/main.css') }}">`,
      "/t/base.html"
    );
    const refs = extractCssReferences([child, base]);
    expect(refs).toHaveLength(2);
    expect(refs.map((r) => r.kind)).toEqual(["inline-style", "local-flask"]);
  });

  it("stores templateDir for local-flask references", () => {
    const text = `<link rel="stylesheet" href="{{ url_for('static', filename='css/app.css') }}">`;
    const refs = extractCssReferences([src(text, "/project/templates/index.html")]);
    expect(refs[0].templateDir).toBe("/project/templates");
  });
});

describe("FALLBACK_CSS", () => {
  it("is a non-empty string", () => {
    expect(typeof FALLBACK_CSS).toBe("string");
    expect(FALLBACK_CSS.length).toBeGreaterThan(0);
  });

  it("styles semantic HTML elements", () => {
    expect(FALLBACK_CSS).toContain("header");
    expect(FALLBACK_CSS).toContain("section");
    expect(FALLBACK_CSS).toContain("footer");
    expect(FALLBACK_CSS).toContain("nav");
  });
});
