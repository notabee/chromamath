import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const pathToExtension = path.resolve('dist');
console.log('Testing ChromaMath extension from:', pathToExtension);

async function run() {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1400,900'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  const targets = browser.targets();
  console.log('Browser targets:', targets.map(t => ({ type: t.type(), url: t.url() })));

  page.on('console', (msg) => {
    console.log(`[PAGE LOG] ${msg.type()}: ${msg.text()}`);
  });

  page.on('pageerror', (err) => {
    console.error(`[PAGE ERROR]:`, err);
  });

  console.log('Navigating to https://arxiv.org/html/2603.12201v1 ...');
  try {
    await page.goto('https://arxiv.org/html/2603.12201v1', { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (e) {
    console.log('Navigation timeout/error, checking if DOM loaded anyway:', e.message);
  }

  // Wait 3 seconds for content scripts
  await new Promise(r => setTimeout(r, 3000));

  // Check if content script injected
  const isScriptInjected = await page.evaluate(() => {
    return !!document.querySelector('.chromamath-wand-pill') || !!window.chromamathAttached;
  });
  console.log('Is pill or script attached in page?', isScriptInjected);

  // Find math elements
  const mathElementsCount = await page.evaluate(() => {
    const mathNodes = document.querySelectorAll('math, .ltx_Math, .ltx_equation');
    return {
      total: mathNodes.length,
      displayEqs: document.querySelectorAll('.ltx_equation').length
    };
  });
  console.log('Found math elements on page:', mathElementsCount);

  // Take screenshot of section 3.2
  const eqFound = await page.evaluate(() => {
    const eq1 = document.getElementById('S3.E1');
    if (!eq1) return false;
    eq1.scrollIntoView({ behavior: 'instant', block: 'center' });
    return true;
  });
  console.log('Scrolled to Eq 1 (S3.E1)?', eqFound);

  await new Promise(r => setTimeout(r, 1500));

  // Hover over the equation
  console.log('Hovering over [id="S3.E1"]...');
  await page.hover('[id="S3.E1"]');

  await new Promise(r => setTimeout(r, 1000));

  // Check if wand pill is visible
  const pillState = await page.evaluate(() => {
    const pill = document.querySelector('.chromamath-wand-pill');
    if (!pill) return null;
    const style = window.getComputedStyle(pill);
    return {
      exists: true,
      visibleClass: pill.classList.contains('visible'),
      opacity: style.opacity,
      top: pill.style.top,
      left: pill.style.left,
      text: pill.innerText
    };
  });
  console.log('Pill state after hover:', pillState);

  // Save screenshot of hover
  const screenshotDir = path.resolve('test-artifacts');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  await page.screenshot({ path: path.join(screenshotDir, '01_hover_pill.png') });
  console.log('Saved screenshot: 01_hover_pill.png');

  // Now click the pill!
  console.log('Clicking the Explain pill...');
  const clickResult = await page.evaluate(() => {
    const pill = document.querySelector('.chromamath-wand-pill');
    if (!pill) return 'No pill found';
    pill.click();
    return 'Clicked';
  });
  console.log('Click result:', clickResult);

  // Wait 2 seconds
  await new Promise(r => setTimeout(r, 2000));

  // Check what appeared in the page
  const pageStateAfterClick = await page.evaluate(() => {
    const card = document.getElementById('chromamath-card');
    const pill = document.querySelector('.chromamath-wand-pill');
    return {
      cardExists: !!card,
      cardHtml: card ? card.innerHTML : null,
      pillText: pill ? pill.innerText : null
    };
  });
  console.log('Page state after click:', pageStateAfterClick);

  await page.screenshot({ path: path.join(screenshotDir, '02_after_click.png') });
  console.log('Saved screenshot: 02_after_click.png');

  await browser.close();
}

run().catch(console.error);
