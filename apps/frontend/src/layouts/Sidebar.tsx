import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  IconButton,
  Collapse,
  Chip,
  Tooltip,
  useTheme,
  alpha,
  Avatar,
} from '@mui/material';
import {
  Dashboard,
  PointOfSale,
  Inventory,
  ShoppingCart,
  Category,
  People,
  LocalShipping,
  Receipt,
  Assessment,
  AccountBalance,
  Settings,
  Notifications,
  Support,
  AdminPanelSettings,
  ChevronLeft,
  ChevronRight,
  ExpandLess,
  ExpandMore,
  Store,
  Security,
  CardGiftcard,
  ManageAccounts,
  Business,
  ReceiptLong,
  Assignment,
  History,
  AccountCircle,
  Logout,
} from '@mui/icons-material';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { UserRole } from '@smartpos/types';

interface NavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  roles?: UserRole[];
  children?: NavItem[];
}

const SIDEBAR_EXPANDED = 260;
const SIDEBAR_COLLAPSED = 72;

interface SidebarProps {
  isMobile: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
  sidebarWidth: number;
}

export function Sidebar({ isMobile, mobileOpen, onMobileClose, sidebarWidth }: SidebarProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebarCollapse, tenant, language } = useAppStore();
  const isRTL = language === 'ar';

  const userRole = (user?.role as UserRole) || UserRole.CASHIER;

  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleExpanded = useCallback((key: string) => {
    setExpandedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const navItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [
      {
        key: 'dashboard',
        label: t('nav.dashboard'),
        icon: <Dashboard />,
        path: '/',
      },
      {
        key: 'pos',
        label: t('nav.pos'),
        icon: <PointOfSale />,
        path: '/pos',
      },
      {
        key: 'products',
        label: t('nav.products'),
        icon: <ShoppingCart />,
        path: '/products',
        children: [
          {
            key: 'categories',
            label: t('nav.categories'),
            icon: <Category />,
            path: '/categories',
          },
        ],
      },
      {
        key: 'inventory',
        label: t('nav.inventory'),
        icon: <Inventory />,
        path: '/inventory',
        children: [
          {
            key: 'inventory-movements',
            label: t('inventory.movementHistory'),
            icon: <History />,
            path: '/inventory/movements',
          },
        ],
      },
      {
        key: 'customers',
        label: t('nav.customers'),
        icon: <People />,
        path: '/customers',
      },
      {
        key: 'suppliers',
        label: t('nav.suppliers'),
        icon: <LocalShipping />,
        path: '/suppliers',
      },
      {
        key: 'purchase-orders',
        label: t('nav.purchaseOrders'),
        icon: <Assignment />,
        path: '/purchase-orders',
      },
      {
        key: 'invoices',
        label: t('nav.invoices'),
        icon: <Receipt />,
        path: '/invoices',
      },
      {
        key: 'reports',
        label: t('nav.reports'),
        icon: <Assessment />,
        path: '/reports',
        roles: [UserRole.SUPER_ADMIN, UserRole.TRADER, UserRole.MANAGER],
      },
      {
        key: 'accounting',
        label: t('nav.accounting'),
        icon: <AccountBalance />,
        path: '/accounting',
        roles: [UserRole.SUPER_ADMIN, UserRole.TRADER, UserRole.MANAGER],
      },
      {
        key: 'settings',
        label: t('nav.settings'),
        icon: <Settings />,
        path: '/settings',
        roles: [UserRole.SUPER_ADMIN, UserRole.TRADER, UserRole.MANAGER],
        children: [
          {
            key: 'settings-users',
            label: t('nav.users'),
            icon: <ManageAccounts />,
            path: '/settings/users',
          },
          {
            key: 'settings-branding',
            label: t('nav.branding'),
            icon: <Store />,
            path: '/settings/branding',
          },
          {
            key: 'settings-tax',
            label: t('nav.tax'),
            icon: <ReceiptLong />,
            path: '/settings/tax',
          },
        ],
      },
      {
        key: 'notifications',
        label: t('nav.notifications'),
        icon: <Notifications />,
        path: '/notifications',
      },
      {
        key: 'support',
        label: t('nav.support'),
        icon: <Support />,
        path: '/support',
      },
    ];

    if (userRole === UserRole.SUPER_ADMIN) {
      items.push(
        {
          key: 'admin-divider',
          label: '',
          icon: null as unknown as React.ReactNode,
          path: '',
          roles: [UserRole.SUPER_ADMIN],
        },
        {
          key: 'admin-dashboard',
          label: 'لوحة المشرف العام',
          icon: <AdminPanelSettings />,
          path: '/admin',
          roles: [UserRole.SUPER_ADMIN],
        },
        {
          key: 'admin-tenants',
          label: 'إدارة التجار',
          icon: <Business />,
          path: '/admin/tenants',
          roles: [UserRole.SUPER_ADMIN],
        },
        {
          key: 'admin-plans',
          label: 'باقات الاشتراك',
          icon: <CardGiftcard />,
          path: '/admin/plans',
          roles: [UserRole.SUPER_ADMIN],
        },
        {
          key: 'admin-tickets',
          label: 'تذاكر الدعم الفني',
          icon: <Support />,
          path: '/admin/tickets',
          roles: [UserRole.SUPER_ADMIN],
        },
        {
          key: 'admin-settings',
          label: 'إعدادات المشرف',
          icon: <Security />,
          path: '/admin/settings',
          roles: [UserRole.SUPER_ADMIN],
        }
      );
    }

    return items;
  }, [t, userRole]);

  const isActive = useCallback(
    (path: string) => {
      if (path === '/') return location.pathname === '/';
      return location.pathname.startsWith(path);
    },
    [location.pathname]
  );

  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path);
      if (isMobile) {
        onMobileClose();
      }
    },
    [navigate, isMobile, onMobileClose]
  );

  const userPerms = Array.isArray(user?.permissions) ? user.permissions : [];

  const filteredItems = navItems.filter((item) => {
    if (item.key === 'admin-divider') return userRole === UserRole.SUPER_ADMIN;

    // Cashier specific permission checks
    if (userRole === UserRole.CASHIER) {
      if (item.key === 'pos') return true;
      if (item.key === 'dashboard') return userPerms.includes('nav.dashboard');
      if (item.key === 'invoices') return userPerms.includes('nav.invoices');
      if (item.key === 'products') return userPerms.includes('nav.products');
      if (item.key === 'inventory') return userPerms.includes('nav.inventory');
      if (item.key === 'customers') return userPerms.includes('nav.customers') || userPerms.includes('pos.manage_customers');
      if (item.key === 'suppliers') return userPerms.includes('nav.suppliers');
      if (item.key === 'reports') {
        return (
          userPerms.includes('nav.reports') ||
          userPerms.includes('pos.view_reports') ||
          userPerms.some((p: string) => p.startsWith('report.'))
        );
      }
      if (item.key === 'settings' || item.key === 'accounting') return false;
    }

    if (item.roles && !item.roles.includes(userRole)) return false;
    if (item.children) {
      const validChildren = item.children.filter(
        (child) => !child.roles || child.roles.includes(userRole)
      );
      return validChildren.length > 0;
    }
    return true;
  });

  const renderNavItem = (item: NavItem, depth = 0) => {
    if (item.key === 'admin-divider') {
      return (
        <Box key={item.key} sx={{ px: 2, py: 1 }}>
          {!sidebarCollapsed && (
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ fontWeight: 600, fontSize: '0.6875rem', letterSpacing: '0.08em' }}
            >
              {t('nav.admin')}
            </Typography>
          )}
          {sidebarCollapsed && (
            <Divider sx={{ my: 1 }} />
          )}
        </Box>
      );
    }

    const hasChildren = item.children && item.children.length > 0;
    const isItemExpanded = expandedItems[item.key] || false;
    const active = isActive(item.path);

    const button = (
      <ListItemButton
        selected={active}
        onClick={() => {
          if (hasChildren) {
            toggleExpanded(item.key);
          } else {
            handleNavigate(item.path);
          }
        }}
        sx={{
          borderRadius: sidebarCollapsed ? '18px' : '28px', // M3 Pill shape
          mx: sidebarCollapsed ? 'auto' : 1.2,
          my: 0.35,
          width: sidebarCollapsed ? 56 : 'auto',
          height: sidebarCollapsed ? 44 : 48,
          px: sidebarCollapsed ? 0 : 2,
          justifyContent: 'center',
          transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
            transform: sidebarCollapsed ? 'scale(1.05)' : 'translateX(2px)',
          },
          '&.Mui-selected': {
            backgroundColor: alpha(theme.palette.primary.main, 0.14),
            color: theme.palette.primary.main,
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.2),
            },
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: sidebarCollapsed ? 0 : 36,
            mr: sidebarCollapsed ? 0 : 1.5,
            justifyContent: 'center',
            color: active ? theme.palette.primary.main : theme.palette.text.secondary,
            transition: 'color 0.2s ease',
          }}
        >
          {item.icon}
        </ListItemIcon>
        {!sidebarCollapsed && (
          <ListItemText
            primary={item.label}
            primaryTypographyProps={{
              variant: 'body2',
              fontWeight: active ? 700 : 500,
              color: active ? theme.palette.primary.main : theme.palette.text.primary,
              letterSpacing: '0.15px',
            }}
          />
        )}
        {hasChildren && !sidebarCollapsed && (
          isItemExpanded ? <ExpandLess fontSize="small" sx={{ color: active ? 'primary.main' : 'text.secondary' }} /> : <ExpandMore fontSize="small" sx={{ color: active ? 'primary.main' : 'text.secondary' }} />
        )}
      </ListItemButton>
    );

    if (sidebarCollapsed && item.label) {
      return (
        <Tooltip key={item.key} title={item.label} placement={isRTL ? 'left' : 'right'}>
          <Box>
            {button}
            {hasChildren && (
              <Collapse in={isItemExpanded} timeout="auto">
                {item.children!
                  .filter((c) => !c.roles || c.roles.includes(userRole))
                  .map((child) => renderNavItem(child, depth + 1))}
              </Collapse>
            )}
          </Box>
        </Tooltip>
      );
    }

    return (
      <Box key={item.key}>
        {button}
        {hasChildren && (
          <Collapse in={isItemExpanded} timeout="auto">
            {item.children!
              .filter((c) => !c.roles || c.roles.includes(userRole))
              .map((child) => renderNavItem(child, depth + 1))}
          </Collapse>
        )}
      </Box>
    );
  };

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          py: 2.5,
          px: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        {tenant?.logo ? (
          <Avatar
            src={tenant.logo}
            alt={tenant.name}
            sx={{
              width: sidebarCollapsed ? 44 : 60,
              height: sidebarCollapsed ? 44 : 60,
              borderRadius: '20px',
              mb: sidebarCollapsed ? 0 : 1.2,
              boxShadow: theme.shadows[2],
            }}
          />
        ) : (
          <Box
            sx={{
              width: sidebarCollapsed ? 44 : 60,
              height: sidebarCollapsed ? 44 : 60,
              borderRadius: '20px',
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: sidebarCollapsed ? 0 : 1.2,
              boxShadow: theme.shadows[2],
            }}
          >
            <Typography
              sx={{
                color: theme.palette.primary.contrastText,
                fontWeight: 800,
                fontSize: sidebarCollapsed ? 18 : 24,
                letterSpacing: '-0.5px',
              }}
            >
              SP
            </Typography>
          </Box>
        )}
        {!sidebarCollapsed && (
          <>
            <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ maxWidth: '100%', mt: 0.5 }}>
              {tenant?.name || t('common.appName')}
            </Typography>
            <Chip
              label={user?.role || 'User'}
              size="small"
              sx={{
                mt: 0.75,
                height: 24,
                fontSize: '0.6875rem',
                fontWeight: 700,
                borderRadius: 9999,
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                color: theme.palette.primary.main,
                px: 1,
              }}
            />
          </>
        )}
      </Box>

      <Box sx={{ flexGrow: 1, overflow: 'auto', py: 1.5 }}>
        <List sx={{ px: 0.8 }}>
          {filteredItems.map((item) => renderNavItem(item))}
        </List>
      </Box>

      {/* Quick Profile & Logout Actions */}
      <Box sx={{ px: 1, py: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
        <ListItemButton
          onClick={() => handleNavigate('/profile')}
          sx={{
            borderRadius: 2,
            mb: 0.5,
            px: 1.5,
            minHeight: 40,
            justifyContent: sidebarCollapsed ? 'center' : 'initial',
          }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>
            <AccountCircle fontSize="small" />
          </ListItemIcon>
          {!sidebarCollapsed && (
            <ListItemText
              primary="الملف الشخصي"
              primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 600 }}
            />
          )}
        </ListItemButton>
        <ListItemButton
          onClick={() => logout()}
          sx={{
            borderRadius: 2,
            px: 1.5,
            minHeight: 40,
            color: 'error.main',
            justifyContent: sidebarCollapsed ? 'center' : 'initial',
            '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.08) },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: 'error.main' }}>
            <Logout fontSize="small" />
          </ListItemIcon>
          {!sidebarCollapsed && (
            <ListItemText
              primary="تسجيل الخروج"
              primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 600 }}
            />
          )}
        </ListItemButton>
      </Box>

      <Box
        sx={{
          p: 1.5,
          borderTop: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          flexDirection: sidebarCollapsed ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: sidebarCollapsed ? 'center' : 'space-between',
          gap: 1,
        }}
      >
        {!sidebarCollapsed && (
          <Typography variant="caption" color="text.secondary" fontWeight={500}>
            v2.0 • M3 Expressive
          </Typography>
        )}
        <IconButton
          onClick={toggleSidebarCollapse}
          size="small"
          sx={{
            borderRadius: '16px',
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            p: 1,
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.16),
            },
          }}
        >
          {isRTL ? (
            sidebarCollapsed ? <ChevronLeft /> : <ChevronRight />
          ) : (
            sidebarCollapsed ? <ChevronRight /> : <ChevronLeft />
          )}
        </IconButton>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isMobile ? mobileOpen : true}
      onClose={onMobileClose}
      anchor={isRTL ? 'right' : 'left'}
      ModalProps={{ keepMounted: true }}
      sx={{
        width: isMobile ? 0 : sidebarWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: isMobile ? SIDEBAR_EXPANDED : sidebarWidth,
          boxSizing: 'border-box',
          borderRight: isRTL ? 'none' : `1px solid ${theme.palette.divider}`,
          borderLeft: isRTL ? `1px solid ${theme.palette.divider}` : 'none',
          transition: theme.transitions.create('width', {
            duration: theme.transitions.duration.standard,
            easing: theme.transitions.easing.easeInOut,
          }),
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}