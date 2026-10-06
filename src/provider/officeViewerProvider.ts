import { ReactApp } from '@/common/reactApp';
import { getFileSuffix } from '@/common/fileSuffix';
import * as vscode from 'vscode';
import { Handler } from '../common/handler';
import { handleCommonEvent } from './officeCommonHandler';
import { getExtensionResourceRoots } from '@/common/extensionResource';

/**
 * Read-only viewer for Excel, Word and PowerPoint files.
 */
export class OfficeViewerProvider implements vscode.CustomReadonlyEditorProvider {

	constructor(private context: vscode.ExtensionContext) { }

	bindCustomEditors(viewOption: { webviewOptions: vscode.WebviewPanelOptions }) {
		return [
			vscode.window.registerCustomEditorProvider('cweijan.officeViewer', this, viewOption),
		];
	}

	public openCustomDocument(uri: vscode.Uri, openContext: vscode.CustomDocumentOpenContext, token: vscode.CancellationToken): vscode.CustomDocument | Thenable<vscode.CustomDocument> {
		return { uri, dispose: (): void => { } };
	}

	public resolveCustomEditor(document: vscode.CustomDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): void | Thenable<void> {
		const uri = document.uri;
		const webview = webviewPanel.webview;
		const folderPath = vscode.Uri.joinPath(uri, '..');
		webview.options = {
			enableScripts: true,
			localResourceRoots: [...getExtensionResourceRoots(this.context), folderPath],
		};

		const handler = Handler.bind(webviewPanel, uri);
		handleCommonEvent(uri, handler);

		let route: string;
		switch (getFileSuffix(uri.fsPath)) {
			case '.xlsx':
			case '.xlsm':
			case '.xls':
			case '.csv':
			case '.tsv':
			case '.ods':
				route = 'excel';
				break;
			case '.docx':
			case '.dotx':
				route = 'word';
				break;
			case '.pptx':
			case '.pptm':
				route = 'ppt';
				break;
			default:
				void vscode.commands.executeCommand('vscode.openWith', uri, 'default');
		}
		if (route) return ReactApp.view(webview, { route });
	}

}
