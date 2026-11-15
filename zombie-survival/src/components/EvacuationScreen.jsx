import { useState } from 'react';
import { useGame } from '../context/GameContext';
import {
  Shield,
  Star,
  Heart,
  Beef,
  Pill,
  Fuel,
  Trophy,
  RotateCcw,
  Copy,
  Check,
  Play,
  Award,
  Sparkles,
  AlertTriangle,
  Skull,
  Crosshair,
  TrendingUp,
} from 'lucide-react';

const GRADE_TIERS = [
  {
    grade: 'S',
    bracket: '90–100%',
    minScore: 90,
    label: 'Apex Data Survivor — Fully Protected from Zombies',
    desc: 'Safehouse fortified, zero breaches, and maximum supplies saved. Your data modeling was flawless.',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/50',
    bgColor: 'bg-amber-950/30',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: Sparkles,
  },
  {
    grade: 'A',
    bracket: '75–89%',
    minScore: 75,
    label: 'Tactical Analyst — Safe Behind Perimeter',
    desc: 'Minor skirmishes, strong convoy arrival, well-supplied. You made disciplined, data-backed decisions.',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/50',
    bgColor: 'bg-emerald-950/30',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    icon: Award,
  },
  {
    grade: 'B',
    bracket: '60–74%',
    minScore: 60,
    label: 'Field Survivor — Made It Through Bruised',
    desc: 'Moderate resource drain, survived with careful rationing. Some biases slipped past, but you recovered.',
    color: 'text-sky-400',
    borderColor: 'border-sky-500/50',
    bgColor: 'bg-sky-950/30',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    icon: Shield,
  },
  {
    grade: 'C',
    bracket: '40–59%',
    minScore: 40,
    label: 'Scraped By — Narrow Escape',
    desc: 'Heavy losses and close calls, barely reached the gates. Flawed thresholds and outliers took a heavy toll.',
    color: 'text-orange-400',
    borderColor: 'border-orange-500/50',
    bgColor: 'bg-orange-950/30',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    icon: AlertTriangle,
  },
  {
    grade: 'D',
    bracket: '< 40%',
    minScore: 0,
    label: 'Critical Condition — Overrun Risk',
    desc: 'Severe data miscalculations left the convoy exposed. You stumbled to safety by pure blind luck.',
    color: 'text-red-400',
    borderColor: 'border-red-500/50',
    bgColor: 'bg-red-950/30',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
    icon: Skull,
  },
];

