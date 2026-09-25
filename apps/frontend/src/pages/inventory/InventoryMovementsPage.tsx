import { useState, useCallback, useMemo } from 'react';
import {
  Box, TextField, InputAdornment, Button, Chip, Typography, IconButton,
  Stack, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, TableSortLabel, Paper, Alert, MenuItem, alpha, useTheme,
} from '@mui/material';
import {
  Search as SearchIcon, Close as CloseIcon, Refresh as RefreshIcon,
  FilterList as FilterListIcon, Download as DownloadIcon, ArrowBack as ArrowBackIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { visuallyHidden } from '@mui/utils';
import api, { type StockMovement, type PaginatedResponse, type WarehouseResponse } from '@/api/endpoints';

type SortField = 'createdAt' | 'productName' | 'type' | 'quantity' | 'warehouseName';
type SortOrder = 'asc' | 'desc';

const MOVEMENT_TYPES = ['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT', 'RETURN', 'PURCHASE', 'SALE'] as const;

const TYPE_COLORS: Record<string, 'success' | 'error' | 'info' | 'warning' | 'primary' | 'default'> = {
  IN: 'success', OUT: 'error', TRANSFER: 'info', ADJUSTMENT: 'warning', RETURN: 'warning', PURCHASE: 'primary', SALE: 'default',
};

function debounce(fn: (value: string) => void, delay: number): (value: string) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (value: string) => { clearTimeout(timeoutId); timeoutId = setTimeout(() => fn(value), delay); };
}

export default function InventoryMovementsPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const debouncedSetSearch = useMemo(() => debounce((value: string) => { setDebouncedSearch(value); setPage(0); }, 400), []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value); debouncedSetSearch(e.target.value);
  }, [debouncedSetSearch]);

  const { data, isLoading, isError, error, refetch } = useQuery<PaginatedResponse<StockMovement>>({
    queryKey: ['inventory-movements', { page: page + 1, limit: rowsPerPage, search: debouncedSearch, sortBy, sortOrder, typeFilter, warehouseFilter }],
    queryFn: () => api.inventory.getMovements({ page: page + 1, limit: rowsPerPage, search: debouncedSearch || undefined, sortBy, sortOrder }),
  });

  const { data: warehouses } = useQuery<PaginatedResponse<WarehouseResponse>>({
    queryKey: ['warehouses', 'all'],
    queryFn: () => api.warehouses.getWarehouses({ limit: 100 }),
    staleTime: 10 * 60 * 1000,
  });

  const handleSort = (field: SortField) => {
    if (sortBy === field) { setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); } else { setSortBy(field); setSortOrder('asc'); }
    setPage(0);
  };

  const handleChangePage = (_: unknown, p: number) => setPage(p);
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };

  const clearFilters = () => { setTypeFilter(''); setWarehouseFilter(''); setDateFrom(''); setDateTo(''); setSearch(''); setDebouncedSearch(''); setPage(0); };
  const hasFilters = typeFilter !== '' || warehouseFilter !== '' || dateFrom !== '' || dateTo !== '' || debouncedSearch !== '';

  const exportToCSV = () => {
    if (!data?.data || data.data.length === 0) return;
    const headers = [t('common.date'), t('common.type'), t('pos.productName'), t('inventory.warehouse'), t('pos.quantity'), t('inventory.movementHistory'), t('common.reference'), t('common.createdBy')];
    const rows = data.data.map((m) => [new Date(m.createdAt).toLocaleDateString(), m.type, m.productName, m.warehouseName, m.quantity.toString(), `${m.beforeQuantity} -> ${m.afterQuantity}`, m.reference || '', m.userName || '']);
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `movements_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const columns: { id: SortField; label: string }[] = [
    { id: 'createdAt', label: t('common.date') },
    { id: 'type', label: t('common.type') },
    { id: 'productName', label: t('pos.productName') },
    { id: 'warehouseName', label: t('inventory.warehouse') },
    { id: 'quantity', label: t('pos.quantity') },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={3}>
        <IconButton onClick={() => navigate('/inventory')}><ArrowBackIcon /></IconButton>
        <Typography variant="h4" fontWeight={700}>{t('inventory.movementHistory')}</Typography>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2} alignItems="flex-start">
        <TextField
          size="small" placeholder={t('pos.searchProducts')} value={search} onChange={handleSearchChange}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>,
            endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => { setSearch(''); setDebouncedSearch(''); }}><CloseIcon fontSize="small" /></IconButton></InputAdornment> : null,
          }}
          sx={{ minWidth: 280 }}
        />
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <TextField select size="small" label={t('inventory.movementType')} value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }} sx={{ minWidth: 140 }}>
            <MenuItem value="">{t('common.all')}</MenuItem>
            {MOVEMENT_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
          <TextField select size="small" label={t('inventory.warehouse')} value={warehouseFilter} onChange={(e) => { setWarehouseFilter(e.target.value); setPage(0); }} sx={{ minWidth: 180 }}>
            <MenuItem value="">{t('common.all')}</MenuItem>
            {warehouses?.data?.map((w) => <MenuItem key={w.id} value={w.id}>{w.nameAr || w.nameEn || w.name}</MenuItem>)}
          </TextField>
          <TextField size="small" type="date" label={t('common.from')} value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }} />
          <TextField size="small" type="date" label={t('common.to')} value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0); }} InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }} />
          {hasFilters && <Chip label={t('common.clearFilters')} onDelete={clearFilters} variant="outlined" color="error" deleteIcon={<CloseIcon />} />}
        </Stack>
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportToCSV} sx={{ ml: { sm: 'auto' } }}>{t('common.export')}</Button>
      </Stack>

      {isError && (
        <Alert severity="error" action={<Button size="small" color="inherit" onClick={() => refetch()} startIcon={<RefreshIcon />}>{t('common.tryAgain')}</Button>} sx={{ mb: 2 }}>
          {(error as Error)?.message || t('common.somethingWentWrong')}
        </Alert>
      )}

      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
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
                <TableCell align="right">{t('inventory.movementHistory')}</TableCell>
                <TableCell>{t('common.reference')}</TableCell>
                <TableCell>{t('common.createdBy')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((col) => <TableCell key={col.id}><Skeleton variant="text" width={col.id === 'productName' ? 140 : 80} /></TableCell>)}
                    <TableCell align="right"><Skeleton variant="text" width={80} /></TableCell>
                    <TableCell><Skeleton variant="text" width={80} /></TableCell>
                    <TableCell><Skeleton variant="text" width={80} /></TableCell>
                  </TableRow>
                ))
              ) : data?.data && data.data.length > 0 ? (
                data.data.map((movement) => (
                  <TableRow key={movement.id} hover>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{new Date(movement.createdAt).toLocaleDateString()}</Typography>
                      <Typography variant="caption" color="text.disabled">{new Date(movement.createdAt).toLocaleTimeString()}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={movement.type} color={TYPE_COLORS[movement.type] || 'default'} variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{movement.productName}</Typography>
                    </TableCell>
                    <TableCell><Typography variant="body2">{movement.warehouseName}</Typography></TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color={movement.quantity > 0 ? 'success.main' : 'error.main'}>
                        {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontFamily="monospace">
                        {movement.beforeQuantity} <Typography component="span" variant="caption" color="text.secondary">&rarr;</Typography> {movement.afterQuantity}
                      </Typography>
                    </TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{movement.reference || '-'}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{movement.userName || '-'}</Typography></TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                    <Stack alignItems="center" spacing={2}>
                      <TimelineIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
                      <Typography variant="h6" color="text.secondary">{t('inventory.movementHistory')}</Typography>
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