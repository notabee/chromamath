/**
 * ChromaMath Screen Snip Overlay
 * Allows dragging a rectangular marquee over any equation in PDFs, papers, or web pages.
 */

let overlayElement: HTMLDivElement | null = null;
let selectionBox: HTMLDivElement | null = null;
let startX = 0;
let startY = 0;
let isSelecting = false;

function createSnipOverlay() {
  if (overlayElement) return;

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
  selectionBox = box;

  function onMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;
    isSelecting = true;
    startX = e.clientX;
    startY = e.clientY;
    box.style.left = `${startX}px`;
    box.style.top = `${startY}px`;
    box.style.width = '0px';
    box.style.height = '0px';
    box.style.display = 'block';
  }

  function onMouseMove(e: MouseEvent) {
    if (!isSelecting) return;
    const currentX = e.clientX;
    const currentY = e.clientY;

    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    box.style.left = `${left}px`;
    box.style.top = `${top}px`;
    box.style.width = `${width}px`;
    box.style.height = `${height}px`;
  }

  function onMouseUp(e: MouseEvent) {
    if (!isSelecting) return;
    isSelecting = false;

    const currentX = e.clientX;
    const currentY = e.clientY;
    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    // Clean up overlay immediately before capturing
    cleanup();

    // Ensure selection is reasonably sized (not an accidental single click)
    if (width > 20 && height > 15) {
      chrome.runtime.sendMessage({
        type: 'SNIP_COMPLETED',
        coords: {
          x: left,
          y: top,
          width,
          height,
          devicePixelRatio: window.devicePixelRatio || 1
        }
      });
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      cleanup();
    }
  }

  function cleanup() {
    overlay.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('keydown', onKeyDown);
    overlay.remove();
    overlayElement = null;
    selectionBox = null;
  }

  overlay.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('keydown', onKeyDown);

  document.body.appendChild(overlay);
  overlayElement = overlay;
}

// Listen for trigger from background or shortcut
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'TRIGGER_SNIP_OVERLAY') {
    createSnipOverlay();
  }
});
