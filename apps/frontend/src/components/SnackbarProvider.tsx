import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import {
  Snackbar,
  Alert,
  AlertColor,
  IconButton,
  Typography,
  useTheme,
} from '@mui/material';
import { Close } from '@mui/icons-material';

interface SnackbarMessage {
  id: string;
  message: string;
  severity: AlertColor;
  duration?: number;
}

interface SnackbarContextValue {
  enqueueSnackbar: (message: string, severity?: AlertColor, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

interface SnackbarProviderProps {
  children: React.ReactNode;
}

export function SnackbarProvider({ children }: SnackbarProviderProps) {
  const theme = useTheme();
  const [queue, setQueue] = useState<SnackbarMessage[]>([]);
  const [current, setCurrent] = useState<SnackbarMessage | null>(null);
  const [open, setOpen] = useState(false);

  const enqueueSnackbar = useCallback(
    (message: string, severity: AlertColor = 'info', duration: number = 5000) => {
      const id = crypto.randomUUID();
      const snackbar: SnackbarMessage = { id, message, severity, duration };
      setQueue((prev) => [...prev, snackbar]);
    },
    []
  );

  const success = useCallback((message: string) => enqueueSnackbar(message, 'success'), [enqueueSnackbar]);
  const error = useCallback((message: string) => enqueueSnackbar(message, 'error'), [enqueueSnackbar]);
  const warning = useCallback((message: string) => enqueueSnackbar(message, 'warning'), [enqueueSnackbar]);
  const info = useCallback((message: string) => enqueueSnackbar(message, 'info'), [enqueueSnackbar]);

  const handleClose = useCallback((_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  }, []);

  const handleExited = useCallback(() => {
    setCurrent(null);
  }, []);

  React.useEffect(() => {
    if (queue.length > 0 && !current) {
      const [next, ...rest] = queue;
      setCurrent(next ?? null);
      setQueue(rest);
      setOpen(true);
    }
  }, [queue, current]);

  const contextValue = useMemo(
    () => ({ enqueueSnackbar, success, error, warning, info }),
    [enqueueSnackbar, success, error, warning, info]
  );

  return (
    <SnackbarContext.Provider value={contextValue}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={current?.duration ?? 5000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        TransitionProps={{ onExited: handleExited }}
      >
        <Alert
          onClose={handleClose}
          severity={current?.severity ?? 'info'}
          variant="filled"
          sx={{
            borderRadius: '14px',
            boxShadow: theme.shadows[8],
            alignItems: 'center',
            '& .MuiAlert-action': {
              paddingTop: 0,
            },
          }}
          action={
            <IconButton size="small" color="inherit" onClick={handleClose}>
              <Close fontSize="small" />
            </IconButton>
          }
        >
          <Typography variant="body2" fontWeight={500}>
            {current?.message}
          </Typography>
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar(): SnackbarContextValue {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
}