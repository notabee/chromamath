import React, { useMemo } from 'react';
import katex from 'katex';
import { MathComponent, PaletteType } from '../../shared/types';
import { getColor } from '../../shared/palettes';

interface InteractiveEquationProps {
  latex: string;
  components: MathComponent[];
  palette: PaletteType;
  showNumberedBadges: boolean;
  hoveredChunkId: string | null;
  onHover: (id: string | null) => void;
}

export const InteractiveEquation: React.FC<InteractiveEquationProps> = ({
  latex,
  components,
  palette,
  showNumberedBadges,
  hoveredChunkId,
  onHover,
}) => {
  // Pre-render KaTeX chunks
  const renderedChunks = useMemo(() => {
    return components.map((comp, idx) => {
      const color = getColor(palette, comp.paletteIndex);
      try {
        const html = katex.renderToString(`{\\color{${color.hex}} ${comp.latexChunk}}`, {
          displayMode: false,
          throwOnError: false,
        });
        return { comp, color, html, index: idx + 1 };
      } catch {
        return { comp, color, html: comp.latexChunk, index: idx + 1 };
      }
    });
  }, [components, palette]);

  // Full rendered formula for preview or fallback
  const fullHtml = useMemo(() => {
    try {
      return katex.renderToString(latex, { displayMode: true, throwOnError: false });
    } catch {
      return latex;
    }
  }, [latex]);

  return (
    <div className="bg-white border-2 border-dotted border-neutral-300 rounded-2xl p-5 shadow-sm relative">
      <div className="absolute top-3 right-4 text-[10px] font-bold tracking-widest text-neutral-400 uppercase">
        Formula
      </div>

      {/* Interactive Semantic Chunks View */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 py-4 select-none min-h-[90px]">
        {renderedChunks.map(({ comp, color, html, index }) => {
          const isHovered = hoveredChunkId === comp.id;
          const isDimmed = hoveredChunkId !== null && !isHovered;

          return (
            <div
              key={comp.id}
              onMouseEnter={() => onHover(comp.id)}
              onMouseLeave={() => onHover(null)}
              className={`relative group cursor-pointer transition-all duration-200 px-3 py-2 rounded-xl border ${
                isHovered
                  ? 'scale-105 shadow-md z-10 border-solid'
                  : 'hover:scale-[1.02] border-dotted hover:border-neutral-800'
              } ${isDimmed ? 'opacity-30 blur-[0.3px]' : 'opacity-100'}`}
              style={{
                backgroundColor: isHovered ? color.bgHex : '#ffffff',
                borderColor: isHovered ? color.borderHex : '#d4d4d8',
              }}
            >
              {/* Optional Numbered Badge */}
              {showNumberedBadges && (
                <span
                  className="absolute -top-2 -left-1.5 w-4 h-4 text-[9px] font-bold rounded-full text-white flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: color.hex }}
                >
                  {index}
                </span>
              )}

              {/* KaTeX Rendered Chunk */}
              <div
                className="text-lg md:text-xl font-serif text-center"
                dangerouslySetInnerHTML={{ __html: html }}
              />

              {/* Hover Tooltip Hint (Minimal solid black capsule) */}
              {isHovered && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-semibold py-1 px-2.5 rounded-full whitespace-nowrap shadow-xl z-20 pointer-events-none">
                  {comp.technicalName}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
