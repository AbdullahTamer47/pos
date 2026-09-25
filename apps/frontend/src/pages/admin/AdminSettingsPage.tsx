import { useState } from 'react';
import {
  Box, Button, Typography, Stack, Card, CardContent, TextField, Switch,
  FormControlLabel, Divider, Skeleton, Alert, Paper, Select, MenuItem,
  FormControl, InputLabel, Slider, alpha, useTheme,
} from '@mui/material';
import { Save } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { get, put } from '@/api/client';

const systemSchema = z.object({
  defaultLanguage: z.string().optional().default('ar'),
  defaultCurrency: z.string().optional().default('EGP'),
  maintenanceMode: z.boolean().optional().default(false),
  rateLimitEnabled: z.boolean().optional().default(true),
  rateLimitRequests: z.coerce.number().min(10).max(10000).optional().default(100),
  rateLimitWindow: z.coerce.number().min(1).max(60).optional().default(15),
  smtpHost: z.string().optional().default(''),
  smtpPort: z.coerce.number().optional().default(587),
  smtpUser: z.string().optional().default(''),
  smtpPassword: z.string().optional().default(''),
  smtpFrom: z.string().optional().default(''),
  emailEnabled: z.boolean().optional().default(false),
});
type SystemForm = z.infer<typeof systemSchema>;

const FEATURE_FLAGS = [
  { key: 'posEnabled', label: 'nav.pos' },
  { key: 'inventoryEnabled', label: 'nav.inventory' },
  { key: 'accountingEnabled', label: 'nav.accounting' },
  { key: 'reportsEnabled', label: 'nav.reports' },
  { key: 'apiEnabled', label: 'settings.apiKeys' },
  { key: 'webhooksEnabled', label: 'settings.webhooks' },
  { key: 'loyaltyEnabled', label: 'nav.loyalty' },
  { key: 'giftCardsEnabled', label: 'nav.giftCards' },
  { key: 'couponsEnabled', label: 'nav.coupons' },
  { key: 'promotionsEnabled', label: 'nav.promotions' },
  { key: 'multiBranchEnabled', label: 'nav.branches' },
  { key: 'multiWarehouseEnabled', label: 'nav.warehouses' },
];

export default function AdminSettingsPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState(false);
  const [flags, setFlags] = useState<Record<string, boolean>>({});

  const { data: settings, isLoading } = useQuery<Record<string, unknown>>({
    queryKey: ['adminSettings'],
    queryFn: () => get('/admin/settings'),
  });

  const { register, handleSubmit, control, watch, reset } = useForm<SystemForm>({
    resolver: zodResolver(systemSchema),
    values: {
      defaultLanguage: (settings?.defaultLanguage as string) || 'ar',
      defaultCurrency: (settings?.defaultCurrency as string) || 'EGP',
      maintenanceMode: (settings?.maintenanceMode as boolean) || false,
      rateLimitEnabled: (settings?.rateLimitEnabled as boolean) ?? true,
      rateLimitRequests: (settings?.rateLimitRequests as number) || 100,
      rateLimitWindow: (settings?.rateLimitWindow as number) || 15,
      smtpHost: (settings?.smtpHost as string) || '',
      smtpPort: (settings?.smtpPort as number) || 587,
      smtpUser: (settings?.smtpUser as string) || '',
      smtpPassword: (settings?.smtpPassword as string) || '',
      smtpFrom: (settings?.smtpFrom as string) || '',
      emailEnabled: (settings?.emailEnabled as boolean) || false,
    },
  });

  const saveMut = useMutation({
    mutationFn: (data: SystemForm) => put('/admin/settings', { ...data, featureFlags: flags }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSettings'] });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  const emailEnabled = watch('emailEnabled');
  const rateLimitEnabled = watch('rateLimitEnabled');

  if (isLoading) {
    return (
      <Stack spacing={3}>
        <Skeleton variant="rounded" height={100} />
        <Skeleton variant="rounded" height={300} />
        <Skeleton variant="rounded" height={200} />
      </Stack>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3}>{t('settings.general')} Settings</Typography>
      <form onSubmit={handleSubmit((d) => saveMut.mutate(d))}>
        <Stack spacing={3}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>{t('settings.general')}</Typography>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>{t('settings.language')}</InputLabel>
                    <Select {...register('defaultLanguage')} label={t('settings.language')}>
                      <MenuItem value="ar">العربية</MenuItem>
                      <MenuItem value="en">English</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" fullWidth>
                    <InputLabel>{t('common.currency')}</InputLabel>
                    <Select {...register('defaultCurrency')} label={t('common.currency')}>
                      <MenuItem value="EGP">EGP (ج.م)</MenuItem>
                      <MenuItem value="SAR">SAR (ر.س)</MenuItem>
                      <MenuItem value="USD">USD ($)</MenuItem>
                      <MenuItem value="EUR">EUR (€)</MenuItem>
                      <MenuItem value="AED">AED (د.إ)</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
                <FormControlLabel
                  control={<Switch {...register('maintenanceMode')} />}
                  label={t('settings.maintenanceMode')}
                />
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>Feature Flags</Typography>
              <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
                {FEATURE_FLAGS.map((flag) => (
                  <FormControlLabel
                    key={flag.key}
                    control={
                      <Switch
                        checked={flags[flag.key] ?? true}
                        onChange={(e) => setFlags((prev) => ({ ...prev, [flag.key]: e.target.checked }))}
                      />
                    }
                    label={t(`nav.${flag.key.replace('Enabled', '')}`)}
                  />
                ))}
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>Rate Limiting</Typography>
              <Stack spacing={2}>
                <FormControlLabel control={<Switch {...register('rateLimitEnabled')} />} label={t('common.enabled')} />
                {rateLimitEnabled && (
                  <>
                    <TextField label="Requests per window" type="number" {...register('rateLimitRequests')} size="small" fullWidth />
                    <TextField label="Window (seconds)" type="number" {...register('rateLimitWindow')} size="small" fullWidth />
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>{t('common.email')}</Typography>
              <Stack spacing={2}>
                <FormControlLabel control={<Switch {...register('emailEnabled')} />} label={t('common.enabled')} />
                {emailEnabled && (
                  <>
                    <TextField label="SMTP Host" {...register('smtpHost')} size="small" fullWidth />
                    <TextField label="SMTP Port" type="number" {...register('smtpPort')} size="small" fullWidth />
                    <TextField label="SMTP User" {...register('smtpUser')} size="small" fullWidth />
                    <TextField label="SMTP Password" type="password" {...register('smtpPassword')} size="small" fullWidth />
                    <TextField label="From Address" {...register('smtpFrom')} size="small" fullWidth />
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>

          <Stack direction="row" spacing={2}>
            <Button type="submit" variant="contained" startIcon={<Save />} disabled={saveMut.isPending} size="large">
              {t('common.save')}
            </Button>
          </Stack>
          {success && <Alert severity="success" sx={{ borderRadius: 2 }}>{t('common.saveSuccess')}</Alert>}
          {saveMut.isError && <Alert severity="error" sx={{ borderRadius: 2 }}>{t('common.operationFailed')}</Alert>}
        </Stack>
      </form>
    </Box>
  );
}