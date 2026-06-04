import { detectExtendsCycle, ExtendsCycleDeps } from "../../src/resolver/extendsCycle";

/**
 * Build deps from a simple map: fsPath -> raw extends path string (or null),
 * and a resolver that joins a raw path to the parent dir of the source file.
 */
function depsFromChain(
  extendsByFile: Record<string, string | null>,
  resolveMap: Record<string, string | null>
): ExtendsCycleDeps {
  return {
    readExtendsPath: async (fsPath) => extendsByFile[fsPath] ?? null,
    resolvePath: async (rawPath, fromFsPath) => resolveMap[`${fromFsPath}|${rawPath}`] ?? null,
  };
}

describe("detectExtendsCycle", () => {
  it("returns false for a template without extends", async () => {
    const deps = depsFromChain({ "/t/a.html": null }, {});
    expect(await detectExtendsCycle("/t/a.html", deps)).toBe(false);
  });

  it("returns false for a finite linear chain", async () => {
    const deps = depsFromChain(
      {
        "/t/a.html": "b.html",
        "/t/b.html": "c.html",
        "/t/c.html": null,
      },
      {
        "/t/a.html|b.html": "/t/b.html",
        "/t/b.html|c.html": "/t/c.html",
      }
    );
    expect(await detectExtendsCycle("/t/a.html", deps)).toBe(false);
  });

  it("detects a direct cycle (A extends B, B extends A)", async () => {
    const deps = depsFromChain(
      {
        "/t/a.html": "b.html",
        "/t/b.html": "a.html",
      },
      {
        "/t/a.html|b.html": "/t/b.html",
        "/t/b.html|a.html": "/t/a.html",
      }
    );
    expect(await detectExtendsCycle("/t/a.html", deps)).toBe(true);
  });

  it("detects a self-referential cycle (A extends A)", async () => {
    const deps = depsFromChain({ "/t/a.html": "a.html" }, { "/t/a.html|a.html": "/t/a.html" });
    expect(await detectExtendsCycle("/t/a.html", deps)).toBe(true);
  });

  it("returns false when a link cannot be resolved (that is JHE1101, not a cycle)", async () => {
    const deps = depsFromChain(
      { "/t/a.html": "missing.html" },
      {
        /* no entry -> unresolved */
      }
    );
    expect(await detectExtendsCycle("/t/a.html", deps)).toBe(false);
  });

  it("treats an unbounded chain as a cycle once the depth limit is exceeded", async () => {
    // Every file extends the next index forever; resolver always succeeds and
    // never repeats a visited node, so only the depth bound stops the walk.
    const deps: ExtendsCycleDeps = {
      readExtendsPath: async () => "next.html",
      resolvePath: async (_raw, fromFsPath) => {
        const n = Number(fromFsPath.replace(/\D/g, "")) || 0;
        return `/t/${n + 1}.html`;
      },
    };
    expect(await detectExtendsCycle("/t/0.html", deps)).toBe(true);
  });
});
