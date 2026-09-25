import { Box, Button, Typography, Stack, alpha, useTheme } from '@mui/material';
import { Home as HomeIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: alpha(theme.palette.primary.main, 0.02),
        p: 3,
      }}
    >
      <Stack alignItems="center" spacing={3} maxWidth={480} textAlign="center">
        <Box
          sx={{
            width: 200,
            height: 200,
            borderRadius: '50%',
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="60" cy="60" r="55" stroke={theme.palette.primary.main} strokeWidth="2" strokeDasharray="8 4" opacity="0.3" />
            <text x="60" y="68" textAnchor="middle" fill={theme.palette.primary.main} fontSize="48" fontWeight="700" fontFamily="inherit">
              4
            </text>
            <text x="95" y="50" textAnchor="middle" fill={theme.palette.secondary.main} fontSize="28" fontWeight="700" fontFamily="inherit">
              0
            </text>
            <text x="90" y="80" textAnchor="middle" fill={theme.palette.warning.main} fontSize="28" fontWeight="700" fontFamily="inherit">
              4
            </text>
            <circle cx="52" cy="42" r="4" fill={theme.palette.primary.main} opacity="0.5" />
            <circle cx="80" cy="30" r="3" fill={theme.palette.secondary.main} opacity="0.4" />
            <circle cx="28" cy="55" r="3" fill={theme.palette.success.main} opacity="0.4" />
            <circle cx="92" cy="72" r="2.5" fill={theme.palette.info.main} opacity="0.4" />
            <circle cx="38" cy="82" r="2" fill={theme.palette.warning.main} opacity="0.4" />
            <line x1="20" y1="90" x2="40" y2="95" stroke={theme.palette.primary.main} strokeWidth="1.5" opacity="0.3" strokeLinecap="round" />
            <line x1="80" y1="88" x2="100" y2="92" stroke={theme.palette.primary.main} strokeWidth="1.5" opacity="0.3" strokeLinecap="round" />
          </svg>
        </Box>

        <Typography
          variant="h3"
          fontWeight={800}
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {t('errors.notFound')}
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
          {t('errors.pageNotFoundDesc', 'The page you are looking for does not exist or has been moved.')}
        </Typography>

        <Button
          variant="contained"
          size="large"
          startIcon={<HomeIcon />}
          onClick={() => navigate('/')}
          sx={{
            mt: 2,
            px: 4,
            py: 1.5,
            borderRadius: 3,
            fontSize: '1rem',
            fontWeight: 600,
            boxShadow: theme.shadows[4],
            '&:hover': {
              boxShadow: theme.shadows[8],
              transform: 'translateY(-2px)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          {t('common.goToDashboard', 'Go to Dashboard')}
        </Button>

        <Typography variant="caption" color="text.disabled" mt={2}>
          {t('errors.needHelp', 'Need help?')}{' '}
          <Typography
            component="a"
            href="/support"
            variant="caption"
            color="primary"
            sx={{ textDecoration: 'none', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}
          >
            {t('nav.support')}
          </Typography>
        </Typography>
      </Stack>
    </Box>
  );
}