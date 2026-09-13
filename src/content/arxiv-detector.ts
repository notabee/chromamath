/**
 * ChromaMath Content Script: arXiv & Web LaTeX Math Detector
 * Automatically detects mathematical equations on arXiv HTML, ar5iv, and Wikipedia,
 * extracts pristine LaTeX, and provides a lightweight, non-intrusive floating "✨ Explain" pill.
 */

import type { ExplainResponse } from '../shared/messages';

const CLIENT_TIMEOUT_MS = 32000;
const PILL_RESET_MS = 3500;

function sendExplainRequest(latex: string): Promise<ExplainResponse> {
  return new Promise((resolve) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({ success: false, error: 'Request timed out' });
      }
    }, CLIENT_TIMEOUT_MS);

    try {
      chrome.runtime.sendMessage({ type: 'EXPLAIN_LATEX', latex }, (res: ExplainResponse) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        resolve(res || { success: false, error: 'Empty response' });
      });
    } catch (err: any) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve({ success: false, error: err?.message || 'Connection error' });
      }
    }
  });
}

// Inject scoped styles for the floating pill
const style = document.createElement('style');
style.textContent = `
  .chromamath-wand-pill {
    position: absolute;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    background: #000000;
    color: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 11px;
    font-weight: 700;
    border-radius: 9999px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    border: 1px solid #27272a;
    cursor: pointer;
    z-index: 2147483645;
    opacity: 0;
    transform: translateY(4px) scale(0.95);
    transition: opacity 0.2s ease, transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
    pointer-events: none;
    user-select: none;
  }
  .chromamath-wand-pill.visible {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
  }
  .chromamath-wand-pill:hover {
    background: #27272a;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
  }
`;
document.head.appendChild(style);

let floatingPill: HTMLDivElement | null = null;
let currentTargetElement: HTMLElement | null = null;
let currentExtractedLatex: string | null = null;
let isAnalyzing = false;

const LOGO_URL = (typeof chrome !== 'undefined' && chrome?.runtime?.getURL)
  ? chrome.runtime.getURL('icons/icon-48.png')
  : '';

function setPillContent(mode: 'default' | 'loading' | 'success' | 'notice', text?: string) {
  if (!floatingPill) return;
  if (mode === 'default') {
    floatingPill.style.background = '#000000';
    floatingPill.style.borderColor = '#27272a';
    floatingPill.innerHTML = `${LOGO_URL ? `<img src="${LOGO_URL}" style="width: 14px; height: 14px; border-radius: 3px; object-fit: cover; vertical-align: middle;" />` : '<span>✨</span>'}<span>Explain</span>`;
  } else if (mode === 'loading') {
    floatingPill.style.background = '#000000';
    floatingPill.style.borderColor = '#27272a';
    floatingPill.innerHTML = `<span>⚡</span><span>Analyzing...</span>`;
  } else if (mode === 'success') {
    floatingPill.style.background = '#059669';
    floatingPill.style.borderColor = '#10b981';
    floatingPill.innerHTML = `<span>✅</span><span>Opened in Side Panel →</span>`;
  } else if (mode === 'notice') {
    floatingPill.style.background = '#b91c1c';
    floatingPill.style.borderColor = '#ef4444';
    floatingPill.innerHTML = `<span>⚠️</span><span>${text || 'Notice'}</span>`;
  }
}

function createFloatingPill(): HTMLDivElement {
  if (floatingPill) return floatingPill;

  const pill = document.createElement('div');
  pill.className = 'chromamath-wand-pill';
  floatingPill = pill;
  setPillContent('default');

  pill.addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (isAnalyzing) return;
    if (!currentExtractedLatex) return;

    const targetLatex = currentExtractedLatex;
    isAnalyzing = true;
    setPillContent('loading');

    try {
      const response = await sendExplainRequest(targetLatex);

      isAnalyzing = false;
      if (response?.success) {
        setPillContent('success');
      } else {
        setPillContent('notice', response?.error?.includes('API Key') ? 'API Key Required' : 'Check Side Panel');
      }
    } catch {
      isAnalyzing = false;
      setPillContent('notice', 'Check Side Panel');
    } finally {
      window.setTimeout(() => {
        if (!isAnalyzing) setPillContent('default');
      }, PILL_RESET_MS);
    }
  });

  document.body.appendChild(pill);
  return pill;
}

