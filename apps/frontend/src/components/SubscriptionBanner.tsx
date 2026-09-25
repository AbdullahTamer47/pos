import { useQuery } from '@tanstack/react-query';
import { Alert, AlertTitle, Button, Box, Stack, Typography, alpha } from '@mui/material';
import { WarningAmber, Schedule, WhatsApp as WhatsAppIcon, Phone as PhoneIcon } from '@mui/icons-material';
import api from '@/api/endpoints';
import { useAuthStore } from '@/stores/authStore';
import { UserRole } from '@smartpos/types';

export function SubscriptionBanner() {
  const { user } = useAuthStore();

  // Do not show subscription warnings to Super Admin / System Admin
  if (!user || user.role === UserRole.SUPER_ADMIN || !user.tenantId) {
    return null;
  }

  const { data: subscription } = useQuery({
    queryKey: ['subscription-current', user.tenantId],
    queryFn: () => api.subscriptions.getCurrentSubscription(user.tenantId),
    enabled: !!user.tenantId,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  if (!subscription || !subscription.endDate) return null;

  const endDate = new Date(subscription.endDate);
  if (isNaN(endDate.getTime())) return null;

  const now = new Date();
  const diffMs = endDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (isNaN(daysRemaining)) return null;
  if (daysRemaining > 15 && subscription.status !== 'TRIAL') return null;

  const isTrial = subscription.status === 'TRIAL';
  const isExpired = daysRemaining <= 0;
  const planLabel = (subscription as any).planName || 'الباقة الحالية';
  const formattedEndDate = endDate.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

  let severity: 'warning' | 'error' | 'info' = 'warning';
  let icon = <WarningAmber />;
  let title = '';
  let message = '';

  if (isExpired) {
    severity = 'error';
    title = `انتهى اشتراك (${planLabel})`;
    message = `انتهت صلاحية باقتك بتاريخ ${formattedEndDate}. يرجى التجديد فوراً لمواصلة استخدام النظام ونقاط البيع دون انقطاع.`;
  } else if (isTrial) {
    severity = daysRemaining <= 3 ? 'error' : 'info';
    icon = <Schedule />;
    title = `فترة تجريبية (${planLabel}) - متبقي ${daysRemaining} يوم`;
    message = `تنتهي فترتك التجريبية بتاريخ ${formattedEndDate} (متبقي ${daysRemaining} يوم). اشترك الآن لتفادي توقف الخدمة.`;
  } else {
    severity = daysRemaining <= 5 ? 'error' : 'warning';
    title = `تنبيه: اقتراب موعد تجديد ${planLabel} - متبقي ${daysRemaining} يوم`;
    message = `ينتهي اشتراك باقتك (${planLabel}) في ${formattedEndDate} (متبقي ${daysRemaining} يوم فقط). جدد الآن لضمان استمرار عمل الكاشير والمخزون.`;
  }

  const handleRenewViaWhatsApp = () => {
    const text = encodeURIComponent(
      `السلام عليكم، أرغب في تجديد اشتراك نظام Smart POS (المتجر: ${user.fullName || user.email || ''})`
    );
    window.open(`https://wa.me/201000165672?text=${text}`, '_blank');
  };

  return (
    <Alert
      severity={severity}
      icon={icon}
      sx={{
        borderRadius: 0,
        alignItems: { xs: 'flex-start', sm: 'center' },
        py: { xs: 1.5, sm: 1 },
        px: { xs: 2, sm: 2.5 },
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 1.5, sm: 0 },
        '& .MuiAlert-icon': {
          mr: { xs: 0, sm: 1 },
          mb: { xs: 0.5, sm: 0 },
        },
        '& .MuiAlert-message': { width: '100%', p: 0 },
        '& .MuiAlert-action': {
          pt: { xs: 0.5, sm: 0 },
          pl: 0,
          mr: 0,
          alignSelf: { xs: 'stretch', sm: 'center' },
          width: { xs: '100%', sm: 'auto' },
        },
        ...(severity === 'error' && {
          bgcolor: (theme) => alpha(theme.palette.error.main, 0.12),
        }),
      }}
      action={
        <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
          <Button
            color="success"
            size="small"
            variant="contained"
            startIcon={<WhatsAppIcon />}
            onClick={handleRenewViaWhatsApp}
            fullWidth
            sx={{
              fontWeight: 700,
              whiteSpace: 'nowrap',
              bgcolor: '#25D366',
              color: '#fff',
              width: { xs: '100%', sm: 'auto' },
              '&:hover': { bgcolor: '#1EBE5D' },
            }}
          >
            تجديد الآن (01000165672)
          </Button>
        </Stack>
      }
    >
      <AlertTitle sx={{ fontWeight: 700, mb: 0.5 }}>{title}</AlertTitle>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="body2">{message}</Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, bgcolor: 'background.paper', px: 1, py: 0.25, borderRadius: 1, border: '1px solid currentColor' }}>
          للتجديد والدعم الفني: 01000165672
        </Typography>
      </Box>
    </Alert>
  );
}
