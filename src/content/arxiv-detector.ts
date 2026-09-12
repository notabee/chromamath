/**
 * ChromaMath Content Script: arXiv & LaTeX Math Detector
 * Automatically detects math equations on arXiv HTML & ar5iv, extracts pristine LaTeX from DOM,
 * and adds an interactive "✨ Explain" wand pill.
 */

// Inject styles for the floating pill
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
    z-index: 999999;
    opacity: 0;
    transform: translateY(4px) scale(0.95);
    transition: opacity 0.2s ease, transform 0.2s ease;
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
  .chromamath-floating-card {
    position: absolute;
    width: 460px;
    max-width: 90vw;
    background: #ffffff;
    color: #18181b;
    border: 2px dotted #a1a1aa;
    border-radius: 20px;
    padding: 16px;
    box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.25);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    z-index: 2147483646;
    animation: cmFadeIn 0.2s ease-out;
  }
  @keyframes cmFadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;
document.head.appendChild(style);

let floatingPill: HTMLDivElement | null = null;
let currentTargetElement: HTMLElement | null = null;
let currentExtractedLatex: string | null = null;

function showInPageCard(equation: any, anchorElement: HTMLElement) {
  document.getElementById('chromamath-card')?.remove();

  const card = document.createElement('div');
  card.id = 'chromamath-card';
  card.className = 'chromamath-floating-card';

  const rect = anchorElement.getBoundingClientRect();
  const scrollX = window.scrollX || window.pageXOffset;
  const scrollY = window.scrollY || window.pageYOffset;
  card.style.top = `${rect.bottom + scrollY + 8}px`;
  card.style.left = `${Math.max(10, Math.min(window.innerWidth - 480, rect.left + scrollX))}px`;

  const PALETTE_COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#EC4899'];
  let narrativeHtml = equation.narrativeSentence || '';
  equation.components?.forEach((comp: any) => {
    const col = PALETTE_COLORS[comp.paletteIndex % PALETTE_COLORS.length];
    const phrase = comp.plainPhrase;
    if (phrase && narrativeHtml.includes(phrase)) {
      narrativeHtml = narrativeHtml.replace(
        phrase,
        `<span style="color: ${col}; font-weight: 700; text-decoration: underline; text-decoration-color: ${col}99; padding: 1px 4px; border-radius: 4px; background: ${col}15;">${phrase}</span>`
      );
    }
  });

  card.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px dotted #d4d4d8; padding-bottom: 8px; margin-bottom: 10px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="background: #000000; color: #ffffff; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; letter-spacing: 0.05em; text-transform: uppercase;">ChromaMath</span>
        <span style="font-size: 12px; font-weight: 700; color: #18181b;">${equation.title || 'Mathematical Deconstruction'}</span>
      </div>
      <button id="cm-card-close" style="background: none; border: none; color: #71717a; font-size: 18px; cursor: pointer; padding: 0 4px; line-height: 1;">&times;</button>
    </div>

    <div style="font-size: 13.5px; line-height: 1.6; color: #27272a; margin-bottom: 12px;">
      ${narrativeHtml}
    </div>

    ${equation.adept?.analogy ? `
      <div style="background: #fffbeb; border: 1px solid #fef3c7; border-left: 3px solid #f59e0b; padding: 8px 10px; border-radius: 8px; font-size: 11.5px; color: #78350f; margin-bottom: 10px; line-height: 1.5;">
        <span style="color: #b45309; font-weight: 700;">💡 Analogy: </span>${equation.adept.analogy}
      </div>
    ` : ''}

    <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 8px; border-top: 1px dotted #d4d4d8; font-size: 11px; color: #71717a;">
      <span>💡 Pin ChromaMath in toolbar for split-screen reading</span>
      <span style="background: #000000; color: #ffffff; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 9999px;">${equation.source === 'library' ? '⚡ 0ms Cached' : '✨ Gemini'}</span>
    </div>
  `;

  document.body.appendChild(card);
  document.getElementById('cm-card-close')?.addEventListener('click', () => card.remove());
}

function showInPageError(errorMsg: string, anchorElement: HTMLElement, currentLatex?: string | null) {
  document.getElementById('chromamath-card')?.remove();

  const card = document.createElement('div');
  card.id = 'chromamath-card';
  card.className = 'chromamath-floating-card';

  const rect = anchorElement.getBoundingClientRect();
  const scrollX = window.scrollX || window.pageXOffset;
  const scrollY = window.scrollY || window.pageYOffset;
  card.style.top = `${rect.bottom + scrollY + 8}px`;
  card.style.left = `${Math.max(10, Math.min(window.innerWidth - 480, rect.left + scrollX))}px`;

  const isApiKeyMissing = errorMsg.includes('API Key') || errorMsg.includes('apiKey');

  if (isApiKeyMissing) {
    card.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px dotted #d4d4d8; padding-bottom: 8px; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="background: #000000; color: #ffffff; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; text-transform: uppercase;">Setup</span>
          <span style="font-size: 12px; font-weight: 700; color: #18181b;">Free Gemini API Key Required</span>
        </div>
        <button id="cm-card-close" style="background: none; border: none; color: #71717a; font-size: 18px; cursor: pointer; padding: 0 4px; line-height: 1;">&times;</button>
      </div>

      <div style="font-size: 12px; color: #52525b; line-height: 1.5; margin-bottom: 12px;">
        This custom equation requires AI deconstruction. Google Gemini 3.6 Flash is <strong>100% free</strong> (1,500 requests/day, no credit card required).
      </div>

      <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style="display: flex; align-items: center; justify-content: center; gap: 6px; background: #000000; color: white; text-decoration: none; padding: 9px 14px; border-radius: 12px; font-size: 12px; font-weight: 700; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15); transition: opacity 0.2s;">
        <span>👉</span><span>Get Free API Key from Google AI Studio</span><span>↗</span>
      </a>

      <div style="display: flex; gap: 6px;">
        <input id="cm-inline-key-input" type="password" placeholder="Paste your AIzaSy... key here" style="flex: 1; background: #f4f4f5; border: 1px dotted #a1a1aa; border-radius: 8px; padding: 7px 10px; font-size: 12px; color: #18181b; outline: none;" />
        <button id="cm-inline-save-btn" style="background: #000000; border: none; color: white; font-size: 12px; font-weight: 700; border-radius: 8px; padding: 7px 14px; cursor: pointer; white-space: nowrap;">Save & Explain</button>
      </div>
    `;

    document.body.appendChild(card);
    document.getElementById('cm-card-close')?.addEventListener('click', () => card.remove());

    const saveBtn = document.getElementById('cm-inline-save-btn');
    const input = document.getElementById('cm-inline-key-input') as HTMLInputElement;

    saveBtn?.addEventListener('click', () => {
      const keyVal = input?.value?.trim();
      if (!keyVal) return;

      saveBtn.innerText = 'Saving...';
      chrome.storage?.sync?.set({ apiKey: keyVal }, () => {
        card.innerHTML = `
          <div style="padding: 16px; text-align: center; color: #18181b; font-size: 12px; font-weight: 600;">
            ⚡ Key saved! Deconstructing equation with Gemini 3.6 Flash...
          </div>
        `;
        if (currentLatex) {
          chrome.runtime.sendMessage(
            { type: 'EXPLAIN_LATEX', latex: currentLatex },
            (res) => {
              if (res?.success && res?.equation) {
                showInPageCard(res.equation, anchorElement);
              } else {
                showInPageError(res?.error || 'Failed to analyze', anchorElement, currentLatex);
              }
            }
          );
        }
      });
    });
    return;
  }

  card.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px dotted #d4d4d8; padding-bottom: 6px;">
      <span style="color: #dc2626; font-weight: 700; font-size: 12px;">⚠️ ChromaMath Notice</span>
      <button id="cm-card-close" style="background: none; border: none; color: #71717a; font-size: 18px; cursor: pointer; padding: 0 4px;">&times;</button>
    </div>
    <div style="font-size: 12px; color: #52525b; line-height: 1.5;">${errorMsg}</div>
  `;
  document.body.appendChild(card);
  document.getElementById('cm-card-close')?.addEventListener('click', () => card.remove());
}

function createFloatingPill() {
  if (floatingPill) return floatingPill;

  const pill = document.createElement('div');
  pill.className = 'chromamath-wand-pill';
  pill.innerHTML = `<span>✨</span><span>Explain</span>`;

  pill.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (currentExtractedLatex && currentTargetElement) {
      const targetEl = currentTargetElement;
      pill.innerHTML = `<span>⚡</span><span>Loading...</span>`;

      chrome.runtime.sendMessage(
        {
          type: 'EXPLAIN_LATEX',
          latex: currentExtractedLatex
        },
        (response) => {
          if (response?.success && response?.equation) {
            pill.innerHTML = `<span>✅</span><span>Explained!</span>`;
            showInPageCard(response.equation, targetEl);
            setTimeout(() => {
              pill.innerHTML = `<span>✨</span><span>Explain</span>`;
            }, 2500);
          } else {
            pill.innerHTML = `<span>⚠️</span><span>Notice</span>`;
            showInPageError(response?.error || 'Failed to deconstruct equation', targetEl, currentExtractedLatex);
            setTimeout(() => {
              pill.innerHTML = `<span>✨</span><span>Explain</span>`;
            }, 3000);
          }
        }
      );
    }
  });

  document.body.appendChild(pill);
  floatingPill = pill;
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

    // Only show pill on display equations or substantive inline formulas (not single letters like "k" or "N")
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
    const rect = el.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    // Position pill right above or to the right of the equation
    pill.style.top = `${rect.top + scrollY - 26}px`;
    pill.style.left = `${Math.max(10, rect.left + scrollX + rect.width / 2 - 35)}px`;
    pill.classList.add('visible');
  });

  el.addEventListener('mouseleave', (e) => {
    // Delay hide to allow moving mouse into the pill
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
    'math',                                // Native MathML
    '.ltx_Math',                           // ar5iv & LaTeX to HTML
    '.ltx_equation',                       // Display equations
    '.katex',                              // KaTeX blocks
    '.MathJax',                            // MathJax v2
    'mjx-container',                       // MathJax v3
    '.mwe-math-element',                   // Wikipedia / MediaWiki
    'img.mwe-math-fallback-image-inline'   // Wikipedia Math images
  ];

  const elements = document.querySelectorAll<HTMLElement>(mathSelectors.join(', '));
  elements.forEach(attachMathListeners);
}

// Observe dynamically loaded DOM nodes (e.g. infinite scroll or client-side rendered papers)
const observer = new MutationObserver(() => {
  scanPageForMath();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Initial scan
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scanPageForMath);
} else {
  scanPageForMath();
}

console.log('[ChromaMath] arXiv & Math Detector initialized.');
