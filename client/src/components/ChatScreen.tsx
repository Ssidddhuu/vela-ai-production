import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../store/auth";
import { streamChat, uploadResume, buildCodeAnalysisSteps, type ChatMessage, type UploadResult } from "../lib/api";
import { getCharacterForUser } from "../lib/animeTheme";

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const WARNING_BEFORE_MS  = 60 * 1000;
const MESSAGES_PER_PAGE  = 20;

const LANG_LABELS: Record<string, string> = {
  js: "JavaScript", javascript: "JavaScript", ts: "TypeScript", typescript: "TypeScript",
  py: "Python", python: "Python", java: "Java", cs: "C#", cpp: "C++", c: "C",
  html: "HTML", css: "CSS", json: "JSON", sql: "SQL", bash: "Bash", sh: "Shell",
  yaml: "YAML", yml: "YAML", xml: "XML", md: "Markdown", go: "Go", rust: "Rust",
  php: "PHP", ruby: "Ruby", swift: "Swift", kotlin: "Kotlin", r: "R",
};

const HIGHLIGHT_CONFIG: Record<string, { bg: string; border: string; icon: string; label: string; color: string }> = {
  CRITICAL:  { bg: "rgba(239,68,68,0.12)",   border: "#ef4444", icon: "🚨", label: "Critical",  color: "#f87171" },
  IMPORTANT: { bg: "rgba(245,158,11,0.12)",  border: "#f59e0b", icon: "⭐", label: "Important", color: "#fbbf24" },
  KEY:       { bg: "rgba(124,110,247,0.12)", border: "#7c6ef7", icon: "🔑", label: "Key Point", color: "#a78bfa" },
  WARNING:   { bg: "rgba(251,146,60,0.12)",  border: "#fb923c", icon: "⚠️", label: "Warning",   color: "#fb923c" },
  TIP:       { bg: "rgba(34,197,94,0.12)",   border: "#22c55e", icon: "💡", label: "Tip",       color: "#4ade80" },
};

const UPLOAD_STEPS = [
  { id: "uploading",  label: "Uploading file…"    },
  { id: "reading",    label: "Reading content…"   },
  { id: "detecting",  label: "Detecting language…" },
  { id: "splitting",  label: "Splitting chunks…"  },
  { id: "ready",      label: "Ready to analyze"   },
];

function parseErrorCode(msg: string) {
  if (msg.includes("RATE_LIMITED") || msg.includes("429"))
    return { title: "Rate Limited",        desc: "Too many requests. Wait a few seconds and try again.", icon: "⏳", color: "#f59e0b" };
  if (msg.includes("INVALID_KEY") || msg.includes("401"))
    return { title: "Invalid API Key",     desc: "Your GROQ_API_KEY is invalid. Check server/.env.",    icon: "🔑", color: "#ef4444" };
  if (msg.includes("TOO_LARGE") || msg.includes("413") || msg.includes("context_length"))
    return { title: "Content Too Large",   desc: "Ask about a specific section, page, or slide.",       icon: "📦", color: "#f59e0b" };
  if (msg.includes("SERVICE_DOWN") || msg.includes("500"))
    return { title: "Service Unavailable", desc: "Groq is temporarily down. Retry in a moment.",        icon: "🔧", color: "#ef4444" };
  if (msg.includes("TIMEOUT"))
    return { title: "Request Timed Out",   desc: "Took too long. Try asking about a smaller section.",  icon: "⏱", color: "#f59e0b" };
  if (msg.includes("interrupted"))
    return { title: "Generation Stopped",  desc: "Press Continue to resume from where it stopped.",     icon: "⏹", color: "#6b7280" };
  return   { title: "Something Went Wrong", desc: msg.replace(/^⚠\s*/, ""),                             icon: "⚠️", color: "#ef4444" };
}

