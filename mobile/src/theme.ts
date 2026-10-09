export const theme = {
  ink: '#12100E',
  ink2: '#1A1714',
  line: '#302A24',
  parchment: '#E8E0D2',
  parchmentDim: '#9A9184',
  brass: '#C9A227',
  verdictStrong: '#6B9E78',
  verdictMid: '#C9A227',
  verdictWeak: '#B5614F',
} as const;

export function verdictColor(score: number | null) {
  if (score === null) return theme.parchmentDim;
  if (score >= 70) return theme.verdictStrong;
  if (score >= 45) return theme.verdictMid;
  return theme.verdictWeak;
}
