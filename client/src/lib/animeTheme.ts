export interface AnimeCharacter {
  name: string;
  anime: string;
  greeting: string;
  power: string;
  emoji: string;
  colors: {
    primary: string;
    secondary: string;
    glow: string;
    orb1: string;
    orb2: string;
    bg: string;
    surface: string;
    surface2: string;
    accent: string;
    userBubble: string;
    userBubbleGlow: string;
  };
  particles: string; // css background for particle effect
}

const CHARACTERS: AnimeCharacter[] = [
  {
    name: "Naruto Uzumaki",
    anime: "Naruto",
    greeting: "Believe it! I'm Vela — I never give up on finding you the right answer!",
    power: "Shadow Clone Jutsu",
    emoji: "🍥",
    colors: {
      primary: "#f97316",
      secondary: "#fb923c",
      glow: "rgba(249,115,22,0.4)",
      orb1: "rgba(249,115,22,0.15)",
      orb2: "rgba(251,191,36,0.1)",
      bg: "#0f0a05",
      surface: "#1a1008",
      surface2: "#231508",
      accent: "#f97316",
      userBubble: "linear-gradient(135deg,#f97316,#fb923c)",
      userBubbleGlow: "rgba(249,115,22,0.3)",
    },
    particles: "url(\"data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='3' cy='3' r='1' fill='rgba(249,115,22,0.15)'/%3E%3C/svg%3E\")",
  },
  {
    name: "Goku",
    anime: "Dragon Ball Z",
    greeting: "Kakarot! Wait — I'm Vela. Let's power up your knowledge together!",
    power: "Kamehameha",
    emoji: "⚡",
    colors: {
      primary: "#3b82f6",
      secondary: "#60a5fa",
      glow: "rgba(59,130,246,0.4)",
      orb1: "#fbbf24",
      orb2: "rgba(59,130,246,0.1)",
      bg: "#05080f",
      surface: "#080d1a",
      surface2: "#0d1524",
      accent: "#3b82f6",
      userBubble: "linear-gradient(135deg,#1d4ed8,#3b82f6)",
      userBubbleGlow: "rgba(59,130,246,0.35)",
    },
    particles: "",
  },
  {
    name: "Mikasa Ackerman",
    anime: "Attack on Titan",
    greeting: "Everything I do, I do with precision. I'm Vela — let's get to work.",
    power: "ODM Gear Mastery",
    emoji: "⚔️",
    colors: {
      primary: "#6b7280",
      secondary: "#9ca3af",
      glow: "rgba(107,114,128,0.4)",
      orb1: "rgba(239,68,68,0.12)",
      orb2: "rgba(107,114,128,0.08)",
      bg: "#090909",
      surface: "#111111",
      surface2: "#1a1a1a",
      accent: "#ef4444",
      userBubble: "linear-gradient(135deg,#374151,#6b7280)",
      userBubbleGlow: "rgba(107,114,128,0.3)",
    },
    particles: "",
  },
  {
    name: "Levi Ackerman",
    anime: "Attack on Titan",
    greeting: "Tch. Don't waste my time with stupid questions. I'm Vela — ask something worth answering.",
    power: "Titan Slaying",
    emoji: "🗡️",
    colors: {
      primary: "#64748b",
      secondary: "#94a3b8",
      glow: "rgba(100,116,139,0.4)",
      orb1: "rgba(100,116,139,0.12)",
      orb2: "rgba(239,68,68,0.06)",
      bg: "#080a0c",
      surface: "#0f1215",
      surface2: "#161b20",
      accent: "#94a3b8",
      userBubble: "linear-gradient(135deg,#334155,#64748b)",
      userBubbleGlow: "rgba(100,116,139,0.3)",
    },
    particles: "",
  },
  {
    name: "Itachi Uchiha",
    anime: "Naruto",
    greeting: "You lack wisdom. Let me help you find it. I am Vela.",
    power: "Sharingan & Amaterasu",
    emoji: "👁️",
    colors: {
      primary: "#7c3aed",
      secondary: "#a78bfa",
      glow: "rgba(124,58,237,0.5)",
      orb1: "rgba(124,58,237,0.18)",
      orb2: "rgba(220,38,38,0.1)",
      bg: "#06030f",
      surface: "#0d0819",
      surface2: "#130d24",
      accent: "#dc2626",
      userBubble: "linear-gradient(135deg,#4c1d95,#7c3aed)",
      userBubbleGlow: "rgba(124,58,237,0.4)",
    },
    particles: "",
  },
  {
    name: "Zoro",
    anime: "One Piece",
    greeting: "I got lost finding you. I'm Vela — I'll never lose my way answering questions!",
    power: "Three Sword Style",
    emoji: "🗡️",
    colors: {
      primary: "#16a34a",
      secondary: "#4ade80",
      glow: "rgba(22,163,74,0.4)",
      orb1: "rgba(22,163,74,0.15)",
      orb2: "rgba(22,163,74,0.07)",
      bg: "#030a05",
      surface: "#060f08",
      surface2: "#09160c",
      accent: "#16a34a",
      userBubble: "linear-gradient(135deg,#14532d,#16a34a)",
      userBubbleGlow: "rgba(22,163,74,0.35)",
    },
    particles: "",
  },
  {
    name: "Zero Two",
    anime: "Darling in the FranXX",
    greeting: "Darling~ I'm Vela! Let's ride into the unknown together 🌸",
    power: "FranXX Piloting",
    emoji: "🌸",
    colors: {
      primary: "#e11d48",
      secondary: "#fb7185",
      glow: "rgba(225,29,72,0.45)",
      orb1: "rgba(225,29,72,0.15)",
      orb2: "rgba(251,113,133,0.1)",
      bg: "#0f0308",
      surface: "#1a0510",
      surface2: "#230818",
      accent: "#e11d48",
      userBubble: "linear-gradient(135deg,#9f1239,#e11d48)",
      userBubbleGlow: "rgba(225,29,72,0.4)",
    },
    particles: "",
  },
  {
    name: "Rem",
    anime: "Re:Zero",
    greeting: "I'm Vela — I'll work tirelessly to help you, just like Rem would! 💙",
    power: "Water Magic & Oni Form",
    emoji: "💙",
    colors: {
      primary: "#0284c7",
      secondary: "#38bdf8",
      glow: "rgba(2,132,199,0.4)",
      orb1: "rgba(2,132,199,0.15)",
      orb2: "rgba(56,189,248,0.08)",
      bg: "#030810",
      surface: "#050f1a",
      surface2: "#081524",
      accent: "#0284c7",
      userBubble: "linear-gradient(135deg,#075985,#0284c7)",
      userBubbleGlow: "rgba(2,132,199,0.35)",
    },
    particles: "",
  },
  {
    name: "Luffy",
    anime: "One Piece",
    greeting: "I'm gonna be the best AI! I'm Vela — let's go on an adventure! 🏴‍☠️",
    power: "Gum-Gum Fruit / Gear 5",
    emoji: "🏴‍☠️",
    colors: {
      primary: "#dc2626",
      secondary: "#f87171",
      glow: "rgba(220,38,38,0.4)",
      orb1: "rgba(220,38,38,0.14)",
      orb2: "rgba(251,191,36,0.1)",
      bg: "#0f0404",
      surface: "#1a0707",
      surface2: "#230b0b",
      accent: "#f59e0b",
      userBubble: "linear-gradient(135deg,#991b1b,#dc2626)",
      userBubbleGlow: "rgba(220,38,38,0.35)",
    },
    particles: "",
  },
  {
    name: "Saitama",
    anime: "One Punch Man",
    greeting: "Ok. I'm Vela. I can answer anything with one response.",
    power: "One Punch",
    emoji: "👊",
    colors: {
      primary: "#ca8a04",
      secondary: "#facc15",
      glow: "rgba(202,138,4,0.4)",
      orb1: "rgba(202,138,4,0.14)",
      orb2: "rgba(220,38,38,0.08)",
      bg: "#0a0800",
      surface: "#141000",
      surface2: "#1c1700",
      accent: "#ca8a04",
      userBubble: "linear-gradient(135deg,#854d0e,#ca8a04)",
      userBubbleGlow: "rgba(202,138,4,0.35)",
    },
    particles: "",
  },
];

// Hash username to pick a consistent character
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getCharacterForUser(username: string): AnimeCharacter {
  const idx = hashString(username.toLowerCase()) % CHARACTERS.length;
  return CHARACTERS[idx];
}
