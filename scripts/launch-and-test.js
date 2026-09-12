import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import path from 'path';

const pathToExtension = path.resolve('dist');
console.log('Testing with real Chrome process, extension path:', pathToExtension);

// Launch real Chrome
const chromeProcess = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--remote-debugging-port=9222',
  '--user-data-dir=/tmp/chromamath-test-profile',
  `--load-extension=${pathToExtension}`,
  `--disable-extensions-except=${pathToExtension}`,
  '--no-first-run',
  '--no-default-browser-check',
  'https://arxiv.org/html/2603.12201v1'
], { stdio: 'pipe' });

chromeProcess.stderr.on('data', (d) => {
  const s = d.toString();
  if (s.includes('Extension') || s.includes('DevTools') || s.includes('ERROR')) {
    console.log('[CHROME STDERR]', s.trim());
  }
});

async function connectAndVerify() {
  // Wait 3s for Chrome to spin up DevTools port
  await new Promise(r => setTimeout(r, 3000));

  console.log('Connecting Puppeteer to Chrome on port 9222...');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });

  const targets = browser.targets();
  console.log('Targets in real Chrome:');
  targets.forEach(t => console.log(` - [${t.type()}] ${t.url()}`));

  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('arxiv.org')) || pages[0];
  console.log('Active page URL:', page.url());

  // Wait 2s for page to settle
  await new Promise(r => setTimeout(r, 2000));

  // Check if content script is present
  const check = await page.evaluate(() => {
    return {
      pillPresent: !!document.querySelector('.chromamath-wand-pill'),
      mathElements: document.querySelectorAll('math, .ltx_equation').length,
      equations: document.querySelectorAll('.ltx_equation').length,
    };
  });
  console.log('Page content check:', check);

  // Scroll to Equation 1 (S3.E1)
  console.log('Scrolling to S3.E1...');
  await page.evaluate(() => {
    const eq = document.getElementById('S3.E1');
    if (eq) {
      eq.scrollIntoView({ behavior: 'instant', block: 'center' });
      eq.style.outline = '3px solid #8b5cf6';
    }
  });

  // Hover over the equation
  console.log('Hovering over S3.E1...');
  const eqBounding = await page.evaluate(() => {
    const eq = document.getElementById('S3.E1');
    if (!eq) return null;
    const r = eq.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });

  if (eqBounding) {
    await page.mouse.move(eqBounding.x, eqBounding.y);
    console.log('Moved mouse to:', eqBounding);
  }

  await new Promise(r => setTimeout(r, 1500));

  // Check if pill appeared
  const pillInfo = await page.evaluate(() => {
    const pill = document.querySelector('.chromamath-wand-pill');
    if (!pill) return 'No pill';
    const s = window.getComputedStyle(pill);
    return {
      visible: pill.classList.contains('visible'),
      opacity: s.opacity,
      top: pill.style.top,
      left: pill.style.left,
      text: pill.innerText
    };
  });
  console.log('Pill info after hover:', pillInfo);

  // Clean up
  await browser.disconnect();
  chromeProcess.kill();
  console.log('Test completed.');
}

connectAndVerify().catch((e) => {
  console.error('Error:', e);
  chromeProcess.kill();
});
