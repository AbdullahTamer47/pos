import { useState, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, InputAdornment, Grid,
  IconButton, Stack, alpha, useTheme, Skeleton,
} from '@mui/material';
import {
  Search as SearchIcon, Close as CloseIcon, TrendingUp, BarChart,
  Inventory2, SwapHoriz, Star, Speed, Person, Receipt, Business,
  ReceiptLong, CalendarMonth, Summarize, ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { UserRole } from '@smartpos/types';

interface ReportCard {
  type: string;
  key: string;
  icon: React.ReactNode;
  descriptionKey: string;
}

const reportCards: ReportCard[] = [
  { type: 'sales', key: 'reports.salesReport', icon: <TrendingUp />, descriptionKey: 'reports.salesReportDesc' },
  { type: 'profit-loss', key: 'reports.profitLossReport', icon: <BarChart />, descriptionKey: 'reports.profitLossDesc' },
  { type: 'inventory-status', key: 'reports.inventoryStatusReport', icon: <Inventory2 />, descriptionKey: 'reports.inventoryStatusDesc' },
  { type: 'inventory-movements', key: 'reports.inventoryMovementsReport', icon: <SwapHoriz />, descriptionKey: 'reports.inventoryMovementsDesc' },
  { type: 'top-products', key: 'reports.topProductsReport', icon: <Star />, descriptionKey: 'reports.topProductsDesc' },
  { type: 'slow-moving', key: 'reports.slowMovingReport', icon: <Speed />, descriptionKey: 'reports.slowMovingDesc' },
  { type: 'cashier-performance', key: 'reports.cashierPerformanceReport', icon: <Person />, descriptionKey: 'reports.cashierPerformanceDesc' },
  { type: 'customer-statement', key: 'reports.customerStatement', icon: <Receipt />, descriptionKey: 'reports.customerStatementDesc' },
  { type: 'supplier-statement', key: 'reports.supplierStatement', icon: <Business />, descriptionKey: 'reports.supplierStatementDesc' },
  { type: 'tax', key: 'reports.taxReport', icon: <ReceiptLong />, descriptionKey: 'reports.taxReportDesc' },
  { type: 'shift', key: 'reports.shiftReport', icon: <CalendarMonth />, descriptionKey: 'reports.shiftReportDesc' },
  { type: 'daily-summary', key: 'reports.dailySummary', icon: <Summarize />, descriptionKey: 'reports.dailySummaryDesc' },
];

const cardColors = [
  '#1976d2', '#388e3c', '#f57c00', '#d32f2f',
  '#7b1fa2', '#00796b', '#455a64', '#c2185b',
  '#0288d1', '#689f38', '#e64a19', '#5c6bc0',
];

export default function ReportsPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');

  const isCashier = user?.role === UserRole.CASHIER;
  const userPerms = Array.isArray(user?.permissions) ? user.permissions : [];

  const allowedCards = useMemo(() => {
    if (!isCashier) return reportCards;
    if (userPerms.includes('nav.reports') || userPerms.includes('pos.view_reports')) {
      const specificPerms = userPerms.filter((p) => p.startsWith('report.'));
      if (specificPerms.length > 0) {
        return reportCards.filter((c) => specificPerms.includes(`report.${c.type}`));
      }
      return reportCards;
    }
    return reportCards.filter((c) => userPerms.includes(`report.${c.type}`));
  }, [isCashier, userPerms]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allowedCards;
    const q = search.toLowerCase();
    return allowedCards.filter(
      (c) =>
        t(c.key).toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q)
    );
  }, [search, t, allowedCards]);

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h4" fontWeight={700}>
          {t('reports.title', t('nav.reports', 'التقارير'))}
        </Typography>
      </Stack>

      <TextField
        fullWidth
        placeholder={t('common.search', 'Search reports...')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 3, maxWidth: 480 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
          endAdornment: search ? (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => setSearch('')}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : null,
          sx: { borderRadius: 3 },
        }}
      />

      <Grid container spacing={2.5}>
        {filtered.map((card, idx) => (
          <Grid key={card.type} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                borderRadius: 3,
                height: '100%',
                border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: theme.shadows[8],
                  borderColor: cardColors[idx % cardColors.length],
                },
              }}
              onClick={() => navigate(`/reports/${card.type}`)}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" alignItems="flex-start" spacing={2}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha(cardColors[idx % cardColors.length] || '#1976d2', 0.12),
                      color: cardColors[idx % cardColors.length] || '#1976d2',
                      flexShrink: 0,
                    }}
                  >
                    {card.icon}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      sx={{
                        lineHeight: 1.35,
                        fontSize: '0.95rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        minHeight: '2.7em',
                      }}
                    >
                      {t(card.key)}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                    >
                      {t(card.descriptionKey, '')}
                    </Typography>
                  </Box>
                  <ArrowIcon sx={{ color: 'text.disabled', mt: 1, flexShrink: 0 }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filtered.length === 0 && (
        <Box textAlign="center" py={8}>
          <Typography variant="h6" color="text.secondary">
            {t('common.noResults', 'No reports found')}
          </Typography>
        </Box>
      )}
    </Box>
  );
}