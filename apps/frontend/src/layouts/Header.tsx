import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Avatar,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  useTheme,
  alpha,
  Tooltip,
  Chip,
  Stack,
  Button,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications,
  LightMode,
  DarkMode,
  Logout,
  Settings,
  Person,
  WifiOff,
  AdminPanelSettings,
  WorkspacePremium,
  WhatsApp as WhatsAppIcon,
} from '@mui/icons-material';
import { useAuthStore } from '@/stores/authStore';
import { UserRole } from '@smartpos/types';
import { useThemeContext } from '@/theme/ThemeProvider';
import { useAppStore } from '@/stores/appStore';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import api from '@/api/endpoints';

interface HeaderProps {
  onMenuClick: () => void;
  isMobile: boolean;
}

export function Header({ onMenuClick, isMobile }: HeaderProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { mode, toggleMode } = useThemeContext();
  const { isOffline } = useAppStore();

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [notifAnchor, setNotifAnchor] = useState<HTMLElement | null>(null);

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.notifications.getUnreadCount(),
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const unreadCount = unreadData?.count ?? 0;

  const { data: currentSub } = useQuery({
    queryKey: ['header-subscription', user?.tenantId],
    queryFn: () => api.subscriptions.getCurrentSubscription(user?.tenantId),
    enabled: !!user?.tenantId && user?.role !== UserRole.SUPER_ADMIN,
    staleTime: 5 * 60 * 1000,
  });

  const isDark = mode === 'dark';

  const handleLogout = useCallback(() => {
    setAnchorEl(null);
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const roleLabel = user?.role
    ? t(`roles.${user.role.toLowerCase()}`) || user.role
    : '';

  return (
    <AppBar
      position="sticky"
      sx={{
        background: isDark
          ? 'rgba(20,18,24,0.82)'
          : 'rgba(254,247,255,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${theme.palette.divider}`,
        zIndex: theme.zIndex.drawer + 1,
        boxShadow: 'none',
      }}
    >
      {isOffline && (
        <Box
          component={motion.div}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          sx={{
            bgcolor: theme.palette.warning.main,
            color: '#fff',
            textAlign: 'center',
            py: 0.75,
            px: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
          }}
        >
          <WifiOff sx={{ fontSize: 16 }} />
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            {t('common.offline') || 'You are offline'}
          </Typography>
        </Box>
      )}
      <Toolbar sx={{ minHeight: { xs: 48, sm: 64 }, px: { xs: 1.5, sm: 3 }, gap: 1 }}>
        {isMobile && (
          <IconButton edge="start" onClick={onMenuClick} sx={{ borderRadius: '50%', p: 0.75 }}>
            <MenuIcon />
          </IconButton>
        )}

        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 800,
            flex: 1,
            display: 'block',
            letterSpacing: '-0.25px',
            color: theme.palette.text.primary,
            fontSize: { xs: '0.95rem', sm: '1.15rem' },
          }}
          noWrap
        >
          Smart POS
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>

          <Tooltip title={isDark ? (t('common.lightMode') || 'Light mode') : (t('common.darkMode') || 'Dark mode')}>
            <IconButton
              size="medium"
              onClick={toggleMode}
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.06),
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.12) },
              }}
            >
              {isDark ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
            </IconButton>
          </Tooltip>

          <Tooltip title={t('common.notifications') || 'Notifications'}>
            <IconButton
              size="medium"
              onClick={(e) => setNotifAnchor(e.currentTarget)}
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.06),
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.12) },
              }}
            >
              <Badge badgeContent={unreadCount} color="error" max={99}>
                <Notifications fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Plan badge for merchants */}
          {currentSub && (
            <Tooltip
              title={`باقتك: ${currentSub.planName || 'الباقة المتقدمة'} - تاريخ الانتهاء: ${new Date(currentSub.endDate).toLocaleDateString('ar-EG')} (متبقي ${currentSub.daysRemaining ?? 15} يوم)`}
            >
              <Chip
                icon={<WorkspacePremium sx={{ fontSize: '18px !important', color: '#f59e0b' }} />}
                label={`${currentSub.planName || 'الباقة المتقدمة'} • متبقي ${currentSub.daysRemaining ?? 15} يوم`}
                size="small"
                onClick={() => navigate('/settings')}
                sx={{
                  fontWeight: 700,
                  bgcolor: alpha(theme.palette.warning.main, 0.12),
                  color: theme.palette.mode === 'dark' ? '#fbbf24' : '#b45309',
                  border: `1px solid ${alpha(theme.palette.warning.main, 0.35)}`,
                  cursor: 'pointer',
                  display: { xs: 'none', sm: 'inline-flex' },
                  '&:hover': {
                    bgcolor: alpha(theme.palette.warning.main, 0.22),
                  },
                }}
              />
            </Tooltip>
          )}

          {/* User profile capsule pill */}
          <Box
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 0.5,
              pr: { xs: 0.5, md: 1.5 },
              borderRadius: 9999,
              cursor: 'pointer',
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              border: `1px solid ${theme.palette.outlineVariant || theme.palette.divider}`,
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.14),
                transform: 'scale(1.02)',
              },
            }}
          >
            <Avatar
              src={user?.avatar}
              sx={{
                width: 34,
                height: 34,
                bgcolor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                fontSize: '0.875rem',
                fontWeight: 700,
              }}
            >
              {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </Avatar>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                display: { xs: 'none', md: 'block' },
                color: theme.palette.text.primary,
                maxWidth: 110,
              }}
              noWrap
            >
              {user?.fullName || 'User'}
            </Typography>
          </Box>
        </Box>

        {/* User menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            sx: {
              mt: 1.5,
              minWidth: 240,
              borderRadius: '24px',
              border: `1px solid ${theme.palette.outlineVariant || theme.palette.divider}`,
              background: isDark
                ? 'rgba(33,31,38,0.96)'
                : 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow: theme.shadows[8],
              p: 0.5,
            },
          }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {user?.fullName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.email}
            </Typography>
            <Box
              sx={{
                mt: 0.5,
                display: 'inline-block',
                px: 1.5,
                py: 0.25,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                color: theme.palette.primary.main,
                fontSize: '0.6875rem',
                fontWeight: 600,
              }}
            >
              {roleLabel}
            </Box>
          </Box>
          <Divider />
          {currentSub && (
            <Box
              sx={{
                px: 1.5,
                py: 1.25,
                mx: 1,
                my: 1,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.warning.main, 0.08),
                border: `1px solid ${alpha(theme.palette.warning.main, 0.25)}`,
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
                <Stack direction="row" alignItems="center" spacing={0.75}>
                  <WorkspacePremium sx={{ color: '#f59e0b', fontSize: 18 }} />
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'warning.main' }}>
                    {currentSub.planName || 'الباقة المتقدمة'}
                  </Typography>
                </Stack>
                <Chip
                  label={`متبقي ${currentSub.daysRemaining ?? 15} يوم`}
                  size="small"
                  color="warning"
                  sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 700 }}
                />
              </Stack>
              <Typography variant="caption" display="block" color="text.secondary" mb={1}>
                تاريخ التجديد: {new Date(currentSub.endDate).toLocaleDateString('ar-EG')}
              </Typography>
              <Button
                size="small"
                variant="contained"
                fullWidth
                startIcon={<WhatsAppIcon />}
                onClick={() => {
                  setAnchorEl(null);
                  const text = encodeURIComponent(
                    `السلام عليكم، أرغب في تجديد أو ترقية باقة اشتراكي (${currentSub.planName}) للمتجر: ${user?.fullName || ''}`
                  );
                  window.open(`https://wa.me/201000165672?text=${text}`, '_blank');
                }}
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  bgcolor: '#25D366',
                  color: '#fff',
                  '&:hover': { bgcolor: '#1EBE5D' },
                }}
              >
                تجديد باقتي (01000165672)
              </Button>
            </Box>
          )}
          {(user?.role === UserRole.SUPER_ADMIN || (user?.role as string) === 'SUPER_ADMIN' || (user?.role as string) === 'ADMIN') && (
            <MenuItem onClick={() => { setAnchorEl(null); navigate('/admin'); }} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08), fontWeight: 700 }}>
              <ListItemIcon><AdminPanelSettings fontSize="small" color="primary" /></ListItemIcon>
              <ListItemText primaryTypographyProps={{ fontWeight: 700, color: 'primary.main' }}>
                لوحة إدارة المنصة والتجار
              </ListItemText>
            </MenuItem>
          )}
          <MenuItem onClick={() => { setAnchorEl(null); navigate('/settings'); }}>
            <ListItemIcon><Settings fontSize="small" /></ListItemIcon>
            <ListItemText>{t('nav.settings') || 'Settings'}</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { setAnchorEl(null); navigate('/profile'); }}>
            <ListItemIcon><Person fontSize="small" /></ListItemIcon>
            <ListItemText>{t('nav.profile') || 'Profile'}</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout}>
            <ListItemIcon><Logout fontSize="small" /></ListItemIcon>
            <ListItemText>{t('auth.logout') || 'Logout'}</ListItemText>
          </MenuItem>
        </Menu>

        <NotificationDropdown anchorEl={notifAnchor} onClose={() => setNotifAnchor(null)} />
      </Toolbar>
    </AppBar>
  );
}