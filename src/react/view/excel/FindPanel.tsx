import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type Spreadsheet from './x-spreadsheet/index';
import type { FindMatch, FindOptions } from './x-spreadsheet/index';
import { t } from './excel_i18n';

export interface FindPanelProps {
    spreadSheet: Spreadsheet | null;
    onClose: () => void;
}

export interface FindPanelHandle {
    focusFindInput: (select?: boolean) => void;
}

function OptionChip({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <button
            type="button"
            className={`frp-chip${checked ? ' frp-chip-active' : ''}`}
            onMouseDown={e => e.preventDefault()}
            onClick={() => onChange(!checked)}
            title={label}
        >
            {label}
        </button>
    );
}

const FindPanel = forwardRef<FindPanelHandle, FindPanelProps>(function FindPanel({
    spreadSheet,
    onClose,
}, ref) {
    const [findText, setFindText] = useState('');
    const [matchCase, setMatchCase] = useState(false);
    const [wholeCell, setWholeCell] = useState(false);
    const [allSheets, setAllSheets] = useState(false);
    const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
    const lastMatchRef = useRef<FindMatch | null>(null);
    const findInputRef = useRef<HTMLInputElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const focusFindInput = useCallback((select = false) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const input = findInputRef.current;
                if (!input) return;
                input.focus();
                if (select) {
                    input.select();
                }
            });
        });
    }, []);

    useImperativeHandle(ref, () => ({ focusFindInput }), [focusFindInput]);

    useEffect(() => {
        focusFindInput(true);
    }, [focusFindInput]);

    const buildOptions = useCallback((): FindOptions => ({
        matchCase,
        wholeCell,
        allSheets,
    }), [matchCase, wholeCell, allSheets]);

    const gotoMatch = useCallback((match: FindMatch | null) => {
        if (!spreadSheet || !match) {
            setStatus({ text: t('find.notFound'), error: true });
            focusFindInput();
            return;
        }
        spreadSheet.gotoMatch(match);
        lastMatchRef.current = match;
        const col = String.fromCharCode(65 + (match.ci % 26));
        setStatus({
            text: t('find.matchLocation', match.sheetIndex + 1, col, match.ri + 1),
        });
        focusFindInput();
    }, [spreadSheet, focusFindInput]);

    const handleFindNext = useCallback((backward = false) => {
        if (!spreadSheet || !findText) return;
        const options = buildOptions();
        const from = lastMatchRef.current ?? spreadSheet.getSelection();
        const current: FindMatch = { sheetIndex: from.sheetIndex, ri: from.ri, ci: from.ci };
        const match = spreadSheet.findNext(findText, current, options, backward)
            ?? spreadSheet.findFirst(findText, options);
        gotoMatch(match);
    }, [spreadSheet, findText, buildOptions, gotoMatch]);

    return (
        <div className="frp-panel" ref={panelRef}>
            {/* Header */}
            <div className="frp-header">
                <span className="frp-title">
                    {t('find.title')}
                </span>
                <button type="button" className="frp-close" onClick={onClose} aria-label={t('find.close')}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                        <path d="M1 1 L9 9 M9 1 L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                </button>
            </div>

            {/* Find row */}
            <div className="frp-row">
                <div className="frp-input-wrap">
                    <svg className="frp-search-icon" width="13" height="13" viewBox="0 0 16 16" fill="none">
                        <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M10 10 L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <input
                        ref={findInputRef}
                        className="frp-input"
                        placeholder={t('find.placeholder')}
                        value={findText}
                        onChange={e => { setFindText(e.target.value); setStatus(null); lastMatchRef.current = null; }}
                        onKeyDown={e => {
                            e.nativeEvent.stopPropagation();
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleFindNext(e.shiftKey);
                            }
                            if (e.key === 'Escape') onClose();
                        }}
                    />
                </div>
                <div className="frp-nav-btns">
                    <button
                        type="button"
                        className="frp-nav-btn"
                        title={t('find.previous')}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => handleFindNext(true)}
                    >
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                            <path d="M2 8 L6 4 L10 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                    <button
                        type="button"
                        className="frp-nav-btn"
                        title={t('find.next')}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => handleFindNext(false)}
                    >
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                            <path d="M2 4 L6 8 L10 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                </div>
            </div>

            {/* Options */}
            <div className="frp-options">
                <OptionChip checked={matchCase} onChange={setMatchCase} label="Aa" />
                <OptionChip checked={wholeCell} onChange={setWholeCell} label={t('find.wholeCell')} />
                <OptionChip checked={allSheets} onChange={setAllSheets} label={t('find.allSheets')} />
                {status && (
                    <span className={`frp-status${status.error ? ' frp-status-error' : ''}`}>
                        {status.text}
                    </span>
                )}
            </div>
        </div>
    );
});

export default FindPanel;
