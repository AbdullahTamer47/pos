import { useState, useCallback, useMemo } from 'react';
import {
  Box, TextField, InputAdornment, Button, Chip, Typography, IconButton, Tooltip,
  Stack, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, TableSortLabel, Paper, Alert, MenuItem, Avatar, alpha, useTheme,
  Collapse, Accordion, AccordionSummary, AccordionDetails, Dialog, DialogTitle,
  DialogContent, DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon, Close as CloseIcon, Refresh as RefreshIcon,
  FilterList as FilterListIcon, Inventory2 as InventoryIcon, ExpandMore as ExpandMoreIcon,
  Add as AddIcon, SwapHoriz as TransferIcon, Warning as WarningIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { visuallyHidden } from '@mui/utils';
import api, {
  type StockResponse, type StockAlert, type PaginatedResponse, type WarehouseResponse,
} from '@/api/endpoints';

type SortField = 'productName' | 'sku' | 'currentStock' | 'warehouseName' | 'lastUpdated';
type SortOrder = 'asc' | 'desc';

const adjustSchema = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  quantity: z.coerce.number().min(1, 'Min 1'),
  type: z.enum(['in', 'out']),
  reason: z.string().optional().default(''),
});

const transferSchema = z.object({
  productId: z.string().min(1),
  fromWarehouseId: z.string().min(1),
  toWarehouseId: z.string().min(1),
  quantity: z.coerce.number().min(1, 'Min 1'),
  reason: z.string().optional().default(''),
});

type AdjustFormValues = z.infer<typeof adjustSchema>;
type TransferFormValues = z.infer<typeof transferSchema>;

function debounce(fn: (value: string) => void, delay: number): (value: string) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (value: string) => { clearTimeout(timeoutId); timeoutId = setTimeout(() => fn(value), delay); };
}

const STOCK_STATUS = (current: number, min: number, max: number): 'low' | 'ok' | 'overstock' => {
  if (current <= 0) return 'low';
  if (current <= min) return 'low';
  if (current >= max) return 'overstock';
  return 'ok';
};

