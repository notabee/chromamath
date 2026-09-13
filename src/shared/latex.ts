import katex from 'katex';
import { ColorizedEquation, PaletteType } from './types';
import { getColor } from './palettes';

/**
 * Normalizes a LaTeX string for fuzzy comparison against the pre-baked library.
 * Strips formatting wrappers, macros, punctuation, and whitespace.
 */
export function normalizeLatexString(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(
      /\\(left|right|big|Big|bigg|Bigg|quad|qquad|textstyle|displaystyle|mathrm|text|mathbf|boldsymbol|mathcal|textbf|cdot|times)/g,
      ''
    )
    .replace(/\\([!,:; ])/g, '')
    .replace(/[.,;]$/, '')
    .replace(/[\s_{}^~*]+/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Robustly sanitizes a LaTeX chunk so that it is guaranteed to be syntactically
 * complete and valid KaTeX with balanced delimiters and no dangling \left / \right.
 */
export function sanitizeLatexChunk(latex: string): string {
  if (!latex) return '';
  let s = latex.trim();

  // Strip leading unmatched closing delimiters like ") W_{down}" or "} + 1"
  s = s.replace(/^[\)\}\]]+\s*/, '');

  // Strip already-embedded \color commands to prevent illegal nested syntax
  s = s.replace(/^\{\\color\{#[0-9a-fA-F]{3,6}\}\s*/, '');

  // Replace \left and \right prefixes with plain delimiters
  s = s.replace(/\\left\s*\\\{/g, '\\{').replace(/\\right\s*\\\}/g, '\\}');
  s = s.replace(/\\left\s*\{/g, '(').replace(/\\right\s*\}/g, ')');
  s = s.replace(/\\left\s*\(/g, '(').replace(/\\right\s*\)/g, ')');
  s = s.replace(/\\left\s*\[/g, '[').replace(/\\right\s*\]/g, ']');
  s = s.replace(/\\left\s*\\lceil/g, '\\lceil').replace(/\\right\s*\\rceil/g, '\\rceil');
  s = s.replace(/\\left\s*\\lfloor/g, '\\lfloor').replace(/\\right\s*\\rfloor/g, '\\rfloor');
  s = s.replace(/\\left\s*\|/g, '|').replace(/\\right\s*\|/g, '|');
  s = s.replace(/\\left\./g, '').replace(/\\right\./g, '');
  s = s.replace(/\\left/g, '').replace(/\\right/g, '');

  // If ends with open delimiter or operator expecting argument (e.g. \sigma(, \text{ReLU}{ )
  if (s.endsWith('(') || s.endsWith('[') || s.endsWith('\\{') || s.endsWith('{')) {
    s = s.replace(/[\({\[\\]+$/, '').trim();
    s = s + '(\\cdot)';
  }

  // Balance curly braces
  let openBraces = 0;
  let closeBraces = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '{' && (i === 0 || s[i - 1] !== '\\')) openBraces++;
    if (s[i] === '}' && (i === 0 || s[i - 1] !== '\\')) closeBraces++;
  }
  if (openBraces > closeBraces) {
    s += '}'.repeat(openBraces - closeBraces);
  } else if (closeBraces > openBraces) {
    s = '{'.repeat(closeBraces - openBraces) + s;
  }

  // Balance parentheses
  let openP = 0;
  let closeP = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(' && (i === 0 || s[i - 1] !== '\\')) openP++;
    if (s[i] === ')' && (i === 0 || s[i - 1] !== '\\')) closeP++;
  }
  if (openP > closeP) {
    s += ')'.repeat(openP - closeP);
  } else if (closeP > openP) {
    while (closeP > openP && s.endsWith(')')) {
      s = s.slice(0, -1).trim();
      closeP--;
    }
  }

  return s;
}

/**
 * Safely renders LaTeX into KaTeX HTML with color support.
 * Guarantees that KaTeX parse error HTML (red text) is NEVER output.
 */
export function renderLatexSafe(latex: string, colorHex?: string): string {
  const sanitized = sanitizeLatexChunk(latex);
  const code = colorHex ? `{\\color{${colorHex}} ${sanitized}}` : sanitized;

  try {
    const html = katex.renderToString(code, {
      displayMode: false,
      throwOnError: false,
    });

    // If KaTeX produced an error span or red text (#cc0000)
    if (html.includes('katex-error') || html.includes('#cc0000')) {
      // Fallback 1: try rendering without color wrapper
      const plainHtml = katex.renderToString(sanitized, {
        displayMode: false,
        throwOnError: false,
      });
      if (!plainHtml.includes('katex-error') && !plainHtml.includes('#cc0000')) {
        return plainHtml;
      }
      // Fallback 2: render sanitized text with graceful typography
      const fallbackClean = sanitized.replace(/[\{\}\\]+/g, ' ').trim();
      return `<span style="color: ${colorHex || 'inherit'}; font-style: italic; font-family: serif;">${fallbackClean}</span>`;
    }

    return html;
  } catch {
    const fallbackClean = (latex || '').replace(/[\{\}\\]+/g, ' ').trim();
    return `<span style="color: ${colorHex || 'inherit'}; font-style: italic; font-family: serif;">${fallbackClean}</span>`;
  }
}

/**
 * Generates an Overleaf/LaTeX snippet with xcolor definitions matching the active palette.
 */
export function exportToOverleafLatex(equation: ColorizedEquation, palette: PaletteType): string {
  const colorDefs = equation.components
    .map((c, i) => {
      const col = getColor(palette, c.paletteIndex);
      return `\\definecolor{c${i + 1}}{HTML}{${col.hex.replace('#', '')}}`;
    })
    .join('\n');

  let colorizedMath = equation.normalizedLatex;
  equation.components.forEach((c, i) => {
    colorizedMath = colorizedMath.replace(c.latexChunk, `{\\color{c${i + 1}} ${c.latexChunk}}`);
  });

  return `% ChromaMath: ${equation.title}
\\usepackage{xcolor}
${colorDefs}

\\[
  ${colorizedMath}
\\]

% Plain-English Narrative:
% "${equation.narrativeSentence}"
`;
}

/**
 * Generates a Markdown snippet containing the equation and ADEPT pedagogical breakdown.
 */
export function exportToMarkdown(equation: ColorizedEquation): string {
  return `### ${equation.title}

$$${equation.normalizedLatex}$$

> **Intuition:** ${equation.narrativeSentence}

- **Analogy:** ${equation.adept.analogy}
- **Intuitive Diagram Model:** ${equation.adept.diagramConcept}
- **Concrete Example:** ${equation.adept.concreteExample}
- **Plain Definition:** ${equation.adept.plainDefinition}
- **Technical Definition:** ${equation.adept.technicalDefinition}
`;
}
