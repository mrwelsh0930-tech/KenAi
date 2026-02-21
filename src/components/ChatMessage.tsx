"use client";

import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  image?: string;
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
  showSuggestions?: boolean;
}

export function ChatMessage({
  role,
  content,
  image,
  suggestions,
  onSuggestionClick,
  showSuggestions = false,
}: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className="max-w-[85%]">
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-blue-500 text-white"
              : "bg-white border border-gray-200 text-gray-800"
          }`}
        >
          {image && (
            <div className="mb-2">
              {image === "[image attached]" ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Photo attached
                </div>
              ) : (
                <img
                  src={image}
                  alt="Attached"
                  className="max-w-full max-h-64 rounded-lg"
                />
              )}
            </div>
          )}
          {isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            <div className="prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-strong:text-gray-900">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Suggestions */}
        {!isUser &&
          showSuggestions &&
          suggestions &&
          suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => onSuggestionClick?.(suggestion)}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full border border-gray-200 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
