import type { ThemeOptions } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

export const components: ThemeOptions['components'] = {
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        scrollBehavior: 'smooth',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      },
      '::selection': {
        backgroundColor: 'rgba(103, 80, 164, 0.25)',
      },
      '*::-webkit-scrollbar': {
        width: '6px',
        height: '6px',
      },
      '*::-webkit-scrollbar-track': {
        background: 'transparent',
      },
      '*::-webkit-scrollbar-thumb': {
        backgroundColor: 'rgba(121, 116, 126, 0.25)',
        borderRadius: '9999px',
      },
      '*::-webkit-scrollbar-thumb:hover': {
        backgroundColor: 'rgba(121, 116, 126, 0.45)',
      },
    },
  },

  MuiButton: {
    defaultProps: {
      disableElevation: true,
    },
    styleOverrides: {
      root: {
        borderRadius: 24, // M3 Expressive Pill Button
        padding: '10px 24px',
        fontWeight: 600,
        fontSize: '0.875rem',
        textTransform: 'none',
        letterSpacing: '0.1px',
        transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
        '&:hover': {
          transform: 'translateY(-1px)',
        },
        '&:active': {
          transform: 'scale(0.98)',
        },
      },
      containedPrimary: ({ theme }) => ({
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
        boxShadow: 'none',
        '&:hover': {
          backgroundColor: theme.palette.primary.dark,
          boxShadow: theme.shadows[2],
        },
      }),
      containedSecondary: ({ theme }) => ({
        backgroundColor: theme.palette.secondaryContainer?.main || theme.palette.secondary.main,
        color: theme.palette.secondaryContainer?.contrastText || theme.palette.secondary.contrastText,
        boxShadow: 'none',
        '&:hover': {
          backgroundColor: alpha(theme.palette.secondaryContainer?.main || theme.palette.secondary.main, 0.85),
          boxShadow: theme.shadows[2],
        },
      }),
      sizeSmall: {
        padding: '6px 16px',
        fontSize: '0.8125rem',
        borderRadius: 20,
      },
      sizeLarge: {
        padding: '14px 32px',
        fontSize: '1rem',
        borderRadius: 28,
      },
      outlined: ({ theme }) => ({
        borderWidth: '1px',
        borderColor: theme.palette.outlineVariant || theme.palette.divider,
        color: theme.palette.primary.main,
        '&:hover': {
          borderWidth: '1px',
          borderColor: theme.palette.primary.main,
          backgroundColor: alpha(theme.palette.primary.main, 0.08),
        },
      }),
      text: ({ theme }) => ({
        borderRadius: 20,
        padding: '8px 16px',
        '&:hover': {
          backgroundColor: alpha(theme.palette.primary.main, 0.08),
        },
      }),
    },
  },

  MuiIconButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: '50%',
        transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
        '&:hover': {
          backgroundColor: alpha(theme.palette.primary.main, 0.08),
          transform: 'scale(1.05)',
        },
        '&:active': {
          transform: 'scale(0.95)',
        },
      }),
      sizeSmall: {
        borderRadius: '50%',
        padding: 6,
      },
    },
  },

  MuiCard: {
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundImage: 'none',
        borderRadius: 24, // M3 Expressive Card Radius
        backgroundColor: theme.palette.surfaceContainerLow || theme.palette.background.paper,
        border: `1px solid ${theme.palette.outlineVariant || theme.palette.divider}`,
        transition: 'all 0.25s cubic-bezier(0.2, 0, 0, 1)',
        boxShadow: theme.shadows[1],
        '&:hover': {
          boxShadow: theme.shadows[4],
          borderColor: alpha(theme.palette.primary.main, 0.4),
          transform: 'translateY(-2px)',
        },
      }),
    },
  },

  MuiPaper: {
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundImage: 'none',
        backgroundColor: theme.palette.surfaceContainerLow || theme.palette.background.paper,
      }),
      rounded: {
        borderRadius: 20,
      },
    },
  },

  MuiTextField: {
    defaultProps: {
      variant: 'outlined',
    },
    styleOverrides: {
      root: ({ theme }) => ({
        '& .MuiOutlinedInput-root': {
          borderRadius: 16,
          backgroundColor: theme.palette.surfaceContainerLowest || theme.palette.background.paper,
          transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
          '& fieldset': {
            borderColor: theme.palette.outlineVariant || theme.palette.divider,
            borderWidth: '1px',
          },
          '&:hover fieldset': {
            borderColor: theme.palette.onSurfaceVariant || theme.palette.text.secondary,
            borderWidth: '1.5px',
          },
          '&.Mui-focused fieldset': {
            borderWidth: '2px',
            borderColor: theme.palette.primary.main,
          },
          '&.Mui-error fieldset': {
            borderColor: theme.palette.error.main,
          },
        },
        '& .MuiInputLabel-root': {
          fontSize: '0.875rem',
          '&.Mui-focused': {
            color: theme.palette.primary.main,
            fontWeight: 600,
          },
        },
        '& .MuiFormHelperText-root': {
          marginLeft: 6,
          fontSize: '0.75rem',
        },
      }),
    },
  },

  MuiChip: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: 9999, // M3 Pill Chip
        fontWeight: 600,
        fontSize: '0.8125rem',
        height: 34,
        transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
        '&:hover': {
          transform: 'translateY(-1px)',
        },
        '&:active': {
          transform: 'scale(0.96)',
        },
      }),
      filled: ({ theme }) => ({
        backgroundColor: theme.palette.surfaceContainerHigh || alpha(theme.palette.primary.main, 0.1),
        color: theme.palette.onSurfaceVariant || theme.palette.text.primary,
        border: '1px solid transparent',
        '&:hover': {
          backgroundColor: theme.palette.surfaceContainerHighest || alpha(theme.palette.primary.main, 0.16),
        },
      }),
      outlined: ({ theme }) => ({
        borderWidth: '1px',
        borderColor: theme.palette.outlineVariant || theme.palette.divider,
      }),
    },
  },

  MuiDialog: {
    styleOverrides: {
      paper: ({ theme }) => ({
        borderRadius: 28, // M3 Expressive Dialog Shape
        backgroundColor: theme.palette.surfaceContainerHigh || theme.palette.background.paper,
        backgroundImage: 'none',
        padding: 4,
        boxShadow: theme.shadows[8],
      }),
    },
  },

  MuiDialogTitle: {
    styleOverrides: {
      root: {
        fontSize: '1.35rem',
        fontWeight: 700,
        padding: '24px 24px 12px',
        letterSpacing: '-0.25px',
      },
    },
  },

  MuiDialogContent: {
    styleOverrides: {
      root: {
        padding: '12px 24px 20px',
      },
    },
  },

  MuiDialogActions: {
    styleOverrides: {
      root: {
        padding: '16px 24px 24px',
        gap: 12,
      },
    },
  },

  MuiTableContainer: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: 20,
        border: `1px solid ${theme.palette.outlineVariant || theme.palette.divider}`,
        backgroundColor: theme.palette.surfaceContainerLowest || theme.palette.background.paper,
        overflow: 'hidden',
      }),
    },
  },

  MuiTableHead: {
    styleOverrides: {
      root: ({ theme }) => ({
        '& .MuiTableCell-head': {
          backgroundColor: theme.palette.surfaceContainerLow || theme.palette.action.hover,
          fontWeight: 700,
          fontSize: '0.8125rem',
          color: theme.palette.onSurfaceVariant || theme.palette.text.secondary,
          borderBottom: `1px solid ${theme.palette.outlineVariant || theme.palette.divider}`,
          padding: '14px 18px',
          whiteSpace: 'nowrap',
        },
      }),
    },
  },

  MuiTableRow: {
    styleOverrides: {
      root: ({ theme }) => ({
        transition: 'background-color 0.15s ease',
        '&:hover': {
          backgroundColor: alpha(theme.palette.primary.main, 0.04),
        },
        '&:last-child td': {
          borderBottom: 'none',
        },
      }),
    },
  },

  MuiTableCell: {
    styleOverrides: {
      root: ({ theme }) => ({
        padding: '14px 18px',
        fontSize: '0.875rem',
        borderBottom: `1px solid ${theme.palette.outlineVariant || theme.palette.divider}`,
      }),
    },
  },

  MuiTabs: {
    styleOverrides: {
      root: ({ theme }) => ({
        minHeight: 48,
      }),
      indicator: ({ theme }) => ({
        height: 3,
        borderRadius: '3px 3px 0 0',
        backgroundColor: theme.palette.primary.main,
      }),
    },
  },

  MuiTab: {
    styleOverrides: {
      root: ({ theme }) => ({
        minHeight: 48,
        textTransform: 'none',
        fontWeight: 600,
        fontSize: '0.875rem',
        borderRadius: '16px 16px 0 0',
        transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
        '&:hover': {
          backgroundColor: alpha(theme.palette.primary.main, 0.05),
        },
        '&.Mui-selected': {
          color: theme.palette.primary.main,
          fontWeight: 700,
        },
      }),
    },
  },

  MuiAppBar: {
    defaultProps: { elevation: 0 },
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundColor: 'transparent',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${theme.palette.outlineVariant || theme.palette.divider}`,
      }),
    },
  },

  MuiDrawer: {
    styleOverrides: {
      paper: ({ theme }) => ({
        border: 'none',
        backgroundColor: theme.palette.surfaceContainerLow || theme.palette.background.paper,
        borderLeft: theme.direction === 'rtl' ? `1px solid ${theme.palette.outlineVariant || theme.palette.divider}` : 'none',
        borderRight: theme.direction === 'rtl' ? 'none' : `1px solid ${theme.palette.outlineVariant || theme.palette.divider}`,
      }),
    },
  },

  MuiSwitch: {
    styleOverrides: {
      root: {
        width: 52,
        height: 32,
        padding: 0,
      },
      switchBase: ({ theme }) => ({
        padding: 4,
        '&.Mui-checked': {
          transform: 'translateX(20px)',
          color: '#fff',
          '& + .MuiSwitch-track': {
            opacity: 1,
            backgroundColor: theme.palette.primary.main,
          },
        },
        '&.Mui-focusVisible .MuiSwitch-thumb': {
          boxShadow: `0 0 0 8px ${alpha(theme.palette.primary.main, 0.2)}`,
        },
      }),
      thumb: {
        width: 24,
        height: 24,
        boxShadow: '0px 2px 4px rgba(0,0,0,0.2)',
      },
      track: ({ theme }) => ({
        borderRadius: 16,
        opacity: 1,
        backgroundColor: theme.palette.surfaceContainerHighest || 'rgba(0,0,0,0.15)',
        border: `1px solid ${theme.palette.outlineVariant || 'transparent'}`,
      }),
    },
  },

  MuiAvatar: {
    styleOverrides: {
      root: {
        fontWeight: 600,
      },
      rounded: {
        borderRadius: 16,
      },
    },
  },

  MuiTooltip: {
    styleOverrides: {
      tooltip: ({ theme }) => ({
        borderRadius: 12,
        padding: '8px 14px',
        fontSize: '0.75rem',
        fontWeight: 500,
        backgroundColor: theme.palette.mode === 'dark' ? '#36343B' : '#313033',
        color: '#F4EFF4',
        boxShadow: theme.shadows[4],
      }),
    },
  },

  MuiBadge: {
    styleOverrides: {
      badge: {
        fontSize: '0.6875rem',
        fontWeight: 700,
        height: 20,
        minWidth: 20,
        padding: '0 6px',
        borderRadius: 10,
      },
      dot: {
        height: 10,
        minWidth: 10,
        borderRadius: 5,
      },
    },
  },

  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: 20,
        alignItems: 'center',
        padding: '12px 18px',
        fontWeight: 500,
      },
      standardSuccess: ({ theme }) => ({
        backgroundColor: alpha(theme.palette.success.main, 0.12),
        color: theme.palette.success.main,
        '& .MuiAlert-icon': { color: theme.palette.success.main },
      }),
      standardError: ({ theme }) => ({
        backgroundColor: alpha(theme.palette.error.main, 0.12),
        color: theme.palette.error.main,
        '& .MuiAlert-icon': { color: theme.palette.error.main },
      }),
      standardWarning: ({ theme }) => ({
        backgroundColor: alpha(theme.palette.warning.main, 0.12),
        color: theme.palette.warning.main,
        '& .MuiAlert-icon': { color: theme.palette.warning.main },
      }),
      standardInfo: ({ theme }) => ({
        backgroundColor: alpha(theme.palette.info.main, 0.12),
        color: theme.palette.info.main,
        '& .MuiAlert-icon': { color: theme.palette.info.main },
      }),
    },
  },

  MuiSnackbar: {
    styleOverrides: {
      root: {
        '& .MuiAlert-root': {
          borderRadius: 20,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        },
      },
    },
  },

  MuiSelect: {
    styleOverrides: {
      outlined: {
        borderRadius: 16,
      },
    },
  },

  MuiMenuItem: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: 14,
        margin: '3px 8px',
        padding: '10px 14px',
        fontWeight: 500,
        transition: 'all 0.15s ease',
        '&:hover': {
          backgroundColor: alpha(theme.palette.primary.main, 0.08),
        },
        '&.Mui-selected': {
          backgroundColor: alpha(theme.palette.primary.main, 0.14),
          color: theme.palette.primary.main,
          fontWeight: 600,
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.2),
          },
        },
      }),
    },
  },

  MuiLinearProgress: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: 8,
        height: 6,
        backgroundColor: alpha(theme.palette.primary.main, 0.12),
      }),
      bar: {
        borderRadius: 8,
      },
    },
  },

  MuiSkeleton: {
    styleOverrides: {
      root: {
        borderRadius: 14,
      },
      rounded: {
        borderRadius: 20,
      },
    },
  },

  MuiBackdrop: {
    styleOverrides: {
      root: {
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
      },
    },
  },

  MuiInputBase: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-notchedOutline': {
          borderRadius: 16,
        },
      },
    },
  },

  MuiAutocomplete: {
    styleOverrides: {
      paper: ({ theme }) => ({
        borderRadius: 20,
        marginTop: 6,
        backgroundColor: theme.palette.surfaceContainerHigh || theme.palette.background.paper,
        boxShadow: theme.shadows[6],
      }),
      listbox: ({ theme }) => ({
        padding: 8,
        '& .MuiAutocomplete-option': {
          borderRadius: 14,
          margin: '2px 0',
          padding: '10px 14px',
          '&.Mui-focused': {
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
          },
        },
      }),
    },
  },
};