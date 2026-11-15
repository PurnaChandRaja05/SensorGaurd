import { useGame } from '../context/GameContext';
import { Biohazard, Crosshair, BarChart3, Skull, BookOpen, Play } from 'lucide-react';

export default function StartScreen() {
  const { dispatch } = useGame();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background grid effect */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              'linear-gradient(rgba(245,158,11,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.3) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-2xl fade-in">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <Biohazard className="w-20 h-20 text-amber-500 pulse-glow" />
            <div className="absolute -inset-4 bg-amber-500/10 rounded-full blur-xl" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-black text-amber-400 tracking-tight mb-2">
          ZOMBIE SURVIVAL
        </h1>
        <p className="text-lg md:text-xl text-zinc-400 font-semibold tracking-widest mb-8 font-mono">
          SURVIVE USING DATA
        </p>

        {/* Tagline */}
        <p className="text-zinc-500 text-sm md:text-base mb-10 leading-relaxed max-w-lg mx-auto font-mono">
          The dead have risen. Supply lines are severed. Your only weapons are logic, probability, and data.
          Complete 5 tactical missions using data science to reach the Evacuation Centre alive.
        </p>

        {/* Mission preview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10 text-left font-mono">
          {[
            { icon: Crosshair, label: 'Recon & Sampling' },
            { icon: BarChart3, label: 'Classification & Clustering' },
            { icon: Skull, label: 'Probability & Regression' },
          ].map(({ icon: Icon, label }, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 bg-zinc-800/50 border border-zinc-700/40 rounded-lg">
              <Icon className="w-5 h-5 text-amber-500 shrink-0" />
              <span className="text-zinc-300 text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>

        {/* Action buttons: Start Game & How to Play */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => dispatch({ type: 'START_GAME' })}
            className="btn-primary text-base sm:text-lg px-8 py-3.5 tracking-wider flex items-center justify-center gap-2.5 w-full sm:w-auto font-mono shadow-lg shadow-amber-600/30"
          >
            <Play className="w-5 h-5 fill-current" />
            BEGIN SURVIVAL
          </button>

          <button
            onClick={() => dispatch({ type: 'OPEN_INSTRUCTION_MANUAL' })}
            className="btn-secondary text-base sm:text-lg px-6 py-3.5 tracking-wider flex items-center justify-center gap-2.5 w-full sm:w-auto font-mono border border-zinc-600 hover:border-amber-500/60 hover:text-amber-300"
          >
            <BookOpen className="w-5 h-5 text-amber-400" />
            HOW TO PLAY / MANUAL
          </button>
        </div>

        <p className="mt-8 text-xs text-zinc-600 font-mono">
          5 Missions &middot; Interactive Data Challenges &middot; No Multiple Choice &middot; Synthesized Web Audio
        </p>
      </div>
    </div>
  );
}
