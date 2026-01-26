"use client";

interface Instruction {
  step: number;
  title: string;
  description: string;
  warning?: string;
}

interface Material {
  item: string;
  estimatedCost: string;
  notes?: string;
}

interface Analysis {
  issueIdentified?: string;
  confidence?: "High" | "Medium" | "Low";
  confidenceExplanation?: string;
  isDIYEligible?: boolean;
  diyConfidence?: "High" | "Medium" | "Low";
  reasoning?: string;
  safetyWarnings?: string[];
  clarifyingQuestions?: string[];
  instructions?: Instruction[];
  materials?: Material[];
  estimatedTime?: string;
  whenToCallPro?: string;
  needsMoreInfo?: boolean;
  whatYouCanSee?: string;
  rawResponse?: string;
  parseError?: boolean;
}

interface AnalysisResultProps {
  analysis: Analysis;
}

function ConfidenceBadge({
  level,
  label,
}: {
  level: "High" | "Medium" | "Low";
  label: string;
}) {
  const colors = {
    High: "bg-green-100 text-green-800 border-green-200",
    Medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    Low: "bg-red-100 text-red-800 border-red-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[level]}`}
    >
      {label}: {level}
    </span>
  );
}

export function AnalysisResult({ analysis }: AnalysisResultProps) {
  // Handle parse error - show raw response
  if (analysis.parseError && analysis.rawResponse) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Analysis Result</h3>
        <div className="prose prose-sm max-w-none whitespace-pre-wrap">
          {analysis.rawResponse}
        </div>
      </div>
    );
  }

  // Handle needs more info case
  if (analysis.needsMoreInfo) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <svg
            className="w-6 h-6 text-yellow-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-semibold">Need More Information</h3>
        </div>

        {analysis.whatYouCanSee && (
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              <strong>What I can see:</strong> {analysis.whatYouCanSee}
            </p>
          </div>
        )}

        {analysis.clarifyingQuestions &&
          analysis.clarifyingQuestions.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Please provide more details:
              </p>
              <ul className="list-disc list-inside space-y-1">
                {analysis.clarifyingQuestions.map((q, i) => (
                  <li key={i} className="text-sm text-gray-600">
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      {/* Issue Identification */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Issue Identified</h3>
          {analysis.confidence && (
            <ConfidenceBadge level={analysis.confidence} label="Confidence" />
          )}
        </div>
        <p className="text-gray-700">{analysis.issueIdentified}</p>
        {analysis.confidenceExplanation && (
          <p className="text-sm text-gray-500 mt-1">
            {analysis.confidenceExplanation}
          </p>
        )}
      </div>

      {/* DIY Assessment */}
      <div
        className={`p-4 rounded-lg ${analysis.isDIYEligible ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
      >
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold flex items-center gap-2">
            {analysis.isDIYEligible ? (
              <>
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-green-800">DIY Eligible</span>
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span className="text-red-800">Professional Recommended</span>
              </>
            )}
          </h4>
          {analysis.diyConfidence && (
            <ConfidenceBadge
              level={analysis.diyConfidence}
              label="DIY Confidence"
            />
          )}
        </div>
        <p
          className={`text-sm ${analysis.isDIYEligible ? "text-green-700" : "text-red-700"}`}
        >
          {analysis.reasoning}
        </p>
      </div>

      {/* Safety Warnings */}
      {analysis.safetyWarnings && analysis.safetyWarnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <h4 className="font-semibold text-yellow-800 flex items-center gap-2 mb-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Safety Warnings
          </h4>
          <ul className="list-disc list-inside space-y-1">
            {analysis.safetyWarnings.map((warning, i) => (
              <li key={i} className="text-sm text-yellow-700">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Clarifying Questions */}
      {analysis.clarifyingQuestions &&
        analysis.clarifyingQuestions.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">
              Additional Questions
            </h4>
            <ul className="list-disc list-inside space-y-1">
              {analysis.clarifyingQuestions.map((q, i) => (
                <li key={i} className="text-sm text-blue-700">
                  {q}
                </li>
              ))}
            </ul>
          </div>
        )}

      {/* Instructions */}
      {analysis.instructions && analysis.instructions.length > 0 && (
        <div>
          <h4 className="font-semibold mb-3">Step-by-Step Instructions</h4>
          <div className="space-y-3">
            {analysis.instructions.map((instruction) => (
              <div
                key={instruction.step}
                className="flex gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                  {instruction.step}
                </div>
                <div className="flex-1">
                  <h5 className="font-medium text-gray-900">
                    {instruction.title}
                  </h5>
                  <p className="text-sm text-gray-600 mt-1">
                    {instruction.description}
                  </p>
                  {instruction.warning && (
                    <p className="text-sm text-yellow-700 mt-2 flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01"
                        />
                      </svg>
                      {instruction.warning}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Materials */}
      {analysis.materials && analysis.materials.length > 0 && (
        <div>
          <h4 className="font-semibold mb-3">Materials Needed</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Item
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Est. Cost
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analysis.materials.map((material, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {material.item}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {material.estimatedCost}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {material.notes || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Time Estimate */}
      {analysis.estimatedTime && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>
            <strong>Estimated Time:</strong> {analysis.estimatedTime}
          </span>
        </div>
      )}

      {/* When to Call Pro */}
      {analysis.whenToCallPro && (
        <div className="bg-gray-100 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-800 mb-2">
            When to Call a Professional
          </h4>
          <p className="text-sm text-gray-600">{analysis.whenToCallPro}</p>
        </div>
      )}
    </div>
  );
}
