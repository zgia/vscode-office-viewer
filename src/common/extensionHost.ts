let webExtensionHost = false;

/** Mark the current extension host as the browser (web worker) host. */
export function markWebExtensionHost(): void {
    webExtensionHost = true;
}

export function isWebExtensionHost(): boolean {
    return webExtensionHost;
}
