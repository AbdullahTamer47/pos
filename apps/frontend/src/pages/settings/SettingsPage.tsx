import { useEffect } from 'react';
import { Box, Card, CardContent, Typography, Stack, Grid, Button, alpha, useTheme } from '@mui/material';
import {
  Palette as BrandingIcon,
  ReceiptLong as TaxIcon,
  People as UsersIcon,
  Security as AdminSettingsIcon,
  Business as TenantsIcon,
  CardGiftcard as PlansIcon,
  SupportAgent as TicketsIcon,
  WhatsApp as WhatsAppIcon,
  ArrowForward as ArrowIcon,
  Phone as PhoneIcon,
  Verified as VerifiedIcon,
  Backup as BackupIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { UserRole } from '@smartpos/types';

export default function SettingsPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

  const handleWhatsAppSupport = () => {
    const text = encodeURIComponent(
      `السلام عليكم، أتواصل بخصوص الدعم الفني وتجديد اشتراك نظام Smart POS (المستخدم: ${user?.fullName || user?.email || ''})`
    );
    window.open(`https://wa.me/201000165672?text=${text}`, '_blank');
  };

  const merchantCards = [
    {
      path: '/settings/branding',
      title: 'العلامة التجارية والمتجر',
      desc: 'تخصيص اسم المتجر، الشعار، ألوان الفواتير والنظام',
      icon: <BrandingIcon />,
      color: '#7b1fa2',
    },
    {
      path: '/settings/tax',
      title: 'إعدادات الضرائب',
      desc: 'تهيئة نسبة ضريبة القيمة المضافة وحساب الضرائب في الفواتير',
      icon: <TaxIcon />,
      color: '#388e3c',
    },
    {
      path: '/settings/users',
      title: 'إدارة المستخدمين',
      desc: 'إضافة وإدارة حسابات الكاشير والمشرفين والصلاحيات',
      icon: <UsersIcon />,
      color: '#d32f2f',
    },
    {
      path: '/settings/backup',
      title: 'النسخ الاحتياطي والأرشفة',
      desc: 'إنشاء واستعادة النسخ الاحتياطية وتصدير وحماية بيانات المتجر',
      icon: <BackupIcon />,
      color: '#0288d1',
    },
  ];

  const adminCards = [
    {
      path: '/admin/settings',
      title: 'إعدادات النظام العامة',
      desc: 'التحكم في إعدادات النظام، التنبيهات، والأمان',
      icon: <AdminSettingsIcon />,
      color: '#1976d2',
    },
    {
      path: '/admin/tenants',
      title: 'إدارة التجار والمشتركين',
      desc: 'متابعة حسابات المتاجر، الاشتراكات، وحالة التفعيل',
      icon: <TenantsIcon />,
      color: '#00796b',
    },
    {
      path: '/admin/plans',
      title: 'باقات الاشتراك والأسعار',
      desc: 'تعديل وإنشاء خطط وباقات الاشتراك',
      icon: <PlansIcon />,
      color: '#e64a19',
    },
    {
      path: '/admin/tickets',
      title: 'تذاكر الدعم الفني',
      desc: 'متابعة طلبات الدعم الفني المقدمة من التجار',
      icon: <TicketsIcon />,
      color: '#512da8',
    },
  ];

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            {isSuperAdmin ? 'إعدادات المشرف العام' : 'إعدادات النظام والمتجر'}
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            {isSuperAdmin
              ? 'التحكم الكامل في منصة Smart POS، التجار، الباقات والدعم الفني'
              : 'إدارة متجرك، الضرائب، مستخدمي الكاشير، والاشتراك'}
          </Typography>
        </Box>
      </Stack>

      {/* بطاقة الدعم الفني والتجديد الفوري عبر WhatsApp للتاجر فقط (لا تظهر للمشرف العام صاحب المنصة) */}
      {!isSuperAdmin && (
        <Card
          sx={{
            mb: 4,
            mt: 2,
            borderRadius: 3,
            background: `linear-gradient(135deg, ${alpha('#25D366', 0.12)}, ${alpha(theme.palette.primary.main, 0.08)})`,
            border: `1.5px solid ${alpha('#25D366', 0.4)}`,
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, md: 8 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 54,
                      height: 54,
                      borderRadius: '50%',
                      bgcolor: '#25D366',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(37,211,102,0.3)',
                      flexShrink: 0,
                    }}
                  >
                    <WhatsAppIcon sx={{ fontSize: 32 }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      تجديد الاشتراك والدعم الفني المباشر
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                      لتجديد الباقة أو ترقية الخطة أو طلب المساعدة الفورية، تواصل مباشرة مع الإدارة عبر واتساب.
                    </Typography>
                  </Box>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Stack direction="row" spacing={1.5} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                  <Button
                    variant="contained"
                    startIcon={<WhatsAppIcon />}
                    onClick={handleWhatsAppSupport}
                    sx={{
                      bgcolor: '#25D366',
                      '&:hover': { bgcolor: '#1ebe5d' },
                      fontWeight: 700,
                      borderRadius: 2,
                    }}
                  >
                    واتساب: 01000165672
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<PhoneIcon />}
                    component="a"
                    href="tel:01000165672"
                    sx={{ fontWeight: 700, borderRadius: 2 }}
                  >
                    اتصال
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* البطاقات الخاصة بالمشرف العام إن كان SUPER_ADMIN */}
      {isSuperAdmin ? (
        <Box mb={4}>
          <Typography variant="h6" fontWeight={700} mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VerifiedIcon color="primary" fontSize="small" /> لوحة تحكم المشرف العام
          </Typography>
          <Grid container spacing={2.5}>
            {adminCards.map((card) => (
              <Grid key={card.path} size={{ xs: 12, sm: 6, md: 6 }}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    borderRadius: 3,
                    transition: 'all 0.2s ease',
                    border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: theme.shadows[6],
                      borderColor: card.color,
                    },
                  }}
                  onClick={() => navigate(card.path)}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: alpha(card.color, 0.12),
                          color: card.color,
                          flexShrink: 0,
                        }}
                      >
                        {card.icon}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle1" fontWeight={700} noWrap>
                          {card.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {card.desc}
                        </Typography>
                      </Box>
                      <ArrowIcon sx={{ color: 'text.disabled', flexShrink: 0 }} />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      ) : (
        <Box>
          <Typography variant="h6" fontWeight={700} mb={2}>
            إعدادات المتجر ونقاط البيع
          </Typography>
          <Grid container spacing={2.5}>
            {merchantCards.map((card) => (
              <Grid key={card.path} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    borderRadius: 3,
                    transition: 'all 0.2s ease',
                    border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: theme.shadows[6],
                      borderColor: card.color,
                    },
                  }}
                  onClick={() => navigate(card.path)}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: alpha(card.color, 0.12),
                          color: card.color,
                          flexShrink: 0,
                        }}
                      >
                        {card.icon}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle1" fontWeight={700} noWrap>
                          {card.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {card.desc}
                        </Typography>
                      </Box>
                      <ArrowIcon sx={{ color: 'text.disabled', flexShrink: 0 }} />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
}