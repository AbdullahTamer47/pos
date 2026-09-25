import React, { useState, useCallback, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  useTheme,
  useMediaQuery,
  alpha,
  IconButton,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  PointOfSale as POSIcon,
  Inventory as InventoryIcon,
  Category as CategoryIcon,
  ShoppingCart as ProductsIcon,
  People as CustomersIcon,
  LocalShipping as SuppliersIcon,
  Receipt as InvoicesIcon,
  Assessment as ReportsIcon,
  AccountBalance as AccountingIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Support as SupportIcon,
  ChevronLeft,
  Menu as MenuIcon,
  AdminPanelSettings,
  Business,
  CardMembership,
  ConfirmationNumber,
} from '@mui/icons-material';
import { useAuthStore } from '@/stores/authStore';
import { UserRole } from '@smartpos/types';
import { Header } from './Header';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { SubscriptionBanner } from '@/components/SubscriptionBanner';

const DRAWER_WIDTH = 260;
const DRAWER_COLLAPSED = 72;

interface NavItem {
  label: string;
  icon: React.ReactElement;
  path: string;
  roles: UserRole[];
  section?: 'main' | 'catalog' | 'finance' | 'admin';
  highlight?: boolean;
}

const SECTION_LABELS: Record<string, string> = {
  admin: 'إدارة المنصة والتجار',
  main: 'البيع والتشغيل',
  catalog: 'المتجر والعملاء',
  finance: 'الماليات والإعدادات',
};

const navItems: NavItem[] = [
  // 🛡️ إدارة المنصة والتجار (Super Admin)
  { label: 'nav.admin', icon: <AdminPanelSettings />, path: '/admin', roles: [UserRole.SUPER_ADMIN], section: 'admin' },
  { label: 'nav.traders', icon: <Business />, path: '/admin/tenants', roles: [UserRole.SUPER_ADMIN], section: 'admin', highlight: true },
  { label: 'nav.plans', icon: <CardMembership />, path: '/admin/plans', roles: [UserRole.SUPER_ADMIN], section: 'admin' },
  { label: 'nav.tickets', icon: <ConfirmationNumber />, path: '/admin/tickets', roles: [UserRole.SUPER_ADMIN], section: 'admin' },
  { label: 'nav.settings', icon: <SettingsIcon />, path: '/admin/settings', roles: [UserRole.SUPER_ADMIN], section: 'admin' },

  // ⚡ البيع والتشغيل
  { label: 'nav.dashboard', icon: <DashboardIcon />, path: '/', roles: [UserRole.SUPER_ADMIN, UserRole.TRADER, UserRole.MANAGER], section: 'main' },
  { label: 'nav.pos', icon: <POSIcon />, path: '/pos', roles: [UserRole.SUPER_ADMIN, UserRole.TRADER, UserRole.MANAGER, UserRole.CASHIER], section: 'main', highlight: true },
  { label: 'nav.invoices', icon: <InvoicesIcon />, path: '/invoices', roles: [UserRole.SUPER_ADMIN, UserRole.TRADER, UserRole.MANAGER, UserRole.CASHIER], section: 'main' },

  // 📦 المتجر والعملاء
  { label: 'nav.products', icon: <ProductsIcon />, path: '/products', roles: [UserRole.SUPER_ADMIN, UserRole.TRADER, UserRole.MANAGER], section: 'catalog' },
  { label: 'nav.categories', icon: <CategoryIcon />, path: '/categories', roles: [UserRole.SUPER_ADMIN, UserRole.TRADER, UserRole.MANAGER], section: 'catalog' },
  { label: 'nav.inventory', icon: <InventoryIcon />, path: '/inventory', roles: [UserRole.SUPER_ADMIN, UserRole.TRADER, UserRole.MANAGER], section: 'catalog' },
  { label: 'nav.customers', icon: <CustomersIcon />, path: '/customers', roles: [UserRole.SUPER_ADMIN, UserRole.TRADER, UserRole.MANAGER], section: 'catalog' },
  { label: 'nav.suppliers', icon: <SuppliersIcon />, path: '/suppliers', roles: [UserRole.SUPER_ADMIN, UserRole.TRADER, UserRole.MANAGER], section: 'catalog' },

  // 💰 الماليات والإعدادات
  { label: 'nav.accounting', icon: <AccountingIcon />, path: '/accounting', roles: [UserRole.SUPER_ADMIN, UserRole.TRADER, UserRole.MANAGER], section: 'finance' },
  { label: 'nav.reports', icon: <ReportsIcon />, path: '/reports', roles: [UserRole.SUPER_ADMIN, UserRole.TRADER, UserRole.MANAGER], section: 'finance' },
  { label: 'nav.settings', icon: <SettingsIcon />, path: '/settings', roles: [UserRole.TRADER, UserRole.MANAGER], section: 'finance' },
  { label: 'nav.notifications', icon: <NotificationsIcon />, path: '/notifications', roles: [UserRole.SUPER_ADMIN, UserRole.TRADER, UserRole.MANAGER, UserRole.CASHIER], section: 'finance' },
  { label: 'nav.support', icon: <SupportIcon />, path: '/support', roles: [UserRole.SUPER_ADMIN, UserRole.TRADER, UserRole.MANAGER, UserRole.CASHIER], section: 'finance' },
];

