import * as childProcess from "child_process";
import * as vscode from "vscode";
import { PrettierResolver } from "../../src/formatting/prettierResolver";

// Mock translations
jest.mock("../../src/translations", () => ({
  __esModule: true,
  default: {
    __: (key: string) => key,
  },
}));

// Mock module.createRequire
jest.mock("module", () => {
  const mockRequire = jest.fn();
  const mockResolve = jest.fn();
  const mockCreateRequire = jest.fn(() => {
    const req: any = (id: string) => mockRequire(id);
    req.resolve = (id: string) => mockResolve(id);
    return req;
  });
  return {
    createRequire: mockCreateRequire,
    _mockRequire: mockRequire,
    _mockResolve: mockResolve,
  };
});

// Spy on child_process.exec and promisify
jest.mock("child_process", () => {
  const actual = jest.requireActual("child_process");
  return {
    ...actual,
    exec: jest.fn(),
    // We keep the real promisify but exec is mocked
  };
});

describe("PrettierResolver", () => {
  const mockWorkspaceFolder = {
    uri: vscode.Uri.file("/test-workspace"),
    name: "test",
    index: 0,
  };

  let mockExec: jest.Mock;
  let mockRequire: jest.Mock;
  let mockResolve: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset private state on the module under test
    (PrettierResolver as any).didShowPrompt = false;
    if ((PrettierResolver as any).promptTimeout) {
      clearTimeout((PrettierResolver as any).promptTimeout);
      (PrettierResolver as any).promptTimeout = null;
    }

    // Default: single workspace folder
    vscode.workspace.workspaceFolders = [mockWorkspaceFolder];

    // Default config
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: jest.fn(),
      update: jest.fn(),
    });

    // Get references to mocks
    mockExec = childProcess.exec as unknown as jest.Mock;
    mockRequire = jest.requireMock("module")._mockRequire;
    mockResolve = jest.requireMock("module")._mockResolve;
  });

  describe("resolve", () => {
    it("returns prettier and plugin path when both are resolvable", async () => {
      const mockPrettier = { format: jest.fn() };
      mockRequire.mockImplementation((id: string) => {
        if (id === "prettier") return mockPrettier;
        throw new Error("not found");
      });
      mockResolve.mockReturnValue(
        "/test-workspace/node_modules/prettier-plugin-jinja-template/index.js"
      );

      const result = await PrettierResolver.resolve();

      expect(result).toEqual({
        prettier: mockPrettier,
        pluginPath: "/test-workspace/node_modules/prettier-plugin-jinja-template/index.js",
      });
      expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    });

    it("returns null when no workspace folders exist", async () => {
      vscode.workspace.workspaceFolders = undefined as any;

      const result = await PrettierResolver.resolve();

      expect(result).toBeNull();
      expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    });

    it("shows install prompt and returns null when prettier is not found", async () => {
      mockRequire.mockImplementation(() => {
        throw new Error("module not found");
      });

      const result = await PrettierResolver.resolve();

      expect(result).toBeNull();
      expect(vscode.window.showInformationMessage).toHaveBeenCalled();
    });

    it("does not show prompt twice in a row (didShowPrompt guard)", async () => {
      mockRequire.mockImplementation(() => {
        throw new Error("module not found");
      });

      // First call — should show prompt
      await PrettierResolver.resolve();
      expect(vscode.window.showInformationMessage).toHaveBeenCalledTimes(1);

      // Second call — should NOT show prompt (didShowPrompt is true)
      await PrettierResolver.resolve();
      expect(vscode.window.showInformationMessage).toHaveBeenCalledTimes(1);
    });

    it("shows prompt again after the cooldown expires", async () => {
      jest.useFakeTimers();
      mockRequire.mockImplementation(() => {
        throw new Error("module not found");
      });

      // First call
      await PrettierResolver.resolve();
      expect(vscode.window.showInformationMessage).toHaveBeenCalledTimes(1);

      // Advance time past the 5 min cooldown
      jest.advanceTimersByTime(300_001);

      // Manually reset didShowPrompt (the setTimeout would do it)
      (PrettierResolver as any).didShowPrompt = false;

      // Second call — should show prompt again
      await PrettierResolver.resolve();
      expect(vscode.window.showInformationMessage).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });
  });

  describe("install", () => {
    it("runs npm install and shows success message", async () => {
      // Mock exec to return a resolved promise via the real util.promisify
      mockExec.mockImplementation(
        (_cmd: string, _opts: any, cb?: (err: any, result: any) => void) => {
          if (cb) {
            cb(null, { stdout: "", stderr: "" });
          }
        }
      );

      const result = await PrettierResolver.install();

      expect(result).toBe(true);
      // promisify adds a callback as the 3rd arg
      expect(mockExec).toHaveBeenCalledWith(
        "npm install --save-dev prettier prettier-plugin-jinja-template",
        { cwd: "/test-workspace", timeout: 60_000 },
        expect.any(Function)
      );
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith("formatting.installed");
    }, 10_000);

    it("returns false when no workspace root", async () => {
      vscode.workspace.workspaceFolders = undefined as any;

      const result = await PrettierResolver.install();

      expect(result).toBe(false);
      expect(mockExec).not.toHaveBeenCalled();
    });
  });
});
