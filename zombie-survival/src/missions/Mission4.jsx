import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { soundEngine } from '../utils/soundEngine';
import DialogueModal from '../components/DialogueModal';
import MissionHint from '../components/MissionHint';
import {
  Syringe,
  FlaskConical,
  ShieldAlert,
  Lock,
  CheckCircle,
  Skull,
  AlertTriangle,
  Users,
  Activity,
  MapPin,
  TestTubes,
  CircleDot,
} from 'lucide-react';

// ─── Seeded RNG ─────────────────────────────────────────────
function seededRNG(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── Zone Definitions ───────────────────────────────────────
const ZONES = [
  { id: 'downtown', name: 'Downtown', prevalence: 0.45, color: '#ef4444', bgClass: 'bg-red-900/30 border-red-600/40', tag: 'text-red-400' },
  { id: 'suburbs', name: 'Suburbs', prevalence: 0.20, color: '#f59e0b', bgClass: 'bg-amber-900/20 border-amber-600/40', tag: 'text-amber-400' },
  { id: 'rural', name: 'Rural Outpost', prevalence: 0.08, color: '#22c55e', bgClass: 'bg-emerald-900/20 border-emerald-600/40', tag: 'text-emerald-400' },
];

// ─── Squad Generation ───────────────────────────────────────
function generateSquad(seed = 2049) {
  const rng = seededRNG(seed);
  const names = ['Reyes', 'Chen', 'Okafor', 'Vasquez', 'Novak', 'Tanaka', 'Mbeki', 'Harlow'];
  const zoneAssignments = [0, 0, 1, 1, 1, 2, 2, 2]; // indices into ZONES: 2 downtown, 3 suburbs, 3 rural

  // Shuffle zone assignments deterministically
  for (let i = zoneAssignments.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [zoneAssignments[i], zoneAssignments[j]] = [zoneAssignments[j], zoneAssignments[i]];
  }

  const defaultSensitivity = 0.90;
  const defaultFalsePositiveRate = 0.08;

  const members = names.map((name, i) => {
    const zone = ZONES[zoneAssignments[i]];
    // True infection based on zone prevalence (with RNG)
    const isInfected = rng() < zone.prevalence + (zoneAssignments[i] === 0 ? 0.15 : 0.10);
    // Test result: depends on true infection status
    const testPositive = isInfected
      ? rng() < defaultSensitivity
      : rng() < defaultFalsePositiveRate;

    return {
      id: i,
      name,
      zone,
      isInfected,
      testPositive,
    };
  });

  // Ensure 3-4 truly infected for interesting gameplay
  const infectedCount = members.filter(m => m.isInfected).length;
  if (infectedCount < 3) {
    // Force some non-infected to become infected (prefer downtown/suburbs)
    const healthy = members.filter(m => !m.isInfected).sort((a, b) => {
      const zoneOrder = { downtown: 0, suburbs: 1, rural: 2 };
      return (zoneOrder[a.zone.id] || 0) - (zoneOrder[b.zone.id] || 0);
    });
    let need = 3 - infectedCount;
    for (const m of healthy) {
      if (need <= 0) break;
      m.isInfected = true;
      m.testPositive = rng() < defaultSensitivity; // re-roll test
      need--;
    }
  } else if (infectedCount > 4) {
    // Reduce to 4
    const infected = members.filter(m => m.isInfected).sort((a, b) => {
      const zoneOrder = { downtown: 2, suburbs: 1, rural: 0 };
      return (zoneOrder[a.zone.id] || 0) - (zoneOrder[b.zone.id] || 0);
    });
    let excess = infectedCount - 4;
    for (const m of infected) {
      if (excess <= 0) break;
      m.isInfected = false;
      m.testPositive = rng() < defaultFalsePositiveRate; // re-roll as healthy
      excess--;
    }
  }

  return members;
}

// ─── Bayes Computation ──────────────────────────────────────
function computeBayes(prior, sensitivity, falsePositiveRate) {
  const pHealthy = 1 - prior;
  const pPosGivenInfected = sensitivity;
  const pPosGivenHealthy = falsePositiveRate;
  const pPos = pPosGivenInfected * prior + pPosGivenHealthy * pHealthy;
  const pNeg = 1 - pPos;

  const posteriorPositive = pPos > 0 ? (pPosGivenInfected * prior) / pPos : 0;
  const posteriorNegative = pNeg > 0 ? ((1 - pPosGivenInfected) * prior) / pNeg : 0;

  // Joint probabilities for tree leaves
  const jointInfectedPos = pPosGivenInfected * prior;
  const jointInfectedNeg = (1 - pPosGivenInfected) * prior;
  const jointHealthyPos = pPosGivenHealthy * pHealthy;
  const jointHealthyNeg = (1 - pPosGivenHealthy) * pHealthy;

  return {
    prior,
    pHealthy,
    sensitivity,
    falsePositiveRate,
    pPos,
    pNeg,
    posteriorPositive,
    posteriorNegative,
    jointInfectedPos,
    jointInfectedNeg,
    jointHealthyPos,
    jointHealthyNeg,
  };
}

// ─── Probability Tree SVG ────────────────────────────────────
function ProbabilityTree({ bayes }) {
  const w = 700;
  const h = 340;
  const { prior, pHealthy, sensitivity, falsePositiveRate, jointInfectedPos, jointInfectedNeg, jointHealthyPos, jointHealthyNeg } = bayes;

  // Node positions
  const root = { x: 60, y: h / 2 };
  const infNode = { x: 260, y: 90 };
  const healthyNode = { x: 260, y: h - 90 };
  const infPos = { x: 520, y: 40 };
  const infNeg = { x: 520, y: 140 };
  const healthyPos = { x: 520, y: 200 };
  const healthyNeg = { x: 520, y: 300 };

  const pct = (v) => (v * 100).toFixed(1) + '%';

  function Branch({ from, to, label, prob, color }) {
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const offsetX = Math.sin(angle) * 14;
    const offsetY = -Math.cos(angle) * 14;
    return (
      <g>
        <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={color} strokeWidth={2} strokeOpacity={0.7} />
        <rect x={midX + offsetX - 36} y={midY + offsetY - 10} width={72} height={20} rx={4} fill="#18181b" stroke={color} strokeWidth={1} strokeOpacity={0.5} />
        <text x={midX + offsetX} y={midY + offsetY + 4} textAnchor="middle" fill={color} fontSize={11} fontFamily="monospace" fontWeight="bold">
          {label} {pct(prob)}
        </text>
      </g>
    );
  }

  function TreeNode({ pos, label, sublabel, color, jointProb }) {
    return (
      <g>
        <circle cx={pos.x} cy={pos.y} r={6} fill={color} opacity={0.8} />
        <text x={pos.x + 12} y={pos.y - 6} fill={color} fontSize={12} fontFamily="monospace" fontWeight="bold">{label}</text>
        {sublabel && <text x={pos.x + 12} y={pos.y + 10} fill="#a1a1aa" fontSize={10} fontFamily="monospace">{sublabel}</text>}
        {jointProb !== undefined && (
          <g>
            <rect x={pos.x + 12} y={pos.y + 16} width={92} height={18} rx={3} fill="#27272a" stroke={color} strokeWidth={1} strokeOpacity={0.4} />
            <text x={pos.x + 58} y={pos.y + 29} textAnchor="middle" fill={color} fontSize={10} fontFamily="monospace" fontWeight="bold">
              P = {pct(jointProb)}
            </text>
          </g>
        )}
      </g>
    );
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: 340 }}>
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Branches */}
      <Branch from={root} to={infNode} label="P(I)" prob={prior} color="#f59e0b" />
      <Branch from={root} to={healthyNode} label="P(H)" prob={pHealthy} color="#22c55e" />
      <Branch from={infNode} to={infPos} label="P(+|I)" prob={sensitivity} color="#ef4444" />
      <Branch from={infNode} to={infNeg} label="P(−|I)" prob={1 - sensitivity} color="#71717a" />
      <Branch from={healthyNode} to={healthyPos} label="P(+|H)" prob={falsePositiveRate} color="#ef4444" />
      <Branch from={healthyNode} to={healthyNeg} label="P(−|H)" prob={1 - falsePositiveRate} color="#22c55e" />

      {/* Root */}
      <circle cx={root.x} cy={root.y} r={10} fill="#f59e0b" opacity={0.9} filter="url(#glow)" />
      <text x={root.x} y={root.y - 18} textAnchor="middle" fill="#f59e0b" fontSize={12} fontFamily="monospace" fontWeight="bold">SQUAD</text>
      <text x={root.x} y={root.y - 6} textAnchor="middle" fill="#f59e0b" fontSize={10} fontFamily="monospace">MEMBER</text>

      {/* Intermediate nodes */}
      <TreeNode pos={infNode} label="Infected" color="#f59e0b" />
      <TreeNode pos={healthyNode} label="Healthy" color="#22c55e" />

      {/* Leaf nodes */}
      <TreeNode pos={infPos} label="Test +" sublabel="True Positive" color="#ef4444" jointProb={jointInfectedPos} />
      <TreeNode pos={infNeg} label="Test −" sublabel="False Negative" color="#71717a" jointProb={jointInfectedNeg} />
      <TreeNode pos={healthyPos} label="Test +" sublabel="False Positive" color="#ef4444" jointProb={jointHealthyPos} />
      <TreeNode pos={healthyNeg} label="Test −" sublabel="True Negative" color="#22c55e" jointProb={jointHealthyNeg} />
    </svg>
  );
}

