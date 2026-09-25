import React from 'react';
import { Box, Button, Card, Typography, alpha, useTheme } from '@mui/material';
import { ErrorOutline, Refresh, Home } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface RouteErrorBoundaryProps {
  children: React.ReactNode;
  resetKey?: string;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  resetKey: string | undefined;
}

export class RouteErrorBoundary extends React.Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  constructor(props: RouteErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      resetKey: props.resetKey,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<RouteErrorBoundaryState> {
    return { hasError: true, error };
  }

  static getDerivedStateFromProps(
    props: RouteErrorBoundaryProps,
    state: RouteErrorBoundaryState,
  ): Partial<RouteErrorBoundaryState> | null {
    if (props.resetKey !== state.resetKey) {
      return { hasError: false, error: null, resetKey: props.resetKey };
    }
    return null;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('RouteErrorBoundary caught:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return <ErrorFallback message={this.state.error?.message} onReset={this.handleReset} />;
  }
}

function ErrorFallback({
  message,
  onReset,
}: {
  message?: string;
  onReset: () => void;
}): React.ReactElement {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Card
      sx={{
        p: 5,
        borderRadius: 4,
        border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
        background: alpha(theme.palette.error.main, 0.04),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 2,
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: alpha(theme.palette.error.main, 0.12),
        }}
      >
        <ErrorOutline sx={{ fontSize: 32, color: 'error.main' }} />
      </Box>
      <Box>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
          حدث خطأ أثناء تحميل الصفحة
        </Typography>
        <Typography variant="body2" color="text.secondary">
          يمكنك إعادة المحاولة، أو العودة للوحة التحكم الرئيسية لمتابعة عملك.
        </Typography>
      </Box>
      {message && (
        <Box
          sx={{
            px: 2,
            py: 1,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.error.main, 0.08),
            maxWidth: '100%',
            overflow: 'auto',
          }}
        >
          <Typography variant="caption" color="error" sx={{ fontFamily: 'monospace' }}>
            {message}
          </Typography>
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 1.5 }}>
        <Button
          variant="outlined"
          onClick={onReset}
          startIcon={<Refresh />}
        >
          إعادة المحاولة
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            onReset();
            navigate('/');
          }}
          startIcon={<Home />}
        >
          العودة للرئيسية
        </Button>
      </Box>
    </Card>
  );
}
