import { ColorizedEquation } from '../shared/types';
import libraryEquations from '../shared/library.json';
import { normalizeLatexString, sanitizeLatexChunk } from '../shared/latex';
import { GEMINI_CONFIG, TIMEOUTS } from '../shared/constants';

/**
 * Checks local library first for zero-latency instant match.
 */
export function findInLibrary(queryLatex: string): ColorizedEquation | null {
  if (!queryLatex || typeof queryLatex !== 'string') return null;
  const normQuery = normalizeLatexString(queryLatex);
  if (!normQuery || normQuery.length < 5) return null;

  for (const eq of libraryEquations) {
    const normEq = normalizeLatexString(eq.normalizedLatex);
    if (!normEq) continue;
    if (normQuery === normEq) {
      return eq as ColorizedEquation;
    }
    if (normQuery.length >= 8 && normEq.length >= 8) {
      if (normQuery.includes(normEq) || normEq.includes(normQuery)) {
        return eq as ColorizedEquation;
      }
    }
  }
  return null;
}

export interface DeconstructInput {
  latex?: string;
  imageBase64?: string;
}

export interface IEquationDeconstructor {
  deconstruct(input: DeconstructInput, apiKey: string): Promise<ColorizedEquation>;
}

const SYSTEM_INSTRUCTION = `
You are an expert mathematical pedagogue in the style of BetterExplained (Kalid Azad) and the ADEPT framework.
Your task is to deconstruct a mathematical equation into an intuitive, color-coordinated cognitive map.

Rules:
1. Chunk the equation into 4 to 6 semantic conceptual units (group operators and indices that form a conceptual operation together, e.g. \\frac{1}{N}\\sum_{n=0}^{N-1} is "average a bunch of points along that path", or \\lim_{n\\to\\infty} is "as fast as possible").
2. Write a single, elegant, fluent Plain-English sentence where each phrase corresponds 1-to-1 with a math chunk.
3. Every math chunk must have an exact corresponding phrase in the sentence.
4. Provide the full ADEPT breakdown:
   - Analogy: Everyday real-world metaphor (smoothie, snowball, library index).
   - Diagram Concept: Spatial / geometric mental picture.
   - Concrete Example: A real numerical or physical scenario.
   - Plain Definition: Plain-language summary for laypersons.
   - Technical Definition: Mathematically rigorous formal definition.
5. If any chunk contains compound internal sub-symbols (e.g. an exponential term like e^{i 2\\pi k n / N}, a fraction like QK^T / \\sqrt{d_k}, or a complex boundary), provide an optional subBreakdown with its constituent parts, their intuitive mechanical roles, and a 1-sentence 'whyItExists' explanation.
6. CRITICAL LATEX SYNTAX RULE: Every 'latexChunk' MUST be syntactically valid and standalone KaTeX with strictly balanced delimiters. NEVER produce dangling unmatched \\left, \\right, (, or {. If an operator or function applies to an argument (e.g. \\sigma(...) or \\text{ReLU}(...)), either include the complete argument inside the chunk OR write the isolated operator with an argument placeholder like \\sigma(\\cdot) or \\text{ReLU}(\\cdot). NEVER output incomplete fragments like "\\sigma \\left{" or ") W_{down}".
`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING", description: "Name of the equation or concept" },
    normalizedLatex: { type: "STRING", description: "Standard cleaned LaTeX equation without colors" },
    narrativeSentence: { type: "STRING", description: "Grammatically fluent plain-English narrative sentence" },
    components: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING", description: "Unique chunk id e.g. c1, c2, c3" },
          latexChunk: { type: "STRING", description: "The specific LaTeX fragment e.g. X_k or Q K^T" },
          plainPhrase: { type: "STRING", description: "The corresponding phrase in narrativeSentence" },
          technicalName: { type: "STRING", description: "Formal mathematical term for this part" },
          roleIntuition: { type: "STRING", description: "Intuitive meaning in plain words" },
          paletteIndex: { type: "INTEGER", description: "Palette color index from 0 to 5" },
          subBreakdown: {
            type: "OBJECT",
            description: "Optional internal variable deconstruction for compound terms",
            properties: {
              label: { type: "STRING", description: "e.g. Anatomy of the Winding Factor" },
              whyItExists: { type: "STRING", description: "Why this term exists mathematically" },
              parts: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    latexChunk: { type: "STRING" },
                    plainPhrase: { type: "STRING" },
                    technicalName: { type: "STRING" },
                    roleIntuition: { type: "STRING" }
                  },
                  required: ["latexChunk", "plainPhrase", "technicalName", "roleIntuition"]
                }
              }
            },
            required: ["label", "parts", "whyItExists"]
          }
        },
        required: ["id", "latexChunk", "plainPhrase", "technicalName", "roleIntuition", "paletteIndex"]
      }
    },
    adept: {
      type: "OBJECT",
      properties: {
        analogy: { type: "STRING" },
        diagramConcept: { type: "STRING" },
        concreteExample: { type: "STRING" },
        plainDefinition: { type: "STRING" },
        technicalDefinition: { type: "STRING" }
      },
      required: ["analogy", "diagramConcept", "concreteExample", "plainDefinition", "technicalDefinition"]
    }
  },
  required: ["title", "normalizedLatex", "narrativeSentence", "components", "adept"]
};

