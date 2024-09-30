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
	const jinja2Formatted = formatJinja2(htmlFormatted, indentType);

	editor.edit(editBuilder => {
		const lastLine = document.lineAt(document.lineCount - 1);
		const range = new vscode.Range(
			new vscode.Position(0, 0),
			lastLine.range.end
		);
		editBuilder.replace(range, jinja2Formatted);
	});
}

function formatJinja2(fullText: string, indentType: string) {
	const lines = fullText.split('\n');
	let jinja2Formatted = '';

	const jinja2Block = /{%.*%}/;
	const jinja2Comment = /{#.*#}/;
	const jinja2Variable = /{{.*}}/;
	const jinja2EndBlock = /{%.*end.*%}/;
	const jinja2EndVariable = /{{.*}}/;
	const jinja2EndComment = /{#.*#}/;

	lines.forEach((line, index) => {
		const isBlock = jinja2Block.test(line);
		const isComment = jinja2Comment.test(line);
		const isVariable = jinja2Variable.test(line);
		const isEndBlock = jinja2EndBlock.test(line);
		const isEndVariable = jinja2EndVariable.test(line);
		const isEndComment = jinja2EndComment.test(line);

		if (isBlock || isComment || isVariable) {
			jinja2Formatted += `${indentType}${line}\n`;
		} else if (isEndBlock || isEndVariable || isEndComment) {
			jinja2Formatted += `${line}\n`;
		} else {
			jinja2Formatted += `${indentType}${line}\n`;
		}
	});

	return jinja2Formatted;
}

export function deactivate() { }
