import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { App, Spin } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { handler, vscodeApi } from "../../util/vscode.ts";
import { isVscodeEditorDark, observeVscodeThemeChange } from "../../util/vscodeTheme.ts";
import { loadOfficeBuffer } from "../../util/loadOfficeContent.ts";
import SponsorBar from '../components/SponsorBar';
import './Excel.less';
import { MIN_VIEW_COLS, MIN_VIEW_ROWS } from "./excel_meta.ts";
import { loadSheets } from "./excel_reader.ts";
import Spreadsheet from './x-spreadsheet/index';
import FindPanel, { type FindPanelHandle } from './FindPanel';
import { parseSpreadsheetLink } from './excel_hyperlink';
import { initExcelLocale, t } from './excel_i18n';

initExcelLocale();

type ExcelColorMode = 'adaptive' | 'light';

const EXCEL_COLOR_MODE_KEY = 'office-excel-color-mode';
const LEGACY_DARK_MODE_KEY = 'office-dark-mode';

function loadExcelColorMode(): ExcelColorMode {
    const state = vscodeApi?.getState?.() as { excelColorMode?: ExcelColorMode } | undefined;
    if (state?.excelColorMode === 'light' || state?.excelColorMode === 'adaptive') {
        return state.excelColorMode;
    }
    try {
        const saved = localStorage.getItem(EXCEL_COLOR_MODE_KEY);
        if (saved === 'light' || saved === 'adaptive') {
            return saved;
        }
        const legacy = localStorage.getItem(LEGACY_DARK_MODE_KEY);
        if (legacy === '1') {
            return 'adaptive';
        }
        if (legacy === '0') {
            return 'light';
        }
    } catch { }
    return 'light';
}

function saveExcelColorMode(mode: ExcelColorMode) {
    try {
        localStorage.setItem(EXCEL_COLOR_MODE_KEY, mode);
    } catch { }
    if (vscodeApi?.setState) {
        const prev = (vscodeApi.getState?.() ?? {}) as Record<string, unknown>;
        vscodeApi.setState({ ...prev, excelColorMode: mode });
    }
}

type ExcelViewState = { ri: number; ci: number; sheetIndex: number };

const EXCEL_VIEW_STATE_SUFFIX = '-excel-view';

function getViewStateKey(documentCacheId: string): string {
    return `${documentCacheId}${EXCEL_VIEW_STATE_SUFFIX}`;
}

function loadViewState(documentCacheId: string): ExcelViewState | null {
    if (!documentCacheId) return null;
    const key = getViewStateKey(documentCacheId);
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw) as ExcelViewState;
    } catch {
        return null;
    }
}

function saveViewState(documentCacheId: string, view: ExcelViewState) {
    if (!documentCacheId) return;
    const key = getViewStateKey(documentCacheId);
    try {
        localStorage.setItem(key, JSON.stringify(view));
    } catch {
        // ignore quota / private mode errors
    }
}

function restoreViewState(spreadSheet: Spreadsheet, saved: ExcelViewState) {
    const sheets = spreadSheet.getData();
    if (!sheets.length) return;
    const sheetIndex = Math.min(Math.max(0, saved.sheetIndex), sheets.length - 1);
    const sheet = sheets[sheetIndex];
    const maxRi = Math.max(0, (sheet.rows?.len ?? 1) - 1);
    const maxCi = Math.max(0, (sheet.cols?.len ?? 1) - 1);
    const ri = Math.min(Math.max(0, saved.ri), maxRi);
    const ci = Math.min(Math.max(0, saved.ci), maxCi);
    spreadSheet.scrollToCell(ri, ci, sheetIndex);
}

