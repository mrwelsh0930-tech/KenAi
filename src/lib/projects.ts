export interface Message {
  role: "user" | "assistant";
  content: string;
  image?: string;
  suggestions?: string[];
}

export interface Project {
  id: string;
  name: string;
  messages: Message[];
  currentPhase: number;
  phaseLabel: string;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "kenai_projects";

function generateId(): string {
  return `project_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export function getProjects(): Project[] {
  if (typeof window === "undefined") return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const projects = JSON.parse(data) as Project[];
    // Sort by most recently updated
    return projects.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function getProject(id: string): Project | null {
  const projects = getProjects();
  return projects.find((p) => p.id === id) || null;
}

export function createProject(initialMessages: Message[]): Project {
  const now = Date.now();
  const project: Project = {
    id: generateId(),
    name: "New Project",
    messages: initialMessages,
    currentPhase: 1,
    phaseLabel: "Information Gathering",
    createdAt: now,
    updatedAt: now,
  };

  const projects = getProjects();
  projects.unshift(project);
  saveProjects(projects);

  return project;
}

export function updateProject(
  id: string,
  updates: Partial<Omit<Project, "id" | "createdAt">>
): Project | null {
  const projects = getProjects();
  const index = projects.findIndex((p) => p.id === id);

  if (index === -1) return null;

  const updated = {
    ...projects[index],
    ...updates,
    updatedAt: Date.now(),
  };

  projects[index] = updated;
  saveProjects(projects);

  return updated;
}

export function renameProject(id: string, name: string): Project | null {
  return updateProject(id, { name });
}

export function deleteProject(id: string): boolean {
  const projects = getProjects();
  const filtered = projects.filter((p) => p.id !== id);

  if (filtered.length === projects.length) return false;

  saveProjects(filtered);
  return true;
}

function saveProjects(projects: Project[]): void {
  if (typeof window === "undefined") return;

  try {
    // Strip base64 image data before saving - phone photos can be 5MB+
    // which blows up localStorage's ~5MB limit
    const stripped = projects.map((p) => ({
      ...p,
      messages: p.messages.map((m) => ({
        ...m,
        // Replace full base64 with a flag so we know an image was attached
        image: m.image ? "[image attached]" : undefined,
      })),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped));
  } catch (e) {
    console.error("Failed to save projects:", e);
  }
}

export function generateProjectName(messages: Message[]): string {
  // Try to find the first user message that describes the issue
  const firstUserMessage = messages.find(
    (m) => m.role === "user" && m.content && m.content !== "(attached image)"
  );

  if (firstUserMessage) {
    // Truncate to first 30 chars
    const content = firstUserMessage.content;
    if (content.length <= 30) return content;
    return content.substring(0, 27) + "...";
  }

  return "New Project";
}
