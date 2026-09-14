/**
 * Document-scoped LRU Cache for Deconstructed Equations.
 * Provides O(1) in-memory lookups, bounded memory ceilings,
 * per-document history tracking, and async persistence to chrome.storage.local.
 */

import { ColorizedEquation } from './types';
import { normalizeLatexString } from './latex';
import { STORAGE_KEYS } from './constants';

export interface SerializedCache {
  version: number;
  entries: Array<{ key: string; docId: string; equation: ColorizedEquation }>;
  docHistory: Record<string, string[]>;
}

/**
 * Extracts a normalized, canonical document ID from a URL or tab context.
 * Identifies arXiv papers (HTML, PDF, abs), ar5iv, Wikipedia, and generic pages.
 */
export function extractDocId(url?: string): string {
  if (!url || typeof url !== 'string') return 'global';
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname;

    // arXiv HTML, PDF, or Abstract: /html/2312.00752v1, /pdf/2312.00752.pdf, /abs/2312.00752
    if (host.includes('arxiv.org')) {
      const match = path.match(/\/(?:html|abs|pdf)\/([0-9]{4}\.[0-9]{4,5}(?:v[0-9]+)?)/i);
      if (match && match[1]) {
        const baseId = match[1].replace(/v\d+$/i, '');
        return `arxiv:${baseId}`;
      }
    }

    // ar5iv HTML
    if (host.includes('ar5iv')) {
      const match = path.match(/\/html\/([0-9]{4}\.[0-9]{4,5}(?:v[0-9]+)?)/i);
      if (match && match[1]) {
        const baseId = match[1].replace(/v\d+$/i, '');
        return `arxiv:${baseId}`;
      }
    }

    // Wikipedia article
    if (host.includes('wikipedia.org')) {
      return `wiki:${path.replace(/^\/wiki\//, '')}`;
    }

    // Generic URLs (domain + pathname without trailing slash)
    return `${host}${path.replace(/\/$/, '')}`;
  } catch {
    return 'global';
  }
}

export class DocumentLruCache {
  private maxPerDocument: number;
  private maxTotal: number;

  // In-memory LRU map: Map maintains insertion order (delete + re-set moves key to end/MRU)
  private cacheMap: Map<string, { docId: string; equation: ColorizedEquation }> = new Map();

  // Document history: docId -> ordered list of cache keys (MRU first)
  private docHistory: Map<string, string[]> = new Map();

  private saveTimer: any = null;

  constructor(maxPerDocument = 30, maxTotal = 100) {
    this.maxPerDocument = maxPerDocument;
    this.maxTotal = maxTotal;
  }

  private makeKey(docId: string, latex: string): string {
    const norm = normalizeLatexString(latex);
    return `${docId}::${norm}`;
  }

  /**
   * Retrieves a cached equation for the document if present.
   * If found, refreshes its LRU position and updates document MRU order.
   */
  public get(docId: string, rawLatex: string): ColorizedEquation | null {
    if (!rawLatex) return null;
    const key = this.makeKey(docId, rawLatex);

    let entry = this.cacheMap.get(key);

    // Fallback: If not found under specific docId, check if cached under 'global'
    if (!entry && docId !== 'global') {
      const globalKey = this.makeKey('global', rawLatex);
      entry = this.cacheMap.get(globalKey);
      if (entry) {
        // Associate with this document now
        this.set(docId, rawLatex, entry.equation);
        return entry.equation;
      }
    }

    if (!entry) return null;

    // Refresh LRU order (delete and re-insert puts it at the end of Map iteration)
    this.cacheMap.delete(key);
    this.cacheMap.set(key, entry);

    // Move to front of document history
    this.touchDocHistory(docId, key);
    this.scheduleSave();

    return entry.equation;
  }

