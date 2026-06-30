import { Router, Request, Response } from "express";
import multer from "multer";
import { createRequire } from "module";
import mammoth from "mammoth";
import { requireAuth } from "../middleware/auth.js";

const require = createRequire(import.meta.url);
const pdfParse     = require("pdf-parse");
const officeParser = require("officeparser");

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const CODE_EXTENSIONS: Record<string, string> = {
  js: "JavaScript", jsx: "JavaScript (React)", ts: "TypeScript", tsx: "TypeScript (React)",
  py: "Python", java: "Java", cs: "C#", cpp: "C++", c: "C", go: "Go", rs: "Rust",
  rb: "Ruby", php: "PHP", swift: "Swift", kt: "Kotlin", r: "R", sql: "SQL",
  html: "HTML", css: "CSS", scss: "SCSS", sh: "Shell", bash: "Bash",
  yaml: "YAML", yml: "YAML", json: "JSON", xml: "XML", md: "Markdown",
};

function detectLanguage(filename: string, content: string): { language: string; isCode: boolean } {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (CODE_EXTENSIONS[ext]) return { language: CODE_EXTENSIONS[ext], isCode: true };
  const codePattern = /^(import |export |function |class |const |let |var |def |public |private )/m;
  if (codePattern.test(content)) return { language: "Code", isCode: true };
  return { language: "", isCode: false };
}

async function extractText(mimetype: string, buffer: Buffer, filename: string): Promise<string> {
  if (mimetype === "application/pdf") {
    const parsed = await pdfParse(buffer);
    return parsed.text;
  }
  if (
    mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimetype === "application/msword"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  if (
    mimetype === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    mimetype === "application/vnd.ms-powerpoint" ||
    filename.match(/\.(pptx?)$/i)
  ) {
    return new Promise((resolve, reject) => {
      officeParser.parseOfficeAsync(buffer, { outputErrorToConsole: false }, (data: string, err: Error) => {
        if (err) reject(err); else resolve(data || "");
      });
    });
  }
  if (
    mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimetype === "application/vnd.ms-excel" ||
    filename.match(/\.(xlsx?)$/i)
  ) {
    return new Promise((resolve, reject) => {
      officeParser.parseOfficeAsync(buffer, { outputErrorToConsole: false }, (data: string, err: Error) => {
        if (err) reject(err); else resolve(data || "");
      });
    });
  }
  return buffer.toString("utf-8");
}

function buildAiText(text: string, isCode: boolean): { aiText: string; isTruncated: boolean } {
  const limit = isCode ? 6000 : 8000;
  if (text.length <= limit) return { aiText: text, isTruncated: false };

  if (isCode) {
    const start = text.slice(0, 4000);
    const end   = text.slice(-2000);
    return {
      aiText: `${start}\n\n// ... [middle omitted — ask about specific functions] ...\n\n${end}`,
      isTruncated: true,
    };
  }

  const start = text.slice(0, 4000);
  const mid   = text.slice(Math.floor(text.length / 2) - 1000, Math.floor(text.length / 2) + 1000);
  const end   = text.slice(-2000);
  return {
    aiText:
      `[DOCUMENT START]\n${start}\n\n` +
      `[DOCUMENT MIDDLE]\n${mid}\n\n` +
      `[DOCUMENT END]\n${end}\n\n` +
      `[Note: ${text.length} char document. Ask about any specific section.]`,
    isTruncated: true,
  };
}

router.post("/", requireAuth, upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });

    const { mimetype, buffer, originalname } = req.file;

    let rawText = "";
    try {
      rawText = await extractText(mimetype, buffer, originalname);
    } catch {
      rawText = buffer.toString("utf-8");
    }

    rawText = rawText
      .replace(/\r\n/g, "\n")
      .replace(/\t/g, "  ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!rawText || rawText.length < 10) {
      return res.status(422).json({ error: "Could not extract readable text. Try PDF, DOCX, PPTX, TXT, or source code files." });
    }

    const { language, isCode } = detectLanguage(originalname, rawText);
    const { aiText, isTruncated } = buildAiText(rawText, isCode);

    return res.json({
      filename:    originalname,
      text:        aiText,
      chars:       aiText.length,
      fullLength:  rawText.length,
      isTruncated,
      chunks:      Math.ceil(rawText.length / 3000),
      language,
      isCode,
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Failed to parse file." });
  }
});

export default router;