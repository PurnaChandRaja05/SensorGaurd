import { useState, useMemo, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { soundEngine } from '../utils/soundEngine';
import DialogueModal from '../components/DialogueModal';
import MissionHint from '../components/MissionHint';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell
} from 'recharts';
import { ShieldAlert, HeartPulse, Thermometer, Users, AlertTriangle, CheckCircle, XCircle, Skull, UserCheck } from 'lucide-react';

// Healthy Human Marker (warm skin, tactical cyan visor, emerald ring)
const HealthyMarker = (props) => {
  const { cx, cy } = props;
  if (!cx || !cy) return null;
  return (
    <g transform={`translate(${cx - 7}, ${cy - 7})`} className="cursor-pointer">
      <circle cx="7" cy="7" r="6.5" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
      {/* Warm human skin */}
      <circle cx="7" cy="7" r="5" fill="#fcd34d" />
      {/* Tactical blue visor */}
      <rect x="4" y="5.5" width="6" height="2.2" rx="0.8" fill="#0284c7" />
      <line x1="4.5" y1="6.6" x2="9.5" y2="6.6" stroke="#38bdf8" strokeWidth="0.6" />
    </g>
  );
};

// Infected Zombie Carrier Marker (pale necrotic green skin, glowing crimson eyes, danger ring)
const InfectedMarker = (props) => {
  const { cx, cy } = props;
  if (!cx || !cy) return null;
  return (
    <g transform={`translate(${cx - 7}, ${cy - 7})`} className="cursor-pointer">
      <circle cx="7" cy="7" r="6.5" fill="#450a0a" stroke="#ef4444" strokeWidth="1.5" />
      {/* Pale necrotic green skin */}
      <circle cx="7" cy="7" r="5" fill="#86efac" />
      {/* Glowing Crimson Eyes */}
      <circle cx="5.2" cy="6.2" r="1.1" fill="#ef4444" />
      <circle cx="8.8" cy="6.2" r="1.1" fill="#ef4444" />
      {/* Biohazard infection snarl */}
      <path d="M5.5 9.2 Q7 8 8.5 9.2" stroke="#14532d" strokeWidth="0.8" fill="none" />
    </g>
  );
};

// Wave unclassified sensor marker (gray radar blip)
const UnknownWaveMarker = (props) => {
  const { cx, cy } = props;
  if (!cx || !cy) return null;
  return (
    <g transform={`translate(${cx - 5}, ${cy - 5})`}>
      <circle cx="5" cy="5" r="4.5" fill="#27272a" stroke="#71717a" strokeWidth="1" />
      <circle cx="5" cy="5" r="1.8" fill="#a1a1aa" />
    </g>
  );
};

