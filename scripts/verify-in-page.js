import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

async function verify() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--window-size=1280,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  page.on('console', msg => console.log('[PAGE CONSOLE]', msg.text()));
  page.on('pageerror', err => console.error('[PAGE ERROR]', err));

  console.log('Loading arXiv HTML paper...');
  await page.goto('https://arxiv.org/html/2603.12201v1', { waitUntil: 'networkidle2', timeout: 45000 });

  // Set up mock chrome.runtime in page before injecting detector
  await page.evaluate(() => {
    const libEq = {
      id: "indexcache-multidistill",
      title: "IndexCache Multi-Layer Distillation (arXiv:2603.12201)",
      normalizedLatex: "\\mathcal{L}^{\\mathrm{I}}_{\\mathrm{multi}} = \\sum_{j=0}^{m} \\frac{1}{m+1} \\sum_{t} D_{\\mathrm{KL}}\\left(\\mathbf{p}^{(\\ell+j)}_{t} \\,\\big\\|\\, \\mathbf{q}^{(\\ell)}_{t}\\right)",
      narrativeSentence: "To train a shared attention indexer across multiple layers, average the divergence penalties between each served layer's true attention and the indexer's predicted token distribution.",
      components: [
        { id: "c1", plainPhrase: "To train a shared attention indexer across multiple layers", paletteIndex: 0 },
        { id: "c2", plainPhrase: "average", paletteIndex: 4 },
        { id: "c3", plainPhrase: "the divergence penalties", paletteIndex: 3 },
        { id: "c4", plainPhrase: "between each served layer's true attention", paletteIndex: 2 },
        { id: "c5", plainPhrase: "and the indexer's predicted token distribution", paletteIndex: 5 }
      ],
      adept: {
        analogy: "A school chef planning a single lunch menu (the shared indexer q) that simultaneously satisfies the diverse dietary preferences of m different classrooms (p)."
      },
      source: "library"
    };

    window.chrome = window.chrome || {};
    window.chrome.runtime = window.chrome.runtime || {};
    window.chrome.runtime.sendMessage = function(msg, callback) {
      console.log('chrome.runtime.sendMessage called with:', JSON.stringify(msg));
      if (callback) {
        setTimeout(() => {
          callback({ success: true, equation: libEq });
        }, 100);
      }
    };
  });

  console.log('Injecting dist/arxiv-detector.js...');
  await page.addScriptTag({ path: 'dist/arxiv-detector.js' });

  // Scroll to Equation 1 (id="S3.E1")
  console.log('Scrolling to Eq 1 (S3.E1)...');
  await page.evaluate(() => {
    const eq = document.getElementById('S3.E1');
    if (eq) {
      eq.scrollIntoView({ behavior: 'instant', block: 'center' });
    }
  });

  await new Promise(r => setTimeout(r, 1000));

  // Trigger mouseenter on Equation 1
  console.log('Triggering mouseenter on S3.E1...');
  const hoverRes = await page.evaluate(() => {
    const eq = document.getElementById('S3.E1');
    if (!eq) return 'No S3.E1';
    eq.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    const pill = document.querySelector('.chromamath-wand-pill');
    return {
      hasPill: !!pill,
      pillVisible: pill?.classList.contains('visible'),
      pillText: pill?.innerText,
      pillTop: pill?.style.top,
      pillLeft: pill?.style.left
    };
  });
  console.log('Hover result on S3.E1:', hoverRes);

  const screenshotDir = path.resolve('test-artifacts');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  await page.screenshot({ path: path.join(screenshotDir, '01_pill_visible.png') });
  console.log('Captured: 01_pill_visible.png');

  // Click the Explain pill
  console.log('Clicking the Explain pill...');
  const clickRes = await page.evaluate(() => {
    const pill = document.querySelector('.chromamath-wand-pill');
    if (!pill) return 'No pill found';
    pill.click();
    return 'Clicked successfully';
  });
  console.log('Click result:', clickRes);

  // Wait 1.5 seconds for card to render
  await new Promise(r => setTimeout(r, 1500));

  const cardStatus = await page.evaluate(() => {
    const card = document.getElementById('chromamath-card');
    if (!card) return 'No card found';
    return {
      exists: true,
      text: card.innerText,
      top: card.style.top,
      left: card.style.left
    };
  });
  console.log('In-page card status:', cardStatus);

  await page.screenshot({ path: path.join(screenshotDir, '02_card_open.png') });
  console.log('Captured: 02_card_open.png');

  await browser.close();
}

verify().catch(console.error);
