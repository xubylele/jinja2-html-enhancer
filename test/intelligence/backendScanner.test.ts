import { scanBackendFile, normalizeTemplateKey } from "../../src/intelligence/backendIndex";

describe("scanBackendFile", () => {
  const vars = (m: Map<string, Set<string>>, key: string) =>
    [...(m.get(key) ?? new Set<string>())].sort();

  it("extracts Flask render_template kwargs", () => {
    const m = scanBackendFile(`render_template('hello.html', user=u, count=1)`, "py");
    expect(vars(m, "hello.html")).toEqual(["count", "user"]);
  });

  it("extracts Django render dict keys", () => {
    const m = scanBackendFile(`render(request, 'page.html', {'user': u, 'n': 1})`, "py");
    expect(vars(m, "page.html")).toEqual(["n", "user"]);
  });

  it("extracts FastAPI TemplateResponse dict keys", () => {
    const m = scanBackendFile(`TemplateResponse('page.html', {'request': r, 'user': u})`, "py");
    expect(vars(m, "page.html")).toEqual(["request", "user"]);
  });

  it("extracts Jinja2 standalone get_template().render() kwargs", () => {
    const m = scanBackendFile(`env.get_template('p.html').render(user=u, n=1)`, "py");
    expect(vars(m, "p.html")).toEqual(["n", "user"]);
  });

  it("extracts Express object keys including shorthand", () => {
    const m = scanBackendFile(`res.render('p.html', { user, count: 1 })`, "js");
    expect(vars(m, "p.html")).toEqual(["count", "user"]);
  });

  it("extracts Nunjucks shorthand-only object", () => {
    const m = scanBackendFile(`env.render('p.html', { user })`, "js");
    expect(vars(m, "p.html")).toEqual(["user"]);
  });

  it("merges multiple call sites for the same template", () => {
    const m = scanBackendFile(
      `
        render_template('a.html', x=1)
        render_template('a.html', y=2)
        render_template('b.html', z=3)
      `,
      "py"
    );
    expect(vars(m, "a.html")).toEqual(["x", "y"]);
    expect(vars(m, "b.html")).toEqual(["z"]);
  });

  it("handles nested call expressions in args without losing the outer call", () => {
    const m = scanBackendFile(
      `render_template('a.html', name=foo(1, 2), items=bar({'k': v}))`,
      "py"
    );
    expect(vars(m, "a.html")).toEqual(expect.arrayContaining(["items", "name"]));
  });

  it("does not match Python patterns in JS source", () => {
    const m = scanBackendFile(`render_template('a.html', user=u)`, "js");
    expect(m.size).toBe(0);
  });

  it("skips JS reserved words in object literal positions", () => {
    const m = scanBackendFile(`res.render('p.html', { return: 1, user })`, "js");
    expect(vars(m, "p.html")).toEqual(["user"]);
  });
});

describe("normalizeTemplateKey", () => {
  it("strips leading ./ and / and normalizes separators", () => {
    expect(normalizeTemplateKey("./auth/login.html")).toBe("auth/login.html");
    expect(normalizeTemplateKey("/a/b.html")).toBe("a/b.html");
    expect(normalizeTemplateKey("a\\b.html")).toBe("a/b.html");
    expect(normalizeTemplateKey("plain.html")).toBe("plain.html");
  });
});