/**
 * Enterprise-grade Gemini Deconstruction Service implementing IEquationDeconstructor.
 * Handles model discovery, structured output enforcement, schema retries, and AST sanitization.
 */
export class GeminiDeconstructor implements IEquationDeconstructor {
  private modelDiscoveryCache: { keySig: string; apiVersion: string; models: string[] } | null = null;

  /**
   * Robustly parses JSON from LLM responses, stripping code fences if present.
   */
  private safeJsonParse(raw: string): any {
    if (!raw || typeof raw !== 'string') {
      throw new Error('Empty response received from Gemini.');
    }
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    return JSON.parse(cleaned);
  }

  /**
   * Dynamically queries Google's ModelService.ListModels to obtain the exact list
   * of models supported for generateContent with the user's API key.
   */
  private async discoverSupportedModels(apiKey: string): Promise<{ apiVersion: string; models: string[] }> {
    const keySig = apiKey.slice(-8);
    if (this.modelDiscoveryCache && this.modelDiscoveryCache.keySig === keySig && this.modelDiscoveryCache.models.length > 0) {
      return this.modelDiscoveryCache;
    }

    const endpoints = ['v1beta', 'v1'];
    for (const ver of endpoints) {
      try {
        const url = `https://generativelanguage.googleapis.com/${ver}/models?key=${apiKey}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUTS.DISCOVERY_PROBE_MS) });
        if (res.ok) {
          const data = await res.json();
          if (data.models && Array.isArray(data.models)) {
            const usable = data.models
              .filter((m: any) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
              .map((m: any) => m.name.replace(/^models\//, ''));

            if (usable.length > 0) {
              usable.sort((a: string, b: string) => {
                const aFlash = a.includes('flash') ? 1 : 0;
                const bFlash = b.includes('flash') ? 1 : 0;
                if (aFlash !== bFlash) return bFlash - aFlash;
                return b.localeCompare(a, undefined, { numeric: true });
              });

              this.modelDiscoveryCache = { keySig, apiVersion: ver, models: usable };
              return this.modelDiscoveryCache;
            }
          }
        }
      } catch {
        // Proceed to next endpoint probe
      }
    }

    return {
      apiVersion: 'v1beta',
      models: [...GEMINI_CONFIG.FALLBACK_MODELS]
    };
  }

  private formatParsedEquation(parsed: any): ColorizedEquation {
    return {
      id: `eq-${Date.now()}`,
      title: parsed.title || 'Mathematical Deconstruction',
      normalizedLatex: parsed.normalizedLatex,
      colorizedLatex: parsed.normalizedLatex,
      narrativeSentence: parsed.narrativeSentence,
      components: (parsed.components || []).map((c: any, idx: number) => ({
        ...c,
        latexChunk: sanitizeLatexChunk(c.latexChunk),
        paletteIndex: c.paletteIndex ?? (idx % 6),
        subBreakdown: c.subBreakdown ? {
          ...c.subBreakdown,
          parts: (c.subBreakdown.parts || []).map((p: any, pIdx: number) => ({
            ...p,
            id: `sub-${idx}-${pIdx}`,
            latexChunk: sanitizeLatexChunk(p.latexChunk),
            paletteIndex: p.paletteIndex ?? ((idx + pIdx + 1) % 6)
          }))
        } : undefined
      })),
      adept: parsed.adept || {
        analogy: '',
        diagramConcept: '',
        concreteExample: '',
        plainDefinition: '',
        technicalDefinition: ''
      },
      source: 'ai',
      timestamp: Date.now()
    };
  }

  public async deconstruct(input: DeconstructInput, apiKey: string): Promise<ColorizedEquation> {
    if (!apiKey || !apiKey.trim()) {
      throw new Error("No Gemini API Key configured. Please enter your free Google AI Studio API key in Settings.");
    }

    const contents: any[] = [];
    const parts: any[] = [];

    if (input.imageBase64) {
      const cleanBase64 = input.imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: cleanBase64
        }
      });
      parts.push({
        text: "Perform high-accuracy mathematical OCR on this formula image, then deconstruct it into the colorized ADEPT specification according to the system rules."
      });
    } else if (input.latex) {
      parts.push({
        text: `Deconstruct this mathematical equation into the colorized ADEPT specification:\n\n$$\n${input.latex}\n$$\n\nFollow all pedagogical and semantic chunking rules strictly.`
      });
    } else {
      throw new Error("No equation input provided for deconstruction.");
    }

    contents.push({ role: "user", parts });

    const { apiVersion, models } = await this.discoverSupportedModels(apiKey.trim());
    const modelsToTry = models.length > 0 ? models : GEMINI_CONFIG.FALLBACK_MODELS;

    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey.trim()}`;

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            systemInstruction: {
              parts: [{ text: SYSTEM_INSTRUCTION }]
            },
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: RESPONSE_SCHEMA,
              temperature: GEMINI_CONFIG.TEMPERATURE
            }
          }),
          signal: AbortSignal.timeout(TIMEOUTS.GEMINI_FETCH_MS)
        });

        if (response.status === 404 || response.status === 503 || response.status === 429) {
          const errorBody = await response.text();
          lastError = new Error(`Gemini API Error (${response.status}): ${errorBody}`);
          continue;
        }

        if (response.status === 400) {
          const errorBody = await response.text();
          if (errorBody.includes('schema') || errorBody.includes('responseSchema')) {
            const fallbackResp = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents,
                systemInstruction: {
                  parts: [{ text: `${SYSTEM_INSTRUCTION}\nReturn pure JSON matching the ADEPT specification.` }]
                },
                generationConfig: {
                  responseMimeType: "application/json",
                  temperature: GEMINI_CONFIG.TEMPERATURE
                }
              }),
              signal: AbortSignal.timeout(TIMEOUTS.GEMINI_FETCH_MS)
            });
            if (fallbackResp.ok) {
              const fbData = await fallbackResp.json();
              const rawJson = fbData.candidates?.[0]?.content?.parts?.[0]?.text;
              if (rawJson) {
                const parsed = this.safeJsonParse(rawJson);
                return this.formatParsedEquation(parsed);
              }
            }
          }
          throw new Error(`Gemini API Error (400): ${errorBody}`);
        }

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Gemini API Error (${response.status}): ${errorBody}`);
        }

        const data = await response.json();
        const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawJson) {
          throw new Error("Gemini returned an empty response.");
        }

        const parsed = this.safeJsonParse(rawJson);

        if (this.modelDiscoveryCache) {
          this.modelDiscoveryCache.models = [model, ...this.modelDiscoveryCache.models.filter(m => m !== model)];
        }

        return this.formatParsedEquation(parsed);
      } catch (err: any) {
        lastError = err;
        if (model !== modelsToTry[modelsToTry.length - 1]) {
          continue;
        }
        throw err;
      }
    }

    throw lastError || new Error("Failed to deconstruct equation with Gemini.");
  }
}

export const geminiDeconstructor = new GeminiDeconstructor();

/**
 * Backward-compatible helper for procedural callers.
 */
export function deconstructWithGemini(
  input: DeconstructInput,
  apiKey: string
): Promise<ColorizedEquation> {
  return geminiDeconstructor.deconstruct(input, apiKey);
}
