import { findInLibrary, deconstructWithGemini } from './gemini';
import { ColorizedEquation, SnipCoordinates } from '../shared/types';

// Configure Side Panel to open when clicking the extension icon
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  // Create context menu items
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
      await chrome.sidePanel.open({ tabId: tab.id });
      await processLatex(info.selectionText);
    }
  } else if (info.menuItemId === 'chromamath-snip-paper' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_SNIP_OVERLAY' });
  }
});

/**
 * Ensures the offscreen document is ready for image cropping.
 */
async function ensureOffscreenDocument() {
  const existingContexts = await (chrome.runtime as any).getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
  });
  if (existingContexts.length > 0) return;

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
  // Check library first
  const libraryMatch = findInLibrary(latex);
  if (libraryMatch) {
    activeEquation = libraryMatch;
    broadcastEquation(activeEquation);
    return libraryMatch;
  }

  // Retrieve user settings
  const settings = await chrome.storage.sync.get(['apiKey']);
  const apiKey = settings.apiKey || '';

  const result = await deconstructWithGemini({ latex }, apiKey);
  activeEquation = result;
  broadcastEquation(activeEquation);
  return result;
}

/**
 * Handles image crop processing.
 */
async function processImageCrop(croppedDataUrl: string): Promise<ColorizedEquation> {
  const settings = await chrome.storage.sync.get(['apiKey']);
  const apiKey = settings.apiKey || '';

  const result = await deconstructWithGemini({ imageBase64: croppedDataUrl }, apiKey);
  activeEquation = result;
  broadcastEquation(activeEquation);
  return result;
}

function broadcastEquation(eq: ColorizedEquation) {
  chrome.runtime.sendMessage({
    type: 'EQUATION_UPDATED',
    equation: eq
  }).catch(() => {
    // Side panel might not be open yet; that's fine, it will query on mount.
  });
}

// Runtime message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXPLAIN_LATEX') {
    if (sender.tab?.id) {
      chrome.sidePanel.open({ tabId: sender.tab.id }).catch((err) => {
        console.log('Side panel open request:', err?.message);
      });
    }
    processLatex(message.latex)
      .then(res => sendResponse({ success: true, equation: res }))
      .catch(err => sendResponse({ success: false, error: err.message }));
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
        chrome.tabs.sendMessage(tabs[0].id, { type: 'TRIGGER_SNIP_OVERLAY' });
      }
    });
    return false;
  }

  if (message.type === 'SNIP_COMPLETED') {
    const coords: SnipCoordinates = message.coords;
    (async () => {
      try {
        await ensureOffscreenDocument();
        // Capture tab screenshot
        const screenshotUrl = await chrome.tabs.captureVisibleTab({ format: 'png' });

        // Send to offscreen document to crop
        chrome.runtime.sendMessage(
          {
            type: 'CROP_IMAGE',
            screenshotUrl,
            coords
          },
          async (cropResponse) => {
            if (cropResponse?.success && cropResponse?.croppedDataUrl) {
              try {
                // Open side panel if closed
                if (sender.tab?.id) {
                  await chrome.sidePanel.open({ tabId: sender.tab.id });
                }
                const eq = await processImageCrop(cropResponse.croppedDataUrl);
                sendResponse({ success: true, equation: eq });
              } catch (err: any) {
                sendResponse({ success: false, error: err.message });
              }
            } else {
              sendResponse({ success: false, error: cropResponse?.error || 'Cropping failed' });
            }
          }
        );
      } catch (err: any) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
});
