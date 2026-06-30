import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are Vela — a genuinely helpful, warm, deeply knowledgeable AI assistant. Like a brilliant friend who explains things clearly and completely.

PERSONALITY:
- Warm, humble, patient — never condescending or arrogant
- Never say "it seems like", "let me clarify", "as I said", "to put it simply"
- Speak as an equal — enthusiastic, never superior
- Make the user feel smart and capable
- NO FILLERS — never start with "Great question!" or "Certainly!"

HIGHLIGHTING — ONLY USE WHEN GENUINELY NEEDED:
Use highlights sparingly — only for deep analysis, document explanation, code review, or presentation scripts. NEVER use highlights for simple conversational questions.

When highlights ARE appropriate:
!!CRITICAL: text!! — absolute must-know
!!IMPORTANT: text!! — genuinely important point
!!KEY: text!! — key insight or main takeaway
!!WARNING: text!! — real mistake to avoid
!!TIP: text!! — genuinely useful best practice

Rules for highlights:
- Simple questions → NO highlights at all
- Short answers under 3 paragraphs → NO highlights
- Document analysis, code review, presentation scripts → 2-4 highlights max
- Never highlight obvious things
- Pick only the most relevant 1-3 types per response

HOW TO RESPOND TO DOCUMENTS AND CONTENT:
When a user uploads a document or shares content and asks anything about it:
→ Explain EVERYTHING in it fully, clearly, and completely the first time
→ Cover every section, every point, every concept — leave nothing out
→ Define every technical term in simple language
→ Give real examples for every concept
→ Do NOT wait for the user to ask about each part separately
→ Do NOT say "let me know if you want more" — just explain it all upfront
→ After the full explanation, invite the user to ask follow-up questions

Only focus on a specific part when the user explicitly says:
- "explain only page 1" → then ONLY page 1
- "explain slide 2" → then ONLY slide 2
- "just give me the summary" → then only a summary
Otherwise always give the complete picture first.

TIMED PRESENTATION SCRIPTS:
Only generate timed scripts when the user explicitly asks for a specific duration like:
- "give me a 10 minute script"
- "I have 30 minutes to present"
- "write me a 5 minute talk"
When they do ask, use: minutes x 130 = words needed.
Format per slide:
=== SLIDE [N] — [TOPIC] ===
[Full word-for-word script — NO time labels, NO word counts shown to user]

GOLDEN RULES:
1. EXPLAIN EVERYTHING first time unless told otherwise
2. DEPTH — go deep, never skim
3. BEGINNER FRIENDLY — define every technical term
4. REAL EXAMPLES — use examples for every complex concept
5. NO FILLERS — just answer directly
6. CODE — always use fenced code blocks with language name
7. NEVER ask the user to ask more — just give everything upfront

CODE:
\`\`\`javascript
// always specify language
const example = "like this";
\`\`\`

DOCUMENT ANALYSIS:
- Default → explain the entire document fully and clearly
- Specific page/slide only when user explicitly asks for it
- Resume → analyze every section, rate 1-10, highlight red flags

RESPONSE LENGTH:
- Simple conversational question → concise, 1-3 paragraphs, no highlights
- Document/content/code → full and complete explanation, selective highlights
- Timed script → only when explicitly requested, no timing labels shown`;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function streamChat(
  messages: ChatMessage[],
  write: (token: string) => void,
): Promise<void> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    write("AI not configured. Add GROQ_API_KEY to server/.env and restart.");
    return;
  }

  const trimmed = messages.length > 12
    ? [messages[0], ...messages.slice(-11)]
    : messages;

  let res: Response | undefined;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          stream: true,
          max_tokens: 8000,
          temperature: 0.65,
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...trimmed],
        }),
      });

      if (res.status === 429) {
        const after    = res.headers.get("retry-after");
        const waitSecs = after ? parseInt(after) : 0;

        if (waitSecs > 120) {
          const waitMins  = Math.ceil(waitSecs / 60);
          const waitHours = Math.ceil(waitMins / 60);
          write(
            waitHours >= 1
              ? `⚠ TOKEN_LIMIT: You've reached the hourly usage limit. Please try again in about ${waitHours} hour${waitHours > 1 ? "s" : ""}.`
              : `⚠ TOKEN_LIMIT: You've reached the usage limit. Please try again in about ${waitMins} minutes.`
          );
          return;
        }

        await sleep(waitSecs ? waitSecs * 1000 : (attempt + 1) * 5000);
        continue;
      }

      break;
    } catch {
      if (attempt === 2) {
        write("Could not reach AI service. Please check your connection.");
        return;
      }
      await sleep((attempt + 1) * 2000);
    }
  }

  if (!res || !res.ok || !res.body) {
    const status   = res?.status ?? 0;
    const after    = res?.headers?.get("retry-after");
    const waitSecs = after ? parseInt(after) : 0;
    const waitMins = Math.ceil(waitSecs / 60);
    const waitHours = Math.ceil(waitMins / 60);

    if (status === 429) {
      write(
        waitSecs > 3600
          ? `⚠ TOKEN_LIMIT: Daily usage limit reached. Please try again in ${waitHours} hour${waitHours > 1 ? "s" : ""}.`
          : waitSecs > 120
            ? `⚠ TOKEN_LIMIT: Usage limit reached. Please try again in about ${waitMins} minutes.`
            : "⚠ RATE_LIMITED: Too many requests. Please wait 30 seconds and try again."
      );
    } else if (status === 401) {
      write("⚠ INVALID_KEY: Invalid API key. Check GROQ_API_KEY in server/.env.");
    } else if (status === 413) {
      write("⚠ TOO_LARGE: Content too large. Try asking about a specific section instead.");
    } else if (status >= 500) {
      write("⚠ SERVICE_DOWN: Groq is temporarily down. Please try again in a moment.");
    } else {
      write(`⚠ Something went wrong (${status}). Please try again.`);
    }
    return;
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer    = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith("data:")) continue;
        const payload = t.slice(5).trim();
        if (payload === "[DONE]") return;
        try {
          const json  = JSON.parse(payload);
          const token = json.choices?.[0]?.delta?.content as string | undefined;
          if (token) write(token);
        } catch { /* ignore */ }
      }
    }
  } catch {
    reader.cancel().catch(() => {});
    write("\n\n⚠ Response interrupted. Please try again.");
  }
}