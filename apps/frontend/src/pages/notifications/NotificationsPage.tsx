import { useState, useMemo } from 'react';
import {
  Box, Typography, Stack, Button, IconButton, Chip, Paper, Badge, alpha,
  useTheme, Skeleton, Alert, Tabs, Tab, List, ListItem, ListItemAvatar,
  ListItemText, Avatar, Divider, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import {
  Notifications as NotificationsIcon, DoneAll, Delete, Info, Warning,
  CheckCircle, Error as ErrorIcon, MarkEmailRead, Inbox,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import api, { type NotificationResponse, type PaginatedResponse } from '@/api/endpoints';
import { useAppStore } from '@/stores/appStore';

const typeIcons: Record<string, React.ReactNode> = {
  INFO: <Info color="info" />,
  WARNING: <Warning color="warning" />,
  SUCCESS: <CheckCircle color="success" />,
  ERROR: <ErrorIcon color="error" />,
  info: <Info color="info" />,
  warning: <Warning color="warning" />,
  success: <CheckCircle color="success" />,
  error: <ErrorIcon color="error" />,
};

const typeColors: Record<string, string> = {
  INFO: '#1976d2',
  WARNING: '#f57c00',
  SUCCESS: '#388e3c',
  ERROR: '#d32f2f',
  info: '#1976d2',
  warning: '#f57c00',
  success: '#388e3c',
  error: '#d32f2f',
};

export default function NotificationsPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const language = useAppStore((s) => s.language);
  const dateLocale = language === 'ar' ? ar : enUS;
  const [page, setPage] = useState(0);
  const [limit] = useState(20);
  const [typeFilter, setTypeFilter] = useState('');
  const [readFilter, setReadFilter] = useState<string>('');

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery<PaginatedResponse<NotificationResponse>>({
    queryKey: ['notifications', typeFilter, readFilter],
    queryFn: ({ pageParam = 1 }) => api.notifications.getNotifications({
      page: pageParam as number,
      limit,
    }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });

  const { data: unreadCount } = useQuery({
    queryKey: ['notificationsUnreadCount'],
    queryFn: () => api.notifications.getUnreadCount(),
    refetchInterval: 30_000,
  });

  const markAsReadMut = useMutation({
    mutationFn: api.notifications.markAsRead,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notifications'] }); queryClient.invalidateQueries({ queryKey: ['notificationsUnreadCount'] }); },
  });

  const markAllReadMut = useMutation({
    mutationFn: api.notifications.markAllAsRead,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notifications'] }); queryClient.invalidateQueries({ queryKey: ['notificationsUnreadCount'] }); },
  });

  const deleteMut = useMutation({
    mutationFn: api.notifications.deleteNotification,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notifications'] }); queryClient.invalidateQueries({ queryKey: ['notificationsUnreadCount'] }); },
  });

  const allNotifications = useMemo(() => {
    const items = data?.pages.flatMap((p: any) => (Array.isArray(p?.data) ? p.data : Array.isArray(p) ? p : [])) || [];
    let filtered = items.filter(Boolean) as NotificationResponse[];
    if (typeFilter) filtered = filtered.filter((n) => n?.type?.toUpperCase() === typeFilter.toUpperCase());
    if (readFilter === 'read') filtered = filtered.filter((n) => Boolean(n?.isRead));
    if (readFilter === 'unread') filtered = filtered.filter((n) => Boolean(n && !n.isRead));
    return filtered;
  }, [data, typeFilter, readFilter]);

  const getTimeAgo = (date: string) => {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      return formatDistanceToNow(d, { addSuffix: true, locale: dateLocale });
    } catch {
      return '';
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap mb={3}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h4" fontWeight={700}>{t('notifications.title')}</Typography>
          {unreadCount && unreadCount.count > 0 ? (
            <Badge badgeContent={unreadCount.count} color="error">
              <NotificationsIcon />
            </Badge>
          ) : (
            <NotificationsIcon color="action" />
          )}
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DoneAll />}
            onClick={() => markAllReadMut.mutate()}
            disabled={markAllReadMut.isPending}
          >
            {t('notifications.markAllRead')}
          </Button>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={2}>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>{t('notifications.type')}</InputLabel>
          <Select value={typeFilter} label={t('notifications.type')} onChange={(e) => setTypeFilter(e.target.value)}>
            <MenuItem value="">{t('common.all')}</MenuItem>
            <MenuItem value="INFO">{t('notifications.info')}</MenuItem>
            <MenuItem value="WARNING">{t('notifications.warning')}</MenuItem>
            <MenuItem value="SUCCESS">{t('notifications.success')}</MenuItem>
            <MenuItem value="ERROR">{t('notifications.error')}</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>{t('common.status')}</InputLabel>
          <Select value={readFilter} label={t('common.status')} onChange={(e) => setReadFilter(e.target.value)}>
            <MenuItem value="">{t('common.all')}</MenuItem>
            <MenuItem value="unread">{t('notifications.unread')}</MenuItem>
            <MenuItem value="read">{t('notifications.read')}</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {isLoading ? (
        <Stack spacing={1}>
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={72} />
          ))}
        </Stack>
      ) : error ? (
        <Alert severity="error" sx={{ borderRadius: 3 }}>{(error as Error).message}</Alert>
      ) : allNotifications.length === 0 ? (
        <Box textAlign="center" py={10}>
          <Inbox sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" mb={1}>
            {t('notifications.noNotifications')}
          </Typography>
          <Typography variant="body2" color="text.disabled">
            {t('notifications.noNotificationsDesc', 'You\'re all caught up!')}
          </Typography>
        </Box>
      ) : (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <List disablePadding>
            {allNotifications.filter(Boolean).map((notification, idx) => (
              <Box key={notification?.id || idx}>
                {idx > 0 && <Divider component="li" />}
                <ListItem
                  sx={{
                    bgcolor: notification?.isRead ? 'transparent' : alpha(theme.palette.primary.main, 0.04),
                    py: 2,
                    '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.5) },
                  }}
                  secondaryAction={
                    <Stack direction="row" spacing={0.5}>
                      {!notification?.isRead && notification?.id && (
                        <IconButton size="small" onClick={() => markAsReadMut.mutate(notification.id)} title={t('notifications.markAsRead')}>
                          <MarkEmailRead fontSize="small" />
                        </IconButton>
                      )}
                      {notification?.id && (
                        <IconButton size="small" onClick={() => deleteMut.mutate(notification.id)} color="error" title={t('notifications.deleteNotification')}>
                          <Delete fontSize="small" />
                        </IconButton>
                      )}
                    </Stack>
                  }
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: alpha(typeColors[notification?.type] || '#1976d2', 0.12),
                        color: typeColors[notification?.type] || '#1976d2',
                      }}
                    >
                      {typeIcons[notification?.type] || <NotificationsIcon />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="body1" fontWeight={notification?.isRead ? 400 : 600}>
                          {notification?.title || ''}
                        </Typography>
                        {!notification?.isRead && (
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />
                        )}
                      </Stack>
                    }
                    secondary={
                      <Stack direction="row" alignItems="center" spacing={1} mt={0.5}>
                        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                          {notification?.message || ''}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0 }}>
                          {notification?.createdAt ? getTimeAgo(notification.createdAt) : ''}
                        </Typography>
                      </Stack>
                    }
                  />
                </ListItem>
              </Box>
            ))}
          </List>
        </Paper>
      )}

      {hasNextPage && (
        <Box textAlign="center" mt={2}>
          <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? t('common.loading') : t('common.showMore')}
          </Button>
        </Box>
      )}
    </Box>
  );
}