export const C = {
  bg: "#06060B",
  ink2: "#0B0B14",
  paper: "#EDEDF4",
  muted: "#8B8B9E",
  cyan: "#2BE4FF",
  magenta: "#FF3D8A",
  lime: "#B8F53D",
  violet: "#8B7CFF",
  amber: "#FFC53D",
};

export const hexToRgba = (hex: string, a: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
};
