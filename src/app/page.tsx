"use client";

import { useState } from "react";
import { ImageUpload } from "@/components/ImageUpload";
import { AnalysisResult } from "@/components/AnalysisResult";

interface Analysis {
  issueIdentified?: string;
  confidence?: "High" | "Medium" | "Low";
  confidenceExplanation?: string;
  isDIYEligible?: boolean;
  diyConfidence?: "High" | "Medium" | "Low";
  reasoning?: string;
  safetyWarnings?: string[];
  clarifyingQuestions?: string[];
  instructions?: Array<{
    step: number;
    title: string;
    description: string;
    warning?: string;
  }>;
  materials?: Array<{
    item: string;
    estimatedCost: string;
    notes?: string;
  }>;
  estimatedTime?: string;
  whenToCallPro?: string;
  needsMoreInfo?: boolean;
  whatYouCanSee?: string;
  rawResponse?: string;
  parseError?: boolean;
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userContext, setUserContext] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleImageSelect = (imageDataUrl: string) => {
    setSelectedImage(imageDataUrl);
    setAnalysis(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: selectedImage,
          userContext: userContext.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze image");
      }

      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setAnalysis(null);
    setError(null);
    setUserContext("");
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Home Fix KenAI
              </h1>
              <p className="text-sm text-gray-500">
                AI-powered home maintenance assistant
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Upload Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">
              Upload a Photo of Your Issue
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Take a clear photo of the household issue you&apos;d like help
              with. The more detail visible, the better I can assist.
            </p>

            <ImageUpload
              onImageSelect={handleImageSelect}
              isLoading={isLoading}
            />

            {selectedImage && (
              <div className="mt-4 space-y-4">
                {/* Context Input */}
                <div>
                  <label
                    htmlFor="context"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Additional Context (optional)
                  </label>
                  <textarea
                    id="context"
                    rows={2}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="E.g., 'This leak started 2 days ago' or 'I have basic tools but no plumbing experience'"
                    value={userContext}
                    onChange={(e) => setUserContext(e.target.value)}
                    disabled={isLoading}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    The more details you provide, the more accurate my
                    assessment will be.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleAnalyze}
                    disabled={isLoading}
                    className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <svg
                          className="animate-spin h-5 w-5"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Analyzing...
                      </>
                    ) : (
                      <>
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
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                          />
                        </svg>
                        Analyze Issue
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={isLoading}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Start Over
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Results */}
          {analysis && <AnalysisResult analysis={analysis} />}

          {/* Disclaimer */}
          <div className="text-center text-xs text-gray-400 py-4">
            <p>
              This tool provides general guidance only. Always prioritize safety
              and consult a licensed professional for electrical, gas,
              structural, or complex repairs.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
