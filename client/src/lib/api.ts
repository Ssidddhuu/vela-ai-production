// In production the frontend is served from a different origin than the API,
// so we use VITE_API_URL. In dev, Vite proxies /api to localhost:4000.
const API_BASE = import.meta.env.VITE_API_URL ?? "";

const opts = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  ...(body ? { body: JSON.stringify(body) } : {}),
});

async function handle(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request failed");
  return data;
}

export const api = {
  me:            () => fetch(`${API_BASE}/api/auth/me`,      opts("GET")).then(handle),
  register:      (u: string, p: string) => fetch(`${API_BASE}/api/auth/register`, opts("POST", { username: u, password: p })).then(handle),
  login:         (u: string, p: string) => fetch(`${API_BASE}/api/auth/login`,    opts("POST", { username: u, password: p })).then(handle),
  logout:        () => fetch(`${API_BASE}/api/auth/logout`,  opts("POST")).then(handle),
  deleteAccount: () => fetch(`${API_BASE}/api/auth/account`, opts("DELETE")).then(handle),
};

export type ChatMessage = { role: "user" | "assistant"; content: string };

export async function streamChat(
  messages: ChatMessage[],
  onToken: (token: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ messages }),
      signal,
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") return;
    throw new Error("Could not reach the server.");
  }

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: false });

  try {
    while (true) {
      if (signal?.aborted) { reader.cancel(); return; }
      const { done, value } = await reader.read();
      if (done) {
        const remaining = decoder.decode();
        if (remaining) onToken(remaining);
        break;
      }
      const text = decoder.decode(value, { stream: true });
      if (text) onToken(text);
    }
  } catch (err) {
    reader.cancel().catch(() => {});
    if ((err as Error)?.name === "AbortError") return;
    throw err;
  }
}

export interface UploadResult {
  filename:    string;
  text:        string;
  chars:       number;
  fullLength:  number;
  isTruncated: boolean;
  chunks:      number;
  language?:   string;
  isCode?:     boolean;
}

export async function uploadResume(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Upload failed");
  return data as UploadResult;
}

export interface AnalysisStep { id: string; label: string; prompt: string; }

export function buildCodeAnalysisSteps(filename: string, text: string): AnalysisStep[] {
  const name = filename.split("/").pop() ?? filename;
  return [
    {
      id: "structure", label: "Analyzing file structure",
      prompt: `Analyze "${name}". Give a high-level overview: what this file does, its purpose, and the main building blocks. Use === STRUCTURE === as header.\n\n${text.slice(0, 3000)}`,
    },
    {
      id: "imports", label: "Explaining imports & dependencies",
      prompt: `Analyze "${name}". Explain every import: what it is, why it is needed, how it is used. Use === IMPORTS & DEPENDENCIES === as header.\n\n${text.slice(0, 2000)}`,
    },
    {
      id: "logic", label: "Explaining core logic",
      prompt: `Analyze "${name}". Explain the core business logic, data transformations, and algorithms step by step. Use === CORE LOGIC === as header.\n\n${text.slice(0, 4000)}`,
    },
    {
      id: "functions", label: "Explaining functions & classes",
      prompt: `Analyze "${name}". Explain every function, class, method, and component: what it does, parameters, return value, side effects. Use === FUNCTIONS & CLASSES === as header.\n\n${text}`,
    },
    {
      id: "dataflow", label: "Tracing data flow",
      prompt: `Analyze "${name}". Trace data flow: how data enters, is transformed, and exits. Explain state, props, API calls, side effects. Use === DATA FLOW === as header.\n\n${text.slice(0, 3000)}`,
    },
    {
      id: "improvements", label: "Generating improvement suggestions",
      prompt: `Analyze "${name}". Suggest specific improvements: performance, readability, error handling, security, maintainability. Show before/after code examples. Use === SUGGESTED IMPROVEMENTS === as header.\n\n${text.slice(0, 3000)}`,
    },
  ];
}
