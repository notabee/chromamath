# Contributing to ChromaMath 🎨📐

Thank you for your interest in contributing to **ChromaMath**! ChromaMath is an open-source Chrome extension dedicated to making dense mathematical formulas in academic papers intuitive, accessible, and visual through color-coordinated cognitive maps and the ADEPT framework.

We welcome contributions of all kinds: new pre-baked iconic equations, scraper enhancements, accessibility features, UI refinements, bug reports, and documentation improvements.

---

## 🛠️ Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Google Chrome**: (or any Chromium-based browser with Manifest V3 support)

### Local Development Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/notabee/chromamath.git
   cd chromamath
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the extension:**
   ```bash
   npm run build
   ```
   This compiles TypeScript, bundles React and Tailwind CSS, and outputs the ready-to-load extension into the `dist/` directory.

4. **Load into Chrome:**
   - Open Google Chrome and visit `chrome://extensions/`.
   - Enable **Developer mode** (toggle in the top-right corner).
   - Click **Load unpacked** in the top-left corner.
   - Select the `dist/` directory from this repository.
   - ChromaMath is now loaded! Pin it to your Chrome toolbar for easy access.

---

## 🧪 Testing Locally

You don't need to be online or browsing live arXiv papers to test changes. A local test fixture is included:

1. In Chrome, open the local test file:
   ```text
   file:///path-to-repo/test/arxiv-test.html
   ```
2. You will see sample mathematical equations rendered with real arXiv MathML.
3. Hover over any formula to verify the floating `✨ Explain` wand appears.
4. Click `✨ Explain` to verify the Side Panel deconstructs the equation properly.

> [!TIP]
> After modifying source files, run `npm run build` and click the **Reload (↻)** button on the ChromaMath card in `chrome://extensions/`.

---

## 💡 High-Impact Ways to Contribute

### 1. Add Pre-Baked Iconic Formulas (`src/shared/library.json`)
ChromaMath includes an offline library of iconic equations that deconstruct in **< 1ms with 0 API calls**. Adding foundational equations from landmark papers is one of the easiest and highest-impact contributions!
- Open `src/shared/library.json`.
- Add a new formula following the schema:
  - `id`: unique kebab-case slug (e.g. `adam-optimizer`, `diffusion-elbo`).
  - `title`: readable name.
  - `paper`: paper title or citation.
  - `latex`: valid LaTeX equation string.
  - `colorizedLatex`: LaTeX string with `\textcolor{#hex}{...}` annotations matching your chunks.
  - `chunks`: array of decomposed tokens (latex, color, label, explanation, badge).
  - `narrative`: plain-English explanation array matching the token colors.
  - `adept`: Analogy, Diagram Concept, Example, Plain Definition, Technical Definition.

### 2. Improve Scrapers for arXiv HTML (`src/content/arxiv-detector.ts`)
- Enhance MathML and TeX extraction for new arXiv HTML layouts and `ar5iv.org` edge cases.
- Improve positioning and animation smoothness of the floating hover wand.

### 3. Accessibility & Palettes (`src/shared/palettes.ts`)
- ChromaMath supports CVD-safe (Color Vision Deficiency) palettes such as Okabe-Ito, numbered badges, and underline patterns.
- Suggestions or additions for improved readability for low-vision or neurodivergent learners are warmly welcomed.

### 4. Side Panel UI & UX (`src/sidepanel/`)
- Components are built using React 18, Tailwind CSS, and KaTeX.
- Ideas for interactive graph/tree visualizers, formula history management, or export options (SVG/Anki) are great feature areas.

---

## 📋 Pull Request Process

1. **Create a topic branch:**
   ```bash
   git checkout -b feat/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```
2. **Make your changes** and ensure the project builds without errors:
   ```bash
   npm run build
   ```
3. **Commit your changes with clear commit messages:**
   ```bash
   git commit -m "feat: add Bellman optimality equation to offline library"
   ```
4. **Push to your fork and open a Pull Request:**
   - Provide a concise description of the change.
   - Include before/after screenshots or GIFs for UI/visual changes.
   - Reference any relevant issues.

---

## 📜 Code Style Guidelines
- **TypeScript**: Strict types; avoid `any`. Define shared interfaces in `src/shared/types.ts`.
- **Styling**: Tailwind CSS classes. Keep styles modular and avoid inline raw styles where possible.
- **Component Design**: Functional React components with hooks. Keep components decoupled and clean.
- **Chrome APIs**: Ensure code complies with Chrome Manifest V3 service worker lifecycle and sandbox limitations.

---

## 📄 License
By contributing to ChromaMath, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
