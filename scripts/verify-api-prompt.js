import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

async function testPrompt() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--window-size=1280,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  await page.goto('https://arxiv.org/html/2603.12201v1', { waitUntil: 'networkidle2', timeout: 45000 });

  // Mock sendMessage to return No Gemini API Key error
  await page.evaluate(() => {
    window.chrome = window.chrome || {};
    window.chrome.runtime = window.chrome.runtime || {};
    window.chrome.runtime.sendMessage = function(msg, callback) {
      if (callback) {
        setTimeout(() => callback({
          success: false,
          error: "No Gemini API Key configured. Please enter your free Google AI Studio API key in Settings."
        }), 200);
      }
    };
  });

  await page.addScriptTag({ path: 'dist/arxiv-detector.js' });

  // Scroll to Equation 1
  await page.evaluate(() => {
    const eq = document.getElementById('S3.E1');
    if (eq) eq.scrollIntoView({ behavior: 'instant', block: 'center' });
    eq?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
  });

  await new Promise(r => setTimeout(r, 500));

  // Click Explain
  await page.evaluate(() => {
    const pill = document.querySelector('.chromamath-wand-pill');
    pill?.click();
  });

  await new Promise(r => setTimeout(r, 1000));

  const cardHtml = await page.evaluate(() => {
    const card = document.getElementById('chromamath-card');
    return card ? card.innerHTML : null;
  });
  console.log('Card HTML present:', !!cardHtml);

  const screenshotDir = path.resolve('test-artifacts');
  await page.screenshot({ path: path.join(screenshotDir, '03_api_key_prompt.png') });
  console.log('Captured: 03_api_key_prompt.png');

  await browser.close();
}

testPrompt().catch(console.error);
