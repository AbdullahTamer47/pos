import type { PaletteMode, CSSProperties } from '@mui/material';

declare module '@mui/material/styles' {
  interface Palette {
    surfaceContainerLowest: string;
    surfaceContainerLow: string;
    surfaceContainer: string;
    surfaceContainerHigh: string;
    surfaceContainerHighest: string;
    surfaceDim: string;
    surfaceBright: string;
    onSurfaceVariant: string;
    outlineVariant: string;
    primaryContainer: {
      main: string;
      contrastText: string;
    };
    secondaryContainer: {
      main: string;
      contrastText: string;
    };
    tertiaryContainer: {
      main: string;
      contrastText: string;
    };
    tertiary: {
      main: string;
      contrastText: string;
      light: string;
      dark: string;
    };
  }
  interface PaletteOptions {
    surfaceContainerLowest?: string;
    surfaceContainerLow?: string;
    surfaceContainer?: string;
    surfaceContainerHigh?: string;
    surfaceContainerHighest?: string;
    surfaceDim?: string;
    surfaceBright?: string;
    onSurfaceVariant?: string;
    outlineVariant?: string;
    primaryContainer?: {
      main: string;
      contrastText: string;
    };
    secondaryContainer?: {
      main: string;
      contrastText: string;
    };
    tertiaryContainer?: {
      main: string;
      contrastText: string;
    };
    tertiary?: {
      main: string;
      contrastText: string;
      light?: string;
      dark?: string;
    };
  }
}

export const M3_SYS_LIGHT = {
  primary: '#6750A4',
  onPrimary: '#FFFFFF',
  primaryContainer: '#EADDFF',
  onPrimaryContainer: '#21005D',
  secondary: '#625B71',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#E8DEF8',
  onSecondaryContainer: '#1D192B',
  tertiary: '#7D5260',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#FFD8E4',
  onTertiaryContainer: '#31111D',
  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',
  background: '#FEF7FF',
  onBackground: '#1D1B20',
  surface: '#FEF7FF',
  onSurface: '#1D1B20',
  surfaceVariant: '#E7E0EC',
  onSurfaceVariant: '#49454F',
  outline: '#79747E',
  outlineVariant: '#CAC4D0',
  surfaceDim: '#DED8E1',
  surfaceBright: '#FEF7FF',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F7F2FA',
  surfaceContainer: '#F3EDF7',
  surfaceContainerHigh: '#ECE6F0',
  surfaceContainerHighest: '#E6E0E9',
  shadow: '#000000',
  scrim: '#000000',
  success: '#1A8245',
  warning: '#B26A00',
  info: '#00639B',
};

export const M3_SYS_DARK = {
  primary: '#D0BCFF',
  onPrimary: '#381E72',
  primaryContainer: '#4F378B',
  onPrimaryContainer: '#EADDFF',
  secondary: '#CCC2DC',
  onSecondary: '#332D41',
  secondaryContainer: '#4A4458',
  onSecondaryContainer: '#E8DEF8',
  tertiary: '#EFB8C8',
  onTertiary: '#492532',
  tertiaryContainer: '#633B48',
  onTertiaryContainer: '#FFD8E4',
  error: '#FFB4AB',
  onError: '#690005',
  errorContainer: '#93000A',
  onErrorContainer: '#FFDAD6',
  background: '#141218',
  onBackground: '#E6E1E5',
  surface: '#141218',
  onSurface: '#E6E1E5',
  surfaceVariant: '#49454F',
  onSurfaceVariant: '#CAC4D0',
  outline: '#938F99',
  outlineVariant: '#49454F',
  surfaceDim: '#141218',
  surfaceBright: '#3B383E',
  surfaceContainerLowest: '#0F0D13',
  surfaceContainerLow: '#1D1B20',
  surfaceContainer: '#211F26',
  surfaceContainerHigh: '#2B2930',
  surfaceContainerHighest: '#36343B',
  shadow: '#000000',
  scrim: '#000000',
  success: '#4ADE80',
  warning: '#FBBF24',
  info: '#38BDF8',
};

export function getM3Palette(mode: PaletteMode) {
  const tokens = mode === 'dark' ? M3_SYS_DARK : M3_SYS_LIGHT;

  return {
    mode,
    primary: {
      main: tokens.primary,
      contrastText: tokens.onPrimary,
      light: tokens.primaryContainer,
      dark: tokens.primary,
    },
    primaryContainer: {
      main: tokens.primaryContainer,
      contrastText: tokens.onPrimaryContainer,
    },
    secondary: {
      main: tokens.secondary,
      contrastText: tokens.onSecondary,
      light: tokens.secondaryContainer,
      dark: tokens.secondary,
    },
    secondaryContainer: {
      main: tokens.secondaryContainer,
      contrastText: tokens.onSecondaryContainer,
    },
    tertiary: {
      main: tokens.tertiary,
      contrastText: tokens.onTertiary,
      light: tokens.tertiaryContainer,
      dark: tokens.tertiary,
    },
    tertiaryContainer: {
      main: tokens.tertiaryContainer,
      contrastText: tokens.onTertiaryContainer,
    },
    error: {
      main: tokens.error,
      contrastText: tokens.onError,
      light: tokens.errorContainer,
      dark: tokens.error,
    },
    warning: {
      main: tokens.warning,
      contrastText: '#FFFFFF',
    },
    info: {
      main: tokens.info,
      contrastText: '#FFFFFF',
    },
    success: {
      main: tokens.success,
      contrastText: '#FFFFFF',
    },
    background: {
      default: tokens.background,
      paper: tokens.surfaceContainerLowest,
    },
    surfaceContainerLowest: tokens.surfaceContainerLowest,
    surfaceContainerLow: tokens.surfaceContainerLow,
    surfaceContainer: tokens.surfaceContainer,
    surfaceContainerHigh: tokens.surfaceContainerHigh,
    surfaceContainerHighest: tokens.surfaceContainerHighest,
    surfaceDim: tokens.surfaceDim,
    surfaceBright: tokens.surfaceBright,
    onSurfaceVariant: tokens.onSurfaceVariant,
    outlineVariant: tokens.outlineVariant,
    text: {
      primary: tokens.onBackground,
      secondary: tokens.onSurfaceVariant,
      disabled: tokens.outline,
    },
    divider: tokens.outlineVariant,
    action: {
      active: tokens.onSurfaceVariant,
      hover: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      selected: mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
      disabled: tokens.outline,
      disabledBackground: mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
      focus: mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
    },
    tonalOffset: 0.2,
  };
}

export const glassStyles = (mode: PaletteMode): CSSProperties => ({
  background: mode === 'dark'
    ? 'rgba(33, 31, 38, 0.72)'
    : 'rgba(254, 247, 255, 0.75)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
  borderRadius: 24,
});

export const glassCardSx = (mode: PaletteMode) => ({
  background: mode === 'dark'
    ? 'rgba(33, 31, 38, 0.68)'
    : 'rgba(255, 255, 255, 0.8)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
  borderRadius: 5,
  boxShadow: mode === 'dark'
    ? '0px 8px 32px rgba(0,0,0,0.45)'
    : '0px 8px 32px rgba(103,80,164,0.06)',
});

export const gradientBg = (mode: PaletteMode): CSSProperties => ({
  background: mode === 'dark'
    ? 'linear-gradient(135deg, #141218 0%, #211F26 50%, #1D1B20 100%)'
    : 'linear-gradient(135deg, #FEF7FF 0%, #F3EDF7 50%, #F7F2FA 100%)',
});