import * as vscode from 'vscode';
import I18n from '../translations';

export class CommentToggle {
  public toggle(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage(I18n.__('error.noActiveEditor'));
      return;
    }

    const document = editor.document;

    editor.edit(editBuilder => {
      for (const selection of editor.selections) {
        if (selection.isEmpty) {
          const line = document.lineAt(selection.active.line);
          this.toggleLineComment(editBuilder, line);
        } else {
          const startLine = selection.start.line;
          const endLine = selection.end.line;
          const allCommented = this.areAllLinesCommented(document, startLine, endLine);

          for (let i = startLine; i <= endLine; i++) {
            const line = document.lineAt(i);
            if (line.isEmptyOrWhitespace) {
              continue;
            }
            if (allCommented) {
              this.uncommentLine(editBuilder, line);
            } else {
              this.commentLine(editBuilder, line);
            }
          }
        }
      }
    });
  }

  private toggleLineComment(editBuilder: vscode.TextEditorEdit, line: vscode.TextLine): void {
    if (this.isLineCommented(line.text)) {
      this.uncommentLine(editBuilder, line);
    } else {
      this.commentLine(editBuilder, line);
    }
  }

  private isLineCommented(text: string): boolean {
    const trimmed = text.trim();
    return trimmed.startsWith('{#') && trimmed.endsWith('#}');
  }

  private areAllLinesCommented(document: vscode.TextDocument, startLine: number, endLine: number): boolean {
    for (let i = startLine; i <= endLine; i++) {
      const line = document.lineAt(i);
      if (!line.isEmptyOrWhitespace && !this.isLineCommented(line.text)) {
        return false;
      }
    }
    return true;
  }

  private commentLine(editBuilder: vscode.TextEditorEdit, line: vscode.TextLine): void {
    const text = line.text;
    const firstNonWs = line.firstNonWhitespaceCharacterIndex;
    const indent = text.substring(0, firstNonWs);
    const content = text.substring(firstNonWs);
    editBuilder.replace(line.range, `${indent}{# ${content} #}`);
  }

  private uncommentLine(editBuilder: vscode.TextEditorEdit, line: vscode.TextLine): void {
    const text = line.text;
    const trimmed = text.trim();
    const firstNonWs = line.firstNonWhitespaceCharacterIndex;
    const indent = text.substring(0, firstNonWs);

    // Match {# content #} with optional single surrounding space
    const match = trimmed.match(/^\{#\s?(.*?)\s?#\}$/s);
    if (match) {
      editBuilder.replace(line.range, `${indent}${match[1]}`);
    }
  }
}
