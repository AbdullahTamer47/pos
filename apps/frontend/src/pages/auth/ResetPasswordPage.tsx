import { useState, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Box, TextField, Button, Typography, useTheme, alpha, CircularProgress, InputAdornment, IconButton } from '@mui/material';
import { ArrowBack, Visibility, VisibilityOff, Lock } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { useThemeContext } from '@/theme/ThemeProvider';
import api from '@/api/endpoints';

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const { mode } = useThemeContext();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = useCallback(
    async (data: FormData) => {
      if (!token) {
        toast.error(t('auth.invalidResetToken') || 'Invalid or missing reset token');
        return;
      }
      setIsLoading(true);
      try {
        await api.auth.resetPassword({ token, newPassword: data.password });
        toast.success(t('auth.passwordResetSuccess') || 'Password reset successfully');
        navigate('/login', { replace: true });
      } catch (err: unknown) {
        const msg = (err as Error)?.message || t('auth.resetFailed');
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [token, navigate, t],
  );

  const isDark = mode === 'dark';

  if (!token) {
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
        <Box
          sx={{
            maxWidth: 440,
            mx: 2,
            p: 5,
            borderRadius: 6,
            background: isDark ? 'rgba(29,27,32,0.75)' : 'rgba(255,255,255,0.75)',
            backdropFilter: 'blur(30px)',
            textAlign: 'center',
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            {t('auth.invalidResetToken') || 'Invalid Reset Link'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            {t('auth.invalidResetTokenDesc') || 'The reset link is invalid or has expired. Please request a new one.'}
          </Typography>
          <Button component={Link} to="/forgot-password" variant="contained" fullWidth size="large" sx={{ borderRadius: 4, fontWeight: 700 }}>
            {t('auth.requestNewLink') || 'Request New Link'}
          </Button>
        </Box>
      </Box>
    );
  }

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
          <Button
            component={Link}
            to="/login"
            startIcon={<ArrowBack />}
            sx={{ mb: 3, px: 0, color: 'text.secondary' }}
          >
            {t('common.back') || 'Back'}
          </Button>

          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            {t('auth.resetPassword') || 'Reset Password'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            {t('auth.resetPasswordDesc') || 'Enter your new password below'}
          </Typography>

          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <TextField
              fullWidth
              label={t('auth.newPassword') || 'New Password'}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              autoFocus
              error={!!errors.password}
              helperText={errors.password?.message}
              {...register('password')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ fontSize: 20, color: 'action.active' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label={t('auth.confirmPassword') || 'Confirm Password'}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
              {...register('confirmPassword')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ fontSize: 20, color: 'action.active' }} />
                  </InputAdornment>
                ),
              }}
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
              {isLoading ? <CircularProgress size={24} color="inherit" /> : (t('auth.resetPassword') || 'Reset Password')}
            </Button>
          </Box>
        </Box>
      </motion.div>
    </Box>
  );
}