function renderMarkdown(text: string): string {
  let codeIdx = 0;
  const codeBlocks: { id: string; lang: string; code: string }[] = [];

  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, lang, code) => {
    const id = `__CODE_${codeIdx++}__`;
    codeBlocks.push({ id, lang: lang.toLowerCase().trim(), code: code.trim() });
    return id;
  });

  text = text.replace(/!!(CRITICAL|IMPORTANT|KEY|WARNING|TIP):\s*([\s\S]+?)!!/g, (_m, type, content) => {
    const h = HIGHLIGHT_CONFIG[type] || HIGHLIGHT_CONFIG.IMPORTANT;
    return `<div style="background:${h.bg};border-left:3px solid ${h.border};border-radius:0 10px 10px 0;padding:12px 16px;margin:14px 0;display:flex;gap:10px;align-items:flex-start">
      <span style="font-size:17px;flex-shrink:0;margin-top:1px">${h.icon}</span>
      <div>
        <div style="font-size:10px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:${h.color};margin-bottom:5px">${h.label}</div>
        <div style="font-size:14.5px;color:#eeeef4;line-height:1.65">${content.trim()}</div>
      </div>
    </div>`;
  });

  text = text.replace(/`([^`]+)`/g,
    '<code style="background:rgba(255,255,255,0.1);padding:2px 7px;border-radius:5px;font-family:monospace;font-size:13px;color:#a78bfa">$1</code>');
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*(.+?)\*/g, "<em>$1</em>");
  text = text.replace(/===(.*?)===/g,
    '<div style="font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:var(--c-secondary);margin:22px 0 10px;padding-bottom:5px;border-bottom:1px solid rgba(255,255,255,0.08)">$1</div>');
  text = text.replace(/^# (.+)$/gm,  '<div style="font-size:18px;font-weight:800;color:var(--ink);margin:16px 0 6px">$1</div>');
  text = text.replace(/^## (.+)$/gm, '<div style="font-size:16px;font-weight:700;color:var(--ink);margin:14px 0 5px">$1</div>');
  text = text.replace(/^### (.+)$/gm,'<div style="font-size:14.5px;font-weight:700;color:var(--ink);margin:12px 0 4px">$1</div>');
  text = text.replace(/^→\s(.+)$/gm,
    '<div style="display:flex;gap:8px;margin:5px 0;align-items:flex-start"><span style="color:var(--c-primary);flex-shrink:0;font-weight:700">→</span><span>$1</span></div>');
  text = text.replace(/^[-•]\s(.+)$/gm,
    '<div style="display:flex;gap:8px;margin:4px 0;align-items:flex-start"><span style="color:var(--c-secondary);flex-shrink:0">•</span><span>$1</span></div>');

  text = text.replace(/^\|(.+)\|$/gm, (line) => {
    if (line.replace(/[\s|:-]/g, "").length === 0) return "";
    const cells = line.split("|").filter(c => c.trim());
    return `__TR__${cells.map(c => `<td style="padding:7px 12px;border-bottom:1px solid rgba(255,255,255,0.06);border-right:1px solid rgba(255,255,255,0.06)">${c.trim()}</td>`).join("")}__ENDTR__`;
  });
  text = text.replace(/(__TR__[\s\S]*?__ENDTR__)+/g, match => {
    const rows = match.split("__TR__").filter(Boolean);
    return `<table style="width:100%;border-collapse:collapse;margin:14px 0;font-size:13.5px;border:1px solid rgba(255,255,255,0.08)">${
      rows.map((row, i) => {
        const cells = row.replace("__ENDTR__", "");
        const bg = i === 0 ? "background:rgba(255,255,255,0.05);font-weight:700;" : "";
        return `<tr>${cells.replace(/<td/g, `<td style="${bg}padding:7px 12px;border-bottom:1px solid rgba(255,255,255,0.06);"`)}</tr>`;
      }).join("")
    }</table>`;
  });

  text = text.replace(/^⚠\s+(.+)$/gm, (_m, msg) => {
    const e = parseErrorCode(msg);
    return `<div style="background:rgba(239,68,68,0.1);border:1px solid ${e.color}40;border-radius:12px;padding:14px 16px;margin:12px 0;display:flex;gap:12px;align-items:flex-start">
      <span style="font-size:22px;flex-shrink:0">${e.icon}</span>
      <div>
        <div style="font-size:13px;font-weight:700;color:${e.color};margin-bottom:4px">${e.title}</div>
        <div style="font-size:13.5px;color:rgba(238,238,244,0.7)">${e.desc}</div>
      </div>
    </div>`;
  });

  text = text.replace(/\n\n/g, '</p><p style="margin:10px 0">');
  text = text.replace(/\n/g, "<br/>");

  for (const { id, lang, code } of codeBlocks) {
    const label   = LANG_LABELS[lang] || lang || "Code";
    const escaped = code.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const encoded = btoa(unescape(encodeURIComponent(code)));
    text = text.replace(id, `<div style="margin:14px 0;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);background:#0d0d14">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px;background:rgba(255,255,255,0.05);border-bottom:1px solid rgba(255,255,255,0.07)">
        <span style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:var(--c-secondary)">${label}</span>
        <button onclick="(function(b){const c=decodeURIComponent(escape(atob('${encoded}')));navigator.clipboard.writeText(c);b.textContent='✓ Copied';setTimeout(()=>b.textContent='⎘ Copy',2000)})(this)"
          style="font-size:11.5px;font-weight:600;color:rgba(255,255,255,0.4);background:none;border:none;cursor:pointer;padding:3px 8px;border-radius:6px">⎘ Copy</button>
      </div>
      <pre style="margin:0;padding:16px;overflow-x:auto;font-family:'Fira Code',Consolas,monospace;font-size:13.5px;line-height:1.7"><code style="color:#e2e8f0;white-space:pre">${escaped}</code></pre>
    </div>`);
  }

  return text;
}

const QUICK_ACTIONS_CODE = [
  { label: "🔍 Explain everything", msg: "Explain this entire file from start to finish. Cover structure, imports, every function/class, data flow, and suggest improvements. Highlight the most important parts." },
  { label: "📦 What does it do?",   msg: "What is the purpose of this file? What problem does it solve? Explain in simple terms with highlights." },
  { label: "⚡ Find issues",        msg: "Review this code for bugs, security issues, performance problems, and anti-patterns. Highlight every critical issue." },
  { label: "✏️ Improve it",         msg: "How can I improve this code? Show before/after examples. Highlight the most impactful changes." },
  { label: "🧪 Write tests",        msg: "Write comprehensive unit tests for the main functions and classes in this file." },
];

const QUICK_ACTIONS_DOC = [
  { label: "📖 Explain everything", msg: "Explain this entire document from start to finish. Cover every section, define all terms, and highlight the most important points." },
  { label: "📄 First page only",    msg: "Explain only the first page in full detail. Define every term, give examples, and highlight the critical points." },
  { label: "🎯 Key points",         msg: "What are the most important points I need to know? Highlight each critical point and go deep on it." },
  { label: "✏️ Improve it",         msg: "How can I improve this document? Highlight issues and give specific suggestions with reworded examples." },
  { label: "❓ Quiz me",            msg: "Ask me 5 questions about this document to test my understanding, then wait for my answers." },
];

const QUICK_ACTIONS_PPT = [
  { label: "⏱ 5 min script",   msg: "I have 5 minutes. Write a complete word-for-word script for each slide. Highlight the key message per slide." },
  { label: "⏱ 10 min script",  msg: "I have 10 minutes. Write a complete word-for-word script for each slide. Highlight the key message per slide." },
  { label: "⏱ 20 min script",  msg: "I have 20 minutes. Write a complete word-for-word script for each slide. Highlight the key message per slide." },
  { label: "⏱ 30 min script",  msg: "I have 30 minutes. Write a complete word-for-word script for each slide. Use 130 words per minute. Highlight key messages." },
  { label: "📊 Slide 1 only",  msg: "Explain only slide 1 in complete detail. Cover every point with examples and highlight the most important things." },
  { label: "💡 Talking points", msg: "Give me detailed talking points for each slide. Highlight the single most important point per slide." },
  { label: "❓ Practice Q&A",  msg: "What questions might the audience ask? Give 10 likely questions and strong answers. Highlight key points." },
];

const QUICK_ACTIONS_GENERAL = [
  { label: "🔍 Go deeper",          msg: "Go much deeper on the last topic. Highlight the most critical things I need to understand." },
  { label: "💡 Give examples",      msg: "Give me more real-world examples. Highlight the most important takeaway from each." },
  { label: "💻 Show me code",       msg: "Show a complete working code example for what we discussed. Highlight the most important parts." },
  { label: "🎓 Explain simply",     msg: "Explain everything again as simply as possible. Highlight the key points I must remember." },
  { label: "❓ What should I ask?", msg: "What are the most important follow-up questions? Highlight the most critical one." },
];

export default function ChatScreen() {
  const user          = useAuth((s) => s.user);
  const logout        = useAuth((s) => s.logout);
  const deleteAccount = useAuth((s) => s.deleteAccount);
  const char = useMemo(() => getCharacterForUser(user ?? "vela"), [user]);

  const [allMessages, setAllMessages]         = useState<ChatMessage[]>([{ role: "assistant", content: char.greeting }]);
  const [visibleCount, setVisibleCount]       = useState(MESSAGES_PER_PAGE);
  const [input, setInput]                     = useState("");
  const [sending, setSending]                 = useState(false);
  const [confirmDel, setConfirmDel]           = useState(false);
  const [showTimeout, setShowTimeout]         = useState(false);
  const [menuOpen, setMenuOpen]               = useState(false);
  const [showCharBadge, setShowCharBadge]     = useState(true);
  const [copiedIdx, setCopiedIdx]             = useState<number | null>(null);
  const [docFile, setDocFile]                 = useState<(UploadResult & { type: "ppt" | "doc" | "code" }) | null>(null);
  const [uploading, setUploading]             = useState(false);
  const [uploadStep, setUploadStep]           = useState(0);
  const [uploadError, setUploadError]         = useState<string | null>(null);
  const [dragOver, setDragOver]               = useState(false);
  const [lastRequest, setLastRequest]         = useState<ChatMessage[] | null>(null);
  const [lastPartialReply, setLastPartialReply] = useState("");
  const [showRetry, setShowRetry]             = useState(false);
  const [showContinue, setShowContinue]       = useState(false);
  const [codeAnalysisActive, setCodeAnalysisActive] = useState(false);
  const [codeStepLabel, setCodeStepLabel]     = useState("");

  const fileInputRef    = useRef<HTMLInputElement>(null);
  const bottomRef       = useRef<HTMLDivElement>(null);
  const streamRef       = useRef<HTMLDivElement>(null);
  const textareaRef     = useRef<HTMLTextAreaElement>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef        = useRef<AbortController | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const c = char.colors;
    root.style.setProperty("--c-primary",     c.primary);
    root.style.setProperty("--c-secondary",   c.secondary);
    root.style.setProperty("--c-glow",        c.glow);
    root.style.setProperty("--c-orb1",        c.orb1);
    root.style.setProperty("--c-orb2",        c.orb2);
    root.style.setProperty("--c-bg",          c.bg);
    root.style.setProperty("--c-surface",     c.surface);
    root.style.setProperty("--c-surface2",    c.surface2);
    root.style.setProperty("--c-accent",      c.accent);
    root.style.setProperty("--c-user-bubble", c.userBubble);
    root.style.setProperty("--c-user-glow",   c.userBubbleGlow);
    return () => {
      ["--c-primary","--c-secondary","--c-glow","--c-orb1","--c-orb2","--c-bg",
       "--c-surface","--c-surface2","--c-accent","--c-user-bubble","--c-user-glow"]
        .forEach(p => root.style.removeProperty(p));
    };
  }, [char]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [allMessages]);

  const resetTimer = useCallback(() => {
    setShowTimeout(false);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current)    clearInterval(countdownRef.current);
    warningTimerRef.current = setTimeout(() => setShowTimeout(true), SESSION_TIMEOUT_MS - WARNING_BEFORE_MS);
  }, []);

  useEffect(() => {
    resetTimer();
    const events = ["mousemove","keydown","click","scroll","touchstart"];
    events.forEach(e => window.addEventListener(e, resetTimer));
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (countdownRef.current)    clearInterval(countdownRef.current);
    };
  }, [resetTimer]);

  useEffect(() => {
    const close = () => setMenuOpen(false);
    if (menuOpen) document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleScroll = useCallback(() => {
    if (!streamRef.current) return;
    if (streamRef.current.scrollTop < 80 && visibleCount < allMessages.length) {
      const prev = streamRef.current.scrollHeight;
      setVisibleCount(c => Math.min(c + MESSAGES_PER_PAGE, allMessages.length));
      requestAnimationFrame(() => {
        if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight - prev;
      });
    }
  }, [visibleCount, allMessages.length]);

  const visibleMessages = allMessages.slice(Math.max(0, allMessages.length - visibleCount));
  const isHiddenMsg     = (m: ChatMessage) => m.role === "user" && m.content.startsWith("[DOCUMENT:");

  const copyMessage = useCallback((text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }, []);

  const stopGeneration = useCallback(() => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setSending(false);
    setCodeAnalysisActive(false);
    setAllMessages(cur => {
      const copy = cur.slice();
      const last = copy[copy.length - 1];
      if (last.role === "assistant") {
        if (!last.content) copy[copy.length - 1] = { role: "assistant", content: "⏹ Stopped. Press **Continue** to resume." };
        setLastPartialReply(last.content);
        setShowContinue(true);
      }
      return copy;
    });
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setUploadError(null);
    setUploading(true);
    setUploadStep(0);
    try {
      setUploadStep(1);
      const result = await uploadResume(file);
      setUploadStep(2); await new Promise(r => setTimeout(r, 200));
      setUploadStep(3); await new Promise(r => setTimeout(r, 200));
      setUploadStep(4); await new Promise(r => setTimeout(r, 200));

      const isPPT  = /\.(pptx?)$/i.test(result.filename);
      const isCode = result.isCode ?? false;
      const type: "ppt" | "doc" | "code" = isPPT ? "ppt" : isCode ? "code" : "doc";
      setDocFile({ ...result, type });
      setUploadStep(5);

      const sizeNote = result.isTruncated
        ? `\n\n⚡ Large file (${Math.round(result.fullLength / 1000)}k chars). Key sections loaded. Ask about any specific part for precise answers.`
        : "";

      let greeting = "";
      if (isCode) {
        greeting = `💻 **${result.filename}** loaded! ${result.language ? `(${result.language})` : ""}${sizeNote}\n\nI'll analyze this step-by-step — structure, imports, logic, functions, data flow, and improvements. Or ask anything specific! ⬇️`;
      } else if (isPPT) {
        greeting = `🎯 **${result.filename}** loaded!${sizeNote}\n\nTell me how many minutes you have and I'll write a precise word-for-word script for each slide. ⬇️`;
      } else {
        greeting = `📄 **${result.filename}** loaded!${sizeNote}\n\nTell me exactly what you need:\n→ "Explain page 1" — full detail on just that page\n→ "complete timed script\n→ "Explain everything" — full walkthrough\n\nI'll highlight the most important points! ⬇️`;
      }

      setAllMessages(cur => [...cur, { role: "assistant", content: greeting }]);
      setVisibleCount(c => c + 1);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }, []);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const runCodeAnalysis = useCallback(async () => {
    if (!docFile) return;
    setCodeAnalysisActive(true);
    setSending(true);
    setShowRetry(false);
    setShowContinue(false);

    const steps = buildCodeAnalysisSteps(docFile.filename, docFile.text);
    setAllMessages(cur => [
      ...cur,
      { role: "user", content: "Explain this entire file in detail." },
      { role: "assistant", content: "" },
    ]);
    setVisibleCount(c => c + 2);

    for (const step of steps) {
      if (abortRef.current?.signal.aborted) break;
      setCodeStepLabel(step.label);
      abortRef.current = new AbortController();

      setAllMessages(cur => {
        const copy = cur.slice();
        const last = copy[copy.length - 1];
        copy[copy.length - 1] = { ...last, content: last.content + "\n\n" };
        return copy;
      });

      try {
        await streamChat(
          [{ role: "user", content: step.prompt }],
          (token) => {
            setAllMessages(cur => {
              const copy = cur.slice();
              const last = copy[copy.length - 1];
              copy[copy.length - 1] = { ...last, content: last.content + token };
              return copy;
            });
          },
          abortRef.current.signal,
        );
      } catch { break; }

      await new Promise(r => setTimeout(r, 300));
    }

    setCodeAnalysisActive(false);
    setSending(false);
    setCodeStepLabel("");
  }, [docFile]);

  const sendMessage = useCallback(async (text: string, isContinue = false) => {
    if (!text.trim() || sending) return;
    setShowRetry(false);
    setShowContinue(false);

    if (docFile?.type === "code" &&
      (text.toLowerCase().includes("explain") || text.toLowerCase().includes("everything") || text.toLowerCase().includes("entire"))) {
      await runCodeAnalysis();
      return;
    }

    setInput("");
    setSending(true);
    resetTimer();
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    abortRef.current = new AbortController();

    const alreadyInjected = allMessages.some(m => isHiddenMsg(m));
    const baseMessages = docFile && !alreadyInjected
      ? [
          allMessages[0],
          { role: "user" as const,      content: `[DOCUMENT: ${docFile.filename}]\n\n${docFile.text}` },
          { role: "assistant" as const, content: "I have read the document carefully and I am ready to help." },
          ...allMessages.slice(1),
        ]
      : allMessages;

    let userContent = text;
    if (isContinue && lastPartialReply) {
      userContent = `Continue your explanation from where you stopped. Your last partial response ended with:\n\n${lastPartialReply.slice(-400)}\n\nContinue from there without repeating.`;
    }

    const next: ChatMessage[] = [...baseMessages, { role: "user", content: userContent }];
    setLastRequest(next);

    if (!isContinue) {
      setAllMessages(cur => [...cur, { role: "user", content: text }, { role: "assistant", content: "" }]);
    } else {
      setAllMessages(cur => [...cur, { role: "assistant", content: "" }]);
    }
    setVisibleCount(c => c + 2);

    try {
      await streamChat(next, (token) => {
        if (abortRef.current?.signal.aborted) return;
        setAllMessages(cur => {
          const copy = cur.slice();
          const last = copy[copy.length - 1];
          copy[copy.length - 1] = { ...last, content: last.content + token };
          return copy;
        });
      }, abortRef.current.signal);
      setLastPartialReply("");
    } catch (e) {
      if (abortRef.current?.signal.aborted) return;
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setAllMessages(cur => {
        const copy = cur.slice();
        copy[copy.length - 1] = { role: "assistant", content: `⚠ ${msg}` };
        return copy;
      });
      setShowRetry(true);
    } finally {
      abortRef.current = null;
      setSending(false);
    }
  }, [sending, docFile, allMessages, lastPartialReply, resetTimer, runCodeAnalysis]);

  const retryLast = useCallback(() => {
    if (!lastRequest) return;
    setShowRetry(false);
    setAllMessages(cur => cur.slice(0, -1));
    const userMsg = lastRequest[lastRequest.length - 1]?.content ?? "";
    sendMessage(userMsg);
  }, [lastRequest, sendMessage]);

  const continueLast = useCallback(() => {
    setShowContinue(false);
    sendMessage("continue", true);
  }, [sendMessage]);

  const quickActions = useMemo(() => {
    if (!docFile) return QUICK_ACTIONS_GENERAL;
    if (docFile.type === "code") return QUICK_ACTIONS_CODE;
    if (docFile.type === "ppt")  return QUICK_ACTIONS_PPT;
    return QUICK_ACTIONS_DOC;
  }, [docFile]);

  return (
    <div className="vela-root">
      <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />

      <aside className="vela-sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark"><span style={{ fontSize: 18 }}>{char.emoji}</span></div>
          <span className="logo-text">Vela</span>
        </div>

        <div className="char-badge">
          <div className="char-badge-header">
            <span className="char-badge-emoji">{char.emoji}</span>
            <div>
              <div className="char-badge-name">{char.name}</div>
              <div className="char-badge-anime">{char.anime}</div>
            </div>
          </div>
          <div className="char-badge-power">
            <span className="power-label">Power</span>
            <span className="power-value">{char.power}</span>
          </div>
        </div>

        <div className="highlight-legend">
          <div className="nav-label">Highlights</div>
          {Object.entries(HIGHLIGHT_CONFIG).map(([type, h]) => (
            <div key={type} className="legend-item" style={{ borderLeft: `2px solid ${h.border}` }}>
              <span style={{ fontSize: 13 }}>{h.icon}</span>
              <span style={{ color: h.color, fontSize: 11, fontWeight: 600 }}>{h.label}</span>
            </div>
          ))}
        </div>

        <div className="resume-sidebar-section">
          <div className="nav-label">Documents</div>
          {uploading ? (
            <div className="upload-progress">
              {UPLOAD_STEPS.map((step, i) => (
                <div key={step.id} className="upload-step" style={{ opacity: i < uploadStep ? 1 : i === uploadStep ? 0.9 : 0.3 }}>
                  <span className="upload-step-icon">
                    {i < uploadStep ? "✓" : i === uploadStep ? <span className="resume-upload-spinner" /> : "○"}
                  </span>
                  <span style={{ fontSize: 12, color: i < uploadStep ? "var(--c-secondary)" : "var(--ink-dim)" }}>{step.label}</span>
                </div>
              ))}
            </div>
          ) : docFile ? (
            <div className="resume-loaded">
              <div className="resume-loaded-icon">{docFile.type === "ppt" ? "📊" : docFile.type === "code" ? "💻" : "📄"}</div>
              <div className="resume-loaded-info">
                <span className="resume-loaded-name">{docFile.filename}</span>
                <span className="resume-loaded-sub">
                  {Math.round(docFile.fullLength / 1000)}k chars
                  {docFile.isTruncated ? " · Smart excerpt" : " · Full"}
                  {docFile.language ? ` · ${docFile.language}` : ""}
                </span>
              </div>
              <button className="resume-remove-btn" onClick={() => setDocFile(null)}>✕</button>
            </div>
          ) : (
            <button className="resume-upload-btn" onClick={() => fileInputRef.current?.click()}>
              <span>📎</span> Upload any file
            </button>
          )}
          {uploadError && (
            <div style={{ fontSize: 11, color: "#f87171", marginTop: 6, padding: "0 4px", lineHeight: 1.4 }}>
              {uploadError}
              <button style={{ display: "block", marginTop: 4, fontSize: 11, color: "var(--c-secondary)", background: "none", border: "none", cursor: "pointer" }}
                onClick={() => fileInputRef.current?.click()}>Try again →</button>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="*" style={{ display: "none" }} onChange={onFileInput} />
        </div>

        <nav className="sidebar-nav">
          <div className="nav-label">Workspace</div>
          <div className="nav-item nav-item-active">
            <span className="nav-icon">💬</span>
            <span>Current chat</span>
            <span className="nav-badge">{allMessages.filter(m => !isHiddenMsg(m)).length}</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-card" onClick={(e) => { e.stopPropagation(); setMenuOpen(o => !o); }}>
            <div className="user-avatar">{user?.charAt(0).toUpperCase()}</div>
            <div className="user-info">
              <span className="user-name">{user}</span>
              <span className="user-sub">Active session</span>
            </div>
            <span className="user-chevron">⌄</span>
          </div>
          <AnimatePresence>
            {menuOpen && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                onClick={e => e.stopPropagation()} className="user-menu">
                <button onClick={() => logout()} className="menu-item">↩ Log out</button>
                <div className="menu-divider" />
                {!confirmDel ? (
                  <button onClick={() => setConfirmDel(true)} className="menu-item menu-item-danger">🗑 Delete account</button>
                ) : (
                  <div className="menu-confirm">
                    <p>This cannot be undone.</p>
                    <div className="menu-confirm-btns">
                      <button onClick={() => deleteAccount()} className="btn-danger-sm">Delete</button>
                      <button onClick={() => setConfirmDel(false)} className="btn-ghost-sm">Cancel</button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>

      <main className="vela-main">
        <header className="vela-header">
          <div className="header-status">
            <span className="status-dot" style={{ background: sending ? "#f59e0b" : undefined }} />
            <span>
              {codeAnalysisActive ? `🔍 ${codeStepLabel}` : sending ? `${char.name} · Thinking…` : `${char.name} · Ready`}
            </span>
            {docFile && <span className="header-resume-tag">
              {docFile.type === "ppt" ? "📊" : docFile.type === "code" ? "💻" : "📄"} {docFile.filename}
            </span>}
          </div>
          <div className="header-right">
            <span className="header-char-tag">{char.emoji} {char.anime}</span>
            <span className="header-user">@{user}</span>
          </div>
        </header>

        <AnimatePresence>
          {showCharBadge && (
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="char-banner">
              <span className="char-banner-emoji">{char.emoji}</span>
              <div className="char-banner-text">
                <strong>{char.name}</strong> from <em>{char.anime}</em> is your companion · Power: {char.power}
              </div>
              <button className="char-banner-close" onClick={() => setShowCharBadge(false)}>✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={streamRef} onScroll={handleScroll}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)} onDrop={onDrop}
          className="vela-messages stream" style={{ position: "relative" }}>

          <AnimatePresence>
            {dragOver && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, border: "2px dashed var(--c-primary)", borderRadius: 16, margin: 16 }}>
                <div style={{ fontSize: 56 }}>📄</div>
                <p style={{ fontSize: 20, fontWeight: 800, color: "white" }}>Drop your file here</p>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>PDF · DOCX · PPTX · Any code file · TXT · CSV</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="messages-inner">
            {!docFile && allMessages.length === 1 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="empty-state">
                <div className="empty-state-icon">{char.emoji}</div>
                <h2 className="empty-state-title">How can I help you today?</h2>
                <p className="empty-state-sub">Ask me anything — I'll highlight the most important points. Upload any file for deep AI analysis.</p>
                <div className="empty-upload-zone" onClick={() => fileInputRef.current?.click()}>
                  <span style={{ fontSize: 28 }}>📎</span>
                  <div>
                    <strong>Upload any file for deep AI analysis</strong>
                    <span>Code · Resume · Presentation · Report · Any document</span>
                  </div>
                  <span className="empty-upload-arrow">→</span>
                </div>
              </motion.div>
            )}

            {visibleCount < allMessages.length && (
              <div className="load-more">
                <button onClick={() => setVisibleCount(c => Math.min(c + MESSAGES_PER_PAGE, allMessages.length))}>↑ Load earlier messages</button>
              </div>
            )}

            {visibleMessages.map((m, i) => {
              if (isHiddenMsg(m)) return null;
              const isLast      = i === visibleMessages.length - 1;
              const key         = allMessages.length - visibleMessages.length + i;
              const isAssistant = m.role === "assistant";
              const isError     = isAssistant && m.content.startsWith("⚠");
              return (
                <motion.div key={key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }} className={`message-row ${m.role}`}>
                  {isAssistant && <div className="msg-avatar"><span style={{ fontSize: 15 }}>{char.emoji}</span></div>}
                  <div className={`message-bubble ${m.role}`}>
                    {m.content
                      ? isAssistant
                        ? <div dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
                        : m.content
                      : sending && isLast
                        ? <span className="typing-dots"><span /><span /><span /></span>
                        : ""}
                    {isAssistant && m.content && !isError && (
                      <button className="copy-btn" onClick={() => copyMessage(m.content, key)}>
                        {copiedIdx === key ? "✓ Copied" : "⎘ Copy"}
                      </button>
                    )}
                  </div>
                  {!isAssistant && <div className="user-msg-avatar">{user?.charAt(0).toUpperCase()}</div>}
                </motion.div>
              );
            })}

            {(showRetry || showContinue) && !sending && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: "flex", gap: 10, paddingLeft: 44 }}>
                {showRetry && (
                  <button onClick={retryLast} className="quick-chip"
                    style={{ background: "rgba(239,68,68,0.15)", borderColor: "rgba(239,68,68,0.4)", color: "#f87171" }}>
                    🔄 Retry
                  </button>
                )}
                {showContinue && (
                  <button onClick={continueLast} className="quick-chip"
                    style={{ background: "rgba(124,110,247,0.15)", borderColor: "rgba(124,110,247,0.4)", color: "#a78bfa" }}>
                    ▶ Continue
                  </button>
                )}
              </motion.div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        <div className="quick-actions-bar">
          {quickActions.map((a, i) => (
            <button key={i} className="quick-chip" onClick={() => sendMessage(a.msg)} disabled={sending}>{a.label}</button>
          ))}
        </div>

        <div className="vela-input-wrap">
          {docFile && (
            <div className="resume-context-bar">
              <span>{docFile.type === "ppt" ? "📊" : docFile.type === "code" ? "💻" : "📄"}</span>
              <span>{docFile.filename}{docFile.isTruncated ? " · Smart excerpt" : ""} · Specify page/slide/function for precise answers</span>
              <button onClick={() => setDocFile(null)}>✕ Remove</button>
            </div>
          )}
          <div className="vela-input-box">
            <button className="attach-btn" onClick={() => fileInputRef.current?.click()} title="Upload file" disabled={uploading}>
              {uploading ? "⏳" : "📎"}
            </button>
            <textarea ref={textareaRef} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              rows={1}
              placeholder={
                docFile?.type === "code" ? `Ask about a specific function, class, or "explain everything"…`
                : docFile ? `Ask about page 1, slide 2, or "give me 30 min content for slide 1"…`
                : `Ask ${char.name} anything… or upload a file 📎`
              }
              className="vela-textarea"
            />
            {sending ? (
              <button onClick={stopGeneration} className="vela-stop-btn" title="Stop generating">
                <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><rect x="4" y="4" width="12" height="12" rx="2"/></svg>
              </button>
            ) : (
              <button onClick={() => sendMessage(input)} disabled={!input.trim()} className="vela-send-btn" title="Send">
                <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
                  <path d="M10 17V3M4 9l6-6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
          <p className="input-hint">Shift+Enter for new line · Important points auto-highlighted · {char.power}</p>
        </div>
      </main>

      <AnimatePresence>
        {showTimeout && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay">
            <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }} className="modal-card">
              <div className="modal-char-icon">{char.emoji}</div>
              <h2 className="modal-title">Still there, {user}?</h2>
              <p className="modal-body">{char.name} has been waiting. You've been inactive for 29 minutes.</p>
              <div className="modal-actions">
                <button onClick={() => { setShowTimeout(false); resetTimer(); }} className="modal-btn-primary">Continue session</button>
                <button onClick={() => logout()} className="modal-btn-ghost">Log out</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}