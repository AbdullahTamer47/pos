import type { TypographyVariantsOptions } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface TypographyVariants {
    displayLarge: React.CSSProperties;
    displayMedium: React.CSSProperties;
    displaySmall: React.CSSProperties;
    headlineLarge: React.CSSProperties;
    headlineMedium: React.CSSProperties;
    headlineSmall: React.CSSProperties;
    titleLarge: React.CSSProperties;
    titleMedium: React.CSSProperties;
    titleSmall: React.CSSProperties;
    bodyLarge: React.CSSProperties;
    bodyMedium: React.CSSProperties;
    bodySmall: React.CSSProperties;
    labelLarge: React.CSSProperties;
    labelMedium: React.CSSProperties;
    labelSmall: React.CSSProperties;
  }
  interface TypographyVariantsOptions {
    displayLarge?: React.CSSProperties;
    displayMedium?: React.CSSProperties;
    displaySmall?: React.CSSProperties;
    headlineLarge?: React.CSSProperties;
    headlineMedium?: React.CSSProperties;
    headlineSmall?: React.CSSProperties;
    titleLarge?: React.CSSProperties;
    titleMedium?: React.CSSProperties;
    titleSmall?: React.CSSProperties;
    bodyLarge?: React.CSSProperties;
    bodyMedium?: React.CSSProperties;
    bodySmall?: React.CSSProperties;
    labelLarge?: React.CSSProperties;
    labelMedium?: React.CSSProperties;
    labelSmall?: React.CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    displayLarge: true;
    displayMedium: true;
    displaySmall: true;
    headlineLarge: true;
    headlineMedium: true;
    headlineSmall: true;
    titleLarge: true;
    titleMedium: true;
    titleSmall: true;
    bodyLarge: true;
    bodyMedium: true;
    bodySmall: true;
    labelLarge: true;
    labelMedium: true;
    labelSmall: true;
  }
}

export const typography: TypographyVariantsOptions = {
  fontFamily: '"Cairo", "Plus Jakarta Sans", "Roboto", "Segoe UI", sans-serif',
  displayLarge: {
    fontSize: '3.5625rem',
    fontWeight: 400,
    lineHeight: '4rem',
    letterSpacing: '-0.25px',
  },
  displayMedium: {
    fontSize: '2.8125rem',
    fontWeight: 400,
    lineHeight: '3.25rem',
    letterSpacing: '0',
  },
  displaySmall: {
    fontSize: '2.25rem',
    fontWeight: 400,
    lineHeight: '2.75rem',
    letterSpacing: '0',
  },
  headlineLarge: {
    fontSize: '2rem',
    fontWeight: 400,
    lineHeight: '2.5rem',
    letterSpacing: '0',
  },
  headlineMedium: {
    fontSize: '1.75rem',
    fontWeight: 400,
    lineHeight: '2.25rem',
    letterSpacing: '0',
  },
  headlineSmall: {
    fontSize: '1.5rem',
    fontWeight: 400,
    lineHeight: '2rem',
    letterSpacing: '0',
  },
  titleLarge: {
    fontSize: '1.375rem',
    fontWeight: 600,
    lineHeight: '1.75rem',
    letterSpacing: '0',
  },
  titleMedium: {
    fontSize: '1rem',
    fontWeight: 700,
    lineHeight: '1.5rem',
    letterSpacing: '0.15px',
  },
  titleSmall: {
    fontSize: '0.875rem',
    fontWeight: 600,
    lineHeight: '1.25rem',
    letterSpacing: '0.1px',
  },
  h1: {
    fontSize: '2.25rem',
    fontWeight: 700,
    lineHeight: '2.75rem',
    letterSpacing: '-0.5px',
  },
  h2: {
    fontSize: '1.75rem',
    fontWeight: 700,
    lineHeight: '2.25rem',
    letterSpacing: '-0.25px',
  },
  h3: {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: '2rem',
    letterSpacing: '0',
  },
  h4: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: '1.75rem',
    letterSpacing: '0.15px',
  },
  h5: {
    fontSize: '1.125rem',
    fontWeight: 600,
    lineHeight: '1.625rem',
    letterSpacing: '0.15px',
  },
  h6: {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: '1.5rem',
    letterSpacing: '0.15px',
  },
  subtitle1: {
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: '1.5rem',
    letterSpacing: '0.15px',
  },
  subtitle2: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.375rem',
    letterSpacing: '0.1px',
  },
  body1: {
    fontSize: '1rem',
    fontWeight: 400,
    lineHeight: '1.5rem',
    letterSpacing: '0.5px',
  },
  body2: {
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: '1.25rem',
    letterSpacing: '0.25px',
  },
  bodyLarge: {
    fontSize: '1rem',
    fontWeight: 400,
    lineHeight: '1.5rem',
    letterSpacing: '0.5px',
  },
  bodyMedium: {
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: '1.25rem',
    letterSpacing: '0.25px',
  },
  bodySmall: {
    fontSize: '0.75rem',
    fontWeight: 400,
    lineHeight: '1rem',
    letterSpacing: '0.4px',
  },
  caption: {
    fontSize: '0.75rem',
    fontWeight: 400,
    lineHeight: '1rem',
    letterSpacing: '0.4px',
  },
  overline: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    lineHeight: '1rem',
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
  },
  button: {
    fontSize: '0.875rem',
    fontWeight: 600,
    lineHeight: '1.25rem',
    letterSpacing: '0.1px',
    textTransform: 'none',
  },
  labelLarge: {
    fontSize: '0.875rem',
    fontWeight: 600,
    lineHeight: '1.25rem',
    letterSpacing: '0.1px',
  },
  labelMedium: {
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: '1rem',
    letterSpacing: '0.5px',
  },
  labelSmall: {
    fontSize: '0.6875rem',
    fontWeight: 500,
    lineHeight: '1rem',
    letterSpacing: '0.5px',
  },
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightBold: 700,
};