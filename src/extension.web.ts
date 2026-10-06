/**
 * Web extension host entry (`package.json#browser`).
 * Only the read-only Office Viewer is available in the browser.
 */
import * as vscode from 'vscode';
import { markWebExtensionHost } from './common/extensionHost';
import { ReactApp } from './common/reactApp';
import { OfficeViewerProvider } from './provider/officeViewerProvider';

export async function activate(context: vscode.ExtensionContext) {
	markWebExtensionHost();
	ReactApp.init(context);

	const viewOption = { webviewOptions: { retainContextWhenHidden: true } };
	const viewerInstance = new OfficeViewerProvider(context);

	context.subscriptions.push(
		...viewerInstance.bindCustomEditors(viewOption),
	);
}

export function deactivate() { }
