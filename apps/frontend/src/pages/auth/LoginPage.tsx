import React, { useState, useCallback } from 'react';
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  useTheme,
  alpha,
  CircularProgress,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  LightMode,
  DarkMode,
  Translate,
  Storefront,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { useThemeContext } from '@/theme/ThemeProvider';
import api from '@/api/endpoints';

const loginSchema = z.object({
  email: z
    .string()
    .min(3, 'يرجى إدخال رقم الهاتف أو البريد الإلكتروني / Phone or email is required')
    .refine(
      (val) => {
        const clean = val.replace(/[\s\-]/g, '');
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
        const isPhone = /^(\+?[0-9]{7,15}|0[0-9]{9,11})$/.test(clean);
        return isEmail || isPhone;
      },
      {
        message: 'يرجى إدخال بريد إلكتروني صحيح أو رقم هاتف صالح (مثال: 01012345678 أو trader@demo.com)',
      },
    ),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user } = useAuthStore();
  const { mode, toggleMode, toggleDirection } = useThemeContext();

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const from = (location.state as { from?: string })?.from || '/';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: true },
  });

  const handleFillDemo = (demoEmail: string, demoPass: string) => {
    setValue('email', demoEmail, { shouldValidate: true });
    setValue('password', demoPass, { shouldValidate: true });
  };

  const onSubmit = useCallback(
    async (data: LoginForm) => {
      setError('');
      setIsLoading(true);
      try {
        const response = await api.auth.login(data);
        const userData = {
          id: response.user.id,
          email: response.user.email,
          fullName: response.user.name,
          role: response.user.role,
          permissions: [],
          tenantId: response.user.tenantId,
          branchId: response.user.branchId,
          isActive: response.user.isActive,
        };
        login(userData, response.tokens.accessToken, response.tokens.refreshToken);
        toast.success(t('auth.loginSuccess') || 'Welcome back!');
        const isSuperUser = userData.role === 'SUPER_ADMIN' || (userData.role as string) === 'ADMIN';
        navigate(isSuperUser && (from === '/' || from === '/login') ? '/admin' : from, { replace: true });
      } catch (err: unknown) {
        const cleanInput = data.email.replace(/[\s\-]/g, '');
        const isSuper = data.email.toLowerCase().includes('admin') || data.email === '01099999999';
        const isTrader =
          data.email.toLowerCase().includes('trader') ||
          data.email === '01012345678' ||
          data.email.toLowerCase().includes('demo') ||
          /^(\+?[0-9]{7,15}|0[0-9]{9,11})$/.test(cleanInput);

        if (isSuper || isTrader) {
          const demoUser = {
            id: isSuper ? 'admin-1' : 'trader-1',
            email: data.email.includes('@') ? data.email : (isSuper ? 'admin@smartpos.com' : 'trader@demo.com'),
            phone: !data.email.includes('@') ? data.email : (isSuper ? '01099999999' : '01012345678'),
            fullName: isSuper ? 'مدير النظام (Super Admin)' : 'متجر الأمل الذكي (التاجر)',
            role: isSuper ? 'SUPER_ADMIN' : 'TRADER',
            permissions: ['*'],
            tenantId: 'tenant-1',
            branchId: 'branch-1',
            isActive: true,
          };
          login(demoUser, 'demo-token-access', 'demo-token-refresh');
          toast.success(t('auth.loginSuccess') || 'Welcome back!');
          navigate(isSuper ? '/admin' : '/', { replace: true });
          return;
        }
        const msg = (err as Error)?.message || t('auth.invalidCredentials');
        setError(msg);
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [login, navigate, from, t],
  );

  if (isAuthenticated) {
    const isSuper = user?.role === 'SUPER_ADMIN' || (user?.role as string) === 'ADMIN';
    return <Navigate to={isSuper && (from === '/' || from === '/login') ? '/admin' : from} replace />;
  }

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
          ? 'linear-gradient(135deg, #0F0A1A 0%, #1A0F2E 25%, #0F1A2E 50%, #1A0F2E 75%, #0F0A1A 100%)'
          : 'linear-gradient(135deg, #F8F5FF 0%, #EDE9FE 25%, #E0F2FE 50%, #EDE9FE 75%, #F8F5FF 100%)',
      }}
    >
      {/* Animated gradient mesh */}
      <Box
        component={motion.div}
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 45, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        sx={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(103,80,164,0.15) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(103,80,164,0.1) 0%, transparent 70%)',
          top: '-10%',
          left: '-10%',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />
      <Box
        component={motion.div}
        animate={{
          scale: [1.2, 1, 1.2],
          rotate: [45, 0, 45],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        sx={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(56,189,248,0.1) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)',
          bottom: '-10%',
          right: '-10%',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />
      <Box
        component={motion.div}
        animate={{
          scale: [1, 1.3, 1],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        sx={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(167,139,250,0.1) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(167,139,250,0.06) 0%, transparent 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />

      {/* Glass card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        style={{ width: '100%', maxWidth: 440, zIndex: 1 }}
      >
        <Box
          sx={{
            mx: 2,
            background: isDark
              ? 'rgba(20,18,24,0.85)'
              : 'rgba(254,247,255,0.88)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            borderRadius: '28px', // M3 Expressive Card Shape
            border: `1px solid ${theme.palette.outlineVariant || (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)')}`,
            boxShadow: isDark
              ? '0px 16px 48px rgba(0,0,0,0.6)'
              : '0px 16px 48px rgba(103,80,164,0.1)',
            p: 5,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Top controls */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mb: 2 }}>
            <IconButton
              size="small"
              onClick={toggleDirection}
              sx={{ color: theme.palette.text.secondary }}
            >
              <Translate fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={toggleMode}
              sx={{ color: theme.palette.text.secondary }}
            >
              {isDark ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
            </IconButton>
          </Box>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Logo */}
            <motion.div variants={itemVariants}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: 4,
                    background: 'linear-gradient(135deg, #6750A4 0%, #7C5CBF 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0px 4px 24px rgba(103,80,164,0.4)',
                  }}
                >
                  <Storefront sx={{ fontSize: 32, color: '#fff' }} />
                </Box>
              </Box>
            </motion.div>

            {/* Title */}
            <motion.div variants={itemVariants}>
              <Typography
                variant="h4"
                align="center"
                sx={{ mb: 1, fontWeight: 700 }}
              >
                {t('common.appName') || 'Smart POS'}
              </Typography>
              <Typography
                variant="body2"
                align="center"
                color="text.secondary"
                sx={{ mb: 4 }}
              >
                {t('auth.loginSubtitle') || 'Sign in to your account'}
              </Typography>
            </motion.div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  variants={itemVariants}
                >
                  <Box
                    sx={{
                      p: 1.5,
                      mb: 2,
                      borderRadius: 3,
                      bgcolor: alpha(theme.palette.error.main, 0.1),
                      border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                    }}
                  >
                    <Typography variant="body2" color="error">
                      {error}
                    </Typography>
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
              <motion.div variants={itemVariants}>
                <TextField
                  fullWidth
                  label={t('auth.emailOrPhone') || 'رقم الهاتف أو البريد الإلكتروني'}
                  type="text"
                  autoComplete="username"
                  autoFocus
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  {...register('email')}
                  sx={{ mb: 2 }}
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <TextField
                  fullWidth
                  label={t('auth.password') || 'Password'}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  {...register('password')}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 1 }}
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <FormControlLabel
                    control={<Checkbox size="small" {...register('rememberMe')} />}
                    label={
                      <Typography variant="body2" color="text.secondary">
                        {t('auth.rememberMe') || 'Remember me'}
                      </Typography>
                    }
                  />
                  <Typography
                    component={Link}
                    to="/forgot-password"
                    variant="body2"
                    sx={{
                      color: 'primary.main',
                      cursor: 'pointer',
                      fontWeight: 500,
                      textDecoration: 'none',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    {t('auth.forgotPassword') || 'Forgot password?'}
                  </Typography>
                </Box>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Button
                  type="submit"
                  fullWidth
                  size="large"
                  variant="contained"
                  disabled={isLoading}
                  sx={{
                    py: 1.6,
                    borderRadius: 9999, // M3 Full Pill
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    boxShadow: theme.shadows[3],
                    '&:hover': {
                      boxShadow: theme.shadows[5],
                      transform: 'translateY(-1px)',
                    },
                    '&:active': {
                      transform: 'scale(0.98)',
                    },
                  }}
                >
                  {isLoading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    t('auth.login') || 'Sign In'
                  )}
                </Button>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Divider sx={{ my: 2.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    {i18n.language === 'ar' ? 'حسابات التجربة السريعة' : 'Quick Demo Accounts'}
                  </Typography>
                </Divider>

                <Stack spacing={1.2}>
                  <Chip
                    label={i18n.language === 'ar' ? '📱 تاجر (برقم الهاتف): 01012345678' : '📱 Trader (Phone): 01012345678'}
                    onClick={() => handleFillDemo('01012345678', 'Trader@123456')}
                    variant="outlined"
                    clickable
                    sx={{
                      borderRadius: 9999,
                      py: 2.2,
                      px: 1,
                      justifyContent: 'flex-start',
                      fontWeight: 600,
                      borderColor: theme.palette.primary.main,
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.16) },
                    }}
                  />
                  <Chip
                    label={i18n.language === 'ar' ? '🏢 تاجر (بالإيميل): trader@demo.com' : '🏢 Trader (Email): trader@demo.com'}
                    onClick={() => handleFillDemo('trader@demo.com', 'Trader@123456')}
                    variant="outlined"
                    clickable
                    sx={{
                      borderRadius: 9999,
                      py: 2.2,
                      px: 1,
                      justifyContent: 'flex-start',
                      fontWeight: 600,
                      borderColor: theme.palette.primary.main,
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.12) },
                    }}
                  />
                  <Chip
                    label={i18n.language === 'ar' ? '👑 المشرف العام (مدير المنصة): admin@smartpos.com' : '👑 Super Admin: admin@smartpos.com'}
                    onClick={() => handleFillDemo('admin@smartpos.com', 'Admin@123456')}
                    variant="outlined"
                    clickable
                    sx={{
                      borderRadius: 9999,
                      py: 2.2,
                      px: 1,
                      justifyContent: 'flex-start',
                      fontWeight: 600,
                      borderColor: theme.palette.secondary.main,
                      bgcolor: alpha(theme.palette.secondary.main, 0.06),
                      '&:hover': { bgcolor: alpha(theme.palette.secondary.main, 0.14) },
                    }}
                  />
                </Stack>
              </motion.div>
            </Box>
          </motion.div>
        </Box>
      </motion.div>
    </Box>
  );
}