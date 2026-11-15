import { useState, useMemo, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { soundEngine } from '../utils/soundEngine';
import DialogueModal from '../components/DialogueModal';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, BarChart, Bar,
  ComposedChart, ReferenceLine,
} from 'recharts';
import {
  Truck, Fuel, AlertTriangle, CheckCircle, XCircle,
  TrendingUp, ToggleLeft, ToggleRight, Crosshair, Gauge,
} from 'lucide-react';
import MissionHint from '../components/MissionHint';

// Seeded PRNG for deterministic data
function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Box-Muller transform for normally distributed noise
function gaussianNoise(rng, mean = 0, stddev = 1) {
  const u1 = rng();
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stddev;
}

function generateTelemetryData() {
  const rng = seededRandom(2077);
  const data = [];

  // 20 normal data points
  for (let i = 0; i < 20; i++) {
    const cargoWeight = Math.round(200 + rng() * 1000);
    const noise = gaussianNoise(rng, 0, 2);
    const fuelConsumed = parseFloat((0.04 * cargoWeight + 12 + noise).toFixed(1));
    data.push({
      id: i + 1,
      cargoWeight,
      fuelConsumed: Math.max(5, fuelConsumed),
      enabled: true,
      isOutlier: false,
    });
  }

  // 2 outlier points (damaged sensors — much higher fuel)
  const outlier1Weight = Math.round(350 + rng() * 200);
  data.push({
    id: 21,
    cargoWeight: outlier1Weight,
    fuelConsumed: parseFloat((0.04 * outlier1Weight + 12 + 18 + gaussianNoise(rng, 0, 1)).toFixed(1)),
    enabled: true,
    isOutlier: true,
  });

  const outlier2Weight = Math.round(700 + rng() * 300);
  data.push({
    id: 22,
    cargoWeight: outlier2Weight,
    fuelConsumed: parseFloat((0.04 * outlier2Weight + 12 + 22 + gaussianNoise(rng, 0, 1)).toFixed(1)),
    enabled: true,
    isOutlier: true,
  });

  return data;
}

// Custom tooltip for the scatter chart
const ScatterTooltip = ({ active, payload }) => {
  if (active && payload && payload.length > 0) {
    const d = payload[0].payload;
    return (
      <div className="panel text-xs p-2 border border-zinc-600">
        <p className="font-mono text-amber-400">Record #{d.id}{d.isOutlier ? ' ⚠ SENSOR ANOMALY' : ''}</p>
        <p className="text-zinc-300">Cargo: {d.cargoWeight} kg</p>
        <p className="text-zinc-300">Fuel: {d.fuelConsumed} L</p>
      </div>
    );
  }
  return null;
};

// Custom tooltip for residuals bar chart
const ResidualTooltip = ({ active, payload }) => {
  if (active && payload && payload.length > 0) {
    const d = payload[0].payload;
    return (
      <div className="panel text-xs p-2 border border-zinc-600">
        <p className="font-mono text-amber-400">Point #{d.id}</p>
        <p className="text-zinc-300">Residual: {d.residual > 0 ? '+' : ''}{d.residual.toFixed(2)} L</p>
      </div>
    );
  }
  return null;
};

