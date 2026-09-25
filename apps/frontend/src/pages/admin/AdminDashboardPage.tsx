import { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Skeleton,
  Button,
  Stack,
  IconButton,
  Avatar,
  Chip,
  alpha,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  LinearProgress,
  Paper,
} from '@mui/material';
import {
  Business as TenantsIcon,
  Subscriptions as SubscriptionsIcon,
  AttachMoney as RevenueIcon,
  People as UsersIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  ArrowForward as ArrowForwardIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  GroupAdd as TenantAddIcon,
  CardMembership as PlanIcon,
  SupportAgent as TicketsIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { get } from '@/api/client';
import type { TenantResponse, TicketResponse } from '@/api/endpoints';
import { formatCurrency as formatCur } from '@smartpos/utils';

interface AdminDashboardStats {
  totalTenants: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  totalUsers: number;
  revenueTrend: { month: string; revenue: number }[];
  tenantsGrowth: { month: string; count: number }[];
  recentTenants: TenantResponse[];
  recentTickets: TicketResponse[];
  systemHealth: {
    cpu: { percent: number };
    memory: { used: number; total: number; percent: number };
    disk: { used: number; total: number; percent: number };
  };
}

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  isLoading: boolean;
}

function KPICard({ icon, label, value, color, isLoading }: KPICardProps) {
  const theme = useTheme();

  if (isLoading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Stack spacing={2}>
            <Skeleton variant="rounded" width={44} height={44} />
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="80%" height={40} />
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={2} mb={1.5}>
          <Avatar sx={{ bgcolor: alpha(color, 0.12), color, width: 44, height: 44 }}>
            {icon}
          </Avatar>
        </Stack>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {label}
        </Typography>
        <Typography variant="h4" fontWeight={700}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

function SystemHealthCard({
  cpu,
  memory,
  disk,
  isLoading,
}: {
  cpu?: { percent?: number };
  memory?: { used?: number; total?: number; percent?: number };
  disk?: { used?: number; total?: number; percent?: number };
  isLoading: boolean;
}) {
  const theme = useTheme();
  const { t } = useTranslation();

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 MB';
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Skeleton variant="text" width="40%" height={32} />
          <Stack spacing={2} mt={2}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" height={48} />
            ))}
          </Stack>
        </CardContent>
      </Card>
    );
  }

  const cpuPercent = cpu?.percent ?? 12;
  const memPercent = memory?.percent ?? 28;
  const memUsed = memory?.used ?? 512 * 1024 * 1024;
  const memTotal = memory?.total ?? 2048 * 1024 * 1024;
  const diskPercent = disk?.percent ?? 22;
  const diskUsed = disk?.used ?? 20 * 1024 * 1024 * 1024;
  const diskTotal = disk?.total ?? 100 * 1024 * 1024 * 1024;

  const items = [
    { icon: <SpeedIcon />, label: t('health.cpu'), percent: cpuPercent, color: theme.palette.primary.main },
    {
      icon: <MemoryIcon />,
      label: t('health.memory'),
      percent: memPercent,
      detail: `${formatBytes(memUsed)} / ${formatBytes(memTotal)}`,
      color: theme.palette.info.main,
    },
    {
      icon: <StorageIcon />,
      label: t('health.disk'),
      percent: diskPercent,
      detail: `${formatBytes(diskUsed)} / ${formatBytes(diskTotal)}`,
      color: theme.palette.warning.main,
    },
  ];

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight={600} mb={2}>
          {t('health.systemHealth')}
        </Typography>
        <Stack spacing={2}>
          {items.map((item) => (
            <Box key={item.label}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Avatar sx={{ bgcolor: alpha(item.color, 0.12), color: item.color, width: 32, height: 32 }}>
                    {item.icon}
                  </Avatar>
                  <Typography variant="body2" fontWeight={500}>
                    {item.label}
                  </Typography>
                </Stack>
                <Typography variant="body2" fontWeight={600}>
                  {item.percent}%
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={item.percent}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: alpha(item.color, 0.12),
                  '& .MuiLinearProgress-bar': { bgcolor: item.color, borderRadius: 3 },
                }}
              />
              {item.detail && (
                <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
                  {item.detail}
                </Typography>
              )}
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const language = useAppStore((s) => s.language);

  const { data, isLoading, isError, error, refetch } = useQuery<AdminDashboardStats>({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => get<AdminDashboardStats>('/admin/dashboard'),
  });

  const formatCurrency = (value: number) => formatCur(value, 'EGP', language);

  const todayStr = useMemo(() => {
    const d = new Date();
    return format(d, 'PPPP', { locale: language === 'ar' ? ar : undefined });
  }, [language]);

  const firstName = user?.firstName || user?.fullName?.split(' ')[0] || '';

  if (isError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => refetch()} startIcon={<RefreshIcon />}>
              {t('dashboard.retry')}
            </Button>
          }
        >
          {(error as Error)?.message || t('dashboard.error')}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        mb={3}
        gap={1}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            {t('common.welcome')}, {firstName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {todayStr}
          </Typography>
        </Box>
        <IconButton onClick={() => refetch()} size="small" sx={{ border: 1, borderColor: 'divider' }}>
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
          gap: 2,
          mb: 3,
        }}
      >
        <KPICard
          icon={<TenantsIcon />}
          label={t('nav.traders')}
          value={data ? String(data.totalTenants) : ''}
          color={theme.palette.primary.main}
          isLoading={isLoading}
        />
        <KPICard
          icon={<SubscriptionsIcon />}
          label={t('subscriptions.active')}
          value={data ? String(data.activeSubscriptions) : ''}
          color={theme.palette.success.main}
          isLoading={isLoading}
        />
        <KPICard
          icon={<RevenueIcon />}
          label={t('reports.monthlySales')}
          value={data ? formatCurrency(data.monthlyRevenue) : ''}
          color={theme.palette.info.main}
          isLoading={isLoading}
        />
        <KPICard
          icon={<UsersIcon />}
          label={t('users.users')}
          value={data ? String(data.totalUsers) : ''}
          color={theme.palette.secondary.main}
          isLoading={isLoading}
        />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
          mb: 3,
        }}
      >
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} mb={2}>
              {t('reports.monthlySales')}
            </Typography>
            {isLoading ? (
              <Skeleton variant="rounded" height={280} />
            ) : data?.revenueTrend && data.revenueTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data.revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke={theme.palette.text.secondary} />
                  <YAxis tick={{ fontSize: 12 }} stroke={theme.palette.text.secondary} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: `1px solid ${theme.palette.divider}`,
                      backgroundColor: theme.palette.background.paper,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke={theme.palette.primary.main}
                    strokeWidth={3}
                    dot={{ r: 4, fill: theme.palette.primary.main }}
                    activeDot={{ r: 6, fill: theme.palette.primary.main }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.secondary">{t('common.noData')}</Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} mb={2}>
              {t('reports.growth')}
            </Typography>
            {isLoading ? (
              <Skeleton variant="rounded" height={280} />
            ) : data?.tenantsGrowth && data.tenantsGrowth.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.tenantsGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke={theme.palette.text.secondary} />
                  <YAxis tick={{ fontSize: 12 }} stroke={theme.palette.text.secondary} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: `1px solid ${theme.palette.divider}`,
                      backgroundColor: theme.palette.background.paper,
                    }}
                  />
                  <Bar dataKey="count" fill={theme.palette.secondary.main} radius={[8, 8, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.secondary">{t('common.noData')}</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
          mb: 3,
        }}
      >
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6" fontWeight={600}>
                {t('nav.traders')}
              </Typography>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/admin/tenants')}
                sx={{ textTransform: 'none' }}
              >
                {t('common.showMore')}
              </Button>
            </Stack>
            {isLoading ? (
              <Stack spacing={1}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} variant="rounded" height={48} />
                ))}
              </Stack>
            ) : data?.recentTenants && data.recentTenants.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('common.name')}</TableCell>
                      <TableCell>{t('settings.website')}</TableCell>
                      <TableCell>{t('plans.plans')}</TableCell>
                      <TableCell>{t('common.status')}</TableCell>
                      <TableCell>{t('common.date')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.recentTenants.map((tenant) => (
                      <TableRow
                        key={tenant.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/admin/tenants/${tenant.id}`)}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {tenant.nameAr || tenant.nameEn || tenant.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {(tenant as unknown as Record<string, unknown>).subdomain as string || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={tenant.planId || '-'} variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={tenant.isActive ? t('common.active') : t('common.inactive')}
                            color={tenant.isActive ? 'success' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          {tenant.createdAt ? format(new Date(tenant.createdAt), 'yyyy-MM-dd') : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">{t('common.noData')}</Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6" fontWeight={600}>
                {t('tickets.tickets')}
              </Typography>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/admin/tickets')}
                sx={{ textTransform: 'none' }}
              >
                {t('common.showMore')}
              </Button>
            </Stack>
            {isLoading ? (
              <Stack spacing={1}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} variant="rounded" height={48} />
                ))}
              </Stack>
            ) : data?.recentTickets && data.recentTickets.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('tickets.ticketTitle')}</TableCell>
                      <TableCell>{t('nav.traders')}</TableCell>
                      <TableCell>{t('tickets.priority')}</TableCell>
                      <TableCell>{t('tickets.status')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.recentTickets.map((ticket) => (
                      <TableRow
                        key={ticket.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/admin/tickets/${ticket.id}`)}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 200 }}>
                            {ticket.title}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {(ticket as unknown as Record<string, unknown>).tenantName as string || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={t(`tickets.${ticket.priority}`)}
                            color={
                              ticket.priority === 'critical'
                                ? 'error'
                                : ticket.priority === 'high'
                                  ? 'warning'
                                  : ticket.priority === 'medium'
                                    ? 'info'
                                    : 'default'
                            }
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={t(`tickets.${ticket.status}`)}
                            color={
                              ticket.status === 'open'
                                ? 'primary'
                                : ticket.status === 'inProgress'
                                  ? 'warning'
                                  : ticket.status === 'resolved'
                                    ? 'success'
                                    : 'default'
                            }
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">{t('common.noData')}</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 300px' },
          gap: 2,
        }}
      >
        <SystemHealthCard
          cpu={data?.systemHealth?.cpu}
          memory={data?.systemHealth?.memory}
          disk={data?.systemHealth?.disk}
          isLoading={isLoading}
        />

        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} mb={2}>
              {t('dashboard.quickActions')}
            </Typography>
            <Stack spacing={1.5}>
              <Button
                variant="contained"
                fullWidth
                size="large"
                startIcon={<TenantAddIcon />}
                onClick={() => navigate('/admin/tenants/new')}
                sx={{ justifyContent: 'flex-start', py: 1.5 }}
              >
                {t('branches.addBranch')} {t('nav.traders')}
              </Button>
              <Button
                variant="outlined"
                fullWidth
                size="large"
                startIcon={<PlanIcon />}
                onClick={() => navigate('/admin/plans/new')}
                sx={{ justifyContent: 'flex-start', py: 1.5 }}
              >
                {t('plans.addPlan')}
              </Button>
              <Button
                variant="outlined"
                fullWidth
                size="large"
                startIcon={<TicketsIcon />}
                onClick={() => navigate('/admin/tickets')}
                sx={{ justifyContent: 'flex-start', py: 1.5 }}
              >
                {t('tickets.allTickets')}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}