  /**
   * Stores an equation in the cache, enforcing per-document and global capacity bounds.
   */
  public set(docId: string, rawLatex: string, equation: ColorizedEquation): void {
    if (!rawLatex || !equation) return;
    const key = this.makeKey(docId, rawLatex);

    // Delete existing key if present to update position
    if (this.cacheMap.has(key)) {
      this.cacheMap.delete(key);
    }

    this.cacheMap.set(key, { docId, equation });
    this.touchDocHistory(docId, key);

    // Enforce per-document capacity
    const docKeys = this.docHistory.get(docId) || [];
    while (docKeys.length > this.maxPerDocument) {
      const evictedKey = docKeys.pop();
      if (evictedKey) {
        this.cacheMap.delete(evictedKey);
      }
    }

    // Enforce total global capacity (oldest key in cacheMap is first in keys())
    while (this.cacheMap.size > this.maxTotal) {
      const oldestKey = this.cacheMap.keys().next().value;
      if (oldestKey) {
        const item = this.cacheMap.get(oldestKey);
        if (item) {
          const keys = this.docHistory.get(item.docId);
          if (keys) {
            this.docHistory.set(item.docId, keys.filter(k => k !== oldestKey));
          }
        }
        this.cacheMap.delete(oldestKey);
      } else {
        break;
      }
    }

    this.scheduleSave();
  }

  /**
   * Returns all cached equations for a given document, ordered from most to least recent.
   */
  public getHistory(docId: string): ColorizedEquation[] {
    const keys = this.docHistory.get(docId) || [];
    const equations: ColorizedEquation[] = [];

    for (const key of keys) {
      const entry = this.cacheMap.get(key);
      if (entry?.equation) {
        equations.push(entry.equation);
      }
    }

    return equations;
  }

  /**
   * Retrieves the most recently analyzed equation for the document.
   */
  public getRecentEquation(docId: string): ColorizedEquation | null {
    const history = this.getHistory(docId);
    return history.length > 0 ? history[0] : null;
  }

  /**
   * Clears all cached equations for a specific document.
   */
  public clearDoc(docId: string): void {
    const keys = this.docHistory.get(docId) || [];
    for (const key of keys) {
      this.cacheMap.delete(key);
    }
    this.docHistory.delete(docId);
    this.scheduleSave();
  }

  /**
   * Clears the entire cache.
   */
  public clearAll(): void {
    this.cacheMap.clear();
    this.docHistory.clear();
    this.scheduleSave();
  }

  private touchDocHistory(docId: string, key: string): void {
    let list = this.docHistory.get(docId);
    if (!list) {
      list = [];
      this.docHistory.set(docId, list);
    }
    // Remove if already in list, then prepend to index 0 (MRU)
    const filtered = list.filter(k => k !== key);
    filtered.unshift(key);
    this.docHistory.set(docId, filtered);
  }

  /**
   * Hydrates the in-memory cache from chrome.storage.local.
   */
  public async hydrate(): Promise<void> {
    try {
      if (typeof chrome === 'undefined' || !chrome?.storage?.local) return;
      const data = await chrome.storage.local.get([STORAGE_KEYS.EQUATION_CACHE]);
      const stored = data[STORAGE_KEYS.EQUATION_CACHE] as SerializedCache | undefined;

      if (stored && Array.isArray(stored.entries)) {
        this.cacheMap.clear();
        this.docHistory.clear();

        for (const entry of stored.entries) {
          if (entry?.key && entry?.equation) {
            this.cacheMap.set(entry.key, { docId: entry.docId, equation: entry.equation });
          }
        }

        if (stored.docHistory) {
          for (const [docId, keys] of Object.entries(stored.docHistory)) {
            if (Array.isArray(keys)) {
              this.docHistory.set(docId, keys.filter(k => this.cacheMap.has(k)));
            }
          }
        }
      }
    } catch (err) {
      console.warn('DocumentLruCache hydration failed:', err);
    }
  }

  /**
   * Persists cache to chrome.storage.local with debouncing.
   */
  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveToStorage().catch(() => {});
    }, 500);
  }

  public async saveToStorage(): Promise<void> {
    try {
      if (typeof chrome === 'undefined' || !chrome?.storage?.local) return;

      const entries: Array<{ key: string; docId: string; equation: ColorizedEquation }> = [];
      for (const [key, val] of this.cacheMap.entries()) {
        entries.push({ key, docId: val.docId, equation: val.equation });
      }

      const docHistoryRecord: Record<string, string[]> = {};
      for (const [docId, keys] of this.docHistory.entries()) {
        docHistoryRecord[docId] = keys;
      }

      const serialized: SerializedCache = {
        version: 1,
        entries,
        docHistory: docHistoryRecord,
      };

      await chrome.storage.local.set({ [STORAGE_KEYS.EQUATION_CACHE]: serialized });
    } catch (err) {
      console.warn('DocumentLruCache save failed:', err);
    }
  }
}
