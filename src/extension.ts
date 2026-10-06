import * as vscode from 'vscode';
import { OfficeViewerProvider } from './provider/officeViewerProvider';
import { ReactApp } from './common/reactApp';

export async function activate(context: vscode.ExtensionContext) {
	ReactApp.init(context);
	const viewOption = { webviewOptions: { retainContextWhenHidden: true } };
	const viewerInstance = new OfficeViewerProvider(context);
	context.subscriptions.push(
		...viewerInstance.bindCustomEditors(viewOption)
	);
}

export function deactivate() { }
