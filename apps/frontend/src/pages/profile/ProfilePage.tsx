import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  Button,
  Avatar,
  Stack,
  Divider,
  Skeleton,
  Alert,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Person,
  Email,
  Phone,
  Business,
  Shield,
  Lock,
  Badge,
} from '@mui/icons-material';
import { useAuthStore } from '@/stores/authStore';
import api from '@/api/endpoints';

const profileSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
}) {
  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ py: 1.5 }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
          color: 'primary.main',
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={600} noWrap>
          {value || '—'}
        </Typography>
      </Box>
    </Stack>
  );
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [pwError, setPwError] = useState('');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.auth.getProfile() as Promise<Record<string, unknown>>,
    staleTime: 60000,
  });

  const updateProfileMut = useMutation({
    mutationFn: (data: { fullName: string; phone?: string }) =>
      api.users.updateUser(user?.id ?? '', {
        fullName: data.fullName,
        phone: data.phone,
      }),
    meta: { successMsg: t('profile.updated') || 'Profile updated successfully' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      if (user) {
        updateUser({ fullName: form.getValues('fullName') });
      }
    },
  });

  const changePwMut = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.auth.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }),
    meta: { successMsg: t('profile.passwordChanged') || 'Password changed successfully' },
    onSuccess: () => {
      setPwError('');
      pwForm.reset();
    },
    onError: (err: unknown) => {
      setPwError((err as Error)?.message || 'Failed to change password');
    },
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName ?? '',
      phone: (profile as { phone?: string } | undefined)?.phone ?? '',
    },
  });

  const pwForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const roleLabel = user?.role
    ? t(`roles.${user.role.toLowerCase()}`) || user.role
    : '';

  useEffect(() => {
    if (profile) {
      form.reset({
        fullName: (profile.fullName as string) || user?.fullName || '',
        phone: (profile.phone as string) || '',
      });
    }
  }, [profile, form, user]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 4 }}>
        {t('nav.profile') || 'My Profile'}
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ borderRadius: 4, textAlign: 'center' }}>
            <CardContent sx={{ p: 3 }}>
              {isLoading ? (
                <Stack spacing={2} alignItems="center">
                  <Skeleton variant="circular" width={100} height={100} />
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="40%" />
                </Stack>
              ) : (
                <>
                  <Avatar
                    src={user?.avatar}
                    sx={{
                      width: 100,
                      height: 100,
                      mx: 'auto',
                      mb: 2,
                      bgcolor: theme.palette.primary.main,
                      fontSize: '2rem',
                      fontWeight: 700,
                    }}
                  >
                    {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                  </Avatar>
                  <Typography variant="h6" fontWeight={700}>
                    {user?.fullName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {user?.email}
                  </Typography>
                  <Chip
                    label={roleLabel}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                </>
              )}
              <Divider sx={{ my: 2 }} />
              <InfoRow
                icon={<Badge />}
                label={t('profile.role') || 'Role'}
                value={roleLabel}
              />
              <InfoRow
                icon={<Business />}
                label={t('profile.tenant') || 'Tenant'}
                value={(profile?.tenantId as string) || user?.tenantId}
              />
              <InfoRow
                icon={<Shield />}
                label={t('profile.status') || 'Status'}
                value={user?.isActive ? 'Active' : 'Inactive'}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={3}>
            <Card sx={{ borderRadius: 4 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
                  {t('profile.editProfile') || 'Edit Profile'}
                </Typography>
                {isLoading ? (
                  <Stack spacing={2}>
                    <Skeleton variant="rounded" height={56} />
                    <Skeleton variant="rounded" height={56} />
                    <Skeleton variant="rounded" width={120} height={40} />
                  </Stack>
                ) : (
                  <Box
                    component="form"
                    onSubmit={form.handleSubmit((data) => updateProfileMut.mutate(data))}
                  >
                    <Stack spacing={2}>
                      <TextField
                        fullWidth
                        label={t('profile.fullName') || 'Full Name'}
                        error={!!form.formState.errors.fullName}
                        helperText={form.formState.errors.fullName?.message}
                        {...form.register('fullName')}
                      />
                      <TextField
                        fullWidth
                        label={t('profile.phone') || 'Phone'}
                        {...form.register('phone')}
                      />
                      <TextField
                        fullWidth
                        label={t('profile.email') || 'Email'}
                        value={user?.email ?? ''}
                        disabled
                        helperText={t('profile.emailDisabled') || 'Email cannot be changed'}
                      />
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={updateProfileMut.isPending}
                        sx={{ alignSelf: 'flex-start', borderRadius: 2, minWidth: 120 }}
                      >
                        {updateProfileMut.isPending
                          ? t('common.saving') || 'Saving...'
                          : t('common.save') || 'Save'}
                      </Button>
                    </Stack>
                  </Box>
                )}
              </CardContent>
            </Card>

            <Card sx={{ borderRadius: 4 }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
                  <Lock color="action" />
                  <Typography variant="h6" fontWeight={700}>
                    {t('profile.changePassword') || 'Change Password'}
                  </Typography>
                </Stack>
                {pwError && (
                  <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                    {pwError}
                  </Alert>
                )}
                <Box
                  component="form"
                  onSubmit={pwForm.handleSubmit((data) => changePwMut.mutate(data))}
                >
                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      type="password"
                      label={t('profile.currentPassword') || 'Current Password'}
                      error={!!pwForm.formState.errors.currentPassword}
                      helperText={pwForm.formState.errors.currentPassword?.message}
                      {...pwForm.register('currentPassword')}
                    />
                    <TextField
                      fullWidth
                      type="password"
                      label={t('profile.newPassword') || 'New Password'}
                      error={!!pwForm.formState.errors.newPassword}
                      helperText={pwForm.formState.errors.newPassword?.message}
                      {...pwForm.register('newPassword')}
                    />
                    <TextField
                      fullWidth
                      type="password"
                      label={t('profile.confirmPassword') || 'Confirm New Password'}
                      error={!!pwForm.formState.errors.confirmPassword}
                      helperText={pwForm.formState.errors.confirmPassword?.message}
                      {...pwForm.register('confirmPassword')}
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      disabled={changePwMut.isPending}
                      sx={{ alignSelf: 'flex-start', borderRadius: 2, minWidth: 180 }}
                    >
                      {changePwMut.isPending
                        ? t('common.saving') || 'Saving...'
                        : t('profile.changePassword') || 'Change Password'}
                    </Button>
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
