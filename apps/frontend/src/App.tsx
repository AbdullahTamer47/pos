import React, { Suspense } from 'react';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { Box, CircularProgress, Typography } from '@mui/material';
import { ThemeContextProvider } from './theme/ThemeProvider';
import { router } from './router';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SnackbarProvider } from './components/SnackbarProvider';
import { OfflineIndicator } from './components/OfflineIndicator';
import { offlineService } from './services/offlineService';

type ApiError = Error & { status?: number };

function handleApiError(error: unknown): void {
  const err = error as ApiError;
  if (
    err?.status === 401 ||
    err?.message?.includes('Network Error') ||
    err?.message?.includes('Server error') ||
    err?.message?.includes('Failed to fetch')
  ) {
    return;
  }
  const message = err?.message || 'An unexpected error occurred';
  toast.error(message);
}

type MutationMeta = { successMsg?: string; silent?: boolean };

function handleMutationSuccess(
  _data: unknown,
  _variables: unknown,
  _context: unknown,
  mutation: { options?: { meta?: MutationMeta } },
): void {
  const meta = mutation?.options?.meta;
  if (!meta || meta.silent || !meta.successMsg) {
    return;
  }
  toast.success(meta.successMsg);
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({}),
  mutationCache: new MutationCache({
    onError: handleApiError,
    onSuccess: handleMutationSuccess,
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

function FullPageSpinner() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: 2,
      }}
    >
      <CircularProgress size={48} />
      <Typography variant="body2" color="text.secondary">
        Loading...
      </Typography>
    </Box>
  );
}


export function App() {
  React.useEffect(() => {
    offlineService.initAutoSyncListener();
    if (navigator.onLine) {
      offlineService.syncPendingInvoices();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeContextProvider>
        <SnackbarProvider>
          <ErrorBoundary>
            <Suspense fallback={<FullPageSpinner />}>
              <OfflineIndicator />
              <RouterProvider router={router} />
            </Suspense>
          </ErrorBoundary>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                borderRadius: '12px',
                fontWeight: 500,
              },
              success: {
                iconTheme: { primary: '#4CAF50', secondary: '#fff' },
              },
              error: {
                duration: 6000,
                iconTheme: { primary: '#F44336', secondary: '#fff' },
              },
            }}
          />
        </SnackbarProvider>
      </ThemeContextProvider>
      {import.meta.env.DEV && <ReactQueryDevtools position="right" />}
    </QueryClientProvider>
  );
}