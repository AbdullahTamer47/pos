import { useState, useCallback, useMemo } from 'react';
import {
  Box, TextField, InputAdornment, Button, Chip, Typography, IconButton, Tooltip,
  Stack, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, TableSortLabel, Paper, Alert, MenuItem, alpha, useTheme, useMediaQuery,
} from '@mui/material';
import {
  Search as SearchIcon, Close as CloseIcon, Refresh as RefreshIcon,
  FilterList as FilterListIcon, Download as DownloadIcon, Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { visuallyHidden } from '@mui/utils';
import api, { type InvoiceResponse, type PaginatedResponse } from '@/api/endpoints';
import { formatCurrency } from '@smartpos/utils';

type SortField = 'invoiceNumber' | 'invoiceDate' | 'total' | 'status' | 'createdAt';
type SortOrder = 'asc' | 'desc';

const INVOICE_TYPES = ['SALE', 'RETURN'] as const;
const STATUSES = ['draft', 'pending', 'paid', 'partiallyPaid', 'overdue', 'cancelled', 'refunded'] as const;
const PAYMENT_STATUSES = ['paid', 'partiallyPaid', 'unpaid'] as const;

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'default', pending: 'info', paid: 'success', partiallyPaid: 'warning', overdue: 'error', cancelled: 'error', refunded: 'info',
};

function debounce(fn: (value: string) => void, delay: number): (value: string) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (value: string) => { clearTimeout(timeoutId); timeoutId = setTimeout(() => fn(value), delay); };
}

