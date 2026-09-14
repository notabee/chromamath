/**
 * ChromaMath Content Script: arXiv & Web LaTeX Math Detector
 * Object-oriented architecture: LatexExtractor, FloatingWandPill, ArxivDetector.
 * Automatically detects mathematical equations on arXiv HTML, ar5iv, and Wikipedia,
 * extracts pristine LaTeX, and provides an elegant, non-intrusive floating pill.
 */

import type { ExplainResponse } from '../shared/messages';

type PillMode = 'default' | 'loading' | 'success' | 'notice';

/**
 * Strategy class to extract raw LaTeX from various web math representations
 * (MathML, KaTeX, MathJax, arXiv ar5iv, Wikipedia).
 */
export class LatexExtractor {
  public extract(el: HTMLElement): string | null {
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

    // 6. Text content fallback
    const text = el.textContent?.trim() || '';
    if (text.includes('=') || text.includes('\\') || text.length > 8) {
      return text;
    }

    return null;
  }

  public isSubstantive(el: HTMLElement, latex: string): boolean {
    const isDisplay = el.tagName.toLowerCase() === 'table' || 
                      el.classList.contains('ltx_equation') || 
                      el.getAttribute('display') === 'block' || 
                      !!el.querySelector('math[display="block"]');
    if (!isDisplay && latex.length <= 4 && !latex.includes('=')) {
      return false;
    }
    return true;
  }
}

/**
 * Encapsulated floating action pill component.
 */
export class FloatingWandPill {
  private element: HTMLDivElement | null = null;
  private currentMode: PillMode = 'default';
  private logoUrl: string;
  private resetTimer: any = null;

  constructor(private onClick: () => Promise<void>) {
    this.logoUrl = (typeof chrome !== 'undefined' && chrome?.runtime?.getURL)
      ? chrome.runtime.getURL('icons/icon-48.png')
      : '';
    this.injectStyles();
  }

  private injectStyles(): void {
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
  }

  public ensureElement(): HTMLDivElement {
    if (this.element) return this.element;

    const pill = document.createElement('div');
    pill.className = 'chromamath-wand-pill';
    this.element = pill;
    this.setMode('default');

    pill.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      await this.onClick();
    });

    document.body.appendChild(pill);
    return pill;
  }

  public setMode(mode: PillMode, noticeText?: string): void {
    const pill = this.ensureElement();
    this.currentMode = mode;

    if (mode === 'default') {
      pill.style.background = '#000000';
      pill.style.borderColor = '#27272a';
      pill.innerHTML = `${this.logoUrl ? `<img src="${this.logoUrl}" style="width: 14px; height: 14px; border-radius: 3px; object-fit: cover; vertical-align: middle;" />` : '<span>✨</span>'}<span>Explain</span>`;
    } else if (mode === 'loading') {
      pill.style.background = '#000000';
      pill.style.borderColor = '#27272a';
      pill.innerHTML = `<span>⚡</span><span>Analyzing...</span>`;
    } else if (mode === 'success') {
      pill.style.background = '#059669';
      pill.style.borderColor = '#10b981';
      pill.innerHTML = `<span>✅</span><span>View in Side Panel →</span>`;
    } else if (mode === 'notice') {
      pill.style.background = '#b91c1c';
      pill.style.borderColor = '#ef4444';
      pill.innerHTML = `<span>⚠️</span><span>${noticeText || 'Notice'}</span>`;
    }
  }

  public getMode(): PillMode {
    return this.currentMode;
  }

  public showAt(rect: DOMRect): void {
    const pill = this.ensureElement();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    pill.style.top = `${rect.top + scrollY - 26}px`;
    pill.style.left = `${Math.max(10, rect.left + scrollX + rect.width / 2 - 35)}px`;
    pill.classList.add('visible');
  }

  public hide(): void {
    if (this.element && !this.element.matches(':hover')) {
      this.element.classList.remove('visible');
    }
  }

  public scheduleReset(ms = 3500): void {
    if (this.resetTimer) clearTimeout(this.resetTimer);
    this.resetTimer = setTimeout(() => {
      this.setMode('default');
    }, ms);
  }
}

