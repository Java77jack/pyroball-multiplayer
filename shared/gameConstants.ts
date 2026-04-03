/**
 * Shared game constants used by both client and server
 */

export const COURT = {
  width: 1200,
  height: 800,
};

export const GOAL = {
  width: 100,
  height: 300,
};

export const ZONES = {
  CORE: { x: 0, y: 0, radius: 150 },
  MIDRANGE: { x: 0, y: 0, radius: 350 },
  DOWNTOWN: { x: 0, y: 0, radius: 500 },
};

export const PLAYER_NAMES = [
  "Phoenix", "Inferno", "Blaze", "Spark",
  "Vortex", "Cyclone", "Storm", "Gale",
  "Empire", "Titan", "Crown", "Royal",
  "Sledge", "Hammer", "Forge", "Steel",
];

export const TEAMS = [
  { id: "inferno", name: "Inferno", color: "#FF6B35" },
  { id: "vortex", name: "Vortex", color: "#004E89" },
  { id: "empire", name: "Empire", color: "#F7F7F7" },
  { id: "sledge", name: "Sledge", color: "#8B7355" },
];
