import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Skeleton,
  Button,
  IconButton,
  useTheme,
  alpha,
  Tooltip,
  Alert,
  Chip,
  Stack,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Receipt,
  Inventory as InventoryIcon,
  AttachMoney,
  Add,
  Assessment,
  Refresh,
  Warning,
  AdminPanelSettings,
  WorkspacePremium,
  WhatsApp as WhatsAppIcon,
  CheckCircleOutline,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuthStore } from '@/stores/authStore';
import { UserRole } from '@smartpos/types';
import api from '@/api/endpoints';
import { formatCurrency } from '@smartpos/utils';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 20 } },
};

function StatCard({
  icon,
  label,
  value,
  isCurrency = false,
  trend,
  trendLabel,
  loading,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  isCurrency?: boolean;
  trend?: number;
  trendLabel?: string;
  loading?: boolean;
  color: string;
}) {
  const theme = useTheme();

  const formattedValue = useMemo(() => {
    if (typeof value === 'number') {
      return isCurrency ? formatCurrency(value, 'EGP') : value.toLocaleString('ar-EG');
    }
    return String(value);
  }, [value, isCurrency]);

  return (
    <motion.div variants={cardVariants}>
      <Card
        sx={{
          borderRadius: '24px', // M3 Expressive Card
          background: theme.palette.surfaceContainerLow || theme.palette.background.paper,
          border: `1px solid ${theme.palette.outlineVariant || theme.palette.divider}`,
          transition: 'all 0.25s cubic-bezier(0.2, 0, 0, 1)',
          boxShadow: theme.shadows[1],
          '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: theme.shadows[4],
            borderColor: alpha(theme.palette.primary.main, 0.4),
          },
        }}
      >
        <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '16px', // M3 Squircle
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: alpha(color, 0.14),
                color: color,
                boxShadow: `0 2px 8px ${alpha(color, 0.2)}`,
              }}
            >
              {icon}
            </Box>
            {trend !== undefined && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1.2,
                  py: 0.4,
                  borderRadius: 9999, // Pill Trend Badge
                  bgcolor: trend >= 0
                    ? alpha(theme.palette.success.main, 0.12)
                    : alpha(theme.palette.error.main, 0.12),
                  color: trend >= 0 ? theme.palette.success.main : theme.palette.error.main,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                {trend >= 0 ? <TrendingUp sx={{ fontSize: 16 }} /> : <TrendingDown sx={{ fontSize: 16 }} />}
                {Math.abs(trend)}%
              </Box>
            )}
          </Box>
          {loading ? (
            <>
              <Skeleton variant="text" width="60%" height={36} />
              <Skeleton variant="text" width="40%" height={18} sx={{ mt: 0.5 }} />
            </>
          ) : (
            <>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5, letterSpacing: -0.5 }}>
                {formattedValue}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                {label}
              </Typography>
              {trendLabel && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {trendLabel}
                </Typography>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function DashboardPage() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const today = new Date().toISOString().split('T')[0];

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () =>
      api.reports
        .salesReport({ startDate: today, endDate: today, groupBy: 'day' })
        .then((d) => {
          const r = d as {
            summary?: { totalRevenue?: number; totalSales?: number };
          };
          return {
            todaySales: r?.summary?.totalRevenue ?? 0,
            todayOrders: r?.summary?.totalSales ?? 0,
          };
        }),
    staleTime: 30000,
  });

  const { data: plData } = useQuery({
    queryKey: ['dashboard-profit'],
    queryFn: () =>
      api.reports
        .profitLossReport({ startDate: today, endDate: today })
        .then((d) => {
          const r = d as { netProfit?: number };
          return { todayProfit: r?.netProfit ?? 0 };
        }),
    staleTime: 30000,
  });

  const { data: inventoryData } = useQuery({
    queryKey: ['dashboard-inventory'],
    queryFn: () =>
      api.reports
        .inventoryStatusReport({})
        .then((d) => {
          const r = d as { lowStockCount?: number; outOfStockCount?: number };
          return {
            lowStockItems: r?.lowStockCount ?? 0,
            outOfStockItems: r?.outOfStockCount ?? 0,
          };
        }),
    staleTime: 60000,
  });

  const { data: salesData, isLoading: salesChartLoading } = useQuery({
    queryKey: ['dashboard-sales-chart'],
    queryFn: () =>
      api.reports
        .salesReport({ groupBy: 'day' })
        .then((d) => {
          const r = d as {
            grouped?: Array<{ period: string; count: number; revenue: number }>;
          };
          return r?.grouped ?? [];
        }),
    staleTime: 60000,
  });

  const { data: topProducts, isLoading: topProductsLoading } = useQuery({
    queryKey: ['dashboard-top-products'],
    queryFn: () =>
      api.reports
        .topProductsReport({ limit: 5 })
        .then((d) => {
          const r = d as {
            products?: Array<{
              nameAr?: string;
              nameEn?: string;
              revenue?: number;
              quantity?: number;
            }>;
          };
          return r?.products ?? [];
        }),
    staleTime: 60000,
  });

  const { data: recentInvoices } = useQuery({
    queryKey: ['dashboard-recent-invoices'],
    queryFn: () =>
      api.invoices
        .getInvoices({ page: 1, limit: 5 })
        .then((d) => d?.data ?? []),
    staleTime: 30000,
  });

  const { data: subscription } = useQuery({
    queryKey: ['dashboard-subscription', user?.tenantId],
    queryFn: () => api.subscriptions.getCurrentSubscription(user?.tenantId),
    enabled: !!user && user.role !== UserRole.SUPER_ADMIN && (user.role as string) !== 'SUPER_ADMIN',
    staleTime: 5 * 60 * 1000,
  });

  const subInfo = useMemo(() => {
    if (!subscription || !subscription.endDate) return null;
    const endDate = new Date(subscription.endDate);
    const now = new Date();
    const diffMs = endDate.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const formattedEnd = endDate.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const planName = subscription.planName || 'الباقة المتقدمة (Professional)';
    const isExpiringSoon = daysRemaining <= 15;
    const isExpired = daysRemaining <= 0;
    const progressPercent = Math.min(100, Math.max(5, Math.round(((30 - daysRemaining) / 30) * 100)));

    return {
      endDate,
      formattedEnd,
      daysRemaining,
      planName,
      isExpiringSoon,
      isExpired,
      progressPercent,
      usage: (subscription as any).usage || {
        products: 8,
        maxProducts: 10000,
        branches: 1,
        maxBranches: 3,
        users: 2,
        maxUsers: 5,
      },
      features: (subscription as any).features || [
        'نقطة بيع سريعة (POS) غير محدودة',
        'طباعة إيصالات حرارية 80mm وفواتير A4',
        'إدارة المخزون والتنبيهات المتقدمة',
        'تقارير المبيعات والأرباح والورديات',
        'دعم فني عبر واتساب 24/7',
      ],
    };
  }, [subscription, i18n.language]);

  const chartData = useMemo(() => {
    if (salesData && Array.isArray(salesData) && salesData.length > 0) {
      return (salesData as any[]).map((d: any) => ({
        name: d.period || d.date || d.label || '',
        sales: Number(d.revenue || d.total || d.sales) || 0,
        orders: Number(d.count || d.orders) || 0,
      }));
    }
    // Baseline last 7 days with zero sales so the chart renders nicely even with zero sales yet
    const baseline = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayName = d.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'short' });
      baseline.push({
        name: dayName,
        sales: 0,
        orders: 0,
      });
    }
    return baseline;
  }, [salesData, i18n.language]);

  const productData = useMemo(() => {
    if (!topProducts || !Array.isArray(topProducts)) return [];
    return (topProducts as any[]).slice(0, 5).map((p: any) => ({
      name: p.nameAr || p.nameEn || p.name || p.productName || '',
      sales: Number(p.revenue || p.total || p.sales) || 0,
      quantity: Number(p.quantity) || 0,
    }));
  }, [topProducts]);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                {t('dashboard.welcome') || 'Welcome back'}, {user?.fullName?.split(' ')[0] || 'User'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {new Date().toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </Typography>
            </motion.div>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/pos')}
              sx={{ borderRadius: 3, fontWeight: 600 }}
            >
              {t('dashboard.newSale') || 'New Sale'}
            </Button>
            <Tooltip title={t('common.refresh') || 'Refresh'}>
              <IconButton sx={{ borderRadius: 3 }}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {/* Super Admin Quick Navigation Banner */}
      {(user?.role === UserRole.SUPER_ADMIN || (user?.role as string) === 'SUPER_ADMIN' || (user?.role as string) === 'ADMIN') && (
        <Alert
          severity="info"
          variant="filled"
          sx={{
            mb: 3,
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #4A148C 0%, #7B1FA2 100%)',
            color: '#ffffff',
            boxShadow: '0 4px 14px rgba(123, 31, 162, 0.3)',
          }}
          action={
            <Button
              variant="contained"
              size="small"
              onClick={() => navigate('/admin')}
              startIcon={<AdminPanelSettings />}
              sx={{
                bgcolor: '#ffffff',
                color: '#4A148C',
                fontWeight: 700,
                borderRadius: 2,
                boxShadow: 'none',
                '&:hover': { bgcolor: '#F3E5F5' },
              }}
            >
              الانتقال إلى لوحة إدارة التجار والمنصة
            </Button>
          }
        >
          أنت مسجل حالياً كـ <strong>مدير عام للنظام (Super Admin)</strong>. يمكنك إدارة التجار الجدد، متابعة اشتراكات المتاجر والخطط من لوحة الإدارة العامة.
        </Alert>
      )}

      {/* Merchant Subscription Expiry Warning Banner */}
      {user?.role !== UserRole.SUPER_ADMIN && (user?.role as string) !== 'SUPER_ADMIN' && subInfo?.isExpiringSoon && (
        <motion.div variants={cardVariants}>
          <Alert
            severity={subInfo.daysRemaining <= 5 ? 'error' : 'warning'}
            variant="filled"
            sx={{
              mb: 3,
              borderRadius: 3,
              py: 1.5,
              px: 2.5,
              background: subInfo.daysRemaining <= 5
                ? 'linear-gradient(135deg, #b71c1c 0%, #e53935 100%)'
                : 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)',
              alignItems: 'center',
            }}
            action={
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<WhatsAppIcon />}
                  onClick={() => {
                    const text = encodeURIComponent(
                      `السلام عليكم، أرغب في تجديد باقة اشتراكي (${subInfo.planName}) لمتجر: ${user?.fullName || ''}`
                    );
                    window.open(`https://wa.me/201000165672?text=${text}`, '_blank');
                  }}
                  sx={{
                    bgcolor: '#25D366',
                    color: '#ffffff',
                    fontWeight: 700,
                    borderRadius: 2,
                    boxShadow: 'none',
                    '&:hover': { bgcolor: '#1EBE5D' },
                    whiteSpace: 'nowrap',
                  }}
                >
                  تجديد الاشتراك الآن (01000165672)
                </Button>
              </Stack>
            }
          >
            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.25 }}>
              ⚠️ تنبيه هام: متبقي {subInfo.daysRemaining} يوم على انتهاء اشتراك {subInfo.planName}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.95 }}>
              تنتهي باقة متجرك بتاريخ <strong>{subInfo.formattedEnd}</strong>. سارع بتجديد الاشتراك لضمان استمرار عمل نظام الكاشير والمخزون دون انقطاع.
            </Typography>
          </Alert>
        </motion.div>
      )}

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            icon={<Receipt />}
            label={t('dashboard.todaySales') || "Today's Sales"}
            value={stats?.todaySales ?? 0}
            isCurrency={true}
            loading={isLoading}
            color={theme.palette.primary.main}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            icon={<AttachMoney />}
            label={t('dashboard.todayProfit') || "Today's Profit"}
            value={plData?.todayProfit ?? 0}
            isCurrency={true}
            loading={false}
            color={theme.palette.success.main}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            icon={<Assessment />}
            label={t('dashboard.todayOrders') || "Today's Orders"}
            value={stats?.todayOrders ?? 0}
            loading={isLoading}
            color={theme.palette.info.main}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            icon={<InventoryIcon />}
            label={t('dashboard.lowStock') || 'Low Stock Items'}
            value={inventoryData?.lowStockItems ?? 0}
            loading={false}
            color={theme.palette.warning.main}
          />
        </Grid>
      </Grid>

      {inventoryData && inventoryData.lowStockItems > 0 && (
        <motion.div variants={cardVariants}>
          <Alert
            severity="warning"
            icon={<Warning />}
            sx={{
              mb: 3,
              borderRadius: 2,
              cursor: 'pointer',
              '&:hover': { opacity: 0.9 },
            }}
            onClick={() => navigate('/inventory')}
          >
            <Typography variant="body2" fontWeight={600}>
              {inventoryData.lowStockItems} {t('dashboard.lowStockWarning') || 'product(s) are running low on stock'}
              {inventoryData.outOfStockItems > 0 &&
                ` — ${inventoryData.outOfStockItems} ${t('dashboard.outOfStock') || 'out of stock'}`}
              . {t('dashboard.clickToReview') || 'Click to review'}
            </Typography>
          </Alert>
        </motion.div>
      )}

      {/* Merchant Active Subscription Plan Details Card */}
      {user?.role !== UserRole.SUPER_ADMIN && (user?.role as string) !== 'SUPER_ADMIN' && subInfo && (
        <motion.div variants={cardVariants}>
          <Card
            sx={{
              mb: 4,
              borderRadius: '24px',
              border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
              background: theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, rgba(38, 30, 54, 0.7) 0%, rgba(20, 18, 24, 0.8) 100%)'
                : 'linear-gradient(135deg, rgba(243, 237, 247, 0.85) 0%, rgba(255, 255, 255, 0.9) 100%)',
              backdropFilter: 'blur(20px)',
              boxShadow: theme.shadows[2],
              overflow: 'hidden',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              {/* Header of Subscription Card */}
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', md: 'center' }}
                spacing={2}
                mb={2.5}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha(theme.palette.primary.main, 0.15),
                      color: theme.palette.primary.main,
                    }}
                  >
                    <WorkspacePremium sx={{ fontSize: 28 }} />
                  </Box>
                  <Box>
                    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                      <Typography variant="h6" fontWeight={800}>
                        {subInfo.planName}
                      </Typography>
                      <Chip
                        label="نشط - قيد السريان"
                        color="success"
                        size="small"
                        sx={{ fontWeight: 700, height: 22 }}
                      />
                      <Chip
                        label={`متبقي ${subInfo.daysRemaining} يوم`}
                        color={subInfo.daysRemaining <= 5 ? 'error' : 'warning'}
                        size="small"
                        sx={{ fontWeight: 700, height: 22 }}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" mt={0.25}>
                      موعد انتهاء الباقة والتجديد: <strong>{subInfo.formattedEnd}</strong>
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant="contained"
                    size="medium"
                    startIcon={<WhatsAppIcon />}
                    onClick={() => {
                      const text = encodeURIComponent(
                        `السلام عليكم، أرغب في تجديد أو ترقية باقتي (${subInfo.planName}) لمتجر: ${user?.fullName || ''}`
                      );
                      window.open(`https://wa.me/201000165672?text=${text}`, '_blank');
                    }}
                    sx={{
                      bgcolor: '#25D366',
                      color: '#ffffff',
                      fontWeight: 700,
                      borderRadius: 2.5,
                      px: 2.5,
                      boxShadow: 'none',
                      '&:hover': { bgcolor: '#1EBE5D' },
                    }}
                  >
                    تجديد الباقة (01000165672)
                  </Button>
                  <Button
                    variant="outlined"
                    size="medium"
                    onClick={() => {
                      const text = encodeURIComponent(
                        `السلام عليكم، أرغب في ترقية باقتي إلى الباقة الشاملة Enterprise لمتجر: ${user?.fullName || ''}`
                      );
                      window.open(`https://wa.me/201000165672?text=${text}`, '_blank');
                    }}
                    sx={{
                      borderRadius: 2.5,
                      fontWeight: 700,
                    }}
                  >
                    ترقية الباقة
                  </Button>
                </Stack>
              </Stack>

              {/* Progress bar of validity */}
              <Box sx={{ mb: 3 }}>
                <Stack direction="row" justifyContent="space-between" mb={0.75}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    فترة صلاحية الاشتراك الحالية (متبقي {subInfo.daysRemaining} يوم من 30 يوم)
                  </Typography>
                  <Typography variant="caption" fontWeight={700} color={subInfo.daysRemaining <= 5 ? 'error.main' : 'warning.main'}>
                    ينتهي في: {subInfo.formattedEnd}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={subInfo.progressPercent}
                  color={subInfo.daysRemaining <= 5 ? 'error' : 'warning'}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Quotas and Limits */}
              <Typography variant="subtitle2" fontWeight={800} mb={1.5} color="text.secondary">
                حدود واستهلاك الباقة الحالية:
              </Typography>
              <Grid container spacing={2} mb={2.5}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.background.paper, 0.6), border: `1px solid ${theme.palette.divider}` }}>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2" fontWeight={600}>المنتجات والأصناف:</Typography>
                      <Typography variant="body2" fontWeight={700} color="primary">
                        {subInfo.usage.products} / {subInfo.usage.maxProducts.toLocaleString()}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, Math.round((subInfo.usage.products / subInfo.usage.maxProducts) * 100))}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.background.paper, 0.6), border: `1px solid ${theme.palette.divider}` }}>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2" fontWeight={600}>الفروع والمخازن:</Typography>
                      <Typography variant="body2" fontWeight={700} color="primary">
                        {subInfo.usage.branches} / {subInfo.usage.maxBranches}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, Math.round((subInfo.usage.branches / subInfo.usage.maxBranches) * 100))}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.background.paper, 0.6), border: `1px solid ${theme.palette.divider}` }}>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2" fontWeight={600}>المستخدمين والكاشيرات:</Typography>
                      <Typography variant="body2" fontWeight={700} color="primary">
                        {subInfo.usage.users} / {subInfo.usage.maxUsers}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, Math.round((subInfo.usage.users / subInfo.usage.maxUsers) * 100))}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                </Grid>
              </Grid>

              {/* Plan Features Checklist */}
              <Typography variant="subtitle2" fontWeight={800} mb={1} color="text.secondary">
                المميزات المضمنة في باقتك:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {subInfo.features.map((feat: string, fIdx: number) => (
                  <Chip
                    key={fIdx}
                    icon={<CheckCircleOutline sx={{ fontSize: '16px !important', color: 'success.main' }} />}
                    label={feat}
                    size="small"
                    variant="outlined"
                    sx={{
                      fontWeight: 600,
                      bgcolor: alpha(theme.palette.success.main, 0.05),
                      borderColor: alpha(theme.palette.success.main, 0.25),
                      color: theme.palette.text.primary,
                    }}
                  />
                ))}
              </Stack>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <motion.div variants={cardVariants}>
            <Card
              sx={{
                borderRadius: 3,
                background: theme.palette.mode === 'dark'
                  ? 'rgba(29,27,32,0.65)'
                  : 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  {t('dashboard.salesTrend') || 'Sales Trend'}
                </Typography>
                <Box sx={{ height: 300 }}>
                  {salesChartLoading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <Skeleton variant="rounded" width="100%" height={280} />
                    </Box>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                        <XAxis dataKey="name" stroke={theme.palette.text.secondary} fontSize={12} tickLine={false} />
                        <YAxis
                          stroke={theme.palette.text.secondary}
                          fontSize={12}
                          tickLine={false}
                          tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            borderRadius: 8,
                            border: `1px solid ${theme.palette.divider}`,
                            background: theme.palette.background.paper,
                          }}
                          formatter={(value: any) => [`${Number(value).toLocaleString('ar-EG')} ج.م`, 'المبيعات']}
                        />
                        <Line
                          type="monotone"
                          dataKey="sales"
                          name="المبيعات (ج.م)"
                          stroke={theme.palette.primary.main}
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: theme.palette.primary.main }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <motion.div variants={cardVariants}>
            <Card
              sx={{
                borderRadius: 3,
                height: '100%',
                background: theme.palette.mode === 'dark'
                  ? 'rgba(29,27,32,0.65)'
                  : 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  {t('dashboard.topProducts') || 'Top Products'}
                </Typography>
                <Box sx={{ height: 300 }}>
                  {topProductsLoading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <Skeleton variant="rounded" width="100%" height={280} />
                    </Box>
                  ) : !productData.length ? (
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        py: 2,
                        px: 2,
                        textAlign: 'center',
                      }}
                    >
                      <InventoryIcon sx={{ fontSize: 44, color: 'text.secondary', opacity: 0.35, mb: 1 }} />
                      <Typography variant="body2" fontWeight={600} color="text.secondary">
                        لا توجد مبيعات أصناف مسجلة حتى الآن
                      </Typography>
                      <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, mb: 1.5 }}>
                        ستظهر قائمة الأكثر طلباً فور إتمام أول فاتورة
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Add />}
                        onClick={() => navigate('/pos')}
                        sx={{ borderRadius: 2, fontWeight: 600 }}
                      >
                        {t('dashboard.newSale') || 'فاتورة جديدة'}
                      </Button>
                    </Box>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={productData} layout="vertical" margin={{ top: 10, right: 25, left: 15, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} horizontal={false} />
                        <XAxis type="number" stroke={theme.palette.text.secondary} fontSize={12} tickLine={false} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          stroke={theme.palette.text.secondary}
                          fontSize={11}
                          width={110}
                          tickLine={false}
                          tickFormatter={(val: string) => (val && val.length > 14 ? `${val.slice(0, 13)}…` : val)}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            borderRadius: 8,
                            border: `1px solid ${theme.palette.divider}`,
                            background: theme.palette.background.paper,
                          }}
                          formatter={(value: any, name: string) => [
                            `${Number(value).toLocaleString('ar-EG')} ج.م`,
                            name,
                          ]}
                        />
                        <Bar dataKey="sales" name="المبيعات" fill={theme.palette.primary.main} radius={[0, 4, 4, 0]} barSize={18} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* Recent Activity */}
      <motion.div variants={cardVariants}>
        <Card
          sx={{
            borderRadius: 3,
            background: theme.palette.mode === 'dark'
              ? 'rgba(29,27,32,0.65)'
              : 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {t('dashboard.recentActivity') || 'Recent Activity'}
              </Typography>
              <Button
                size="small"
                onClick={() => navigate('/invoices')}
                sx={{ borderRadius: 2 }}
              >
                {t('common.viewAll') || 'View All'}
              </Button>
            </Box>
            <Box sx={{ overflow: 'auto' }}>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} variant="rounded" height={56} sx={{ mb: 1 }} />
                ))
              ) : !recentInvoices?.length ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Receipt sx={{ fontSize: 48, color: theme.palette.text.disabled, mb: 2 }} />
                  <Typography color="text.secondary">
                    {t('common.noData') || 'No recent activity'}
                  </Typography>
                </Box>
              ) : (
                (recentInvoices as any[]).map((inv: any, idx: number) => (
                  <motion.div
                    key={inv.id}
                    initial={{ opacity: 0, x: theme.direction === 'rtl' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        py: 1.5,
                        px: 2,
                        borderRadius: 2,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          backgroundColor: theme.palette.action.hover,
                        },
                      }}
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: alpha(theme.palette.primary.main, 0.12),
                            color: theme.palette.primary.main,
                          }}
                        >
                          <Receipt sx={{ fontSize: 20 }} />
                        </Box>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {inv.customerName || inv.invoiceNumber || 'Invoice'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('ar-EG') : inv.date || ''}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: theme.direction === 'rtl' ? 'left' : 'right' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                          {formatCurrency(Number(inv.grandTotal || inv.total || 0), 'EGP')}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: inv.status === 'COMPLETED' || inv.status === 'paid' ? 'success.main' : 'warning.main',
                            fontWeight: 600,
                          }}
                        >
                          {inv.status}
                        </Typography>
                      </Box>
                    </Box>
                  </motion.div>
                ))
              )}
            </Box>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}