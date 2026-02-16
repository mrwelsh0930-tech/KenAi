"use client";

interface ProgressIndicatorProps {
  currentPhase: number;
  phaseLabel: string;
}

const PHASES = [
  { num: 1, label: "Gathering Info", short: "Info" },
  { num: 2, label: "Diagnosis", short: "Diagnosis" },
  { num: 3, label: "DIY Check", short: "DIY?" },
  { num: 4, label: "Repair Steps", short: "Repair" },
  { num: 5, label: "Verification", short: "Verify" },
];

export function ProgressIndicator({
  currentPhase,
  phaseLabel,
}: ProgressIndicatorProps) {
  // Phase 0 means complete/professional recommended
  if (currentPhase === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-center">
        <span className="text-green-700 font-medium text-sm">{phaseLabel}</span>
      </div>
    );
  }

  const progress = ((currentPhase - 1) / (PHASES.length - 1)) * 100;

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.max(progress, 5)}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 whitespace-nowrap">
          Step {currentPhase} of {PHASES.length}
        </span>
      </div>

      {/* Phase dots */}
      <div className="flex justify-between items-center">
        {PHASES.map((phase) => (
          <div key={phase.num} className="flex flex-col items-center">
            <div
              className={`w-3 h-3 rounded-full transition-colors ${
                phase.num < currentPhase
                  ? "bg-blue-500"
                  : phase.num === currentPhase
                    ? "bg-blue-500 ring-2 ring-blue-200"
                    : "bg-gray-200"
              }`}
            />
            <span
              className={`text-xs mt-1 hidden sm:block ${
                phase.num === currentPhase
                  ? "text-blue-600 font-medium"
                  : phase.num < currentPhase
                    ? "text-gray-600"
                    : "text-gray-400"
              }`}
            >
              {phase.short}
            </span>
          </div>
        ))}
      </div>

      {/* Current phase label (mobile) */}
      <div className="sm:hidden text-center mt-2">
        <span className="text-sm text-blue-600 font-medium">{phaseLabel}</span>
      </div>
    </div>
  );
}
