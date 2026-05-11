import * as vscode from "vscode";
import { DiagnosticsManager } from "../../src/diagnostics/diagnosticsManager";

jest.mock("../../src/translations", () => ({
  __esModule: true,
  default: {
    __: (key: string, params?: { variable?: string }) =>
      params?.variable ? `${key}:${params.variable}` : key,
  },
}));

describe("DiagnosticsManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates warning diagnostics for unset variables", () => {
    const set = jest.fn();
    (vscode.languages.createDiagnosticCollection as jest.Mock).mockReturnValue({
      set,
      clear: jest.fn(),
      dispose: jest.fn(),
    });

    const manager = new DiagnosticsManager();
    const document = {
      uri: vscode.Uri.file("/tmp/template.html"),
      getText: () => "{{ customer }} and {{ customer }} and {{ known }}",
      positionAt: (index: number) => ({ index }),
    } as any;

    manager.updateDiagnostics(document, ["customer", "known"], ["known"]);

    expect(set).toHaveBeenCalledTimes(1);
    const diagnostics = set.mock.calls[0][1];
    expect(diagnostics).toHaveLength(2);
    expect(diagnostics[0].code).toBe("JHE0001");
    expect(diagnostics[0].severity).toBe(vscode.DiagnosticSeverity.Warning);
  });
});
