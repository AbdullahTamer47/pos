import { useState, useCallback, useMemo } from 'react';
import {
  Box, Tabs, Tab, Typography, Button, Card, CardContent, Stack, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TablePagination, Paper, MenuItem,
  Skeleton, Alert, Switch, alpha, useTheme, Tooltip, InputAdornment, useMediaQuery,
} from '@mui/material';
import {
  Add, Edit, Delete, Search, Close, FilterList, Refresh, Upload,
  Inventory2, PointOfSale, CalendarMonth, AttachMoney, TrendingUp,
  ReceiptLong, ToggleOn, ToggleOff, CheckCircle,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import api, {
  type ShiftResponse, type ExpenseResponse, type RevenueResponse, type TaxConfigResponse,
  type PaginatedResponse, type BranchResponse,
} from '@/api/endpoints';
import { get } from '@/api/client';

const expenseSchema = z.object({
  name: z.string().min(1),
  categoryId: z.string().optional(),
  amount: z.coerce.number().min(0.01),
  paymentMethod: z.string().optional(),
  date: z.string().min(1),
  reference: z.string().optional(),
  notes: z.string().optional(),
});
type ExpenseForm = z.infer<typeof expenseSchema>;

const revenueSchema = z.object({
  name: z.string().min(1),
  categoryId: z.string().optional(),
  amount: z.coerce.number().min(0.01),
  paymentMethod: z.string().optional(),
  date: z.string().min(1),
  reference: z.string().optional(),
  notes: z.string().optional(),
});
type RevenueForm = z.infer<typeof revenueSchema>;

const taxSchema = z.object({
  name: z.string().min(1),
  nameAr: z.string().optional(),
  nameEn: z.string().optional(),
  rate: z.coerce.number().min(0).max(100),
  taxNumber: z.string().optional(),
  isDefault: z.boolean().optional(),
});
type TaxForm = z.infer<typeof taxSchema>;

const closeShiftSchema = z.object({
  closingBalance: z.coerce.number().min(0),
  notes: z.string().optional(),
});
type CloseShiftForm = z.infer<typeof closeShiftSchema>;

const openShiftSchema = z.object({
  openingBalance: z.coerce.number().min(0),
  branchId: z.string().optional(),
  notes: z.string().optional(),
});
type OpenShiftForm = z.infer<typeof openShiftSchema>;

const TAB_LABELS = ['shifts', 'expenses', 'revenues', 'taxConfig'];

export default function AccountingPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [openShiftDialog, setOpenShiftDialog] = useState(false);
  const [closeShiftDialog, setCloseShiftDialog] = useState(false);
  const [expenseDialog, setExpenseDialog] = useState(false);
  const [editExpense, setEditExpense] = useState<ExpenseResponse | null>(null);
  const [revenueDialog, setRevenueDialog] = useState(false);
  const [editRevenue, setEditRevenue] = useState<RevenueResponse | null>(null);
  const [taxDialog, setTaxDialog] = useState(false);
  const [editTax, setEditTax] = useState<TaxConfigResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: string } | null>(null);

  const { data: activeShift, isLoading: shiftLoading } = useQuery<ShiftResponse | null>({
    queryKey: ['activeShift'],
    queryFn: () => api.shifts.getActiveShift(),
  });

  const { data: shiftsData, isLoading: shiftsLoading } = useQuery<PaginatedResponse<ShiftResponse>>({
    queryKey: ['shifts', page, rowsPerPage, search],
    queryFn: () => api.shifts.getShifts({ page: page + 1, limit: rowsPerPage, search }),
    enabled: tab === 0,
  });

  const { data: expensesData, isLoading: expensesLoading } = useQuery<PaginatedResponse<ExpenseResponse>>({
    queryKey: ['expenses', page, rowsPerPage, search, categoryFilter],
    queryFn: () => api.expenses.getExpenses({ page: page + 1, limit: rowsPerPage, search }),
    enabled: tab === 1,
  });

  const { data: revenuesData, isLoading: revenuesLoading } = useQuery<PaginatedResponse<RevenueResponse>>({
    queryKey: ['revenues', page, rowsPerPage, search, categoryFilter],
    queryFn: () => api.revenues.getRevenues({ page: page + 1, limit: rowsPerPage, search }),
    enabled: tab === 2,
  });

  const { data: taxData, isLoading: taxLoading } = useQuery<{ data: TaxConfigResponse[]; total: number; defaultConfig: TaxConfigResponse | null }>({
    queryKey: ['taxConfigs', page, rowsPerPage],
    queryFn: () => api.taxConfigs.getTaxConfigs({ page: page + 1, limit: rowsPerPage }),
    enabled: tab === 3,
  });

  const { data: branchesData } = useQuery<any>({
    queryKey: ['branches-list'],
    queryFn: () => get('/branches'),
    staleTime: 5 * 60 * 1000,
  });

  const branchList = useMemo<BranchResponse[]>(() => {
    if (!branchesData) return [];
    if (Array.isArray(branchesData)) return branchesData;
    if (Array.isArray(branchesData.data)) return branchesData.data;
    return [];
  }, [branchesData]);

  const openShiftForm = useForm<OpenShiftForm>({ resolver: zodResolver(openShiftSchema), defaultValues: { openingBalance: 0, branchId: '', notes: '' } });
  const closeShiftForm = useForm<CloseShiftForm>({ resolver: zodResolver(closeShiftSchema), defaultValues: { closingBalance: 0, notes: '' } });
  const expenseForm = useForm<ExpenseForm>({ resolver: zodResolver(expenseSchema), defaultValues: { name: '', amount: 0, date: format(new Date(), 'yyyy-MM-dd'), reference: '', notes: '' } });
  const revenueForm = useForm<RevenueForm>({ resolver: zodResolver(revenueSchema), defaultValues: { name: '', amount: 0, date: format(new Date(), 'yyyy-MM-dd'), reference: '', notes: '' } });
  const taxForm = useForm<TaxForm>({ resolver: zodResolver(taxSchema), defaultValues: { name: '', rate: 0, taxNumber: '', isDefault: false } });

  const openShiftMut = useMutation({
    mutationFn: (data: OpenShiftForm) => api.shifts.openShift({
      openingCash: data.openingBalance || 0,
      branchId: data.branchId || undefined,
      notes: data.notes || undefined,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['activeShift'] }); queryClient.invalidateQueries({ queryKey: ['shifts'] }); setOpenShiftDialog(false); openShiftForm.reset(); },
  });

  const closeShiftMut = useMutation({
    mutationFn: (data: CloseShiftForm) => {
      const shiftId = (currentShift as any)?.id || (activeShift as any)?.shift?.id || (activeShift as any)?.id;
      if (!shiftId) throw new Error('No active shift');
      return api.shifts.closeShift(shiftId, {
        actualCash: data.closingBalance,
        closingNote: data.notes,
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['activeShift'] }); queryClient.invalidateQueries({ queryKey: ['shifts'] }); setCloseShiftDialog(false); closeShiftForm.reset(); },
  });

  const createExpenseMut = useMutation({
    mutationFn: api.expenses.createExpense,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); setExpenseDialog(false); expenseForm.reset(); },
  });
  const updateExpenseMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => api.expenses.updateExpense(id, data as any),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); setExpenseDialog(false); setEditExpense(null); expenseForm.reset(); },
  });
  const deleteExpenseMut = useMutation({
    mutationFn: api.expenses.deleteExpense,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); setDeleteTarget(null); },
  });

  const createRevenueMut = useMutation({
    mutationFn: api.revenues.createRevenue,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['revenues'] }); setRevenueDialog(false); revenueForm.reset(); },
  });
  const updateRevenueMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => api.revenues.updateRevenue(id, data as any),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['revenues'] }); setRevenueDialog(false); setEditRevenue(null); revenueForm.reset(); },
  });
  const deleteRevenueMut = useMutation({
    mutationFn: api.revenues.deleteRevenue,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['revenues'] }); setDeleteTarget(null); },
  });

  const createTaxMut = useMutation({
    mutationFn: api.taxConfigs.createTaxConfig,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['taxConfigs'] }); setTaxDialog(false); taxForm.reset(); },
  });
  const updateTaxMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => api.taxConfigs.updateTaxConfig(id, data as any),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['taxConfigs'] }); setTaxDialog(false); setEditTax(null); taxForm.reset(); },
  });
  const deleteTaxMut = useMutation({
    mutationFn: api.taxConfigs.deleteTaxConfig,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['taxConfigs'] }); setDeleteTarget(null); },
  });

  const toggleTaxMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.taxConfigs.updateTaxConfig(id, { isActive: !isActive } as any),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['taxConfigs'] }); },
  });

  const handleOpenEditExpense = (e: ExpenseResponse) => {
    setEditExpense(e);
    expenseForm.reset({ name: e.name, amount: e.amount, date: e.date ? format(new Date(e.date), 'yyyy-MM-dd') : '', reference: e.reference || '', notes: e.notes || '' });
    setExpenseDialog(true);
  };

  const handleOpenEditRevenue = (e: RevenueResponse) => {
    setEditRevenue(e);
    revenueForm.reset({ name: e.name, amount: e.amount, date: e.date ? format(new Date(e.date), 'yyyy-MM-dd') : '', reference: e.reference || '', notes: e.notes || '' });
    setRevenueDialog(true);
  };

  const handleOpenEditTax = (e: TaxConfigResponse) => {
    setEditTax(e);
    taxForm.reset({ name: e.name, rate: e.rate, taxNumber: e.taxNumber || '', isDefault: e.isDefault });
    setTaxDialog(true);
  };

  const shifts = shiftsData?.data || [];
  const expenses = expensesData?.data || [];
  const revenues = revenuesData?.data || [];
  const taxConfigs = taxData?.data || [];

  const currentShift = useMemo(() => {
    if (!activeShift) return null;
    if ((activeShift as any).active === false || (activeShift as any).shift === null) return null;
    const s = (activeShift as any).shift || activeShift;
    if (!s || (!s.id && !s.shiftNumber)) return null;
    return s;
  }, [activeShift]);

  const fmtCurrency = useCallback((amt?: number | null) => {
    return `${(Number(amt) || 0).toLocaleString()} ج.م`;
  }, []);

  const totalExpensesSum = useMemo(() => {
    return expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [expenses]);

  const totalRevenuesSum = useMemo(() => {
    return revenues.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [revenues]);

  const netBalance = totalRevenuesSum - totalExpensesSum;

  const renderShiftsTab = () => (
    <Box>
      <Card sx={{ borderRadius: 3, mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} mb={2}>{t('shifts.currentShift')}</Typography>
          {shiftLoading ? (
            <Skeleton variant="rounded" height={80} />
          ) : currentShift ? (
            <Stack spacing={2}>
              <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
                <Box><Typography variant="caption" color="text.secondary">{t('shifts.shiftNumber')}</Typography><Typography fontWeight={600}>{currentShift.shiftNumber || '—'}</Typography></Box>
                <Box><Typography variant="caption" color="text.secondary">{t('shifts.openedBy')}</Typography><Typography fontWeight={600}>{currentShift.openedByName || currentShift.openedBy || '—'}</Typography></Box>
                <Box><Typography variant="caption" color="text.secondary">{t('shifts.startTime')}</Typography><Typography fontWeight={600}>{currentShift.startTime ? format(new Date(currentShift.startTime), 'PPpp') : '—'}</Typography></Box>
                <Box><Typography variant="caption" color="text.secondary">{t('shifts.openingBalance')}</Typography><Typography fontWeight={600}>{fmtCurrency(currentShift.openingBalance || currentShift.openingCash)}</Typography></Box>
                <Box><Typography variant="caption" color="text.secondary">{t('shifts.totalSales')}</Typography><Typography fontWeight={600}>{fmtCurrency(currentShift.totalSales)}</Typography></Box>
              </Stack>
              <Button variant="contained" color="warning" onClick={() => setCloseShiftDialog(true)}>
                {t('shifts.closeShift')}
              </Button>
            </Stack>
          ) : (
            <Stack direction="row" alignItems="center" spacing={2}>
              <Typography color="text.secondary">{t('shifts.noActiveShift')}</Typography>
              <Button variant="contained" startIcon={<PointOfSale />} onClick={() => setOpenShiftDialog(true)}>
                {t('shifts.openShift')}
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>

      <Typography variant="h6" fontWeight={600} mb={2}>{t('shifts.shiftHistory')}</Typography>
      {shiftsLoading ? (
        <Stack spacing={1}>{[...Array(5)].map((_, i) => <Skeleton key={i} variant="rounded" height={48} />)}</Stack>
      ) : shifts.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 3 }}>{t('common.noData')}</Alert>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
            <Table size="small" sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>{t('shifts.shiftNumber')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('shifts.openedBy')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('shifts.startTime')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('shifts.endTime')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('shifts.openingBalance')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('shifts.expectedBalance')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('shifts.closingBalance')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('shifts.difference')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('common.status')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {shifts.map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell>{s.shiftNumber}</TableCell>
                    <TableCell>{s.openedByName || '—'}</TableCell>
                    <TableCell>{s.startTime ? format(new Date(s.startTime), 'dd/MM HH:mm') : '—'}</TableCell>
                    <TableCell>{s.endTime ? format(new Date(s.endTime), 'dd/MM HH:mm') : '—'}</TableCell>
                    <TableCell>{fmtCurrency(s.openingBalance || (s as any).openingCash)}</TableCell>
                    <TableCell>{s.expectedBalance != null ? fmtCurrency(s.expectedBalance) : '—'}</TableCell>
                    <TableCell>{s.closingBalance != null ? fmtCurrency(s.closingBalance) : '—'}</TableCell>
                    <TableCell>
                      <Typography color={s.difference && s.difference !== 0 ? 'error.main' : 'text.primary'} fontWeight={600}>
                        {s.difference != null ? fmtCurrency(s.difference) : '0 ج.م'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={s.status} size="small" color={s.status === 'open' ? 'success' : 'default'} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={shiftsData?.total || 0}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50]}
          />
        </>
      )}
    </Box>
  );

  const renderExpensesTab = () => (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={1.5} mb={2}>
        <TextField size="small" placeholder={t('common.search')} value={search} onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} sx={{ width: { xs: '100%', sm: 240 } }} />
        <Button variant="contained" fullWidth={isMobile} startIcon={<Add />} onClick={() => { setEditExpense(null); setExpenseDialog(true); }}>{t('expenses.addExpense')}</Button>
      </Stack>
      {expensesLoading ? (
        <Stack spacing={1}>{[...Array(5)].map((_, i) => <Skeleton key={i} variant="rounded" height={48} />)}</Stack>
      ) : expenses.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 3 }}>{t('common.noData')}</Alert>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
            <Table size="small" sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>{t('common.date')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('common.category')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('common.amount')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('common.description')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {expenses.map((e) => (
                  <TableRow key={e.id} hover>
                    <TableCell>{e.date ? format(new Date(e.date), 'dd/MM/yyyy') : '—'}</TableCell>
                    <TableCell>{e.categoryName || '—'}</TableCell>
                    <TableCell>{fmtCurrency(e.amount)}</TableCell>
                    <TableCell>{e.notes || e.name || '—'}</TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleOpenEditExpense(e)}><Edit fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => setDeleteTarget({ id: e.id, type: 'expense' })}><Delete fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination component="div" count={expensesData?.total || 0} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }} rowsPerPageOptions={[10, 25, 50]} />
        </>
      )}
    </Box>
  );

  const renderRevenuesTab = () => (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={1.5} mb={2}>
        <TextField size="small" placeholder={t('common.search')} value={search} onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} sx={{ width: { xs: '100%', sm: 240 } }} />
        <Button variant="contained" fullWidth={isMobile} startIcon={<Add />} onClick={() => { setEditRevenue(null); setRevenueDialog(true); }}>{t('revenues.addRevenue')}</Button>
      </Stack>
      {revenuesLoading ? (
        <Stack spacing={1}>{[...Array(5)].map((_, i) => <Skeleton key={i} variant="rounded" height={48} />)}</Stack>
      ) : revenues.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 3 }}>{t('common.noData')}</Alert>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
            <Table size="small" sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>{t('common.date')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('common.category')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('common.amount')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('common.description')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {revenues.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{r.date ? format(new Date(r.date), 'dd/MM/yyyy') : '—'}</TableCell>
                    <TableCell>{r.categoryName || '—'}</TableCell>
                    <TableCell>{fmtCurrency(r.amount)}</TableCell>
                    <TableCell>{r.notes || r.name || '—'}</TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleOpenEditRevenue(r)}><Edit fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => setDeleteTarget({ id: r.id, type: 'revenue' })}><Delete fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination component="div" count={revenuesData?.total || 0} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }} rowsPerPageOptions={[10, 25, 50]} />
        </>
      )}
    </Box>
  );

  const renderTaxConfigTab = () => (
    <Box>
      <Stack direction="row" justifyContent="flex-end" mb={2}>
        <Button variant="contained" fullWidth={isMobile} startIcon={<Add />} onClick={() => { setEditTax(null); setTaxDialog(true); }}>{t('settings.addTax')}</Button>
      </Stack>
      {taxLoading ? (
        <Stack spacing={1}>{[...Array(5)].map((_, i) => <Skeleton key={i} variant="rounded" height={48} />)}</Stack>
      ) : taxConfigs.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 3 }}>{t('common.noData')}</Alert>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
            <Table size="small" sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>{t('settings.taxName')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('settings.taxRate')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('settings.taxNumber')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('common.default')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('common.status')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {taxConfigs.map((tx) => (
                  <TableRow key={tx.id} hover>
                    <TableCell>{tx.name}</TableCell>
                    <TableCell>{tx.rate}%</TableCell>
                    <TableCell>{tx.taxNumber || '—'}</TableCell>
                    <TableCell>{tx.isDefault ? <Chip label={t('common.default')} size="small" color="primary" /> : '—'}</TableCell>
                    <TableCell>
                      <Switch checked={tx.isActive} onChange={() => toggleTaxMut.mutate({ id: tx.id, isActive: tx.isActive })} size="small" />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleOpenEditTax(tx)}><Edit fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => setDeleteTarget({ id: tx.id, type: 'tax' })}><Delete fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination component="div" count={taxData?.total || 0} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }} rowsPerPageOptions={[10, 25, 50]} />
        </>
      )}
    </Box>
  );

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} mb={3}>
        {t('nav.accounting')}
      </Typography>

      {/* 🌟 FINANCIAL OVERVIEW STATS (Google M3 Expressive) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <Card
          sx={{
            borderRadius: 4,
            border: `1.5px solid ${alpha(theme.palette.success.main, 0.25)}`,
            backgroundColor: alpha(theme.palette.success.main, 0.05),
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="body2" fontWeight={600} color="text.secondary">
                  إجمالي الإيرادات
                </Typography>
                <Typography variant="h5" fontWeight={800} color="success.main" mt={0.5}>
                  {totalRevenuesSum.toLocaleString()} ج.م
                </Typography>
              </Box>
              <Box
                sx={{
                  p: 1.2,
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.success.main, 0.15),
                  color: 'success.main',
                }}
              >
                <TrendingUp />
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card
          sx={{
            borderRadius: 4,
            border: `1.5px solid ${alpha(theme.palette.warning.main, 0.25)}`,
            backgroundColor: alpha(theme.palette.warning.main, 0.05),
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="body2" fontWeight={600} color="text.secondary">
                  إجمالي المصروفات
                </Typography>
                <Typography variant="h5" fontWeight={800} color="warning.main" mt={0.5}>
                  {totalExpensesSum.toLocaleString()} ج.م
                </Typography>
              </Box>
              <Box
                sx={{
                  p: 1.2,
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.warning.main, 0.15),
                  color: 'warning.main',
                }}
              >
                <ReceiptLong />
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card
          sx={{
            borderRadius: 4,
            border: `1.5px solid ${alpha(theme.palette.primary.main, 0.25)}`,
            backgroundColor: alpha(theme.palette.primary.main, 0.05),
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="body2" fontWeight={600} color="text.secondary">
                  صافي السيولة النقدية
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight={800}
                  color={netBalance >= 0 ? 'primary.main' : 'error.main'}
                  mt={0.5}
                >
                  {netBalance.toLocaleString()} ج.م
                </Typography>
              </Box>
              <Box
                sx={{
                  p: 1.2,
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.primary.main, 0.15),
                  color: 'primary.main',
                }}
              >
                <AttachMoney />
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => { setTab(v); setPage(0); setSearch(''); }}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        {TAB_LABELS.map((label) => (
          <Tab key={label} label={t(`nav.${label === 'taxConfig' ? 'tax' : label}`)} />
        ))}
      </Tabs>

      {tab === 0 && renderShiftsTab()}
      {tab === 1 && renderExpensesTab()}
      {tab === 2 && renderRevenuesTab()}
      {tab === 3 && renderTaxConfigTab()}

      {/* Open Shift Dialog */}
      <Dialog open={openShiftDialog} onClose={() => setOpenShiftDialog(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('shifts.openShift')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <TextField
              label="الرصيد الافتتاحي (اختياري - افتراضياً 0 ج.م)"
              type="number"
              {...openShiftForm.register('openingBalance', { valueAsNumber: true })}
              fullWidth
              size="small"
              slotProps={{ htmlInput: { min: 0 } }}
            />
            <TextField select label={t('branches.branch')} {...openShiftForm.register('branchId')} size="small" fullWidth defaultValue="">
              <MenuItem value="">الفرع الرئيسي (افتراضي)</MenuItem>
              {branchList.map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  {b.name || (b as any).nameAr || (b as any).nameEn || 'فرع'}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="ملاحظات (اختياري)" {...openShiftForm.register('notes')} multiline rows={2} size="small" fullWidth placeholder="مثال: وردية مسائية" />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, position: 'sticky', bottom: 0, bgcolor: 'background.paper', zIndex: 10, borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={() => setOpenShiftDialog(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={openShiftForm.handleSubmit((d) => openShiftMut.mutate(d))} disabled={openShiftMut.isPending}>{t('common.save')}</Button>
        </DialogActions>
      </Dialog>

      {/* Close Shift Dialog */}
      <Dialog open={closeShiftDialog} onClose={() => setCloseShiftDialog(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('shifts.closeShift')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            {currentShift && (
              <>
                <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 2 }}>
                  <Typography variant="body2">{t('shifts.openingBalance')}: {fmtCurrency(currentShift.openingBalance || currentShift.openingCash)}</Typography>
                  <Typography variant="body2">{t('shifts.totalSales')}: {fmtCurrency(currentShift.totalSales)}</Typography>
                  <Typography variant="body2" fontWeight={600}>{t('shifts.expectedBalance')}: {fmtCurrency(((Number(currentShift.openingBalance || currentShift.openingCash || 0)) + (Number(currentShift.cashSales || 0))))}</Typography>
                </Box>
              </>
            )}
            <TextField label={t('shifts.closingBalance')} type="number" {...closeShiftForm.register('closingBalance')} fullWidth size="small" />
            <TextField label={t('common.notes')} {...closeShiftForm.register('notes')} multiline rows={2} size="small" fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, position: 'sticky', bottom: 0, bgcolor: 'background.paper', zIndex: 10, borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={() => setCloseShiftDialog(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" color="warning" onClick={closeShiftForm.handleSubmit((d) => closeShiftMut.mutate(d))} disabled={closeShiftMut.isPending}>{t('common.confirm')}</Button>
        </DialogActions>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={expenseDialog} onClose={() => { setExpenseDialog(false); setEditExpense(null); }} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ fontWeight: 700 }}>{editExpense ? t('expenses.editExpense') : t('expenses.addExpense')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <TextField label={t('expenses.expenseName')} {...expenseForm.register('name')} size="small" fullWidth />
            <TextField label={t('common.amount')} type="number" {...expenseForm.register('amount')} size="small" fullWidth />
            <TextField label={t('common.date')} type="date" {...expenseForm.register('date')} size="small" fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label={t('common.notes')} {...expenseForm.register('notes')} multiline rows={2} size="small" fullWidth />
            <TextField label={t('payments.paymentReference')} {...expenseForm.register('reference')} size="small" fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, position: 'sticky', bottom: 0, bgcolor: 'background.paper', zIndex: 10, borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={() => { setExpenseDialog(false); setEditExpense(null); }}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={expenseForm.handleSubmit((d) => editExpense ? updateExpenseMut.mutate({ id: editExpense.id, data: d }) : createExpenseMut.mutate(d))} disabled={createExpenseMut.isPending || updateExpenseMut.isPending}>{t('common.save')}</Button>
        </DialogActions>
      </Dialog>

      {/* Revenue Dialog */}
      <Dialog open={revenueDialog} onClose={() => { setRevenueDialog(false); setEditRevenue(null); }} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ fontWeight: 700 }}>{editRevenue ? t('revenues.editRevenue') : t('revenues.addRevenue')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <TextField label={t('revenues.revenueName')} {...revenueForm.register('name')} size="small" fullWidth />
            <TextField label={t('common.amount')} type="number" {...revenueForm.register('amount')} size="small" fullWidth />
            <TextField label={t('common.date')} type="date" {...revenueForm.register('date')} size="small" fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label={t('common.notes')} {...revenueForm.register('notes')} multiline rows={2} size="small" fullWidth />
            <TextField label={t('payments.paymentReference')} {...revenueForm.register('reference')} size="small" fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, position: 'sticky', bottom: 0, bgcolor: 'background.paper', zIndex: 10, borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={() => { setRevenueDialog(false); setEditRevenue(null); }}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={revenueForm.handleSubmit((d) => editRevenue ? updateRevenueMut.mutate({ id: editRevenue.id, data: d }) : createRevenueMut.mutate(d))} disabled={createRevenueMut.isPending || updateRevenueMut.isPending}>{t('common.save')}</Button>
        </DialogActions>
      </Dialog>

      {/* Tax Config Dialog */}
      <Dialog open={taxDialog} onClose={() => { setTaxDialog(false); setEditTax(null); }} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ fontWeight: 700 }}>{editTax ? t('common.edit') : t('settings.addTax')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <TextField label={t('settings.taxName')} {...taxForm.register('name')} size="small" fullWidth />
            <TextField label={t('settings.taxRate')} type="number" {...taxForm.register('rate')} size="small" fullWidth InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }} />
            <TextField label={t('settings.taxNumber')} {...taxForm.register('taxNumber')} size="small" fullWidth />
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="body2">{t('common.default')}</Typography>
              <Switch {...taxForm.register('isDefault')} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, position: 'sticky', bottom: 0, bgcolor: 'background.paper', zIndex: 10, borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={() => { setTaxDialog(false); setEditTax(null); }}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={taxForm.handleSubmit((d) => editTax ? updateTaxMut.mutate({ id: editTax.id, data: d }) : createTaxMut.mutate(d))} disabled={createTaxMut.isPending || updateTaxMut.isPending}>{t('common.save')}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('common.confirmDelete')}</DialogTitle>
        <DialogContent><Typography>{t('common.confirmDeleteMessage')}</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
          <Button color="error" variant="contained" onClick={() => {
            if (!deleteTarget) return;
            if (deleteTarget.type === 'expense') deleteExpenseMut.mutate(deleteTarget.id);
            if (deleteTarget.type === 'revenue') deleteRevenueMut.mutate(deleteTarget.id);
            if (deleteTarget.type === 'tax') deleteTaxMut.mutate(deleteTarget.id);
          }}>{t('common.delete')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}