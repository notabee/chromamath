import React from 'react';
import { MathComponent, PaletteType } from '../../shared/types';
import { getColor } from '../../shared/palettes';
import { renderLatexSafe } from '../../shared/latex';

interface ComponentsGlossaryProps {
  components: MathComponent[];
  palette: PaletteType;
  showNumberedBadges: boolean;
  hoveredChunkId: string | null;
  onHover: (id: string | null) => void;
}

export const ComponentsGlossary: React.FC<ComponentsGlossaryProps> = ({
  components,
  palette,
  showNumberedBadges,
  hoveredChunkId,
  onHover,
}) => {
  return (
    <div className="bg-white border-2 border-dotted border-neutral-300 rounded-2xl p-5 shadow-sm">
      <div className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase mb-3">
        Glossary
      </div>

      <div className="space-y-2">
        {components.map((comp, idx) => {
          const color = getColor(palette, comp.paletteIndex);
          const isHovered = hoveredChunkId === comp.id;
          const isDimmed = hoveredChunkId !== null && !isHovered;
          const renderedLatex = renderLatexSafe(comp.latexChunk);

          return (
            <div
              key={comp.id}
              onMouseEnter={() => onHover(comp.id)}
              onMouseLeave={() => onHover(null)}
              className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center gap-3 ${
                isHovered
                  ? 'bg-white border-solid shadow-sm scale-[1.01]'
                  : 'bg-neutral-50/70 border-dotted border-neutral-300 hover:border-neutral-700'
              } ${isDimmed ? 'opacity-35' : 'opacity-100'}`}
              style={{
                borderColor: isHovered ? color.borderHex : undefined,
              }}
            >
              {/* Color indicator / Number badge */}
              <div className="flex-shrink-0">
                {showNumberedBadges ? (
                  <span
                    className="w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: color.hex }}
                  >
                    {idx + 1}
                  </span>
                ) : (
                  <span
                    className="w-3 h-3 rounded-full block shadow-sm"
                    style={{ backgroundColor: color.hex }}
                  />
                )}
              </div>

              {/* Symbol */}
              <div className="flex-shrink-0 min-w-[54px] font-serif text-sm text-neutral-900">
                <span dangerouslySetInnerHTML={{ __html: renderedLatex }} />
              </div>

              {/* Details */}
              <div className="flex-grow min-w-0">
                <div className="text-xs font-bold" style={{ color: color.hex }}>
                  {comp.plainPhrase}
                </div>
                <div className="text-[11px] text-neutral-500 truncate font-medium">
                  {comp.technicalName}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
