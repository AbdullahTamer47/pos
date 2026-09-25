import { useState, useCallback, useMemo } from 'react';
import {
  Box, TextField, InputAdornment, Button, Chip, Typography, IconButton, Tooltip,
  Stack, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, TableSortLabel, Paper, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, Alert, MenuItem, Avatar, alpha, useTheme, useMediaQuery,
  Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import {
  Search as SearchIcon, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Close as CloseIcon, Refresh as RefreshIcon, FilterList as FilterListIcon,
  Person as PersonIcon, Phone as PhoneIcon, Email as EmailIcon, ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { visuallyHidden } from '@mui/utils';
import api, {
  type CustomerResponse, type PaginatedResponse, type CreateCustomerRequest,
} from '@/api/endpoints';
import { formatCurrency } from '@smartpos/utils';

const TIERS = ['REGULAR', 'SILVER', 'GOLD', 'PLATINUM'] as const;

type SortField = 'name' | 'phone' | 'totalSpent' | 'balance' | 'loyaltyPoints' | 'createdAt';
type SortOrder = 'asc' | 'desc';

const customerSchema = z.object({
  name: z.string().min(1, 'اسم العميل مطلوب'),
  phone: z.string().optional().default(''),
  email: z.string().optional().default(''),
  tier: z.enum(TIERS).default('REGULAR'),
  creditLimit: z.coerce.number().min(0).default(0),
  notes: z.string().optional().default(''),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

const TIER_COLORS: Record<string, 'default' | 'primary' | 'warning' | 'secondary'> = {
  REGULAR: 'default',
  SILVER: 'primary',
  GOLD: 'warning',
  PLATINUM: 'secondary',
};

function debounce(fn: (value: string) => void, delay: number): (value: string) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (value: string) => { clearTimeout(timeoutId); timeoutId = setTimeout(() => fn(value), delay); };
}

export default function CustomersPage() {
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
  const [tierFilter, setTierFilter] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerResponse | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerResponse | null>(null);

  const debouncedSetSearch = useMemo(() => debounce((value: string) => {
    setDebouncedSearch(value);
    setPage(0);
  }, 400), []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    debouncedSetSearch(e.target.value);
  }, [debouncedSetSearch]);

  const { data, isLoading, isError, error, refetch } = useQuery<PaginatedResponse<CustomerResponse>>({
    queryKey: ['customers', { page: page + 1, limit: rowsPerPage, search: debouncedSearch, sortBy, sortOrder, tierFilter }],
    queryFn: () => api.customers.getCustomers({
      page: page + 1, limit: rowsPerPage, search: debouncedSearch || undefined, sortBy, sortOrder,
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.customers.deleteCustomer(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); setDeleteTarget(null); },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateCustomerRequest) => api.customers.createCustomer(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); handleCloseDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateCustomerRequest }) => api.customers.updateCustomer(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); handleCloseDialog(); },
  });

  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: '', phone: '', email: '', tier: 'REGULAR', creditLimit: 0, notes: '' },
  });

  const handleSort = (field: SortField) => {
    if (sortBy === field) { setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); } else { setSortBy(field); setSortOrder('asc'); }
    setPage(0);
  };

  const handleChangePage = (_: unknown, p: number) => setPage(p);
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };

  const handleOpenAdd = () => { reset({ name: '', phone: '', email: '', tier: 'REGULAR', creditLimit: 0, notes: '' }); setEditingCustomer(null); setDialogOpen(true); };
  const handleOpenEdit = (c: CustomerResponse) => {
    reset({ name: c.name, phone: c.phone || '', email: c.email || '', tier: (c.tier as typeof TIERS[number]) || 'REGULAR', creditLimit: c.creditLimit, notes: c.notes || '' });
    setEditingCustomer(c); setDialogOpen(true);
  };
  const handleCloseDialog = () => { setDialogOpen(false); setEditingCustomer(null); };

  const onSubmit = (formData: CustomerFormValues) => {
    const payload: CreateCustomerRequest = {
      name: formData.name, phone: formData.phone || undefined, email: formData.email || undefined,
      creditLimit: formData.creditLimit, notes: formData.notes || undefined,
    };
    if (editingCustomer) { updateMutation.mutate({ id: editingCustomer.id, data: payload }); } else { createMutation.mutate(payload); }
  };

  const clearFilters = () => { setTierFilter(null); setSearch(''); setDebouncedSearch(''); setPage(0); };
  const hasFilters = tierFilter !== null || debouncedSearch !== '';
  const mutationError = createMutation.error || updateMutation.error || deleteMutation.error;
  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const columns: { id: SortField; label: string }[] = [
    { id: 'name', label: t('customers.customerName') },
    { id: 'phone', label: t('common.phone') },
    { id: 'totalSpent', label: t('customers.totalSpent') },
    { id: 'balance', label: t('customers.balance') },
    { id: 'loyaltyPoints', label: t('customers.loyaltyPoints') },
    { id: 'createdAt', label: t('common.created') },
  ];

  const customerList: CustomerResponse[] = Array.isArray(data)
    ? (data as any)
    : Array.isArray(data?.data)
    ? data.data
    : [];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" mb={3} gap={2}>
        <Typography variant="h4" fontWeight={700}>{t('nav.customers')}</Typography>
        <Button variant="contained" fullWidth={isMobile} startIcon={<AddIcon />} onClick={handleOpenAdd}>{t('customers.addCustomer')}</Button>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2} alignItems="flex-start">
        <TextField
          size="small" placeholder={t('common.search')} value={search} onChange={handleSearchChange}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>,
            endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => { setSearch(''); setDebouncedSearch(''); }}><CloseIcon fontSize="small" /></IconButton></InputAdornment> : null,
          }}
          sx={{ width: { xs: '100%', sm: 280 } }}
        />
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {TIERS.map((tier) => (
            <Chip
              key={tier} label={tier}
              onClick={() => setTierFilter(tierFilter === tier ? null : tier)}
              onDelete={tierFilter === tier ? () => setTierFilter(null) : undefined}
              variant={tierFilter === tier ? 'filled' : 'outlined'}
              color={tierFilter === tier ? TIER_COLORS[tier] : 'default'}
              icon={<FilterListIcon />}
            />
          ))}
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
                <TableCell sx={{ minWidth: 100 }}>{t('customers.tier')}</TableCell>
                <TableCell align="right">{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell padding="checkbox"><Skeleton variant="circular" width={40} height={40} /></TableCell>
                    {columns.map((col) => <TableCell key={col.id}><Skeleton variant="text" width={col.id === 'name' ? 160 : 80} /></TableCell>)}
                    <TableCell><Skeleton variant="rounded" width={70} height={24} /></TableCell>
                    <TableCell align="right"><Skeleton variant="rounded" width={80} height={32} /></TableCell>
                  </TableRow>
                ))
              ) : customerList.length > 0 ? (
                customerList.map((customer) => (
                  <TableRow key={customer.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/customers/${customer.id}`)}>
                    <TableCell padding="checkbox">
                      <Avatar sx={{ width: 40, height: 40, bgcolor: alpha(theme.palette.primary.main, 0.12) }}>
                        <PersonIcon color="primary" />
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{customer.name}</Typography>
                      {customer.email && <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><EmailIcon sx={{ fontSize: 14 }} />{customer.email}</Typography>}
                    </TableCell>
                    <TableCell>
                      {customer.phone && <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><PhoneIcon sx={{ fontSize: 14 }} />{customer.phone}</Typography>}
                    </TableCell>
                    <TableCell><Typography variant="body2" fontWeight={600}>{formatCurrency(customer.totalSpent)}</Typography></TableCell>
                    <TableCell>
                      <Chip size="small" label={formatCurrency(customer.balance)} color={customer.balance > 0 ? 'success' : customer.balance < 0 ? 'error' : 'default'} variant="outlined" />
                    </TableCell>
                    <TableCell><Typography variant="body2">{(customer.loyaltyPoints ?? 0).toLocaleString()}</Typography></TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : '-'}</Typography></TableCell>
                    <TableCell>
                      <Chip size="small" label={customer.tier || 'REGULAR'} color={TIER_COLORS[customer.tier || 'REGULAR']} variant="outlined" />
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title={t('common.edit')}>
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenEdit(customer); }}><EditIcon fontSize="small" /></IconButton>
                        </Tooltip>
                        <Tooltip title={t('common.delete')}>
                          <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); setDeleteTarget(customer); }}><DeleteIcon fontSize="small" /></IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                    <Stack alignItems="center" spacing={2}>
                      <PersonIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
                      <Typography variant="h6" color="text.secondary">{t('customers.customerName')}</Typography>
                      <Typography variant="body2" color="text.disabled">{debouncedSearch ? t('common.noResults') : t('common.noData')}</Typography>
                      <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}>{t('customers.addCustomer')}</Button>
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
        <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>{editingCustomer ? t('customers.editCustomer') : t('customers.addCustomer')}</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Stack spacing={2}>
              <TextField
                label={`${t('customers.customerName')} *`}
                fullWidth
                required
                autoFocus
                {...register('name')}
                error={!!errors.name}
                helperText={errors.name?.message}
                placeholder="اسم العميل أو اسم المؤسسة"
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
                    ⚙️ بيانات إضافية اختيارية (البريد، الفئة، الحد الائتماني، الملاحظات)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    <TextField label={`${t('common.email')} (اختياري)`} fullWidth type="email" {...register('email')} error={!!errors.email} helperText={errors.email?.message} />
                    <Controller
                      name="tier" control={control}
                      render={({ field }) => (
                        <TextField select label={`${t('customers.tier')} (اختياري)`} fullWidth {...field}>
                          {TIERS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                        </TextField>
                      )}
                    />
                    <TextField label={`${t('customers.creditLimit')} (اختياري)`} fullWidth type="number" {...register('creditLimit', { valueAsNumber: true })} error={!!errors.creditLimit} helperText={errors.creditLimit?.message} />
                    <TextField label={`${t('common.notes')} (اختياري)`} fullWidth multiline rows={2} {...register('notes')} />
                  </Stack>
                </AccordionDetails>
              </Accordion>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ position: 'sticky', bottom: 0, zIndex: 10, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider', p: 2, flexDirection: { xs: 'column-reverse', sm: 'row' } }}>
            <Button onClick={handleCloseDialog} fullWidth={isMobile} sx={{ minHeight: 44, borderRadius: 2 }}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={isPending} fullWidth={isMobile} sx={{ minHeight: 44, borderRadius: 2, fontWeight: 700 }}>{isPending ? t('common.processing') : t('common.save')}</Button>
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