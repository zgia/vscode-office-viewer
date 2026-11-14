import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { Alert, Spin } from "antd";
import { DocxEditor } from "@eigenpal/docx-editor-react";
import "@eigenpal/docx-editor-react/styles.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { handler } from "../../util/vscode";
import { loadOfficeBuffer } from "../../util/loadOfficeContent";
import SponsorBar from "../components/SponsorBar";
import "./Word.css";

type WordColorMode = "light" | "adaptive";

interface WordOpenPayload {
    path?: string;
    buffer?: number[];
    error?: string;
    fileName?: string;
    documentCacheId?: string;
    nonce?: number;
}

export default function Word() {
    const [colorMode, setColorMode] = useState<WordColorMode>("adaptive");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [documentBuffer, setDocumentBuffer] = useState<ArrayBuffer | undefined>(undefined);
    const [documentKey, setDocumentKey] = useState("");
    const [fileName, setFileName] = useState("");
    const [commentsSidebarOpen, setCommentsSidebarOpen] = useState(false);
    const skipCommentsAutoOpenRef = useRef(true);

    const adaptiveColorMode = colorMode === "adaptive";

    const toggleColorMode = () => {
        setColorMode((prev) => {
            const next: WordColorMode = prev === "adaptive" ? "light" : "adaptive";
            return next;
        });
    };

    const loadDocument = useCallback(async (payload: WordOpenPayload) => {
        setLoading(true);
        setError(null);
        setDocumentBuffer(undefined);

        try {
            setFileName(payload.fileName ?? "");
            setDocumentKey(`${payload.documentCacheId ?? ""}-${payload.nonce ?? Date.now()}`);
            skipCommentsAutoOpenRef.current = true;
            setCommentsSidebarOpen(false);
            const buffer = await loadOfficeBuffer(payload);
            setDocumentBuffer(buffer);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load document");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        handler
            .on("open", (payload: WordOpenPayload) => {
                void loadDocument(payload);
            })
            .emit("init");
    }, [loadDocument]);

    return (
        <div className={`word-viewer${adaptiveColorMode ? " word-viewer--vscode-theme" : ""}`}>
            <button
                type="button"
                className="dark-mode-toggle"
                title={adaptiveColorMode ? "Switch to light mode" : "Switch to adaptive dark mode"}
                aria-label={adaptiveColorMode ? "Switch to light mode" : "Switch to adaptive dark mode"}
                onClick={toggleColorMode}
            >
                {adaptiveColorMode ? <SunOutlined /> : <MoonOutlined />}
            </button>
            <Spin spinning={loading} fullscreen />
            {error && <Alert type="error" message={error} showIcon style={{ margin: 16 }} />}
            {documentBuffer && !loading && !error && (
                <>
                    <DocxEditor
                        key={documentKey}
                        className="word-editor"
                        documentBuffer={documentBuffer}
                        documentName={fileName}
                        documentNameEditable={false}
                        readOnly
                        mode="viewing"
                        commentsSidebarOpen={commentsSidebarOpen}
                        onCommentsSidebarOpenChange={(open) => {
                            if (open && skipCommentsAutoOpenRef.current) {
                                skipCommentsAutoOpenRef.current = false;
                                return;
                            }
                            setCommentsSidebarOpen(open);
                        }}
                        colorMode="light"
                        showFileOpen={false}
                        showHelpMenu={false}
                    />
                    <footer className="word-sponsor-footer">
                        <SponsorBar placement="right" />
                    </footer>
                </>
            )}
        </div>
    );
}
