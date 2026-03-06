const THEMES = {
  clean: {
    card: "#ffffff",
    tile: "#f7f9ff",
    text: "#0f172a",
    muted: "#475569",
    accent: "#2563eb",
    track: "#dbe7ff",
    border: "#dbe4f3"
  },
  dark: {
    card: "#0f172a",
    tile: "#16213b",
    text: "#eff6ff",
    muted: "#94a3b8",
    accent: "#38bdf8",
    track: "#253250",
    border: "#2f405f"
  },
  ocean: {
    card: "#071f2f",
    tile: "#103249",
    text: "#f0fbff",
    muted: "#9fd5ea",
    accent: "#00c2ff",
    track: "#1a4c66",
    border: "#296c8f"
  },
  warm: {
    card: "#fff9f2",
    tile: "#fff0de",
    text: "#331d0b",
    muted: "#7c5b41",
    accent: "#ef6c00",
    track: "#ffd7b0",
    border: "#f2d6bb"
  }
};

function getTheme(name) {
  return THEMES[name] || THEMES.clean;
}

module.exports = {
  getTheme
};
