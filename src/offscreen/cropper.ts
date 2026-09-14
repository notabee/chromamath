import { SnipCoordinates } from '../shared/types';
import { ExtensionMessage } from '../shared/messages';

/**
 * Offscreen Image Cropper service encapsulating canvas rendering and DPR scaling.
 */
export class ImageCropper {
  private canvas: HTMLCanvasElement | null = null;

  constructor(canvasId = 'crop-canvas') {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  }

  public crop(screenshotUrl: string, coords: SnipCoordinates): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        try {
          if (!this.canvas) {
            this.canvas = document.getElementById('crop-canvas') as HTMLCanvasElement;
          }

          if (!this.canvas) {
            reject(new Error('Canvas element not found in offscreen document'));
            return;
          }

          const dpr = coords.devicePixelRatio || 1;
          const cropX = Math.round(coords.x * dpr);
          const cropY = Math.round(coords.y * dpr);
          const cropW = Math.round(coords.width * dpr);
          const cropH = Math.round(coords.height * dpr);

          this.canvas.width = cropW;
          this.canvas.height = cropH;

          const ctx = this.canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to acquire canvas 2D context'));
            return;
          }

          ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
          const croppedDataUrl = this.canvas.toDataURL('image/png');
          resolve(croppedDataUrl);
        } catch (err: any) {
          reject(new Error(err?.message || 'Error executing canvas crop'));
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load screenshot image in offscreen document'));
      };

      img.src = screenshotUrl;
    });
  }
}

const cropper = new ImageCropper();

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (message.type === 'CROP_IMAGE') {
    cropper
      .crop(message.screenshotUrl, message.coords)
      .then((croppedDataUrl) => sendResponse({ success: true, croppedDataUrl }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep message channel open for async sendResponse
  }
  return false;
});
