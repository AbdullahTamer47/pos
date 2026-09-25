import { createTheme, type ThemeOptions } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material';
import { getM3Palette } from './palette';
import { typography } from './typography';
import { shadows } from './shadows';
import { components } from './components';

export function createAppTheme(mode: PaletteMode, direction: 'ltr' | 'rtl' = 'rtl') {
  const palette = getM3Palette(mode);

  return createTheme({
    direction,
    palette,
    typography,
    shadows: shadows(mode) as ThemeOptions['shadows'],
    shape: {
      borderRadius: 16,
    },
    spacing: 8,
    transitions: {
      duration: {
        shortest: 150,
        shorter: 200,
        short: 250,
        standard: 300,
        complex: 375,
        enteringScreen: 225,
        leavingScreen: 195,
      },
      easing: {
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
      },
    },
    components,
    mixins: {
      toolbar: {
        minHeight: 64,
      },
    },
  });
}