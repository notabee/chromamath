import { ColorizedEquation, MathComponent, AdeptBreakdown } from '../shared/types';
import libraryEquations from '../shared/library.json';

const PRIMARY_MODEL = 'gemini-3.6-flash';
const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];

/**
 * Normalizes a LaTeX string for fuzzy comparison against pre-baked library.
 */
function normalizeLatexString(str: string): string {
  return str
    .replace(/\\(left|right|big|Big|bigg|Bigg|quad|qquad|textstyle|displaystyle)/g, '')
    .replace(/\\([!,:; ])/g, '')
    .replace(/[.,;]$/, '')
    .replace(/\s+/g, '')
    .trim();
}

/**
 * Checks local library first for zero-latency instant match.
 */
export function findInLibrary(queryLatex: string): ColorizedEquation | null {
  const normQuery = normalizeLatexString(queryLatex);
  for (const eq of libraryEquations) {
    const normEq = normalizeLatexString(eq.normalizedLatex);
    if (normQuery.includes(normEq) || normEq.includes(normQuery)) {
      return eq as ColorizedEquation;
    }
  }
  return null;
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
          paletteIndex: { type: "INTEGER", description: "Palette color index from 0 to 5" }
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
 * Calls Gemini 2.0 Flash with either raw LaTeX or an image crop.
 */
export async function deconstructWithGemini(
  input: { latex?: string; imageBase64?: string },
  apiKey: string
): Promise<ColorizedEquation> {
  if (!apiKey) {
    throw new Error("No Gemini API Key configured. Please enter your free Google AI Studio API key in Settings.");
  }

  const contents: any[] = [];
  const parts: any[] = [];

  if (input.imageBase64) {
    // Strip data URL header if present
    const cleanBase64 = input.imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: cleanBase64
      }
    });
    parts.push({
      text: "Perform OCR on this mathematical equation, transcribe it to LaTeX, and deconstruct it into intuitive semantic chunks and plain-English narrative."
    });
  } else if (input.latex) {
    parts.push({
      text: `Deconstruct this LaTeX equation into intuitive semantic chunks and plain-English narrative:\n\n$$${input.latex}$$`
    });
  } else {
    throw new Error("Either latex or imageBase64 must be provided.");
  }

  contents.push({ role: "user", parts });

  const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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
            temperature: 0.2
          }
        })
      });

      if (response.status === 404) {
        const errorBody = await response.text();
        console.warn(`Model ${model} returned 404, attempting fallback:`, errorBody);
        lastError = new Error(`Gemini API Error (404): ${errorBody}`);
        continue;
      }

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gemini API Error (${response.status}): ${errorBody}`);
      }

      const data = await response.json();
      const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawJson) {
        throw new Error("Gemini returned empty response.");
      }

      const parsed = JSON.parse(rawJson);

      return {
        id: `eq-${Date.now()}`,
        title: parsed.title,
        normalizedLatex: parsed.normalizedLatex,
        colorizedLatex: parsed.normalizedLatex, // will be rendered dynamically with interactive spans
        narrativeSentence: parsed.narrativeSentence,
        components: parsed.components.map((c: any, idx: number) => ({
          ...c,
          paletteIndex: c.paletteIndex ?? (idx % 6)
        })),
        adept: parsed.adept,
        source: 'ai',
        timestamp: Date.now()
      };
    } catch (err: any) {
      if (err.message?.includes('(404)') && model !== modelsToTry[modelsToTry.length - 1]) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error("Failed to deconstruct equation with Gemini.");
}
