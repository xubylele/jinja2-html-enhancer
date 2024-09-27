import * as vscode from 'vscode';
import * as prettier from 'prettier';

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('extension.formatHtmlAndJinja2', () => {
		const { activeTextEditor } = vscode.window;
		if (activeTextEditor) {
			const document = activeTextEditor.document;
			if (document.languageId === 'html' || document.fileName.endsWith('.html') || document.fileName.endsWith('.jinja2.html')) {
				formatDocument(activeTextEditor);
			} else {
				vscode.window.showErrorMessage('Este comando solo funciona con archivos HTML o Jinja2.');
			}
		}
	});

	context.subscriptions.push(disposable);
}

function formatJinja2(text: string, indentType: string): string {
	const lines = text.split('\n');
	let formatted = '';
	let indentLevel = 0;
	let previousIndent = '';
	let lastNonEmptyIndent = '';
	let openingBlockIndent = '';

	const openingBlocks = ['if', 'for', 'block', 'macro', 'while'];
	const closingBlocks = ['endif', 'endfor', 'endblock', 'endmacro', 'endwhile'];

	lines.forEach(line => {
		const trimmedLine = line.trim();
		const currentIndentMatch = line.match(/^(\s*)/);
		const currentIndent = currentIndentMatch ? currentIndentMatch[1] : '';

		if (trimmedLine === '') {
			formatted += '\n';
			return;
		}

		if (closingBlocks.some(block => trimmedLine.startsWith(`{% ${block}`))) {
			indentLevel -= 1;
			formatted += openingBlockIndent + trimmedLine + '\n';
			return;
		}

		if (trimmedLine.startsWith('{%') || trimmedLine.startsWith('{{')) {
			const newIndent = (lastNonEmptyIndent !== '' ? lastNonEmptyIndent : previousIndent) + indentType.repeat(indentLevel);
			formatted += newIndent + trimmedLine + '\n';

			if (openingBlocks.some(block => trimmedLine.startsWith(`{% ${block}`))) {
				openingBlockIndent = newIndent;
				indentLevel += 1;
			}
		} else {
			formatted += line + '\n';
			previousIndent = currentIndent;
			if (trimmedLine !== '') {
				lastNonEmptyIndent = currentIndent;
			}
		}
	});

	return formatted;
}


async function formatDocument(editor: vscode.TextEditor) {
	const document = editor.document;
	const fullText = document.getText();

	const config = vscode.workspace.getConfiguration('editor', document.uri);
	const insertSpaces = config.get('insertSpaces', true);
	const tabWidth = config.get('tabSize', 4);
	const indentType = insertSpaces ? ' '.repeat(tabWidth) : '\t';

	const prettierOptions: prettier.Options = {
		parser: 'html',
		useTabs: !insertSpaces,
		tabWidth: tabWidth,
		printWidth: 120
	};

	const htmlFormatted = await prettier.format(fullText, prettierOptions);
	const finalFormatted = formatJinja2(htmlFormatted, indentType);

	editor.edit(editBuilder => {
		const lastLine = document.lineAt(document.lineCount - 1);
		const range = new vscode.Range(
			new vscode.Position(0, 0),
			lastLine.range.end
		);
		editBuilder.replace(range, finalFormatted);
	});
}

export function deactivate() { }
