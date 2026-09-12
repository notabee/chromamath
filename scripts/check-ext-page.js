import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import path from 'path';

const pathToExtension = path.resolve('dist');

async function testExtensionsPage() {
  const chromeProcess = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--remote-debugging-port=9223',
    '--user-data-dir=/tmp/chromamath-debug-profile',
    `--load-extension=${pathToExtension}`,
    '--no-first-run',
    'chrome://extensions'
  ]);

  await new Promise(r => setTimeout(r, 2500));

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223' });
  const page = (await browser.pages())[0];

  await page.screenshot({ path: 'test-artifacts/extensions_page.png' });
  console.log('Saved screenshot of extensions page.');

  // Check extensions
  const extList = await page.evaluate(async () => {
    // In chrome://extensions, we can call chrome.management.getAll() if allowed, or query DOM
    const manager = document.querySelector('extensions-manager');
    const toolbar = manager?.shadowRoot?.querySelector('extensions-toolbar');
    const devToggle = toolbar?.shadowRoot?.querySelector('#devMode');
    return {
      hasManager: !!manager,
      devModeChecked: devToggle ? devToggle.getAttribute('aria-pressed') : null,
      innerText: document.body.innerText
    };
  });
  console.log('Extensions page status:', extList);

  await browser.disconnect();
  chromeProcess.kill();
}

testExtensionsPage().catch(console.error);