export default function InvoicesPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const debouncedSetSearch = useMemo(() => debounce((value: string) => { setDebouncedSearch(value); setPage(0); }, 400), []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value); debouncedSetSearch(e.target.value);
  }, [debouncedSetSearch]);

  const { data, isLoading, isError, error, refetch } = useQuery<PaginatedResponse<InvoiceResponse>>({
    queryKey: ['invoices', { page: page + 1, limit: rowsPerPage, search: debouncedSearch, sortBy, sortOrder, typeFilter, statusFilter }],
    queryFn: () => api.invoices.getInvoices({ page: page + 1, limit: rowsPerPage, search: debouncedSearch || undefined, sortBy, sortOrder }),
  });

  const handleSort = (field: SortField) => {
    if (sortBy === field) { setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); } else { setSortBy(field); setSortOrder('asc'); }
    setPage(0);
  };

  const handleChangePage = (_: unknown, p: number) => setPage(p);
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };

  const clearFilters = () => { setTypeFilter(null); setStatusFilter(null); setPaymentFilter(null); setDateFrom(''); setDateTo(''); setSearch(''); setDebouncedSearch(''); setPage(0); };
  const hasFilters = typeFilter !== null || statusFilter !== null || paymentFilter !== null || dateFrom !== '' || dateTo !== '' || debouncedSearch !== '';

  const invoiceList: InvoiceResponse[] = Array.isArray(data)
    ? (data as any)
    : Array.isArray(data?.data)
    ? data.data
    : [];

  const exportToCSV = () => {
    if (invoiceList.length === 0) return;
    const headers = [t('invoices.invoiceNumber'), t('pos.customer'), t('common.type'), t('invoices.subtotal'), t('invoices.tax'), t('invoices.total'), t('invoices.paid'), t('invoices.balance'), t('invoices.status'), t('common.date')];
    const rows = invoiceList.map((inv) => [inv.invoiceNumber, inv.customerName || '', inv.type, inv.subtotal.toString(), inv.tax.toString(), inv.total.toString(), inv.paid.toString(), inv.balance.toString(), inv.status, new Date(inv.invoiceDate).toLocaleDateString()]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `invoices_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const columns: { id: SortField; label: string }[] = [
    { id: 'invoiceNumber', label: t('invoices.invoiceNumber') },
    { id: 'invoiceDate', label: t('common.date') },
    { id: 'total', label: t('invoices.total') },
    { id: 'status', label: t('invoices.status') },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" mb={3} gap={2}>
        <Typography variant="h4" fontWeight={700}>{t('nav.invoices')}</Typography>
        <Button variant="outlined" fullWidth={isMobile} startIcon={<DownloadIcon />} onClick={exportToCSV}>{t('common.export')}</Button>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2} alignItems="flex-start">
        <TextField
          size="small" placeholder={t('invoices.searchInvoices')} value={search} onChange={handleSearchChange}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>,
            endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => { setSearch(''); setDebouncedSearch(''); }}><CloseIcon fontSize="small" /></IconButton></InputAdornment> : null,
          }}
          sx={{ width: { xs: '100%', sm: 280 } }}
        />
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <TextField select size="small" label={t('common.type')} value={typeFilter || ''} onChange={(e) => { setTypeFilter(e.target.value || null); setPage(0); }} sx={{ minWidth: 120 }}>
            <MenuItem value="">{t('common.all')}</MenuItem>
            {INVOICE_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
          <TextField select size="small" label={t('invoices.status')} value={statusFilter || ''} onChange={(e) => { setStatusFilter(e.target.value || null); setPage(0); }} sx={{ minWidth: 140 }}>
            <MenuItem value="">{t('common.all')}</MenuItem>
            {STATUSES.map((s) => <MenuItem key={s} value={s}>{t(`invoices.${s}`)}</MenuItem>)}
          </TextField>
          <TextField select size="small" label={t('invoices.paymentStatus') || t('payments.paymentStatus') || 'حالة الدفع'} value={paymentFilter || ''} onChange={(e) => { setPaymentFilter(e.target.value || null); setPage(0); }} sx={{ minWidth: 140 }}>
            <MenuItem value="">{t('common.all')}</MenuItem>
            {PAYMENT_STATUSES.map((s) => <MenuItem key={s} value={s}>{t(`invoices.${s}`)}</MenuItem>)}
          </TextField>
          <TextField size="small" type="date" label={t('common.from')} value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }} />
          <TextField size="small" type="date" label={t('common.to')} value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }} />
          {hasFilters && <Chip label={t('common.clearFilters')} onDelete={clearFilters} variant="outlined" color="error" deleteIcon={<CloseIcon />} />}
        </Stack>
      </Stack>

      {isError && (
        <Alert severity="error" action={<Button size="small" color="inherit" onClick={() => refetch()} startIcon={<RefreshIcon />}>{t('common.tryAgain')}</Button>} sx={{ mb: 2 }}>
          {(error as Error)?.message || t('common.somethingWentWrong')}
        </Alert>
      )}

      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                {columns.map((col) => (
                  <TableCell key={col.id} sortDirection={sortBy === col.id ? sortOrder : false}>
                    <TableSortLabel active={sortBy === col.id} direction={sortBy === col.id ? sortOrder : 'asc'} onClick={() => handleSort(col.id)}>
                      {col.label}
                      {sortBy === col.id ? <Box component="span" sx={visuallyHidden}>{sortOrder === 'desc' ? 'sorted descending' : 'sorted ascending'}</Box> : null}
                    </TableSortLabel>
                  </TableCell>
                ))}
                <TableCell>{t('pos.customer')}</TableCell>
                <TableCell align="right">{t('invoices.paid')}</TableCell>
                <TableCell align="right">{t('invoices.balance')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((col) => <TableCell key={col.id}><Skeleton variant="text" width={col.id === 'invoiceNumber' ? 120 : 80} /></TableCell>)}
                    <TableCell><Skeleton variant="text" width={120} /></TableCell>
                    <TableCell align="right"><Skeleton variant="text" width={80} /></TableCell>
                    <TableCell align="right"><Skeleton variant="text" width={80} /></TableCell>
                  </TableRow>
                ))
              ) : data?.data && data.data.length > 0 ? (
                data.data.map((inv) => {
                  const invDate = inv.invoiceDate || inv.createdAt;
                  const formattedDate = invDate ? new Date(invDate).toLocaleDateString() : '-';
                  const totalVal = Number(inv.total) || Number((inv as any).totalAmount) || 0;
                  const subtotalVal = Number(inv.subtotal) || totalVal;
                  const paidVal = Number(inv.paid) || totalVal;
                  const balanceVal = Number(inv.balance) || 0;
                  const statusKey = ((inv.status || (inv as any).paymentStatus || 'paid') as string).toLowerCase();
                  const statusLabel = t(`invoices.${statusKey}`) || (statusKey === 'paid' ? 'مدفوعة' : statusKey);
                  const statusColor = (STATUS_COLORS as any)[statusKey] || (statusKey === 'paid' ? 'success' : 'default');

                  return (
                    <TableRow key={inv.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/invoices/${inv.id}`)}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} fontFamily="monospace">{inv.invoiceNumber}</Typography>
                        <Typography variant="caption" color="text.secondary">{formattedDate}</Typography>
                      </TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{formattedDate}</Typography></TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{formatCurrency(totalVal)}</Typography>
                        <Typography variant="caption" color="text.secondary">{t('invoices.subtotal')}: {formatCurrency(subtotalVal)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Chip size="small" label={statusLabel} color={statusColor} variant="outlined" />
                          {inv.type === 'RETURN' && <Chip size="small" label={t('invoices.returnInvoice')} color="warning" variant="outlined" />}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{inv.customerName || 'زبون نقدي'}</Typography>
                        {inv.customerName && <Typography variant="caption" color="text.secondary">{inv.branchName || ''}</Typography>}
                      </TableCell>
                      <TableCell align="right"><Typography variant="body2" fontWeight={600} color="success.main">{formatCurrency(paidVal)}</Typography></TableCell>
                      <TableCell align="right"><Typography variant="body2" fontWeight={600} color={balanceVal > 0 ? 'error.main' : 'text.secondary'}>{formatCurrency(balanceVal)}</Typography></TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <Stack alignItems="center" spacing={2}>
                      <ReceiptIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
                      <Typography variant="h6" color="text.secondary">{t('invoices.invoiceNumber')}</Typography>
                      <Typography variant="body2" color="text.disabled">{debouncedSearch ? t('common.noResults') : t('common.noData')}</Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {data && data.total > 0 && (
          <TablePagination component="div" count={data.total} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} rowsPerPageOptions={[10, 25, 50, 100]} labelRowsPerPage={t('common.itemsPerPage') + ':'} labelDisplayedRows={({ from, to, count }) => `${from}-${to} ${t('common.of')} ${count}`} />
        )}
      </Paper>
    </Box>
  );
}