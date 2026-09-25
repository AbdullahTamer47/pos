import { useState, useCallback, useMemo } from 'react';
import {
  Box, TextField, InputAdornment, Button, Chip, Typography, IconButton, Tooltip,
  Stack, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, TableSortLabel, Paper, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, Alert, Avatar, alpha, useTheme,
  Accordion, AccordionSummary, AccordionDetails, useMediaQuery,
} from '@mui/material';
import {
  Search as SearchIcon, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Close as CloseIcon, Refresh as RefreshIcon, Business as BusinessIcon,
  Phone as PhoneIcon, Email as EmailIcon, ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { visuallyHidden } from '@mui/utils';
import api, {
  type SupplierResponse, type PaginatedResponse, type CreateSupplierRequest,
} from '@/api/endpoints';
import { formatCurrency } from '@smartpos/utils';

type SortField = 'name' | 'phone' | 'contactPerson' | 'balance' | 'createdAt';
type SortOrder = 'asc' | 'desc';

const supplierSchema = z.object({
  name: z.string().min(1, 'اسم المورد مطلوب'),
  phone: z.string().optional().default(''),
  email: z.string().optional().default(''),
  contactPerson: z.string().optional().default(''),
  taxNumber: z.string().optional().default(''),
  paymentTerms: z.string().optional().default(''),
  creditLimit: z.coerce.number().min(0).default(0),
  notes: z.string().optional().default(''),
  address: z.string().optional().default(''),
  city: z.string().optional().default(''),
  country: z.string().optional().default(''),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

function debounce(fn: (value: string) => void, delay: number): (value: string) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (value: string) => { clearTimeout(timeoutId); timeoutId = setTimeout(() => fn(value), delay); };
}

export default function SuppliersPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [statusFilter, setStatusFilter] = useState<boolean | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SupplierResponse | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierResponse | null>(null);

  const debouncedSetSearch = useMemo(() => debounce((value: string) => { setDebouncedSearch(value); setPage(0); }, 400), []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value); debouncedSetSearch(e.target.value);
  }, [debouncedSetSearch]);

  const { data, isLoading, isError, error, refetch } = useQuery<PaginatedResponse<SupplierResponse>>({
    queryKey: ['suppliers', { page: page + 1, limit: rowsPerPage, search: debouncedSearch, sortBy, sortOrder }],
    queryFn: () => api.suppliers.getSuppliers({ page: page + 1, limit: rowsPerPage, search: debouncedSearch || undefined, sortBy, sortOrder }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.suppliers.deleteSupplier(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['suppliers'] }); setDeleteTarget(null); },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateSupplierRequest) => api.suppliers.createSupplier(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['suppliers'] }); handleCloseDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateSupplierRequest }) => api.suppliers.updateSupplier(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['suppliers'] }); handleCloseDialog(); },
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { name: '', phone: '', email: '', contactPerson: '', taxNumber: '', paymentTerms: '', creditLimit: 0, notes: '', address: '', city: '', country: '' },
  });

  const handleSort = (field: SortField) => {
    if (sortBy === field) { setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); } else { setSortBy(field); setSortOrder('asc'); }
    setPage(0);
  };

  const handleChangePage = (_: unknown, p: number) => setPage(p);
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };

  const handleOpenAdd = () => { reset({ name: '', phone: '', email: '', contactPerson: '', taxNumber: '', paymentTerms: '', creditLimit: 0, notes: '', address: '', city: '', country: '' }); setEditingSupplier(null); setDialogOpen(true); };
  const handleOpenEdit = (s: SupplierResponse) => {
    reset({ name: s.name, phone: s.phone || '', email: s.email || '', contactPerson: s.contactPerson || '', taxNumber: s.taxNumber || '', paymentTerms: s.paymentTerms || '', creditLimit: s.creditLimit, notes: s.notes || '', address: s.address || '', city: s.city || '', country: s.country || '' });
    setEditingSupplier(s); setDialogOpen(true);
  };
  const handleCloseDialog = () => { setDialogOpen(false); setEditingSupplier(null); };

  const onSubmit = (formData: SupplierFormValues) => {
    const payload: CreateSupplierRequest = {
      name: formData.name, phone: formData.phone || undefined, email: formData.email || undefined,
      contactPerson: formData.contactPerson || undefined, taxNumber: formData.taxNumber || undefined,
      paymentTerms: formData.paymentTerms || undefined, creditLimit: formData.creditLimit,
      notes: formData.notes || undefined, address: formData.address || undefined,
      city: formData.city || undefined, country: formData.country || undefined,
    };
    if (editingSupplier) { updateMutation.mutate({ id: editingSupplier.id, data: payload }); } else { createMutation.mutate(payload); }
  };

  const clearFilters = () => { setStatusFilter(null); setSearch(''); setDebouncedSearch(''); setPage(0); };
  const hasFilters = statusFilter !== null || debouncedSearch !== '';
  const mutationError = createMutation.error || updateMutation.error || deleteMutation.error;
  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const columns: { id: SortField; label: string }[] = [
    { id: 'name', label: t('suppliers.supplierName') },
    { id: 'contactPerson', label: t('suppliers.contactPerson') },
    { id: 'phone', label: t('common.phone') },
    { id: 'balance', label: t('suppliers.balance') },
    { id: 'createdAt', label: t('common.created') },
  ];

  const supplierList: SupplierResponse[] = Array.isArray(data)
    ? (data as any)
    : Array.isArray(data?.data)
    ? data.data
    : [];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" mb={3} gap={2}>
        <Typography variant="h4" fontWeight={700}>{t('nav.suppliers')}</Typography>
        <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          <Button variant="outlined" fullWidth={isMobile} onClick={() => navigate('/purchase-orders')}>{t('nav.purchaseOrders')}</Button>
          <Button variant="contained" fullWidth={isMobile} startIcon={<AddIcon />} onClick={handleOpenAdd}>{t('suppliers.addSupplier')}</Button>
        </Stack>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2} alignItems={{ xs: 'stretch', sm: 'flex-start' }}>
        <TextField
          size="small" placeholder={t('common.search')} value={search} onChange={handleSearchChange}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>,
            endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => { setSearch(''); setDebouncedSearch(''); }}><CloseIcon fontSize="small" /></IconButton></InputAdornment> : null,
          }}
          sx={{ width: { xs: '100%', sm: 280 } }}
        />
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label={t('common.active')} onClick={() => setStatusFilter(statusFilter === true ? null : true)} onDelete={statusFilter === true ? () => setStatusFilter(null) : undefined} variant={statusFilter === true ? 'filled' : 'outlined'} color={statusFilter === true ? 'success' : 'default'} />
          <Chip label={t('common.inactive')} onClick={() => setStatusFilter(statusFilter === false ? null : false)} onDelete={statusFilter === false ? () => setStatusFilter(null) : undefined} variant={statusFilter === false ? 'filled' : 'outlined'} color={statusFilter === false ? 'error' : 'default'} />
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
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                {columns.map((col) => (
                  <TableCell key={col.id} sortDirection={sortBy === col.id ? sortOrder : false}>
                    <TableSortLabel active={sortBy === col.id} direction={sortBy === col.id ? sortOrder : 'asc'} onClick={() => handleSort(col.id)}>
                      {col.label}
                      {sortBy === col.id ? <Box component="span" sx={visuallyHidden}>{sortOrder === 'desc' ? 'sorted descending' : 'sorted ascending'}</Box> : null}
                    </TableSortLabel>
                  </TableCell>
                ))}
                <TableCell>{t('common.status')}</TableCell>
                <TableCell align="right">{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell padding="checkbox"><Skeleton variant="circular" width={40} height={40} /></TableCell>
                    {columns.map((col) => <TableCell key={col.id}><Skeleton variant="text" width={col.id === 'name' ? 160 : 80} /></TableCell>)}
                    <TableCell><Skeleton variant="rounded" width={60} height={24} /></TableCell>
                    <TableCell align="right"><Skeleton variant="rounded" width={80} height={32} /></TableCell>
                  </TableRow>
                ))
              ) : supplierList.length > 0 ? (
                supplierList.map((supplier) => (
                  <TableRow key={supplier.id} hover>
                    <TableCell padding="checkbox">
                      <Avatar sx={{ width: 40, height: 40, bgcolor: alpha(theme.palette.primary.main, 0.12) }}>
                        <BusinessIcon color="primary" />
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{supplier.name}</Typography>
                      {supplier.email && <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><EmailIcon sx={{ fontSize: 14 }} />{supplier.email}</Typography>}
                    </TableCell>
                    <TableCell><Typography variant="body2">{supplier.contactPerson || '-'}</Typography></TableCell>
                    <TableCell>
                      {supplier.phone && <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><PhoneIcon sx={{ fontSize: 14 }} />{supplier.phone}</Typography>}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={formatCurrency(supplier.balance)} color={supplier.balance >= 0 ? 'success' : 'error'} variant="outlined" />
                    </TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{supplier.createdAt ? new Date(supplier.createdAt).toLocaleDateString() : '-'}</Typography></TableCell>
                    <TableCell>
                      <Chip size="small" label={supplier.isActive ? t('common.active') : t('common.inactive')} color={supplier.isActive ? 'success' : 'default'} variant="outlined" />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title={t('common.edit')}>
                          <IconButton size="small" onClick={() => handleOpenEdit(supplier)}><EditIcon fontSize="small" /></IconButton>
                        </Tooltip>
                        <Tooltip title={t('common.delete')}>
                          <IconButton size="small" color="error" onClick={() => setDeleteTarget(supplier)}><DeleteIcon fontSize="small" /></IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                    <Stack alignItems="center" spacing={2}>
                      <BusinessIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
                      <Typography variant="h6" color="text.secondary">{t('suppliers.supplierName')}</Typography>
                      <Typography variant="body2" color="text.disabled">{debouncedSearch ? t('common.noResults') : t('common.noData')}</Typography>
                      <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}>{t('suppliers.addSupplier')}</Button>
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

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ fontWeight: 700 }}>{editingSupplier ? t('suppliers.editSupplier') : t('suppliers.addSupplier')}</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField
                label={`${t('suppliers.supplierName')} *`}
                fullWidth
                required
                autoFocus
                {...register('name')}
                error={!!errors.name}
                helperText={errors.name?.message}
                placeholder="اسم المورد أو الشركة"
              />
              <TextField
                label={`${t('common.phone')} (اختياري)`}
                fullWidth
                {...register('phone')}
                error={!!errors.phone}
                helperText={errors.phone?.message}
                placeholder="مثال: 01000165672"
              />

              <Accordion variant="outlined" sx={{ borderRadius: 2, '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2" fontWeight={600} color="primary">
                    ⚙️ بيانات إضافية اختيارية (البريد، العنوان، الضريبة، الرصيد)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    <TextField label={`${t('common.email')} (اختياري)`} fullWidth type="email" {...register('email')} error={!!errors.email} helperText={errors.email?.message} />
                    <TextField label={`${t('suppliers.contactPerson')} (اختياري)`} fullWidth {...register('contactPerson')} />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField label={`${t('suppliers.taxNumber')} (اختياري)`} fullWidth {...register('taxNumber')} />
                      <TextField label={`${t('suppliers.paymentTerms')} (اختياري)`} fullWidth {...register('paymentTerms')} />
                    </Stack>
                    <TextField label={`${t('suppliers.creditLimit')} (اختياري)`} fullWidth type="number" {...register('creditLimit', { valueAsNumber: true })} error={!!errors.creditLimit} helperText={errors.creditLimit?.message} />
                    <TextField label={`${t('common.address')} (اختياري)`} fullWidth {...register('address')} />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField label={`${t('common.city')} (اختياري)`} fullWidth {...register('city')} />
                      <TextField label={`${t('common.country')} (اختياري)`} fullWidth {...register('country')} />
                    </Stack>
                    <TextField label={`${t('common.notes')} (اختياري)`} fullWidth multiline rows={2} {...register('notes')} />
                  </Stack>
                </AccordionDetails>
              </Accordion>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, position: 'sticky', bottom: 0, bgcolor: 'background.paper', zIndex: 10, borderTop: 1, borderColor: 'divider' }}>
            <Button onClick={handleCloseDialog}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={isPending}>{isPending ? t('common.processing') : t('common.save')}</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>{t('common.confirmDelete')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('common.confirmDeleteMessage')}</DialogContentText>
          <Typography variant="body2" fontWeight={600} mt={1}>{deleteTarget?.name}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
          <Button color="error" variant="contained" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? t('common.processing') : t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}