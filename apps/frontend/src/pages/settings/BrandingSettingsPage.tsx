import { useState, useCallback } from 'react';
import {
  Box, TextField, Button, Typography, Stack, Card, CardContent, Paper,
  Avatar, alpha, useTheme, Skeleton, Alert, Divider,
} from '@mui/material';
import { CloudUpload, Save, Delete } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api, { type TenantResponse } from '@/api/endpoints';
import { useAuthStore } from '@/stores/authStore';

const brandingSchema = z.object({
  nameAr: z.string().optional().default(''),
  nameEn: z.string().optional().default(''),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color').optional().default('#1976d2'),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color').optional().default('#dc004e'),
});
type BrandingForm = z.infer<typeof brandingSchema>;

export default function BrandingSettingsPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const tenantId = user?.tenantId || '';

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);

  const { data: tenant, isLoading } = useQuery<TenantResponse>({
    queryKey: ['tenant', tenantId],
    queryFn: () => api.tenants.getTenant(tenantId),
    enabled: !!tenantId,
  });

  const { register, handleSubmit, watch, formState: { isDirty } } = useForm<BrandingForm>({
    resolver: zodResolver(brandingSchema),
    values: {
      nameAr: tenant?.nameAr || '',
      nameEn: tenant?.nameEn || '',
      primaryColor: tenant?.branding?.primaryColor || '#1976d2',
      secondaryColor: tenant?.branding?.secondaryColor || '#dc004e',
    },
  });

  const primaryColor = watch('primaryColor');
  const secondaryColor = watch('secondaryColor');
  const nameAr = watch('nameAr');
  const nameEn = watch('nameEn');
  const companyName = nameAr || nameEn || tenant?.name || 'Smart POS';

  const updateBrandingMut = useMutation({
    mutationFn: (data: { branding: { primaryColor: string; secondaryColor: string } }) => api.tenants.updateBranding(tenantId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] }),
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleFaviconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFaviconFile(file);
      const reader = new FileReader();
      reader.onload = () => setFaviconPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (data: BrandingForm) => {
    updateBrandingMut.mutate({ branding: { primaryColor: data.primaryColor, secondaryColor: data.secondaryColor } });
  };

  if (isLoading) {
    return (
      <Stack spacing={3}>
        <Skeleton variant="rounded" height={200} />
        <Skeleton variant="rounded" height={300} />
      </Stack>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={1}>{t('settings.branding')}</Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>{t('settings.brandingDesc')}</Typography>

      <Card sx={{ borderRadius: 3, mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} mb={3}>{t('settings.livePreview')}</Typography>
          <Paper
            sx={{
              p: 4,
              borderRadius: 3,
              bgcolor: alpha(primaryColor, 0.08),
              border: `2px solid ${primaryColor}`,
              textAlign: 'center',
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="center" spacing={2} mb={2}>
              {(logoPreview || tenant?.logo) && (
                <Avatar src={logoPreview || tenant?.logo || ''} sx={{ width: 64, height: 64, bgcolor: primaryColor, fontSize: 28, fontWeight: 700 }}>
                  {companyName.charAt(0)}
                </Avatar>
              )}
              <Typography variant="h5" fontWeight={700} sx={{ color: primaryColor }}>
                {companyName}
              </Typography>
            </Stack>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Box sx={{ width: 80, height: 32, borderRadius: 2, bgcolor: primaryColor }} />
              <Box sx={{ width: 80, height: 32, borderRadius: 2, bgcolor: secondaryColor }} />
              <Box sx={{ width: 80, height: 32, borderRadius: 2, bgcolor: alpha(primaryColor, 0.5) }} />
            </Box>
          </Paper>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} mb={3}>{t('settings.company')}</Typography>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={3}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField label={t('settings.companyNameAr')} {...register('nameAr')} size="small" fullWidth />
                <TextField label={t('settings.companyNameEn')} {...register('nameEn')} size="small" fullWidth />
              </Stack>

              <Divider />

              <Typography variant="subtitle2" fontWeight={600}>{t('settings.logo')}</Typography>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar src={logoPreview || tenant?.logo || ''} sx={{ width: 80, height: 80, bgcolor: primaryColor, fontSize: 32 }}>
                  {companyName.charAt(0)}
                </Avatar>
                <Box>
                  <Button component="label" variant="outlined" startIcon={<CloudUpload />} size="small">
                    {t('common.upload')}
                    <input type="file" accept="image/*" hidden onChange={handleLogoChange} />
                  </Button>
                  {(logoPreview || tenant?.logo) && (
                    <Button size="small" color="error" onClick={() => { setLogoPreview(null); setLogoFile(null); }} sx={{ ml: 1 }}>
                      {t('common.delete')}
                    </Button>
                  )}
                </Box>
              </Stack>

              <Divider />

              <Typography variant="subtitle2" fontWeight={600}>{t('settings.favicon')}</Typography>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar src={faviconPreview || tenant?.favicon || ''} sx={{ width: 40, height: 40, bgcolor: primaryColor, fontSize: 18 }}>
                  {companyName.charAt(0)}
                </Avatar>
                <Button component="label" variant="outlined" startIcon={<CloudUpload />} size="small">
                  {t('common.upload')}
                  <input type="file" accept="image/*" hidden onChange={handleFaviconChange} />
                </Button>
              </Stack>

              <Divider />

              <Typography variant="subtitle2" fontWeight={600}>{t('settings.colors')}</Typography>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  label={t('settings.primaryColor')}
                  {...register('primaryColor')}
                  size="small"
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <Box sx={{ width: 24, height: 24, borderRadius: 1, bgcolor: primaryColor, mr: 1, border: '1px solid', borderColor: 'divider' }} />
                    ),
                  }}
                />
                <TextField
                  label={t('settings.secondaryColor')}
                  {...register('secondaryColor')}
                  size="small"
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <Box sx={{ width: 24, height: 24, borderRadius: 1, bgcolor: secondaryColor, mr: 1, border: '1px solid', borderColor: 'divider' }} />
                    ),
                  }}
                />
              </Stack>

              <Stack direction="row" spacing={2}>
                <Button type="submit" variant="contained" startIcon={<Save />} disabled={updateBrandingMut.isPending || !isDirty}>
                  {t('common.save')}
                </Button>
              </Stack>
              {updateBrandingMut.isSuccess && <Alert severity="success" sx={{ borderRadius: 2 }}>{t('common.saveSuccess')}</Alert>}
              {updateBrandingMut.isError && <Alert severity="error" sx={{ borderRadius: 2 }}>{t('common.operationFailed')}</Alert>}
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}