// ─── Slider Component ────────────────────────────────────────
function ParamSlider({ label, value, min, max, step, onChange, disabled, color = '#f59e0b' }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400">{label}</span>
        <span className="text-sm font-bold tabular-nums" style={{ color, fontFamily: 'monospace' }}>
          {(value * 100).toFixed(0)}%
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          soundEngine.playTick();
          onChange(parseFloat(e.target.value));
        }}
        disabled={disabled}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: `linear-gradient(to right, ${color}66 0%, ${color} ${((value - min) / (max - min)) * 100}%, #3f3f46 ${((value - min) / (max - min)) * 100}%, #3f3f46 100%)`,
          accentColor: color,
        }}
      />
      <div className="flex justify-between text-[9px] text-zinc-600 tabular-nums">
        <span>{(min * 100).toFixed(0)}%</span>
        <span>{(max * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

// ─── Main Mission Component ──────────────────────────────────
export default function Mission4() {
  const { applyPenalty, applyReward, completeMission } = useGame();

  const squad = useMemo(() => generateSquad(2049), []);
  const MAX_DOSES = 4;

  // Slider states
  const [prior, setPrior] = useState(0.20);
  const [sensitivity, setSensitivity] = useState(0.90);
  const [falsePositiveRate, setFalsePositiveRate] = useState(0.08);

  // Selection states
  const [selectedMembers, setSelectedMembers] = useState(new Set());
  const [lockedIn, setLockedIn] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const [activeZone, setActiveZone] = useState(null);
  const timeoutRef = useRef(null);

  // Story Dialogue State
  const [dialogue, setDialogue] = useState({
    isOpen: true,
    character: 'aris',
    messages: [
      'EMERGENCY ALERT: Eight squad members were exposed to aerosolized bio-toxin during crate recovery, and our rapid test strips are popping positive!',
      'We only have 4 doses of antidote! Remember Bayes\' Theorem: a positive test in a low-prevalence rural outpost has a much higher chance of being a FALSE ALARM than one in the downtown core.',
      'Check each member\'s computed posterior risk P(Infected | Test) before locking in your antidote doses. Do not waste medicine on false positives!',
    ],
  });

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleProceedToMission5 = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (outcome) {
      completeMission(outcome.score, outcome.summary, { mission: 4, nextMission: 5 });
    }
  }, [outcome, completeMission]);

  // Compute Bayes values (global sliders)
  const bayes = useMemo(
    () => computeBayes(prior, sensitivity, falsePositiveRate),
    [prior, sensitivity, falsePositiveRate]
  );

  // Compute per-member posteriors using their zone prevalence
  const memberPosteriors = useMemo(() => {
    return squad.map((m) => {
      const zoneBayes = computeBayes(m.zone.prevalence, sensitivity, falsePositiveRate);
      const posterior = m.testPositive
        ? zoneBayes.posteriorPositive
        : zoneBayes.posteriorNegative;
      return { ...m, posterior, zoneBayes };
    });
  }, [squad, sensitivity, falsePositiveRate]);

  const handleToggleMember = useCallback(
    (id) => {
      if (lockedIn) return;
      soundEngine.playClick();
      setSelectedMembers((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else if (next.size < MAX_DOSES) {
          next.add(id);
        }
        return next;
      });
    },
    [lockedIn]
  );

  const handleZoneClick = useCallback(
    (zone) => {
      if (lockedIn) return;
      soundEngine.playClick();
      setActiveZone(zone.id);
      setPrior(zone.prevalence);
    },
    [lockedIn]
  );

  const handleAdminister = useCallback(() => {
    if (selectedMembers.size === 0) return;

    const selected = new Set(selectedMembers);
    const trulyInfected = squad.filter((m) => m.isInfected);
    const trulyInfectedIds = new Set(trulyInfected.map((m) => m.id));

    // Calculate outcomes
    let missedInfected = 0;
    let wastedDoses = 0;
    let correctlyTreated = 0;

    for (const m of squad) {
      if (m.isInfected && !selected.has(m.id)) {
        missedInfected++;
      }
      if (!m.isInfected && selected.has(m.id)) {
        wastedDoses++;
      }
      if (m.isInfected && selected.has(m.id)) {
        correctlyTreated++;
      }
    }

    // Penalties
    const healthPenalty = missedInfected * 12;
    const medicinePenalty = missedInfected * 8 + wastedDoses * 6;

    if (healthPenalty > 0 || medicinePenalty > 0) {
      applyPenalty({ health: healthPenalty, medicine: medicinePenalty });
    }

    // Score
    const score = Math.max(10, 100 - missedInfected * 20 - wastedDoses * 10);

    // Narrative
    let narrative;
    if (missedInfected === 0 && wastedDoses === 0) {
      narrative =
        'PERFECT TRIAGE. You identified every infected member and wasted nothing. Bayesian reasoning saved the squad — the antidote worked on all truly infected, and healthy members kept their doses for later. Textbook field medicine.';
    } else if (missedInfected === 0) {
      narrative = `GOOD CALL — all infected were treated, but you wasted ${wastedDoses} dose${wastedDoses > 1 ? 's' : ''} on healthy members. The surplus antidote is gone, but at least no one turned. Remember: a positive test in a low-prevalence zone is often a false alarm.`;
    } else if (wastedDoses === 0) {
      narrative = `COSTLY MISS — you didn't waste any doses, but ${missedInfected} infected member${missedInfected > 1 ? 's' : ''} went untreated. The infection spread through the squad. Base-rate neglect may have blinded you to high-risk zones.`;
    } else {
      narrative = `DISASTER. ${missedInfected} infected went untreated and ${wastedDoses} dose${wastedDoses > 1 ? 's were' : ' was'} wasted on healthy members. The base-rate fallacy hit hard — you trusted raw test results without considering zone prevalence. Infections are spreading.`;
    }

    const summary = `Treated ${correctlyTreated}/${trulyInfected.length} infected. Missed ${missedInfected}, wasted ${wastedDoses} doses. Score: ${score}/100.`;
    const outcomeData = {
      score,
      narrative,
      missedInfected,
      wastedDoses,
      correctlyTreated,
      totalInfected: trulyInfected.length,
      healthPenalty,
      medicinePenalty,
      summary,
    };

    setLockedIn(true);
    setOutcome(outcomeData);

    timeoutRef.current = setTimeout(() => completeMission(score, summary, { mission: 4, nextMission: 5 }), 4500);
  }, [selectedMembers, squad, applyPenalty, completeMission]);

  const pct = (v) => (v * 100).toFixed(1) + '%';

  return (
    <div className="fade-in space-y-4 pb-8">
      {/* Mission Header */}
      <div className="panel p-4 border-amber-600/30 hud-glow">
        <div className="flex items-center gap-3 mb-2">
          <FlaskConical className="w-6 h-6 text-amber-500" />
          <h2 className="text-xl font-bold text-amber-400 tracking-wider uppercase">
            Mission 4: The Antidote Trial
          </h2>
        </div>
        <p className="text-zinc-400 text-sm leading-relaxed">
          Two experimental vaccine vials, enough for <span className="text-amber-400 font-bold">4 doses</span>.
          Eight squad members tested with rapid strips — but a positive test doesn't always mean infection.
          Use <span className="text-amber-400 font-bold">Bayes' Theorem</span> to compute true infection probability
          before deciding who to treat. Zone prevalence matters.
        </p>
      </div>

      {/* Interactive Per-Mission Hint */}
      <MissionHint
        missionNumber={4}
        concept="Conditional Probability & Bayes' Theorem"
        tier1Clue="Beware the Base-Rate Fallacy! A positive rapid test strip does NOT automatically mean a 90% infection risk. Squad members stationed in low-prevalence zones (e.g. 5% base rate) produce far more False Positives than True Positives. Always combine prior probability P(Infected) with test sensitivity."
        tier2Strategy="Inspect each squad member's calculated posterior probability P(I | +). Prioritize members from Red/High-prevalence zones who tested positive (P(I|+) > 75%). Do not waste your 4 limited doses on Green/Safe-zone members whose true infection chance remains under 30%."
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* ─── Left Column: Controls + Bayes ─── */}
        <div className="xl:col-span-1 space-y-4">
          {/* Zone Prevalence */}
          <div className="panel p-4">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-amber-600" />
              ZONE PREVALENCE RATES
            </div>
            <div className="space-y-2">
              {ZONES.map((zone) => (
                <button
                  key={zone.id}
                  onClick={() => handleZoneClick(zone)}
                  disabled={lockedIn}
                  className={`w-full p-3 rounded-lg border text-left transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    activeZone === zone.id
                      ? zone.bgClass + ' ring-1 ring-opacity-40'
                      : 'bg-zinc-800/50 border-zinc-700/40 hover:border-zinc-500'
                  }`}
                  style={activeZone === zone.id ? { borderColor: zone.color } : undefined}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CircleDot className="w-3.5 h-3.5" style={{ color: zone.color }} />
                      <span className="text-sm font-bold text-zinc-300">{zone.name}</span>
                    </div>
                    <span className="text-sm font-bold tabular-nums" style={{ color: zone.color, fontFamily: 'monospace' }}>
                      {(zone.prevalence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1">
                    {zone.id === 'downtown' && 'Dense urban, heavy outbreak'}
                    {zone.id === 'suburbs' && 'Moderate spread, mixed population'}
                    {zone.id === 'rural' && 'Sparse contact, low infection rate'}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-zinc-600 mt-2 italic">
              Click a zone to set the prior prevalence slider
            </p>
          </div>

          {/* Parameter Sliders */}
          <div className="panel p-4">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-amber-600" />
              DIAGNOSTIC PARAMETERS
            </div>
            <div className="space-y-4">
              <ParamSlider
                label="P(Infected) — Prior Prevalence"
                value={prior}
                min={0.05}
                max={0.60}
                step={0.01}
                onChange={setPrior}
                disabled={lockedIn}
                color="#f59e0b"
              />
              <ParamSlider
                label="P(+|Infected) — Test Sensitivity"
                value={sensitivity}
                min={0.70}
                max={0.99}
                step={0.01}
                onChange={setSensitivity}
                disabled={lockedIn}
                color="#3b82f6"
              />
              <ParamSlider
                label="P(+|Healthy) — False Positive Rate"
                value={falsePositiveRate}
                min={0.01}
                max={0.30}
                step={0.01}
                onChange={setFalsePositiveRate}
                disabled={lockedIn}
                color="#ef4444"
              />
            </div>
          </div>

          {/* Bayes Formula Display */}
          <div className="panel p-4 border-amber-600/20">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <TestTubes className="w-3.5 h-3.5 text-amber-600" />
              BAYES' THEOREM — RESULTS
            </div>

            {/* Formula */}
            <div className="bg-zinc-800/70 rounded-lg p-3 border border-zinc-700/40 mb-3 overflow-x-auto">
              <div className="text-[10px] text-zinc-500 mb-2 uppercase tracking-wider">Formula</div>
              <div className="text-xs font-mono text-zinc-300 space-y-1">
                <div>
                  <span className="text-amber-400">P(I|+)</span>
                  <span className="text-zinc-500"> = </span>
                  <span className="text-blue-400">P(+|I)</span>
                  <span className="text-zinc-500"> × </span>
                  <span className="text-amber-400">P(I)</span>
                  <span className="text-zinc-500"> / </span>
                  <span className="text-zinc-300">P(+)</span>
                </div>
                <div className="text-[10px] text-zinc-500 mt-1">where</div>
                <div>
                  <span className="text-zinc-300">P(+)</span>
                  <span className="text-zinc-500"> = </span>
                  <span className="text-blue-400">P(+|I)</span>
                  <span className="text-zinc-500">×</span>
                  <span className="text-amber-400">P(I)</span>
                  <span className="text-zinc-500"> + </span>
                  <span className="text-red-400">P(+|H)</span>
                  <span className="text-zinc-500">×</span>
                  <span className="text-emerald-400">P(H)</span>
                </div>
              </div>
            </div>

            {/* Computed values */}
            <div className="bg-zinc-800/70 rounded-lg p-3 border border-zinc-700/40 mb-3">
              <div className="text-[10px] text-zinc-500 mb-2 uppercase tracking-wider">Substitution</div>
              <div className="text-xs font-mono text-zinc-400 space-y-1">
                <div>
                  P(+) = <span className="text-blue-400">{pct(sensitivity)}</span>
                  <span className="text-zinc-500">×</span>
                  <span className="text-amber-400">{pct(prior)}</span>
                  <span className="text-zinc-500"> + </span>
                  <span className="text-red-400">{pct(falsePositiveRate)}</span>
                  <span className="text-zinc-500">×</span>
                  <span className="text-emerald-400">{pct(1 - prior)}</span>
                  <span className="text-zinc-500"> = </span>
                  <span className="text-zinc-200 font-bold">{pct(bayes.pPos)}</span>
                </div>
              </div>
            </div>

            {/* Posterior results */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-red-900/20 rounded-lg p-3 border border-red-600/30">
                <div className="text-[10px] text-zinc-500 uppercase mb-1">P(Infected | Test +)</div>
                <div className="text-2xl font-bold text-red-400 tabular-nums" style={{ fontFamily: 'monospace' }}>
                  {pct(bayes.posteriorPositive)}
                </div>
                <div className="text-[10px] text-zinc-600 mt-1">
                  P(Healthy|+) = {pct(1 - bayes.posteriorPositive)}
                </div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/30">
                <div className="text-[10px] text-zinc-500 uppercase mb-1">P(Infected | Test −)</div>
                <div className="text-2xl font-bold text-zinc-400 tabular-nums" style={{ fontFamily: 'monospace' }}>
                  {pct(bayes.posteriorNegative)}
                </div>
                <div className="text-[10px] text-zinc-600 mt-1">
                  P(Healthy|−) = {pct(1 - bayes.posteriorNegative)}
                </div>
              </div>
            </div>

            {/* Base rate insight */}
            <div className="mt-3 p-2 rounded bg-amber-900/10 border border-amber-600/20">
              <p className="text-[10px] text-amber-400/80 leading-relaxed">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                <strong>Base-Rate Insight:</strong> At {pct(prior)} prevalence, a positive test means only{' '}
                <strong>{pct(bayes.posteriorPositive)}</strong> chance of true infection.
                {bayes.posteriorPositive < 0.5 && ' Most positives are FALSE ALARMS at this prevalence!'}
              </p>
            </div>
          </div>
        </div>

        {/* ─── Right Column: Tree + Squad ─── */}
        <div className="xl:col-span-2 space-y-4">
          {/* Probability Tree */}
          <div className="panel p-4 border-amber-600/20">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-amber-600" />
              PROBABILITY TREE — REAL-TIME
            </div>
            <div className="bg-zinc-900/50 rounded-lg p-2 border border-zinc-800">
              <ProbabilityTree bayes={bayes} />
            </div>
            <div className="flex items-center gap-4 mt-2 text-[10px] text-zinc-500 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-amber-900 border border-amber-500" />
                Infected Branch
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-emerald-900 border border-emerald-500" />
                Healthy Branch
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-red-900 border border-red-500" />
                Test Positive
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-zinc-700 border border-zinc-500" />
                Test Negative
              </div>
            </div>
          </div>

          {/* Squad Members */}
          <div className="panel p-4 border-amber-600/20">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-amber-600" />
              SQUAD ROSTER — ANTIDOTE ALLOCATION
            </div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] text-zinc-600">
                Select up to {MAX_DOSES} members. Posteriors use each member's zone prevalence.
              </p>
              <div className="flex items-center gap-1.5">
                <Syringe className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-bold text-amber-400 tabular-nums">
                  {selectedMembers.size}/{MAX_DOSES} doses
                </span>
              </div>
            </div>

            {/* Dose indicator pips */}
            <div className="flex gap-1 mb-3">
              {Array.from({ length: MAX_DOSES }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    i < selectedMembers.size
                      ? 'bg-amber-500 shadow-sm shadow-amber-500/50'
                      : 'bg-zinc-700'
                  }`}
                />
              ))}
            </div>

            {/* Member cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {memberPosteriors.map((m) => {
                const isSelected = selectedMembers.has(m.id);
                const canSelect = !lockedIn && (isSelected || selectedMembers.size < MAX_DOSES);
                const posteriorColor =
                  m.posterior >= 0.7 ? '#ef4444' : m.posterior >= 0.4 ? '#f59e0b' : m.posterior >= 0.15 ? '#eab308' : '#22c55e';

                return (
                  <button
                    key={m.id}
                    onClick={() => handleToggleMember(m.id)}
                    disabled={!canSelect && !lockedIn ? true : lockedIn}
                    className={`w-full p-3 rounded-lg border text-left transition-all duration-200 cursor-pointer disabled:cursor-not-allowed ${
                      lockedIn
                        ? m.isInfected
                          ? 'bg-red-900/30 border-red-600/40'
                          : 'bg-emerald-900/20 border-emerald-600/30'
                        : isSelected
                        ? 'bg-amber-900/20 border-amber-500/60 ring-1 ring-amber-500/30'
                        : canSelect
                        ? 'bg-zinc-800/50 border-zinc-700/40 hover:border-zinc-500 hover:bg-zinc-800'
                        : 'bg-zinc-800/30 border-zinc-700/20 opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        {/* Selection checkbox */}
                        <div
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                            lockedIn
                              ? isSelected
                                ? m.isInfected
                                  ? 'bg-emerald-500 border-emerald-500'
                                  : 'bg-red-500 border-red-500'
                                : m.isInfected
                                ? 'bg-red-500/20 border-red-500'
                                : 'border-zinc-600'
                              : isSelected
                              ? 'bg-amber-500 border-amber-500'
                              : 'border-zinc-600'
                          }`}
                        >
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm font-bold text-zinc-200">{m.name}</span>
                      </div>
                      {/* Test result badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          m.testPositive
                            ? 'bg-red-900/40 text-red-400 border border-red-600/30'
                            : 'bg-emerald-900/30 text-emerald-400 border border-emerald-600/30'
                        }`}
                      >
                        TEST {m.testPositive ? '+' : '−'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border ${m.zone.bgClass}`}
                          style={{ color: m.zone.color }}
                        >
                          {m.zone.name}
                        </span>
                        <span className="text-[10px] text-zinc-600">
                          base: {(m.zone.prevalence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-zinc-500">P(I|test):</span>
                        <span
                          className="text-xs font-bold tabular-nums"
                          style={{ color: posteriorColor, fontFamily: 'monospace' }}
                        >
                          {(m.posterior * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    {/* Reveal true status after lock-in */}
                    {lockedIn && (
                      <div
                        className={`mt-2 pt-2 border-t flex items-center gap-1.5 text-xs font-bold ${
                          m.isInfected ? 'border-red-700/30 text-red-400' : 'border-emerald-700/30 text-emerald-400'
                        }`}
                      >
                        {m.isInfected ? (
                          <>
                            <Skull className="w-3.5 h-3.5" />
                            INFECTED
                            {isSelected ? (
                              <span className="ml-auto text-emerald-400 text-[10px]">✓ TREATED</span>
                            ) : (
                              <span className="ml-auto text-red-400 text-[10px]">✗ UNTREATED — SPREADING</span>
                            )}
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" />
                            HEALTHY
                            {isSelected ? (
                              <span className="ml-auto text-amber-400 text-[10px]">⚠ DOSE WASTED</span>
                            ) : (
                              <span className="ml-auto text-emerald-400 text-[10px]">✓ CORRECTLY SKIPPED</span>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Decision Panel */}
          <div
            className={`panel p-4 transition-all duration-500 ${
              lockedIn ? 'border-zinc-600' : 'border-amber-600/30'
            }`}
          >
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              SURVIVAL DECISION
            </div>

            {!lockedIn ? (
              <>
                <p className="text-xs text-zinc-400 mb-3">
                  You have <span className="text-amber-400 font-bold">{MAX_DOSES - selectedMembers.size}</span> dose{MAX_DOSES - selectedMembers.size !== 1 ? 's' : ''} remaining.
                  Select who to treat based on posterior probability, not just the raw test result.
                </p>
                <button
                  onClick={handleAdminister}
                  disabled={selectedMembers.size === 0}
                  className="btn-danger w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Syringe className="w-4 h-4" />
                  ADMINISTER MEDICINE ({selectedMembers.size} dose{selectedMembers.size !== 1 ? 's' : ''})
                </button>
                {selectedMembers.size === 0 && (
                  <p className="text-[10px] text-amber-600 mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Select at least one squad member to treat
                  </p>
                )}
              </>
            ) : (
              <div className="fade-in space-y-3">
                {/* Outcome display */}
                <div
                  className={`rounded-lg p-3 border ${
                    outcome.score >= 90
                      ? 'bg-emerald-900/30 border-emerald-600/30'
                      : outcome.score >= 70
                      ? 'bg-amber-900/20 border-amber-600/30'
                      : outcome.score >= 40
                      ? 'bg-orange-900/20 border-orange-600/30'
                      : 'bg-red-900/30 border-red-600/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {outcome.score >= 70 ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Skull className="w-5 h-5 text-red-400" />
                    )}
                    <span
                      className={`font-bold text-sm uppercase ${
                        outcome.score >= 90
                          ? 'text-emerald-400'
                          : outcome.score >= 70
                          ? 'text-amber-400'
                          : outcome.score >= 40
                          ? 'text-orange-400'
                          : 'text-red-400'
                      }`}
                    >
                      {outcome.score >= 90
                        ? 'Perfect Triage'
                        : outcome.score >= 70
                        ? 'Effective Treatment'
                        : outcome.score >= 40
                        ? 'Costly Mistakes'
                        : 'Catastrophic Failure'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">{outcome.narrative}</p>
                </div>

                {/* Result summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-zinc-800/50 rounded p-2">
                    <div className="text-zinc-500">Correctly Treated</div>
                    <div className="text-emerald-400 font-bold tabular-nums">
                      {outcome.correctlyTreated}/{outcome.totalInfected}
                    </div>
                  </div>
                  <div className="bg-zinc-800/50 rounded p-2">
                    <div className="text-zinc-500">Missed Infected</div>
                    <div className="text-red-400 font-bold tabular-nums">{outcome.missedInfected}</div>
                  </div>
                  <div className="bg-zinc-800/50 rounded p-2">
                    <div className="text-zinc-500">Wasted Doses</div>
                    <div className="text-amber-400 font-bold tabular-nums">{outcome.wastedDoses}</div>
                  </div>
                  <div className="bg-zinc-800/50 rounded p-2">
                    <div className="text-zinc-500">Score</div>
                    <div className="text-amber-400 font-bold tabular-nums">{outcome.score}/100</div>
                  </div>
                </div>

                {/* Penalties applied */}
                {(outcome.healthPenalty > 0 || outcome.medicinePenalty > 0) && (
                  <div className="bg-red-900/20 rounded-lg p-2 border border-red-600/20">
                    <div className="text-[10px] text-red-400 font-bold uppercase mb-1">Penalties Applied</div>
                    <div className="text-xs text-red-300">
                      {outcome.healthPenalty > 0 && <span>−{outcome.healthPenalty} Health </span>}
                      {outcome.medicinePenalty > 0 && <span>−{outcome.medicinePenalty} Medicine</span>}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleProceedToMission5}
                  className="btn-primary w-full py-2.5 text-xs font-mono font-bold tracking-wider mt-2 cursor-pointer pulse-glow"
                >
                  PROCEED TO NEXT LEVEL (MISSION 5) →
                </button>
                <div className="text-[10px] text-zinc-500 text-center pulse-glow mt-1">
                  Auto-advancing or click above to proceed
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Story Pop-up Dialogue */}
      <DialogueModal
        isOpen={dialogue.isOpen}
        onClose={() => setDialogue((prev) => ({ ...prev, isOpen: false }))}
        character={dialogue.character}
        messages={dialogue.messages}
        locationTag="FIELD BIO-LAB // FREQ 162.40 MHz"
      />
    </div>
  );
}