/**
 * Main Content Script Controller coordinating DOM scanning,
 * hover positioning, and background deconstruction requests.
 */
export class ArxivDetector {
  private extractor = new LatexExtractor();
  private pill: FloatingWandPill;
  private currentLatex: string | null = null;
  private isAnalyzing = false;
  private scanTimer: any = null;

  private static readonly MATH_SELECTORS = [
    'math',
    '.ltx_Math',
    '.ltx_equation',
    '.katex',
    '.MathJax',
    'mjx-container',
    '.mwe-math-element',
    'img.mwe-math-fallback-image-inline'
  ];

  constructor() {
    this.pill = new FloatingWandPill(() => this.handlePillClick());
  }

  public init(): void {
    if (document.body) {
      this.scanPage();
      this.setupObserver();
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        this.scanPage();
        this.setupObserver();
      });
    }
  }

  private setupObserver(): void {
    const observer = new MutationObserver(() => {
      if (this.scanTimer) clearTimeout(this.scanTimer);
      this.scanTimer = setTimeout(() => this.scanPage(), 300);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  public scanPage(): void {
    const elements = document.querySelectorAll<HTMLElement>(ArxivDetector.MATH_SELECTORS.join(', '));
    elements.forEach((el) => this.attachMathListeners(el));
  }

  private attachMathListeners(el: HTMLElement): void {
    if (el.dataset.chromamathAttached) return;
    el.dataset.chromamathAttached = 'true';

    el.addEventListener('mouseenter', () => {
      const latex = this.extractor.extract(el);
      if (!latex || !this.extractor.isSubstantive(el, latex)) return;

      this.currentLatex = latex;
      if (!this.isAnalyzing) {
        this.pill.setMode('default');
      }

      this.pill.showAt(el.getBoundingClientRect());
    });

    el.addEventListener('mouseleave', () => {
      setTimeout(() => {
        if (!el.matches(':hover')) {
          this.pill.hide();
        }
      }, 200);
    });
  }

  private async handlePillClick(): Promise<void> {
    if (this.pill.getMode() === 'success') {
      try {
        chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' });
      } catch {}
      return;
    }

    if (this.isAnalyzing || !this.currentLatex) return;

    const targetLatex = this.currentLatex;
    this.isAnalyzing = true;
    this.pill.setMode('loading');

    try {
      const response = await this.sendExplainRequest(targetLatex);
      this.isAnalyzing = false;

      if (response?.success) {
        this.pill.setMode('success');
      } else {
        const isKey = response?.error?.includes('API Key');
        this.pill.setMode('notice', isKey ? 'API Key Required' : 'Check Side Panel');
      }
    } catch {
      this.isAnalyzing = false;
      this.pill.setMode('notice', 'Check Side Panel');
    } finally {
      this.pill.scheduleReset();
    }
  }

  private sendExplainRequest(latex: string): Promise<ExplainResponse> {
    const { docId, docTitle } = this.getDocumentContext();
    return new Promise((resolve) => {
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({ success: false, error: 'Request timed out' });
        }
      }, 32000);

      try {
        chrome.runtime.sendMessage({ type: 'EXPLAIN_LATEX', latex, docId, docTitle }, (res: ExplainResponse) => {
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

  private getDocumentContext(): { docId: string; docTitle: string } {
    const url = window.location.href;
    const docTitle = document.title || 'Paper';
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      const path = parsed.pathname;

      if (host.includes('arxiv.org') || host.includes('ar5iv')) {
        const match = path.match(/\/(?:html|abs|pdf)\/([0-9]{4}\.[0-9]{4,5}(?:v[0-9]+)?)/i);
        if (match && match[1]) {
          return { docId: `arxiv:${match[1].replace(/v\d+$/i, '')}`, docTitle };
        }
      }
      if (host.includes('wikipedia.org')) {
        return { docId: `wiki:${path.replace(/^\/wiki\//, '')}`, docTitle };
      }
      return { docId: `${host}${path.replace(/\/$/, '')}`, docTitle };
    } catch {
      return { docId: 'global', docTitle };
    }
  }
}

// Start detector instance
const detector = new ArxivDetector();
detector.init();
