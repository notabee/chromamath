import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

async function recordDemo() {
  const framesDir = path.resolve('test-artifacts/frames');
  if (fs.existsSync(framesDir)) fs.rmSync(framesDir, { recursive: true });
  fs.mkdirSync(framesDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--window-size=1280,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log('Loading arXiv HTML paper (2603.12201v1)...');
  await page.goto('https://arxiv.org/html/2603.12201v1', { waitUntil: 'networkidle2', timeout: 45000 });

  // Set up mock runtime
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
      if (callback) {
        setTimeout(() => callback({ success: true, equation: libEq }), 400);
      }
    };
  });

  await page.addScriptTag({ path: 'dist/arxiv-detector.js' });

  // Scroll to Equation 1
  await page.evaluate(() => {
    const eq = document.getElementById('S3.E1');
    if (eq) eq.scrollIntoView({ behavior: 'instant', block: 'center' });
  });

  let frameIdx = 0;
  async function snap(count = 1) {
    for (let i = 0; i < count; i++) {
      frameIdx++;
      const fname = path.join(framesDir, `frame_${String(frameIdx).padStart(4, '0')}.png`);
      await page.screenshot({ path: fname });
    }
  }

  console.log('Capturing initial reading state...');
  await snap(6);

  console.log('Triggering equation hover...');
  await page.evaluate(() => {
    const eq = document.getElementById('S3.E1');
    eq?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
  });

  console.log('Capturing hover wand pill...');
  await snap(8);

  console.log('Clicking the Explain pill...');
  await page.evaluate(() => {
    const pill = document.querySelector('.chromamath-wand-pill');
    pill?.click();
  });

  console.log('Capturing loading transition...');
  await snap(4);

  // Wait for card
  await new Promise(r => setTimeout(r, 600));

  console.log('Capturing opened card state...');
  await snap(14);

  await browser.close();

  // Create video and gif using ffmpeg
  const artifactDir = '/Users/rishabh/.gemini/antigravity/brain/4c5d5de9-5c1a-45ce-930e-2bd887250d21';
  const mp4Path = path.join(artifactDir, 'chromamath_demo.mp4');
  const gifPath = path.join(artifactDir, 'chromamath_demo.gif');

  console.log('Encoding video with ffmpeg...');
  execSync(`/opt/homebrew/bin/ffmpeg -y -framerate 4 -i "${framesDir}/frame_%04d.png" -c:v libx264 -pix_fmt yuv420p "${mp4Path}"`);
  console.log('Generated MP4:', mp4Path);

  execSync(`/opt/homebrew/bin/ffmpeg -y -framerate 4 -i "${framesDir}/frame_%04d.png" -vf "scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" "${gifPath}"`);
  console.log('Generated GIF:', gifPath);
}

recordDemo().catch(console.error);
