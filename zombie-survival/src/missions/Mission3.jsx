import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { soundEngine } from '../utils/soundEngine';
import DialogueModal from '../components/DialogueModal';
import MissionHint from '../components/MissionHint';
import { Crosshair, RotateCcw, Play, FastForward, Lock, MapPin, Fuel } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

/* ── Deterministic pseudo-random (mulberry32) ──────────────────────── */
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Box-Muller for normal distribution */
function gaussianPair(rng) {
  const u1 = rng();
  const u2 = rng();
  const z0 = Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
  const z1 = Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.sin(2 * Math.PI * u2);
  return [z0, z1];
}

function clampCoord(v) {
  return Math.max(2, Math.min(98, v));
}

/* ── Euclidean helpers ─────────────────────────────────────────────── */
function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function distSq(a, b) {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

/* ── Centroid colours ──────────────────────────────────────────────── */
const CENTROID_COLORS = ['#ef4444', '#3b82f6', '#22c55e']; // red, blue, green
const POINT_COLORS = ['#fca5a5', '#93c5fd', '#86efac']; // lighter variants
const CENTROID_LABELS = ['Alpha', 'Bravo', 'Charlie'];

/* ── SVG dimensions ────────────────────────────────────────────────── */
const SVG_W = 600;
const SVG_H = 500;
const PAD = 0; // we use viewBox coords 0-100

export default function Mission3() {
  const { applyPenalty, completeMission } = useGame();

  /* ── Generate 60 supply drops (deterministic) ───────────────────── */
  const supplyDrops = useMemo(() => {
    const rng = mulberry32(42);
    const centers = [
      { x: 20, y: 25 },
      { x: 70, y: 30 },
      { x: 45, y: 75 },
    ];
    const STD = 12;
    const points = [];
    for (let c = 0; c < 3; c++) {
      for (let i = 0; i < 20; i++) {
        const [gx, gy] = gaussianPair(rng);
        points.push({
          id: points.length,
          x: clampCoord(centers[c].x + gx * STD),
          y: clampCoord(centers[c].y + gy * STD),
        });
      }
    }
    return points;
  }, []);

  /* ── State ───────────────────────────────────────────────────────── */
  const [centroids, setCentroids] = useState([]); // [{x,y}, ...]
  const [iteration, setIteration] = useState(0);
  const [wcssHistory, setWcssHistory] = useState([]);
  const [locked, setLocked] = useState(false);
  const [dragging, setDragging] = useState(null); // index of centroid being dragged
  const [converged, setConverged] = useState(false);
  const [showOutcome, setShowOutcome] = useState(false);
  const [completionResult, setCompletionResult] = useState(null);
  const svgRef = useRef(null);
  const runningRef = useRef(false);
  const timeoutRef = useRef(null);
  const convergedAlertTriggered = useRef(false);

  // Story Dialogue State
  const [dialogue, setDialogue] = useState({
    isOpen: true,
    character: 'cole',
    messages: [
      'Ground command, this is Pilot Cole on Air-Drop 7! We dropped 60 emergency crates over the industrial zone, but crosswinds scattered them across the map.',
      'You only have enough fuel to deploy 3 recovery camps. Place your 3 camp centroids near dense clusters, then run the K-Means algorithm. Every extra kilometer our runners sprint burns vital fuel!',
    ],
  });

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  /* ── Assign points to nearest centroid ──────────────────────────── */
  const assignments = useMemo(() => {
    if (centroids.length < 3) return supplyDrops.map(() => -1);
    return supplyDrops.map((p) => {
      let best = 0;
      let bestD = distSq(p, centroids[0]);
      for (let c = 1; c < centroids.length; c++) {
        const d = distSq(p, centroids[c]);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      return best;
    });
  }, [centroids, supplyDrops]);

  /* ── WCSS ────────────────────────────────────────────────────────── */
  const wcss = useMemo(() => {
    if (centroids.length < 3) return null;
    let total = 0;
    supplyDrops.forEach((p, i) => {
      total += distSq(p, centroids[assignments[i]]);
    });
    return Math.round(total);
  }, [centroids, assignments, supplyDrops]);

  /* ── SVG mouse → data coords ────────────────────────────────────── */
  const svgToData = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return { x: clampCoord(x), y: clampCoord(y) };
  }, []);

  /* ── Place centroid on click ────────────────────────────────────── */
  const handleMapClick = useCallback(
    (e) => {
      if (locked || dragging !== null) return;
      if (centroids.length >= 3) return;
      const pt = svgToData(e);
      if (!pt) return;
      soundEngine.playRadarPing();
      const next = [...centroids, pt];
      setCentroids(next);
      setIteration(0);
      setWcssHistory([]);
      setConverged(false);
    },
    [centroids, locked, dragging, svgToData]
  );

  /* ── Dragging centroids ─────────────────────────────────────────── */
  const handleCentroidMouseDown = useCallback(
    (e, idx) => {
      if (locked) return;
      e.stopPropagation();
      setDragging(idx);
    },
    [locked]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (dragging === null) return;
      const pt = svgToData(e);
      if (!pt) return;
      setCentroids((prev) => {
        const next = [...prev];
        next[dragging] = pt;
        return next;
      });
    },
    [dragging, svgToData]
  );

  const handleMouseUp = useCallback(() => {
    if (dragging !== null) {
      setDragging(null);
      // Reset iterations when user manually repositions
      if (iteration > 0) {
        setIteration(0);
        setWcssHistory([]);
        setConverged(false);
      }
    }
  }, [dragging, iteration]);

  /* ── One K-Means step ───────────────────────────────────────────── */
  const stepKMeans = useCallback(() => {
    if (centroids.length < 3 || converged) return false;
    soundEngine.playTick();

    // 1. Assign each point to nearest centroid (already done via assignments memo,
    //    but we compute fresh here with current centroids)
    const assign = supplyDrops.map((p) => {
      let best = 0;
      let bestD = distSq(p, centroids[0]);
      for (let c = 1; c < centroids.length; c++) {
        const d = distSq(p, centroids[c]);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      return best;
    });

    // 2. Compute new centroid positions (mean of assigned points)
    const sums = [
      { sx: 0, sy: 0, n: 0 },
      { sx: 0, sy: 0, n: 0 },
      { sx: 0, sy: 0, n: 0 },
    ];
    supplyDrops.forEach((p, i) => {
      const c = assign[i];
      sums[c].sx += p.x;
      sums[c].sy += p.y;
      sums[c].n += 1;
    });

    const newCentroids = sums.map((s, ci) => {
      if (s.n === 0) return centroids[ci]; // keep if no points assigned
      return { x: s.sx / s.n, y: s.sy / s.n };
    });

    // 3. Check convergence
    let maxShift = 0;
    for (let c = 0; c < 3; c++) {
      maxShift = Math.max(maxShift, dist(centroids[c], newCentroids[c]));
    }

    const newIter = iteration + 1;
    const isConverged = maxShift < 0.5 || newIter >= 20;

    // 4. Compute WCSS for this iteration
    let newWcss = 0;
    supplyDrops.forEach((p, i) => {
      newWcss += distSq(p, newCentroids[assign[i]]);
    });
    newWcss = Math.round(newWcss);

    setCentroids(newCentroids);
    setIteration(newIter);
    setConverged(isConverged);
    setWcssHistory((prev) => [...prev, { iter: newIter, wcss: newWcss }]);

    return !isConverged;
  }, [centroids, iteration, converged, supplyDrops]);

  /* ── Run to convergence ─────────────────────────────────────────── */
  const runToConvergence = useCallback(() => {
    if (centroids.length < 3 || converged || runningRef.current) return;
    runningRef.current = true;

    // We'll do a stepwise animation using timeouts
    let currentCentroids = [...centroids];
    let currentIter = iteration;
    let history = [...wcssHistory];
    let isConverged = false;

    const animateStep = () => {
      if (isConverged || currentIter >= 20) {
        runningRef.current = false;
        return;
      }

      // Assign
      const assign = supplyDrops.map((p) => {
        let best = 0;
        let bestD = distSq(p, currentCentroids[0]);
        for (let c = 1; c < currentCentroids.length; c++) {
          const d = distSq(p, currentCentroids[c]);
          if (d < bestD) {
            bestD = d;
            best = c;
          }
        }
        return best;
      });

      // Means
      const sums = [
        { sx: 0, sy: 0, n: 0 },
        { sx: 0, sy: 0, n: 0 },
        { sx: 0, sy: 0, n: 0 },
      ];
      supplyDrops.forEach((p, i) => {
        const c = assign[i];
        sums[c].sx += p.x;
        sums[c].sy += p.y;
        sums[c].n += 1;
      });
      const newCentroids = sums.map((s, ci) => {
        if (s.n === 0) return currentCentroids[ci];
        return { x: s.sx / s.n, y: s.sy / s.n };
      });

      let maxShift = 0;
      for (let c = 0; c < 3; c++) {
        maxShift = Math.max(maxShift, dist(currentCentroids[c], newCentroids[c]));
      }

      currentIter += 1;
      isConverged = maxShift < 0.5 || currentIter >= 20;

      let newWcss = 0;
      supplyDrops.forEach((p, i) => {
        newWcss += distSq(p, newCentroids[assign[i]]);
      });
      newWcss = Math.round(newWcss);

      currentCentroids = newCentroids;
      history = [...history, { iter: currentIter, wcss: newWcss }];

      setCentroids([...currentCentroids]);
      setIteration(currentIter);
      setConverged(isConverged);
      setWcssHistory([...history]);

      if (!isConverged) {
        setTimeout(animateStep, 350);
      } else {
        runningRef.current = false;
      }
    };

    setTimeout(animateStep, 100);
  }, [centroids, iteration, converged, wcssHistory, supplyDrops]);

  useEffect(() => {
    if (converged && !convergedAlertTriggered.current && !locked) {
      convergedAlertTriggered.current = true;
      soundEngine.playSuccessChime();
      setDialogue({
        isOpen: true,
        character: 'cole',
        messages: [
          `Telemetry locked! Centroids have stabilized at WCSS: ${wcss?.toLocaleString()}. The camps are in optimal geometric positions — lock them in to dispatch our recovery runners!`,
        ],
      });
    }
  }, [converged, wcss, locked]);

  /* ── Reset ──────────────────────────────────────────────────────── */
  const resetCentroids = useCallback(() => {
    if (locked) return;
    setCentroids([]);
    setIteration(0);
    setWcssHistory([]);
    setConverged(false);
    runningRef.current = false;
  }, [locked]);

  /* ── Auto Place Centroids ───────────────────────────────────────── */
  const autoPlaceCentroids = useCallback(() => {
    if (locked) return;
    setCentroids([
      { x: 25, y: 30 },
      { x: 68, y: 35 },
      { x: 48, y: 70 },
    ]);
    setIteration(0);
    setWcssHistory([]);
    setConverged(false);
    runningRef.current = false;
  }, [locked]);

  /* ── Proceed to Mission 4 ───────────────────────────────────────── */
  const handleProceedToMission4 = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (completionResult) {
      completeMission(completionResult.score, completionResult.summary, { mission: 3, nextMission: 4 });
    }
  }, [completionResult, completeMission]);

  /* ── Lock in decision ───────────────────────────────────────────── */
  const handleLockIn = useCallback(() => {
    if (wcss === null || iteration < 1) return;
    setLocked(true);
    setShowOutcome(true);

    let fuelLoss, healthLoss = 0, score, narrative;

    if (wcss < 3000) {
      fuelLoss = 5;
      score = 95;
      narrative =
        'Outstanding triangulation. Your camp placements minimize travel distance — fuel reserves barely touched. Every crate collected with surgical efficiency.';
    } else if (wcss < 5000) {
      fuelLoss = 12;
      score = 75;
      narrative =
        'Solid clustering. Camps are well-positioned, though a few outlier crates cost extra fuel. Most supplies secured quickly.';
    } else if (wcss < 8000) {
      fuelLoss = 25;
      score = 50;
      narrative =
        'Camps are spread too thin. Runners burn through fuel zig-zagging between distant drops. Half your diesel is gone.';
    } else {
      fuelLoss = 40;
      healthLoss = 10;
      score = 25;
      narrative =
        'Disastrous placement. Runners exhausted, fuel tanks drained. A team member collapses from exposure during the long retrieval routes.';
    }

    applyPenalty({ fuel: fuelLoss, health: healthLoss });

    const summaryText = `WCSS: ${wcss} | Fuel cost: -${fuelLoss} | ${wcss < 3000 ? 'Optimal clustering' : wcss < 5000 ? 'Good clustering' : wcss < 8000 ? 'Suboptimal clustering' : 'Poor clustering'}`;
    setCompletionResult({ score, summary: summaryText, fuelLoss, narrative });

    timeoutRef.current = setTimeout(() => {
      completeMission(score, summaryText, { mission: 3, nextMission: 4 });
    }, 4500);
  }, [wcss, iteration, applyPenalty, completeMission]);

  /* ── Outcome display data ───────────────────────────────────────── */
  const outcomeData = useMemo(() => {
    if (wcss === null) return null;
    if (wcss < 3000) return { label: 'OPTIMAL', color: 'text-emerald-400', fuelLoss: 5, score: 95 };
    if (wcss < 5000) return { label: 'GOOD', color: 'text-blue-400', fuelLoss: 12, score: 75 };
    if (wcss < 8000) return { label: 'SUBOPTIMAL', color: 'text-amber-400', fuelLoss: 25, score: 50 };
    return { label: 'POOR', color: 'text-red-400', fuelLoss: 40, score: 25 };
  }, [wcss]);

  /* ── Grid lines for the map ─────────────────────────────────────── */
  const gridLines = useMemo(() => {
    const lines = [];
    for (let i = 0; i <= 100; i += 10) {
      lines.push(
        <line key={`gv${i}`} x1={i} y1={0} x2={i} y2={100} stroke="#3f3f46" strokeWidth={0.2} />,
        <line key={`gh${i}`} x1={0} y1={i} x2={100} y2={i} stroke="#3f3f46" strokeWidth={0.2} />
      );
    }
    return lines;
  }, []);

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="fade-in max-w-6xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="panel p-4">
        <div className="flex items-center gap-3 mb-1">
          <Crosshair className="w-6 h-6 text-amber-400" />
          <h1 className="text-xl font-bold text-amber-400 tracking-wide">
            MISSION 3: SUPPLY DROP TRIANGULATION
          </h1>
        </div>
        <p className="text-zinc-400 text-sm">
          Three air-drop crates scattered 60 supply packages across the sector.
          Place 3 camp centroids, then run K-Means clustering to minimize travel distance and conserve fuel.
        </p>
      </div>

      {/* Interactive Per-Mission Hint */}
      <MissionHint
        missionNumber={3}
        concept="K-Means Clustering & Inertia (WCSS)"
        tier1Clue="Each supply crate is hauled to its closest camp by Euclidean distance. If camps are placed haphazardly, runners travel excessive distances, burning through scarce fuel reserves. Centroids must converge to the geometric centers of the 3 drop clouds."
        tier2Strategy="Click 'Auto-Place 3 Centroids' (or place one in each of the three visual clusters: top-left, top-right, bottom-center). Click 'Step K-Means' or 'Run to Convergence' until centroids stabilize and WCSS drops below 3,000. Then lock in camp locations to minimize fuel consumption."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Left column: Map ────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="panel p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500 uppercase tracking-widest">
                Tactical Overhead — Sector Map
              </span>
              <span className="text-xs text-zinc-500">
                {centroids.length < 3
                  ? `Click to place centroid (${centroids.length}/3)`
                  : 'Drag centroids to reposition'}
              </span>
            </div>

            <svg
              ref={svgRef}
              viewBox="0 0 100 100"
              width={SVG_W}
              height={SVG_H}
              className="w-full h-auto rounded border border-zinc-700/50 cursor-crosshair select-none"
              style={{ background: 'linear-gradient(135deg, #18181b 0%, #0f0f12 100%)' }}
              onClick={handleMapClick}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Grid */}
              {gridLines}

              {/* Sector border glow */}
              <rect
                x={0.5}
                y={0.5}
                width={99}
                height={99}
                fill="none"
                stroke="#f59e0b"
                strokeWidth={0.3}
                opacity={0.3}
              />

              {/* Connection lines (only when 3 centroids placed) */}
              {centroids.length === 3 &&
                supplyDrops.map((p, i) => {
                  const ci = assignments[i];
                  if (ci < 0) return null;
                  return (
                    <line
                      key={`ln${i}`}
                      x1={p.x}
                      y1={p.y}
                      x2={centroids[ci].x}
                      y2={centroids[ci].y}
                      stroke={CENTROID_COLORS[ci]}
                      strokeWidth={0.15}
                      strokeDasharray="0.5,0.5"
                      opacity={0.25}
                    />
                  );
                })}

              {/* Supply drop points */}
              {supplyDrops.map((p, i) => {
                const ci = assignments[i];
                const color = ci >= 0 ? POINT_COLORS[ci] : '#f59e0b';
                return (
                  <circle
                    key={`pt${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={0.9}
                    fill={color}
                    opacity={0.85}
                    stroke={ci >= 0 ? CENTROID_COLORS[ci] : '#d97706'}
                    strokeWidth={0.2}
                  />
                );
              })}

              {/* Centroids */}
              {centroids.map((c, ci) => (
                <g
                  key={`cent${ci}`}
                  onMouseDown={(e) => handleCentroidMouseDown(e, ci)}
                  style={{ cursor: locked ? 'default' : 'grab' }}
                >
                  {/* Glow ring */}
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={3}
                    fill="none"
                    stroke={CENTROID_COLORS[ci]}
                    strokeWidth={0.3}
                    opacity={0.4}
                    className="pulse-glow"
                  />
                  {/* Diamond shape */}
                  <polygon
                    points={`${c.x},${c.y - 2.2} ${c.x + 1.6},${c.y} ${c.x},${c.y + 2.2} ${c.x - 1.6},${c.y}`}
                    fill={CENTROID_COLORS[ci]}
                    stroke="#fff"
                    strokeWidth={0.25}
                    style={{
                      transition: dragging === ci ? 'none' : 'all 0.3s ease-out',
                    }}
                  />
                  {/* Label */}
                  <text
                    x={c.x}
                    y={c.y - 3.5}
                    textAnchor="middle"
                    fill={CENTROID_COLORS[ci]}
                    fontSize={2}
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {CENTROID_LABELS[ci]}
                  </text>
                </g>
              ))}

              {/* Placement guide when < 3 centroids */}
              {centroids.length < 3 && (
                <text x={50} y={96} textAnchor="middle" fill="#71717a" fontSize={2} fontFamily="monospace">
                  ▲ CLICK TO PLACE CAMP {CENTROID_LABELS[centroids.length]}
                </text>
              )}
            </svg>
          </div>
        </div>

        {/* ── Right column: Controls & Analytics ──────────────────── */}
        <div className="space-y-4">
          {/* K-Means Controls */}
          <div className="panel p-4 space-y-3">
            <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4" /> K-Means Controls
            </h2>

            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Iteration:</span>
              <span className="text-amber-300 font-bold text-lg">{iteration}</span>
            </div>

            {converged && (
              <div className="text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded px-2 py-1 text-center">
                ✓ CONVERGED — Centroids stable
              </div>
            )}

            <button
              onClick={stepKMeans}
              disabled={centroids.length < 3 || converged || locked}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" /> Step K-Means
            </button>

            <button
              onClick={runToConvergence}
              disabled={centroids.length < 3 || converged || locked}
              className="btn-secondary w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FastForward className="w-4 h-4" /> Run to Convergence
            </button>

            <button
              onClick={autoPlaceCentroids}
              disabled={locked}
              className="btn-secondary w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-amber-300"
            >
              <MapPin className="w-4 h-4 text-amber-400" /> Auto-Place 3 Centroids
            </button>

            <button
              onClick={resetCentroids}
              disabled={locked}
              className="btn-secondary w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" /> Reset Centroids
            </button>
          </div>

          {/* WCSS Display */}
          <div className="panel p-4 space-y-3">
            <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
              WCSS — Within-Cluster Sum of Squares
            </h2>

            <div className="text-center">
              <span className="text-3xl font-bold text-amber-300 tabular-nums">
                {wcss !== null ? wcss.toLocaleString() : '---'}
              </span>
              <p className="text-xs text-zinc-500 mt-1">Lower is better — minimizes fuel cost</p>
            </div>

            {/* Fuel cost preview */}
            {wcss !== null && !locked && (
              <div className="text-xs text-zinc-400 flex items-center gap-1 justify-center">
                <Fuel className="w-3 h-3" />
                Estimated fuel cost:{' '}
                <span className={outcomeData?.color || 'text-zinc-300'}>
                  -{outcomeData?.fuelLoss} fuel
                </span>
                <span className="text-zinc-600 ml-1">({outcomeData?.label})</span>
              </div>
            )}

            {/* WCSS Chart */}
            {wcssHistory.length > 0 && (
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={wcssHistory} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="iter"
                      tick={{ fill: '#71717a', fontSize: 10 }}
                      axisLine={{ stroke: '#3f3f46' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#71717a', fontSize: 10 }}
                      axisLine={{ stroke: '#3f3f46' }}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#18181b',
                        border: '1px solid #3f3f46',
                        borderRadius: '6px',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                      }}
                      labelFormatter={(l) => `Iteration ${l}`}
                      formatter={(v) => [v.toLocaleString(), 'WCSS']}
                    />
                    <Line
                      type="monotone"
                      dataKey="wcss"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ fill: '#f59e0b', r: 3 }}
                      activeDot={{ r: 5, fill: '#fbbf24' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Cluster Stats */}
          {centroids.length === 3 && (
            <div className="panel p-4 space-y-2">
              <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Cluster Sizes</h2>
              {[0, 1, 2].map((ci) => {
                const count = assignments.filter((a) => a === ci).length;
                return (
                  <div key={ci} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: CENTROID_COLORS[ci] }}
                    />
                    <span className="text-zinc-400 w-14">{CENTROID_LABELS[ci]}</span>
                    <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${(count / 60) * 100}%`,
                          backgroundColor: CENTROID_COLORS[ci],
                        }}
                      />
                    </div>
                    <span className="text-zinc-300 w-8 text-right font-bold">{count}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Lock In Button */}
          <button
            onClick={handleLockIn}
            disabled={iteration < 1 || locked}
            className="btn-danger w-full flex items-center justify-center gap-2 text-base disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Lock className="w-5 h-5" /> LOCK IN CAMP LOCATIONS
          </button>
        </div>
      </div>

      {/* Outcome Overlay */}
      {showOutcome && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 fade-in">
          <div className="panel p-8 max-w-lg mx-4 text-center space-y-4">
            <h2 className="text-2xl font-bold text-amber-400">CAMP LOCATIONS CONFIRMED</h2>
            <div className={`text-4xl font-bold ${outcomeData?.color}`}>{outcomeData?.label}</div>
            <div className="text-zinc-400 text-sm leading-relaxed">
              {wcss < 3000
                ? 'Outstanding triangulation. Your camp placements minimize travel distance — fuel reserves barely touched. Every crate collected with surgical efficiency.'
                : wcss < 5000
                  ? 'Solid clustering. Camps are well-positioned, though a few outlier crates cost extra fuel. Most supplies secured quickly.'
                  : wcss < 8000
                    ? 'Camps are spread too thin. Runners burn through fuel zig-zagging between distant drops. Half your diesel is gone.'
                    : 'Disastrous placement. Runners exhausted, fuel tanks drained. A team member collapses from exposure during the long retrieval routes.'}
            </div>
            <div className="flex items-center justify-center gap-6 text-sm">
              <div>
                <span className="text-zinc-500">WCSS:</span>{' '}
                <span className="text-amber-300 font-bold">{wcss?.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-zinc-500">Fuel:</span>{' '}
                <span className="text-red-400 font-bold">-{outcomeData?.fuelLoss}</span>
              </div>
              <div>
                <span className="text-zinc-500">Score:</span>{' '}
                <span className="text-emerald-400 font-bold">{outcomeData?.score}</span>
              </div>
            </div>
            <button
              onClick={handleProceedToMission4}
              className="btn-primary w-full py-3 text-sm font-mono font-bold tracking-wider mt-4 cursor-pointer pulse-glow"
            >
              PROCEED TO NEXT LEVEL (MISSION 4) →
            </button>
            <div className="text-xs text-zinc-600 pulse-glow">Auto-advancing in a few seconds or click above</div>
          </div>
        </div>
      )}

      {/* Story Pop-up Dialogue */}
      <DialogueModal
        isOpen={dialogue.isOpen}
        onClose={() => setDialogue((prev) => ({ ...prev, isOpen: false }))}
        character={dialogue.character}
        messages={dialogue.messages}
        locationTag="AIR-DROP TELEMETRY // FREQ 121.50 MHz"
      />
    </div>
  );
}
