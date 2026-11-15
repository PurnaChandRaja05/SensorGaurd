import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { soundEngine } from '../utils/soundEngine';
import DialogueModal from '../components/DialogueModal';
import MissionHint from '../components/MissionHint';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  Crosshair,
  Radar,
  ShieldAlert,
  Scan,
  Target,
  Shuffle,
  Layers,
  MousePointerClick,
  Lock,
  AlertTriangle,
  CheckCircle,
  Skull,
  MapPin,
} from 'lucide-react';

// Seeded pseudo-random number generator for stable grid data
function seededRNG(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateGrid(seed = 42) {
  const rng = seededRNG(seed);
  const COLS = 10;
  const ROWS = 5;
  const grid = [];

  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      const isEdge = r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1;
      let zombieCount;
      if (isEdge) {
        // Outer/edge sectors: LOW counts (5-25)
        zombieCount = Math.floor(rng() * 21) + 5;
      } else {
        // Inner/center sectors: HIGH counts (40-90)
        zombieCount = Math.floor(rng() * 51) + 40;
      }
      row.push({
        row: r,
        col: c,
        zombieCount,
        isEdge,
        district: r, // Each row is a district
      });
    }
    grid.push(row);
  }
  return grid;
}

const DISTRICT_NAMES = [
  'North Perimeter',
  'Industrial Zone',
  'Downtown Core',
  'Residential Block',
  'South Perimeter',
];

const SAMPLING_MODES = [
  { id: 'manual', label: 'Manual Selection', icon: MousePointerClick, desc: 'Click sectors individually' },
  { id: 'convenience', label: 'Convenience Sample', icon: MapPin, desc: 'Edge sectors only (biased)' },
  { id: 'stratified', label: 'Stratified Random', icon: Layers, desc: '2 per district (balanced)' },
  { id: 'random', label: 'Simple Random', icon: Shuffle, desc: '10 sectors uniformly random' },
];

function getCellColor(zombieCount) {
  if (zombieCount < 20) return { bg: '#065f46', border: '#10b981', text: '#6ee7b7' }; // green
  if (zombieCount <= 50) return { bg: '#78350f', border: '#f59e0b', text: '#fcd34d' }; // amber
  return { bg: '#7f1d1d', border: '#ef4444', text: '#fca5a5' }; // red
}

function getThreatLabel(zombieCount) {
  if (zombieCount < 20) return 'LOW';
  if (zombieCount <= 50) return 'MED';
  return 'HIGH';
}