// Seeded pseudo-random number generator
function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateSurvivors(count, infectedRatio, rng) {
  const survivors = [];
  const infectedCount = Math.round(count * infectedRatio);

  for (let i = 0; i < count; i++) {
    const infected = i < infectedCount;
    let temp, heartRate;

    if (infected) {
      // Most infected have elevated readings
      if (rng() < 0.15) {
        // ~15% of infected have near-normal readings (hard cases)
        temp = 36.8 + rng() * 0.9; // 36.8-37.7
        heartRate = 72 + Math.floor(rng() * 20); // 72-91
      } else {
        temp = 37.5 + rng() * 2.0; // 37.5-39.5
        heartRate = 85 + Math.floor(rng() * 35); // 85-120
      }
    } else {
      // Most healthy have normal readings
      if (rng() < 0.12) {
        // ~12% of healthy have slightly elevated readings (hard cases)
        temp = 37.1 + rng() * 0.7; // 37.1-37.8
        heartRate = 78 + Math.floor(rng() * 15); // 78-92
      } else {
        temp = 36.2 + rng() * 1.0; // 36.2-37.2
        heartRate = 60 + Math.floor(rng() * 25); // 60-85
      }
    }

    survivors.push({
      id: i + 1,
      temp: parseFloat(temp.toFixed(1)),
      heartRate: Math.round(heartRate),
      infected,
    });
  }

  // Shuffle
  for (let i = survivors.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [survivors[i], survivors[j]] = [survivors[j], survivors[i]];
  }

  return survivors;
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length > 0) {
    const d = payload[0].payload;
    return (
      <div className="panel text-xs p-2 border border-zinc-600">
        <p className="font-mono text-amber-400">Survivor #{d.id}</p>
        <p className="text-zinc-300">Temp: {d.temp}°C</p>
        <p className="text-zinc-300">HR: {d.heartRate} BPM</p>
        {d.infected !== undefined && d.showLabel && (
          <p className={d.infected ? 'text-red-400' : 'text-emerald-400'}>
            {d.infected ? '⚠ INFECTED' : '✓ HEALTHY'}
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default function Mission2() {
  const { applyPenalty, applyReward, completeMission } = useGame();

  const [tempThreshold, setTempThreshold] = useState(37.5);
  const [hrThreshold, setHrThreshold] = useState(85);
  const [applied, setApplied] = useState(false);
  const [waveResults, setWaveResults] = useState(null);

  // Story Dialogue State
  const [dialogue, setDialogue] = useState({
    isOpen: true,
    character: 'aris',
    messages: [
      'Commander, this is Dr. Aris at the quarantine gate. Survivors are approaching, but our blood tests take hours and we need an immediate gate-screening protocol.',
      'We plotted 40 historical cases of body temperature and heart rate. Adjust your decision boundaries carefully: high precision avoids turning away healthy engineers, but high recall ensures zero infected carriers slip through our wire!',
    ],
  });

  // Generate stable training data
  const trainingData = useMemo(() => {
    const rng = seededRandom(42);
    return generateSurvivors(40, 0.35, rng);
  }, []);

  // Generate stable wave data
  const waveData = useMemo(() => {
    const rng = seededRandom(7777);
    return generateSurvivors(12, 0.35, rng);
  }, []);

  // Classify a survivor based on current thresholds
  const classify = useCallback((survivor, tThresh, hThresh) => {
    return survivor.temp >= tThresh && survivor.heartRate >= hThresh;
  }, []);

  // Compute confusion matrix for training data
  const confusionMatrix = useMemo(() => {
    let tp = 0, fp = 0, tn = 0, fn = 0;
    trainingData.forEach(s => {
      const predicted = classify(s, tempThreshold, hrThreshold);
      if (s.infected && predicted) tp++;
      else if (!s.infected && predicted) fp++;
      else if (!s.infected && !predicted) tn++;
      else if (s.infected && !predicted) fn++;
    });
    const precision = tp + fp > 0 ? (tp / (tp + fp)) * 100 : 0;
    const recall = tp + fn > 0 ? (tp / (tp + fn)) * 100 : 0;
    const accuracy = ((tp + tn) / trainingData.length) * 100;
    return { tp, fp, tn, fn, precision, recall, accuracy };
  }, [trainingData, tempThreshold, hrThreshold, classify]);

  // Split training data for chart
  const healthyData = useMemo(() =>
    trainingData.filter(s => !s.infected).map(s => ({ ...s, showLabel: true })),
    [trainingData]
  );
  const infectedData = useMemo(() =>
    trainingData.filter(s => s.infected).map(s => ({ ...s, showLabel: true })),
    [trainingData]
  );

  // Wave display data
  const waveDisplayData = useMemo(() =>
    waveData.map(s => ({ ...s, showLabel: false })),
    [waveData]
  );

  const handleApplyClassifier = () => {
    soundEngine.playClick();
    let tp = 0, fp = 0, tn = 0, fn = 0;
    const classified = waveData.map(s => {
      const predicted = classify(s, tempThreshold, hrThreshold);
      if (s.infected && predicted) tp++;
      else if (!s.infected && predicted) fp++;
      else if (!s.infected && !predicted) tn++;
      else if (s.infected && !predicted) fn++;
      return { ...s, predicted, showLabel: true };
    });

    const healthPenalty = fn * 8;
    const medicinePenalty = fn * 5;
    const foodPenalty = fp * 4;
    const score = Math.max(10, 100 - (fn * 15) - (fp * 5));

    if (healthPenalty > 0 || medicinePenalty > 0) {
      applyPenalty({ health: healthPenalty, medicine: medicinePenalty });
    }
    if (foodPenalty > 0) {
      applyPenalty({ food: foodPenalty });
    }

    setWaveResults({ classified, tp, fp, tn, fn, score, healthPenalty, medicinePenalty, foodPenalty });
    setApplied(true);

    // Dr. Aris reaction dialogue
    let reactionMsg = '';
    if (fn === 0 && fp === 0) {
      reactionMsg = 'Flawless screening! Precision and recall were in perfect harmony. Every infected carrier was safely isolated, and zero healthy allies were lost!';
    } else if (fn > 0) {
      reactionMsg = `CONTAINMENT BREACH! ${fn} asymptomatic carrier${fn > 1 ? 's' : ''} got past our gate! Emergency quarantine alarms are blaring in Sector B — medical and health supplies are draining fast!`;
    } else {
      reactionMsg = `Safehouse secured from outbreak, but our threshold was too strict: ${fp} healthy survivor${fp > 1 ? 's were' : ' was'} turned away into the wasteland. Squad morale and rations took a hit!`;
    }

    setDialogue({
      isOpen: true,
      character: 'aris',
      messages: [reactionMsg],
    });
  };

  const handleComplete = () => {
    if (!waveResults) return;
    const { fn, fp, score } = waveResults;
    let summary = '';
    if (fn === 0 && fp === 0) {
      summary = 'Perfect classification. All survivors correctly screened.';
    } else if (fn === 0) {
      summary = `No infected let through, but ${fp} healthy survivor${fp > 1 ? 's' : ''} turned away.`;
    } else if (fp === 0) {
      summary = `${fn} infected carrier${fn > 1 ? 's' : ''} slipped past the checkpoint. No healthy survivors lost.`;
    } else {
      summary = `${fn} infected let in, ${fp} healthy turned away. Checkpoint needs recalibration.`;
    }
    completeMission(score, summary, { mission: 2, nextMission: 3 });
  };

  return (
    <div className="fade-in space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="panel p-4 border-l-4 border-amber-500">
        <div className="flex items-center gap-3 mb-2">
          <ShieldAlert className="text-amber-400 w-7 h-7" />
          <h1 className="text-xl font-bold font-mono text-amber-400 tracking-wide">
            MISSION 2: QUARANTINE CHECKPOINT
          </h1>
        </div>
        <p className="text-zinc-300 text-sm leading-relaxed">
          Survivors are arriving at the safehouse gate. Some are healthy humans, others are infected zombie carriers.
          Use body temperature and heart rate data to set <span className="text-amber-400 font-semibold">classification thresholds</span>.
          Survivors with <span className="text-red-400">BOTH</span> readings above your thresholds will be flagged for quarantine.
          Minimize false negatives (infected zombies let inside) and false positives (healthy allies turned away).
        </p>
      </div>

      {/* Interactive Per-Mission Hint */}
      <MissionHint
        missionNumber={2}
        concept="Decision Boundaries & The Confusion Matrix"
        tier1Clue="Analyze the cost asymmetry in the confusion matrix. False Negatives (FN = infected zombies let inside) cause deadly safehouse breaches and drain Health & Medicine. False Positives (FP = healthy allies turned away) only consume food rations. Prioritize high Recall (zero FN) first."
        tier2Strategy="Adjust the Temperature Threshold slider to ~37.6°C and Heart Rate Threshold to ~88 BPM. Verify on the scatter chart that all zombie-affected red markers fall inside the upper-right Quarantine quadrant (FN = 0), then lock in your classifier."
      />

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Scatter Plot - Spans 2 columns */}
        <div className="lg:col-span-2 panel p-4">
          <h2 className="text-sm font-mono text-zinc-400 mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              BIOMETRIC SCATTER — 40 HISTORICAL SURVIVOR RECORDS
            </span>
            <span className="text-[10px] text-zinc-500">Custom Avatar Markers</span>
          </h2>
          <ResponsiveContainer width="100%" height={360}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis
                type="number"
                dataKey="temp"
                name="Temperature"
                unit="°C"
                domain={[35.5, 40]}
                tick={{ fill: '#a1a1aa', fontSize: 11, fontFamily: 'monospace' }}
                label={{ value: 'Body Temperature (°C)', position: 'bottom', offset: 5, fill: '#71717a', fontSize: 12 }}
              />
              <YAxis
                type="number"
                dataKey="heartRate"
                name="Heart Rate"
                unit=" BPM"
                domain={[50, 130]}
                tick={{ fill: '#a1a1aa', fontSize: 11, fontFamily: 'monospace' }}
                label={{ value: 'Heart Rate (BPM)', angle: -90, position: 'insideLeft', offset: 5, fill: '#71717a', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                x={tempThreshold}
                stroke="#f59e0b"
                strokeDasharray="6 4"
                strokeWidth={2}
                label={{ value: `${tempThreshold}°C`, position: 'top', fill: '#f59e0b', fontSize: 11, fontFamily: 'monospace' }}
              />
              <ReferenceLine
                y={hrThreshold}
                stroke="#f59e0b"
                strokeDasharray="6 4"
                strokeWidth={2}
                label={{ value: `${hrThreshold} BPM`, position: 'right', fill: '#f59e0b', fontSize: 11, fontFamily: 'monospace' }}
              />
              <Scatter name="Healthy" data={healthyData} shape={<HealthyMarker />} />
              <Scatter name="Infected" data={infectedData} shape={<InfectedMarker />} />
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-3 text-xs font-mono">
            <span className="flex items-center gap-2 px-2.5 py-1 rounded bg-zinc-800/80 border border-emerald-500/30">
              <span className="w-4 h-4 rounded-full bg-amber-200 border border-emerald-400 flex items-center justify-center">
                <span className="w-2.5 h-1 bg-sky-500 rounded-xs" />
              </span>
              <span className="text-emerald-400 font-bold">Healthy Human Allies</span>
            </span>
            <span className="flex items-center gap-2 px-2.5 py-1 rounded bg-zinc-800/80 border border-red-500/30">
              <span className="w-4 h-4 rounded-full bg-emerald-300 border border-red-500 flex items-center justify-center gap-0.5">
                <span className="w-1 h-1 rounded-full bg-red-600" />
                <span className="w-1 h-1 rounded-full bg-red-600" />
              </span>
              <span className="text-red-400 font-bold">Infected Zombie Carriers ☠</span>
            </span>
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span className="w-6 border-t-2 border-dashed border-amber-500 inline-block" /> Decision Thresholds
            </span>
          </div>
        </div>

        {/* Right Column: Sliders + Confusion Matrix */}
        <div className="space-y-5">
          {/* Sliders */}
          <div className="panel p-4">
            <h2 className="text-sm font-mono text-zinc-400 mb-4 flex items-center gap-2">
              <Thermometer className="w-4 h-4" />
              CLASSIFICATION THRESHOLDS
            </h2>

            {/* Temperature Slider */}
            <div className="mb-5">
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-zinc-400">Temperature Threshold</span>
                <span className="text-amber-400 font-bold text-sm">{tempThreshold.toFixed(1)}°C</span>
              </div>
              <input
                type="range"
                min="36.0"
                max="39.0"
                step="0.1"
                value={tempThreshold}
                onChange={e => {
                  soundEngine.playTick();
                  setTempThreshold(parseFloat(e.target.value));
                }}
                disabled={applied}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-amber-500 bg-zinc-700"
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-500 mt-0.5">
                <span>36.0°C</span>
                <span>39.0°C</span>
              </div>
            </div>

            {/* Heart Rate Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-zinc-400">Heart Rate Threshold</span>
                <span className="text-amber-400 font-bold text-sm">{hrThreshold} BPM</span>
              </div>
              <input
                type="range"
                min="60"
                max="110"
                step="1"
                value={hrThreshold}
                onChange={e => {
                  soundEngine.playTick();
                  setHrThreshold(parseInt(e.target.value));
                }}
                disabled={applied}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-amber-500 bg-zinc-700"
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-500 mt-0.5">
                <span>60 BPM</span>
                <span>110 BPM</span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 mt-3 font-mono leading-snug">
              Flagged as <span className="text-red-400">INFECTED</span> if temp ≥ {tempThreshold.toFixed(1)}°C <span className="text-amber-400">AND</span> HR ≥ {hrThreshold} BPM
            </p>
          </div>

          {/* Confusion Matrix */}
          <div className="panel p-4">
            <h2 className="text-sm font-mono text-zinc-400 mb-3 flex items-center gap-2">
              <HeartPulse className="w-4 h-4" />
              CONFUSION MATRIX
            </h2>

            <div className="grid grid-cols-3 gap-0 text-center text-xs font-mono mb-3">
              {/* Header row */}
              <div className="p-1" />
              <div className="p-2 text-zinc-400 border-b border-zinc-600">Predicted +</div>
              <div className="p-2 text-zinc-400 border-b border-zinc-600">Predicted −</div>

              {/* Actual Positive */}
              <div className="p-2 text-zinc-400 border-r border-zinc-600 flex items-center justify-center">
                Actually +
              </div>
              <div className="p-3 bg-emerald-900/40 border border-emerald-700/50 rounded-tl">
                <div className="text-lg font-bold text-emerald-400">{confusionMatrix.tp}</div>
                <div className="text-emerald-500/80 text-[10px]">TP</div>
              </div>
              <div className="p-3 bg-red-900/40 border border-red-700/50 rounded-tr">
                <div className="text-lg font-bold text-red-400">{confusionMatrix.fn}</div>
                <div className="text-red-500/80 text-[10px]">FN</div>
              </div>

              {/* Actual Negative */}
              <div className="p-2 text-zinc-400 border-r border-zinc-600 flex items-center justify-center">
                Actually −
              </div>
              <div className="p-3 bg-orange-900/30 border border-orange-700/50 rounded-bl">
                <div className="text-lg font-bold text-orange-400">{confusionMatrix.fp}</div>
                <div className="text-orange-500/80 text-[10px]">FP</div>
              </div>
              <div className="p-3 bg-emerald-900/40 border border-emerald-700/50 rounded-br">
                <div className="text-lg font-bold text-emerald-400">{confusionMatrix.tn}</div>
                <div className="text-emerald-500/80 text-[10px]">TN</div>
              </div>
            </div>

            {/* Metrics */}
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-400">Precision</span>
                <span className="text-amber-400 font-bold">{confusionMatrix.precision.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Recall</span>
                <span className="text-amber-400 font-bold">{confusionMatrix.recall.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Accuracy</span>
                <span className="text-amber-400 font-bold">{confusionMatrix.accuracy.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Wave Section */}
      <div className="panel p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h2 className="text-sm font-mono text-amber-400">INCOMING WAVE — 12 UNKNOWN SURVIVORS</h2>
        </div>

        {!applied ? (
          <>
            {/* Mini scatter for wave */}
            <div className="mb-4">
              <ResponsiveContainer width="100%" height={220}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis
                    type="number"
                    dataKey="temp"
                    name="Temperature"
                    unit="°C"
                    domain={[35.5, 40]}
                    tick={{ fill: '#a1a1aa', fontSize: 10, fontFamily: 'monospace' }}
                    label={{ value: 'Temp (°C)', position: 'bottom', offset: 5, fill: '#71717a', fontSize: 10 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="heartRate"
                    name="Heart Rate"
                    unit=" BPM"
                    domain={[50, 130]}
                    tick={{ fill: '#a1a1aa', fontSize: 10, fontFamily: 'monospace' }}
                    label={{ value: 'HR (BPM)', angle: -90, position: 'insideLeft', offset: 5, fill: '#71717a', fontSize: 10 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine x={tempThreshold} stroke="#f59e0b" strokeDasharray="6 4" strokeWidth={1.5} />
                  <ReferenceLine y={hrThreshold} stroke="#f59e0b" strokeDasharray="6 4" strokeWidth={1.5} />
                  <Scatter name="Unknown" data={waveDisplayData} shape={<UnknownWaveMarker />} />
                </ScatterChart>
              </ResponsiveContainer>
              <p className="text-center text-[11px] text-zinc-500 font-mono mt-1">
                Radar blips = unclassified arrivals • Decision boundary crosshairs shown
              </p>
            </div>

            <button
              onClick={handleApplyClassifier}
              className="btn-primary w-full py-3 text-sm font-mono font-bold tracking-wider pulse-glow"
            >
              ⚡ APPLY CLASSIFIER — LOCK IN THRESHOLDS
            </button>
          </>
        ) : waveResults && (
          <div className="fade-in space-y-4">
            {/* Arrival Inspection Cards (Distinct Human vs Zombie Avatars) */}
            <div>
              <h3 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                SURVIVOR INSPECTION DOSSIERS — 12 ARRIVALS EVALUATED
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {waveResults.classified.map((s) => {
                  const isFN = s.infected && !s.predicted;
                  const isFP = !s.infected && s.predicted;
                  const isTP = s.infected && s.predicted;
                  const isTN = !s.infected && !s.predicted;
                  return (
                    <div
                      key={s.id}
                      className={`p-2.5 rounded-lg border font-mono transition-all ${
                        isFN
                          ? 'bg-red-950/40 border-red-500/80 shadow-md shadow-red-500/20'
                          : isFP
                          ? 'bg-orange-950/30 border-orange-500/60'
                          : isTP
                          ? 'bg-emerald-950/30 border-emerald-500/60'
                          : 'bg-zinc-900/80 border-emerald-600/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {/* Custom Distinct Avatar */}
                        {s.infected ? (
                          <div className="w-9 h-9 rounded-md bg-emerald-950 border border-red-500 flex items-center justify-center shrink-0 relative">
                            <div className="w-6 h-6 rounded-full bg-emerald-300 border border-red-500 relative flex items-center justify-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                            </div>
                            <span className="absolute -bottom-1 -right-1 text-[8px] px-1 bg-red-600 text-white rounded font-bold">☠</span>
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-md bg-sky-950 border border-emerald-500 flex items-center justify-center shrink-0 relative">
                            <div className="w-6 h-6 rounded-full bg-amber-200 border border-emerald-400 relative flex items-center justify-center">
                              <div className="w-4 h-1.5 bg-sky-500 rounded-xs" />
                            </div>
                            <span className="absolute -bottom-1 -right-1 text-[8px] px-1 bg-emerald-600 text-black rounded font-bold">✓</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-zinc-200 truncate">Survivor #{s.id}</div>
                          <div className={`text-[10px] font-bold ${s.infected ? 'text-red-400' : 'text-emerald-400'}`}>
                            {s.infected ? 'ZOMBIE CARRIER' : 'HEALTHY ALLY'}
                          </div>
                        </div>
                      </div>

                      {/* Biometrics */}
                      <div className="text-[10px] text-zinc-400 space-y-0.5 bg-black/40 p-1.5 rounded border border-zinc-800 mb-2">
                        <div className="flex justify-between">
                          <span>Temp:</span>
                          <span className={s.temp >= tempThreshold ? 'text-amber-400 font-bold' : 'text-zinc-300'}>{s.temp}°C</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Pulse:</span>
                          <span className={s.heartRate >= hrThreshold ? 'text-amber-400 font-bold' : 'text-zinc-300'}>{s.heartRate} BPM</span>
                        </div>
                      </div>

                      {/* Gate Action & Classification Badge */}
                      <div className="flex items-center justify-between text-[9px] pt-1 border-t border-zinc-800">
                        <span className={`px-1.5 py-0.5 rounded font-bold ${s.predicted ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'}`}>
                          {s.predicted ? 'QUARANTINE' : 'ADMITTED'}
                        </span>
                        <span className={`font-black ${isFN ? 'text-red-400 animate-pulse' : isFP ? 'text-orange-400' : 'text-emerald-400'}`}>
                          {isTP && 'TP (Stopped)'}
                          {isTN && 'TN (Clear)'}
                          {isFN && 'FN (BREACH!)'}
                          {isFP && 'FP (Exiled)'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Results table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-zinc-400 border-b border-zinc-700">
                    <th className="py-2 px-2 text-left">#</th>
                    <th className="py-2 px-2 text-left">Temp</th>
                    <th className="py-2 px-2 text-left">HR</th>
                    <th className="py-2 px-2 text-center">Predicted</th>
                    <th className="py-2 px-2 text-center">Actual</th>
                    <th className="py-2 px-2 text-center">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {waveResults.classified.map((s, idx) => {
                    const correct = s.predicted === s.infected;
                    const isFN = s.infected && !s.predicted;
                    const isFP = !s.infected && s.predicted;
                    return (
                      <tr
                        key={idx}
                        className={`border-b border-zinc-800 ${isFN ? 'bg-red-900/20' : isFP ? 'bg-orange-900/20' : ''}`}
                      >
                        <td className="py-1.5 px-2 text-zinc-500">{s.id}</td>
                        <td className="py-1.5 px-2 text-zinc-300">{s.temp}°C</td>
                        <td className="py-1.5 px-2 text-zinc-300">{s.heartRate}</td>
                        <td className="py-1.5 px-2 text-center">
                          {s.predicted ? (
                            <span className="text-red-400">INFECTED</span>
                          ) : (
                            <span className="text-emerald-400">CLEAR</span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          {s.infected ? (
                            <span className="text-red-400">INFECTED</span>
                          ) : (
                            <span className="text-emerald-400">HEALTHY</span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          {correct ? (
                            <CheckCircle className="w-4 h-4 text-emerald-400 inline" />
                          ) : isFN ? (
                            <span className="text-red-400 font-bold">FN ☠</span>
                          ) : (
                            <span className="text-orange-400 font-bold">FP</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Outcome Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-emerald-900/30 border border-emerald-700/50 rounded p-3 text-center">
                <div className="text-2xl font-bold font-mono text-emerald-400">{waveResults.tp}</div>
                <div className="text-[10px] font-mono text-emerald-500">TRUE POS</div>
              </div>
              <div className="bg-emerald-900/30 border border-emerald-700/50 rounded p-3 text-center">
                <div className="text-2xl font-bold font-mono text-emerald-400">{waveResults.tn}</div>
                <div className="text-[10px] font-mono text-emerald-500">TRUE NEG</div>
              </div>
              <div className="bg-red-900/30 border border-red-700/50 rounded p-3 text-center">
                <div className="text-2xl font-bold font-mono text-red-400">{waveResults.fn}</div>
                <div className="text-[10px] font-mono text-red-500">FALSE NEG ☠</div>
                {waveResults.fn > 0 && (
                  <div className="text-[9px] text-red-500/70 mt-1">-{waveResults.healthPenalty} HP, -{waveResults.medicinePenalty} MED</div>
                )}
              </div>
              <div className="bg-orange-900/30 border border-orange-700/50 rounded p-3 text-center">
                <div className="text-2xl font-bold font-mono text-orange-400">{waveResults.fp}</div>
                <div className="text-[10px] font-mono text-orange-500">FALSE POS</div>
                {waveResults.fp > 0 && (
                  <div className="text-[9px] text-orange-500/70 mt-1">-{waveResults.foodPenalty} FOOD</div>
                )}
              </div>
            </div>

            {/* Narrative */}
            <div className={`panel p-3 border-l-4 ${waveResults.score >= 80 ? 'border-emerald-500' : waveResults.score >= 50 ? 'border-amber-500' : 'border-red-500'}`}>
              <div className="flex items-center gap-2 mb-1">
                {waveResults.score >= 80 ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                ) : waveResults.score >= 50 ? (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <span className="font-mono text-sm font-bold text-zinc-200">
                  CHECKPOINT SCORE: <span className={waveResults.score >= 80 ? 'text-emerald-400' : waveResults.score >= 50 ? 'text-amber-400' : 'text-red-400'}>{waveResults.score}/100</span>
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono leading-relaxed">
                {waveResults.fn === 0 && waveResults.fp === 0 && (
                  'Perfect screening. Every survivor was correctly classified. The safehouse remains secure and no one was wrongly turned away.'
                )}
                {waveResults.fn === 0 && waveResults.fp > 0 && (
                  `No infected carriers got through — the safehouse is safe. However, ${waveResults.fp} healthy survivor${waveResults.fp > 1 ? 's were' : ' was'} mistakenly turned away into the wasteland, costing precious food supplies spent on failed quarantine procedures.`
                )}
                {waveResults.fn > 0 && waveResults.fp === 0 && (
                  `${waveResults.fn} infected carrier${waveResults.fn > 1 ? 's' : ''} slipped past the checkpoint and entered the safehouse. Outbreak containment protocols activated — medical supplies depleted. Crew morale is shaken.`
                )}
                {waveResults.fn > 0 && waveResults.fp > 0 && (
                  `Critical failure at the checkpoint. ${waveResults.fn} infected carrier${waveResults.fn > 1 ? 's' : ''} got inside while ${waveResults.fp} healthy survivor${waveResults.fp > 1 ? 's were' : ' was'} turned away. The classifier needs serious recalibration.`
                )}
              </p>
            </div>

            <button
              onClick={handleComplete}
              className="btn-primary w-full py-3 text-sm font-mono font-bold tracking-wider pulse-glow cursor-pointer"
            >
              PROCEED TO NEXT LEVEL (MISSION 3) →
            </button>
          </div>
        )}
      </div>

      {/* Story Pop-up Dialogue */}
      <DialogueModal
        isOpen={dialogue.isOpen}
        onClose={() => setDialogue((prev) => ({ ...prev, isOpen: false }))}
        character={dialogue.character}
        messages={dialogue.messages}
        locationTag="CHECKPOINT PERIMETER // FREQ 156.80 MHz"
      />
    </div>
  );
}