export default function DashboardLayout() {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [collapsed, setCollapsed] = useState(location.pathname === '/pos');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (location.pathname === '/pos') {
      setCollapsed(true);
    }
  }, [location.pathname]);

  const userRole = (user?.role as UserRole) || UserRole.TRADER;
  const isSuper = userRole === UserRole.SUPER_ADMIN || (userRole as string) === 'SUPER_ADMIN' || (userRole as string) === 'ADMIN';

  const filteredNav = navItems.filter((item) => {
    // Platform administration section is exclusively for Super Admin
    if (item.section === 'admin') {
      return isSuper;
    }
    // For general settings: Super Admin uses /admin/settings
    if (item.path === '/settings' && isSuper) {
      return false;
    }
    // Super Admin has access to preview store and cashier tools
    if (isSuper) {
      return true;
    }
    // Regular merchant roles
    return item.roles.includes(userRole);
  });
  const isDark = theme.palette.mode === 'dark';

  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path);
      if (isMobile) setMobileOpen(false);
    },
    [navigate, isMobile],
  );

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: isDark
          ? 'rgba(29,27,32,0.85)'
          : 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        border: 'none',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          px: collapsed ? 1 : 2.5,
          py: 2,
          minHeight: 64,
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            minWidth: 40,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #6750A4, #7C5CBF)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: '1.1rem',
          }}
        >
          SP
        </Box>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Box sx={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 700, lineHeight: 1.2 }}
                >
                  Smart POS
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ lineHeight: 1 }}
                >
                  {t('common.appName') || 'POS System'}
                </Typography>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>

      {/* Nav items */}
      <List sx={{ flex: 1, px: 1, overflow: 'auto', py: 1 }}>
        {filteredNav.map((item, idx) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && item.path !== '/admin' && location.pathname.startsWith(item.path));
          const prevItem = filteredNav[idx - 1];
          const isNewSection = !prevItem || prevItem.section !== item.section;

          return (
            <React.Fragment key={item.path}>
              {isNewSection && item.section && (
                <Box sx={{ mt: idx > 0 ? 1.5 : 0.5, mb: 0.5, px: collapsed ? 0.5 : 1.5 }}>
                  {collapsed ? (
                    <Box sx={{ height: 1, bgcolor: theme.palette.divider, my: 1 }} />
                  ) : (
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        letterSpacing: '0.3px',
                        color: theme.palette.text.secondary,
                        opacity: 0.8,
                        display: 'block',
                      }}
                    >
                      {t(`nav.sections.${item.section}`, SECTION_LABELS[item.section] || '')}
                    </Typography>
                  )}
                </Box>
              )}
              <motion.div
                initial={{ opacity: 0, x: theme.direction === 'rtl' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.02 }}
              >
                <ListItemButton
                  onClick={() => handleNavigate(item.path)}
                  sx={{
                    borderRadius: 2.5,
                    mb: 0.4,
                    minHeight: 44,
                    justifyContent: collapsed ? 'center' : 'initial',
                    px: collapsed ? 1.5 : 2,
                    backgroundColor: isActive
                      ? alpha(theme.palette.primary.main, 0.12)
                      : item.highlight
                        ? alpha(theme.palette.primary.main, 0.04)
                        : 'transparent',
                    color: isActive
                      ? theme.palette.primary.main
                      : theme.palette.text.secondary,
                    border: item.highlight && !isActive
                      ? `1px dashed ${alpha(theme.palette.primary.main, 0.35)}`
                      : 'none',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    },
                    '&::before': isActive
                      ? {
                        content: '""',
                        position: 'absolute',
                        left: theme.direction === 'rtl' ? 'auto' : 0,
                        right: theme.direction === 'rtl' ? 0 : 'auto',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 3.5,
                        height: 24,
                        borderRadius: theme.direction === 'rtl' ? '4px 0 0 4px' : '0 4px 4px 0',
                        backgroundColor: theme.palette.primary.main,
                      }
                      : undefined,
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: collapsed ? 0 : 38,
                      color: item.highlight && !isActive ? theme.palette.primary.main : 'inherit',
                      justifyContent: 'center',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {!collapsed && (
                    <ListItemText
                      primary={t(item.label)}
                      primaryTypographyProps={{
                        fontSize: '0.86rem',
                        fontWeight: isActive ? 700 : item.highlight ? 600 : 500,
                      }}
                    />
                  )}
                  {!collapsed && item.highlight && (
                    <Box
                      sx={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        px: 0.8,
                        py: 0.2,
                        borderRadius: 1,
                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                        color: theme.palette.primary.main,
                      }}
                    >
                      ⚡ سريع
                    </Box>
                  )}
                </ListItemButton>
              </motion.div>
            </React.Fragment>
          );
        })}
      </List>

      {/* Collapse button */}
      {!isMobile && (
        <Box
          sx={{
            mt: 'auto',
            flexShrink: 0,
            p: 1,
            borderTop: `1px solid ${theme.palette.divider}`,
            backgroundColor: isDark ? 'rgba(29,27,32,0.8)' : 'rgba(245,243,248,0.8)',
          }}
        >
          <IconButton
            onClick={() => setCollapsed(!collapsed)}
            sx={{
              width: '100%',
              borderRadius: 2,
              transition: 'all 0.3s ease',
              transform: collapsed
                ? (theme.direction === 'rtl' ? 'rotate(0deg)' : 'rotate(180deg)')
                : (theme.direction === 'rtl' ? 'rotate(180deg)' : 'rotate(0deg)'),
            }}
          >
            <ChevronLeft />
          </IconButton>
        </Box>
      )}
    </Box>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
      }}
    >
      {/* Mobile drawer */}
      {isMobile && (
        <Drawer
          anchor={theme.direction === 'rtl' ? 'right' : 'left'}
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              border: 'none',
              background: isDark ? '#1D1B20' : '#FFFFFF',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Desktop drawer on the right in RTL */}
      {!isMobile && (
        <Drawer
          anchor={theme.direction === 'rtl' ? 'right' : 'left'}
          variant="permanent"
          sx={{
            width: collapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH,
            flexShrink: 0,
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '& .MuiDrawer-paper': {
              width: collapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH,
              height: '100vh',
              position: 'relative',
              borderRight: 'none',
              borderLeft: 'none',
              borderInlineEnd: `1px solid ${theme.palette.divider}`,
              transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              overflowX: 'hidden',
              overflowY: 'auto',
              backgroundColor: isDark ? '#1D1B20' : '#FFFFFF',
              boxSizing: 'border-box',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflow: 'hidden',
          background: isDark
            ? 'linear-gradient(180deg, #1D1B20 0%, #151318 100%)'
            : 'linear-gradient(180deg, #FEF7FF 0%, #F8F5FF 100%)',
        }}
      >
        <Header
          onMenuClick={() => setMobileOpen(true)}
          isMobile={isMobile}
        />
        {(location.pathname === '/' || location.pathname === '/dashboard') && <SubscriptionBanner />}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            p: location.pathname === '/pos' ? 0 : { xs: 2, sm: 3 },
            pb: location.pathname === '/pos' ? 0 : { xs: 5, sm: 6 },
            overflowY: location.pathname === '/pos' ? 'hidden' : 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: '100%',
            }}
          >
            <RouteErrorBoundary resetKey={location.pathname}>
              <Outlet />
            </RouteErrorBoundary>
          </motion.div>
        </Box>
      </Box>
    </Box>
  );
}
