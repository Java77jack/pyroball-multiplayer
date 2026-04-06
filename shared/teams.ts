/**
 * Team definitions for Pyroball
 * 12 teams total: 4 original + 8 new
 */

export interface Team {
  id: string;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logo: string; // emoji or icon
  description: string;
  founded: number;
}

export const TEAMS: Record<string, Team> = {
  // Original 4 teams
  inferno: {
    id: "inferno",
    name: "Inferno",
    shortName: "INF",
    primaryColor: "#DC2626",
    secondaryColor: "#7F1D1D",
    accentColor: "#FFA500",
    logo: "🔥",
    description: "The blazing force of raw power and intensity",
    founded: 2024,
  },
  vortex: {
    id: "vortex",
    name: "Vortex",
    shortName: "VOR",
    primaryColor: "#0369A1",
    secondaryColor: "#082F49",
    accentColor: "#06B6D4",
    logo: "🌪️",
    description: "Swift and unpredictable like a spinning storm",
    founded: 2024,
  },
  empire: {
    id: "empire",
    name: "Empire",
    shortName: "EMP",
    primaryColor: "#FAFAFA",
    secondaryColor: "#404040",
    accentColor: "#FFD700",
    logo: "👑",
    description: "Regal dominance and strategic excellence",
    founded: 2024,
  },
  sledge: {
    id: "sledge",
    name: "Sledge",
    shortName: "SLG",
    primaryColor: "#6B7280",
    secondaryColor: "#1F2937",
    accentColor: "#FBBF24",
    logo: "⚒️",
    description: "Heavy hitters with unstoppable momentum",
    founded: 2024,
  },

  // New 8 teams
  phoenix: {
    id: "phoenix",
    name: "Phoenix",
    shortName: "PHX",
    primaryColor: "#EA580C",
    secondaryColor: "#7C2D12",
    accentColor: "#FBBF24",
    logo: "🔆",
    description: "Rising from the ashes with unstoppable determination",
    founded: 2025,
  },
  glacier: {
    id: "glacier",
    name: "Glacier",
    shortName: "GLA",
    primaryColor: "#0EA5E9",
    secondaryColor: "#0C4A6E",
    accentColor: "#E0F2FE",
    logo: "❄️",
    description: "Cool precision and crystalline defense",
    founded: 2025,
  },
  thunder: {
    id: "thunder",
    name: "Thunder",
    shortName: "THU",
    primaryColor: "#9333EA",
    secondaryColor: "#4C0519",
    accentColor: "#FBBF24",
    logo: "⚡",
    description: "Electric speed and devastating power",
    founded: 2025,
  },
  titan: {
    id: "titan",
    name: "Titan",
    shortName: "TIT",
    primaryColor: "#7C3AED",
    secondaryColor: "#2E1065",
    accentColor: "#C084FC",
    logo: "💪",
    description: "Colossal strength and unbreakable will",
    founded: 2025,
  },
  shadow: {
    id: "shadow",
    name: "Shadow",
    shortName: "SHD",
    primaryColor: "#1F2937",
    secondaryColor: "#111827",
    accentColor: "#60A5FA",
    logo: "🌑",
    description: "Silent, swift, and deadly accurate",
    founded: 2025,
  },
  nova: {
    id: "nova",
    name: "Nova",
    shortName: "NOV",
    primaryColor: "#EC4899",
    secondaryColor: "#500724",
    accentColor: "#FCA5A5",
    logo: "✨",
    description: "Brilliant explosions of skill and style",
    founded: 2025,
  },
  surge: {
    id: "surge",
    name: "Surge",
    shortName: "SUR",
    primaryColor: "#10B981",
    secondaryColor: "#064E3B",
    accentColor: "#6EE7B7",
    logo: "🌊",
    description: "Flowing momentum and relentless pressure",
    founded: 2025,
  },
  nexus: {
    id: "nexus",
    name: "Nexus",
    shortName: "NEX",
    primaryColor: "#06B6D4",
    secondaryColor: "#164E63",
    accentColor: "#A5F3FC",
    logo: "🔗",
    description: "Connected excellence and synchronized teamwork",
    founded: 2025,
  },
};

export const TEAM_IDS = Object.keys(TEAMS);

export function getTeam(id: string): Team | undefined {
  return TEAMS[id];
}

export function getAllTeams(): Team[] {
  return Object.values(TEAMS);
}
