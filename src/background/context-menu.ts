export interface ContextMenuCallbacks {
  onExplainSelection: (text: string, tab?: chrome.tabs.Tab) => Promise<void>;
  onSnipPaper: (tab?: chrome.tabs.Tab) => void;
}

/**
 * Manages context menu registrations and user interactions for ChromaMath.
 */
export class ContextMenuManager {
  private static readonly EXPLAIN_SELECTION_ID = 'chromamath-explain-selection';
  private static readonly SNIP_PAPER_ID = 'chromamath-snip-paper';

  private callbacks: ContextMenuCallbacks;

  constructor(callbacks: ContextMenuCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Registers context menus with Chrome on extension install/update.
   */
  public registerMenus(): void {
    if (typeof chrome === 'undefined' || !chrome.contextMenus) return;

    chrome.contextMenus.create({
      id: ContextMenuManager.EXPLAIN_SELECTION_ID,
      title: 'Explain with ChromaMath',
      contexts: ['selection'],
    });

    chrome.contextMenus.create({
      id: ContextMenuManager.SNIP_PAPER_ID,
      title: '✂️ Snip Equation from Paper',
      contexts: ['page', 'frame'],
    });
  }

  /**
   * Routes context menu clicks to appropriate handlers.
   */
  public async handleClick(info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab): Promise<void> {
    if (info.menuItemId === ContextMenuManager.EXPLAIN_SELECTION_ID && info.selectionText) {
      await this.callbacks.onExplainSelection(info.selectionText, tab);
    } else if (info.menuItemId === ContextMenuManager.SNIP_PAPER_ID && tab?.id) {
      this.callbacks.onSnipPaper(tab);
    }
  }
}
