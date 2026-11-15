import { useMemo } from 'react';

export default function ZombieBackground() {
  // Generate random ash particles
  const particles = useMemo(() => {
    return Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      left: `${(i * 4.3 + 3) % 100}%`,
      size: `${Math.max(2, (i % 3) + 1.5)}px`,
      duration: `${14 + (i % 7) * 3}s`,
      delay: `${-(i * 1.8)}s`,
      opacity: (i % 4 === 0 ? 0.35 : 0.2).toString(),
    }));
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-radial from-zinc-900/40 via-zinc-950 to-black"
    >
      {/* ── 1. Sweeping Watchtower Searchlight ────────────────────────── */}
      <div className="absolute top-0 right-1/4 w-[800px] h-[600px] origin-top opacity-30">
        <div
          className="w-full h-full bg-gradient-to-b from-amber-500/10 via-emerald-500/5 to-transparent blur-2xl transform"
          style={{
            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
            animation: 'searchlight-sweep 24s ease-in-out infinite',
            transformOrigin: 'top center',
          }}
        />
      </div>

      {/* ── 2. Distant Ruined City Skyline ────────────────────────────── */}
      <svg
        className="absolute bottom-12 left-0 right-0 w-full h-36 opacity-25 text-zinc-900"
        viewBox="0 0 1440 240"
        preserveAspectRatio="none"
        fill="currentColor"
      >
        {/* Buildings */}
        <polygon points="0,240 0,160 40,160 40,180 80,180 80,120 120,120 120,150 160,150 160,100 170,80 180,100 210,100 210,240" />
        <polygon points="210,240 210,140 260,140 280,70 300,140 340,140 340,190 380,190 380,110 430,110 430,240" />
        <polygon points="430,240 430,160 470,160 490,90 510,90 520,60 530,90 560,90 560,170 610,170 610,240" />
        <polygon points="610,240 610,130 650,130 670,100 700,100 700,150 740,150 750,70 760,150 810,150 810,240" />
        <polygon points="810,240 810,170 850,170 870,110 910,110 910,140 960,140 980,80 1000,140 1050,140 1050,240" />
        <polygon points="1050,240 1050,120 1090,120 1100,50 1110,120 1160,120 1160,180 1210,180 1210,100 1260,100 1260,240" />
        <polygon points="1260,240 1260,150 1310,150 1330,85 1360,85 1370,140 1440,140 1440,240" />

        {/* Radio Tower / Red Beacons */}
        <line x1="755" y1="70" x2="755" y2="40" stroke="#ef4444" strokeWidth="2" opacity="0.6" />
        <circle cx="755" cy="40" r="2.5" fill="#ef4444" className="animate-pulse" />
        <line x1="1105" y1="50" x2="1105" y2="25" stroke="#ef4444" strokeWidth="2" opacity="0.6" />
        <circle cx="1105" cy="25" r="2.5" fill="#ef4444" className="animate-pulse" />
      </svg>

      {/* ── 3. Barbed Wire & Rubble Horizon Line ─────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black via-zinc-950 to-transparent border-t border-zinc-900/80">
        {/* Watchtower spotlight base */}
        <div className="absolute bottom-4 left-1/3 w-32 h-1 bg-amber-500/10 blur-sm" />
      </div>

      {/* ── 4. Shambling Zombie Silhouettes ─────────────────────────── */}
      {/* Zombie 1: Dragging limb, slow runner */}
      <div
        className="absolute bottom-4 left-0 w-8 h-14 text-zinc-900 opacity-30 drop-shadow-md"
        style={{
          animation: 'zombie-shamble-1 48s linear infinite',
          animationDelay: '-12s',
        }}
      >
        <svg viewBox="0 0 32 56" fill="currentColor">
          {/* Head & Hunched Neck */}
          <circle cx="19" cy="8" r="5" />
          {/* Torso tilted */}
          <path d="M14 13 L22 15 L18 32 L12 30 Z" />
          {/* Reach Arms */}
          <path d="M19 16 L29 20 L31 23" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <path d="M15 17 L24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          {/* Shuffling Legs */}
          <path d="M13 31 L11 44 L9 54" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M17 32 L22 43 L25 53" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      </div>

      {/* Zombie 2: Tall shambler with outstretched arms */}
      <div
        className="absolute bottom-3 left-0 w-10 h-16 text-zinc-900 opacity-25 drop-shadow-md"
        style={{
          animation: 'zombie-shamble-2 64s linear infinite',
          animationDelay: '-38s',
        }}
      >
        <svg viewBox="0 0 36 64" fill="currentColor">
          <circle cx="21" cy="7" r="5.5" />
          <path d="M16 13 L24 14 L20 36 L13 34 Z" />
          {/* Outstretched arms */}
          <path d="M22 17 L33 19 L35 22" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <path d="M18 18 L29 23 L32 26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          {/* Legs */}
          <path d="M15 35 L12 50 L10 62" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path d="M19 36 L24 49 L27 61" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>

      {/* Zombie 3: Lurcher walking reverse direction */}
      <div
        className="absolute bottom-5 left-0 w-8 h-13 text-zinc-900 opacity-20 drop-shadow-md scale-x-[-1]"
        style={{
          animation: 'zombie-shamble-1 56s linear infinite reverse',
          animationDelay: '-25s',
        }}
      >
        <svg viewBox="0 0 32 56" fill="currentColor">
          <circle cx="18" cy="8" r="4.5" />
          <path d="M13 13 L21 14 L17 30 L11 29 Z" />
          <path d="M18 16 L27 21" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <path d="M12 30 L10 43 L8 52" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <path d="M16 31 L20 42 L23 52" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>

      {/* ── 5. Atmospheric Ash & Ember Particles ──────────────────────── */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-zinc-400"
          style={{
            left: p.left,
            bottom: '-10px',
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animation: `ash-float ${p.duration} ease-in-out infinite`,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

