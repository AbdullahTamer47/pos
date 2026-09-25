import { useState, useCallback, useMemo } from 'react';
import {
  Autocomplete,
  TextField,
  InputAdornment,
  Box,
  Typography,
  Chip,
  Button,
  Stack,
  styled,
  alpha,
  useTheme,
  CircularProgress,
  autocompleteClasses,
} from '@mui/material';
import {
  Person as PersonIcon,
  Search as SearchIcon,
  PersonAdd as PersonAddIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { usePOSStore, type Customer } from '@/stores/posStore';
import api from '@/api/endpoints';

const StyledAutocomplete = styled(Autocomplete<Customer, false, true, false>)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 14,
    backgroundColor: theme.palette.action.hover,
    '& fieldset': {
      borderWidth: '1.5px',
    },
    '&:hover fieldset': {
      borderWidth: '1.5px',
    },
    '&.Mui-focused fieldset': {
      borderWidth: '2px',
    },
  },
  [`& .${autocompleteClasses.listbox}`]: {
    padding: theme.spacing(1),
    [`& .${autocompleteClasses.option}`]: {
      borderRadius: 10,
      margin: '2px 0',
      padding: '10px 12px',
    },
  },
}));

const TierBadge = styled(Chip)<{ tier: string }>(({ theme, tier }) => {
  const colors: Record<string, string> = {
    GOLD: theme.palette.warning.main,
    PLATINUM: theme.palette.secondary.main,
    SILVER: '#9E9E9E',
    REGULAR: theme.palette.text.secondary,
  };
  return {
    backgroundColor: alpha(colors[tier] || theme.palette.text.secondary, 0.12),
    color: colors[tier] || theme.palette.text.secondary,
    fontWeight: 600,
    fontSize: '0.75rem',
    height: 24,
    border: `1.5px solid ${alpha(colors[tier] || theme.palette.text.secondary, 0.3)}`,
  };
});

import { formatCurrency as formatCur } from '@smartpos/utils';

function formatCurrency(amount: number): string {
  return formatCur(amount, 'EGP');
}

interface CustomerSelectProps {
  value: Customer | undefined;
  onChange: (customer: Customer | null) => void;
}

