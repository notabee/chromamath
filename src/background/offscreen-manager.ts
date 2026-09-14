import { SnipCoordinates } from '../shared/types';
import { ExtensionMessage, CropImageResponse } from '../shared/messages';

/**
 * Manages the lifecycle of Chrome's Offscreen Document in Manifest V3.
 * Used for canvas-based image cropping without polluting service worker context.
 */
export class OffscreenDocumentManager {
  private offscreenUrl = 'offscreen.html';

  /**
   * Checks if an offscreen document currently exists and creates one if necessary.
   */
  public async ensureDocument(): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.offscreen) return;

    const existingContexts = await (chrome.runtime as any).getContexts?.({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
    });

    if (existingContexts && existingContexts.length > 0) {
      return;
    }

    await chrome.offscreen.createDocument({
      url: this.offscreenUrl,
      reasons: ['USER_MEDIA' as any],
      justification: 'Crop captured tab screenshot for equation OCR',
    });
  }

  /**
   * Coordinates with the offscreen document to crop a captured screenshot to the target bounds.
   */
  public async cropScreenshot(
    screenshotUrl: string,
    coords: SnipCoordinates
  ): Promise<string> {
    await this.ensureDocument();

    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: 'CROP_IMAGE',
          screenshotUrl,
          coords,
        } as ExtensionMessage,
        (response: CropImageResponse) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (response?.success && response?.croppedDataUrl) {
            resolve(response.croppedDataUrl);
          } else {
            reject(new Error(response?.error || 'Cropping failed in offscreen document'));
          }
        }
      );
    });
  }
}

export const offscreenManager = new OffscreenDocumentManager();
