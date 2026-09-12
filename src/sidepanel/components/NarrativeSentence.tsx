import React from 'react';
import { MathComponent, PaletteType } from '../../shared/types';
import { getColor } from '../../shared/palettes';

interface NarrativeSentenceProps {
  sentence: string;
  components: MathComponent[];
  palette: PaletteType;
  showNumberedBadges: boolean;
  hoveredChunkId: string | null;
  onHover: (id: string | null) => void;
}

interface TextSegment {
  text: string;
  component?: MathComponent;
  index?: number;
}

export const NarrativeSentence: React.FC<NarrativeSentenceProps> = ({
  sentence,
  components,
  palette,
  showNumberedBadges,
  hoveredChunkId,
  onHover,
}) => {
  // Split the sentence into plain text and colored phrases
  const segments = React.useMemo(() => {
    let result: TextSegment[] = [{ text: sentence }];

    components.forEach((comp, compIdx) => {
      const phrase = comp.plainPhrase;
      if (!phrase) return;

      const nextResult: TextSegment[] = [];

      result.forEach((seg) => {
        if (seg.component) {
          nextResult.push(seg);
          return;
        }

        const lowerSeg = seg.text.toLowerCase();
        const lowerPhrase = phrase.toLowerCase();
        const matchIdx = lowerSeg.indexOf(lowerPhrase);

        if (matchIdx === -1) {
          nextResult.push(seg);
        } else {
          // Slice before
          if (matchIdx > 0) {
            nextResult.push({ text: seg.text.substring(0, matchIdx) });
          }
          // The matched phrase
          nextResult.push({
            text: seg.text.substring(matchIdx, matchIdx + phrase.length),
            component: comp,
            index: compIdx + 1,
          });
          // Slice after
          if (matchIdx + phrase.length < seg.text.length) {
            nextResult.push({
              text: seg.text.substring(matchIdx + phrase.length),
            });
          }
        }
      });

      result = nextResult;
    });

    return result;
  }, [sentence, components]);

  return (
    <div className="bg-white border-2 border-dotted border-neutral-300 rounded-2xl p-5 shadow-sm">
      <div className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase mb-2">
        Narrative
      </div>

      <p className="text-base sm:text-lg leading-relaxed text-neutral-800">
        {segments.map((seg, idx) => {
          if (!seg.component) {
            return (
              <span key={idx} className="text-neutral-600">
                {seg.text}
              </span>
            );
          }

          const comp = seg.component;
          const color = getColor(palette, comp.paletteIndex);
          const isHovered = hoveredChunkId === comp.id;
          const isDimmed = hoveredChunkId !== null && !isHovered;

          return (
            <span
              key={idx}
              onMouseEnter={() => onHover(comp.id)}
              onMouseLeave={() => onHover(null)}
              className={`inline-block px-1.5 py-0.5 my-0.5 mx-0.5 rounded-lg cursor-pointer transition-all duration-200 font-semibold ${
                isHovered
                  ? 'scale-[1.03] shadow-sm'
                  : 'hover:scale-[1.01]'
              } ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
              style={{
                color: color.hex,
                backgroundColor: isHovered ? color.bgHex : `${color.hex}10`,
                borderBottom: `2px ${color.underlineStyle} ${color.borderHex}`,
              }}
            >
              {showNumberedBadges && (
                <sup
                  className="mr-1 w-3.5 h-3.5 text-[8.5px] font-bold rounded-full text-white inline-flex items-center justify-center"
                  style={{ backgroundColor: color.hex }}
                >
                  {seg.index}
                </sup>
              )}
              {seg.text}
            </span>
          );
        })}
      </p>
    </div>
  );
};
