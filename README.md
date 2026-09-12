# ChromaMath 🎨📐
> **Intuitive, Color-Coordinated Mathematical Equation Explainer for arXiv & PDFs**  
> Inspired by Kalid Azad's [BetterExplained](https://betterexplained.com/articles/colorized-math-equations/) & the **ADEPT** framework.

ChromaMath turns dense mathematical formulas into **color-coordinated cognitive maps**:
- Every mathematical chunk (variable, operator, limit, summation) is assigned an intuitive color.
- A natural **plain-English narrative sentence** is generated where each phrase shares the exact color of the mathematical symbol it describes.
- **Bidirectional hover synchronization**: hovering over any formula term highlights the explanation in the sentence, and hovering over words highlights the math symbol.
- **ADEPT Deep Dive**: Real-world **A**nalogy, visual **D**iagram concept, concrete **E**xample, **P**lain definition, and rigorous **T**echnical definition.
- **Zero-Cost & Free Tier**: Pre-baked library of iconic arXiv/math equations (0ms, 0 API cost) + free multimodal vision via Google Gemini 2.0 Flash (1,500 requests/day free).

---

## 🚀 How to Install & Run in Google Chrome

### 1. Build the Extension
Ensure you have Node.js installed, then run:
```bash
npm install
npm run build
```
This generates the ready-to-load Chrome Extension inside the `dist/` folder.

### 2. Load into Chrome
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Toggle **Developer mode** in the top right corner.
3. Click **Load unpacked**.
4. Select the `dist/` directory inside `read-better-maths/` (`/Users/rishabh/Downloads/read-better-maths/dist`).
5. ChromaMath is now installed! Pin the extension icon to your Chrome toolbar.

---

## 📖 How to Use

### 1. On arXiv HTML Papers (`arxiv.org/html/...` & `ar5iv.org/...`)
- Browse any arXiv HTML paper (e.g. [Attention Is All You Need](https://arxiv.org/html/1706.03762)).
- Hover over any formula on the page. A subtle floating `✨ Explain` wand appears.
- Click `✨ Explain` — the formula is extracted directly from the DOM with **zero OCR errors** and opens in the Chrome Side Panel.

### 2. On arXiv PDFs & Document Scans (`arxiv.org/pdf/...`)
- Open any PDF paper in Chrome.
- Click the **✂️ Snip Paper** button in the ChromaMath Side Panel (or press `Alt + S`).
- Drag a rectangular marquee over the equation.
- The high-DPI crop is captured and analyzed with multimodal AI.

### 3. Custom Equations & Text Selection
- **Select any LaTeX string** on a webpage (e.g. `$E = mc^2$`), right-click and choose **"Explain with ChromaMath"**.
- Or click **Paste TeX** in the Side Panel to type or paste any formula.

---

## 🎨 Accessibility: Colorblind-Safe Design
ChromaMath includes built-in accessibility modes:
- **Palette Switcher**: Toggle between **Modern Vibrant**, **Okabe-Ito (CVD-Safe for Protanopia, Deuteranopia, Tritanopia)**, and **High-Contrast Dark**.
- **Numbered Badges Mode (`[#]`)**: Adds matching superscript numbers `[1]`, `[2]` to both the equation chunk and the narrative phrase, eliminating color dependency entirely.
- **Underline Patterns**: Chunks have distinct underline patterns (solid, dashed, dotted, double, wavy).

---

## ⚡ Instant Offline Library (Zero API Cost)
ChromaMath ships with pre-baked deconstructions of classic arXiv and mathematics equations:
- **Transformer Scaled Dot-Product Attention**: $\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$
- **Discrete Fourier Transform**: $X_k = \frac{1}{N}\sum_{n=0}^{N-1} x_n e^{-i 2\pi k \frac{n}{N}}$
- **Euler's Constant (Continuous Growth)**: $e = \lim_{n \to \infty} (1 + \frac{1}{n})^{1 \cdot n}$
- **Bayes' Theorem**: $P(A|B) = \frac{P(B|A)P(A)}{P(B)}$
- **Categorical Cross-Entropy Loss**: $\mathcal{L} = -\sum_i y_i \log(\hat{y}_i)$

These equations load in **< 1ms with 0 API key required**.

---

## 🔑 Adding a Free Gemini API Key (For Custom Equations & Vision)
For new formulas outside the pre-baked library:
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey) to generate a free API key (no credit card required, 1,500 requests/day).
2. Click the ⚙️ **Settings** icon in the ChromaMath Side Panel.
3. Paste your API key and click **Save Key**.

---

## 🛠️ Project Structure
```
read-better-maths/
├── dist/                      # Packaged Chrome Extension (Load Unpacked)
├── public/
│   ├── manifest.json          # Manifest V3 configuration
│   └── icons/                 # 16px, 48px, 128px icons
├── src/
│   ├── background/
│   │   ├── service-worker.ts  # Manifest V3 background worker & message routing
│   │   └── gemini.ts          # Gemini 2.0 Flash API client with JSON Schema
│   ├── content/
│   │   ├── arxiv-detector.ts  # arXiv HTML & DOM MathML scraper + floating wand
│   │   └── snip-overlay.ts    # Screen capture marquee tool for PDFs
│   ├── offscreen/
│   │   └── cropper.ts         # Canvas image crop handler
│   ├── sidepanel/
│   │   ├── App.tsx            # Main Side Panel view
│   │   └── components/
│   │       ├── Header.tsx
│   │       ├── InteractiveEquation.tsx  # KaTeX renderer with hover effects
│   │       ├── NarrativeSentence.tsx    # Bidirectional hover text
│   │       ├── AdeptView.tsx            # ADEPT framework tabs
│   │       ├── ComponentsGlossary.tsx   # Symbol table
│   │       ├── SettingsModal.tsx
│   │       ├── InputLatexModal.tsx
│   │       └── LibraryModal.tsx
│   └── shared/
│       ├── library.json       # Pre-baked iconic equations
│       ├── palettes.ts        # Okabe-Ito & vibrant color palettes
│       └── types.ts           # TypeScript interfaces
├── test/
│   └── arxiv-test.html        # Local arXiv paper test fixture
├── DESIGN_DOC.md              # Complete technical architecture specification
├── package.json
└── vite.config.ts
```

---

## 📜 License
MIT Open Source License. Designed for learners, researchers, and engineers everywhere.
