export const colors = {
  // Core
  primary: '#3D8A5A',
  primaryLight: '#C8F0D8',
  primaryLighter: '#E8F5EC',
  primaryForeground: '#FFFFFF',

  // Surfaces
  background: '#F5F4F0',
  card: '#FFFFFF',
  canvas: '#E8E6E0',

  // Text
  text: '#1A1918',
  textSecondary: '#9E9C97',
  textMuted: '#B8B6B0',
  inactive: '#B8B6B0',

  // Border
  border: '#D8D6D0',

  // Semantic
  secondary: '#D08068',       // expense / danger-ish
  secondaryLight: '#F5EDED',
  yellow: '#D4A017',

  // Status
  success: '#3D8A5A',
  successLight: '#E8F5EE',
  error: '#D85050',
  errorLight: '#FEECEC',

  // Common
  white: '#FFFFFF',
  black: '#1A1918',
  overlay: 'rgba(26,25,24,0.4)',
} as const;

export const fonts = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semiBold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
} as const;
