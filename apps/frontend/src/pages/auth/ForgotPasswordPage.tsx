import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Box, TextField, Button, Typography, useTheme, alpha, CircularProgress, InputAdornment } from '@mui/material';
import { ArrowBack, MarkEmailRead } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { useThemeContext } from '@/theme/ThemeProvider';
import api from '@/api/endpoints';

const schema = z.object({
  email: z.string().email('Invalid email').min(1, 'Email is required'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const { mode } = useThemeContext();
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = useCallback(
    async (data: FormData) => {
      setIsLoading(true);
      try {
        await api.auth.forgotPassword({ email: data.email });
        setSent(true);
        toast.success(t('auth.resetLinkSent') || 'Reset link sent to your email');
      } catch (err: unknown) {
        const msg = (err as Error)?.message || t('errors.generic');
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [t],
  );

  const isDark = mode === 'dark';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: isDark
          ? 'linear-gradient(135deg, #0F0A1A 0%, #1A0F2E 50%, #0F1A2E 100%)'
          : 'linear-gradient(135deg, #F8F5FF 0%, #EDE9FE 50%, #E0F2FE 100%)',
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
            background: isDark ? 'rgba(29,27,32,0.75)' : 'rgba(255,255,255,0.75)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            borderRadius: 6,
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)'}`,
            boxShadow: isDark ? '0px 8px 48px rgba(0,0,0,0.5)' : '0px 8px 48px rgba(0,0,0,0.08)',
            p: 5,
          }}
        >
          {!sent ? (
            <>
              <Button
                component={Link}
                to="/login"
                startIcon={<ArrowBack />}
                sx={{ mb: 3, px: 0, color: 'text.secondary' }}
              >
                {t('common.back') || 'Back'}
              </Button>

              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                {t('auth.forgotPassword') || 'Forgot Password'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                {t('auth.forgotPasswordDesc') || 'Enter your email and we will send you a reset link'}
              </Typography>

              <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <TextField
                  fullWidth
                  label={t('auth.email') || 'Email'}
                  type="email"
                  autoComplete="email"
                  autoFocus
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  {...register('email')}
                  sx={{ mb: 3 }}
                />

                <Button
                  type="submit"
                  fullWidth
                  size="large"
                  variant="contained"
                  disabled={isLoading}
                  sx={{ py: 1.5, borderRadius: 4, fontSize: '1rem', fontWeight: 700 }}
                >
                  {isLoading ? <CircularProgress size={24} color="inherit" /> : (t('auth.sendResetLink') || 'Send Reset Link')}
                </Button>
              </Box>
            </>
          ) : (
            <Box sx={{ textAlign: 'center' }}>
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
                <MarkEmailRead sx={{ fontSize: 36, color: 'success.main' }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                {t('auth.checkYourEmail') || 'Check Your Email'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                {t('auth.resetLinkSentDesc') || 'We have sent a password reset link to your email address. Please check your inbox.'}
              </Typography>
              <Button
                component={Link}
                to="/login"
                variant="contained"
                fullWidth
                size="large"
                sx={{ py: 1.5, borderRadius: 4, fontWeight: 700 }}
              >
                {t('auth.backToLogin') || 'Back to Login'}
              </Button>
            </Box>
          )}
        </Box>
      </motion.div>
    </Box>
  );
}
