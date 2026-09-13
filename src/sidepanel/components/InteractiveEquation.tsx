import React, { useMemo } from 'react';
import { MathComponent, PaletteType } from '../../shared/types';
import { getColor } from '../../shared/palettes';
import { renderLatexSafe, sanitizeLatexChunk } from '../../shared/latex';

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
  const [expandedChunkId, setExpandedChunkId] = React.useState<string | null>(null);
  const [hoveredSubPartId, setHoveredSubPartId] = React.useState<string | null>(null);

  // Pre-render KaTeX chunks safely
  const renderedChunks = useMemo(() => {
    return components.map((comp, idx) => {
      const color = getColor(palette, comp.paletteIndex);
      const html = renderLatexSafe(comp.latexChunk, color.hex);
      return { comp, color, html, index: idx + 1 };
    });
  }, [components, palette]);

  const expandedComp = useMemo(() => {
    return components.find((c) => c.id === expandedChunkId);
  }, [components, expandedChunkId]);

  const expandedColor = useMemo(() => {
    return expandedComp ? getColor(palette, expandedComp.paletteIndex) : null;
  }, [expandedComp, palette]);

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
          const isExpanded = expandedChunkId === comp.id;
          const hasSubBreakdown = Boolean(comp.subBreakdown?.parts?.length);

          return (
            <div
              key={comp.id}
              onClick={() => {
                if (hasSubBreakdown) {
                  setExpandedChunkId((prev) => (prev === comp.id ? null : comp.id));
                }
              }}
              onMouseEnter={() => onHover(comp.id)}
              onMouseLeave={() => onHover(null)}
              className={`relative group cursor-pointer transition-all duration-200 px-3 py-2 rounded-xl border ${
                isHovered || isExpanded
                  ? 'scale-105 shadow-md z-10 border-solid'
                  : 'hover:scale-[1.02] border-dotted hover:border-neutral-800'
              } ${isDimmed ? 'opacity-30 blur-[0.3px]' : 'opacity-100'}`}
              style={{
                backgroundColor: isHovered || isExpanded ? color.bgHex : '#ffffff',
                borderColor: isHovered || isExpanded ? color.borderHex : '#d4d4d8',
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
                className="text-lg md:text-xl font-serif text-center pb-0.5"
                dangerouslySetInnerHTML={{ __html: html }}
              />

              {/* Anatomy Pill for Compound Terms */}
              {hasSubBreakdown && (
                <div
                  className={`absolute -bottom-2.5 right-1 px-1.5 py-0.5 rounded-full text-[8.5px] font-bold tracking-tight transition-all shadow-xs flex items-center gap-0.5 ${
                    isExpanded
                      ? 'bg-black text-white'
                      : 'bg-white border border-dashed border-neutral-400 text-neutral-700 group-hover:border-black group-hover:text-black'
                  }`}
                >
                  <span>{isExpanded ? 'Close' : 'Anatomy'}</span>
                  <span>{isExpanded ? '▴' : '▾'}</span>
                </div>
              )}

              {/* Hover Tooltip Hint (Minimal solid black capsule) */}
              {isHovered && !isExpanded && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-semibold py-1 px-2.5 rounded-full whitespace-nowrap shadow-xl z-20 pointer-events-none">
                  {comp.technicalName}
                  {hasSubBreakdown && <span className="opacity-70 ml-1">· Click to unfold</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* In-Situ Tree Unfold Panel */}
      {expandedComp?.subBreakdown && expandedColor && (
        <div className="mt-4 pt-4 border-t border-dotted border-neutral-300">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: expandedColor.hex }} />
              <span className="text-xs font-bold text-neutral-900 tracking-tight">
                {expandedComp.subBreakdown.label}
              </span>
              <span className="text-[10px] text-neutral-400 font-mono bg-neutral-100 px-1.5 py-0.5 rounded">
                {sanitizeLatexChunk(expandedComp.latexChunk)}
              </span>
            </div>
            <button
              onClick={() => setExpandedChunkId(null)}
              className="text-[11px] font-semibold text-neutral-400 hover:text-black transition-colors"
            >
              ✕ Hide Anatomy
            </button>
          </div>

          {/* Wireframe Tree Nodes */}
          <div className="space-y-1.5 pl-1">
            {expandedComp.subBreakdown.parts.map((part, pIdx, arr) => {
              const isLast = pIdx === arr.length - 1;
              const isSubHovered = hoveredSubPartId === part.id;
              const partColor = getColor(palette, part.paletteIndex ?? (pIdx % 6));
              const renderedSubLatex = renderLatexSafe(part.latexChunk, partColor.hex);

              return (
                <div
                  key={part.id || pIdx}
                  onMouseEnter={() => setHoveredSubPartId(part.id)}
                  onMouseLeave={() => setHoveredSubPartId(null)}
                  className={`flex items-start gap-2.5 p-2 rounded-xl transition-all ${
                    isSubHovered
                      ? 'bg-neutral-100/90 shadow-xs'
                      : 'hover:bg-neutral-50'
                  }`}
                >
                  {/* Wireframe Branch Connector */}
                  <span className="text-neutral-400 font-mono text-xs select-none pt-1">
                    {isLast ? '└──' : '├──'}
                  </span>

                  {/* KaTeX Sub-Symbol */}
                  <span
                    className="min-w-[48px] text-center font-serif text-sm px-2 py-0.5 rounded-lg border border-neutral-200 bg-white shadow-xs"
                    dangerouslySetInnerHTML={{ __html: renderedSubLatex }}
                  />

                  {/* Intuition Phrase & Role */}
                  <div className="flex-grow font-sans min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-neutral-400 text-xs">→</span>
                      <span className="font-bold text-xs" style={{ color: partColor.hex }}>
                        {part.plainPhrase}
                      </span>
                      <span className="text-[11px] text-neutral-500 font-normal">
                        ({part.technicalName})
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-600 mt-0.5">
                      {part.roleIntuition}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* "Why it exists" Insight Callout */}
          {expandedComp.subBreakdown.whyItExists && (
            <div className="mt-3 p-3 bg-neutral-50 rounded-xl border border-dotted border-neutral-300 text-xs text-neutral-700">
              <span className="font-bold text-neutral-900 flex items-center gap-1.5 mb-1">
                <span>💡</span> Why this term exists mathematically:
              </span>
              <p className="leading-relaxed font-sans text-neutral-600 text-[11.5px]">
                {expandedComp.subBreakdown.whyItExists}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
