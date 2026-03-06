const THEMES = {
  dark: {
    card: "#0b1220",
    bg2: "#111b33",
    panel: "#121f3b",
    tile: "#18284a",
    text: "#e8eefc",
    muted: "#a7b6d8",
    accent: "#4da3ff",
    accent2: "#5cf0c8",
    track: "#243960",
    border: "#2c3f66",
    langPalette: ["#4da3ff", "#5cf0c8", "#f9c74f", "#f9844a", "#b388ff", "#ff6fae"]
  },
  ocean: {
    card: "#032633",
    bg2: "#083c4f",
    panel: "#094357",
    tile: "#0d5167",
    text: "#eaffff",
    muted: "#9fd8e2",
    accent: "#37d8ff",
    accent2: "#67ffcc",
    track: "#1b5f75",
    border: "#2f7287",
    langPalette: ["#37d8ff", "#67ffcc", "#9eff6e", "#ffd56a", "#ffa4dd", "#8cb3ff"]
  },
  clean: {
    card: "#f8fbff",
    bg2: "#edf3ff",
    panel: "#ffffff",
    tile: "#f4f8ff",
    text: "#0f172a",
    muted: "#51617d",
    accent: "#2f6df7",
    accent2: "#0ea5a5",
    track: "#dfe9ff",
    border: "#d8e4fb",
    langPalette: ["#2f6df7", "#0ea5a5", "#f59e0b", "#ef4444", "#8b5cf6", "#0891b2"]
  },
  warm: {
    card: "#2e1b13",
    bg2: "#47261b",
    panel: "#542f21",
    tile: "#643a28",
    text: "#fff1e5",
    muted: "#efc9a9",
    accent: "#ff8a3d",
    accent2: "#ffd166",
    track: "#7f4c36",
    border: "#87533b",
    langPalette: ["#ff8a3d", "#ffd166", "#8affb3", "#67c8ff", "#ffa5d8", "#c9b5ff"]
  },
  forest: {
    card: "#0f2317",
    bg2: "#1b3723",
    panel: "#1a3f2a",
    tile: "#255536",
    text: "#ecfff3",
    muted: "#b3d8bf",
    accent: "#5ad47a",
    accent2: "#9bffb7",
    track: "#35694a",
    border: "#437a58",
    langPalette: ["#5ad47a", "#9bffb7", "#f9c74f", "#67c8ff", "#f78fb3", "#c2b5ff"]
  },
  graphite: {
    card: "#171a20",
    bg2: "#252a35",
    panel: "#242a36",
    tile: "#2a3242",
    text: "#f2f4f8",
    muted: "#b8c0cd",
    accent: "#8ea1ff",
    accent2: "#73d8ff",
    track: "#3a4458",
    border: "#465269",
    langPalette: ["#8ea1ff", "#73d8ff", "#93e77c", "#f6c85f", "#f48fb1", "#b39ddb"]
  }
};

function getTheme(name) {
  return THEMES[name] || THEMES.dark;
}

module.exports = {
  getTheme
};
