import type { SpreadsheetAutofilter } from './excel_meta';

const AUTO_FILTER_RE = /<autoFilter\b[^>]*ref="([^"]+)"[^>]*(?:\/>|>([\s\S]*?)<\/autoFilter>)/i;
const SORT_STATE_RE = /<sortState\b[\s\S]*?<\/sortState>/i;
const SORT_CONDITION_RE = /<sortCondition\b[^>]*ref="([A-Z]+)\d+(?::[A-Z]+\d+)?"[^>]*>/i;
const DESCENDING_RE = /\bdescending="(1|true)"/i;

function decodeXmlText(text: string): string {
    return text
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, '\'')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
}

function columnNameToIndex(name: string): number {
    let colIndex = 0;
    const upper = name.toUpperCase();
    for (let i = 0; i < upper.length; i += 1) {
        colIndex = 26 * colIndex + upper.charCodeAt(i) - 64;
    }
    return colIndex - 1;
}

export function readWorksheetSortStateXml(xml: string): SpreadsheetAutofilter | undefined {
    const autoFilterMatch = xml.match(AUTO_FILTER_RE);
    if (!autoFilterMatch) return undefined;
    const ref = decodeXmlText(autoFilterMatch[1]);
    const inner = autoFilterMatch[2] || '';
    const sortStateMatch = inner.match(SORT_STATE_RE);
    if (!sortStateMatch) return undefined;
    const sortXml = sortStateMatch[0];
    const sortConditionMatch = sortXml.match(SORT_CONDITION_RE);
    if (!sortConditionMatch) {
        return { ref, filters: [] };
    }
    return {
        ref,
        filters: [],
        sort: {
            ci: columnNameToIndex(sortConditionMatch[1]),
            order: DESCENDING_RE.test(sortXml) ? 'desc' : 'asc',
        },
    };
}
