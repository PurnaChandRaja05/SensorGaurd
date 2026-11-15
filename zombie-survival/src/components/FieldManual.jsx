import { useGame } from '../context/GameContext';
import { X, BookOpen } from 'lucide-react';

const missionGuides = {
  1: {
    title: 'Sampling & Sampling Bias',
    concepts: [
      {
        term: 'Simple Random Sampling',
        hint: 'Every sector has an equal probability of being selected. This avoids systematically missing dangerous zones.',
      },
      {
        term: 'Convenience Sampling',
        hint: 'Selecting only sectors that are easy or safe to reach. This introduces bias because dangerous zones are systematically excluded.',
      },
      {
        term: 'Stratified Sampling',
        hint: 'Divide the city into districts (strata), then sample proportionally from each. This ensures representation from all areas.',
      },
      {
        term: 'Sampling Bias',
        hint: 'When some members of the population are systematically more likely to be selected than others, the sample statistics will not accurately represent the population.',
      },
      {
        term: 'Sample Mean vs. Population Mean',
        hint: 'The sample mean (x̄) estimates the true population mean (μ). Bias causes x̄ to systematically over- or under-estimate μ.',
      },
    ],
  },
  2: {
    title: 'Classification & Confusion Matrix',
    concepts: [
      {
        term: 'Decision Boundary',
        hint: 'A threshold (or line) that separates classes. Points on one side are classified as Positive, the other as Negative.',
      },
      {
        term: 'Confusion Matrix',
        hint: 'A 2×2 table: True Positives (correctly caught infected), False Positives (wrongly rejected healthy), True Negatives (correctly admitted healthy), False Negatives (missed infected).',
      },
      {
        term: 'Precision',
        hint: 'Of all people you flagged as infected, what fraction truly are? Precision = TP / (TP + FP). High precision means few false alarms.',
      },
      {
        term: 'Recall (Sensitivity)',
        hint: 'Of all truly infected people, what fraction did you catch? Recall = TP / (TP + FN). High recall means few missed infections.',
      },
      {
        term: 'Precision–Recall Tradeoff',
        hint: 'Tightening thresholds catches more infected (↑ Recall) but also flags more healthy people (↓ Precision). Find the balance.',
      },
    ],
  },
  3: {
    title: 'K-Means Clustering',
    concepts: [
      {
        term: 'Centroid',
        hint: 'The center point of a cluster — the mean of all points assigned to that cluster.',
      },
      {
        term: 'K-Means Algorithm',
        hint: 'Step 1: Assign each point to its nearest centroid. Step 2: Move each centroid to the mean of its assigned points. Repeat until convergence.',
      },
      {
        term: 'WCSS (Inertia)',
        hint: 'Within-Cluster Sum of Squares. Total squared distance from each point to its assigned centroid. Lower WCSS = tighter clusters = less travel distance.',
      },
      {
        term: 'Initialization Matters',
        hint: 'Poor initial centroid placement can lead to suboptimal clusters. Try placing centroids near dense groups of supply drops.',
      },
      {
        term: 'Convergence',
        hint: 'When centroids stop moving (or move negligibly), the algorithm has converged. More steps is not always better — it should stabilize.',
      },
    ],
  },
  4: {
    title: 'Probability & Bayes\' Theorem',
    concepts: [
      {
        term: 'Prior Probability P(Infected)',
        hint: 'The base rate of infection in the population before any test. A rare disease means low prior even if the test is accurate.',
      },
      {
        term: 'Sensitivity P(+|Infected)',
        hint: 'The probability that the test correctly identifies an infected person. Also called True Positive Rate.',
      },
      {
        term: 'False Positive Rate P(+|Healthy)',
        hint: 'The probability that the test incorrectly flags a healthy person as infected.',
      },
      {
        term: 'Posterior P(Infected|+)',
        hint: 'The updated probability of being infected GIVEN a positive test. Bayes\' Theorem: P(I|+) = P(+|I)·P(I) / P(+).',
      },
      {
        term: 'Base-Rate Fallacy',
        hint: 'Ignoring the prior (base rate) and assuming a positive test means high infection probability. When the disease is rare, most positives can be false positives.',
      },
    ],
  },
  5: {
    title: 'Regression & Prediction',
    concepts: [
      {
        term: 'Linear Regression',
        hint: 'Models the relationship y = mx + b, where m is the slope (rate of change) and b is the intercept (baseline).',
      },
      {
        term: 'Slope (m)',
        hint: 'How much the dependent variable (fuel consumption) changes per unit increase in the independent variable (e.g., cargo weight).',
      },
      {
        term: 'Mean Squared Error (MSE)',
        hint: 'Average of squared differences between predicted and actual values. Lower MSE = better fit.',
      },
      {
        term: 'Residuals',
        hint: 'The difference between each observed value and the predicted value. Residuals help identify patterns the model misses.',
      },
      {
        term: 'Outliers',
        hint: 'Data points far from the trend. They can distort the regression line. Removing sensor errors can improve your model.',
      },
    ],
  },
};

export default function FieldManual() {
  const { state, dispatch } = useGame();

  if (!state.fieldManualOpen) return null;

  const guide = missionGuides[state.currentMission] || missionGuides[1];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => dispatch({ type: 'CLOSE_FIELD_MANUAL' })}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-zinc-900 border-l border-amber-600/30 overflow-y-auto fade-in">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              <h2 className="text-amber-400 font-bold text-lg tracking-wider">FIELD MANUAL</h2>
            </div>
            <button
              onClick={() => dispatch({ type: 'CLOSE_FIELD_MANUAL' })}
              className="p-1 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* Mission context */}
          <div className="mb-4 px-3 py-2 bg-zinc-800/60 border border-zinc-700 rounded-lg">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Mission {state.currentMission} Concepts</p>
            <p className="text-amber-300 font-semibold">{guide.title}</p>
          </div>

          {/* Concept cards */}
          <div className="space-y-3">
            {guide.concepts.map((c, i) => (
              <div
                key={i}
                className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-lg hover:border-amber-600/30 transition-colors"
              >
                <h3 className="text-amber-300 font-semibold text-sm mb-2">{c.term}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{c.hint}</p>
              </div>
            ))}
          </div>

          {/* Footer note */}
          <p className="mt-6 text-xs text-zinc-600 italic text-center">
            Hints only — the survival decision is yours, soldier.
          </p>
        </div>
      </div>
    </div>
  );
}

