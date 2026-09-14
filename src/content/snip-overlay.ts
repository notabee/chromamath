/**
 * ChromaMath Screen Snip Overlay
 * Object-oriented marquee selection controller for screen-capturing equations in papers and PDFs.
 */

import type { ExtensionMessage } from '../shared/messages';

export class SnipOverlayController {
  private overlayElement: HTMLDivElement | null = null;
  private selectionBox: HTMLDivElement | null = null;
  private isSelecting = false;
  private startX = 0;
  private startY = 0;

  // Bound event handlers for clean removal
  private boundMouseDown = (e: MouseEvent) => this.onMouseDown(e);
  private boundMouseMove = (e: MouseEvent) => this.onMouseMove(e);
  private boundMouseUp = (e: MouseEvent) => this.onMouseUp(e);
  private boundKeyDown = (e: KeyboardEvent) => this.onKeyDown(e);

  public mount(): void {
    if (this.overlayElement) return;

    const overlay = document.createElement('div');
    overlay.id = 'chromamath-snip-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(2px);
      z-index: 2147483647;
      cursor: crosshair;
      user-select: none;
    `;

    // Instruction banner
    const banner = document.createElement('div');
    banner.style.cssText = `
      position: fixed;
      top: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #0f172a;
      color: #f8fafc;
      border: 1px solid #334155;
      padding: 10px 20px;
      border-radius: 9999px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      gap: 8px;
      pointer-events: none;
    `;
    banner.innerHTML = `<span>✂️</span><span>Drag a box around the equation in your paper</span><span style="color: #94a3b8; font-size: 11px;">(Esc to cancel)</span>`;
    overlay.appendChild(banner);

    // Selection box
    const box = document.createElement('div');
    box.style.cssText = `
      position: fixed;
      border: 2px solid #8b5cf6;
      background: rgba(139, 92, 246, 0.15);
      box-shadow: 0 0 0 99999px rgba(15, 23, 42, 0.45);
      border-radius: 4px;
      pointer-events: none;
      display: none;
    `;
    overlay.appendChild(box);
    this.selectionBox = box;
    this.overlayElement = overlay;

    overlay.addEventListener('mousedown', this.boundMouseDown);
    window.addEventListener('mousemove', this.boundMouseMove);
    window.addEventListener('mouseup', this.boundMouseUp);
    window.addEventListener('keydown', this.boundKeyDown);

    document.body.appendChild(overlay);
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0 || !this.selectionBox) return;
    this.isSelecting = true;
    this.startX = e.clientX;
    this.startY = e.clientY;

    this.selectionBox.style.left = `${this.startX}px`;
    this.selectionBox.style.top = `${this.startY}px`;
    this.selectionBox.style.width = '0px';
    this.selectionBox.style.height = '0px';
    this.selectionBox.style.display = 'block';
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isSelecting || !this.selectionBox) return;
    const currentX = e.clientX;
    const currentY = e.clientY;

    const left = Math.min(this.startX, currentX);
    const top = Math.min(this.startY, currentY);
    const width = Math.abs(currentX - this.startX);
    const height = Math.abs(currentY - this.startY);

    this.selectionBox.style.left = `${left}px`;
    this.selectionBox.style.top = `${top}px`;
    this.selectionBox.style.width = `${width}px`;
    this.selectionBox.style.height = `${height}px`;
  }

  private onMouseUp(e: MouseEvent): void {
    if (!this.isSelecting) return;
    this.isSelecting = false;

    const currentX = e.clientX;
    const currentY = e.clientY;
    const left = Math.min(this.startX, currentX);
    const top = Math.min(this.startY, currentY);
    const width = Math.abs(currentX - this.startX);
    const height = Math.abs(currentY - this.startY);

    this.destroy();

    // Ensure selection is valid dimensions (ignore accidental tiny clicks)
    if (width > 20 && height > 15) {
      chrome.runtime.sendMessage({
        type: 'SNIP_COMPLETED',
        coords: {
          x: left,
          y: top,
          width,
          height,
          devicePixelRatio: window.devicePixelRatio || 1,
        },
      } as ExtensionMessage);
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.destroy();
    }
  }

  public destroy(): void {
    if (this.overlayElement) {
      this.overlayElement.removeEventListener('mousedown', this.boundMouseDown);
      window.removeEventListener('mousemove', this.boundMouseMove);
      window.removeEventListener('mouseup', this.boundMouseUp);
      window.removeEventListener('keydown', this.boundKeyDown);
      this.overlayElement.remove();
      this.overlayElement = null;
      this.selectionBox = null;
    }
  }
}

// Singleton listener
const snipController = new SnipOverlayController();
chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
  if (message.type === 'TRIGGER_SNIP_OVERLAY') {
    snipController.mount();
  }
});
