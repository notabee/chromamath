/**
 * ChromaMath Background Service Worker
 * Central Manifest V3 background coordinator orchestrating caching,
 * AI deconstruction, context menus, offscreen image cropping, and sidepanel sync.
 */

import { ColorizedEquation, SnipCoordinates } from '../shared/types';
import { ExtensionMessage } from '../shared/messages';
import { STORAGE_KEYS } from '../shared/constants';
import { DocumentLruCache, extractDocId } from '../shared/cache';
import { geminiDeconstructor, findInLibrary, GeminiDeconstructor } from './gemini';
import { offscreenManager, OffscreenDocumentManager } from './offscreen-manager';
import { ContextMenuManager } from './context-menu';

export class BackgroundCoordinator {
  private cache: DocumentLruCache;
  private deconstructor: GeminiDeconstructor;
  private offscreen: OffscreenDocumentManager;
  private contextMenu: ContextMenuManager;

  private activeDocId: string = 'global';
  private activeEquation: ColorizedEquation | null = null;

  constructor(
    cache = new DocumentLruCache(30, 100),
    deconstructor = geminiDeconstructor,
    offscreen = offscreenManager
  ) {
    this.cache = cache;
    this.deconstructor = deconstructor;
    this.offscreen = offscreen;
    this.contextMenu = new ContextMenuManager({
      onExplainSelection: (text, tab) => this.handleSelectionExplain(text, tab),
      onSnipPaper: (tab) => this.handleTriggerSnip(tab),
    });
  }