export default function EvacuationScreen() {
  const { state, dispatch } = useGame();
  const [copied, setCopied] = useState(false);

  const avgMissionAccuracy = state.missionResults.length > 0
    ? Math.round(state.missionResults.reduce((s, r) => s + r.score, 0) / state.missionResults.length)
    : 0;

  const totalResources = state.health + state.food + state.medicine + state.fuel;
  const avgResourceConservation = Math.round(totalResources / 4);

  // Dynamic Composite Survival Score: 60% Data Accuracy + 40% Supplies Conserved
  const finalCompositeScore = Math.min(100, Math.max(0, Math.round(avgMissionAccuracy * 0.6 + avgResourceConservation * 0.4)));

  const currentTier = GRADE_TIERS.find((t) => finalCompositeScore >= t.minScore) || GRADE_TIERS[GRADE_TIERS.length - 1];

  const missionNames = [
    'The Safe Zone Recon (Sampling & Bias)',
    'Quarantine Checkpoint (Classification & Confusion Matrix)',
    'Supply Drop Triangulation (K-Means Clustering)',
    'The Antidote Trial (Bayes Theorem & Base-Rate)',
    'Convoy Escape (Linear Regression & Outliers)',
  ];

  const handleCopyReport = () => {
    const report = [
      '=================================================================',
      '         ZOMBIE SURVIVAL: OFFICIAL MISSION DEBRIEF REPORT         ',
      '=================================================================',
      `OVERALL FINAL SCORE: ${finalCompositeScore}/100`,
      `SURVIVAL RANK: [GRADE ${currentTier.grade}] - ${currentTier.label}`,
      `EVALUATION: ${currentTier.desc}`,
      '',
      '--- PERFORMANCE COMPOSITION ---',
      `• Mission Data Science Accuracy: ${avgMissionAccuracy}/100 (60% weight)`,
      `• Survival Supplies Conserved:   ${avgResourceConservation}% (40% weight)`,
      '',
      '--- REMAINING SURVIVAL CACHE ---',
      `• Health:   ${state.health}%`,
      `• Food:     ${state.food} units`,
      `• Medicine: ${state.medicine} units`,
      `• Fuel:     ${state.fuel} units`,
      '',
      '--- INDIVIDUAL MISSION BREAKDOWN ---',
      ...state.missionResults.map((r, i) =>
        `[Mission ${r.mission}] ${missionNames[i] || 'Mission ' + r.mission}\n  Score: ${r.score}/100 | ${r.summary}`
      ),
      '=================================================================',
    ].join('\n');

    navigator.clipboard?.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="max-w-4xl w-full fade-in space-y-6">
        {/* Header */}
        <div className="text-center pt-2">
          <div className="mb-3 flex justify-center">
            <div className="relative">
              <Shield className="w-16 h-16 text-emerald-400" />
              <div className="absolute -inset-4 bg-emerald-400/20 rounded-full blur-xl animate-pulse" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-emerald-400 tracking-tight font-mono mb-2">
            EVACUATION CENTRE REACHED
          </h1>
          <p className="text-zinc-300 text-sm sm:text-base font-mono">
            Outbreak perimeter breached. Your data decisions dictated who lived and died.
          </p>
        </div>

        {/* Big Earned Grade & Survival Title Banner */}
        <div className={`panel p-6 border-2 ${currentTier.borderColor} ${currentTier.bgColor} text-center relative overflow-hidden`}>
          <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-white/5 rounded-full blur-2xl" />

          <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest mb-1">
            FINAL COMPOSITE SURVIVOR RATING
          </p>
          <div className="flex items-center justify-center gap-3 my-2">
            <span className={`text-6xl sm:text-7xl font-black font-mono ${currentTier.color} drop-shadow-lg`}>
              {currentTier.grade}
            </span>
            <div className="text-left">
              <div className="text-xs font-mono text-zinc-400">COMPOSITE SCORE</div>
              <div className={`text-2xl sm:text-3xl font-black font-mono ${currentTier.color}`}>
                {finalCompositeScore} / 100
              </div>
            </div>
          </div>

          <h2 className={`text-lg sm:text-xl font-bold font-mono tracking-wide ${currentTier.color} mb-2`}>
            {currentTier.label}
          </h2>
          <p className="text-zinc-300 text-sm max-w-xl mx-auto font-mono leading-relaxed">
            {currentTier.desc}
          </p>

          {/* Scoring Composition Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto mt-4 pt-4 border-t border-zinc-800 text-xs font-mono">
            <div className="p-2.5 bg-zinc-900/80 rounded border border-zinc-700/60 flex items-center justify-between">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-amber-400" /> Data Science Accuracy (60%):
              </span>
              <span className="text-amber-400 font-bold">{avgMissionAccuracy}/100</span>
            </div>
            <div className="p-2.5 bg-zinc-900/80 rounded border border-zinc-700/60 flex items-center justify-between">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Supplies Conserved (40%):
              </span>
              <span className="text-emerald-400 font-bold">{avgResourceConservation}%</span>
            </div>
          </div>
        </div>

        {/* Resources Remaining Cache */}
        <div className="panel p-5">
          <p className="text-xs text-zinc-400 font-mono uppercase tracking-wider mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            RESOURCES DELIVERED TO EVACUATION SAFE-ZONE
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Health', value: state.health, icon: Heart, color: 'text-red-400', barColor: 'bg-red-500' },
              { label: 'Food', value: state.food, icon: Beef, color: 'text-amber-400', barColor: 'bg-amber-500' },
              { label: 'Medicine', value: state.medicine, icon: Pill, color: 'text-emerald-400', barColor: 'bg-emerald-500' },
              { label: 'Fuel', value: state.fuel, icon: Fuel, color: 'text-sky-400', barColor: 'bg-sky-500' },
            ].map(({ label, value, icon: Icon, color, barColor }) => (
              <div key={label} className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-lg text-center font-mono">
                <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
                <div className={`text-xl font-bold ${color}`}>{value}%</div>
                <div className="text-[11px] text-zinc-400 uppercase mb-2">{label}</div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full ${barColor}`} style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mission Breakdown */}
        <div className="panel p-5">
          <p className="text-xs text-zinc-400 font-mono uppercase tracking-wider mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            INDIVIDUAL MISSION ACCURACY BREAKDOWN
          </p>
          <div className="space-y-2.5 font-mono">
            {state.missionResults.map((r, i) => (
              <div key={i} className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-start sm:items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 sm:mt-0 shrink-0 ${r.score >= 80 ? 'bg-emerald-400' : r.score >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} />
                  <div>
                    <p className="text-sm text-zinc-200 font-bold">
                      Mission {r.mission}: {missionNames[i] || 'Mission ' + r.mission}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">{r.summary}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 bg-zinc-950 px-2.5 py-1 rounded border border-zinc-800">
                  <Star className={`w-3.5 h-3.5 ${r.score >= 80 ? 'text-amber-400' : 'text-zinc-600'}`} />
                  <span className={`text-sm font-bold ${r.score >= 80 ? 'text-amber-400' : r.score >= 50 ? 'text-zinc-300' : 'text-red-400'}`}>
                    {r.score}/100
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Complete Grade Tier Legend Table ───────────────────────── */}
        <div className="panel p-5 border border-zinc-700/60 font-mono">
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            GRADE TIER LEGEND & SURVIVAL OUTCOMES
          </h3>
          <p className="text-xs text-zinc-400 mb-4">
            Survival ranks reflect both theoretical data science rigor and practical resource conservation:
          </p>

          <div className="space-y-2">
            {GRADE_TIERS.map((tier) => {
              const isCurrent = tier.grade === currentTier.grade;
              return (
                <div
                  key={tier.grade}
                  className={`p-3 rounded-lg border transition-all ${
                    isCurrent
                      ? `bg-zinc-900 border-2 ${tier.borderColor} shadow-md`
                      : 'bg-zinc-900/40 border-zinc-800/80 opacity-70'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-black border ${tier.badgeColor}`}>
                        RANK {tier.grade} ({tier.bracket})
                      </span>
                      <span className={`text-sm font-bold ${tier.color}`}>
                        {tier.label}
                      </span>
                    </div>
                    {isCurrent && (
                      <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40 uppercase self-start sm:self-auto">
                        ★ YOUR FINAL RANK
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 pl-1">
                    {tier.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleCopyReport}
            className="btn-secondary w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-6 text-xs font-mono font-bold tracking-wider cursor-pointer text-amber-300"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'DEBRIEF COPIED TO CLIPBOARD!' : 'COPY SURVIVAL DEBRIEF'}
          </button>

          <button
            onClick={() => dispatch({ type: 'RESTART_GAME' })}
            className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-6 text-xs font-mono font-bold tracking-wider cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            RESTART FULL CAMPAIGN
          </button>
        </div>

        {/* Practice Mission Sandbox Selector */}
        <div className="panel p-4 text-center">
          <p className="text-xs font-mono text-zinc-400 mb-2">
            🔬 REPLAY / PRACTICE SPECIFIC MISSIONS:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((mNum) => (
              <button
                key={mNum}
                onClick={() => {
                  window.__GAME_DEBUG__?.setMission(mNum, 'mission-briefing');
                }}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-amber-500 rounded text-xs font-mono text-zinc-300 hover:text-amber-300 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Play className="w-3 h-3 text-amber-400" />
                Mission {mNum}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
