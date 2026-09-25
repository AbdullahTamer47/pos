import React from 'react';
import { Box, Button, Typography, Container } from '@mui/material';
import { ErrorOutline, Refresh } from '@mui/icons-material';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="sm">
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100vh',
              textAlign: 'center',
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '24px',
                bgcolor: 'error.lighter',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1,
              }}
            >
              <ErrorOutline sx={{ fontSize: 40, color: 'error.main' }} />
            </Box>
            <Typography variant="h4" fontWeight={700}>
              Something went wrong
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              An unexpected error occurred. Please try refreshing the page.
            </Typography>
            {this.state.error && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: '12px',
                  bgcolor: 'grey.100',
                  maxWidth: '100%',
                  overflow: 'auto',
                  mb: 2,
                }}
              >
                <Typography variant="caption" color="error" sx={{ fontFamily: 'monospace' }}>
                  {this.state.error.message}
                </Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={this.handleReset}
                startIcon={<Refresh />}
              >
                Try Again
              </Button>
              <Button
                variant="contained"
                onClick={this.handleReload}
              >
                Reload Page
              </Button>
            </Box>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}