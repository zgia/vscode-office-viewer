import * as vscode from 'vscode';
import { Handler } from "@/common/handler";
import { Uri } from 'vscode';
import { emitFileOfficeOpen, emitVirtualOfficeOpen, isVirtualUri } from '@/provider/handlers/officeContent';

/**
 * Bind the read-only viewer events: load the document and forward the
 * webview actions (sponsor links, external hyperlinks) to VS Code.
 */
export function handleCommonEvent(uri: Uri, handler: Handler) {
    const send = async () => {
        if (isVirtualUri(uri)) {
            void emitVirtualOfficeOpen(handler, uri);
            return;
        }
        await emitFileOfficeOpen(handler, uri, handler.panel.webview);
    };
    handler
        .on("init", () => { void send(); })
        .on("fileChange", () => { void send(); })
        .on('developerTool', () => vscode.commands.executeCommand('workbench.action.toggleDevTools'))
        .on('sponsorClick', () => { })
        .on('openSponsor', () => {
            vscode.commands.executeCommand(
                'workbench.extensions.action.showExtensionsWithIds',
                ['cweijan.vscode-database-client2'],
            );
        })
        .on('openExternal', (url: string) => {
            if (url) {
                vscode.env.openExternal(vscode.Uri.parse(url));
            }
        });
}