export default function Mission5() {
  const { state, applyPenalty, completeMission } = useGame();

  // Data points with toggle state
  const baseData = useMemo(() => generateTelemetryData(), []);
  const [dataPoints, setDataPoints] = useState(baseData);

  // Regression controls
  const [slope, setSlope] = useState(0.03);
  const [intercept, setIntercept] = useState(15);

  // Convoy decision
  const [cargoLoad, setCargoLoad] = useState(500);
  const [targetSpeed, setTargetSpeed] = useState(80);

  // Mission outcome state
  const [outcome, setOutcome] = useState(null);

  // Story dialogue state
  const [dialogue, setDialogue] = useState({
    isOpen: true,
    character: 'jax',
    messages: [
      "Commander, engines are idling. We've got 120 clicks of broken highway between here and the Evacuation Centre. The horde is closing in fast from the rear.",
      "We need an exact fuel prediction based on our cargo load and speed. Look at the telemetry logs — those two sensor anomaly spikes will wreck our slope if you don't filter them out! Fit the line, lock our speed, and let's punch through.",
    ],
  });

  // Toggle a data point's enabled state
  const togglePoint = useCallback((id) => {
    soundEngine.playClick();
    setDataPoints(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
  }, []);

  // Enabled data points
  const enabledPoints = useMemo(() => dataPoints.filter(p => p.enabled), [dataPoints]);
  const disabledPoints = useMemo(() => dataPoints.filter(p => !p.enabled), [dataPoints]);

  // Auto-fit least squares on enabled points
  const autoFit = useCallback(() => {
    soundEngine.playClick();
    const pts = dataPoints.filter(p => p.enabled);
    if (pts.length < 2) return;

    const n = pts.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (const p of pts) {
      sumX += p.cargoWeight;
      sumY += p.fuelConsumed;
      sumXY += p.cargoWeight * p.fuelConsumed;
      sumXX += p.cargoWeight * p.cargoWeight;
    }

    const denom = n * sumXX - sumX * sumX;
    if (Math.abs(denom) < 1e-10) return;

    const m = (n * sumXY - sumX * sumY) / denom;
    const b = (sumY - m * sumX) / n;

    // Clamp to slider ranges
    setSlope(Math.max(0.01, Math.min(0.08, parseFloat(m.toFixed(3)))));
    setIntercept(Math.max(5, Math.min(25, parseFloat(b.toFixed(1)))));
  }, [dataPoints]);

  // Compute MSE and R² from enabled points
  const metrics = useMemo(() => {
    const pts = enabledPoints;
    if (pts.length === 0) return { mse: 0, r2: 0 };

    const meanY = pts.reduce((s, p) => s + p.fuelConsumed, 0) / pts.length;

    let ssRes = 0;
    let ssTot = 0;
    for (const p of pts) {
      const predicted = slope * p.cargoWeight + intercept;
      const residual = p.fuelConsumed - predicted;
      ssRes += residual * residual;
      ssTot += (p.fuelConsumed - meanY) * (p.fuelConsumed - meanY);
    }

    const mse = ssRes / pts.length;
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    return { mse, r2 };
  }, [enabledPoints, slope, intercept]);

  // Residuals data for the bar chart
  const residualsData = useMemo(() => {
    return enabledPoints.map(p => ({
      id: p.id,
      residual: parseFloat((p.fuelConsumed - (slope * p.cargoWeight + intercept)).toFixed(2)),
    }));
  }, [enabledPoints, slope, intercept]);

  // Regression line data for the scatter chart overlay
  const regressionLineData = useMemo(() => {
    const minX = 150;
    const maxX = 1300;
    const steps = 50;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const x = minX + (maxX - minX) * (i / steps);
      pts.push({ cargoWeight: x, fuelConsumed: slope * x + intercept });
    }
    return pts;
  }, [slope, intercept]);

  // Residual lines: each enabled point connects vertically to the regression line
  const residualLines = useMemo(() => {
    return enabledPoints.map(p => ({
      id: p.id,
      x: p.cargoWeight,
      actual: p.fuelConsumed,
      predicted: slope * p.cargoWeight + intercept,
    }));
  }, [enabledPoints, slope, intercept]);

  // Speed penalty
  const speedPenalty = (targetSpeed - 60) * 0.15;
  const predictedFuel = slope * cargoLoad + intercept + speedPenalty;
  const availableFuel = state.fuel;
  const insufficientFuel = predictedFuel > availableFuel;

  // R² quality indicator
  const r2Quality = metrics.r2 >= 0.85 ? 'EXCELLENT' : metrics.r2 >= 0.6 ? 'MODERATE' : 'POOR';
  const r2Color = metrics.r2 >= 0.85 ? 'text-emerald-400' : metrics.r2 >= 0.6 ? 'text-amber-400' : 'text-red-400';

  // MSE quality
  const mseColor = metrics.mse <= 10 ? 'text-emerald-400' : metrics.mse <= 30 ? 'text-amber-400' : 'text-red-400';

  // Launch convoy handler
  const handleLaunch = () => {
    soundEngine.playClick();
    const rng = seededRandom(9999);
    const actualBase = 0.04 * cargoLoad + 12;
    const actualNoise = gaussianNoise(rng, 0, 1.5);
    const actualFuelNeeded = actualBase + speedPenalty + actualNoise;
    const predictionError = Math.abs(predictedFuel - actualFuelNeeded);

    let score, narrative, healthLoss = 0, fuelLoss = 0;

    if (predictionError < 5) {
      // Great prediction — smooth escape
      score = Math.round(90 + rng() * 10);
      fuelLoss = Math.round(Math.max(10, actualFuelNeeded));
      narrative = `The convoy roars down the highway. Your fuel prediction was dead-on — the engine hums steadily as you blast past the abandoned checkpoints. Zombies claw at the air behind you, but you're already gone. The evacuation centre's floodlights appear on the horizon. You made it. Prediction error: ${predictionError.toFixed(1)}L — textbook regression analysis.`;
    } else if (predictionError < 12) {
      // Moderate error — close call
      score = Math.round(60 + rng() * 15);
      healthLoss = 10;
      fuelLoss = Math.round(Math.max(15, actualFuelNeeded + 15));
      narrative = `The convoy nearly stalls 20 km from safety. Your fuel estimate was off by ${predictionError.toFixed(1)}L — the driver has to coast downhill and siphon reserve tanks. A zombie horde catches up at the last bridge, and a crew member takes a hit before the gates close. You made it, but barely. The regression model needs work.`;
    } else {
      // Large error — truck stalls
      score = Math.round(20 + rng() * 20);
      healthLoss = 30;
      fuelLoss = Math.round(Math.max(25, actualFuelNeeded + 25));
      narrative = `DISASTER. The truck sputters and dies 45 km from the evacuation centre. Your prediction was off by ${predictionError.toFixed(1)}L — a catastrophic miscalculation. The crew fights through a gauntlet of undead on foot, losing supplies and taking heavy casualties. By the time you reach the gates, half the convoy is gone. The regression model failed you.`;
    }

    // Clamp fuel loss to available
    fuelLoss = Math.min(fuelLoss, state.fuel);

    applyPenalty({ health: healthLoss, fuel: fuelLoss });

    const summary = predictionError < 5
      ? `Perfect convoy escape. Prediction error: ${predictionError.toFixed(1)}L. Minimal losses.`
      : predictionError < 12
        ? `Close call. Prediction error: ${predictionError.toFixed(1)}L. Took damage at the bridge.`
        : `Truck stalled. Prediction error: ${predictionError.toFixed(1)}L. Heavy casualties.`;

    setOutcome({
      score,
      narrative,
      healthLoss,
      fuelLoss,
      predictionError: predictionError.toFixed(1),
      actualFuel: actualFuelNeeded.toFixed(1),
      predictedFuelDisplay: predictedFuel.toFixed(1),
      summary,
    });

    setDialogue({
      isOpen: true,
      character: 'jax',
      messages: [
        predictionError < 5
          ? 'Woo! Highway cleared! Engine never even sputtered! Evacuation floodlights in sight — textbook regression math, Commander!'
          : predictionError < 12
          ? 'That was too close! Had to siphon the backup tank on the fly. We took some dings at the bridge, but we made it through the gate!'
          : 'Engine stalled out in the red zone! We had to push through a swarm on foot! We lost good people out there, Commander.',
      ],
    });
  };

  const handleComplete = () => {
    soundEngine.playClick();
    if (!outcome) return;
    completeMission(outcome.score, outcome.summary, { mission: 5, nextMission: 6 });
  };

  // Build combined scatter + line chart data
  // We'll use a ComposedChart with scatter for points and line for regression
  const chartEnabledData = useMemo(() =>
    enabledPoints.map(p => ({ ...p, type: 'enabled' })),
    [enabledPoints]
  );
  const chartDisabledData = useMemo(() =>
    disabledPoints.map(p => ({ ...p, type: 'disabled' })),
    [disabledPoints]
  );

  return (
    <div className="fade-in space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="panel p-4 border-l-4 border-amber-500">
        <div className="flex items-center gap-3 mb-2">
          <Truck className="text-amber-400 w-7 h-7" />
          <h1 className="text-xl font-bold font-mono text-amber-400 tracking-wide">
            MISSION 5: CONVOY TO THE EVACUATION CENTRE
          </h1>
        </div>
        <p className="text-zinc-300 text-sm leading-relaxed">
          Final 120 km highway dash. Fit a <span className="text-amber-400 font-semibold">regression model</span> to
          historical fuel telemetry data to predict fuel consumption based on cargo weight.
          Toggle outliers, adjust the regression line, then choose your cargo load and speed for the escape.
          A bad prediction means the truck stalls in zombie territory.
        </p>
      </div>

      <MissionHint
        missionNumber={5}
        concept="Linear Regression & Outlier Detection"
        tier1Clue="Look at the scatter plot: most points follow a clear upward line, but two red anomaly points sit way above it. Including these sensor spikes will pull your regression line away from the true trend. Think about which points represent real truck behaviour vs. damaged sensor readings."
        tier2Strategy="1) Disable the two red ⚠ ANOMALY points (#21 and #22) using the Outlier Control panel. 2) Click AUTO-FIT to compute the least-squares line on clean data. 3) For convoy config, keep cargo moderate (400–600 kg) and speed around 70–80 km/h. The true relationship is roughly fuel ≈ 0.040 × cargo + 12. A good fit will have R² > 0.85 and MSE < 10."
      />

      {!outcome ? (
        <>
          {/* Main Layout: Chart + Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Scatter Plot — spans 2 columns */}
            <div className="lg:col-span-2 panel p-4">
              <h2 className="text-sm font-mono text-zinc-400 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                FUEL TELEMETRY — 22 RECORDS (2 SENSOR ANOMALIES)
              </h2>

              <ResponsiveContainer width="100%" height={380}>
                <ComposedChart margin={{ top: 10, right: 20, bottom: 25, left: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis
                    type="number"
                    dataKey="cargoWeight"
                    domain={[100, 1350]}
                    tick={{ fill: '#a1a1aa', fontSize: 11, fontFamily: 'monospace' }}
                    label={{ value: 'Cargo Weight (kg)', position: 'bottom', offset: 10, fill: '#71717a', fontSize: 12 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="fuelConsumed"
                    domain={[0, 'auto']}
                    tick={{ fill: '#a1a1aa', fontSize: 11, fontFamily: 'monospace' }}
                    label={{ value: 'Fuel Consumed (L)', angle: -90, position: 'insideLeft', offset: -5, fill: '#71717a', fontSize: 12 }}
                  />
                  <Tooltip content={<ScatterTooltip />} />

                  {/* Residual lines - thin dashed vertical lines */}
                  {residualLines.map(r => (
                    <ReferenceLine
                      key={`res-${r.id}`}
                      segment={[
                        { x: r.x, y: r.actual },
                        { x: r.x, y: r.predicted },
                      ]}
                      stroke="#f59e0b"
                      strokeDasharray="2 2"
                      strokeWidth={1}
                      strokeOpacity={0.5}
                    />
                  ))}

                  {/* Regression line */}
                  <Scatter
                    data={regressionLineData}
                    line={{ stroke: '#10b981', strokeWidth: 2 }}
                    shape={() => null}
                    legendType="none"
                    isAnimationActive={false}
                  />

                  {/* Disabled points (gray) */}
                  <Scatter name="Disabled" data={chartDisabledData} isAnimationActive={false}>
                    {chartDisabledData.map((_, i) => (
                      <Cell key={`d-${i}`} fill="#52525b" opacity={0.4} r={5} />
                    ))}
                  </Scatter>

                  {/* Enabled points (amber, outliers get a ring) */}
                  <Scatter name="Enabled" data={chartEnabledData} isAnimationActive={false}>
                    {chartEnabledData.map((p, i) => (
                      <Cell
                        key={`e-${i}`}
                        fill={p.isOutlier ? '#ef4444' : '#f59e0b'}
                        opacity={0.9}
                        r={p.isOutlier ? 7 : 5}
                      />
                    ))}
                  </Scatter>
                </ComposedChart>
              </ResponsiveContainer>

              <div className="flex items-center justify-center gap-6 mt-1 text-xs font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Data Point
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Outlier
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-zinc-600 inline-block" /> Disabled
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-6 border-t-2 border-emerald-500 inline-block" /> Regression Line
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-6 border-t border-dashed border-amber-500 inline-block" /> Residuals
                </span>
              </div>
            </div>

            {/* Right Column: Sliders + Metrics */}
            <div className="space-y-4">
              {/* Regression Controls */}
              <div className="panel p-4">
                <h2 className="text-sm font-mono text-zinc-400 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  REGRESSION CONTROLS
                </h2>

                {/* Slope Slider */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-zinc-400">Slope (m)</span>
                    <span className="text-amber-400 font-bold text-sm">{slope.toFixed(3)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="0.08"
                    step="0.001"
                    value={slope}
                    onChange={e => {
                      soundEngine.playTick();
                      setSlope(parseFloat(e.target.value));
                    }}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-amber-500 bg-zinc-700"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500 mt-0.5">
                    <span>0.010</span>
                    <span>0.080</span>
                  </div>
                </div>

                {/* Intercept Slider */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-zinc-400">Intercept (b)</span>
                    <span className="text-amber-400 font-bold text-sm">{intercept.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="25"
                    step="0.5"
                    value={intercept}
                    onChange={e => {
                      soundEngine.playTick();
                      setIntercept(parseFloat(e.target.value));
                    }}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-amber-500 bg-zinc-700"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500 mt-0.5">
                    <span>5.0</span>
                    <span>25.0</span>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-500 font-mono mb-3">
                  f(x) = <span className="text-emerald-400">{slope.toFixed(3)}</span>x + <span className="text-emerald-400">{intercept.toFixed(1)}</span>
                </p>

                <button
                  onClick={autoFit}
                  className="btn-secondary w-full py-2 text-xs font-mono font-bold tracking-wider"
                >
                  ⚡ AUTO-FIT (LEAST SQUARES)
                </button>
              </div>

              {/* Live Metrics */}
              <div className="panel p-4">
                <h2 className="text-sm font-mono text-zinc-400 mb-3 flex items-center gap-2">
                  <Crosshair className="w-4 h-4" />
                  MODEL METRICS
                </h2>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">MSE</span>
                    <span className={`font-bold text-sm ${mseColor}`}>{metrics.mse.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-zinc-700 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${metrics.mse <= 10 ? 'bg-emerald-500' : metrics.mse <= 30 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.max(2, Math.min(100, 100 - metrics.mse))}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center mt-2">
                    <span className="text-zinc-400">R²</span>
                    <span className={`font-bold text-sm ${r2Color}`}>
                      {metrics.r2.toFixed(4)} — {r2Quality}
                    </span>
                  </div>
                  <div className="w-full bg-zinc-700 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${metrics.r2 >= 0.85 ? 'bg-emerald-500' : metrics.r2 >= 0.6 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.max(2, Math.min(100, metrics.r2 * 100))}%` }}
                    />
                  </div>

                  <p className="text-[10px] text-zinc-600 mt-1">
                    {enabledPoints.length} points active • {disabledPoints.length} disabled
                  </p>
                </div>
              </div>

              {/* Data Point Toggles */}
              <div className="panel p-4 max-h-52 overflow-y-auto">
                <h2 className="text-sm font-mono text-zinc-400 mb-2 flex items-center gap-2">
                  OUTLIER CONTROL
                </h2>
                <div className="space-y-1">
                  {dataPoints.map(p => (
                    <button
                      key={p.id}
                      onClick={() => togglePoint(p.id)}
                      className={`w-full flex items-center justify-between text-[11px] font-mono px-2 py-1 rounded transition-colors ${
                        p.enabled
                          ? p.isOutlier
                            ? 'bg-red-900/30 border border-red-800/40 text-red-300 hover:bg-red-900/50'
                            : 'bg-zinc-800/60 border border-zinc-700/40 text-zinc-300 hover:bg-zinc-700/60'
                          : 'bg-zinc-900/40 border border-zinc-800/30 text-zinc-600 hover:bg-zinc-800/40'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {p.enabled ? (
                          <ToggleRight className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="w-3.5 h-3.5 text-zinc-600" />
                        )}
                        <span>#{p.id}</span>
                        {p.isOutlier && <span className="text-red-400 text-[9px]">⚠ ANOMALY</span>}
                      </span>
                      <span className={p.enabled ? 'text-zinc-400' : 'text-zinc-700'}>
                        {p.cargoWeight}kg → {p.fuelConsumed}L
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Residuals Bar Chart */}
          <div className="panel p-4">
            <h2 className="text-sm font-mono text-zinc-400 mb-3">
              RESIDUALS (Actual − Predicted)
            </h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={residualsData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis
                  dataKey="id"
                  tick={{ fill: '#a1a1aa', fontSize: 9, fontFamily: 'monospace' }}
                  label={{ value: 'Point ID', position: 'bottom', offset: 0, fill: '#71717a', fontSize: 10 }}
                />
                <YAxis
                  tick={{ fill: '#a1a1aa', fontSize: 9, fontFamily: 'monospace' }}
                  label={{ value: 'Residual (L)', angle: -90, position: 'insideLeft', offset: 5, fill: '#71717a', fontSize: 10 }}
                />
                <Tooltip content={<ResidualTooltip />} />
                <ReferenceLine y={0} stroke="#71717a" strokeWidth={1} />
                <Bar dataKey="residual" isAnimationActive={false}>
                  {residualsData.map((entry, i) => (
                    <Cell
                      key={`bar-${i}`}
                      fill={entry.residual > 0 ? '#f59e0b' : '#3b82f6'}
                      opacity={0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-6 mt-1 text-[10px] font-mono text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-500 inline-block" /> Under-predicted (actual &gt; model)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-500 inline-block" /> Over-predicted (actual &lt; model)
              </span>
            </div>
          </div>

          {/* Survival Decision Panel */}
          <div className="panel p-5 border-l-4 border-emerald-500">
            <div className="flex items-center gap-3 mb-4">
              <Truck className="text-emerald-400 w-6 h-6" />
              <h2 className="text-lg font-bold font-mono text-emerald-400">CONVOY LAUNCH CONFIGURATION</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Sliders */}
              <div className="space-y-5">
                {/* Cargo Load */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-zinc-400">Cargo Load (supplies)</span>
                    <span className="text-amber-400 font-bold text-sm">{cargoLoad} kg</span>
                  </div>
                  <input
                    type="range"
                    min="300"
                    max="1000"
                    step="10"
                    value={cargoLoad}
                    onChange={e => {
                      soundEngine.playTick();
                      setCargoLoad(parseInt(e.target.value));
                    }}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-amber-500 bg-zinc-700"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500 mt-0.5">
                    <span>300 kg (light)</span>
                    <span>1000 kg (full load)</span>
                  </div>
                </div>

                {/* Target Speed */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-zinc-400">Target Speed</span>
                    <span className="text-amber-400 font-bold text-sm">{targetSpeed} km/h</span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="120"
                    step="5"
                    value={targetSpeed}
                    onChange={e => {
                      soundEngine.playTick();
                      setTargetSpeed(parseInt(e.target.value));
                    }}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-amber-500 bg-zinc-700"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500 mt-0.5">
                    <span>60 km/h (fuel efficient)</span>
                    <span>120 km/h (outrun zombies)</span>
                  </div>
                  <p className="text-[10px] text-zinc-600 font-mono mt-1">
                    Speed penalty: +{speedPenalty.toFixed(1)}L fuel (higher speed = more consumption)
                  </p>
                </div>
              </div>

              {/* Right: Fuel Readout */}
              <div className="space-y-3">
                <div className="bg-zinc-900/70 border border-zinc-700/50 rounded p-4 space-y-3">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-zinc-400">Model Formula</span>
                    <span className="text-emerald-400">
                      {slope.toFixed(3)} × {cargoLoad} + {intercept.toFixed(1)} + {speedPenalty.toFixed(1)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm font-mono">
                    <span className="text-zinc-300">Predicted Fuel Needed</span>
                    <span className={`font-bold text-lg ${insufficientFuel ? 'text-red-400' : 'text-emerald-400'}`}>
                      {predictedFuel.toFixed(1)} L
                    </span>
                  </div>

                  <div className="flex justify-between text-sm font-mono">
                    <span className="text-zinc-300 flex items-center gap-1.5">
                      <Fuel className="w-4 h-4" /> Available Fuel
                    </span>
                    <span className="font-bold text-lg text-amber-400">{availableFuel} L</span>
                  </div>

                  {/* Fuel gauge bar */}
                  <div className="relative w-full bg-zinc-800 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-amber-500/80 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, availableFuel)}%` }}
                    />
                    <div
                      className={`absolute top-0 h-full border-r-2 transition-all duration-300 ${insufficientFuel ? 'border-red-400' : 'border-emerald-400'}`}
                      style={{ width: `${Math.min(100, predictedFuel)}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-[9px] font-mono text-zinc-200 font-bold">
                      {predictedFuel.toFixed(0)}L needed / {availableFuel}L available
                    </div>
                  </div>

                  {insufficientFuel && (
                    <div className="flex items-center gap-2 text-red-400 text-xs font-mono font-bold animate-pulse">
                      <AlertTriangle className="w-4 h-4" />
                      INSUFFICIENT FUEL — CONVOY WILL STALL
                    </div>
                  )}
                </div>

                <button
                  onClick={handleLaunch}
                  className="btn-primary w-full py-3 text-sm font-mono font-bold tracking-wider pulse-glow"
                >
                  🚛 LAUNCH CONVOY — LOCK IN PREDICTION
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ────── OUTCOME SCREEN ────── */
        <div className="fade-in space-y-5">
          {/* Score Card */}
          <div className={`panel p-5 border-l-4 ${
            outcome.score >= 80 ? 'border-emerald-500' : outcome.score >= 50 ? 'border-amber-500' : 'border-red-500'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              {outcome.score >= 80 ? (
                <CheckCircle className="w-7 h-7 text-emerald-400" />
              ) : outcome.score >= 50 ? (
                <AlertTriangle className="w-7 h-7 text-amber-400" />
              ) : (
                <XCircle className="w-7 h-7 text-red-400" />
              )}
              <span className="font-mono text-lg font-bold text-zinc-200">
                CONVOY SCORE:{' '}
                <span className={
                  outcome.score >= 80 ? 'text-emerald-400' : outcome.score >= 50 ? 'text-amber-400' : 'text-red-400'
                }>
                  {outcome.score}/100
                </span>
              </span>
            </div>

            <p className="text-sm text-zinc-300 font-mono leading-relaxed mb-4">
              {outcome.narrative}
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-zinc-900/60 border border-zinc-700/50 rounded p-3 text-center">
                <div className="text-xs font-mono text-zinc-500 mb-1">PREDICTED</div>
                <div className="text-lg font-bold font-mono text-amber-400">{outcome.predictedFuelDisplay}L</div>
              </div>
              <div className="bg-zinc-900/60 border border-zinc-700/50 rounded p-3 text-center">
                <div className="text-xs font-mono text-zinc-500 mb-1">ACTUAL</div>
                <div className="text-lg font-bold font-mono text-emerald-400">{outcome.actualFuel}L</div>
              </div>
              <div className="bg-zinc-900/60 border border-zinc-700/50 rounded p-3 text-center">
                <div className="text-xs font-mono text-zinc-500 mb-1">PREDICTION ERROR</div>
                <div className={`text-lg font-bold font-mono ${
                  parseFloat(outcome.predictionError) < 5 ? 'text-emerald-400' : parseFloat(outcome.predictionError) < 12 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {outcome.predictionError}L
                </div>
              </div>
              <div className="bg-zinc-900/60 border border-zinc-700/50 rounded p-3 text-center">
                <div className="text-xs font-mono text-zinc-500 mb-1">LOSSES</div>
                <div className="text-sm font-bold font-mono text-red-400">
                  {outcome.healthLoss > 0 ? `-${outcome.healthLoss} HP` : ''}
                  {outcome.healthLoss > 0 && outcome.fuelLoss > 0 ? ' / ' : ''}
                  {outcome.fuelLoss > 0 ? `-${outcome.fuelLoss} FUEL` : ''}
                  {outcome.healthLoss === 0 && outcome.fuelLoss === 0 ? 'NONE' : ''}
                </div>
              </div>
            </div>
          </div>

          {/* Model Summary */}
          <div className="panel p-4">
            <h3 className="text-sm font-mono text-zinc-400 mb-2">YOUR REGRESSION MODEL</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-500">Slope (m)</span>
                <span className="text-emerald-400">{slope.toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Intercept (b)</span>
                <span className="text-emerald-400">{intercept.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">R²</span>
                <span className={r2Color}>{metrics.r2.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">MSE</span>
                <span className={mseColor}>{metrics.mse.toFixed(2)}</span>
              </div>
            </div>
            <p className="text-[10px] text-zinc-600 font-mono mt-2">
              True relationship: fuel ≈ 0.040 × cargo + 12.0 + noise
              {' '}| Your model: fuel = {slope.toFixed(3)} × cargo + {intercept.toFixed(1)}
            </p>
          </div>

          <button
            onClick={handleComplete}
            className="btn-primary w-full py-3 text-sm font-mono font-bold tracking-wider pulse-glow"
          >
            {outcome.score >= 50 ? '🏁 PROCEED TO EVACUATION CENTRE →' : '💀 CRAWL TO EVACUATION CENTRE →'}
          </button>
        </div>
      )}

      {/* Story Pop-up Dialogue */}
      <DialogueModal
        isOpen={dialogue.isOpen}
        onClose={() => setDialogue(prev => ({ ...prev, isOpen: false }))}
        character={dialogue.character}
        messages={dialogue.messages}
        locationTag="CONVOY FREQ // 156.80 MHz"
      />
    </div>
  );
}
