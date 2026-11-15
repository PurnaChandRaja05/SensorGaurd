import { useState } from 'react';
import { Lightbulb, ChevronDown, ChevronUp, Compass, Target, X } from 'lucide-react';
import { soundEngine } from '../utils/soundEngine';

export default function MissionHint({ missionNumber, concept, tier1Clue, tier2Strategy }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTier, setActiveTier] = useState(1);

  const toggleOpen = () => {
    soundEngine.playClick();
    setIsOpen(!isOpen);
  };

  const selectTier = (t) => {
    soundEngine.playClick();
    setActiveTier(t);
  };

  return (
    <div className="w-full mb-3">
      <div className="flex items-center justify-between">
        <button
          onClick={toggleOpen}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold tracking-wider transition-all duration-200 cursor-pointer ${
            isOpen
              ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-md shadow-amber-500/10'
              : 'bg-zinc-850 hover:bg-zinc-800 border-zinc-700 hover:border-amber-500/50 text-zinc-300 hover:text-amber-300'
          }`}
          title="Tactical Data Science Hints for this Mission"
        >
          <Lightbulb className={`w-3.5 h-3.5 ${isOpen ? 'text-amber-400' : 'text-zinc-400'}`} />
          <span>NEED A HINT? (TIER 1 / TIER 2)</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
        </button>

        {concept && (
          <span className="hidden sm:inline text-[11px] font-mono text-zinc-500">
            Target Concept: <span className="text-zinc-400">{concept}</span>
          </span>
        )}
      </div>

      {isOpen && (
        <div className="mt-2 p-4 bg-zinc-900/95 border border-amber-500/40 rounded-xl shadow-xl fade-in relative">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-800 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-400 font-bold uppercase tracking-wider">
                MISSION {missionNumber} TACTICAL INTEL
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tier Selection Tabs */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => selectTier(1)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-mono font-bold transition-colors cursor-pointer ${
                activeTier === 1
                  ? 'bg-amber-950/40 border-amber-500/60 text-amber-300'
                  : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>TIER 1: CONCEPTUAL CLUE</span>
            </button>
            <button
              onClick={() => selectTier(2)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-mono font-bold transition-colors cursor-pointer ${
                activeTier === 2
                  ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300'
                  : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              <span>TIER 2: ACTIONABLE STRATEGY</span>
            </button>
          </div>

          {/* Hint Body */}
          <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-lg text-xs font-mono leading-relaxed text-zinc-300">
            {activeTier === 1 ? (
              <div>
                <p className="text-amber-400/90 font-bold mb-1">🔍 What Data Pattern to Observe:</p>
                <p>{tier1Clue}</p>
              </div>
            ) : (
              <div>
                <p className="text-emerald-400/90 font-bold mb-1">🎯 Step-by-Step Tactical Recommendation:</p>
                <p>{tier2Strategy}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

