import { useState, useCallback, useMemo } from 'react';
import {
  Box, TextField, InputAdornment, Button, Chip, Typography, IconButton, Tooltip,
  Stack, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, TableSortLabel, Paper, Alert, MenuItem, alpha, useTheme,
  Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, Divider,
} from '@mui/material';
import {
  Search as SearchIcon, Add as AddIcon, Close as CloseIcon, Refresh as RefreshIcon,
  FilterList as FilterListIcon, Receipt as ReceiptIcon, CheckCircle as ApproveIcon,
  Inventory2 as ReceiveIcon, Delete as DeleteIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { visuallyHidden } from '@mui/utils';
import api, {
  type PurchaseOrderResponse, type PaginatedResponse, type SupplierResponse,
  type WarehouseResponse, type ProductResponse, type CreatePORequest,
} from '@/api/endpoints';
import { formatCurrency } from '@smartpos/utils';

type SortField = 'poNumber' | 'supplierName' | 'total' | 'status' | 'createdAt';
type SortOrder = 'asc' | 'desc';

const PO_STATUSES = ['draft', 'ordered', 'partiallyReceived', 'received', 'cancelled'] as const;

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'default', ordered: 'info', partiallyReceived: 'warning', received: 'success', cancelled: 'error',
};

const poItemSchema = z.object({
  productId: z.string().min(1, 'Required'),
  quantity: z.coerce.number().min(1, 'Min 1'),
  unitPrice: z.coerce.number().min(0, 'Min 0'),
});

const poSchema = z.object({
  supplierId: z.string().min(1, 'Required'),
  warehouseId: z.string().optional().default(''),
  expectedDate: z.string().optional().default(''),
  items: z.array(poItemSchema).min(1, 'Add at least one item'),
  discount: z.coerce.number().min(0).default(0),
  shipping: z.coerce.number().min(0).default(0),
  notes: z.string().optional().default(''),
  reference: z.string().optional().default(''),
});

type POFormValues = z.infer<typeof poSchema>;

function debounce(fn: (value: string) => void, delay: number): (value: string) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (value: string) => { clearTimeout(timeoutId); timeoutId = setTimeout(() => fn(value), delay); };
}