  /**
   * Initializes all Manifest V3 listeners and hydrates cache.
   */
  public initialize(): void {
    this.cache.hydrate().catch((err) => console.warn('Cache hydration error:', err));

    chrome.runtime.onInstalled.addListener(() => {
      chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true })?.catch?.(() => {});
      this.contextMenu.registerMenus();
    });

    chrome.contextMenus?.onClicked?.addListener((info, tab) => {
      this.contextMenu.handleClick(info, tab).catch((err) => console.warn('Context menu error:', err));
    });

    chrome.tabs?.onActivated?.addListener((activeInfo) => {
      this.handleTabActivated(activeInfo.tabId).catch(() => {});
    });

    chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
      return this.routeMessage(message, sender, sendResponse);
    });
  }

  private async handleTabActivated(tabId: number): Promise<void> {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab?.url) {
        const docId = extractDocId(tab.url);
        if (docId !== this.activeDocId) {
          this.activeDocId = docId;
          const recent = this.cache.getRecentEquation(docId);
          if (recent) {
            this.activeEquation = recent;
            this.broadcastEquation(recent, docId);
          }
          this.broadcastHistory(docId);
        }
      }
    } catch {
      // Ignored
    }
  }

  private async handleSelectionExplain(text: string, tab?: chrome.tabs.Tab): Promise<void> {
    if (tab?.id) {
      const docId = tab.url ? extractDocId(tab.url) : this.activeDocId;
      try {
        await chrome.sidePanel.open({ tabId: tab.id });
      } catch {
        // Handled silently
      }
      await this.processLatex(text, docId);
    }
  }

  private handleTriggerSnip(tab?: chrome.tabs.Tab): void {
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_SNIP_OVERLAY' } as ExtensionMessage).catch(() => {});
    }
  }

  /**
   * Handles LaTeX processing: checks library first, then Document LRU cache, then Gemini AI.
   */
  public async processLatex(
    latex: string,
    docId = 'global'
  ): Promise<{ equation: ColorizedEquation; fromCache: boolean }> {
    // 1. Instant zero-latency match from curated library
    const libraryMatch = findInLibrary(latex);
    if (libraryMatch) {
      this.activeEquation = libraryMatch;
      this.activeDocId = docId;
      this.cache.set(docId, latex, libraryMatch);
      this.broadcastEquation(this.activeEquation, docId);
      this.broadcastHistory(docId);
      return { equation: libraryMatch, fromCache: true };
    }

    // 2. Document-scoped LRU cache match (0ms instant retrieval)
    const cachedMatch = this.cache.get(docId, latex);
    if (cachedMatch) {
      this.activeEquation = cachedMatch;
      this.activeDocId = docId;
      this.broadcastEquation(this.activeEquation, docId);
      this.broadcastHistory(docId);
      return { equation: cachedMatch, fromCache: true };
    }

    // 3. Fresh Gemini 2.0 Flash deconstruction
    const settings = await chrome.storage.sync.get([STORAGE_KEYS.API_KEY]);
    const apiKey = settings[STORAGE_KEYS.API_KEY] || '';

    const result = await this.deconstructor.deconstruct({ latex }, apiKey);
    this.activeEquation = result;
    this.activeDocId = docId;
    this.cache.set(docId, latex, result);
    this.broadcastEquation(this.activeEquation, docId);
    this.broadcastHistory(docId);
    return { equation: result, fromCache: false };
  }

  /**
   * Handles image crop processing.
   */
  public async processImageCrop(croppedDataUrl: string, docId = 'global'): Promise<ColorizedEquation> {
    const settings = await chrome.storage.sync.get([STORAGE_KEYS.API_KEY]);
    const apiKey = settings[STORAGE_KEYS.API_KEY] || '';

    const result = await this.deconstructor.deconstruct({ imageBase64: croppedDataUrl }, apiKey);
    this.activeEquation = result;
    this.activeDocId = docId;
    this.cache.set(docId, result.normalizedLatex, result);
    this.broadcastEquation(this.activeEquation, docId);
    this.broadcastHistory(docId);
    return result;
  }

  private broadcastEquation(eq: ColorizedEquation | null, docId?: string): void {
    chrome.runtime.sendMessage({
      type: 'EQUATION_UPDATED',
      equation: eq,
      docId: docId || this.activeDocId,
    } as ExtensionMessage).catch(() => {});
  }

  private broadcastHistory(docId: string): void {
    chrome.runtime.sendMessage({
      type: 'DOCUMENT_HISTORY_UPDATED',
      docId,
      equations: this.cache.getHistory(docId),
    } as ExtensionMessage).catch(() => {});
  }

  /**
   * Routes incoming messages to respective handlers.
   */
  private routeMessage(
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): boolean {
    switch (message.type) {
      case 'EXPLAIN_LATEX': {
        const docId = message.docId || (sender.tab?.url ? extractDocId(sender.tab.url) : this.activeDocId);
        this.activeDocId = docId;

        chrome.runtime.sendMessage({
          type: 'DECONSTRUCTION_STARTED',
          latex: message.latex,
        } as ExtensionMessage).catch(() => {});

        this.processLatex(message.latex, docId)
          .then(async ({ equation, fromCache }) => {
            if (sender.tab?.id) {
              try {
                await chrome.sidePanel.open({ tabId: sender.tab.id });
              } catch (err: any) {
                console.log('Side panel auto-open notice:', err?.message);
              }
            }
            sendResponse({ success: true, equation, fromCache });
          })
          .catch((err) => {
            chrome.runtime.sendMessage({
              type: 'DECONSTRUCTION_ERROR',
              error: err?.message || 'Processing failed',
            } as ExtensionMessage).catch(() => {});
            sendResponse({ success: false, error: err?.message || 'Processing failed' });
          });
        return true; // Keep message channel open for async response
      }

      case 'OPEN_SIDEPANEL': {
        if (sender.tab?.id) {
          chrome.sidePanel?.open?.({ tabId: sender.tab.id })?.catch?.(() => {});
        }
        sendResponse({ success: true });
        return false;
      }

      case 'GET_CURRENT_EQUATION': {
        sendResponse({ equation: this.activeEquation, docId: this.activeDocId });
        return false;
      }

      case 'SET_CURRENT_EQUATION': {
        const docId = message.docId || this.activeDocId;
        this.activeEquation = message.equation;
        this.activeDocId = docId;
        this.cache.set(docId, message.equation.normalizedLatex, message.equation);
        this.broadcastEquation(this.activeEquation, docId);
        this.broadcastHistory(docId);
        sendResponse({ success: true });
        return false;
      }

      case 'GET_DOCUMENT_HISTORY': {
        const docId = message.docId || this.activeDocId;
        sendResponse({ docId, equations: this.cache.getHistory(docId) });
        return false;
      }

      case 'SELECT_CACHED_EQUATION': {
        const docId = message.docId || this.activeDocId;
        const history = this.cache.getHistory(docId);
        const found = history.find((eq) => eq.id === message.equationId);
        if (found) {
          this.activeEquation = found;
          this.activeDocId = docId;
          this.broadcastEquation(this.activeEquation, docId);
          this.broadcastHistory(docId);
          sendResponse({ success: true, equation: found });
        } else {
          sendResponse({ success: false, error: 'Equation not found in cache' });
        }
        return false;
      }

      case 'CLEAR_DOCUMENT_CACHE': {
        const docId = message.docId || this.activeDocId;
        this.cache.clearDoc(docId);
        if (this.activeDocId === docId) {
          this.activeEquation = null;
          this.broadcastEquation(null, docId);
        }
        this.broadcastHistory(docId);
        sendResponse({ success: true });
        return false;
      }

      case 'START_SNIP': {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'TRIGGER_SNIP_OVERLAY' } as ExtensionMessage).catch(() => {});
          }
        });
        return false;
      }

      case 'SNIP_COMPLETED': {
        const docId = sender.tab?.url ? extractDocId(sender.tab.url) : this.activeDocId;
        this.activeDocId = docId;
        const coords: SnipCoordinates = message.coords;

        (async () => {
          try {
            const screenshotUrl = await chrome.tabs.captureVisibleTab({ format: 'png' });
            const croppedDataUrl = await this.offscreen.cropScreenshot(screenshotUrl, coords);

            if (sender.tab?.id) {
              await chrome.sidePanel.open({ tabId: sender.tab.id }).catch(() => {});
            }
            const eq = await this.processImageCrop(croppedDataUrl, docId);
            sendResponse({ success: true, equation: eq });
          } catch (err: any) {
            sendResponse({ success: false, error: err?.message || 'Crop processing failed' });
          }
        })();
        return true;
      }

      default:
        return false;
    }
  }
}

// Instantiate and initialize coordinator
export const coordinator = new BackgroundCoordinator();
coordinator.initialize();
