import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { soundEngine } from '../utils/soundEngine';
import {
  X,
  BookOpen,
  Heart,
  Beef,
  Pill,
  Fuel,
  Skull,
  Shield,
  Sliders,
  TrendingUp,
  MapPin,
  Trophy,
  Activity,
  Layers,
  ChevronRight,
} from 'lucide-react';

export default function InstructionManual() {
  const { state, dispatch } = useGame();
  const [activeTab, setActiveTab] = useState('rules');

  if (!state.instructionManualOpen) return null;

  const handleTabChange = (tab) => {
    soundEngine.playClick();
    setActiveTab(tab);
  };

  const handleClose = () => {
    soundEngine.playClick();
    dispatch({ type: 'CLOSE_INSTRUCTION_MANUAL' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-3xl bg-zinc-900 border border-amber-500/40 rounded-xl shadow-2xl shadow-amber-500/10 overflow-hidden flex flex-col max-h-[90vh] fade-in">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <BookOpen className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-amber-400 font-mono tracking-wider uppercase">
                OPERATIONAL MANUAL // SURVIVE USING DATA
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                Standard Survival Operating Procedures &amp; Tactical Guidance
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            title="Close Manual"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/60 px-5 pt-3 gap-2 overflow-x-auto">
          {[
            { id: 'rules', label: '1. Objective & Resources', icon: Shield },
            { id: 'tools', label: '2. Data Tools Guide', icon: Sliders },
            { id: 'scoring', label: '3. Evacuation Ranks', icon: Trophy },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleTabChange(id)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold rounded-t-lg transition-all cursor-pointer whitespace-nowrap border-b-2 ${
                activeTab === id
                  ? 'border-amber-400 text-amber-300 bg-zinc-800/80'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-zinc-300 font-mono leading-relaxed">
          {/* TAB 1: RULES & RESOURCES */}
          {activeTab === 'rules' && (
            <div className="space-y-6 fade-in">
              <div>
                <h3 className="text-amber-400 font-bold text-base mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Core Mission Objective
                </h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  You are leading a squad of survivors through an active zombie containment zone toward the Highway 7
                  Evacuation Centre. The city is overrun, communications are fragmented, and resources are scarce.
                  Every survival decision must be backed by <span className="text-amber-300 font-bold">solid data science methods</span>.
                  Careless guesses deplete supplies and cost lives.
                </p>
              </div>

              {/* Resources breakdown */}
              <div>
                <h4 className="text-xs uppercase text-zinc-500 font-bold tracking-wider mb-3">
                  The Four Vital Resources (0 - 100%)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-zinc-800/60 border border-red-900/40 rounded-lg flex items-start gap-3">
                    <Heart className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-red-400 font-bold text-xs">HEALTH (100%)</span>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        Squad vitality. Drained by zombie ambushes (M1), asymptomatic breaches (M2), outbreak spread (M4), or convoy stalls (M5).
                        <span className="text-red-300 block font-semibold mt-0.5">Hits 0% = Instant OVERRUN Game Over!</span>
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-zinc-800/60 border border-amber-900/40 rounded-lg flex items-start gap-3">
                    <Beef className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-amber-400 font-bold text-xs">FOOD (100)</span>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        Rations and camp morale. Lost when false positive classifications turn away healthy workers or when rationing fails.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-zinc-800/60 border border-emerald-900/40 rounded-lg flex items-start gap-3">
                    <Pill className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-emerald-400 font-bold text-xs">MEDICINE (100)</span>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        First aid &amp; experimental antiviral doses. Lost when treating infected squad members or wasting precious doses on healthy false alarms.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-zinc-800/60 border border-sky-900/40 rounded-lg flex items-start gap-3">
                    <Fuel className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-sky-400 font-bold text-xs">FUEL (100)</span>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        Diesel for scout drones, generator camps, and the convoy truck. Lost during long retrieval routes (M3) and excessive convoy travel (M5).
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Game Over Condition */}
              <div className="p-4 bg-red-950/30 border border-red-800/40 rounded-lg">
                <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase mb-1">
                  <Skull className="w-4 h-4" /> Game Over Conditions
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  A tactical <span className="text-red-400 font-bold">"OVERRUN"</span> screen is triggered if your
                  <span className="text-red-400 font-bold"> Health hits 0%</span> OR if <span className="text-amber-400 font-bold">Food, Medicine, and Fuel are all exhausted</span>.
                  You can retry the current mission with emergency field supplies or restart the campaign from the beginning.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: DATA TOOLS GUIDE */}
          {activeTab === 'tools' && (
            <div className="space-y-6 fade-in">
              <div>
                <h3 className="text-amber-400 font-bold text-base mb-1 flex items-center gap-2">
                  <Sliders className="w-4 h-4" /> Interacting with Tactical Data Tools
                </h3>
                <p className="text-zinc-400 text-xs">
                  Each mission features an interactive visualization designed to teach a core IDSE concept:
                </p>
              </div>

              <div className="space-y-4">
                {/* M1 */}
                <div className="p-4 bg-zinc-800/50 border border-zinc-700/60 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-amber-300 font-bold text-xs uppercase">
                      Mission 1: Sampling &amp; Sampling Bias
                    </span>
                    <span className="text-[10px] bg-zinc-700 px-2 py-0.5 rounded text-zinc-300">Fog-of-War Grid</span>
                  </div>
                  <ul className="text-xs text-zinc-400 space-y-1.5 list-disc list-inside">
                    <li><strong className="text-zinc-200">Manual Drone Scans:</strong> Click any of the 50 fogged sectors to spend drone battery (max 10 scans).</li>
                    <li><strong className="text-zinc-200">Sampling Presets:</strong> Click <span className="text-amber-400">Convenience Sample</span> (picks outer safe alleys only — creates severe underestimation bias) or <span className="text-emerald-400">Stratified Random</span> (samples proportionally across all 5 districts).</li>
                    <li><strong className="text-zinc-200">Decision:</strong> Enter your total zombie estimate and click <span className="text-amber-400 font-semibold">LOCK IN ESTIMATE</span>.</li>
                  </ul>
                </div>

                {/* M2 */}
                <div className="p-4 bg-zinc-800/50 border border-zinc-700/60 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-amber-300 font-bold text-xs uppercase">
                      Mission 2: Classification &amp; Confusion Matrix
                    </span>
                    <span className="text-[10px] bg-zinc-700 px-2 py-0.5 rounded text-zinc-300">Scatter Plot &amp; Boundaries</span>
                  </div>
                  <ul className="text-xs text-zinc-400 space-y-1.5 list-disc list-inside">
                    <li><strong className="text-zinc-200">Threshold Sliders:</strong> Drag the <span className="text-amber-400">Temperature</span> and <span className="text-amber-400">Heart Rate</span> sliders to move the decision boundaries on the 2D scatter plot.</li>
                    <li><strong className="text-zinc-200">Live Confusion Matrix:</strong> Watch TP, FP, TN, FN, Precision, and Recall recompute instantly as you shift boundaries.</li>
                    <li><strong className="text-zinc-200">Decision:</strong> Click <span className="text-amber-400 font-semibold">APPLY CLASSIFIER</span> to screen the arriving wave of 12 survivors.</li>
                  </ul>
                </div>

                {/* M3 */}
                <div className="p-4 bg-zinc-800/50 border border-zinc-700/60 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-amber-300 font-bold text-xs uppercase">
                      Mission 3: K-Means Clustering
                    </span>
                    <span className="text-[10px] bg-zinc-700 px-2 py-0.5 rounded text-zinc-300">2D Coordinate Map</span>
                  </div>
                  <ul className="text-xs text-zinc-400 space-y-1.5 list-disc list-inside">
                    <li><strong className="text-zinc-200">Placing Centroids:</strong> Click the tactical map to place 3 forward collection camps (or click <span className="text-amber-400">Auto-Place 3 Centroids</span>). You can also drag centroids to reposition them.</li>
                    <li><strong className="text-zinc-200">Stepping the Algorithm:</strong> Click <span className="text-amber-400">Step K-Means</span> to reassign points and recompute centroids, or <span className="text-amber-400">Run to Convergence</span>.</li>
                    <li><strong className="text-zinc-200">WCSS &amp; Fuel:</strong> Total travel distance (Within-Cluster Sum of Squares) directly determines fuel consumption!</li>
                  </ul>
                </div>

                {/* M4 */}
                <div className="p-4 bg-zinc-800/50 border border-zinc-700/60 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-amber-300 font-bold text-xs uppercase">
                      Mission 4: Bayes' Theorem &amp; Probability Trees
                    </span>
                    <span className="text-[10px] bg-zinc-700 px-2 py-0.5 rounded text-zinc-300">Interactive SVG Tree</span>
                  </div>
                  <ul className="text-xs text-zinc-400 space-y-1.5 list-disc list-inside">
                    <li><strong className="text-zinc-200">Prior Prevalence:</strong> Click zones (Downtown 45%, Suburbs 20%, Rural 8%) or adjust sliders to see the base-rate fallacy in action.</li>
                    <li><strong className="text-zinc-200">Posterior Probability:</strong> The SVG tree computes <span className="text-amber-400">P(Infected | Test +)</span> in real-time. Notice how low prevalence makes positive tests mostly false alarms!</li>
                    <li><strong className="text-zinc-200">Medicine Allocation:</strong> Select up to 4 squad members with the highest true posterior risk and click <span className="text-red-400 font-semibold">ADMINISTER MEDICINE</span>.</li>
                  </ul>
                </div>

                {/* M5 */}
                <div className="p-4 bg-zinc-800/50 border border-zinc-700/60 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-amber-300 font-bold text-xs uppercase">
                      Mission 5: Linear Regression &amp; Prediction
                    </span>
                    <span className="text-[10px] bg-zinc-700 px-2 py-0.5 rounded text-zinc-300">Telemetry Scatter &amp; Line</span>
                  </div>
                  <ul className="text-xs text-zinc-400 space-y-1.5 list-disc list-inside">
                    <li><strong className="text-zinc-200">Outlier Removal:</strong> Click anomaly data points in the toggle list to disable corrupted sensor telemetry readings.</li>
                    <li><strong className="text-zinc-200">Fitting the Model:</strong> Adjust Slope (m) and Intercept (b) or click <span className="text-amber-400 font-semibold">⚡ AUTO-FIT (LEAST SQUARES)</span> while watching MSE and R² update.</li>
                    <li><strong className="text-zinc-200">Convoy Dashboard:</strong> Set cargo weight and highway speed, check predicted fuel vs. tank capacity, and click <span className="text-emerald-400 font-semibold">LAUNCH CONVOY</span>!</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SCORING & RANKS */}
          {activeTab === 'scoring' && (
            <div className="space-y-6 fade-in">
              <div>
                <h3 className="text-amber-400 font-bold text-base mb-1 flex items-center gap-2">
                  <Trophy className="w-4 h-4" /> Performance Scoring &amp; Evacuation Ranks
                </h3>
                <p className="text-zinc-400 text-xs">
                  Upon arriving at the Highway 7 Evacuation Centre, your total mission record is audited by military command.
                </p>
              </div>

              {/* Formula */}
              <div className="p-4 bg-zinc-800/60 border border-amber-500/30 rounded-lg">
                <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Evaluation Formula</span>
                <p className="text-sm font-bold text-amber-300 mt-1 font-mono">
                  Final Rating = (Average Mission Score × 60%) + (Average Remaining Supplies × 40%)
                </p>
                <p className="text-[11px] text-zinc-400 mt-2">
                  Accurate data analysis yields high mission scores (up to 100 per mission), while sound decision-making conserves your team's Health, Food, Medicine, and Fuel.
                </p>
              </div>

              {/* Ranks list */}
              <div className="space-y-2.5">
                {[
                  {
                    rank: 'S',
                    title: 'LEGENDARY SURVIVOR (Rating ≥ 85%)',
                    desc: 'Flawless data science instincts. Minimal resource depletion and optimal model precision.',
                    color: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
                  },
                  {
                    rank: 'A',
                    title: 'ELITE ANALYST (Rating 70% – 84%)',
                    desc: 'Strong decision-making under intense pressure. Maintained high squad survival and resource reserves.',
                    color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
                  },
                  {
                    rank: 'B',
                    title: 'FIELD OPERATIVE (Rating 55% – 69%)',
                    desc: 'Solid operational survival. Escaped with moderate resource burn and minor casualties.',
                    color: 'text-sky-400 border-sky-500/40 bg-sky-500/10',
                  },
                  {
                    rank: 'C',
                    title: 'BATTERED SURVIVOR (Rating 40% – 54%)',
                    desc: 'Reached the checkpoint gates, but took heavy casualties from biased or inaccurate models.',
                    color: 'text-orange-400 border-orange-500/40 bg-orange-500/10',
                  },
                  {
                    rank: 'D',
                    title: 'LUCKY ESCAPEE (Rating < 40%)',
                    desc: 'Barely limped into the evacuation camp. Escaped by pure chance with empty fuel tanks.',
                    color: 'text-red-400 border-red-500/40 bg-red-500/10',
                  },
                ].map((tier) => (
                  <div key={tier.rank} className={`p-3.5 border rounded-lg ${tier.color} flex items-start gap-3`}>
                    <div className="w-8 h-8 rounded-full bg-zinc-950 flex items-center justify-center font-black text-lg shrink-0">
                      {tier.rank}
                    </div>
                    <div>
                      <div className="font-bold text-xs">{tier.title}</div>
                      <div className="text-[11px] text-zinc-300 mt-0.5">{tier.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
          <span className="text-[11px] text-zinc-500 font-mono">
            Tactical HUD Tip: You can also open the Field Manual anytime for live concept formulas!
          </span>
          <button onClick={handleClose} className="btn-primary text-xs py-2 px-4 cursor-pointer font-mono">
            DISMISS MANUAL
          </button>
        </div>
      </div>
    </div>
  );
}

