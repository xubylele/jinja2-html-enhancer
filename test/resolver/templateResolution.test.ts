import * as vscode from "vscode";
import { resolveToFilePath } from "../../src/resolver/templateResolution";

const statMock = vscode.workspace.fs.stat as jest.Mock;

describe("resolveToFilePath", () => {
  beforeEach(() => {
    statMock.mockReset();
  });

  it("returns the first candidate that exists on disk", async () => {
    // With an empty roots list, resolveTemplatePath falls back to a path
    // relative to the source file's directory.
    statMock.mockResolvedValue({ type: 1 });
    const result = await resolveToFilePath("base.html", "/proj/t/page.html", []);
    expect(result).toBe("/proj/t/base.html");
    expect(statMock).toHaveBeenCalled();
  });

  it("prefers a configured root over the relative fallback", async () => {
    // /roots/base.html exists; the relative candidate would too, but the root
    // candidate is tried first.
    statMock.mockImplementation(async (uri: { fsPath: string }) => {
      if (uri.fsPath === "/roots/base.html") {
        return { type: 1 };
      }
      throw new Error("ENOENT");
    });
    const result = await resolveToFilePath("base.html", "/proj/t/page.html", ["/roots"]);
    expect(result).toBe("/roots/base.html");
  });

  it("returns undefined when no candidate exists", async () => {
    statMock.mockRejectedValue(new Error("ENOENT"));
    const result = await resolveToFilePath("nope.html", "/proj/t/page.html", []);
    expect(result).toBeUndefined();
  });
});
