import { useEffect, useState } from 'react';
import { Box, Typography, Slide, alpha, useTheme } from '@mui/material';
import { WifiOff, CloudOff } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useOfflineSync } from '@/hooks/useOfflineSync';

export function OfflineIndicator() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { isOffline, pendingCount, syncInProgress } = useOfflineSync();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOffline) {
      const timer = setTimeout(() => setShow(true), 500);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setShow(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOffline]);

  return (
    <Slide in={show} direction="down" mountOnEnter unmountOnExit>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          py: 0.75,
          px: 2,
          bgcolor: isOffline
            ? alpha(theme.palette.warning.main, 0.95)
            : alpha(theme.palette.success.main, 0.95),
          color: isOffline
            ? theme.palette.warning.contrastText
            : theme.palette.success.contrastText,
          backdropFilter: 'blur(8px)',
        }}
      >
        {isOffline ? (
          <>
            <WifiOff sx={{ fontSize: 18 }} />
            <Typography variant="caption" fontWeight={600}>
              {t('common.offline', 'أنت غير متصل بالإنترنت')}
              {pendingCount > 0 && ` — ${pendingCount} ${t('common.pendingSyncOperations', 'عملية قيد المزامنة')}`}
            </Typography>
          </>
        ) : syncInProgress ? (
          <>
            <CloudOff sx={{ fontSize: 18 }} />
            <Typography variant="caption" fontWeight={600}>
              {t('common.syncingData', 'جاري مزامنة بياناتك...')}
            </Typography>
          </>
        ) : null}
      </Box>
    </Slide>
  );
}