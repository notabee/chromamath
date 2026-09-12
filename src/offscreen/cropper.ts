import { SnipCoordinates } from '../shared/types';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'CROP_IMAGE') {
    const { screenshotUrl, coords }: { screenshotUrl: string; coords: SnipCoordinates } = message;

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.getElementById('crop-canvas') as HTMLCanvasElement;
        const dpr = coords.devicePixelRatio || 1;
        
        // Calculate scaled crop dimensions
        const cropX = Math.round(coords.x * dpr);
        const cropY = Math.round(coords.y * dpr);
        const cropW = Math.round(coords.width * dpr);
        const cropH = Math.round(coords.height * dpr);

        canvas.width = cropW;
        canvas.height = cropH;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          sendResponse({ success: false, error: 'Failed to get canvas 2D context' });
          return;
        }

        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        const croppedDataUrl = canvas.toDataURL('image/png');
        sendResponse({ success: true, croppedDataUrl });
      } catch (err: any) {
        sendResponse({ success: false, error: err.message });
      }
    };

    img.onerror = () => {
      sendResponse({ success: false, error: 'Failed to load screenshot image in offscreen document' });
    };

    img.src = screenshotUrl;
    return true; // async sendResponse
  }
});