export default function InventoryPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('productName');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');
  const [alertsExpanded, setAlertsExpanded] = useState(true);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockResponse | null>(null);

  const debouncedSetSearch = useMemo(() => debounce((value: string) => { setDebouncedSearch(value); setPage(0); }, 400), []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value); debouncedSetSearch(e.target.value);
  }, [debouncedSetSearch]);

  const { data, isLoading, isError, error, refetch } = useQuery<PaginatedResponse<StockResponse>>({
    queryKey: ['inventory', { page: page + 1, limit: rowsPerPage, search: debouncedSearch, sortBy, sortOrder, warehouseId: warehouseFilter }],
    queryFn: () => api.inventory.getStock({ page: page + 1, limit: rowsPerPage, search: debouncedSearch || undefined, sortBy, sortOrder, warehouseId: warehouseFilter || undefined }),
  });

  const { data: productsData } = useQuery<PaginatedResponse<any>>({
    queryKey: ['products', 'inventory-fallback', debouncedSearch],
    queryFn: () => api.products.getProducts({ page: 1, limit: 100, search: debouncedSearch || undefined }),
    staleTime: 60 * 1000,
  });

  const { data: warehouses } = useQuery<PaginatedResponse<WarehouseResponse>>({
    queryKey: ['warehouses', 'all'],
    queryFn: () => api.warehouses.getWarehouses({ limit: 100 }),
    staleTime: 10 * 60 * 1000,
  });

  const warehouseList: WarehouseResponse[] = useMemo(() => {
    if (Array.isArray(warehouses)) return warehouses;
    if (Array.isArray(warehouses?.data)) return warehouses.data;
    return [];
  }, [warehouses]);

  const { data: alerts } = useQuery<StockAlert[]>({
    queryKey: ['inventory', 'alerts'],
    queryFn: () => api.inventory.getAlerts(),
  });

  const rawStock = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  const rawProducts = Array.isArray(productsData) ? productsData : Array.isArray(productsData?.data) ? productsData.data : [];

  const stockItems: StockResponse[] = useMemo(() => {
    if (rawStock.length > 0) return rawStock;
    return rawProducts.map((p: any) => ({
      productId: p.id,
      productName: p.nameAr || p.name || p.nameEn || '',
      sku: p.sku || p.barcode || '-',
      warehouseId: warehouseList[0]?.id || 'default',
      warehouseName: warehouseList[0]?.nameAr || warehouseList[0]?.name || 'المستودع الرئيسي',
      currentStock: p.stock ?? 0,
      minStock: p.minStock ?? p.lowStockAlert ?? 5,
      maxStock: p.maxStock ?? 1000,
      availableStock: p.stock ?? 0,
      lastUpdated: p.updatedAt,
    }));
  }, [rawStock, rawProducts, warehouseList]);

  const adjustMutation = useMutation({
    mutationFn: (data: AdjustFormValues) => api.inventory.adjustStock(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inventory'] }); setAdjustDialogOpen(false); },
  });

  const transferMutation = useMutation({
    mutationFn: (data: TransferFormValues) => api.inventory.transferStock(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inventory'] }); setTransferDialogOpen(false); },
  });

  const adjustForm = useForm<AdjustFormValues>({ resolver: zodResolver(adjustSchema), defaultValues: { productId: '', warehouseId: '', quantity: 1, type: 'in', reason: '' } });
  const transferForm = useForm<TransferFormValues>({ resolver: zodResolver(transferSchema), defaultValues: { productId: '', fromWarehouseId: '', toWarehouseId: '', quantity: 1, reason: '' } });

  const handleSort = (field: SortField) => {
    if (sortBy === field) { setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); } else { setSortBy(field); setSortOrder('asc'); }
    setPage(0);
  };

  const handleChangePage = (_: unknown, p: number) => setPage(p);
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };

  const clearFilters = () => { setWarehouseFilter(''); setSearch(''); setDebouncedSearch(''); setPage(0); };
  const hasFilters = warehouseFilter !== '' || debouncedSearch !== '';

  const openAdjustDialog = (stock: StockResponse) => {
    setSelectedStock(stock);
    const targetWarehouse = stock.warehouseId !== 'default' ? stock.warehouseId : (warehouseList[0]?.id || 'default');
    adjustForm.reset({ productId: stock.productId, warehouseId: targetWarehouse, quantity: 1, type: 'in', reason: '' });
    setAdjustDialogOpen(true);
  };

  const openTransferDialog = (stock: StockResponse) => {
    setSelectedStock(stock);
    const fromWh = stock.warehouseId !== 'default' ? stock.warehouseId : (warehouseList[0]?.id || 'default');
    const toWh = warehouseList.find((w) => w.id !== fromWh)?.id || '';
    transferForm.reset({ productId: stock.productId, fromWarehouseId: fromWh, toWarehouseId: toWh, quantity: 1, reason: '' });
    setTransferDialogOpen(true);
  };

  const alertItems = Array.isArray(alerts) ? alerts : [];

  const columns: { id: SortField; label: string }[] = [
    { id: 'productName', label: t('pos.productName') },
    { id: 'sku', label: t('products.sku') },
    { id: 'warehouseName', label: t('inventory.warehouse') },
    { id: 'currentStock', label: t('inventory.currentStock') },
    { id: 'lastUpdated', label: t('common.updated') },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" mb={3} gap={2}>
        <Typography variant="h4" fontWeight={700}>{t('nav.inventory')}</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<TransferIcon />} onClick={() => navigate('/inventory/movements')}>{t('inventory.movementHistory')}</Button>
        </Stack>
      </Stack>

      {alertItems.length > 0 && (
        <Accordion expanded={alertsExpanded} onChange={() => setAlertsExpanded(!alertsExpanded)} sx={{ mb: 2, borderRadius: 2, '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={1} alignItems="center">
              <WarningIcon color="warning" />
              <Typography fontWeight={600}>{t('inventory.stockAlerts')}</Typography>
              <Chip size="small" label={alertItems.length} color="warning" />
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1}>
              {alertItems.map((alert) => (
                <Paper key={`${alert.productId}-${alert.warehouseId}`} variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderColor: alert.severity === 'critical' ? 'error.main' : alert.severity === 'high' ? 'warning.main' : 'info.main' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{alert.productName}</Typography>
                      <Typography variant="caption" color="text.secondary">{alert.warehouseName} | كود الصنف: {alert.sku}</Typography>
                    </Box>
                    <Chip size="small" label={`${alert.currentStock} / ${alert.minStock}`} color={alert.alertType === 'low' ? 'error' : alert.alertType === 'over' ? 'warning' : 'info'} variant="outlined" />
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2} alignItems="flex-start">
        <TextField
          size="small" placeholder={t('pos.searchProducts')} value={search} onChange={handleSearchChange}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>,
            endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => { setSearch(''); setDebouncedSearch(''); }}><CloseIcon fontSize="small" /></IconButton></InputAdornment> : null,
          }}
          sx={{ minWidth: 280 }}
        />
        <TextField select size="small" label={t('inventory.warehouse')} value={warehouseFilter} onChange={(e) => { setWarehouseFilter(e.target.value); setPage(0); }} sx={{ minWidth: 180 }}>
          <MenuItem value="">{t('common.all')}</MenuItem>
          {warehouseList.map((w) => <MenuItem key={w.id} value={w.id}>{w.nameAr || w.nameEn || w.name}</MenuItem>)}
        </TextField>
        {hasFilters && <Chip label={t('common.clearFilters')} onDelete={clearFilters} variant="outlined" color="error" deleteIcon={<CloseIcon />} />}
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
                <TableCell>{t('inventory.stockLevel')}</TableCell>
                <TableCell align="right">{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((col) => <TableCell key={col.id}><Skeleton variant="text" width={col.id === 'productName' ? 140 : 80} /></TableCell>)}
                    <TableCell><Skeleton variant="rounded" width={80} height={24} /></TableCell>
                    <TableCell align="right"><Skeleton variant="rounded" width={100} height={32} /></TableCell>
                  </TableRow>
                ))
              ) : stockItems.length > 0 ? (
                stockItems.map((stock) => {
                  const status = STOCK_STATUS(stock.currentStock, stock.minStock, stock.maxStock);
                  return (
                    <TableRow key={`${stock.productId}-${stock.warehouseId}`} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{stock.productName}</Typography>
                        <Typography variant="caption" color="text.secondary" fontFamily="monospace">{stock.sku}</Typography>
                      </TableCell>
                      <TableCell><Typography variant="body2" fontFamily="monospace">{stock.sku}</Typography></TableCell>
                      <TableCell><Typography variant="body2">{stock.warehouseName}</Typography></TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{stock.currentStock}</Typography>
                        <Typography variant="caption" color="text.secondary">{t('inventory.minStock')}: {stock.minStock} | {t('inventory.maxStock')}: {stock.maxStock}</Typography>
                      </TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{stock.lastUpdated ? new Date(stock.lastUpdated).toLocaleDateString() : '-'}</Typography></TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={status === 'low' ? t('inventory.lowStock') : status === 'overstock' ? t('inventory.overStock') : 'OK'}
                          color={status === 'low' ? 'error' : status === 'overstock' ? 'warning' : 'success'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title={t('inventory.adjustStock')}>
                            <IconButton size="small" onClick={() => openAdjustDialog(stock)}><AddIcon fontSize="small" /></IconButton>
                          </Tooltip>
                          <Tooltip title={t('inventory.transferStock')}>
                            <IconButton size="small" onClick={() => openTransferDialog(stock)}><TransferIcon fontSize="small" /></IconButton>
                          </Tooltip>
                          <Tooltip title={t('inventory.movementHistory')}>
                            <IconButton size="small" onClick={() => navigate('/inventory/movements')}><InventoryIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                    <Stack alignItems="center" spacing={2}>
                      <InventoryIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
                      <Typography variant="h6" color="text.secondary">{t('inventory.stockLevel')}</Typography>
                      <Typography variant="body2" color="text.disabled">{debouncedSearch ? t('common.noResults') : t('common.noData')}</Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {(data?.total ?? stockItems.length) > 0 && (
          <TablePagination component="div" count={data?.total ?? stockItems.length} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} rowsPerPageOptions={[10, 25, 50, 100]} labelRowsPerPage={t('common.itemsPerPage') + ':'} labelDisplayedRows={({ from, to, count }) => `${from}-${to} ${t('common.of')} ${count}`} />
        )}
      </Paper>

      <Dialog open={adjustDialogOpen} onClose={() => setAdjustDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('inventory.adjustStock')}</DialogTitle>
        <form onSubmit={adjustForm.handleSubmit((d) => adjustMutation.mutate(d))}>
          <DialogContent>
            <Stack spacing={2}>
              <TextField label={t('pos.productName')} fullWidth value={selectedStock?.productName || ''} disabled />
              <TextField label={t('inventory.warehouse')} fullWidth value={selectedStock?.warehouseName || ''} disabled />
              <TextField label={t('inventory.currentStock')} fullWidth value={selectedStock?.currentStock || 0} disabled />
              <TextField label={t('inventory.adjustQuantity', 'كمية التعديل')} fullWidth type="number" required {...adjustForm.register('quantity', { valueAsNumber: true })} error={!!adjustForm.formState.errors.quantity} helperText={adjustForm.formState.errors.quantity?.message} />
              <TextField select label={t('inventory.movementType')} fullWidth {...adjustForm.register('type')}>
                <MenuItem value="in">{t('inventory.stockIn')}</MenuItem>
                <MenuItem value="out">{t('inventory.stockOut')}</MenuItem>
              </TextField>
              <TextField label={t('inventory.adjustmentReason')} fullWidth multiline rows={2} {...adjustForm.register('reason')} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAdjustDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={adjustMutation.isPending}>{t('common.save')}</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={transferDialogOpen} onClose={() => setTransferDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('inventory.transferStock')}</DialogTitle>
        <form onSubmit={transferForm.handleSubmit((d) => transferMutation.mutate(d))}>
          <DialogContent>
            <Stack spacing={2}>
              <TextField label={t('pos.productName')} fullWidth value={selectedStock?.productName || ''} disabled />
              <TextField label={t('inventory.transferFrom')} fullWidth value={selectedStock?.warehouseName || ''} disabled />
              <TextField label={t('inventory.transferTo')} fullWidth select {...transferForm.register('toWarehouseId')} error={!!transferForm.formState.errors.toWarehouseId} helperText={transferForm.formState.errors.toWarehouseId?.message}>
                {warehouseList.filter((w) => w.id !== transferForm.watch('fromWarehouseId')).map((w) => <MenuItem key={w.id} value={w.id}>{w.nameAr || w.nameEn || w.name}</MenuItem>)}
              </TextField>
              <TextField label={t('inventory.transferQuantity')} fullWidth type="number" required {...transferForm.register('quantity', { valueAsNumber: true })} error={!!transferForm.formState.errors.quantity} helperText={transferForm.formState.errors.quantity?.message} />
              <TextField label={t('inventory.adjustmentReason')} fullWidth multiline rows={2} {...transferForm.register('reason')} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTransferDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={transferMutation.isPending}>{t('inventory.transferStock')}</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}