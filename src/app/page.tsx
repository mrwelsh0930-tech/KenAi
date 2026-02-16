"use client";

import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { ProgressIndicator } from "@/components/ProgressIndicator";

interface Message {
  role: "user" | "assistant";
  content: string;
  image?: string;
  suggestions?: string[];
}

const WELCOME_MESSAGE: Message = {
  role: "assistant",
  content: `Hi! I'm KenAI, your home maintenance assistant. I'm here to help you figure out what's going on and whether you can fix it yourself—or if you should call a pro.

**Let's start simple:** What's the issue you're dealing with?`,
  suggestions: [
    "Something is leaking",
    "I hear a strange noise",
    "Something looks broken",
    "Not sure what's wrong",
  ],
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(1);
  const [phaseLabel, setPhaseLabel] = useState("Information Gathering");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (content: string, image?: string) => {
    if (!content.trim() && !image) return;

    // Add user message
    const userMessage: Message = {
      role: "user",
      content: content || "(attached image)",
      image,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Send all messages (except the welcome message) to the API
      const conversationHistory = [...messages.slice(1), userMessage];

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: conversationHistory,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      // Update phase info
      if (data.phase !== undefined) {
        setCurrentPhase(data.phase);
      }
      if (data.phaseLabel) {
        setPhaseLabel(data.phaseLabel);
      }
      // Add assistant response
      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        suggestions: data.suggestions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Something went wrong";

      // Add error as a system message
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `**Error:** ${errorMessage}\n\nPlease try again. If the problem persists, check your internet connection.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion);
  };

  const handleNewChat = () => {
    setMessages([WELCOME_MESSAGE]);
    setCurrentPhase(1);
    setPhaseLabel("Information Gathering");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
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
              <h1 className="text-lg font-bold text-gray-900">KenAI</h1>
              <p className="text-xs text-gray-500">Home Maintenance Assistant</p>
            </div>
          </div>

          <button
            onClick={handleNewChat}
            className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            New Chat
          </button>
        </div>
      </header>

      {/* Progress Indicator */}
      {messages.length > 1 && (
        <div className="flex-shrink-0 px-4 py-2 bg-gray-50">
          <div className="max-w-3xl mx-auto">
            <ProgressIndicator
              currentPhase={currentPhase}
              phaseLabel={phaseLabel}
            />
          </div>
        </div>
      )}

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {messages.map((msg, index) => (
            <ChatMessage
              key={index}
              role={msg.role}
              content={msg.content}
              image={msg.image}
              suggestions={msg.suggestions}
              onSuggestionClick={handleSuggestionClick}
              showSuggestions={
                index === messages.length - 1 && !isLoading && msg.role === "assistant"
              }
            />
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
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Disclaimer */}
      {messages.length <= 1 && (
        <div className="flex-shrink-0 text-center text-xs text-gray-400 px-4 pb-2">
          This tool provides guidance only. Always prioritize safety and consult
          a licensed professional for electrical, gas, structural, or complex
          repairs.
        </div>
      )}

      {/* Chat input */}
      <div className="flex-shrink-0 max-w-3xl mx-auto w-full">
        <ChatInput
          onSend={handleSend}
          isLoading={isLoading}
          placeholder="Describe your issue or respond to KenAI..."
        />
      </div>
    </div>
  );
}
