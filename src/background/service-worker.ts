import { findInLibrary, deconstructWithGemini } from './gemini';
import { ColorizedEquation, SnipCoordinates } from '../shared/types';
import { ExtensionMessage } from '../shared/messages';
import { STORAGE_KEYS } from '../shared/constants';

// Configure Side Panel behavior and context menus
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true })?.catch?.(() => {});

  chrome.contextMenus.create({
    id: 'chromamath-explain-selection',
    title: 'Explain with ChromaMath',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'chromamath-snip-paper',
    title: '✂️ Snip Equation from Paper',
    contexts: ['page', 'frame']
  });
});

// Cache for active equation
let activeEquation: ColorizedEquation | null = null;

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'chromamath-explain-selection' && info.selectionText) {
    if (tab?.id) {
      try {
        await chrome.sidePanel.open({ tabId: tab.id });
      } catch {
        // Handled silently
      }
      await processLatex(info.selectionText);
    }
  } else if (info.menuItemId === 'chromamath-snip-paper' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_SNIP_OVERLAY' }).catch(() => {});
  }
});

/**
 * Ensures the offscreen document is ready for image cropping.
 */
async function ensureOffscreenDocument(): Promise<void> {
  const existingContexts = await (chrome.runtime as any).getContexts?.({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
  });
  if (existingContexts && existingContexts.length > 0) return;

  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['USER_MEDIA' as any],
    justification: 'Crop captured tab screenshot for equation OCR',
  });
}

/**
 * Handles LaTeX processing: checks library first, then caches/calls AI.
 */
async function processLatex(latex: string): Promise<ColorizedEquation> {
  const libraryMatch = findInLibrary(latex);
  if (libraryMatch) {
    activeEquation = libraryMatch;
    broadcastEquation(activeEquation);
    return libraryMatch;
  }

  const settings = await chrome.storage.sync.get([STORAGE_KEYS.API_KEY]);
  const apiKey = settings[STORAGE_KEYS.API_KEY] || '';

  const result = await deconstructWithGemini({ latex }, apiKey);
  activeEquation = result;
  broadcastEquation(activeEquation);
  return result;
}

/**
 * Handles image crop processing.
 */
async function processImageCrop(croppedDataUrl: string): Promise<ColorizedEquation> {
  const settings = await chrome.storage.sync.get([STORAGE_KEYS.API_KEY]);
  const apiKey = settings[STORAGE_KEYS.API_KEY] || '';

  const result = await deconstructWithGemini({ imageBase64: croppedDataUrl }, apiKey);
  activeEquation = result;
  broadcastEquation(activeEquation);
  return result;
}

function broadcastEquation(eq: ColorizedEquation): void {
  chrome.runtime.sendMessage({
    type: 'EQUATION_UPDATED',
    equation: eq
  } as ExtensionMessage).catch(() => {
    // Side panel might not be open yet; it will query on mount.
  });
}

// Runtime message dispatcher
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  if (message.type === 'EXPLAIN_LATEX') {
    if (sender.tab?.id) {
      chrome.sidePanel?.open?.({ tabId: sender.tab.id })?.catch?.(() => {});
    }
    processLatex(message.latex)
      .then(res => sendResponse({ success: true, equation: res }))
      .catch(err => sendResponse({ success: false, error: err?.message || 'Processing failed' }));
    return true; // Keep channel open for async response
  }

  if (message.type === 'GET_CURRENT_EQUATION') {
    sendResponse({ equation: activeEquation });
    return false;
  }

  if (message.type === 'SET_CURRENT_EQUATION') {
    activeEquation = message.equation;
    broadcastEquation(activeEquation);
    sendResponse({ success: true });
    return false;
  }

  if (message.type === 'START_SNIP') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'TRIGGER_SNIP_OVERLAY' } as ExtensionMessage).catch(() => {});
      }
    });
    return false;
  }

  if (message.type === 'SNIP_COMPLETED') {
    const coords: SnipCoordinates = message.coords;
    (async () => {
      try {
        await ensureOffscreenDocument();
        const screenshotUrl = await chrome.tabs.captureVisibleTab({ format: 'png' });

        chrome.runtime.sendMessage(
          {
            type: 'CROP_IMAGE',
            screenshotUrl,
            coords
          } as ExtensionMessage,
          async (cropResponse) => {
            if (cropResponse?.success && cropResponse?.croppedDataUrl) {
              try {
                if (sender.tab?.id) {
                  await chrome.sidePanel.open({ tabId: sender.tab.id }).catch(() => {});
                }
                const eq = await processImageCrop(cropResponse.croppedDataUrl);
                sendResponse({ success: true, equation: eq });
              } catch (err: any) {
                sendResponse({ success: false, error: err?.message || 'Deconstruction failed' });
              }
            } else {
              sendResponse({ success: false, error: cropResponse?.error || 'Cropping failed' });
            }
          }
        );
      } catch (err: any) {
        sendResponse({ success: false, error: err?.message || 'Capture failed' });
      }
    })();
    return true;
  }

  return false;
});
