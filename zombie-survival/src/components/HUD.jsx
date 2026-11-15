import { useGame } from '../context/GameContext';
import {
  Heart,
  Beef,
  Pill,
  Fuel,
  Map,
  BookOpen,
  HelpCircle,
  Volume2,
  VolumeX,
  Music,
} from 'lucide-react';

const stats = [
  { key: 'health', label: 'HEALTH', icon: Heart, color: 'bg-red-500', textColor: 'text-red-400' },
  { key: 'food', label: 'FOOD', icon: Beef, color: 'bg-amber-500', textColor: 'text-amber-400' },
  { key: 'medicine', label: 'MED', icon: Pill, color: 'bg-emerald-500', textColor: 'text-emerald-400' },
  { key: 'fuel', label: 'FUEL', icon: Fuel, color: 'bg-sky-500', textColor: 'text-sky-400' },
];

export default function HUD() {
  const { state, dispatch } = useGame();

  if (state.currentScreen === 'start') return null;

  const feedbackClass =
    state.hudFeedback === 'penalty'
      ? 'animate-hud-shake hud-damage-glow'
      : state.hudFeedback === 'reward'
      ? 'hud-reward-glow'
      : '';

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-40 hud-glow bg-zinc-900/95 border-b border-zinc-700/60 backdrop-blur-md transition-all duration-300 ${feedbackClass}`}
    >
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3 sm:gap-4 flex-wrap">
        {/* Mission indicator */}
        <div className="flex items-center gap-2 mr-1 sm:mr-2">
          <Map className="w-4 h-4 text-amber-400" />
          <span className="text-amber-400 font-bold text-xs sm:text-sm tracking-wider font-mono">
            MISSION {state.currentMission}/5
          </span>
        </div>

        <div className="h-6 w-px bg-zinc-700 hidden sm:block" />

        {/* Resource bars */}
        <div className="flex items-center gap-3 sm:gap-4 flex-1 flex-wrap">
          {stats.map(({ key, label, icon: Icon, color, textColor }) => {
            const value = state[key];
            return (
              <div key={key} className="flex items-center gap-1.5 sm:gap-2 min-w-[115px] sm:min-w-[130px]">
                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${textColor} ${value < 25 ? 'pulse-glow' : ''}`} />
                <span className={`text-[10px] sm:text-xs ${textColor} font-semibold w-7 sm:w-8 font-mono`}>
                  {label}
                </span>
                <div className="w-16 sm:w-20 bg-zinc-800 rounded-full h-2 sm:h-2.5 overflow-hidden">
                  <div
                    className={`stat-bar h-full ${color} ${value < 25 ? 'opacity-80' : ''}`}
                    style={{ width: `${value}%` }}
                  />
                </div>
                <span
                  className={`text-[10px] sm:text-xs font-mono font-bold ${
                    value < 25 ? 'text-red-400 animate-pulse' : 'text-zinc-400'
                  }`}
                >
                  {value}
                </span>
              </div>
            );
          })}
        </div>

        {/* Action buttons: Music + SFX + Manual + Field Guide */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Ambient Music Toggle */}
          <button
            onClick={() => dispatch({ type: 'TOGGLE_MUSIC' })}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-mono font-bold transition-colors cursor-pointer ${
              state.musicEnabled
                ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-400 hover:bg-emerald-900/40'
                : 'bg-zinc-850 border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
            }`}
            title={state.musicEnabled ? 'Music: ON (Click to Mute)' : 'Music: OFF (Click to Play)'}
          >
            <Music className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">MUSIC: {state.musicEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* SFX Audio Toggle */}
          <button
            onClick={() => dispatch({ type: 'TOGGLE_SFX' })}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-mono font-bold transition-colors cursor-pointer ${
              state.sfxEnabled
                ? 'bg-amber-950/40 border-amber-700/50 text-amber-400 hover:bg-amber-900/40'
                : 'bg-zinc-850 border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
            }`}
            title={state.sfxEnabled ? 'SFX: ON (Click to Mute)' : 'SFX: OFF (Click to Unmute)'}
          >
            {state.sfxEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="text-[11px] hidden sm:inline">SFX: {state.sfxEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* How to Play / Operational Manual */}
          <button
            onClick={() => dispatch({ type: 'OPEN_INSTRUCTION_MANUAL' })}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-lg transition-colors cursor-pointer text-xs font-mono font-semibold text-zinc-300 hover:text-amber-300"
            title="How to Play / Survival Manual"
          >
            <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400" />
            <span className="hidden md:inline">MANUAL</span>
          </button>

          {/* Field Manual / Concept Guide */}
          <button
            onClick={() => dispatch({ type: 'TOGGLE_FIELD_MANUAL' })}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-lg transition-colors cursor-pointer text-xs font-mono font-semibold"
            title="Field Manual / Mathematical Concept Hints"
          >
            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
            <span className="text-amber-300 hidden md:inline">FIELD GUIDE</span>
          </button>
        </div>
      </div>
    </div>
  );
}
