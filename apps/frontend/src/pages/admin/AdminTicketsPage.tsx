import { useState } from 'react';
import {
  Box, TextField, Button, Typography, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, Paper, Chip, IconButton,
  Skeleton, Alert, Dialog, DialogTitle, DialogContent, DialogActions, InputAdornment,
  MenuItem, Select, FormControl, InputLabel, alpha, useTheme, Avatar, Divider,
} from '@mui/material';
import {
  Search, Close, Refresh, FilterList, Reply, Assignment, CheckCircle,
  Cancel, Visibility, Person,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import api, { type TicketResponse, type PaginatedResponse } from '@/api/endpoints';
import { useAuthStore } from '@/stores/authStore';

const priorityColors: Record<string, 'success' | 'info' | 'warning' | 'error'> = {
  low: 'success',
  medium: 'info',
  high: 'warning',
  critical: 'error',
};

const statusColors: Record<string, 'info' | 'primary' | 'success' | 'default'> = {
  open: 'info',
  in_progress: 'primary',
  resolved: 'success',
  closed: 'default',
};

const replySchema = z.object({ message: z.string().min(1) });
type ReplyForm = z.infer<typeof replySchema>;

export default function AdminTicketsPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<TicketResponse | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: ticketsData, isLoading, error } = useQuery<PaginatedResponse<TicketResponse>>({
    queryKey: ['adminTickets', page + 1, rowsPerPage, search, statusFilter, priorityFilter],
    queryFn: () => api.tickets.getTickets({ page: page + 1, limit: rowsPerPage, search }),
  });

  const { data: ticketDetail, refetch: refetchDetail } = useQuery<TicketResponse>({
    queryKey: ['ticketDetail', selectedTicket?.id],
    queryFn: () => api.tickets.getTicket(selectedTicket!.id),
    enabled: !!selectedTicket?.id && detailOpen,
  });

  const assignMut = useMutation({
    mutationFn: (ticketId: string) => api.tickets.updateTicket(ticketId, { assignedToId: user?.id } as any),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['adminTickets'] }); refetchDetail(); },
  });

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.tickets.updateTicket(id, { status } as any),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['adminTickets'] }); refetchDetail(); },
  });

  const replyMut = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) => api.tickets.addTicketMessage(id, { message }),
    onSuccess: () => { refetchDetail(); },
  });

  const handleViewDetail = (ticket: TicketResponse) => {
    setSelectedTicket(ticket);
    setDetailOpen(true);
  };

  const handleReply = (data: ReplyForm) => {
    if (selectedTicket) {
      replyMut.mutate({ id: selectedTicket.id, message: data.message });
    }
  };

  const tickets = ticketsData?.data || [];
  const messages = ticketDetail?.messages || [];

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3}>{t('tickets.tickets')}</Typography>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={2}>
        <TextField size="small" placeholder={t('common.search')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} sx={{ minWidth: 200 }} />
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>{t('common.status')}</InputLabel>
          <Select value={statusFilter} label={t('common.status')} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
            <MenuItem value="">{t('common.all')}</MenuItem>
            <MenuItem value="open">{t('tickets.open')}</MenuItem>
            <MenuItem value="in_progress">{t('tickets.inProgress')}</MenuItem>
            <MenuItem value="resolved">{t('tickets.resolved')}</MenuItem>
            <MenuItem value="closed">{t('tickets.closed')}</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>{t('tickets.priority')}</InputLabel>
          <Select value={priorityFilter} label={t('tickets.priority')} onChange={(e) => { setPriorityFilter(e.target.value); setPage(0); }}>
            <MenuItem value="">{t('common.all')}</MenuItem>
            <MenuItem value="low">{t('tickets.low')}</MenuItem>
            <MenuItem value="medium">{t('tickets.medium')}</MenuItem>
            <MenuItem value="high">{t('tickets.high')}</MenuItem>
            <MenuItem value="critical">{t('tickets.critical')}</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {isLoading ? (
        <Stack spacing={1}>{[...Array(5)].map((_, i) => <Skeleton key={i} variant="rounded" height={48} />)}</Stack>
      ) : error ? (
        <Alert severity="error" sx={{ borderRadius: 3 }}>{(error as Error).message}</Alert>
      ) : tickets.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 3 }}>{t('common.noData')}</Alert>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>{t('tickets.ticketTitle')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Tenant</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('tickets.priority')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('tickets.status')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('common.created')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('tickets.assignedTo')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id} hover>
                    <TableCell>{ticket.title}</TableCell>
                    <TableCell>{ticket.tenantId || '—'}</TableCell>
                    <TableCell>
                      <Chip label={t(`tickets.${ticket.priority}`)} size="small" color={priorityColors[ticket.priority] || 'default'} />
                    </TableCell>
                    <TableCell>
                      <Chip label={t(`tickets.${ticket.status}`)} size="small" color={statusColors[ticket.status] || 'default'} />
                    </TableCell>
                    <TableCell>{ticket.createdAt ? format(new Date(ticket.createdAt), 'dd/MM/yyyy') : '—'}</TableCell>
                    <TableCell>{ticket.assignedToName || '—'}</TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleViewDetail(ticket)}><Visibility fontSize="small" /></IconButton>
                      {!ticket.assignedToId && (
                        <IconButton size="small" onClick={() => assignMut.mutate(ticket.id)} color="primary"><Assignment fontSize="small" /></IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination component="div" count={ticketsData?.total || 0} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }} rowsPerPageOptions={[10, 25, 50]} />
        </>
      )}

      {/* Ticket Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        {selectedTicket && (
          <>
            <DialogTitle>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">{selectedTicket.title}</Typography>
                <Stack direction="row" spacing={1}>
                  <Chip label={t(`tickets.${selectedTicket.priority}`)} size="small" color={priorityColors[selectedTicket.priority] || 'default'} />
                  <Chip label={t(`tickets.${selectedTicket.status}`)} size="small" color={statusColors[selectedTicket.status] || 'default'} />
                </Stack>
              </Stack>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" mb={2}>{selectedTicket.description}</Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack direction="row" spacing={1} mb={2}>
                <Button size="small" variant="outlined" onClick={() => updateStatusMut.mutate({ id: selectedTicket.id, status: 'in_progress' })}>{t('tickets.inProgress')}</Button>
                <Button size="small" variant="outlined" color="success" onClick={() => updateStatusMut.mutate({ id: selectedTicket.id, status: 'resolved' })}>{t('tickets.resolved')}</Button>
                <Button size="small" variant="outlined" color="error" onClick={() => updateStatusMut.mutate({ id: selectedTicket.id, status: 'closed' })}>{t('tickets.closed')}</Button>
              </Stack>
              <Typography variant="subtitle2" fontWeight={600} mb={1}>{t('tickets.messages')}</Typography>
              <Stack spacing={1.5} maxHeight={300} sx={{ overflowY: 'auto' }}>
                {messages.map((msg) => (
                  <Paper key={msg.id} sx={{ p: 1.5, borderRadius: 2, bgcolor: msg.userId === user?.id ? alpha(theme.palette.primary.main, 0.06) : alpha(theme.palette.grey[500], 0.06) }}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                      <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>{msg.userName?.charAt(0) || '?'}</Avatar>
                      <Typography variant="caption" fontWeight={600}>{msg.userName}</Typography>
                      <Typography variant="caption" color="text.secondary">{msg.createdAt ? format(new Date(msg.createdAt), 'dd/MM HH:mm') : ''}</Typography>
                    </Stack>
                    <Typography variant="body2">{msg.message}</Typography>
                  </Paper>
                ))}
              </Stack>
              <Stack direction="row" spacing={1} mt={2}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder={t('tickets.typingSomething')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleReply({ message: (e.target as HTMLInputElement).value });
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
                <Button variant="contained" size="small" startIcon={<Reply />}>{t('tickets.sendReply')}</Button>
              </Stack>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}