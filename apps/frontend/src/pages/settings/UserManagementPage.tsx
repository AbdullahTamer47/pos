import { useState, useCallback, useMemo } from 'react';
import {
  Box, TextField, Button, Typography, Stack, Card, CardContent, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TablePagination, Paper, Chip,
  IconButton, Skeleton, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  Switch, FormControlLabel, Checkbox, FormGroup, Divider, InputAdornment, MenuItem,
  Grid, Tab, Tabs, useTheme, useMediaQuery,
} from '@mui/material';
import {
  Add, Edit, Delete, Search, Close, FilterList, Refresh, ToggleOn, ToggleOff,
  PersonAdd, LockReset, Security, PointOfSale, Assessment, ViewSidebar,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api, { type UserResponse, type PaginatedResponse, type BranchResponse } from '@/api/endpoints';
import { get } from '@/api/client';

const userSchema = z.object({
  fullName: z.string().min(1, 'الاسم مطلوب'),
  email: z.string().optional().default(''),
  password: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  role: z.string().min(1),
  branchId: z.string().optional().default(''),
  isActive: z.boolean().optional().default(true),
});
type UserForm = z.infer<typeof userSchema>;

const ROLES = [
  { value: 'CASHIER', label: 'كاشير / بائع' },
  { value: 'MANAGER', label: 'مدير فرع' },
  { value: 'ACCOUNTANT', label: 'محاسب' },
  { value: 'INVENTORY_STAFF', label: 'أمين مخزن' },
  { value: 'VIEWER', label: 'مشاهد فقط' },
  { value: 'ADMIN', label: 'مدير عام المتجر' },
];

// أقسام القائمة الجانبية المسموح برؤيتها
const NAV_PERMISSIONS = [
  { key: 'nav.pos', label: 'نقطة البيع (الكاشير)', default: true },
  { key: 'nav.invoices', label: 'سجل الفواتير والمبيعات', default: true },
  { key: 'nav.dashboard', label: 'لوحة التحكم والإحصائيات الرئيسية', default: false },
  { key: 'nav.products', label: 'قائمة المنتجات والتصنيفات', default: false },
  { key: 'nav.inventory', label: 'حركة المخزون والتحويلات', default: false },
  { key: 'nav.customers', label: 'قائمة العملاء وبياناتهم', default: true },
  { key: 'nav.suppliers', label: 'قائمة الموردين وأوامر الشراء', default: false },
  { key: 'nav.reports', label: 'قسم التقارير', default: false },
];

// تقارير محددة يحددها التاجر للكاشير/المساعد
const REPORT_PERMISSIONS = [
  { key: 'report.sales', label: 'تقرير المبيعات والتحصيلات' },
  { key: 'report.profit-loss', label: 'تقرير الأرباح والخسائر' },
  { key: 'report.inventory-status', label: 'تقرير حركة ورصيد المخزون' },
  { key: 'report.shift', label: 'تقرير الوردية والخزينة اليومية' },
  { key: 'report.top-products', label: 'تقرير المنتجات الأكثر مبيعاً' },
  { key: 'report.tax', label: 'تقرير الضرائب والفواتير الضريبية' },
];

// صلاحيات العمليات ونقطة البيع
const OPERATION_PERMISSIONS = [
  { key: 'pos.create_sale', label: 'إتمام عمليات البيع وإصدار الفاتورة' },
  { key: 'pos.apply_discount', label: 'تطبيق خصم على الصنف أو الفاتورة' },
  { key: 'pos.hold_invoice', label: 'تعليق الفواتير واسترجاعها' },
  { key: 'pos.refund', label: 'استرجاع الفواتير والمرتجعات' },
  { key: 'pos.void_invoice', label: 'إلغاء الفواتير' },
  { key: 'pos.open_cash_drawer', label: 'فتح درج النقدية يدوياً' },
  { key: 'pos.view_cost', label: 'رؤية سعر التكلفة والأرباح' },
];

export default function UserManagementPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [userDialog, setUserDialog] = useState(false);
  const [editUser, setEditUser] = useState<UserResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserResponse | null>(null);
  const [permissionsUser, setPermissionsUser] = useState<UserResponse | null>(null);
  const [permValues, setPermValues] = useState<string[]>([]);
  const [permTab, setPermTab] = useState(0);

  const { data: usersData, isLoading, error, refetch } = useQuery<any>({
    queryKey: ['users', page + 1, rowsPerPage, search],
    queryFn: () => api.users.getUsers({ page: page + 1, limit: rowsPerPage, search }),
  });

  const { data: branches } = useQuery<any>({
    queryKey: ['branches-list'],
    queryFn: () => get('/branches'),
    staleTime: 5 * 60 * 1000,
  });

  const branchList = useMemo<BranchResponse[]>(() => {
    if (!branches) return [];
    if (Array.isArray(branches)) return branches;
    if (Array.isArray(branches.data)) return branches.data;
    return [];
  }, [branches]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: { email: '', fullName: '', phone: '', role: 'CASHIER', branchId: '', isActive: true, password: '' },
  });

  const createMut = useMutation({
    mutationFn: (data: UserForm) => {
      const generatedEmail = data.email && data.email.includes('@')
        ? data.email
        : `cashier_${(data.phone || '').replace(/\D/g, '') || Date.now()}@smartpos.local`;
      return api.users.createUser({
        ...data,
        email: generatedEmail,
        password: data.password || '123456',
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setUserDialog(false);
      reset();
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => {
      const generatedEmail = data.email && data.email.includes('@')
        ? data.email
        : `cashier_${(data.phone || '').replace(/\D/g, '') || Date.now()}@smartpos.local`;
      return api.users.updateUser(id, {
        ...data,
        email: generatedEmail,
        ...(data.password ? { password: data.password } : {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setUserDialog(false);
      setEditUser(null);
      reset();
    },
  });

  const deleteMut = useMutation({
    mutationFn: api.users.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteTarget(null);
    },
  });

  const toggleMut = useMutation({
    mutationFn: api.users.toggleActive,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const updatePermsMut = useMutation({
    mutationFn: (data: { id: string; permissions: string[] }) =>
      api.users.updatePermissions(data.id, { permissions: data.permissions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setPermissionsUser(null);
    },
  });

  const handleOpenEdit = (u: UserResponse) => {
    setEditUser(u);
    reset({
      email: u.email?.includes('@smartpos.local') ? '' : (u.email || ''),
      fullName: u.fullName,
      phone: u.phone || '',
      role: u.role,
      branchId: u.branchId || '',
      isActive: u.isActive,
      password: '',
    });
    setUserDialog(true);
  };

  const handleOpenPermissions = (u: UserResponse) => {
    setPermissionsUser(u);
    // If no custom perms exist, set reasonable defaults
    const current = u.permissions || [];
    if (current.length === 0 && u.role === 'CASHIER') {
      setPermValues(['nav.pos', 'nav.invoices', 'pos.create_sale', 'pos.hold_invoice']);
    } else {
      setPermValues(current);
    }
  };

  const togglePerm = (key: string) => {
    setPermValues((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const rawUsers = usersData?.data || (Array.isArray(usersData) ? usersData : []);
  const users: UserResponse[] = Array.isArray(rawUsers) ? rawUsers : [];

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} flexWrap="wrap" useFlexGap gap={2} mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>إدارة المستخدمين والكاشير</Typography>
          <Typography variant="body2" color="text.secondary">
            إضافة وتحديد صلاحيات الكاشير والمشرفين والشاشات المسموح برؤيتها
          </Typography>
        </Box>
        <Button
          variant="contained"
          fullWidth={isMobile}
          startIcon={<PersonAdd />}
          onClick={() => {
            setEditUser(null);
            reset({ email: '', fullName: '', phone: '', role: 'CASHIER', branchId: '', isActive: true, password: '' });
            setUserDialog(true);
          }}
        >
          إضافة كاشير / مستخدم جديد
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
          sx={{ width: { xs: '100%', sm: 260 } }}
        />
      </Stack>

      {isLoading ? (
        <Stack spacing={1}>{[...Array(5)].map((_, i) => <Skeleton key={i} variant="rounded" height={52} />)}</Stack>
      ) : error ? (
        <Alert severity="error" sx={{ borderRadius: 3 }}>{(error as Error).message}</Alert>
      ) : users.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 3 }}>{t('common.noData')}</Alert>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
            <Table size="small" sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>الاسم الكامل</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>رقم الهاتف / المعرف</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الدور</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الفرع</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">الإجراءات والصلاحيات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{u.fullName}</TableCell>
                    <TableCell>
                      {u.phone || (u.email?.includes('@smartpos.local') ? 'بدون إيميل' : u.email)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ROLES.find((r) => r.value === u.role)?.label || u.role}
                        size="small"
                        color={u.role === 'ADMIN' ? 'primary' : u.role === 'CASHIER' ? 'info' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{u.branchName || 'الفرع الرئيسي'}</TableCell>
                    <TableCell>
                      <Chip
                        label={u.isActive ? 'نشط' : 'معطل'}
                        size="small"
                        color={u.isActive ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleOpenEdit(u)} title="تعديل">
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => toggleMut.mutate(u.id)} title={u.isActive ? 'تعطيل' : 'تفعيل'}>
                        {u.isActive ? <ToggleOff fontSize="small" color="warning" /> : <ToggleOn fontSize="small" color="success" />}
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenPermissions(u)}
                        color="primary"
                        title="تخصيص الصلاحيات والشاشات المسموحة"
                      >
                        <Security fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => setDeleteTarget(u)} title="حذف">
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
            count={usersData?.total || users.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50]}
          />
        </>
      )}

      {/* User Add / Edit Dialog */}
      <Dialog open={userDialog} onClose={() => { setUserDialog(false); setEditUser(null); }} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editUser ? 'تعديل بيانات المستخدم' : 'إضافة كاشير / موظف جديد'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} mt={1}>
            <TextField
              label="الاسم الكامل"
              placeholder="مثال: أحمد محمد (كاشير الفرع)"
              {...register('fullName')}
              size="medium"
              fullWidth
              required
              error={!!errors.fullName}
              helperText={errors.fullName?.message}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="رقم الهاتف (الأساسي)"
                placeholder="01012345678"
                {...register('phone')}
                size="small"
                fullWidth
                helperText="يستخدم للدخول والتواصل"
              />
              <TextField
                label="البريد الإلكتروني (اختياري)"
                placeholder="اختياري - اتركه فارغاً إن لم يوجد"
                {...register('email')}
                size="small"
                fullWidth
              />
            </Stack>

            <TextField
              label={editUser ? 'كلمة المرور الجديدة (اختياري)' : 'كلمة المرور'}
              type="password"
              placeholder={editUser ? 'اتركها فارغة للإبقاء على الحالية' : 'الافتراضية: 123456'}
              {...register('password')}
              size="small"
              fullWidth
              helperText="كلمة مرور تسجيل الدخول"
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField select label="الدور الوظيفي" {...register('role')} size="small" fullWidth>
                {ROLES.map((r) => (
                  <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                ))}
              </TextField>

              {branchList.length > 0 && (
                <TextField select label="الفرع المخصص" {...register('branchId')} size="small" fullWidth>
                  <MenuItem value="">الفرع الرئيسي</MenuItem>
                  {branchList.map((b: BranchResponse) => (
                    <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                  ))}
                </TextField>
              )}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, position: 'sticky', bottom: 0, bgcolor: 'background.paper', zIndex: 10, borderTop: 1, borderColor: 'divider', flexDirection: { xs: 'column-reverse', sm: 'row' } }}>
          <Button onClick={() => { setUserDialog(false); setEditUser(null); }} fullWidth={isMobile} sx={{ minHeight: 44, borderRadius: 2 }}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            onClick={handleSubmit((d) => (editUser ? updateMut.mutate({ id: editUser.id, data: d }) : createMut.mutate(d)))}
            disabled={createMut.isPending || updateMut.isPending}
            fullWidth={isMobile}
            sx={{ minHeight: 44, borderRadius: 2, fontWeight: 700 }}
          >
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permissions Dialog (Customizable sidebar tabs and report views as requested by user) */}
      <Dialog
        open={!!permissionsUser}
        onClose={() => setPermissionsUser(null)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          تخصيص صلاحيات الكاشير والشاشات المسموحة — {permissionsUser?.fullName}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" mb={2}>
            حدد بالضبط ما يمكن لهذا الموظف رؤيته في القائمة الجانبية وما هي التقارير والعمليات المسموح له بها:
          </Typography>

          <Tabs
            value={permTab}
            onChange={(_, val) => setPermTab(val)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
          >
            <Tab icon={<ViewSidebar />} iconPosition="start" label="شاشات القائمة الجانبية" />
            <Tab icon={<Assessment />} iconPosition="start" label="التقارير المسموحة" />
            <Tab icon={<PointOfSale />} iconPosition="start" label="عمليات نقطة البيع" />
          </Tabs>

          {/* Tab 0: Navigation Tabs */}
          {permTab === 0 && (
            <FormGroup>
              <Typography variant="subtitle2" fontWeight={700} color="primary" mb={1}>
                الشاشات التي تظهر في القائمة الجانبية للموظف:
              </Typography>
              <Grid container spacing={1}>
                {NAV_PERMISSIONS.map((perm) => (
                  <Grid key={perm.key} size={{ xs: 12, sm: 6 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={permValues.includes(perm.key)}
                          onChange={() => togglePerm(perm.key)}
                        />
                      }
                      label={<Typography variant="body2">{perm.label}</Typography>}
                    />
                  </Grid>
                ))}
              </Grid>
            </FormGroup>
          )}

          {/* Tab 1: Specific Reports */}
          {permTab === 1 && (
            <FormGroup>
              <Typography variant="subtitle2" fontWeight={700} color="primary" mb={1}>
                التقارير المصرح له بفتحها وتوليدها:
              </Typography>
              <Alert severity="info" sx={{ mb: 2, py: 0.5, borderRadius: 2 }}>
                تأكد من تفعيل "قسم التقارير" في التبويب الأول لتظهر للموظف في القائمة.
              </Alert>
              <Grid container spacing={1}>
                {REPORT_PERMISSIONS.map((perm) => (
                  <Grid key={perm.key} size={{ xs: 12, sm: 6 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={permValues.includes(perm.key)}
                          onChange={() => togglePerm(perm.key)}
                        />
                      }
                      label={<Typography variant="body2">{perm.label}</Typography>}
                    />
                  </Grid>
                ))}
              </Grid>
            </FormGroup>
          )}

          {/* Tab 2: Operations */}
          {permTab === 2 && (
            <FormGroup>
              <Typography variant="subtitle2" fontWeight={700} color="primary" mb={1}>
                صلاحيات الكاشير أثناء عملية البيع:
              </Typography>
              <Grid container spacing={1}>
                {OPERATION_PERMISSIONS.map((perm) => (
                  <Grid key={perm.key} size={{ xs: 12, sm: 6 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={permValues.includes(perm.key)}
                          onChange={() => togglePerm(perm.key)}
                        />
                      }
                      label={<Typography variant="body2">{perm.label}</Typography>}
                    />
                  </Grid>
                ))}
              </Grid>
            </FormGroup>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, position: 'sticky', bottom: 0, bgcolor: 'background.paper', zIndex: 10, borderTop: 1, borderColor: 'divider', flexDirection: { xs: 'column-reverse', sm: 'row' } }}>
          <Button onClick={() => setPermissionsUser(null)} fullWidth={isMobile} sx={{ minHeight: 44, borderRadius: 2 }}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            onClick={() =>
              updatePermsMut.mutate({ id: permissionsUser!.id, permissions: permValues })
            }
            disabled={updatePermsMut.isPending}
            fullWidth={isMobile}
            sx={{ minHeight: 44, borderRadius: 2, fontWeight: 700 }}
          >
            حفظ الصلاحيات
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('common.confirmDelete')}</DialogTitle>
        <DialogContent><Typography>{t('common.confirmDeleteMessage')}</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => { if (deleteTarget) deleteMut.mutate(deleteTarget.id); }}
          >
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}