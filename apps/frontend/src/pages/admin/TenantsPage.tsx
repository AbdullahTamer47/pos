import { useState } from 'react';
import {
  Box, TextField, Button, Typography, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, Paper, Chip, IconButton,
  Skeleton, Alert, Dialog, DialogTitle, DialogContent, DialogActions, InputAdornment,
  MenuItem, Switch, alpha, useTheme, AppBar, Toolbar, Container, Card, CardContent,
  Divider,
} from '@mui/material';
import {
  Add, Edit, Delete, Search, Close, Refresh, ToggleOn, ToggleOff,
  Storefront, Palette, Phone, Email, Store,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import api, { type TenantResponse, type PaginatedResponse, type PlanResponse } from '@/api/endpoints';

const tenantSchema = z.object({
  name: z.string().min(1, 'اسم التاجر أو المتجر مطلوب'),
  nameAr: z.string().optional().default(''),
  nameEn: z.string().optional().default(''),
  email: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  planId: z.string().optional().default(''),
  password: z.string().optional().default(''),
});
type TenantForm = z.infer<typeof tenantSchema>;

const brandingSchema = z.object({
  primaryColor: z.string().optional().default('#1976d2'),
  secondaryColor: z.string().optional().default('#dc004e'),
});
type BrandingForm = z.infer<typeof brandingSchema>;

export default function TenantsPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTenant, setEditTenant] = useState<TenantResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TenantResponse | null>(null);
  const [toggleTarget, setToggleTarget] = useState<TenantResponse | null>(null);
  const [brandingTarget, setBrandingTarget] = useState<TenantResponse | null>(null);

  const { data: tenantsData, isLoading, error, refetch } = useQuery<any>({
    queryKey: ['tenants', page + 1, rowsPerPage, search],
    queryFn: () => api.tenants.getTenants({ page: page + 1, limit: rowsPerPage, search }),
  });

  const { data: plansData } = useQuery<any>({
    queryKey: ['plans-list'],
    queryFn: async () => api.plans.getPlans({ limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const plansList: PlanResponse[] = Array.isArray(plansData)
    ? plansData
    : Array.isArray(plansData?.data)
    ? plansData.data
    : [];

  const { register, handleSubmit, reset } = useForm<TenantForm>({
    resolver: zodResolver(tenantSchema),
    defaultValues: { name: '', nameAr: '', nameEn: '', email: '', phone: '', planId: '', password: '' },
  });

  const brandingForm = useForm<BrandingForm>({
    resolver: zodResolver(brandingSchema),
    defaultValues: { primaryColor: '#1976d2', secondaryColor: '#dc004e' },
  });

  const createMut = useMutation({
    mutationFn: (data: TenantForm) => {
      const generatedEmail = data.email && data.email.includes('@')
        ? data.email
        : `merchant_${(data.phone || '').replace(/\D/g, '') || Date.now()}@smartpos.local`;
      return api.tenants.createTenant({
        ...data,
        nameAr: data.name,
        nameEn: data.name,
        email: generatedEmail,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setDialogOpen(false);
      reset();
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => {
      const generatedEmail = data.email && data.email.includes('@')
        ? data.email
        : `merchant_${(data.phone || '').replace(/\D/g, '') || Date.now()}@smartpos.local`;
      return api.tenants.updateTenant(id, {
        ...data,
        nameAr: data.nameAr || data.name,
        nameEn: data.nameEn || data.name,
        email: generatedEmail,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setDialogOpen(false);
      setEditTenant(null);
      reset();
    },
  });

  const deleteMut = useMutation({
    mutationFn: api.tenants.deleteTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setDeleteTarget(null);
    },
  });

  const toggleMut = useMutation({
    mutationFn: api.tenants.toggleTenantActive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setToggleTarget(null);
    },
  });

  const brandingMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.tenants.updateBranding(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setBrandingTarget(null);
    },
  });

  const handleOpenEdit = (t: TenantResponse) => {
    setEditTenant(t);
    reset({
      name: t.nameAr || t.name || t.nameEn || '',
      nameAr: t.nameAr || t.name || '',
      nameEn: t.nameEn || t.name || '',
      email: t.email?.includes('@smartpos.local') ? '' : (t.email || ''),
      phone: t.phone || '',
      planId: t.planId || '',
      password: '',
    });
    setDialogOpen(true);
  };

  const handleOpenBranding = (t: TenantResponse) => {
    setBrandingTarget(t);
    brandingForm.reset({
      primaryColor: t.branding?.primaryColor || '#1976d2',
      secondaryColor: t.branding?.secondaryColor || '#dc004e',
    });
  };

  const rawTenants = tenantsData?.data || (Array.isArray(tenantsData) ? tenantsData : []);
  const tenants: TenantResponse[] = Array.isArray(rawTenants) ? rawTenants : [];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>إدارة التجار والمشتركين</Typography>
          <Typography variant="body2" color="text.secondary">إضافة وتفعيل ومتابعة حسابات التجار والمحلات</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setEditTenant(null);
            reset({ name: '', nameAr: '', nameEn: '', email: '', phone: '', planId: '', password: '' });
            setDialogOpen(true);
          }}
        >
          إضافة تاجر جديد
        </Button>
      </Stack>

      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap mb={2}>
        <TextField
          size="small"
          placeholder={t('common.search')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
            endAdornment: search ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearch('')}><Close fontSize="small" /></IconButton>
              </InputAdornment>
            ) : null,
          }}
          sx={{ minWidth: 280 }}
        />
      </Stack>

      {isLoading ? (
        <Stack spacing={1}>{[...Array(5)].map((_, i) => <Skeleton key={i} variant="rounded" height={52} />)}</Stack>
      ) : error ? (
        <Alert severity="error" sx={{ borderRadius: 3 }}>{(error as Error).message}</Alert>
      ) : tenants.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 3 }}>لا يوجد تجار مسجلين حالياً</Alert>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>اسم التاجر / المتجر</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>رقم الهاتف</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>البريد الإلكتروني</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>باقة الاشتراك</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>تاريخ التسجيل</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {tenant.nameAr || tenant.name || tenant.nameEn}
                    </TableCell>
                    <TableCell>{tenant.phone || '—'}</TableCell>
                    <TableCell>
                      {tenant.email?.includes('@smartpos.local') ? (
                        <Typography variant="caption" color="text.secondary">بدون إيميل</Typography>
                      ) : (
                        tenant.email || '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          plansList.find((p) => p.id === tenant.planId)?.name ||
                          tenant.planId ||
                          'افتراضية'
                        }
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={tenant.isActive ? 'نشط' : 'معطل'}
                        size="small"
                        color={tenant.isActive ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      {tenant.createdAt ? format(new Date(tenant.createdAt), 'dd/MM/yyyy') : '—'}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleOpenEdit(tenant)} title="تعديل">
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => setToggleTarget(tenant)} title={tenant.isActive ? 'تعطيل' : 'تفعيل'}>
                        {tenant.isActive ? <ToggleOff fontSize="small" color="warning" /> : <ToggleOn fontSize="small" color="success" />}
                      </IconButton>
                      <IconButton size="small" onClick={() => handleOpenBranding(tenant)} title="ألوان المتجر">
                        <Palette fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => setDeleteTarget(tenant)} title="حذف">
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={tenantsData?.total || tenants.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50]}
          />
        </>
      )}

      {/* Full-Screen Add / Edit Dialog as requested in Audio Note */}
      <Dialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditTenant(null); }}
        fullScreen
      >
        <AppBar sx={{ position: 'relative' }} color="default" elevation={1}>
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton edge="start" onClick={() => { setDialogOpen(false); setEditTenant(null); }}>
                <Close />
              </IconButton>
              <Typography variant="h6" fontWeight={700}>
                {editTenant ? 'تعديل بيانات التاجر' : 'إضافة تاجر جديد إلى المنصة'}
              </Typography>
            </Stack>
            <Button
              variant="contained"
              size="large"
              onClick={handleSubmit((d) => (editTenant ? updateMut.mutate({ id: editTenant.id, data: d }) : createMut.mutate(d)))}
              disabled={createMut.isPending || updateMut.isPending}
            >
              حفظ وتفعيل الحساب
            </Button>
          </Toolbar>
        </AppBar>

        <Box sx={{ bgcolor: 'background.default', minHeight: '100%', py: 4 }}>
          <Container maxWidth="md">
            <Card sx={{ borderRadius: 3, p: { xs: 2, sm: 4 }, boxShadow: theme.shadows[4] }}>
              <CardContent>
                <Typography variant="h5" fontWeight={700} mb={1}>
                  بيانات المتجر والتاجر
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={4}>
                  قم بملء البيانات الأساسية للتاجر للبدء فوراً. البريد الإلكتروني اختياري ويمكن الاكتفاء برقم الهاتف.
                </Typography>

                <Stack spacing={3}>
                  <TextField
                    label="اسم المتجر / التاجر"
                    placeholder="مثال: سوبر ماركت الأمانة، كافيه الأصدقاء..."
                    {...register('name')}
                    size="medium"
                    fullWidth
                    required
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><Store color="primary" /></InputAdornment>,
                    }}
                  />

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
                    <TextField
                      label="رقم الهاتف (الأساسي)"
                      placeholder="01012345678"
                      {...register('phone')}
                      size="medium"
                      fullWidth
                      required
                      helperText="يستخدم للتواصل وتحديد هوية التاجر"
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><Phone color="primary" /></InputAdornment>,
                      }}
                    />

                    <TextField
                      label="البريد الإلكتروني (اختياري)"
                      placeholder="اختياري - اتركه فارغاً إذا لم يتوفر"
                      {...register('email')}
                      size="medium"
                      fullWidth
                      helperText="إذا تُرك فارغاً سيتم تسجيل التاجر برقم الهاتف تلقائياً"
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><Email color="action" /></InputAdornment>,
                      }}
                    />
                  </Stack>

                  <TextField
                    select
                    label="باقة الاشتراك"
                    {...register('planId')}
                    size="medium"
                    fullWidth
                    helperText="اختر الباقة المناسبة للتاجر لتحديد عدد الكاشير والفروع"
                  >
                    <MenuItem value="">بدون باقة محددة (الباقة الافتراضية)</MenuItem>
                    {plansList.map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.nameAr || p.name} — {p.price} ج.م / شهر ({p.maxUsers ?? 1} كاشير، {p.maxBranches ?? 1} فرع)
                      </MenuItem>
                    ))}
                  </TextField>

                  {!editTenant && (
                    <TextField
                      label="كلمة مرور الحساب (اختياري)"
                      type="password"
                      placeholder="اتركه فارغاً ليتم إنشاء كلمة مرور افتراضية (123456)"
                      {...register('password')}
                      size="medium"
                      fullWidth
                      helperText="كلمة المرور لتسجيل دخول التاجر للوحة التحكم"
                    />
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Container>
        </Box>
      </Dialog>

      {/* Branding Dialog */}
      <Dialog open={!!brandingTarget} onClose={() => setBrandingTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>ألوان المتجر والعلامة التجارية — {brandingTarget?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="اللون الأساسي" {...brandingForm.register('primaryColor')} size="small" fullWidth />
            <TextField label="اللون الثانوي" {...brandingForm.register('secondaryColor')} size="small" fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBrandingTarget(null)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            onClick={brandingForm.handleSubmit((d) => brandingMut.mutate({ id: brandingTarget!.id, data: { branding: d } }))}
            disabled={brandingMut.isPending}
          >
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toggle Confirm */}
      <Dialog open={!!toggleTarget} onClose={() => setToggleTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('common.confirm')}</DialogTitle>
        <DialogContent>
          <Typography>{toggleTarget?.isActive ? 'هل أنت متأكد من تعطيل حساب هذا التاجر؟' : 'هل ترغب في إعادة تفعيل حساب هذا التاجر؟'}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToggleTarget(null)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={() => { if (toggleTarget) toggleMut.mutate(toggleTarget.id); }}>
            {t('common.confirm')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('common.confirmDelete')}</DialogTitle>
        <DialogContent><Typography>{t('common.confirmDeleteMessage')}</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
          <Button color="error" variant="contained" onClick={() => { if (deleteTarget) deleteMut.mutate(deleteTarget.id); }}>
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}