function ExcelViewer() {
    const { message } = App.useApp();
    const [loading, setLoading] = useState(true)
    const [colorMode, setColorMode] = useState(loadExcelColorMode)
    const [vscodeDark, setVscodeDark] = useState(isVscodeEditorDark)
    const [findPanelOpen, setFindPanelOpen] = useState(false)
    const findPanelRef = useRef(false)
    const findPanelHandleRef = useRef<FindPanelHandle>(null)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [activeSpreadsheet, setActiveSpreadsheet] = useState<Spreadsheet | null>(null)
    const [bottombarEl, setBottombarEl] = useState<HTMLElement | null>(null)
    const documentCacheIdRef = useRef('')
    const spreadSheetRef = useRef<Spreadsheet | null>(null)

    useEffect(() => {
        findPanelRef.current = findPanelOpen;
    }, [findPanelOpen]);

    const adaptiveColorMode = colorMode === 'adaptive';
    const themedDark = adaptiveColorMode && vscodeDark;

    useEffect(() => {
        if (!adaptiveColorMode) {
            return;
        }
        return observeVscodeThemeChange(() => {
            setVscodeDark(isVscodeEditorDark());
            requestAnimationFrame(() => spreadSheetRef.current?.reRender());
        });
    }, [adaptiveColorMode]);

    useEffect(() => {
        document.body.classList.toggle('office-adaptive', adaptiveColorMode)
        document.body.classList.toggle('office-dark', themedDark)
        return () => {
            document.body.classList.remove('office-adaptive')
            document.body.classList.remove('office-dark')
        }
    }, [adaptiveColorMode, themedDark])

    const toggleColorMode = () => {
        setColorMode(prev => {
            const next: ExcelColorMode = prev === 'adaptive' ? 'light' : 'adaptive';
            saveExcelColorMode(next);
            if (next === 'adaptive') {
                setVscodeDark(isVscodeEditorDark());
            }
            return next;
        })
    }

    useEffect(() => {
        spreadSheetRef.current?.reRender()
    }, [adaptiveColorMode, themedDark])

    const handleAutoFitColumns = useCallback(() => {
        const spreadSheet = spreadSheetRef.current;
        if (!spreadSheet) return;
        spreadSheet.autoFitColumns();
        message.success({ duration: 1.5, content: t('viewer.autoFitDone'), className: 'excel-toast-message' });
    }, [message]);

    const openFindPanel = useCallback(() => {
        setFindPanelOpen(true);
        requestAnimationFrame(() => findPanelHandleRef.current?.focusFindInput(true));
    }, []);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.code === 'KeyF') {
                e.preventDefault();
                openFindPanel();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.altKey && e.code === 'Digit0') {
                e.preventDefault();
                handleAutoFitColumns();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [handleAutoFitColumns, openFindPanel]);

    useEffect(() => {
        const container = document.getElementById('container');

        const initSpreadsheet = async (buffer: ArrayBuffer, payload: any) => {
            const { sheets, maxLength, maxCols } = await loadSheets(buffer, payload.ext);
            const viewRowLen = Math.max(maxLength ?? 0, MIN_VIEW_ROWS);
            const viewColLen = Math.max(maxCols ?? 0, MIN_VIEW_COLS);
            container.innerHTML = '';
            const spreadSheet = new Spreadsheet(container, {
                mode: 'read',
                showContextmenu: false,
                showToolbar: true,
                extendToolbar: {
                    right: [
                        {
                            tip: `${t('viewer.autoFitColumns')} (${navigator.platform.includes('Mac') ? 'Cmd+Alt+0' : 'Ctrl+Alt+0'})`,
                            el: (() => {
                                const button = document.createElement('span');
                                button.textContent = 'AF';
                                button.className = 'excel-autofit-badge';
                                return button;
                            })(),
                            onClick: () => {
                                handleAutoFitColumns();
                            },
                        },
                    ],
                },
                row: { len: viewRowLen, height: 30 },
                col: { len: viewColLen },
                view: { height: () => window.innerHeight - 2 },
            });
            spreadSheetRef.current = spreadSheet;
            setActiveSpreadsheet(spreadSheet);
            setLoading(false);
            spreadSheet.loadData(sheets);
            requestAnimationFrame(() => {
                setBottombarEl(document.querySelector('.x-spreadsheet-bottombar') as HTMLElement | null);
            });
            spreadSheet.on('find', () => { openFindPanel(); });
            const persistView = () => {
                saveViewState(documentCacheIdRef.current, spreadSheet.getSelection());
            };
            spreadSheet.on('cell-selected', () => { persistView(); });
            spreadSheet.onSheetChange(() => { persistView(); });
            spreadSheet.onOpenLink((linkPayload) => {
                const parsed = parseSpreadsheetLink(linkPayload.link);
                if (parsed.type === 'internal') {
                    spreadSheet.followHyperlink(linkPayload);
                } else {
                    handler.emit('openExternal', parsed.url);
                }
            });
            const savedView = loadViewState(documentCacheIdRef.current);
            if (savedView) {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => { restoreViewState(spreadSheet, savedView); });
                });
            }
        };

        handler.on("open", (payload) => {
            documentCacheIdRef.current = payload.documentCacheId ?? '';
            loadOfficeBuffer(payload).then(async (buffer) => {
                try {
                    await initSpreadsheet(buffer, payload);
                } catch (e) {
                    const msg = (e as Error).message || String(e);
                    console.error(`Failed to load Excel file: ${msg}`, e);
                    setLoadError(msg);
                    setLoading(false);
                }
            }).catch(error => {
                const msg = (error as Error).message || String(error);
                console.error(`Failed to load Excel file: ${msg}`, error);
                setLoadError(msg);
                setLoading(false);
            });
        }).emit("init")

        let themeTimer: ReturnType<typeof setTimeout>;
        const themeObserver = new MutationObserver(() => {
            clearTimeout(themeTimer);
            themeTimer = setTimeout(() => spreadSheetRef.current?.reRender(), 120);
        });
        themeObserver.observe(document.head, { childList: true, subtree: true });

        return () => {
            spreadSheetRef.current = null;
            setActiveSpreadsheet(null);
            setBottombarEl(null);
            themeObserver.disconnect();
            clearTimeout(themeTimer);
        };
    }, [handleAutoFitColumns, openFindPanel])

    return (
        <div className='excel-viewer'>
            <Spin spinning={loading} fullscreen={true} />
            {loadError && !loading && (
                <div className="excel-load-error">
                    <div className="excel-load-error-panel">
                        <svg className="excel-load-error-icon" width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden>
                            <circle cx="22" cy="22" r="20" stroke="currentColor" strokeWidth="1.8" />
                            <path d="M22 13v12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                            <circle cx="22" cy="31" r="1.8" fill="currentColor" />
                        </svg>
                        <h2 className="excel-load-error-title">Failed to open file</h2>
                        <span className="excel-load-error-message">{loadError}</span>
                    </div>
                </div>
            )}
            {findPanelOpen && !loading && !loadError && (
                <FindPanel
                    ref={findPanelHandleRef}
                    spreadSheet={activeSpreadsheet}
                    onClose={() => setFindPanelOpen(false)}
                />
            )}
            <div id='container'></div>
            {!loading && !loadError && (
                <button
                    type="button"
                    className="dark-mode-toggle"
                    title={adaptiveColorMode ? t('viewer.switchToLightMode') : t('viewer.switchToDarkMode')}
                    onClick={toggleColorMode}
                >
                    {adaptiveColorMode ? <SunOutlined /> : <MoonOutlined />}
                </button>
            )}
            {!loading && !loadError && bottombarEl && createPortal(
                <div className="excel-bottombar-sponsor">
                    <SponsorBar placement="right" />
                </div>,
                bottombarEl,
            )}
        </div>
    )
}

export default function Excel() {
    return (
        <App className="excel-app" message={{ top: 16 }}>
            <ExcelViewer />
        </App>
    );
}