export function CustomerSelect({ value, onChange }: CustomerSelectProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [inputValue, setInputValue] = useState('');

  const { data: customersData, isLoading } = useQuery({
    queryKey: ['customers', 'search', inputValue],
    queryFn: () => {
      if (inputValue.length < 2) {
        return api.customers.getCustomers({ page: 1, limit: 20 });
      }
      return api.customers.getCustomers({
        page: 1,
        limit: 20,
        search: inputValue,
      });
    },
    staleTime: 30000,
    enabled: inputValue.length >= 2 || inputValue.length === 0,
  });

  const customers = useMemo(() => {
    const rawList = Array.isArray(customersData)
      ? customersData
      : Array.isArray((customersData as any)?.data)
        ? (customersData as any).data
        : [];
    return rawList.filter(Boolean).map((c: any) => ({
      id: c.id as string,
      name: (c.fullName as string) || (c.name as string) || '',
      phone: c.phone as string,
      email: c.email as string,
      loyaltyPoints: Number(c.loyaltyPoints) || 0,
      creditLimit: Number(c.creditLimit) || 0,
      balance: Number(c.balance) || 0,
      tier: (c.tier as string) || 'REGULAR',
    })) as (Customer & { tier: string })[];
  }, [customersData]);

  const handleInputChange = useCallback((_e: React.SyntheticEvent, value: string) => {
    setInputValue(value);
  }, []);

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleQuickAdd = async () => {
    if (!quickName.trim()) return;
    setIsSaving(true);
    try {
      const created = await api.customers.createCustomer({
        name: quickName.trim(),
        phone: quickPhone.trim() || undefined,
      });
      const newCust: Customer = {
        id: created?.id || `cust-${Date.now()}`,
        name: created?.name || quickName.trim(),
        phone: created?.phone || quickPhone.trim(),
        balance: 0,
        creditLimit: 0,
        loyaltyPoints: 0,
      };
      onChange(newCust);
      setQuickAddOpen(false);
      setQuickName('');
      setQuickPhone('');
    } catch {
      const localCust: Customer = {
        id: `cust-${Date.now()}`,
        name: quickName.trim(),
        phone: quickPhone.trim() || undefined,
        balance: 0,
        creditLimit: 0,
        loyaltyPoints: 0,
      };
      onChange(localCust);
      setQuickAddOpen(false);
      setQuickName('');
      setQuickPhone('');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <StyledAutocomplete
        value={value}
        onChange={(_e, newValue) => onChange(newValue ?? null)}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        options={customers}
        getOptionLabel={(option) => {
          if (typeof option === 'string') return option;
          return `${option.name}${option.phone ? ` - ${option.phone}` : ''}`;
        }}
        getOptionKey={(option) => option.id}
        isOptionEqualToValue={(option, val) => option.id === val.id}
        loading={isLoading}
        noOptionsText={
          <Box sx={{ p: 1, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              لم يتم العثور على عميل
            </Typography>
            <Button
              size="small"
              startIcon={<PersonAddIcon />}
              variant="outlined"
              onClick={() => {
                setQuickName(inputValue);
                setQuickAddOpen(true);
              }}
            >
              إضافة عميل سريع
            </Button>
          </Box>
        }
        loadingText={t('common.loading')}
        filterOptions={(x) => x}
        renderInput={(params) => (
          <TextField
            {...params}
            size="small"
            placeholder={value ? value.name : 'زبون نقدي / عام (سوبرماركت)'}
            slotProps={{
              input: {
                ...params.InputProps,
                startAdornment: params.InputProps.startAdornment || (
                  <InputAdornment position="start">
                    <PersonIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    {isLoading ? <CircularProgress size={18} /> : null}
                    {params.InputProps.endAdornment}
                    <Chip
                      icon={<PersonAddIcon sx={{ fontSize: '1rem !important' }} />}
                      label="عميل جديد"
                      size="small"
                      clickable
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuickAddOpen(true);
                      }}
                      sx={{ borderRadius: 9999, fontSize: '0.72rem', height: 26, mr: 0.5 }}
                    />
                  </Stack>
                ),
              },
            }}
          />
        )}
        renderOption={(props, option) => {
          const { key, ...rest } = props;
          return (
            <Box component="li" key={key} {...rest}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {option.name}
                  </Typography>
                  {(option as Customer & { tier?: string }).tier && (
                    <TierBadge
                      label={(option as Customer & { tier?: string }).tier}
                      size="small"
                      tier={(option as Customer & { tier?: string }).tier || 'REGULAR'}
                      icon={<StarIcon sx={{ fontSize: '0.75rem !important' }} />}
                    />
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, mt: 0.25 }}>
                  {option.phone && (
                    <Typography variant="caption" color="text.secondary">
                      {option.phone}
                    </Typography>
                  )}
                  {(option.balance || option.balance === 0) && (
                    <Typography variant="caption" color={option.balance > 0 ? 'error' : 'text.secondary'}>
                      {t('customers.balance')}: {formatCurrency(option.balance)}
                    </Typography>
                  )}
                  {(option.loyaltyPoints || 0) > 0 && (
                    <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 600 }}>
                      ⭐ {option.loyaltyPoints} نقطة
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          );
        }}
        renderTags={() => null}
        fullWidth
        clearOnBlur
        autoComplete
        slotProps={{
          paper: {
            sx: {
              borderRadius: 14,
              boxShadow: theme.shadows[8],
            },
          },
        }}
      />

      {value && (value.loyaltyPoints || 0) > 0 && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            mt: 1,
            p: 1,
            px: 1.5,
            bgcolor: alpha(theme.palette.warning.main, 0.1),
            borderRadius: 2.5,
            border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
          }}
        >
          <Stack direction="row" spacing={0.75} alignItems="center">
            <StarIcon sx={{ color: 'warning.main', fontSize: '1.1rem' }} />
            <Typography variant="caption" fontWeight={700} color="warning.dark">
              نقاط ولاء العميل: {value.loyaltyPoints} نقطة (تعادل {(value.loyaltyPoints || 0) / 10} ج.م)
            </Typography>
          </Stack>
          <Chip
            size="small"
            color="warning"
            label="استبدال بخصم الفاتورة"
            clickable
            onClick={() => {
              const discountVal = (value.loyaltyPoints || 0) / 10;
              usePOSStore.getState().setInvoiceDiscount(discountVal, 'fixed');
            }}
            sx={{ fontWeight: 800, fontSize: '0.72rem', height: 24 }}
          />
        </Stack>
      )}

      {/* Quick Add Customer Dialog */}
      <Box component="div">
        {quickAddOpen && (
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: 'rgba(0,0,0,0.5)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 2,
            }}
            onClick={() => setQuickAddOpen(false)}
          >
            <Box
              sx={{
                bgcolor: 'background.paper',
                borderRadius: 4,
                p: 3,
                width: '100%',
                maxWidth: 400,
                boxShadow: 24,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Typography variant="h6" fontWeight={700} mb={2}>
                إضافة عميل سريع
              </Typography>
              <Stack spacing={2}>
                <TextField
                  autoFocus
                  label="اسم العميل *"
                  fullWidth
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  placeholder="اكتب اسم العميل أو اسم الشركة"
                />
                <TextField
                  label="رقم الهاتف (اختياري)"
                  fullWidth
                  value={quickPhone}
                  onChange={(e) => setQuickPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                />
                <Stack direction="row" spacing={1} justifyContent="flex-end" mt={1}>
                  <Button onClick={() => setQuickAddOpen(false)}>إلغاء</Button>
                  <Button
                    variant="contained"
                    onClick={handleQuickAdd}
                    disabled={!quickName.trim() || isSaving}
                  >
                    {isSaving ? 'جاري الحفظ...' : 'حفظ واختيار العميل'}
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Box>
        )}
      </Box>
    </>
  );
}