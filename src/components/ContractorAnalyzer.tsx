"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface AnalysisMessage {
  role: "user" | "assistant";
  content: string;
  images?: string[];
}

export function ContractorAnalyzer() {
  const [messages, setMessages] = useState<AnalysisMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      Array.from(files).forEach((file) => {
        if (!file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          setImages((prev) => [...prev, event.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    []
  );

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    if ((!inputText.trim() && images.length === 0) || isLoading) return;

    const userMessage: AnalysisMessage = {
      role: "user",
      content: inputText.trim() || "(uploaded quote)",
      images: images.length > 0 ? [...images] : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setImages([]);
    setIsLoading(true);

    try {
      // Build history from previous messages (text only)
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/analyze-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          images: userMessage.images,
          history,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze");
      }

      const assistantMessage: AnalysisMessage = {
        role: "assistant",
        content: data.response,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Something went wrong";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `**Error:** ${errorMessage}\n\nPlease try again.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, images, isLoading, messages]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleReset = () => {
    setMessages([]);
    setInputText("");
    setImages([]);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Contractor Quote Analyzer
              </h2>
              <p className="text-gray-500 max-w-md mb-6">
                Upload a photo of a contractor&apos;s quote or estimate and
                I&apos;ll help you understand if the pricing is fair, what&apos;s
                missing, and what questions to ask.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md w-full">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors justify-center"
                >
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
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Upload Quote Photo
                </button>
                <button
                  onClick={() => {
                    setInputText(
                      "I got a quote for "
                    );
                    document
                      .querySelector<HTMLTextAreaElement>("textarea")
                      ?.focus();
                  }}
                  className="flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors justify-center"
                >
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
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Type Quote Details
                </button>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  } mb-4`}
                >
                  <div className="max-w-[85%]">
                    <div
                      className={`rounded-2xl px-4 py-3 ${
                        msg.role === "user"
                          ? "bg-green-500 text-white"
                          : "bg-white border border-gray-200 text-gray-800"
                      }`}
                    >
                      {msg.images && msg.images.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-2">
                          {msg.images.map((img, i) => (
                            <img
                              key={i}
                              src={img}
                              alt={`Quote ${i + 1}`}
                              className="max-h-48 rounded-lg"
                            />
                          ))}
                        </div>
                      )}
                      {msg.role === "user" ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div className="prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-strong:text-gray-900">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start mb-4">
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 text-gray-500">
                      <div className="flex gap-1">
                        <span
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                      <span className="text-sm">Analyzing quote...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4">
        {/* Image previews */}
        {images.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2 max-w-3xl mx-auto">
            {images.map((img, index) => (
              <div key={index} className="relative inline-block">
                <img
                  src={img}
                  alt={`Quote ${index + 1}`}
                  className="max-h-24 rounded-lg border border-gray-200"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                  aria-label="Remove image"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            title="Attach quote photos"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </button>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the quote or add context..."
            disabled={isLoading}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 text-gray-900 bg-white placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:bg-gray-50"
            style={{ minHeight: "48px", maxHeight: "120px" }}
          />

          <button
            onClick={handleSubmit}
            disabled={
              isLoading || (!inputText.trim() && images.length === 0)
            }
            className="flex-shrink-0 bg-green-500 text-white p-3 rounded-xl hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
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
            ) : (
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
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </button>
        </div>

        <div className="flex items-center justify-between max-w-3xl mx-auto mt-2">
          <p className="text-xs text-gray-400">
            Upload photos of paper or digital quotes. Add context for better
            analysis.
          </p>
          {messages.length > 0 && (
            <button
              onClick={handleReset}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Clear analysis
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
