import { useState } from 'react';
import {
  Box, Typography, Stack, Card, CardContent, Tabs, Tab, Chip, Button, IconButton, Tooltip,
  Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert, Avatar, alpha,
  useTheme, useMediaQuery, Divider, Grid, MenuItem,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon, Phone as PhoneIcon, Email as EmailIcon, Edit as EditIcon,
  Delete as DeleteIcon, Add as AddIcon, Refresh as RefreshIcon, CardGiftcard as GiftCardIcon,
  TrendingUp as TrendingUpIcon, Redeem as RedeemIcon, WhatsApp as WhatsAppIcon,
  Payments as CashIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api, {
  type CustomerResponse, type CustomerLedgerEntry, type CustomerStatistics,
  type PaginatedResponse, type GiftCardResponse,
} from '@/api/endpoints';
import { formatCurrency } from '@smartpos/utils';

const TIER_COLORS: Record<string, 'default' | 'primary' | 'warning' | 'secondary'> = {
  REGULAR: 'default', SILVER: 'primary', GOLD: 'warning', PLATINUM: 'secondary',
};

const addressSchema = z.object({
  label: z.string().min(1, 'Required'),
  address: z.string().min(1, 'Required'),
  city: z.string().optional().default(''),
  state: z.string().optional().default(''),
  zipCode: z.string().optional().default(''),
  country: z.string().optional().default(''),
  isDefault: z.boolean().default(false),
});

type AddressFormValues = z.infer<typeof addressSchema>;

const giftCardSchema = z.object({
  name: z.string().optional().default(''),
  initialBalance: z.coerce.number().min(1, 'Min 1'),
  expiryDate: z.string().optional().default(''),
});

type GiftCardFormValues = z.infer<typeof giftCardSchema>;

const loyaltySchema = z.object({
  points: z.coerce.number().min(1, 'Min 1'),
  description: z.string().optional().default(''),
});

type LoyaltyFormValues = z.infer<typeof loyaltySchema>;

interface Address {
  id: string;
  label: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  isDefault: boolean;
}

export default function CustomerDetailPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState(0);
  const [ledgerPage, setLedgerPage] = useState(0);
  const [ledgerRows, setLedgerRows] = useState(25);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deleteAddressId, setDeleteAddressId] = useState<string | null>(null);
  const [giftCardDialogOpen, setGiftCardDialogOpen] = useState(false);
  const [earnDialogOpen, setEarnDialogOpen] = useState(false);
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('CASH');
  const [payRef, setPayRef] = useState('');
  const [payNote, setPayNote] = useState('');

  const { data: customer, isLoading, isError, error, refetch } = useQuery<CustomerResponse>({
    queryKey: ['customer', id],
    queryFn: () => api.customers.getCustomer(id!),
    enabled: !!id,
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(payAmount);
      if (isNaN(amount) || amount <= 0) throw new Error('المبلغ غير صحيح');
      return api.customers.addPayment(id!, {
        amount,
        paymentMethod: payMethod,
        referenceNumber: payRef,
        note: payNote,
      });
    },
    onSuccess: () => {
      toast.success('تم تسجيل سداد الدفعة وتحديث الرصيد بنجاح');
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      setPaymentDialogOpen(false);
      setPayAmount('');
      setPayRef('');
      setPayNote('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'حدث خطأ أثناء تسجيل الدفعة');
    },
  });

  const handleShareWhatsApp = () => {
    if (!customer) return;
    const phone = customer.phone ? customer.phone.replace(/[^0-9]/g, '') : '';
    const message = encodeURIComponent(
      `مرحباً ${customer.name}، كشف حسابك في Smart POS: الرصيد الحالي: ${formatCurrency(customer.balance)} - نقاط الولاء: ${customer.loyaltyPoints}. شكراً لتعاملك معنا!`
    );
    const url = phone ? `https://wa.me/20${phone.startsWith('0') ? phone.slice(1) : phone}?text=${message}` : `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
  };

  const { data: statistics, isLoading: statsLoading } = useQuery<CustomerStatistics>({
    queryKey: ['customer', id, 'statistics'],
    queryFn: () => api.customers.getStatistics(id!),
    enabled: !!id && tab === 0,
  });

  const { data: ledger, isLoading: ledgerLoading } = useQuery<PaginatedResponse<CustomerLedgerEntry>>({
    queryKey: ['customer', id, 'ledger', { page: ledgerPage + 1, limit: ledgerRows }],
    queryFn: () => api.customers.getLedger(id!, { page: ledgerPage + 1, limit: ledgerRows }),
    enabled: !!id && tab === 1,
  });

  const { data: giftCards, isLoading: gcLoading } = useQuery<PaginatedResponse<GiftCardResponse>>({
    queryKey: ['customer', id, 'giftcards'],
    queryFn: () => api.giftCards.getGiftCards({ limit: 100 }),
    enabled: !!id && tab === 4,
  });

  const customerGiftCards = giftCards?.data?.filter((gc) => gc.customerId === id) || [];

  const [addresses, setAddresses] = useState<Address[]>([]);
  const { data: addressesData, isLoading: addressesLoading } = useQuery<Address[]>({
    queryKey: ['customer', id, 'addresses'],
    queryFn: () => Promise.resolve([]),
    enabled: !!id && tab === 2,
  });

  const addressesList = addressesData || addresses;

  const earnMutation = useMutation({
    mutationFn: (data: LoyaltyFormValues) => api.loyalty.earnPoints({ customerId: id!, points: data.points, description: data.description }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customer', id] }); setEarnDialogOpen(false); },
  });

  const redeemMutation = useMutation({
    mutationFn: (data: LoyaltyFormValues) => api.loyalty.redeemPoints({ customerId: id!, points: data.points, description: data.description }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customer', id] }); setRedeemDialogOpen(false); },
  });

  const createGCMutation = useMutation({
    mutationFn: (data: GiftCardFormValues) => api.giftCards.createGiftCard({ ...data, customerId: id, code: undefined }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customer', id, 'giftcards'] }); setGiftCardDialogOpen(false); },
  });

  const earnForm = useForm<LoyaltyFormValues>({ resolver: zodResolver(loyaltySchema), defaultValues: { points: 0, description: '' } });
  const redeemForm = useForm<LoyaltyFormValues>({ resolver: zodResolver(loyaltySchema), defaultValues: { points: 0, description: '' } });
  const gcForm = useForm<GiftCardFormValues>({ resolver: zodResolver(giftCardSchema), defaultValues: { name: '', initialBalance: 0, expiryDate: '' } });
  const addressForm = useForm<AddressFormValues>({ resolver: zodResolver(addressSchema), defaultValues: { label: '', address: '', city: '', state: '', zipCode: '', country: '', isDefault: false } });

  const handleAddAddress = (data: AddressFormValues) => {
    const newAddr: Address = { id: Date.now().toString(), ...data };
    setAddresses((prev) => [...prev, newAddr]);
    setAddressDialogOpen(false);
    addressForm.reset();
  };

  const handleEditAddress = (data: AddressFormValues) => {
    if (editingAddress) {
      setAddresses((prev) => prev.map((a) => (a.id === editingAddress.id ? { ...a, ...data } : a)));
    }
    setAddressDialogOpen(false);
    setEditingAddress(null);
  };

  const handleDeleteAddress = (id: string) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    setDeleteAddressId(null);
  };

  const handleOpenAddressEdit = (addr: Address) => {
    addressForm.reset({ label: addr.label, address: addr.address, city: addr.city || '', state: addr.state || '', zipCode: addr.zipCode || '', country: addr.country || '', isDefault: addr.isDefault });
    setEditingAddress(addr);
    setAddressDialogOpen(true);
  };

  const handleOpenAddressAdd = () => {
    addressForm.reset({ label: '', address: '', city: '', state: '', zipCode: '', country: '', isDefault: false });
    setEditingAddress(null);
    setAddressDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Skeleton variant="text" width={200} height={40} />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mt={2}>
          <Skeleton variant="rounded" width="100%" height={160} />
          <Skeleton variant="rounded" width="100%" height={160} />
        </Stack>
        <Skeleton variant="rounded" width="100%" height={400} sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (isError || !customer) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Alert severity="error" action={<Button size="small" color="inherit" onClick={() => refetch()} startIcon={<RefreshIcon />}>{t('common.tryAgain')}</Button>}>
          {(error as Error)?.message || t('common.somethingWentWrong')}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={1}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton onClick={() => navigate('/customers')}><ArrowBackIcon /></IconButton>
          <Typography variant="h4" fontWeight={700}>{customer.name}</Typography>
          <Chip size="small" label={customer.tier || 'REGULAR'} color={TIER_COLORS[customer.tier || 'REGULAR']} variant="outlined" />
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' }, mt: { xs: 1, sm: 0 } }}>
          <Button
            variant="contained"
            color="success"
            startIcon={<CashIcon />}
            onClick={() => setPaymentDialogOpen(true)}
            sx={{ borderRadius: 2, fontWeight: 700, width: { xs: '100%', sm: 'auto' } }}
          >
            سداد دفعة نقدية 💵
          </Button>

          <Button
            variant="outlined"
            color="primary"
            startIcon={<WhatsAppIcon />}
            onClick={handleShareWhatsApp}
            sx={{ borderRadius: 2, fontWeight: 600, width: { xs: '100%', sm: 'auto' } }}
          >
            إرسال بالواتساب 📲
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={2} mb={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
                <Avatar sx={{ width: 64, height: 64, bgcolor: alpha(theme.palette.primary.main, 0.12) }}>
                  <Typography variant="h4" color="primary">{customer.name.charAt(0)}</Typography>
                </Avatar>
                <Stack spacing={0.5} flex={1}>
                  <Typography variant="h6" fontWeight={600}>{customer.name}</Typography>
                  {customer.phone && <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><PhoneIcon sx={{ fontSize: 16 }} color="action" />{customer.phone}</Typography>}
                  {customer.email && <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><EmailIcon sx={{ fontSize: 16 }} color="action" />{customer.email}</Typography>}
                  {customer.code && <Typography variant="caption" color="text.secondary">{t('customers.customerCode')}: {customer.code}</Typography>}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">{t('customers.balance')}</Typography>
              <Typography variant="h5" fontWeight={700} color={customer.balance >= 0 ? 'success.main' : 'error.main'}>{formatCurrency(customer.balance)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">{t('customers.loyaltyPoints')}</Typography>
              <Typography variant="h5" fontWeight={700} color="warning.main">{(customer.loyaltyPoints ?? 0).toLocaleString()}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label={t('common.overview')} />
        <Tab label={t('customers.ledger')} />
        <Tab label={t('customers.addresses')} />
        <Tab label={t('nav.loyalty')} />
        <Tab label={t('nav.giftCards')} />
      </Tabs>

      {tab === 0 && (
        <Box>
          <Grid container spacing={2} mb={3}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">{t('customers.totalSpent')}</Typography>
                  {statsLoading ? <Skeleton variant="text" width={80} height={32} /> : <Typography variant="h5" fontWeight={700}>{formatCurrency(statistics?.totalSpent || customer.totalSpent)}</Typography>}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">{t('customers.totalOrders')}</Typography>
                  {statsLoading ? <Skeleton variant="text" width={60} height={32} /> : <Typography variant="h5" fontWeight={700}>{statistics?.totalOrders || customer.totalOrders}</Typography>}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">{t('pos.averageOrder')}</Typography>
                  {statsLoading ? <Skeleton variant="text" width={80} height={32} /> : <Typography variant="h5" fontWeight={700}>{formatCurrency(statistics?.averageOrderValue || 0)}</Typography>}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">{t('customers.lastPurchase')}</Typography>
                  {statsLoading ? <Skeleton variant="text" width={80} height={32} /> : <Typography variant="h5" fontWeight={700}>{statistics?.lastPurchase ? new Date(statistics.lastPurchase).toLocaleDateString() : customer.lastPurchase ? new Date(customer.lastPurchase).toLocaleDateString() : '-'}</Typography>}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Paper sx={{ borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={600} sx={{ p: 2, pb: 0 }}>{t('customers.transactions')}</Typography>
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">{t('customers.statistics')}</Typography>
            </Box>
          </Paper>
        </Box>
      )}

      {tab === 1 && (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <TableContainer>
            <Table sx={{ minWidth: 600 }}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('common.date')}</TableCell>
                  <TableCell>{t('common.type')}</TableCell>
                  <TableCell>{t('common.reference')}</TableCell>
                  <TableCell align="right">{t('invoices.balance')}</TableCell>
                  <TableCell>{t('common.description')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ledgerLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}</TableRow>
                  ))
                ) : ledger?.data && ledger.data.length > 0 ? (
                  ledger.data.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip size="small" label={entry.type} color={entry.debit > 0 ? 'error' : 'success'} variant="outlined" />
                      </TableCell>
                      <TableCell>{entry.reference}</TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600} color={entry.balance >= 0 ? 'success.main' : 'error.main'}>{formatCurrency(entry.balance)}</Typography>
                      </TableCell>
                      <TableCell>{entry.description || '-'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}><Typography variant="body2" color="text.secondary">{t('common.noData')}</Typography></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {ledger && ledger.total > 0 && (
            <TablePagination component="div" count={ledger.total} page={ledgerPage} onPageChange={(_, p) => setLedgerPage(p)} rowsPerPage={ledgerRows} onRowsPerPageChange={(e) => { setLedgerRows(parseInt(e.target.value, 10)); setLedgerPage(0); }} rowsPerPageOptions={[10, 25, 50]} />
          )}
        </Paper>
      )}

      {tab === 2 && (
        <Box>
          <Stack direction="row" justifyContent="flex-end" mb={2}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAddressAdd}>{t('customers.addAddress')}</Button>
          </Stack>
          {addressesLoading ? (
            <Stack spacing={2}>{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} variant="rounded" height={80} />)}</Stack>
          ) : addressesList.length > 0 ? (
            <Stack spacing={2}>
              {addressesList.map((addr) => (
                <Paper key={addr.id} variant="outlined" sx={{ p: 2, borderRadius: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body1" fontWeight={600}>{addr.label}</Typography>
                      {addr.isDefault && <Chip size="small" label={t('customers.availableCredit')} color="primary" variant="outlined" />}
                    </Stack>
                    <Typography variant="body2" mt={0.5}>{addr.address}</Typography>
                    <Typography variant="caption" color="text.secondary">{[addr.city, addr.state, addr.zipCode, addr.country].filter(Boolean).join(', ')}</Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title={t('common.edit')}><IconButton size="small" onClick={() => handleOpenAddressEdit(addr)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title={t('common.delete')}><IconButton size="small" color="error" onClick={() => setDeleteAddressId(addr.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Paper sx={{ py: 6, textAlign: 'center', borderRadius: 3 }}>
              <Typography variant="body2" color="text.secondary">{t('common.noData')}</Typography>
            </Paper>
          )}
        </Box>
      )}

      {tab === 3 && (
        <Box>
          <Grid container spacing={2} mb={3}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Card sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">{t('loyalty.pointsBalance')}</Typography>
                  <Typography variant="h4" fontWeight={700} color="primary">{(customer.loyaltyPoints ?? 0).toLocaleString()}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Card sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">{t('loyalty.pointsEarned')}</Typography>
                  <Typography variant="h4" fontWeight={700} color="success.main">{'-'}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Card sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">{t('loyalty.pointsRedeemed')}</Typography>
                  <Typography variant="h4" fontWeight={700} color="warning.main">{'-'}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Stack direction="row" spacing={1} mb={3}>
            <Button variant="contained" color="success" startIcon={<TrendingUpIcon />} onClick={() => { earnForm.reset({ points: 0, description: '' }); setEarnDialogOpen(true); }}>{t('loyalty.earnPoints')}</Button>
            <Button variant="contained" color="warning" startIcon={<RedeemIcon />} onClick={() => { redeemForm.reset({ points: 0, description: '' }); setRedeemDialogOpen(true); }}>{t('loyalty.redeemPoints')}</Button>
          </Stack>

          <Paper sx={{ borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={600} sx={{ p: 2, pb: 0 }}>{t('loyalty.pointsHistory')}</Typography>
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">{t('common.noData')}</Typography>
            </Box>
          </Paper>
        </Box>
      )}

      {tab === 4 && (
        <Box>
          <Stack direction="row" justifyContent="flex-end" mb={2}>
            <Button variant="contained" startIcon={<GiftCardIcon />} onClick={() => { gcForm.reset({ name: '', initialBalance: 0, expiryDate: '' }); setGiftCardDialogOpen(true); }}>{t('giftCards.addGiftCard')}</Button>
          </Stack>
          {gcLoading ? (
            <Stack spacing={2}>{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} variant="rounded" height={72} />)}</Stack>
          ) : customerGiftCards.length > 0 ? (
            <Stack spacing={2}>
              {customerGiftCards.map((gc) => (
                <Paper key={gc.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body1" fontWeight={600}>{gc.code}</Typography>
                        <Chip size="small" label={gc.isActive ? t('common.active') : t('common.inactive')} color={gc.isActive ? 'success' : 'default'} variant="outlined" />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">{gc.name || '-'}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="h6" fontWeight={700}>{formatCurrency(gc.currentBalance)}</Typography>
                      <Typography variant="caption" color="text.secondary">{t('giftCards.initialBalance')}: {formatCurrency(gc.initialBalance)}</Typography>
                    </Box>
                  </Stack>
                  {gc.expiryDate && (
                    <Typography variant="caption" color="text.secondary" mt={1}>{t('giftCards.expiryDate')}: {new Date(gc.expiryDate).toLocaleDateString()}</Typography>
                  )}
                </Paper>
              ))}
            </Stack>
          ) : (
            <Paper sx={{ py: 6, textAlign: 'center', borderRadius: 3 }}>
              <Typography variant="body2" color="text.secondary">{t('common.noData')}</Typography>
            </Paper>
          )}
        </Box>
      )}

      <Dialog open={addressDialogOpen} onClose={() => { setAddressDialogOpen(false); setEditingAddress(null); }} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>{editingAddress ? t('customers.editAddress') : t('customers.addAddress')}</DialogTitle>
        <form onSubmit={addressForm.handleSubmit(editingAddress ? handleEditAddress : handleAddAddress)}>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label={t('customers.customerName')} fullWidth required {...addressForm.register('label')} error={!!addressForm.formState.errors.label} helperText={addressForm.formState.errors.label?.message} />
              <TextField label={t('common.address')} fullWidth required multiline rows={2} {...addressForm.register('address')} error={!!addressForm.formState.errors.address} helperText={addressForm.formState.errors.address?.message} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label={t('common.city')} fullWidth {...addressForm.register('city')} />
                <TextField label={t('customers.state')} fullWidth {...addressForm.register('state')} />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label={t('customers.zipCode')} fullWidth {...addressForm.register('zipCode')} />
                <TextField label={t('common.country')} fullWidth {...addressForm.register('country')} />
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ position: 'sticky', bottom: 0, zIndex: 10, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider', p: 2, flexDirection: { xs: 'column-reverse', sm: 'row' } }}>
            <Button onClick={() => { setAddressDialogOpen(false); setEditingAddress(null); }} fullWidth={isMobile} sx={{ minHeight: 44, borderRadius: 2 }}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained" fullWidth={isMobile} sx={{ minHeight: 44, borderRadius: 2, fontWeight: 700 }}>{t('common.save')}</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={!!deleteAddressId} onClose={() => setDeleteAddressId(null)}>
        <DialogTitle>{t('common.confirmDelete')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">{t('common.confirmDeleteMessage')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAddressId(null)}>{t('common.cancel')}</Button>
          <Button color="error" variant="contained" onClick={() => deleteAddressId && handleDeleteAddress(deleteAddressId)}>{t('common.delete')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={giftCardDialogOpen} onClose={() => setGiftCardDialogOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>{t('giftCards.addGiftCard')}</DialogTitle>
        <form onSubmit={gcForm.handleSubmit((d) => createGCMutation.mutate(d))}>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label={t('giftCards.giftCardName')} fullWidth {...gcForm.register('name')} />
              <TextField label={t('giftCards.initialBalance')} fullWidth type="number" required {...gcForm.register('initialBalance', { valueAsNumber: true })} error={!!gcForm.formState.errors.initialBalance} helperText={gcForm.formState.errors.initialBalance?.message} />
              <TextField label={t('giftCards.expiryDate')} fullWidth type="date" InputLabelProps={{ shrink: true }} {...gcForm.register('expiryDate')} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ position: 'sticky', bottom: 0, zIndex: 10, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider', p: 2, flexDirection: { xs: 'column-reverse', sm: 'row' } }}>
            <Button onClick={() => setGiftCardDialogOpen(false)} fullWidth={isMobile} sx={{ minHeight: 44, borderRadius: 2 }}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={createGCMutation.isPending} fullWidth={isMobile} sx={{ minHeight: 44, borderRadius: 2, fontWeight: 700 }}>{createGCMutation.isPending ? t('common.processing') : t('common.create')}</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={earnDialogOpen} onClose={() => setEarnDialogOpen(false)} maxWidth="xs" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>{t('loyalty.earnPoints')}</DialogTitle>
        <form onSubmit={earnForm.handleSubmit((d) => earnMutation.mutate(d))}>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label={t('loyalty.pointsBalance')} fullWidth type="number" required {...earnForm.register('points', { valueAsNumber: true })} error={!!earnForm.formState.errors.points} helperText={earnForm.formState.errors.points?.message} />
              <TextField label={t('common.description')} fullWidth {...earnForm.register('description')} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ position: 'sticky', bottom: 0, zIndex: 10, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider', p: 2, flexDirection: { xs: 'column-reverse', sm: 'row' } }}>
            <Button onClick={() => setEarnDialogOpen(false)} fullWidth={isMobile} sx={{ minHeight: 44, borderRadius: 2 }}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained" color="success" disabled={earnMutation.isPending} fullWidth={isMobile} sx={{ minHeight: 44, borderRadius: 2, fontWeight: 700 }}>{t('loyalty.earnPoints')}</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 3,
            m: isMobile ? 0 : 2,
          },
        }}
      >
        <DialogTitle>تسجيل سداد دفعة للعميل</DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              المديونية الحالية: <strong>{formatCurrency(customer.balance)}</strong>
            </Alert>
            <TextField
              autoFocus
              fullWidth
              type="number"
              label="المبلغ المسدد (ج.م)"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              slotProps={{
                htmlInput: {
                  min: 1,
                  step: 1,
                },
              }}
            />
            <TextField
              select
              fullWidth
              label="طريقة السداد"
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
            >
              <MenuItem value="CASH">كاش نقدي</MenuItem>
              <MenuItem value="INSTAPAY">تحويل إنستاباي InstaPay</MenuItem>
              <MenuItem value="WALLET">محفظة فودافون كاش / إلكترونية</MenuItem>
              <MenuItem value="CARD">بطاقة ميزة / فيزا</MenuItem>
            </TextField>
            <TextField
              fullWidth
              label="الرقم المرجعي (اختياري)"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              placeholder="رقم عملية التحويل"
            />
            <TextField
              fullWidth
              label="ملاحظات"
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              placeholder="دفعة من الحساب"
            />
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            p: 2,
            borderTop: `1px solid ${theme.palette.divider}`,
            position: isMobile ? 'sticky' : 'relative',
            bottom: 0,
            zIndex: 10,
            bgcolor: 'background.paper',
            flexDirection: { xs: 'column-reverse', sm: 'row' },
          }}
        >
          <Button onClick={() => setPaymentDialogOpen(false)} fullWidth={isMobile} sx={{ minHeight: 44, borderRadius: 2 }}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            color="success"
            fullWidth={isMobile}
            onClick={() => recordPaymentMutation.mutate()}
            disabled={!payAmount || parseFloat(payAmount) <= 0 || recordPaymentMutation.isPending}
            sx={{ minHeight: 44, borderRadius: 2, fontWeight: 700 }}
          >
            تأكيد السداد 💵
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}