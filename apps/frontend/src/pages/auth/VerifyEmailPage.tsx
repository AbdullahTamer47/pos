import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Box, Button, Typography, useTheme, alpha, CircularProgress } from '@mui/material';
import { CheckCircle, Error as ErrorIcon, Email } from '@mui/icons-material';
import { useThemeContext } from '@/theme/ThemeProvider';
import api from '@/api/endpoints';

export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const { mode } = useThemeContext();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const verify = useCallback(async () => {
    if (!token) {
      setStatus('error');
      setErrorMsg(t('auth.noVerifyToken') || 'No verification token provided');
      return;
    }
    try {
      await api.auth.verifyEmail({ token });
      setStatus('success');
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg((err as Error)?.message || t('auth.verifyFailed') || 'Verification failed');
    }
  }, [token, t]);

  useEffect(() => {
    verify();
  }, [verify]);

  const isDark = mode === 'dark';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isDark ? 'linear-gradient(135deg, #0F0A1A, #1A0F2E)' : 'linear-gradient(135deg, #F8F5FF, #EDE9FE)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        style={{ width: '100%', maxWidth: 440, zIndex: 1 }}
      >
        <Box
          sx={{
            mx: 2,
            p: 5,
            borderRadius: 6,
            background: isDark ? 'rgba(29,27,32,0.75)' : 'rgba(255,255,255,0.75)',
            backdropFilter: 'blur(30px)',
            textAlign: 'center',
          }}
        >
          {status === 'loading' && (
            <>
              <CircularProgress size={56} sx={{ mb: 3 }} />
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                {t('auth.verifying') || 'Verifying...'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('auth.verifyingDesc') || 'Please wait while we verify your email'}
              </Typography>
            </>
          )}

          {status === 'success' && (
            <>
              <Box
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: 4,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.2)}, ${alpha(theme.palette.success.main, 0.4)})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <CheckCircle sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                {t('auth.emailVerified') || 'Email Verified'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                {t('auth.emailVerifiedDesc') || 'Your email has been verified successfully. You can now log in.'}
              </Typography>
              <Button
                component={Link}
                to="/login"
                variant="contained"
                fullWidth
                size="large"
                sx={{ borderRadius: 4, fontWeight: 700 }}
              >
                {t('auth.backToLogin') || 'Back to Login'}
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <Box
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: 4,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.2)}, ${alpha(theme.palette.error.main, 0.4)})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <ErrorIcon sx={{ fontSize: 40, color: 'error.main' }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                {t('auth.verifyFailed') || 'Verification Failed'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                {errorMsg}
              </Typography>
              <Button
                component={Link}
                to="/login"
                variant="contained"
                fullWidth
                size="large"
                sx={{ borderRadius: 4, fontWeight: 700 }}
              >
                {t('auth.backToLogin') || 'Back to Login'}
              </Button>
            </>
          )}
        </Box>
      </motion.div>
    </Box>
  );
}