export default function PurchaseOrdersPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [supplierFilter, setSupplierFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [poDialogOpen, setPoDialogOpen] = useState(false);

  const debouncedSetSearch = useMemo(() => debounce((value: string) => { setDebouncedSearch(value); setPage(0); }, 400), []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value); debouncedSetSearch(e.target.value);
  }, [debouncedSetSearch]);

  const { data, isLoading, isError, error, refetch } = useQuery<PaginatedResponse<PurchaseOrderResponse>>({
    queryKey: ['purchaseOrders', { page: page + 1, limit: rowsPerPage, search: debouncedSearch, sortBy, sortOrder, statusFilter, supplierFilter }],
    queryFn: () => api.purchaseOrders.getPOs({ page: page + 1, limit: rowsPerPage, search: debouncedSearch || undefined, sortBy, sortOrder }),
  });

  const { data: suppliers } = useQuery<PaginatedResponse<SupplierResponse>>({
    queryKey: ['suppliers', 'all'],
    queryFn: () => api.suppliers.getSuppliers({ limit: 100 }),
    staleTime: 10 * 60 * 1000,
  });

  const { data: warehouses } = useQuery<PaginatedResponse<WarehouseResponse>>({
    queryKey: ['warehouses', 'all'],
    queryFn: () => api.warehouses.getWarehouses({ limit: 100 }),
    staleTime: 10 * 60 * 1000,
  });

  const { data: products } = useQuery<PaginatedResponse<ProductResponse>>({
    queryKey: ['products', 'all'],
    queryFn: () => api.products.getProducts({ limit: 1000 }),
    staleTime: 10 * 60 * 1000,
  });

  const createPOMutation = useMutation({
    mutationFn: (data: CreatePORequest) => api.purchaseOrders.createPO(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] }); setPoDialogOpen(false); poForm.reset(); },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.purchaseOrders.changePOStatus(id, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] }); },
  });

  const deletePOMutation = useMutation({
    mutationFn: (id: string) => api.purchaseOrders.deletePO(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] }); },
  });

  const poForm = useForm<POFormValues>({
    resolver: zodResolver(poSchema),
    defaultValues: { supplierId: '', warehouseId: '', expectedDate: '', items: [{ productId: '', quantity: 0, unitPrice: 0 }], discount: 0, shipping: 0, notes: '', reference: '' },
  });

  const { fields, append, remove } = useFieldArray({ control: poForm.control, name: 'items' });

  const handleSort = (field: SortField) => {
    if (sortBy === field) { setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); } else { setSortBy(field); setSortOrder('asc'); }
    setPage(0);
  };

  const handleChangePage = (_: unknown, p: number) => setPage(p);
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };

  const clearFilters = () => { setStatusFilter(''); setSupplierFilter(''); setDateFrom(''); setDateTo(''); setSearch(''); setDebouncedSearch(''); setPage(0); };
  const hasFilters = statusFilter !== '' || supplierFilter !== '' || dateFrom !== '' || dateTo !== '' || debouncedSearch !== '';

  const handleOpenPO = () => {
    poForm.reset({ supplierId: '', warehouseId: '', expectedDate: '', items: [{ productId: '', quantity: 0, unitPrice: 0 }], discount: 0, shipping: 0, notes: '', reference: '' });
    setPoDialogOpen(true);
  };

  const mutationError = createPOMutation.error || statusMutation.error || deletePOMutation.error;

  const computeTotal = (items: POFormValues['items']) => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const columns: { id: SortField; label: string }[] = [
    { id: 'poNumber', label: t('purchaseOrders.poNumber') },
    { id: 'supplierName', label: t('purchaseOrders.supplier') },
    { id: 'status', label: t('purchaseOrders.status') },
    { id: 'total', label: t('purchaseOrders.total') },
    { id: 'createdAt', label: t('common.date') },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" mb={3} gap={2}>
        <Typography variant="h4" fontWeight={700}>{t('nav.purchaseOrders')}</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => navigate('/suppliers')}>{t('nav.suppliers')}</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenPO}>{t('purchaseOrders.addPO')}</Button>
        </Stack>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2} alignItems="flex-start">
        <TextField
          size="small" placeholder={t('common.search')} value={search} onChange={handleSearchChange}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>,
            endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => { setSearch(''); setDebouncedSearch(''); }}><CloseIcon fontSize="small" /></IconButton></InputAdornment> : null,
          }}
          sx={{ minWidth: 280 }}
        />
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <TextField select size="small" label={t('purchaseOrders.status')} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} sx={{ minWidth: 140 }}>
            <MenuItem value="">{t('common.all')}</MenuItem>
            {PO_STATUSES.map((s) => <MenuItem key={s} value={s}>{t(`purchaseOrders.${s}`)}</MenuItem>)}
          </TextField>
          <TextField select size="small" label={t('purchaseOrders.supplier')} value={supplierFilter} onChange={(e) => { setSupplierFilter(e.target.value); setPage(0); }} sx={{ minWidth: 180 }}>
            <MenuItem value="">{t('common.all')}</MenuItem>
            {suppliers?.data?.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
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
      {mutationError && <Alert severity="error" sx={{ mb: 2 }}>{(mutationError as Error)?.message || t('common.somethingWentWrong')}</Alert>}

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
                <TableCell align="right">{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((col) => <TableCell key={col.id}><Skeleton variant="text" width={col.id === 'poNumber' ? 120 : 80} /></TableCell>)}
                    <TableCell align="right"><Skeleton variant="rounded" width={120} height={32} /></TableCell>
                  </TableRow>
                ))
              ) : data?.data && data.data.length > 0 ? (
                data.data.map((po) => (
                  <TableRow key={po.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} fontFamily="monospace">{po.poNumber}</Typography>
                      <Typography variant="caption" color="text.secondary">{new Date(po.poDate).toLocaleDateString()}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{po.supplierName || '-'}</Typography>
                      {po.expectedDate && <Typography variant="caption" color="text.secondary">{t('purchaseOrders.expectedDate')}: {new Date(po.expectedDate).toLocaleDateString()}</Typography>}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={t(`purchaseOrders.${po.status}`)} color={STATUS_COLORS[po.status] || 'default'} variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{formatCurrency(po.total)}</Typography>
                      <Typography variant="caption" color="text.secondary">{po.items.length} {t('purchaseOrders.items')}</Typography>
                    </TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{new Date(po.createdAt || '').toLocaleDateString()}</Typography></TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        {(po.status === 'draft' || po.status === 'ordered') && (
                          <Tooltip title={t('purchaseOrders.changeStatus')}>
                            <IconButton size="small" color="primary" onClick={() => statusMutation.mutate({ id: po.id, status: 'ordered' })}>
                              <ApproveIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {po.status === 'ordered' && (
                          <Tooltip title={t('purchaseOrders.receiveAll')}>
                            <IconButton size="small" color="success" onClick={() => statusMutation.mutate({ id: po.id, status: 'received' })}>
                              <ReceiveIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {po.status === 'draft' && (
                          <Tooltip title={t('common.delete')}>
                            <IconButton size="small" color="error" onClick={() => deletePOMutation.mutate(po.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                    <Stack alignItems="center" spacing={2}>
                      <ReceiptIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
                      <Typography variant="h6" color="text.secondary">{t('purchaseOrders.poNumber')}</Typography>
                      <Typography variant="body2" color="text.disabled">{debouncedSearch ? t('common.noResults') : t('common.noData')}</Typography>
                      <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenPO}>{t('purchaseOrders.addPO')}</Button>
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

      <Dialog open={poDialogOpen} onClose={() => setPoDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t('purchaseOrders.addPO')}</DialogTitle>
        <form onSubmit={poForm.handleSubmit((d) => {
          const payload: CreatePORequest = {
            supplierId: d.supplierId,
            warehouseId: d.warehouseId || undefined,
            expectedDate: d.expectedDate || undefined,
            items: d.items.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice })),
            discount: d.discount || undefined,
            shipping: d.shipping || undefined,
            notes: d.notes || undefined,
            reference: d.reference || undefined,
          };
          createPOMutation.mutate(payload);
        })}>
          <DialogContent>
            <Stack spacing={2.5}>
              <Stack direction="row" spacing={2}>
                <TextField select label={t('purchaseOrders.supplier')} fullWidth required {...poForm.register('supplierId')} error={!!poForm.formState.errors.supplierId} helperText={poForm.formState.errors.supplierId?.message}>
                  {suppliers?.data?.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                </TextField>
                <TextField select label={t('purchaseOrders.warehouse')} fullWidth {...poForm.register('warehouseId')}>
                  <MenuItem value="">{t('common.none')}</MenuItem>
                  {warehouses?.data?.map((w) => <MenuItem key={w.id} value={w.id}>{w.nameAr || w.nameEn || w.name}</MenuItem>)}
                </TextField>
              </Stack>

              <TextField label={t('purchaseOrders.expectedDate')} fullWidth type="date" InputLabelProps={{ shrink: true }} {...poForm.register('expectedDate')} />

              <Divider />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1" fontWeight={600}>{t('purchaseOrders.items')}</Typography>
                <Button size="small" onClick={() => append({ productId: '', quantity: 0, unitPrice: 0 })} startIcon={<AddIcon />}>{t('common.add')}</Button>
              </Stack>

              {poForm.formState.errors.items?.message && (
                <Typography variant="caption" color="error">{poForm.formState.errors.items.message}</Typography>
              )}

              {fields.map((field, index) => (
                <Stack key={field.id} direction="row" spacing={1} alignItems="flex-start">
                  <TextField
                    select label={t('pos.productName')} fullWidth
                    {...poForm.register(`items.${index}.productId`)}
                    error={!!poForm.formState.errors.items?.[index]?.productId}
                    helperText={poForm.formState.errors.items?.[index]?.productId?.message}
                  >
                    {products?.data?.map((p) => <MenuItem key={p.id} value={p.id}>{p.nameAr || p.nameEn || p.name}</MenuItem>)}
                  </TextField>
                  <TextField
                    label={t('pos.quantity')} type="number" sx={{ width: 100 }}
                    {...poForm.register(`items.${index}.quantity`, { valueAsNumber: true })}
                    error={!!poForm.formState.errors.items?.[index]?.quantity}
                    helperText={poForm.formState.errors.items?.[index]?.quantity?.message}
                  />
                  <TextField
                    label={t('pos.unitPrice')} type="number" sx={{ width: 120 }}
                    {...poForm.register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                    error={!!poForm.formState.errors.items?.[index]?.unitPrice}
                    helperText={poForm.formState.errors.items?.[index]?.unitPrice?.message}
                  />
                  <IconButton color="error" onClick={() => remove(index)} disabled={fields.length === 1} sx={{ mt: 0.5 }}>
                    <CloseIcon />
                  </IconButton>
                </Stack>
              ))}

              <Divider />
              <Stack direction="row" spacing={2}>
                <TextField label={t('purchaseOrders.discount')} fullWidth type="number" {...poForm.register('discount', { valueAsNumber: true })} />
                <TextField label={t('purchaseOrders.shipping')} fullWidth type="number" {...poForm.register('shipping', { valueAsNumber: true })} />
              </Stack>
              <TextField label={t('purchaseOrders.reference')} fullWidth {...poForm.register('reference')} />
              <TextField label={t('common.notes')} fullWidth multiline rows={2} {...poForm.register('notes')} />

              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography fontWeight={600}>{t('purchaseOrders.total')}</Typography>
                  <Typography fontWeight={700}>{formatCurrency(computeTotal(poForm.watch('items')))}</Typography>
                </Stack>
              </Paper>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPoDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={createPOMutation.isPending}>
              {createPOMutation.isPending ? t('common.processing') : t('common.create')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}