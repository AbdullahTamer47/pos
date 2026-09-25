import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Popover,
  Box,
  Typography,
  IconButton,
  Button,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  CircularProgress,
  Stack,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Notifications,
  NotificationsOff,
  Done as DoneIcon,
  DoneAll as DoneAllIcon,
  Circle,
} from '@mui/icons-material';
import api, { type NotificationResponse } from '@/api/endpoints';

interface NotificationDropdownProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

const NOTIF_COLORS: Record<string, string> = {
  info: '#1976d2',
  success: '#2e7d32',
  warning: '#ed6c02',
  error: '#d32f2f',
  default: '#757575',
};

function getNotifColor(type: string): string {
  return NOTIF_COLORS[type] ?? NOTIF_COLORS.default ?? '#757575';
}

function timeAgo(date: string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function NotificationDropdown({ anchorEl, onClose }: NotificationDropdownProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const open = Boolean(anchorEl);

  const { data: notifData, isLoading } = useQuery<{
    data: NotificationResponse[];
    total: number;
  }>({
    queryKey: ['notifications', 'recent'],
    queryFn: () => api.notifications.getNotifications({ page: 1, limit: 8 }),
    enabled: open,
  });

  const markAsReadMut = useMutation({
    mutationFn: (id: string) => api.notifications.markAsRead(id),
    meta: { silent: true },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMut = useMutation({
    mutationFn: () => api.notifications.markAllAsRead(),
    meta: { successMsg: t('notifications.allMarkedRead') || 'All notifications marked as read' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const rawList = Array.isArray(notifData)
    ? notifData
    : Array.isArray((notifData as any)?.data)
      ? (notifData as any).data
      : [];
  const notifications = (rawList as NotificationResponse[]).filter(Boolean);
  const hasUnread = notifications.some((n) => Boolean(n && !n.isRead));

  const handleClick = (notif: NotificationResponse) => {
    if (!notif) return;
    if (!notif.isRead && notif.id) {
      markAsReadMut.mutate(notif.id);
    }
    if (notif.link) {
      navigate(notif.link);
    }
    onClose();
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      PaperProps={{
        sx: {
          mt: 1,
          width: { xs: 320, sm: 380 },
          maxHeight: 500,
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
          background:
            theme.palette.mode === 'dark'
              ? 'rgba(29,27,32,0.95)'
              : 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: theme.shadows[16],
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Notifications fontSize="small" />
          <Typography variant="subtitle2" fontWeight={700}>
            {t('common.notifications') || 'Notifications'}
          </Typography>
        </Stack>
        {hasUnread && (
          <Button
            size="small"
            startIcon={<DoneAllIcon />}
            disabled={markAllReadMut.isPending}
            onClick={() => markAllReadMut.mutate()}
          >
            {t('notifications.markAllRead') || 'Mark all read'}
          </Button>
        )}
      </Box>

      <Box sx={{ overflow: 'auto', maxHeight: 380 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 5, px: 2 }}>
            <NotificationsOff sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {t('notifications.empty') || 'No notifications'}
            </Typography>
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {notifications.map((notif) => {
              if (!notif) return null;
              const color = getNotifColor(notif.type || 'info');
              return (
                <ListItemButton
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  sx={{
                    py: 1.5,
                    px: 2,
                    bgcolor: notif.isRead
                      ? 'transparent'
                      : alpha(color, 0.06),
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                    '&:last-child': { borderBottom: 'none' },
                    '&:hover': { bgcolor: alpha(color, 0.1) },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {!notif.isRead ? (
                      <Circle sx={{ fontSize: 10, color }} />
                    ) : (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (notif.id) markAsReadMut.mutate(notif.id);
                        }}
                        sx={{ p: 0.5 }}
                      >
                        <DoneIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                      </IconButton>
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        fontWeight={notif.isRead ? 400 : 600}
                        noWrap
                      >
                        {notif.title}
                      </Typography>
                    }
                    secondary={
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                          sx={{ flex: 1 }}
                        >
                          {notif.message}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          {timeAgo(notif.createdAt)}
                        </Typography>
                      </Stack>
                    }
                  />
                </ListItemButton>
              );
            })}
          </List>
        )}
      </Box>

      <Divider />
      <Box sx={{ p: 1, textAlign: 'center' }}>
        <Button
          fullWidth
          size="small"
          onClick={() => {
            navigate('/notifications');
            onClose();
          }}
        >
          {t('notifications.viewAll') || 'View all notifications'}
        </Button>
      </Box>
    </Popover>
  );
}
