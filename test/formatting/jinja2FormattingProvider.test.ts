import * as vscode from "vscode";
import { Jinja2FormattingProvider } from "../../src/formatting/jinja2FormattingProvider";

// Mock translations
jest.mock("../../src/translations", () => ({
  __esModule: true,
  default: {
    __: (key: string) => key,
  },
}));

// Mock prettierResolver — jest.fn() is called inside the factory for proper hoisting
jest.mock("../../src/formatting/prettierResolver", () => ({
  PrettierResolver: {
    resolve: jest.fn(),
  },
}));

const { PrettierResolver } = jest.requireMock("../../src/formatting/prettierResolver") as {
  PrettierResolver: { resolve: jest.Mock };
};

describe("Jinja2FormattingProvider", () => {
  let provider: Jinja2FormattingProvider;
  let mockDocument: any;
  let mockToken: vscode.CancellationToken;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new Jinja2FormattingProvider();

    mockDocument = {
      getText: jest
        .fn()
        .mockReturnValue("<html>\n<body>\n  <h1>{{ title }}</h1>\n</body>\n</html>"),
      uri: vscode.Uri.file("/workspace/template.html"),
      languageId: "html",
      positionAt: jest.fn((offset: number) => new vscode.Position(0, offset)),
      lineCount: 5,
    };

    mockToken = new vscode.CancellationToken();

    // Default: formatting enabled
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue(true),
      update: jest.fn(),
    });
  });

  it("returns empty edits when formatting is disabled", async () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: jest.fn().mockImplementation((key) => {
        if (key === "formatting.enabled") return false;
        return true;
      }),
      update: jest.fn(),
    });

    const edits = await provider.provideDocumentFormattingEdits(
      mockDocument,
      { tabSize: 2, insertSpaces: true },
      mockToken
    );

    expect(edits).toEqual([]);
    expect(PrettierResolver.resolve).not.toHaveBeenCalled();
  });

  it("returns empty edits when prettier is not resolved", async () => {
    PrettierResolver.resolve.mockResolvedValue(null);

    const edits = await provider.provideDocumentFormattingEdits(
      mockDocument,
      { tabSize: 2, insertSpaces: true },
      mockToken
    );

    expect(edits).toEqual([]);
    expect(PrettierResolver.resolve).toHaveBeenCalledTimes(1);
  });

  it("returns a TextEdit when prettier formats successfully", async () => {
    const formatted = "<html>\n<body>\n  <h1>{{ title }}</h1>\n</body>\n</html>\n";
    PrettierResolver.resolve.mockResolvedValue({
      prettier: {
        format: jest.fn().mockResolvedValue(formatted),
      },
      pluginPath: "/workspace/node_modules/prettier-plugin-jinja-template",
    });

    const edits = await provider.provideDocumentFormattingEdits(
      mockDocument,
      { tabSize: 2, insertSpaces: true },
      mockToken
    );

    expect(edits).toHaveLength(1);
    expect(edits[0]).toBeInstanceOf(vscode.TextEdit);
    expect(edits[0].newText).toBe(formatted);
  });

  it("returns empty edits when formatted output matches input", async () => {
    const original = "<html>\n<body>\n  <h1>{{ title }}</h1>\n</body>\n</html>\n";
    mockDocument.getText.mockReturnValue(original);
    PrettierResolver.resolve.mockResolvedValue({
      prettier: {
        format: jest.fn().mockResolvedValue(original),
      },
      pluginPath: "/workspace/node_modules/prettier-plugin-jinja-template",
    });

    const edits = await provider.provideDocumentFormattingEdits(
      mockDocument,
      { tabSize: 2, insertSpaces: true },
      mockToken
    );

    expect(edits).toEqual([]);
  });

  it("returns empty edits when prettier throws", async () => {
    PrettierResolver.resolve.mockResolvedValue({
      prettier: {
        format: jest.fn().mockRejectedValue(new Error("parse error")),
      },
      pluginPath: "/workspace/node_modules/prettier-plugin-jinja-template",
    });

    const edits = await provider.provideDocumentFormattingEdits(
      mockDocument,
      { tabSize: 2, insertSpaces: true },
      mockToken
    );

    expect(edits).toEqual([]);
  });

  it("calls prettier.format with jinja-template parser and plugin path", async () => {
    const formatMock = jest.fn().mockResolvedValue("<html>\n</html>\n");
    const pluginPath = "/workspace/node_modules/prettier-plugin-jinja-template";
    PrettierResolver.resolve.mockResolvedValue({
      prettier: { format: formatMock },
      pluginPath,
    });

    await provider.provideDocumentFormattingEdits(
      mockDocument,
      { tabSize: 2, insertSpaces: true },
      mockToken
    );

    expect(formatMock).toHaveBeenCalledWith(mockDocument.getText(), {
      parser: "jinja-template",
      plugins: [pluginPath],
    });
  });
});
