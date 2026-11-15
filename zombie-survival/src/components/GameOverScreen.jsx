import { useGame } from '../context/GameContext';
import { Skull, RotateCcw, Home } from 'lucide-react';

export default function GameOverScreen() {
  const { state, dispatch } = useGame();

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-16">
      <div className="max-w-lg w-full text-center fade-in">
        {/* Skull icon */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <Skull className="w-24 h-24 text-red-500 pulse-glow" />
            <div className="absolute -inset-6 bg-red-500/10 rounded-full blur-2xl" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-black text-red-500 tracking-tight mb-3">
          OVERRUN
        </h1>
        <p className="text-zinc-400 text-lg mb-2">
          Your position has been compromised.
        </p>

        {/* Status at death */}
        <div className="panel p-4 mb-8 mt-6">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Status at time of loss</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between px-3 py-2 bg-zinc-800 rounded">
              <span className="text-zinc-400">Health</span>
              <span className={state.health <= 0 ? 'text-red-400 font-bold' : 'text-zinc-300'}>{state.health}%</span>
            </div>
            <div className="flex justify-between px-3 py-2 bg-zinc-800 rounded">
              <span className="text-zinc-400">Food</span>
              <span className={state.food <= 0 ? 'text-red-400 font-bold' : 'text-zinc-300'}>{state.food}</span>
            </div>
            <div className="flex justify-between px-3 py-2 bg-zinc-800 rounded">
              <span className="text-zinc-400">Medicine</span>
              <span className={state.medicine <= 0 ? 'text-red-400 font-bold' : 'text-zinc-300'}>{state.medicine}</span>
            </div>
            <div className="flex justify-between px-3 py-2 bg-zinc-800 rounded">
              <span className="text-zinc-400">Fuel</span>
              <span className={state.fuel <= 0 ? 'text-red-400 font-bold' : 'text-zinc-300'}>{state.fuel}</span>
            </div>
          </div>
          <p className="text-xs text-zinc-600 mt-3">
            Mission {state.currentMission} of 5 — failed
          </p>
        </div>

        {/* Reason */}
        <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
          {state.health <= 0
            ? 'Your injuries were too severe. The horde overwhelmed your defenses before medical aid could arrive.'
            : 'Critical supplies depleted. Without food, medicine, or fuel, your team could not sustain operations.'}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => dispatch({ type: 'RETRY_MISSION' })}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            RETRY MISSION {state.currentMission}
          </button>
          <button
            onClick={() => dispatch({ type: 'RESTART_GAME' })}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            RESTART FROM BEGINNING
          </button>
        </div>
      </div>
    </div>
  );
}

