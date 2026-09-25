import { Box, Card, CardContent, Typography, Stack, Grid, Button, Paper, Divider, alpha, useTheme } from '@mui/material';
import {
  WhatsApp as WhatsAppIcon,
  Phone as PhoneIcon,
  SupportAgent as SupportAgentIcon,
  HeadsetMic as HeadsetIcon,
  AccessTime as AccessTimeIcon,
  Autorenew as RenewIcon,
  CheckCircleOutline as CheckIcon,
} from '@mui/icons-material';
import { useAuthStore } from '@/stores/authStore';

export default function SupportPage() {
  const theme = useTheme();
  const { user } = useAuthStore();

  const handleWhatsApp = (topic: string) => {
    const message = encodeURIComponent(
      `السلام عليكم، أتواصل بخصوص (${topic}) في نظام Smart POS - المستخدم: ${user?.fullName || user?.email || ''}`
    );
    window.open(`https://wa.me/201000165672?text=${message}`, '_blank');
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 1100, mx: 'auto' }}>
      {/* رأس الصفحة */}
      <Box textAlign="center" mb={4} mt={1}>
        <Stack direction="row" justifyContent="center" alignItems="center" spacing={1} mb={1}>
          <SupportAgentIcon sx={{ fontSize: 36, color: theme.palette.primary.main }} />
          <Typography variant="h4" fontWeight={800}>
            الدعم الفني وتجديد الاشتراك
          </Typography>
        </Stack>
        <Typography variant="body1" color="text.secondary">
          نحن متواجدون لمساعدتك على مدار الساعة لضمان استمرار عمل نظام نقاط البيع دون انقطاع
        </Typography>
      </Box>

      {/* بطاقة الاتصال الفوري الرئيسية عبر واتساب */}
      <Card
        sx={{
          mb: 4,
          borderRadius: 4,
          background: `linear-gradient(135deg, #128C7E 0%, #25D366 100%)`,
          color: '#fff',
          boxShadow: '0 10px 30px rgba(37,211,102,0.25)',
          p: { xs: 2, sm: 3 },
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack direction="row" spacing={2.5} alignItems="center">
              <Box
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  bgcolor: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <WhatsAppIcon sx={{ fontSize: 44, color: '#fff' }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={800} sx={{ color: '#fff' }}>
                  تواصل عبر واتساب مباشرة
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)', mt: 0.5 }}>
                  لأي استفسار تقني، تفعيل ميزات جديدة، أو تجديد باقة الاشتراك:
                </Typography>
                <Typography variant="h6" fontWeight={800} sx={{ color: '#fff', mt: 1, letterSpacing: 1 }}>
                  01000165672
                </Typography>
              </Box>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Stack direction={{ xs: 'column', sm: 'row', md: 'column' }} spacing={1.5}>
              <Button
                variant="contained"
                size="large"
                startIcon={<WhatsAppIcon />}
                onClick={() => handleWhatsApp('الدعم الفني والتجديد')}
                sx={{
                  bgcolor: '#fff',
                  color: '#128C7E',
                  fontWeight: 800,
                  fontSize: '1rem',
                  py: 1.2,
                  borderRadius: 3,
                  '&:hover': { bgcolor: '#f0f0f0' },
                }}
              >
                مراسلة واتساب الآن
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<PhoneIcon />}
                component="a"
                href="tel:01000165672"
                sx={{
                  color: '#fff',
                  borderColor: 'rgba(255,255,255,0.8)',
                  fontWeight: 700,
                  borderRadius: 3,
                  '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
                }}
              >
                اتصال هاتفي
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Card>

      {/* خيارات الدعم السريعة */}
      <Grid container spacing={3}>
        {/* تجديد الاشتراك */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            sx={{
              height: '100%',
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'translateY(-3px)',
                boxShadow: theme.shadows[4],
              },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2.5,
                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                    color: theme.palette.primary.main,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <RenewIcon />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    تجديد باقة الاشتراك
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    تجديد اشتراك المتجر الشهري أو السنوي
                  </Typography>
                </Box>
              </Stack>
              <Typography variant="body2" color="text.secondary" paragraph>
                يمكنك تجديد اشتراكك فورياً عن طريق التواصل مع المشرف، وتحويل قيمة الباقة وإرسال الإشعار ليتم تجديد وتفعيل حسابك في دقائق.
              </Typography>
              <Stack spacing={1} mb={3}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CheckIcon color="success" fontSize="small" />
                  <Typography variant="body2">تجديد فوري دون انقطاع للبيانات</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CheckIcon color="success" fontSize="small" />
                  <Typography variant="body2">حفظ جميع الفواتير والمخزون وسجل المبيعات</Typography>
                </Stack>
              </Stack>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<WhatsAppIcon />}
                onClick={() => handleWhatsApp('طلب تجديد الاشتراك')}
                sx={{ fontWeight: 700, borderRadius: 2 }}
              >
                طلب تجديد الباقة (01000165672)
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* المساعدة التقنية */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            sx={{
              height: '100%',
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'translateY(-3px)',
                boxShadow: theme.shadows[4],
              },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2.5,
                    bgcolor: alpha(theme.palette.secondary.main, 0.12),
                    color: theme.palette.secondary.main,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <HeadsetIcon />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    مساعدة تقنية فورية
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    حل المشكلات واستفسارات التشغيل
                  </Typography>
                </Box>
              </Stack>
              <Typography variant="body2" color="text.secondary" paragraph>
                إذا واجهتك أي صعوبة في إضافة المنتجات، إصدار الفواتير، طباعة الإيصالات، أو إعداد قارئ الباركود، فريقنا الفني جاهز لمساعدتك.
              </Typography>
              <Stack spacing={1} mb={3}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <AccessTimeIcon color="info" fontSize="small" />
                  <Typography variant="body2">دعم سريع عبر المحادثة والمكالمات</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CheckIcon color="success" fontSize="small" />
                  <Typography variant="body2">مساعدة في ضبط الطابعات وقارئ الباركود</Typography>
                </Stack>
              </Stack>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<WhatsAppIcon />}
                onClick={() => handleWhatsApp('طلب مساعدة تقنية في النظام')}
                sx={{ fontWeight: 700, borderRadius: 2 }}
              >
                تواصل مع المهندس المختص (01000165672)
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}