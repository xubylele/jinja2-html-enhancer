import * as vscode from "vscode";
import { TemplateRootsProvider } from "../../src/resolver/templateRoots";

const getConfiguration = vscode.workspace.getConfiguration as jest.Mock;
const findFiles = vscode.workspace.findFiles as jest.Mock;

function setFolders(paths: string[]) {
  (vscode.workspace as any).workspaceFolders = paths.map((p) => ({
    uri: { fsPath: p },
  }));
}

describe("TemplateRootsProvider", () => {
  afterEach(() => {
    (vscode.workspace as any).workspaceFolders = undefined;
    getConfiguration.mockReset();
    findFiles.mockReset();
  });

  it("returns an empty list when there is no workspace", async () => {
    setFolders([]);
    getConfiguration.mockReturnValue({ get: () => [] });
    findFiles.mockResolvedValue([]);

    const provider = new TemplateRootsProvider();
    expect(await provider.get()).toEqual([]);
    provider.dispose();
  });

  it("resolves relative configured roots against the workspace folder", async () => {
    setFolders(["/proj"]);
    getConfiguration.mockReturnValue({ get: () => ["templates"] });
    findFiles.mockResolvedValue([]);

    const provider = new TemplateRootsProvider();
    expect(await provider.get()).toContain("/proj/templates");
    provider.dispose();
  });

  it("auto-discovers directories named 'templates'", async () => {
    setFolders(["/proj"]);
    getConfiguration.mockReturnValue({ get: () => [] });
    findFiles.mockResolvedValue([{ fsPath: "/proj/app/templates/pages/home.html" }]);

    const provider = new TemplateRootsProvider();
    expect(await provider.get()).toContain("/proj/app/templates");
    provider.dispose();
  });

  it("caches the computed roots until invalidated", async () => {
    setFolders(["/proj"]);
    getConfiguration.mockReturnValue({ get: () => [] });
    findFiles.mockResolvedValue([]);

    const provider = new TemplateRootsProvider();
    await provider.get();
    await provider.get();
    expect(findFiles).toHaveBeenCalledTimes(1);

    provider.invalidate();
    await provider.get();
    expect(findFiles).toHaveBeenCalledTimes(2);
    provider.dispose();
  });
});
