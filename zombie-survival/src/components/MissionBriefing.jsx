import { useGame } from '../context/GameContext';
import { Crosshair, ShieldAlert, Package, FlaskConical, Truck, ArrowRight } from 'lucide-react';

const briefings = {
  1: {
    icon: Crosshair,
    title: 'The Safe Zone Recon',
    subtitle: 'Sampling & Sampling Bias',
    location: 'City Grid — Sector Control',
    narrative: [
      'Command has identified a potential supply route through the downtown corridor, but intel on zombie positions is outdated.',
      'Your squad\'s recon drone has limited battery — enough for 10 sector scans across a 50-sector city grid. You must estimate the zombie density before committing your convoy.',
      'Be careful: the outer alleys appear quiet and easy to scan, but the real threat may be lurking in the harder-to-reach interior sectors. How you sample will determine whether you drive into an ambush.',
    ],
    objective: 'Scan 10 of 50 sectors, estimate total zombie population, and choose the safest supply route.',
    stakes: 'An underestimate means ambush — costing Health and Medicine. An accurate estimate conserves Fuel.',
    concept: 'Sampling Methods & Bias',
  },
  2: {
    icon: ShieldAlert,
    title: 'Quarantine Checkpoint',
    subtitle: 'Classification & Confusion Matrix',
    location: 'Safehouse Gate — Perimeter',
    narrative: [
      'A group of 12 survivors has reached your safehouse gate, desperate for shelter. But the outbreak has taught you a hard lesson: some survivors carry the virus with no visible symptoms.',
      'Historical medical data gives you readings on body temperature and heart rate from previously tested individuals. You must set thresholds to classify incoming survivors as Safe or Quarantine.',
      'Let too many infected through and the virus spreads inside. Turn away too many healthy people and you lose skilled engineers and medics your camp desperately needs.',
    ],
    objective: 'Set temperature and heart rate thresholds to classify survivors, then apply your classifier to the incoming wave.',
    stakes: 'False Negatives let infection in (−Health, −Medicine). False Positives reject needed allies (−Food).',
    concept: 'Decision Boundaries, Precision & Recall',
  },
  3: {
    icon: Package,
    title: 'Supply Drop Triangulation',
    subtitle: 'Clustering using K-Means',
    location: 'Industrial District — Aerial View',
    narrative: [
      'Three allied aircraft have air-dropped 60 emergency supply packages across the industrial district. The drops were scattered by crosswinds, but cluster around three general zones.',
      'You have enough fuel to set up 3 forward collection camps. Each camp sends runners to collect nearby packages. The closer the camp is to its assigned packages, the less fuel you burn.',
      'Place your camps wisely, then use the K-Means algorithm to optimize their positions. Every extra kilometer of travel burns precious fuel.',
    ],
    objective: 'Place 3 centroids, run K-Means clustering, and lock in optimal camp locations to minimize travel distance.',
    stakes: 'Poorly clustered camps waste Fuel. Optimal clustering conserves resources for the final convoy.',
    concept: 'K-Means Algorithm & WCSS (Inertia)',
  },
  4: {
    icon: FlaskConical,
    title: 'The Antidote Trial',
    subtitle: 'Probability & Bayes\' Theorem',
    location: 'Field Hospital — Bio Lab',
    narrative: [
      'Your scouts recovered two experimental vaccine vials and a supply of rapid-test strips from an overrun research lab. The test strips have known accuracy rates from the lab notes.',
      'Eight of your squad members were potentially exposed during the last supply run. The rapid tests show some positive results, but you know a positive test doesn\'t always mean infection — especially when the virus isn\'t equally common everywhere.',
      'You only have enough Medicine for 4 doses. The base-rate of infection differs across city zones. Choose wisely: waste medicine on the healthy and you won\'t have enough for the truly infected.',
    ],
    objective: 'Use Bayes\' Theorem to calculate true infection probability for each squad member and allocate your limited medicine.',
    stakes: 'Untreated infected members cost Health and Medicine. Wasted doses deplete Medicine reserves.',
    concept: 'Conditional Probability & Base-Rate Fallacy',
  },
  5: {
    icon: Truck,
    title: 'Convoy to the Evacuation Centre',
    subtitle: 'Regression & Prediction',
    location: 'Highway 7 — Final 120 km',
    narrative: [
      'This is it. The Evacuation Centre is 120 kilometers down Highway 7. Your armored truck has limited fuel, and the horde is converging on your position at a predictable rate.',
      'Historical convoy telemetry data shows how fuel consumption relates to cargo weight and speed. Some data points look suspicious — possibly from damaged sensors on previous runs.',
      'Fit a regression model to predict exactly how much fuel you\'ll need. Overestimate and you dump supplies to lighten the load. Underestimate and you stall on the highway with zombies closing in.',
    ],
    objective: 'Fit a regression line to telemetry data, remove outliers if needed, then predict fuel for your chosen cargo load and speed.',
    stakes: 'Inaccurate prediction means stalling or dumping supplies. A good model gets you to safety.',
    concept: 'Linear Regression, MSE & Outlier Detection',
  },
};

export default function MissionBriefing() {
  const { state, dispatch } = useGame();
  const b = briefings[state.currentMission];
  if (!b) return null;

  const Icon = b.icon;

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-16 pb-10">
      <div className="max-w-2xl w-full fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="px-2 py-1 bg-amber-600/20 border border-amber-600/40 rounded text-xs text-amber-400 font-bold tracking-wider">
            MISSION {state.currentMission} OF 5
          </div>
          <div className="px-2 py-1 bg-zinc-800 border border-zinc-600 rounded text-xs text-zinc-400 font-medium">
            {b.location}
          </div>
        </div>

        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
          <Icon className="w-8 h-8 text-amber-400" />
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-zinc-100 tracking-tight">
              {b.title}
            </h1>
            <p className="text-amber-400 text-sm font-semibold">{b.subtitle}</p>
          </div>
        </div>

        {/* Narrative */}
        <div className="panel p-6 mb-6">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-4">Mission Briefing</p>
          <div className="space-y-3">
            {b.narrative.map((para, i) => (
              <p key={i} className="text-zinc-300 text-sm leading-relaxed">
                {para}
              </p>
            ))}
          </div>
        </div>

        {/* Objective & Stakes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-emerald-950/30 border border-emerald-800/30 rounded-lg">
            <p className="text-xs text-emerald-500 uppercase tracking-wider mb-2 font-semibold">Objective</p>
            <p className="text-zinc-300 text-sm">{b.objective}</p>
          </div>
          <div className="p-4 bg-red-950/30 border border-red-800/30 rounded-lg">
            <p className="text-xs text-red-500 uppercase tracking-wider mb-2 font-semibold">Stakes</p>
            <p className="text-zinc-300 text-sm">{b.stakes}</p>
          </div>
        </div>

        {/* Concept tag */}
        <div className="flex items-center justify-between mb-8">
          <div className="px-3 py-1.5 bg-zinc-800 border border-zinc-600 rounded-lg">
            <span className="text-xs text-zinc-500 mr-2">Data Science Concept:</span>
            <span className="text-xs text-amber-300 font-semibold">{b.concept}</span>
          </div>
        </div>

        {/* Start mission button */}
        <div className="text-center">
          <button
            onClick={() => dispatch({ type: 'START_MISSION' })}
            className="btn-primary text-lg px-10 py-4 flex items-center gap-3 mx-auto"
          >
            BEGIN MISSION
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

