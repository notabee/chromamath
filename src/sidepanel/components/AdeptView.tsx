import React, { useState } from 'react';
import { Lightbulb, Compass, Beaker, GraduationCap } from 'lucide-react';
import { AdeptBreakdown } from '../../shared/types';

interface AdeptViewProps {
  adept: AdeptBreakdown;
}

type TabType = 'analogy' | 'diagram' | 'example' | 'technical';

export const AdeptView: React.FC<AdeptViewProps> = ({ adept }) => {
  const [activeTab, setActiveTab] = useState<TabType>('analogy');

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'analogy', label: 'Analogy', icon: <Lightbulb className="w-3.5 h-3.5" /> },
    { id: 'diagram', label: 'Intuition', icon: <Compass className="w-3.5 h-3.5" /> },
    { id: 'example', label: 'Example', icon: <Beaker className="w-3.5 h-3.5" /> },
    { id: 'technical', label: 'Technical', icon: <GraduationCap className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="bg-white border-2 border-dotted border-neutral-300 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 border-b border-dotted border-neutral-300 pb-3">
        <span className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase">
          ADEPT Breakdown
        </span>

        {/* Minimal Pill Segment Bar */}
        <div className="flex gap-1 bg-neutral-100 p-1 rounded-full border border-neutral-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-black text-white shadow-sm'
                  : 'text-neutral-500 hover:text-black'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="text-sm text-neutral-700 leading-relaxed min-h-[60px]">
        {activeTab === 'analogy' && (
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              Everyday Analogy
            </div>
            <p className="text-neutral-600 italic bg-amber-50/50 border border-amber-200/60 p-3 rounded-xl">
              {adept.analogy}
            </p>
          </div>
        )}

        {activeTab === 'diagram' && (
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-blue-500" />
              Visual & Geometric Mental Model
            </div>
            <p className="text-neutral-600 bg-blue-50/50 border border-blue-200/60 p-3 rounded-xl">
              {adept.diagramConcept}
            </p>
          </div>
        )}

        {activeTab === 'example' && (
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
              <Beaker className="w-3.5 h-3.5 text-emerald-600" />
              Concrete Scenario
            </div>
            <p className="text-neutral-600 bg-emerald-50/50 border border-emerald-200/60 p-3 rounded-xl">
              {adept.concreteExample}
            </p>
          </div>
        )}

        {activeTab === 'technical' && (
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
              Formal Mathematical Definition
            </div>
            <p className="text-neutral-800 font-mono text-xs leading-normal bg-neutral-50 p-3 rounded-xl border border-dotted border-neutral-300">
              {adept.technicalDefinition}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
