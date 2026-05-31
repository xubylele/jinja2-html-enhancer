import * as vscode from "vscode";
import {
  GOTO_COMMAND,
  gotoDefinitionCommand,
} from "../../src/commands/gotoDefinitionCommand";

const showTextDocument = jest.fn();
beforeEach(() => {
  (vscode.window as any).showTextDocument = showTextDocument;
  showTextDocument.mockReset();
});

describe("GOTO_COMMAND", () => {
  it("exports the expected command ID", () => {
    expect(GOTO_COMMAND).toBe("jinja2-html-enhancer.gotoDefinition");
  });
});

describe("gotoDefinitionCommand", () => {
  it("registers the command and returns a disposable", () => {
    const registerCommandMock = vscode.commands.registerCommand as jest.Mock;
    registerCommandMock.mockReturnValue({ dispose: jest.fn() });

    const disposable = gotoDefinitionCommand();
    expect(registerCommandMock).toHaveBeenCalledWith(
      GOTO_COMMAND,
      expect.any(Function)
    );
    expect(disposable).toBeDefined();
  });

  it("opens the document at the given location when handler is called", async () => {
    const registerCommandMock = vscode.commands.registerCommand as jest.Mock;
    let handler: ((payload: any) => Promise<void>) | undefined;
    registerCommandMock.mockImplementation((_cmd: string, fn: any) => {
      handler = fn;
      return { dispose: jest.fn() };
    });

    gotoDefinitionCommand();

    const mockDoc = {};
    const openTextDocumentMock = vscode.workspace.openTextDocument as jest.Mock;
    openTextDocumentMock.mockResolvedValue(mockDoc);
    showTextDocument.mockResolvedValue(undefined);

    await handler!({
      uri: "file:///proj/base.html",
      startLine: 5,
      startChar: 0,
      endLine: 5,
      endChar: 8,
    });

    expect(openTextDocumentMock).toHaveBeenCalled();
    expect(showTextDocument).toHaveBeenCalledWith(
      mockDoc,
      expect.objectContaining({ preserveFocus: false })
    );
  });

  it("does nothing when payload is falsy", async () => {
    const registerCommandMock = vscode.commands.registerCommand as jest.Mock;
    let handler: ((payload: any) => Promise<void>) | undefined;
    registerCommandMock.mockImplementation((_cmd: string, fn: any) => {
      handler = fn;
      return { dispose: jest.fn() };
    });

    gotoDefinitionCommand();

    const openTextDocumentMock = vscode.workspace.openTextDocument as jest.Mock;
    openTextDocumentMock.mockReset();

    await handler!(null);
    expect(openTextDocumentMock).not.toHaveBeenCalled();
  });
});
