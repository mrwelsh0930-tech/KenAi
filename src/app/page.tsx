"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { ProgressIndicator } from "@/components/ProgressIndicator";
import { ProjectSidebar } from "@/components/ProjectSidebar";
import { ContractorAnalyzer } from "@/components/ContractorAnalyzer";

type ActiveTab = "home-fix" | "quote-analyzer";
import {
  Project,
  Message,
  getProjects,
  getProject,
  createProject,
  updateProject,
  renameProject,
  deleteProject,
  generateProjectName,
} from "@/lib/projects";

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(1);
  const [phaseLabel, setPhaseLabel] = useState("Information Gathering");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("home-fix");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load projects on mount
  useEffect(() => {
    const loadedProjects = getProjects();
    setProjects(loadedProjects);

    // If there are projects, load the most recent one
    if (loadedProjects.length > 0) {
      const mostRecent = loadedProjects[0];
      setCurrentProjectId(mostRecent.id);
      setMessages(mostRecent.messages);
      setCurrentPhase(mostRecent.currentPhase);
      setPhaseLabel(mostRecent.phaseLabel);
    }
  }, []);

  // Auto-save current project when messages change
  const saveCurrentProject = useCallback(() => {
    if (currentProjectId && messages.length > 1) {
      // Generate name from first user message if still "New Project"
      const project = getProject(currentProjectId);
      const updates: Partial<Project> = {
        messages,
        currentPhase,
        phaseLabel,
      };

      if (project?.name === "New Project") {
        updates.name = generateProjectName(messages);
      }

      updateProject(currentProjectId, updates);
      setProjects(getProjects());
    }
  }, [currentProjectId, messages, currentPhase, phaseLabel]);

  useEffect(() => {
    // Debounce saves
    const timer = setTimeout(saveCurrentProject, 500);
    return () => clearTimeout(timer);
  }, [saveCurrentProject]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (content: string, images?: string[]) => {
    if (!content.trim() && (!images || images.length === 0)) return;

    // Create a new project if we don't have one
    if (!currentProjectId) {
      const newProject = createProject([WELCOME_MESSAGE]);
      setCurrentProjectId(newProject.id);
      setProjects(getProjects());
    }

    // Add user message
    const userMessage: Message = {
      role: "user",
      content: content || "(attached photos)",
      images,
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

  const handleNewProject = () => {
    const newProject = createProject([WELCOME_MESSAGE]);
    setCurrentProjectId(newProject.id);
    setMessages([WELCOME_MESSAGE]);
    setCurrentPhase(1);
    setPhaseLabel("Information Gathering");
    setProjects(getProjects());
  };

  const handleSelectProject = (id: string) => {
    const project = getProject(id);
    if (project) {
      setCurrentProjectId(project.id);
      setMessages(project.messages);
      setCurrentPhase(project.currentPhase);
      setPhaseLabel(project.phaseLabel);
    }
  };

  const handleRenameProject = (id: string, name: string) => {
    renameProject(id, name);
    setProjects(getProjects());
  };

  const handleDeleteProject = (id: string) => {
    deleteProject(id);
    const remainingProjects = getProjects();
    setProjects(remainingProjects);

    // If we deleted the current project, switch to another or create new
    if (id === currentProjectId) {
      if (remainingProjects.length > 0) {
        handleSelectProject(remainingProjects[0].id);
      } else {
        handleNewProject();
      }
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <ProjectSidebar
        projects={projects}
        currentProjectId={currentProjectId}
        onSelectProject={handleSelectProject}
        onNewProject={handleNewProject}
        onRenameProject={handleRenameProject}
        onDeleteProject={handleDeleteProject}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex-shrink-0 bg-white border-b border-gray-200">
          <div className="px-4 py-3">
            <div className="max-w-3xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Menu button (mobile) */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
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
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>

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
                  <p className="text-xs text-gray-500">
                    Home Maintenance Assistant
                  </p>
                </div>
              </div>

              {activeTab === "home-fix" && (
                <button
                  onClick={handleNewProject}
                  className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1"
                >
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span className="hidden sm:inline">New Project</span>
                </button>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="max-w-3xl mx-auto px-4">
            <div className="flex gap-0">
              <button
                onClick={() => setActiveTab("home-fix")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "home-fix"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
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
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Home Fix
              </button>
              <button
                onClick={() => setActiveTab("quote-analyzer")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "quote-analyzer"
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Quote Analyzer
              </button>
            </div>
          </div>
        </header>

        {/* Tab Content */}
        {activeTab === "home-fix" ? (
          <>
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
                    images={msg.images}
                    suggestions={msg.suggestions}
                    onSuggestionClick={handleSuggestionClick}
                    showSuggestions={
                      index === messages.length - 1 &&
                      !isLoading &&
                      msg.role === "assistant"
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
                This tool provides guidance only. Always prioritize safety and
                consult a licensed professional for electrical, gas, structural,
                or complex repairs.
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
          </>
        ) : (
          <ContractorAnalyzer />
        )}
      </div>
    </div>
  );
}