export default function Mission1() {
  const { applyPenalty, applyReward, completeMission } = useGame();

  const grid = useMemo(() => generateGrid(42), []);
  const flatGrid = useMemo(() => grid.flat(), [grid]);
  const trueTotal = useMemo(() => flatGrid.reduce((sum, s) => sum + s.zombieCount, 0), [flatGrid]);
  const trueMean = useMemo(() => trueTotal / flatGrid.length, [trueTotal, flatGrid]);

  const [scannedSet, setScannedSet] = useState(new Set());
  const [samplingMode, setSamplingMode] = useState('manual');
  const [estimate, setEstimate] = useState('');
  const [lockedIn, setLockedIn] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const timeoutRef = useRef(null);

  // Story Pop-up Dialogue States
  const [dialogue, setDialogue] = useState({
    isOpen: true,
    character: 'maya',
    messages: [
      'Commander, drone battery is hot and ready. We have enough juice for exactly 10 sector scans across the city.',
      'Be advised: the outer alleys look clear and safe, but that is a deadly convenience bias trap! If we only sample the edge alleys, we will severely underestimate the inner city horde and drive straight into an ambush.',
    ],
  });
  const midMissionAlertTriggered = useRef(false);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleProceed = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (outcome) {
      const summary = `Estimated ${outcome.playerEstimate} zombies (actual: ${trueTotal}). Error: ${(outcome.bias * 100).toFixed(1)}%. Score: ${outcome.score}/100.`;
      completeMission(outcome.score, summary, { mission: 1, nextMission: 2 });
    }
  }, [outcome, trueTotal, completeMission]);
  const [hoveredCell, setHoveredCell] = useState(null);

  const MAX_SCANS = 10;
  const scansUsed = scannedSet.size;
  const scansRemaining = MAX_SCANS - scansUsed;

  // Trigger 5/10 scan mid-mission warning
  useEffect(() => {
    if (scansUsed === 5 && !midMissionAlertTriggered.current && !lockedIn) {
      midMissionAlertTriggered.current = true;
      setDialogue({
        isOpen: true,
        character: 'maya',
        messages: [
          'Scout Maya here — battery at 50%, 5 scans remaining! Look at your district breakdown: are we sampling evenly across the map, or clustered in one quiet zone? Stratified sampling will protect our team!',
        ],
      });
    }
  }, [scansUsed, lockedIn]);

  const scannedSectors = useMemo(
    () => flatGrid.filter((s) => scannedSet.has(`${s.row}-${s.col}`)),
    [flatGrid, scannedSet]
  );

  const sampleMean = useMemo(() => {
    if (scannedSectors.length === 0) return 0;
    return scannedSectors.reduce((sum, s) => sum + s.zombieCount, 0) / scannedSectors.length;
  }, [scannedSectors]);

  const handleScanSector = useCallback(
    (row, col) => {
      if (lockedIn) return;
      if (samplingMode !== 'manual') return;
      const key = `${row}-${col}`;
      if (scannedSet.has(key)) return;
      if (scansUsed >= MAX_SCANS) return;
      soundEngine.playRadarPing();
      setScannedSet((prev) => new Set(prev).add(key));
    },
    [lockedIn, samplingMode, scannedSet, scansUsed]
  );

  const applyAutoSample = useCallback(
    (mode) => {
      if (lockedIn) return;
      soundEngine.playClick();
      setSamplingMode(mode);

      if (mode === 'manual') {
        // Don't reset scans when switching to manual
        return;
      }

      const rng = seededRNG(Date.now() % 100000);
      const newSet = new Set();

      if (mode === 'convenience') {
        // Select 10 edge sectors
        const edgeSectors = flatGrid.filter((s) => s.isEdge);
        const shuffled = [...edgeSectors].sort(() => rng() - 0.5);
        shuffled.slice(0, 10).forEach((s) => newSet.add(`${s.row}-${s.col}`));
      } else if (mode === 'stratified') {
        // Select 2 from each of the 5 districts
        for (let d = 0; d < 5; d++) {
          const districtSectors = flatGrid.filter((s) => s.district === d);
          const shuffled = [...districtSectors].sort(() => rng() - 0.5);
          shuffled.slice(0, 2).forEach((s) => newSet.add(`${s.row}-${s.col}`));
        }
      } else if (mode === 'random') {
        // Select 10 uniformly at random
        const shuffled = [...flatGrid].sort(() => rng() - 0.5);
        shuffled.slice(0, 10).forEach((s) => newSet.add(`${s.row}-${s.col}`));
      }

      setScannedSet(newSet);
    },
    [flatGrid, lockedIn]
  );

  const resetScans = useCallback(() => {
    if (lockedIn) return;
    setScannedSet(new Set());
    setSamplingMode('manual');
  }, [lockedIn]);

  const handleLockIn = useCallback(() => {
    const playerEstimate = parseFloat(estimate);
    if (isNaN(playerEstimate) || playerEstimate < 0) return;
    if (scannedSectors.length === 0) return;

    const bias = Math.abs(playerEstimate - trueTotal) / trueTotal;
    let score, narrative, penaltyObj, rewardObj;

    if (bias < 0.15) {
      score = 95;
      narrative =
        'EXCELLENT RECON. Your drone data closely matched reality. The convoy navigated safely through low-density corridors, avoiding major hordes. Fuel reserves are topped off from an abandoned station you spotted.';
      rewardObj = { fuel: 5 };
    } else if (bias < 0.3) {
      score = 75;
      narrative =
        'DECENT ESTIMATE. Your intel was serviceable — the convoy encountered a few unexpected clusters but nothing the team couldn\'t handle. You made it through without major incident.';
    } else if (bias < 0.5) {
      score = 50;
      narrative =
        'POOR INTEL. Your estimate was way off. The convoy walked into a dense zone you thought was clear. Two fighters got bitten before the group pulled back. Medical supplies depleted treating the wounded.';
      penaltyObj = { health: 15, medicine: 10 };
    } else {
      score = 20;
      narrative =
        'AMBUSH. Your data was dangerously wrong. The convoy drove straight into the largest horde in the city. Massive casualties, vehicles damaged, supplies lost. A catastrophic failure in reconnaissance.';
      penaltyObj = { health: 30, medicine: 20, fuel: 10 };
    }

    setLockedIn(true);
    setOutcome({ score, narrative, bias, playerEstimate, penaltyObj, rewardObj });

    if (penaltyObj) applyPenalty(penaltyObj);
    if (rewardObj) applyReward(rewardObj);

    const summary = `Estimated ${playerEstimate} zombies (actual: ${trueTotal}). Error: ${(bias * 100).toFixed(1)}%. Score: ${score}/100.`;
    timeoutRef.current = setTimeout(() => completeMission(score, summary, { mission: 1, nextMission: 2 }), 4500);
  }, [estimate, scannedSectors, trueTotal, applyPenalty, applyReward, completeMission]);

  // Chart data
  const chartData = useMemo(() => {
    const data = [
      {
        name: 'Sample Mean',
        value: scannedSectors.length > 0 ? Math.round(sampleMean * 10) / 10 : 0,
        fill: '#f59e0b',
      },
      {
        name: 'True Mean',
        value: lockedIn ? Math.round(trueMean * 10) / 10 : 0,
        fill: lockedIn ? '#ef4444' : '#3f3f46',
      },
    ];
    return data;
  }, [sampleMean, trueMean, scannedSectors.length, lockedIn]);

  // District breakdown for scanned data
  const districtStats = useMemo(() => {
    return DISTRICT_NAMES.map((name, i) => {
      const districtScanned = scannedSectors.filter((s) => s.district === i);
      return {
        name: name.split(' ').map(w => w[0]).join(''),
        fullName: name,
        scanned: districtScanned.length,
        avgZombies:
          districtScanned.length > 0
            ? Math.round(districtScanned.reduce((s, x) => s + x.zombieCount, 0) / districtScanned.length)
            : null,
      };
    });
  }, [scannedSectors]);

  return (
    <div className="fade-in space-y-4 pb-8">
      {/* Mission Header */}
      <div className="panel p-4 border-amber-600/30 hud-glow">
        <div className="flex items-center gap-3 mb-2">
          <Radar className="w-6 h-6 text-amber-500" />
          <h2 className="text-xl font-bold text-amber-400 tracking-wider uppercase">
            Mission 1: Safe Zone Recon
          </h2>
        </div>
        <p className="text-zinc-400 text-sm leading-relaxed">
          Use your reconnaissance drone to scan sectors and estimate the total zombie population.
          You have <span className="text-amber-400 font-bold">10 drone scans</span> to survey a 50-sector city grid.
          Choose your sampling strategy wisely — biased data means biased decisions.
        </p>
      </div>

      {/* Interactive Per-Mission Hint */}
      <MissionHint
        missionNumber={1}
        concept="Sampling Bias & Stratified Sampling"
        tier1Clue="Look at where zombies concentrate. Outer edge sectors (District 1 / perimeter alleys) have low counts (5–25 zombies), whereas interior sectors (District 3 / city center) have severe hordes (40–90 zombies). A convenience sample that only probes outer alleys severely underestimates the population."
        tier2Strategy="Do not rely on outer-edge convenience scans. Select 'Stratified Random' to guarantee 2 sectors are sampled from every single district (both outer and inner). Then click 'Use Sample Estimate' (sample mean × 50 sectors) to lock in an accurate, unbiased estimate and avoid an ambush."
      />

      {/* Main Layout: Grid + Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: City Grid */}
        <div className="lg:col-span-2 space-y-4">
          {/* Scan Counter */}
          <div className="panel p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scan className="w-5 h-5 text-amber-500" />
              <span className="text-zinc-300 text-sm">DRONE BATTERY</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {Array.from({ length: MAX_SCANS }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-sm transition-all duration-300 ${
                      i < scansUsed
                        ? 'bg-amber-500 shadow-sm shadow-amber-500/50'
                        : 'bg-zinc-700 border border-zinc-600'
                    }`}
                  />
                ))}
              </div>
              <span className="text-amber-400 font-bold text-sm tabular-nums">
                {scansRemaining}/{MAX_SCANS}
              </span>
            </div>
          </div>

          {/* Sampling Mode Buttons */}
          <div className="panel p-3">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Sampling Strategy</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SAMPLING_MODES.map((mode) => {
                const Icon = mode.icon;
                const isActive = samplingMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    disabled={lockedIn}
                    onClick={() => (mode.id === 'manual' ? setSamplingMode('manual') : applyAutoSample(mode.id))}
                    className={`p-2 rounded-lg border text-left transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      isActive
                        ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                        : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-500 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold truncate">{mode.label}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500">{mode.desc}</span>
                  </button>
                );
              })}
            </div>
            {!lockedIn && scansUsed > 0 && (
              <button
                onClick={resetScans}
                className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2 cursor-pointer transition-colors"
              >
                Reset all scans
              </button>
            )}
          </div>

          {/* The Grid */}
          <div className="panel p-4 border-amber-600/20">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Crosshair className="w-3.5 h-3.5 text-amber-600" />
              TACTICAL GRID — CITY SECTORS
            </div>
            <div className="space-y-1">
              {grid.map((row, rIdx) => (
                <div key={rIdx}>
                  {/* District label */}
                  <div className="text-[10px] text-zinc-600 mb-0.5 pl-1 tracking-widest uppercase">
                    District {rIdx + 1}: {DISTRICT_NAMES[rIdx]}
                  </div>
                  <div className="grid grid-cols-10 gap-1">
                    {row.map((sector) => {
                      const key = `${sector.row}-${sector.col}`;
                      const isScanned = scannedSet.has(key);
                      const isHovered = hoveredCell === key;
                      const colors = getCellColor(sector.zombieCount);
                      const canScan = !lockedIn && samplingMode === 'manual' && !isScanned && scansRemaining > 0;

                      return (
                        <button
                          key={key}
                          onClick={() => handleScanSector(sector.row, sector.col)}
                          onMouseEnter={() => setHoveredCell(key)}
                          onMouseLeave={() => setHoveredCell(null)}
                          disabled={!canScan && !isScanned}
                          className={`relative aspect-square rounded-md border text-center flex flex-col items-center justify-center transition-all duration-300 cursor-pointer disabled:cursor-default ${
                            isScanned
                              ? `border-[${colors.border}]`
                              : isHovered && canScan
                              ? 'border-amber-500 bg-amber-500/10'
                              : 'border-zinc-700/60 bg-zinc-800/90'
                          }`}
                          style={
                            isScanned
                              ? {
                                  backgroundColor: colors.bg,
                                  borderColor: colors.border,
                                  boxShadow: `0 0 8px ${colors.border}30`,
                                }
                              : undefined
                          }
                        >
                          {isScanned ? (
                            <>
                              <span
                                className="text-sm sm:text-base font-bold leading-none"
                                style={{ color: colors.text }}
                              >
                                {sector.zombieCount}
                              </span>
                              <span
                                className="text-[8px] sm:text-[9px] font-bold mt-0.5 opacity-70"
                                style={{ color: colors.text }}
                              >
                                {getThreatLabel(sector.zombieCount)}
                              </span>
                            </>
                          ) : (
                            <span
                              className={`text-lg font-bold ${
                                canScan ? 'text-zinc-500' : 'text-zinc-700'
                              }`}
                            >
                              ?
                            </span>
                          )}
                          {/* Scanning pulse on hover */}
                          {isHovered && canScan && (
                            <div className="absolute inset-0 rounded-md border-2 border-amber-400 animate-pulse pointer-events-none" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 text-[10px] text-zinc-500">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-emerald-800 border border-emerald-500" />
                LOW (&lt;20)
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-amber-900 border border-amber-500" />
                MED (20-50)
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-red-900 border border-red-500" />
                HIGH (&gt;50)
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-zinc-800 border border-zinc-700" />
                UNSCANNED
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Stats + Decision */}
        <div className="space-y-4">
          {/* District Scan Breakdown */}
          <div className="panel p-4">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-amber-600" />
              DISTRICT INTEL
            </div>
            <div className="space-y-2">
              {districtStats.map((d, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs p-2 rounded bg-zinc-800/50 border border-zinc-700/30"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 font-bold w-4">{i + 1}</span>
                    <span className="text-zinc-400 truncate max-w-20 sm:max-w-28" title={d.fullName}>
                      {d.fullName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-500">
                      {d.scanned}/10 scanned
                    </span>
                    {d.avgZombies !== null ? (
                      <span
                        className="font-bold tabular-nums w-8 text-right"
                        style={{ color: getCellColor(d.avgZombies).text }}
                      >
                        ~{d.avgZombies}
                      </span>
                    ) : (
                      <span className="text-zinc-600 w-8 text-right">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Statistics Panel */}
          <div className="panel p-4">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3">SAMPLE ANALYSIS</div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/30">
                <div className="text-[10px] text-zinc-500 uppercase">Sample Mean</div>
                <div className="text-2xl font-bold text-amber-400 tabular-nums">
                  {scannedSectors.length > 0 ? sampleMean.toFixed(1) : '—'}
                </div>
                <div className="text-[10px] text-zinc-600">{scannedSectors.length} sectors scanned</div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/30">
                <div className="text-[10px] text-zinc-500 uppercase">True Mean</div>
                <div className="text-2xl font-bold tabular-nums">
                  {lockedIn ? (
                    <span className="text-red-400">{trueMean.toFixed(1)}</span>
                  ) : (
                    <span className="text-zinc-600">???</span>
                  )}
                </div>
                <div className="text-[10px] text-zinc-600">
                  {lockedIn ? `${flatGrid.length} sectors total` : 'Locked until decision'}
                </div>
              </div>
            </div>

            {lockedIn && outcome && (
              <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/30 mb-4">
                <div className="text-[10px] text-zinc-500 uppercase">Estimation Error</div>
                <div
                  className={`text-xl font-bold tabular-nums ${
                    outcome.bias < 0.15
                      ? 'text-emerald-400'
                      : outcome.bias < 0.3
                      ? 'text-amber-400'
                      : outcome.bias < 0.5
                      ? 'text-orange-400'
                      : 'text-red-400'
                  }`}
                >
                  {(outcome.bias * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] text-zinc-600">
                  |{outcome.playerEstimate} - {trueTotal}| / {trueTotal}
                </div>
              </div>
            )}

            {/* Bar Chart */}
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#a1a1aa', fontSize: 11, fontFamily: 'monospace' }}
                    axisLine={{ stroke: '#3f3f46' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
                    axisLine={{ stroke: '#3f3f46' }}
                    tickLine={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #3f3f46',
                      borderRadius: 8,
                      fontFamily: 'monospace',
                      fontSize: 12,
                    }}
                    labelStyle={{ color: '#a1a1aa' }}
                    formatter={(value, name) => {
                      if (name === 'True Mean' && !lockedIn) return ['???', name];
                      return [value, name];
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
                    {chartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                  {lockedIn && (
                    <ReferenceLine
                      y={trueMean}
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: `True: ${trueMean.toFixed(1)}`,
                        position: 'right',
                        fill: '#ef4444',
                        fontSize: 10,
                        fontFamily: 'monospace',
                      }}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
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
                  Based on your scans, estimate the <span className="text-amber-400 font-bold">TOTAL</span> zombie
                  count across all 50 sectors.
                </p>
                <div className="flex gap-2 mb-2">
                  <input
                    type="number"
                    min={0}
                    max={9999}
                    value={estimate}
                    onChange={(e) => setEstimate(e.target.value)}
                    placeholder="Enter total estimate..."
                    className="flex-1 bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-amber-400 font-bold placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 tabular-nums"
                  />
                </div>
                {scannedSectors.length > 0 && (
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-3">
                    <span>
                      Hint: Sample mean is {sampleMean.toFixed(1)} × 50 ={' '}
                      <span className="text-zinc-300 font-bold">{Math.round(sampleMean * 50)}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setEstimate(String(Math.round(sampleMean * 50)))}
                      className="text-amber-400 hover:text-amber-300 underline font-mono cursor-pointer ml-2"
                    >
                      Use Sample Estimate
                    </button>
                  </div>
                )}
                <button
                  onClick={handleLockIn}
                  disabled={!estimate || scannedSectors.length === 0}
                  className="btn-danger w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Lock className="w-4 h-4" />
                  LOCK IN ESTIMATE
                </button>
                {scannedSectors.length === 0 && (
                  <p className="text-[10px] text-amber-600 mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Scan at least one sector before deciding
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
                        ? 'Excellent Recon'
                        : outcome.score >= 70
                        ? 'Decent Estimate'
                        : outcome.score >= 40
                        ? 'Poor Intel'
                        : 'Ambush!'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">{outcome.narrative}</p>
                </div>

                {/* Result Summary */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-zinc-800/50 rounded p-2">
                    <div className="text-zinc-500">Your Estimate</div>
                    <div className="text-amber-400 font-bold tabular-nums">{outcome.playerEstimate}</div>
                  </div>
                  <div className="bg-zinc-800/50 rounded p-2">
                    <div className="text-zinc-500">Actual Total</div>
                    <div className="text-red-400 font-bold tabular-nums">{trueTotal}</div>
                  </div>
                  <div className="bg-zinc-800/50 rounded p-2">
                    <div className="text-zinc-500">Score</div>
                    <div className="text-amber-400 font-bold tabular-nums">{outcome.score}/100</div>
                  </div>
                  <div className="bg-zinc-800/50 rounded p-2">
                    <div className="text-zinc-500">Impact</div>
                    <div className="text-zinc-300 font-bold text-[10px]">
                      {outcome.rewardObj
                        ? '+5 Fuel'
                        : outcome.penaltyObj
                        ? Object.entries(outcome.penaltyObj)
                            .map(([k, v]) => `-${v} ${k}`)
                            .join(', ')
                        : 'No change'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleProceed}
                  className="btn-primary w-full py-2.5 text-xs font-mono font-bold tracking-wider mt-2 cursor-pointer pulse-glow"
                >
                  PROCEED TO NEXT LEVEL (MISSION 2) →
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
        locationTag="SECTOR RECON // DRONE FREQ 2.4 GHz"
      />
    </div>
  );
}
