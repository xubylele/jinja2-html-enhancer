import * as vscode from 'vscode';
import { filterAtOffset, getFilterDoc } from '@xubylele/jinja2-enhanced-shared';
import I18n from '../translations';

export class FilterDocsHover implements vscode.HoverProvider {
	provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
		const text = document.getText();
		const offset = document.offsetAt(position);

		const filter = filterAtOffset(text, offset);
		if (!filter) { return undefined; }

		const doc = getFilterDoc(filter.name);
		if (!doc) { return undefined; }

		const md = new vscode.MarkdownString(undefined, true);
		md.isTrusted = true;
		md.supportHtml = false;

		md.appendMarkdown(`**${I18n.__('hover.filterDocs.title')}:** \`${doc.name}\`\n\n`);
		md.appendMarkdown(`**${I18n.__('hover.filterDocs.signature')}:** \`${doc.signature}\`\n\n`);
		md.appendMarkdown(`${I18n.__(doc.descriptionKey)}\n\n`);
		md.appendMarkdown(`**${I18n.__('hover.filterDocs.example')}:** \`${doc.example}\`\n`);

		return new vscode.Hover(md);
	}
}
