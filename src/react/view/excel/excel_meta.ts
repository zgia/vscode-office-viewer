const COL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function stringAt(index: number): string {
    let str = '';
    let cindex = index;
    while (cindex >= COL_LETTERS.length) {
        cindex = Math.floor(cindex / COL_LETTERS.length);
        cindex -= 1;
        str += COL_LETTERS[cindex % COL_LETTERS.length];
    }
    str += COL_LETTERS[index % COL_LETTERS.length];
    return str;
}

/** x-spreadsheet 默认行高（px），与 Excel.tsx 中 row.height 一致 */
export const DEFAULT_ROW_HEIGHT_PX = 30;

/** 视口最少列数（A–X，共 24 列） */
export const MIN_VIEW_COLS = 24;

/** 视口最少行数 */
export const MIN_VIEW_ROWS = 40;

/** Excel 行高（磅）→ 像素 */
export function excelRowHeightToPx(pt: number): number {
    return Math.round(pt * 96 / 72);
}

/** x-spreadsheet freeze 字符串，如 "B2" */
function freezeToExpr(rowIndex: number, colIndex: number): string {
    return `${stringAt(colIndex)}${rowIndex + 1}`;
}

/** 从 Excel views 的 xSplit/ySplit 转为 x-spreadsheet freeze 字符串 */
export function excelFreezeToExpr(xSplit = 0, ySplit = 0): string | undefined {
    if (xSplit <= 0 && ySplit <= 0) return undefined;
    return freezeToExpr(ySplit, xSplit);
}

export interface SpreadsheetAutofilter {
    ref: string;
    filters?: { ci: number; operator: string; value: unknown }[];
    sort?: { ci: number; order: string };
}

export function readAutofilterRef(autoFilter: unknown): SpreadsheetAutofilter | undefined {
    if (!autoFilter) return undefined;
    if (typeof autoFilter === 'string') {
        return { ref: autoFilter, filters: [] };
    }
    if (typeof autoFilter === 'object' && autoFilter !== null) {
        const af = autoFilter as { from?: string | { row: number; column: number }; to?: string | { row: number; column: number } };
        const fromAddr = addressToString(af.from);
        const toAddr = addressToString(af.to);
        if (fromAddr && toAddr) {
            return { ref: `${fromAddr}:${toAddr}`, filters: [] };
        }
    }
    return undefined;
}

function addressToString(addr?: string | { row: number; column: number }): string | undefined {
    if (!addr) return undefined;
    if (typeof addr === 'string') return addr;
    return `${stringAt(addr.column - 1)}${addr.row}`;
}
