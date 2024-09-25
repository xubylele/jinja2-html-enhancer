import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('extension.formatJinja2', () => {
		const { activeTextEditor } = vscode.window;
		if (activeTextEditor) {
			const document = activeTextEditor.document;
			if (document.languageId === 'html' && document.fileName.endsWith('.html')) {
				formatDocument(activeTextEditor);
			}
		}
	});

	context.subscriptions.push(disposable);
}

function formatDocument(editor: vscode.TextEditor) {
	const document = editor.document;
	const fullText = document.getText();

	// Aquí puedes implementar tu lógica de formateo.
	const formattedText = customFormatter(fullText);

	editor.edit(editBuilder => {
		const lastLine = document.lineAt(document.lineCount - 1);
		const range = new vscode.Range(
			new vscode.Position(0, 0),
			lastLine.range.end
		);
		editBuilder.replace(range, formattedText);
	});
}

function customFormatter(text: string): string {
	// Lógica básica de formateo para HTML con sintaxis Jinja2
	return text
		.replace(/\s*({%|{{)/g, '$1 ') // Asegura espacio después de {% o {{
		.replace(/(%}|}})\s*/g, ' $1') // Asegura espacio antes de %} o }}
		.replace(/\n\s*\n/g, '\n');    // Elimina líneas vacías consecutivas
}

export function deactivate() { }
