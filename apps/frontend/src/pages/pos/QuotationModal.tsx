import { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  TextField,
  Stack,
  Divider,
  Paper,
  styled,
  alpha,
  useTheme,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  Description as QuoteIcon,
  Print as PrintIcon,
  Save as SaveIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { type CartItem, type Customer } from '@/stores/posStore';
import { formatCurrency } from '@smartpos/utils';
import api from '@/api/endpoints';

const SummaryItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(1, 0),
  borderBottom: `1px dashed ${theme.palette.divider}`,
  '&:last-child': {
    borderBottom: 'none',
  },
}));

interface QuotationModalProps {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  customer: Customer | null;
  totals: {
    subtotal: number;
    totalDiscount: number;
    totalTax: number;
    grandTotal: number;
  };
  onQuotationCreated: (quotation: Record<string, unknown>, printNow: boolean) => void;
}

export function QuotationModal({
  open,
  onClose,
  cart,
  customer,
  totals,
  onQuotationCreated,
}: QuotationModalProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [customerName, setCustomerName] = useState(customer?.name || '');
  const [customerPhone, setCustomerPhone] = useState(customer?.phone || '');
  const [notes, setNotes] = useState('');
  const [validityDays, setValidityDays] = useState('15');
  const [error, setError] = useState('');

  useEffect(() => {
    if (customer) {
      setCustomerName(customer.name || '');
      setCustomerPhone(customer.phone || '');
    }
  }, [customer]);

  const createQuotationMutation = useMutation({
    mutationFn: async (printNow: boolean) => {
      if (!customerName.trim()) {
        throw new Error('يرجى إدخال اسم العميل لحفظ عرض السعر / الاستفسار');
      }

      const payload = {
        type: 'QUOTATION',
        status: 'QUOTATION',
        customerId: customer?.id || null,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        subtotal: totals.subtotal,
        discountAmount: totals.totalDiscount,
        taxAmount: totals.totalTax,
        grandTotal: totals.grandTotal,
        notes: notes ? `${notes} (ساري لمدة ${validityDays} يوم)` : `ساري لمدة ${validityDays} يوم من تاريخه`,
        items: cart.map((item) => {
          const lineTotal = item.unitPrice * item.quantity;
          const itemDiscount = item.discount || 0;
          const discountAmt =
            item.discountType === 'percentage'
              ? (lineTotal * itemDiscount) / 100
              : itemDiscount;
          const afterDisc = Math.max(0, lineTotal - discountAmt);
          const taxRate = typeof item.taxRate === 'number' ? item.taxRate : 14;
          const taxAmt = (afterDisc * taxRate) / 100;
          return {
            productId: item.product.id || item.id,
            productName: item.product.name,
            productSku: item.product.sku,
            variantId: item.variant?.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPercent: item.discountType === 'percentage' ? itemDiscount : 0,
            discountAmount: discountAmt,
            taxRate: taxRate,
            taxAmount: taxAmt,
            costPrice: item.product.costPrice,
          };
        }),
      };

      const res = await api.invoices.createInvoice(payload);
      return { res, printNow };
    },
    onSuccess: ({ res, printNow }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('تم حفظ عرض الأسعار / الاستفسار بنجاح!');
      onQuotationCreated(res as unknown as Record<string, unknown>, printNow);
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'فشل حفظ عرض السعر';
      setError(msg);
      toast.error(msg);
    },
  });

  const handleSave = useCallback(
    (printNow: boolean) => {
      setError('');
      createQuotationMutation.mutate(printNow);
    },
    [createQuotationMutation]
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 4, overflow: 'hidden' },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: alpha(theme.palette.primary.main, 0.06),
          borderBottom: `1px solid ${theme.palette.divider}`,
          py: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <QuoteIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>
            تسجيل استفسار / إصدار عرض أسعار رسمي
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 3 }}>
        <Stack spacing={2.5}>
          {error && <Alert severity="error">{error}</Alert>}

          <Alert severity="info" sx={{ borderRadius: 3 }}>
            يتم تسجيل استفسار العميل وحفظ الأصناف والأسعار في النظام للرجوع إليها في أي وقت وتحويلها إلى فاتورة بيع مباشرة عند عودة العميل.
          </Alert>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              label="اسم العميل المستفسر *"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="مثال: أحمد محمود"
              fullWidth
              slotProps={{
                input: {
                  startAdornment: <PersonIcon sx={{ color: 'text.secondary', mr: 1 }} fontSize="small" />,
                },
              }}
            />
            <TextField
              label="رقم هاتف العميل (للبحث لاحقاً)"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="01012345678"
              fullWidth
              slotProps={{
                input: {
                  startAdornment: <PhoneIcon sx={{ color: 'text.secondary', mr: 1 }} fontSize="small" />,
                },
              }}
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              label="مدة صلاحية العرض (أيام)"
              type="number"
              value={validityDays}
              onChange={(e) => setValidityDays(e.target.value)}
              fullWidth
              slotProps={{
                input: {
                  startAdornment: <CalendarIcon sx={{ color: 'text.secondary', mr: 1 }} fontSize="small" />,
                },
              }}
            />
            <TextField
              label="ملاحظات العميل / شروط التسعير"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: استفسار عن سعر الأجهزة مع التوصيل"
              fullWidth
            />
          </Box>

          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 3,
              backgroundColor: alpha(theme.palette.background.default, 0.6),
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              الأصناف المشمولة في الاستفسار ({cart.length}):
            </Typography>
            <Stack spacing={0.5} sx={{ maxHeight: 180, overflowY: 'auto', pr: 1 }}>
              {cart.map((item) => (
                <SummaryItem key={item.id}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {item.product.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.quantity} × {formatCurrency(item.unitPrice, 'EGP')}
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={700} color="primary">
                    {formatCurrency(item.unitPrice * item.quantity, 'EGP')}
                  </Typography>
                </SummaryItem>
              ))}
            </Stack>

            <Divider sx={{ my: 1.5 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" fontWeight={700}>
                إجمالي عرض السعر:
              </Typography>
              <Typography variant="h6" fontWeight={800} color="primary">
                {formatCurrency(totals.grandTotal, 'EGP')}
              </Typography>
            </Box>
          </Paper>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${theme.palette.divider}`, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" color="inherit">
          إلغاء
        </Button>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={() => handleSave(false)}
          disabled={createQuotationMutation.isPending || !customerName.trim()}
        >
          حفظ الاستفسار فقط
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<PrintIcon />}
          onClick={() => handleSave(true)}
          disabled={createQuotationMutation.isPending || !customerName.trim()}
          sx={{ fontWeight: 700, px: 3 }}
        >
          حفظ وطباعة عرض السعر
        </Button>
      </DialogActions>
    </Dialog>
  );
}
