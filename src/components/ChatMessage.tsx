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
              <img
                src={image}
                alt="Attached"
                className="max-w-full max-h-64 rounded-lg"
              />
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
