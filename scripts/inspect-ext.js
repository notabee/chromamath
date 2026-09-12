import puppeteer from 'puppeteer';
import path from 'path';

const pathToExtension = path.resolve('dist');

async function inspectExtensions() {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
      '--no-sandbox',
    ]
  });

  const page = await browser.newPage();
  await page.goto('chrome://extensions');
  await new Promise(r => setTimeout(r, 2000));

  const info = await page.evaluate(() => {
    const manager = document.querySelector('extensions-manager');
    const itemList = manager?.shadowRoot?.querySelector('extensions-item-list');
    const items = itemList?.shadowRoot?.querySelectorAll('extensions-item') || [];
    const results = [];
    items.forEach((it) => {
      const name = it.shadowRoot?.querySelector('#name')?.textContent;
      const errors = it.shadowRoot?.querySelector('#errors')?.textContent;
      const inspect = it.shadowRoot?.querySelector('#inspect-views')?.textContent;
      results.push({ name, errors, inspect });
    });
    return { count: items.length, results };
  });

  console.log('Extensions found:', JSON.stringify(info, null, 2));
  await browser.close();
}

inspectExtensions().catch(console.error);