/**
 * Extracts raw LaTeX from various web math representations (MathML, KaTeX, MathJax, arXiv ar5iv).
 */
function extractLatexFromElement(el: HTMLElement): string | null {
  // 1. Math tag alttext or alt attribute (standard on arXiv HTML and Wikipedia)
  const mathTag = el.tagName.toLowerCase() === 'math' ? el : el.querySelector('math');
  if (mathTag?.getAttribute('alttext')) {
    return mathTag.getAttribute('alttext')!.trim();
  }
  if (mathTag?.getAttribute('alt')) {
    return mathTag.getAttribute('alt')!.trim();
  }

  // 2. MathML annotation with application/x-tex
  const annotation = el.querySelector('annotation[encoding="application/x-tex"]') || 
                     el.querySelector('annotation');
  if (annotation?.textContent?.trim()) {
    return annotation.textContent.trim();
  }

  // 3. Direct attributes on container
  if (el.getAttribute('alttext')) return el.getAttribute('alttext')!.trim();
  if (el.getAttribute('alt')) return el.getAttribute('alt')!.trim();
  if (el.dataset.tex) return el.dataset.tex.trim();
  if (el.dataset.latex) return el.dataset.latex.trim();

  // 4. KaTeX tex-source
  const katexSource = el.querySelector('.katex-mathml annotation');
  if (katexSource?.textContent?.trim()) {
    return katexSource.textContent.trim();
  }

  // 5. Script tag with type="math/tex"
  const mathScript = el.querySelector('script[type^="math/tex"]');
  if (mathScript?.textContent?.trim()) {
    return mathScript.textContent.trim();
  }

  // Fallback: If element has text content looking like an equation
  const text = el.textContent?.trim() || '';
  if (text.includes('=') || text.includes('\\') || text.length > 8) {
    return text;
  }

  return null;
}

/**
 * Attaches hover listeners to detected math containers.
 */
function attachMathListeners(el: HTMLElement) {
  if (el.dataset.chromamathAttached) return;
  el.dataset.chromamathAttached = 'true';

  el.addEventListener('mouseenter', () => {
    const latex = extractLatexFromElement(el);
    if (!latex) return;

    // Only show pill on display equations or substantive formulas (avoid single letters)
    const isDisplay = el.tagName.toLowerCase() === 'table' || 
                      el.classList.contains('ltx_equation') || 
                      el.getAttribute('display') === 'block' || 
                      !!el.querySelector('math[display="block"]');
    if (!isDisplay && latex.length <= 4 && !latex.includes('=')) {
      return;
    }

    currentTargetElement = el;
    currentExtractedLatex = latex;

    const pill = createFloatingPill();
    if (!isAnalyzing) {
      setPillContent('default');
    }

    const rect = el.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    pill.style.top = `${rect.top + scrollY - 26}px`;
    pill.style.left = `${Math.max(10, rect.left + scrollX + rect.width / 2 - 35)}px`;
    pill.classList.add('visible');
  });

  el.addEventListener('mouseleave', () => {
    setTimeout(() => {
      if (floatingPill && !floatingPill.matches(':hover') && !el.matches(':hover')) {
        floatingPill.classList.remove('visible');
      }
    }, 200);
  });
}

/**
 * Scans page for mathematical elements on arXiv and ar5iv.
 */
function scanPageForMath() {
  const mathSelectors = [
    'math',
    '.ltx_Math',
    '.ltx_equation',
    '.katex',
    '.MathJax',
    'mjx-container',
    '.mwe-math-element',
    'img.mwe-math-fallback-image-inline'
  ];

  const elements = document.querySelectorAll<HTMLElement>(mathSelectors.join(', '));
  elements.forEach(attachMathListeners);
}

// Observe dynamically loaded DOM nodes
let scanTimer: number | null = null;
const observer = new MutationObserver(() => {
  if (scanTimer) clearTimeout(scanTimer);
  scanTimer = window.setTimeout(() => {
    scanPageForMath();
  }, 300);
});

if (document.body) {
  scanPageForMath();
  observer.observe(document.body, { childList: true, subtree: true });
} else {
  document.addEventListener('DOMContentLoaded', () => {
    scanPageForMath();
    observer.observe(document.body, { childList: true, subtree: true });
  });
}
