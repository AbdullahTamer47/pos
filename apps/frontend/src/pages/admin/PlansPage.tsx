import { useState } from 'react';
import {
  Box, Button, Typography, Stack, Card, CardContent, CardActions, Chip,
  Grid, Skeleton, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Switch, FormControlLabel, Divider, alpha, useTheme, IconButton,
  Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import {
  Add, Edit, Delete, CheckCircle, Cancel, Star, Close, Refresh, ExpandMore,
  People, Store,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api, { type PlanResponse, type PaginatedResponse } from '@/api/endpoints';

const planSchema = z.object({
  name: z.string().min(1, 'اسم الباقة مطلوب'),
  nameAr: z.string().optional().default(''),
  nameEn: z.string().optional().default(''),
  description: z.string().optional().default(''),
  price: z.coerce.number().min(0),
  currency: z.string().optional().default('EGP'),
  features: z.string().optional().default(''),
  maxUsers: z.coerce.number().min(1).default(2), // عدد الكاشير المسموح به
  maxBranches: z.coerce.number().min(1).default(1), // عدد الفروع
  maxWarehouses: z.coerce.number().min(1).default(999999),
  maxProducts: z.coerce.number().min(1).default(999999),
  maxInvoices: z.coerce.number().min(1).default(999999),
  maxCustomers: z.coerce.number().min(1).default(999999),
  maxSuppliers: z.coerce.number().min(1).default(999999),
  isActive: z.boolean().optional().default(true),
  isRecommended: z.boolean().optional().default(false),
  trialDays: z.coerce.number().min(0).optional().default(0),
});
type PlanForm = z.infer<typeof planSchema>;

export default function PlansPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<PlanResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlanResponse | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const { data: plansData, isLoading, error } = useQuery<any>({
    queryKey: ['plans', 1, 100],
    queryFn: () => api.plans.getPlans({ page: 1, limit: 100 }),
  });

  const { register, handleSubmit, reset, setValue } = useForm<PlanForm>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: '',
      nameAr: '',
      nameEn: '',
      description: '',
      price: 0,
      currency: 'EGP',
      features: '',
      maxUsers: 2,
      maxBranches: 1,
      maxWarehouses: 999999,
      maxProducts: 999999,
      maxInvoices: 999999,
      maxCustomers: 999999,
      maxSuppliers: 999999,
      isActive: true,
      isRecommended: false,
      trialDays: 0,
    },
  });

  const createMut = useMutation({
    mutationFn: (data: PlanForm) => {
      const payload = {
        ...data,
        nameAr: data.name,
        nameEn: data.name,
        currency: 'EGP',
        features: data.features ? data.features.split(',').map((f) => f.trim()).filter(Boolean) : [],
      };
      return api.plans.createPlan(payload as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setDialogOpen(false);
      reset();
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PlanForm }) => {
      const payload = {
        ...data,
        nameAr: data.nameAr || data.name,
        nameEn: data.nameEn || data.name,
        currency: 'EGP',
        features: data.features ? data.features.split(',').map((f) => f.trim()).filter(Boolean) : [],
      };
      return api.plans.updatePlan(id, payload as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setDialogOpen(false);
      setEditPlan(null);
      reset();
    },
  });

  const deleteMut = useMutation({
    mutationFn: api.plans.deletePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setDeleteTarget(null);
    },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.plans.updatePlan(id, { isActive: !isActive } as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plans'] }),
  });

  const handleOpenEdit = (p: PlanResponse) => {
    setEditPlan(p);
    reset({
      name: p.nameAr || p.name || p.nameEn || '',
      nameAr: p.nameAr || p.name || '',
      nameEn: p.nameEn || p.name || '',
      description: p.description || '',
      price: p.price,
      currency: 'EGP',
      features: (p.features || []).join(', '),
      maxUsers: p.maxUsers ?? 2,
      maxBranches: p.maxBranches ?? 1,
      maxWarehouses: p.maxWarehouses ?? 999999,
      maxProducts: p.maxProducts ?? 999999,
      maxInvoices: p.maxInvoices ?? 999999,
      maxCustomers: p.maxCustomers ?? 999999,
      maxSuppliers: p.maxSuppliers ?? 999999,
      isActive: p.isActive ?? true,
      isRecommended: p.isRecommended || false,
      trialDays: p.trialDays || 0,
    });
    setDialogOpen(true);
  };

  const rawList = plansData?.data || (Array.isArray(plansData) ? plansData : []);
  const plans: PlanResponse[] = Array.isArray(rawList) ? rawList : [];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>باقات الاشتراك</Typography>
          <Typography variant="body2" color="text.secondary">إدارة وتحديد باقات التجار والحدود المسموحة</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setEditPlan(null);
            reset({
              name: '',
              nameAr: '',
              nameEn: '',
              description: '',
              price: 0,
              currency: 'EGP',
              features: '',
              maxUsers: 2,
              maxBranches: 1,
              maxWarehouses: 999999,
              maxProducts: 999999,
              maxInvoices: 999999,
              maxCustomers: 999999,
              maxSuppliers: 999999,
              isActive: true,
              isRecommended: false,
              trialDays: 0,
            });
            setDialogOpen(true);
          }}
        >
          إضافة باقة جديدة
        </Button>
      </Stack>

      {isLoading ? (
        <Grid container spacing={3}>
          {[...Array(3)].map((_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <Skeleton variant="rounded" height={320} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      ) : error ? (
        <Alert severity="error" sx={{ borderRadius: 3 }}>{(error as Error).message}</Alert>
      ) : plans.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 3 }}>{t('common.noData')}</Alert>
      ) : (
        <Grid container spacing={3}>
          {plans.map((plan) => (
            <Grid key={plan.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card
                sx={{
                  borderRadius: 3,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  border: plan.isRecommended ? `2px solid ${theme.palette.primary.main}` : undefined,
                  position: 'relative',
                  boxShadow: plan.isRecommended ? theme.shadows[8] : undefined,
                }}
              >
                {plan.isRecommended && (
                  <Chip
                    icon={<Star />}
                    label="الباقة المقترحة"
                    color="primary"
                    size="small"
                    sx={{ position: 'absolute', top: 12, left: 12 }}
                  />
                )}
                <CardContent sx={{ flex: 1, pb: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="h6" fontWeight={700}>
                      {plan.nameAr || plan.name || plan.nameEn}
                    </Typography>
                    <Chip
                      label={plan.isActive ? 'مفعلة' : 'معطلة'}
                      size="small"
                      color={plan.isActive ? 'success' : 'default'}
                    />
                  </Stack>
                  <Typography variant="h4" fontWeight={800} color="primary.main" mb={1}>
                    {plan.price}{' '}
                    <Typography component="span" variant="body1" color="text.secondary">
                      ج.م / شهرياً
                    </Typography>
                  </Typography>
                  {plan.description && (
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      {plan.description}
                    </Typography>
                  )}

                  <Divider sx={{ my: 1.5 }} />

                  <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={1}>
                    حدود وصلاحيات الباقة:
                  </Typography>
                  <Stack spacing={1} mb={2}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">عدد الكاشير المسموح:</Typography>
                      <Chip label={`${plan.maxUsers ?? 1} كاشير`} size="small" variant="outlined" color="primary" />
                    </Stack>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">عدد الفروع المسموح:</Typography>
                      <Chip label={`${plan.maxBranches ?? 1} فرع`} size="small" variant="outlined" />
                    </Stack>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">المنتجات والفواتير:</Typography>
                      <Typography variant="body2" fontWeight={600} color="success.main">
                        {(plan.maxProducts || 0) >= 99999 ? 'غير محدود ∞' : `${plan.maxProducts} صنف`}
                      </Typography>
                    </Stack>
                  </Stack>

                  {plan.features && plan.features.length > 0 && (
                    <Box mb={2}>
                      {plan.features.map((f, i) => (
                        <Stack key={i} direction="row" spacing={1} alignItems="center" mb={0.5}>
                          <CheckCircle fontSize="small" color="success" />
                          <Typography variant="body2">{f}</Typography>
                        </Stack>
                      ))}
                    </Box>
                  )}

                  {plan.trialDays > 0 && (
                    <Chip label={`${plan.trialDays} يوم فترة تجريبية`} size="small" variant="outlined" sx={{ mt: 1 }} />
                  )}
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', p: 1.5, borderTop: `1px solid ${theme.palette.divider}` }}>
                  <IconButton size="small" onClick={() => handleOpenEdit(plan)} title="تعديل"><Edit fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => toggleMut.mutate({ id: plan.id, isActive: plan.isActive })}>
                    {plan.isActive ? <Cancel fontSize="small" color="warning" /> : <CheckCircle fontSize="small" color="success" />}
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => setDeleteTarget(plan)} title="حذف"><Delete fontSize="small" /></IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog for Add / Edit Plan */}
      <Dialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditPlan(null); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editPlan ? 'تعديل الباقة' : 'إنشاء باقة جديدة'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} mt={1}>
            <TextField
              label="اسم الباقة"
              placeholder="مثال: الباقة الأساسية، باقة المحلات المميزة..."
              {...register('name')}
              size="medium"
              fullWidth
              required
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="السعر (ج.م)"
                type="number"
                {...register('price')}
                size="small"
                fullWidth
                helperText="السعر الشهري للباقة"
              />
              <TextField
                label="فترة التجربة (بالأيام)"
                type="number"
                {...register('trialDays')}
                size="small"
                fullWidth
                helperText="0 إذا لم يكن هناك تجربة"
              />
            </Stack>

            <Divider>
              <Chip label="الحدود الأساسية للباقة" size="small" />
            </Divider>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="عدد الكاشير المسموح به"
                type="number"
                {...register('maxUsers')}
                size="small"
                fullWidth
                helperText="أقصى عدد مستخدمين وكاشير"
              />
              <TextField
                label="عدد الفروع المسموح بها"
                type="number"
                {...register('maxBranches')}
                size="small"
                fullWidth
                helperText="عدد فروع التاجر المسموحة"
              />
            </Stack>

            <TextField
              label="الوصف (اختياري)"
              {...register('description')}
              size="small"
              fullWidth
              multiline
              rows={2}
            />

            <TextField
              label="مميزات إضافية (مفصولة بفواصل - اختياري)"
              placeholder="دعم فني 24/7, نسخ احتياطي يومي, تقارير تفصيلية"
              {...register('features')}
              size="small"
              fullWidth
            />

            <Accordion
              expanded={advancedOpen}
              onChange={(_, expanded) => setAdvancedOpen(expanded)}
              variant="outlined"
              sx={{ borderRadius: 2 }}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="body2" fontWeight={600}>
                  إعدادات حدود إضافية (المنتجات، الفواتير، الموردين)
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="caption" color="text.secondary" mb={2} display="block">
                  افتراضياً هذه الحدود غير محدودة (999999). يمكنك تقييدها إذا رغبت:
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <TextField label="أقصى عدد منتجات" type="number" {...register('maxProducts')} size="small" fullWidth />
                  </Grid>
                  <Grid size={6}>
                    <TextField label="أقصى عدد فواتير شهرياً" type="number" {...register('maxInvoices')} size="small" fullWidth />
                  </Grid>
                  <Grid size={6}>
                    <TextField label="أقصى عدد عملاء" type="number" {...register('maxCustomers')} size="small" fullWidth />
                  </Grid>
                  <Grid size={6}>
                    <TextField label="أقصى عدد موردين" type="number" {...register('maxSuppliers')} size="small" fullWidth />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            <Stack direction="row" spacing={3}>
              <FormControlLabel control={<Switch {...register('isActive')} />} label="باقة مفعلة ومتاحة" />
              <FormControlLabel control={<Switch {...register('isRecommended')} />} label="تمييز كباقة موصى بها" />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setDialogOpen(false); setEditPlan(null); }}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit((d) => (editPlan ? updateMut.mutate({ id: editPlan.id, data: d }) : createMut.mutate(d)))}
            disabled={createMut.isPending || updateMut.isPending}
          >
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
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