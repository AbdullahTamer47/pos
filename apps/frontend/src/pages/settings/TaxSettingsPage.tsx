import { useState } from 'react';
import {
  Box, TextField, Button, Typography, Stack, Card, CardContent, Switch,
  Skeleton, Alert, FormControlLabel, Divider,
} from '@mui/material';
import { Save } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api, { type TaxConfigResponse } from '@/api/endpoints';
import { useAuthStore } from '@/stores/authStore';

const taxSettingsSchema = z.object({
  name: z.string().min(1),
  rate: z.coerce.number().min(0).max(100),
  taxNumber: z.string().optional().default(''),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});
type TaxSettingsForm = z.infer<typeof taxSettingsSchema>;

export default function TaxSettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [success, setSuccess] = useState(false);

  const { data: taxConfigs, isLoading } = useQuery<TaxConfigResponse[]>({
    queryKey: ['taxConfigs-list'],
    queryFn: async () => {
      const res = await api.taxConfigs.getTaxConfigs({ limit: 100 });
      return (res as any).data || [];
    },
  });

  const defaultTax = taxConfigs?.find((t) => t.isDefault) || taxConfigs?.[0];

  const { register, handleSubmit, watch, formState: { isDirty } } = useForm<TaxSettingsForm>({
    resolver: zodResolver(taxSettingsSchema),
    values: {
      name: defaultTax?.name || '',
      rate: defaultTax?.rate || 0,
      taxNumber: defaultTax?.taxNumber || '',
      isDefault: defaultTax?.isDefault || false,
      isActive: defaultTax?.isActive ?? true,
    },
  });

  const updateMut = useMutation({
    mutationFn: (data: TaxSettingsForm) => {
      if (defaultTax?.id) {
        return api.taxConfigs.updateTaxConfig(defaultTax.id, data as any);
      }
      return api.taxConfigs.createTaxConfig(data as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxConfigs-list'] });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  if (isLoading) {
    return (
      <Stack spacing={3}>
        <Skeleton variant="rounded" height={400} />
      </Stack>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={1}>{t('settings.taxConfig')}</Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>{t('settings.taxDesc')}</Typography>

      <Card sx={{ borderRadius: 3, maxWidth: 640 }}>
        <CardContent>
          <form onSubmit={handleSubmit((d) => updateMut.mutate(d))}>
            <Stack spacing={3}>
              <TextField label={t('settings.taxName')} {...register('name')} size="small" fullWidth />
              <TextField
                label={t('settings.taxRate')}
                {...register('rate')}
                type="number"
                size="small"
                fullWidth
                InputProps={{ endAdornment: <Typography color="text.secondary">%</Typography> }}
              />
              <TextField label={t('settings.taxNumber')} {...register('taxNumber')} size="small" fullWidth />
              <Divider />
              <FormControlLabel
                control={<Switch {...register('isDefault')} defaultChecked={defaultTax?.isDefault} />}
                label={t('common.default')}
              />
              <FormControlLabel
                control={<Switch {...register('isActive')} defaultChecked={defaultTax?.isActive ?? true} />}
                label={t('common.enabled')}
              />
              <Stack direction="row" spacing={2}>
                <Button type="submit" variant="contained" startIcon={<Save />} disabled={updateMut.isPending || !isDirty}>
                  {t('common.save')}
                </Button>
              </Stack>
              {success && <Alert severity="success" sx={{ borderRadius: 2 }}>{t('common.saveSuccess')}</Alert>}
              {updateMut.isError && <Alert severity="error" sx={{ borderRadius: 2 }}>{t('common.operationFailed')}</Alert>}
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}