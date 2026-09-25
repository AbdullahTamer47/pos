import { useState, useMemo, useCallback } from 'react';
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
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  Stack,
  Divider,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  styled,
  alpha,
  useTheme,
  SelectChangeEvent,
} from '@mui/material';
import {
  Close as CloseIcon,
  Payments as CashIcon,
  CreditCard as CardIcon,
  AccountBalanceWallet as WalletIcon,
  CardGiftcard as GiftCardIcon,
  AccountBalance as CreditIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Print as PrintIcon,
  Receipt,
  CallSplit,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { type CartItem, type Payment, type Customer, type CartTotals } from '@/stores/posStore';
import api from '@/api/endpoints';

export interface SalePrintOptions {
  printThermal58: boolean;
  printThermal80: boolean;
  printA4: boolean;
  printWhatsApp: boolean;
}

const PaymentMethodButton = styled(ToggleButton)(({ theme }) => ({
  flexDirection: 'column',
  gap: theme.spacing(0.75),
  padding: theme.spacing(1.75),
  minWidth: 92,
  borderRadius: '20px !important',
  border: `1px solid ${theme.palette.outlineVariant || theme.palette.divider} !important`,
  transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
  '&.Mui-selected': {
    borderColor: `${theme.palette.primary.main} !important`,
    backgroundColor: `${alpha(theme.palette.primary.main, 0.14)} !important`,
    color: `${theme.palette.primary.main} !important`,
    transform: 'scale(1.02)',
  },
}));

const AmountInput = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 20,
    fontSize: '1.65rem',
    fontWeight: 800,
    backgroundColor: theme.palette.surfaceContainerLowest || theme.palette.background.paper,
    '& input': {
      textAlign: 'center',
      padding: '16px',
    },
    '& fieldset': {
      borderColor: theme.palette.outlineVariant || theme.palette.divider,
      borderWidth: '1.5px !important',
    },
    '&.Mui-focused fieldset': {
      borderColor: `${theme.palette.primary.main} !important`,
      borderWidth: '2px !important',
    },
  },
}));

const ChangeDisplay = styled(Box)(({ theme }) => ({
  backgroundColor: alpha(theme.palette.success.main, 0.12),
  borderRadius: 20,
  padding: theme.spacing(2.5),
  textAlign: 'center',
  border: `1px solid ${alpha(theme.palette.success.main, 0.4)}`,
  marginTop: theme.spacing(1.5),
}));

const PaymentChip = styled(Chip)(({ theme }) => ({
  height: 40,
  fontSize: '0.875rem',
  borderRadius: 9999, // Pill Chip
  fontWeight: 600,
  '& .MuiChip-deleteIcon': {
    fontSize: 18,
  },
}));

type PaymentMethod = 'cash' | 'card' | 'instapay' | 'wallet' | 'credit' | 'giftCard';

interface PaymentMethodOption {
  value: PaymentMethod;
  label: string;
  icon: React.ReactNode;
}

import { formatCurrency as formatCur } from '@smartpos/utils';

function formatCurrency(amount: number): string {
  return formatCur(amount, 'EGP');
}

function generatePaymentId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  totals: CartTotals;
  payments: Payment[];
  onAddPayment: (payment: Payment) => void;
  onRemovePayment: (paymentId: string) => void;
  onCompleteSale: (options: SalePrintOptions) => void;
  isProcessing: boolean;
  cart: CartItem[];
  selectedCustomer: Customer | null;
  lastInvoiceNumber: string;
}

export function PaymentModal({
  open,
  onClose,
  totals,
  payments,
  onAddPayment,
  onRemovePayment,
  onCompleteSale,
  isProcessing,
  cart,
  selectedCustomer,
  lastInvoiceNumber,
}: PaymentModalProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const [activeMethod, setActiveMethod] = useState<PaymentMethod>('cash');
  const [amountInput, setAmountInput] = useState('');
  const [referenceInput, setReferenceInput] = useState('');
  const [splitMode, setSplitMode] = useState(false);
  const [printThermal58, setPrintThermal58] = useState(true);
  const [printThermal80, setPrintThermal80] = useState(false);
  const [printA4, setPrintA4] = useState(false);
  const [printWhatsApp, setPrintWhatsApp] = useState(false);
  const [giftCardCheckResult, setGiftCardCheckResult] = useState<{ valid?: boolean; balance?: number; message?: string } | null>(null);
  const [checkingCard, setCheckingCard] = useState(false);

  const paymentMethods: PaymentMethodOption[] = useMemo(() => [
    { value: 'cash', label: 'كاش نقدي', icon: <CashIcon /> },
    { value: 'card', label: 'ميزة / فيزا', icon: <CardIcon /> },
    { value: 'instapay', label: 'إنستاباي InstaPay', icon: <WalletIcon /> },
    { value: 'wallet', label: 'فودافون كاش / محفظة', icon: <WalletIcon /> },
    { value: 'credit', label: 'آجل (شكك على الحساب)', icon: <CreditIcon /> },
    { value: 'giftCard', label: 'بطاقة هدايا (Gift Card)', icon: <GiftCardIcon /> },
  ], []);

  const remaining = useMemo(() => {
    return Math.max(0, totals.grandTotal - totals.totalPaid);
  }, [totals.grandTotal, totals.totalPaid]);

  const isFullyPaid = useMemo(() => {
    return totals.totalPaid >= totals.grandTotal;
  }, [totals.totalPaid, totals.grandTotal]);

  const cashAmount = useMemo(() => {
    if (activeMethod !== 'cash') return 0;
    const val = parseFloat(amountInput);
    return isNaN(val) ? 0 : val;
  }, [activeMethod, amountInput]);

  const cashChange = useMemo(() => {
    if (activeMethod !== 'cash' || cashAmount <= 0) return 0;
    return Math.max(0, cashAmount - remaining);
  }, [activeMethod, cashAmount, remaining]);

  const handleValidateCard = async () => {
    if (!referenceInput.trim()) return;
    setCheckingCard(true);
    try {
      const res = await api.giftCards.validateGiftCard(referenceInput.trim());
      setGiftCardCheckResult(res);
      if (res.valid && (res.balance || 0) > 0) {
        const toPay = Math.min(res.balance || 0, remaining);
        setAmountInput(String(toPay));
      }
    } catch {
      setGiftCardCheckResult({ valid: false, balance: 0, message: 'فشل التحقق من البطاقة' });
    } finally {
      setCheckingCard(false);
    }
  };

  const handleAddPayment = useCallback(() => {
    const amount = parseFloat(amountInput);
    if (isNaN(amount) || amount <= 0) return;

    const paymentAmount = Math.min(amount, remaining);
    const payment: Payment = {
      id: generatePaymentId(),
      method: activeMethod,
      amount: paymentAmount,
      reference: referenceInput || undefined,
      cardNumber: activeMethod === 'card' ? referenceInput : undefined,
      giftCardCode: activeMethod === 'giftCard' ? referenceInput : undefined,
    };

    onAddPayment(payment);
    setAmountInput('');
    setReferenceInput('');
    setGiftCardCheckResult(null);

    if (isFullyPaid) {
      setSplitMode(false);
    }
  }, [amountInput, referenceInput, activeMethod, remaining, onAddPayment, isFullyPaid]);

  const handleMethodChange = useCallback((_e: React.MouseEvent<HTMLElement>, value: PaymentMethod | null) => {
    if (value) {
      setActiveMethod(value);
      setAmountInput('');
      setReferenceInput('');
    }
  }, []);

  const quickAmount = useCallback((amount: number) => {
    setAmountInput(String(amount));
  }, []);

  const quickAmounts = useMemo(() => {
    if (remaining <= 0) return [];
    const amounts: number[] = [remaining];
    if (remaining > 5) amounts.push(5);
    if (remaining > 10) amounts.push(10);
    if (remaining > 20) amounts.push(20);
    if (remaining > 50) amounts.push(50);
    if (remaining > 100) amounts.push(100);
    if (remaining > 500) amounts.push(500);
    return [...new Set(amounts)].sort((a, b) => a - b);
  }, [remaining]);

  const handleCompleteSale = useCallback(() => {
    if (!isFullyPaid && remaining > 0) {
      const remainingPayment: Payment = {
        id: generatePaymentId(),
        method: activeMethod,
        amount: remaining,
        reference: referenceInput || undefined,
        cardNumber: activeMethod === 'card' ? referenceInput : undefined,
        giftCardCode: activeMethod === 'giftCard' ? referenceInput : undefined,
      };
      onAddPayment(remainingPayment);
    }
    onCompleteSale({
      printThermal58,
      printThermal80,
      printA4,
      printWhatsApp,
    });
  }, [isFullyPaid, remaining, activeMethod, referenceInput, onAddPayment, onCompleteSale, printThermal58, printThermal80, printA4, printWhatsApp]);

  const handleClose = useCallback(() => {
    if (!isProcessing) {
      onClose();
    }
  }, [isProcessing, onClose]);

  const renderPaymentInput = () => {
    switch (activeMethod) {
      case 'cash':
        return (
          <Box>
            <AmountInput
              fullWidth
              type="number"
              placeholder="0.00"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              autoFocus
              slotProps={{ htmlInput: { min: 0, step: 0.01, inputMode: 'decimal' } }}
            />
            {quickAmounts.length > 0 && (
              <Box sx={{ display: 'flex', gap: 0.5, mt: 1.5, flexWrap: 'wrap' }}>
                {quickAmounts.map((amt) => (
                  <Chip
                    key={amt}
                    label={formatCurrency(amt)}
                    clickable
                    variant="outlined"
                    size="small"
                    onClick={() => quickAmount(amt)}
                    color={Math.abs(amt - remaining) < 0.01 ? 'primary' : 'default'}
                  />
                ))}
              </Box>
            )}
            {cashChange > 0 && (
              <ChangeDisplay>
                <Typography variant="body2" color="text.secondary">
                  {t('pos.change')}
                </Typography>
                <Typography variant="h5" fontWeight={700} color="success.main">
                  {formatCurrency(cashChange)}
                </Typography>
              </ChangeDisplay>
            )}
          </Box>
        );
      case 'instapay':
        return (
          <Stack spacing={2}>
            <AmountInput
              fullWidth
              type="number"
              placeholder="0.00"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              autoFocus
              slotProps={{ htmlInput: { min: 0, step: 0.01, inputMode: 'decimal' } }}
            />
            <TextField
              fullWidth
              label="الرقم المرجعي لتحويل إنستاباي (InstaPay Ref Number)"
              value={referenceInput}
              onChange={(e) => setReferenceInput(e.target.value)}
              placeholder="مثال: IP-9823412"
            />
          </Stack>
        );
      case 'wallet':
        return (
          <Stack spacing={2}>
            <AmountInput
              fullWidth
              type="number"
              placeholder="0.00"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              autoFocus
              slotProps={{ htmlInput: { min: 0, step: 0.01, inputMode: 'decimal' } }}
            />
            <TextField
              fullWidth
              label="رقم المحفظة / الرقم المرجعي (فودافون كاش / أورنج / اتصالات / وي)"
              value={referenceInput}
              onChange={(e) => setReferenceInput(e.target.value)}
              placeholder="مثال: 01012345678"
            />
          </Stack>
        );
      case 'card':
        return (
          <Stack spacing={2}>
            <AmountInput
              fullWidth
              type="number"
              placeholder="0.00"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              autoFocus
              slotProps={{ htmlInput: { min: 0, step: 0.01, inputMode: 'decimal' } }}
            />
            <TextField
              fullWidth
              label="رقم العملية / بطاقة ميزة أو فيزا"
              value={referenceInput}
              onChange={(e) => setReferenceInput(e.target.value)}
              placeholder="مثال: 123456"
            />
          </Stack>
        );
      case 'credit':
        return (
          <Stack spacing={2}>
            <AmountInput
              fullWidth
              type="number"
              placeholder="0.00"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              autoFocus
              slotProps={{ htmlInput: { min: 0, step: 0.01, inputMode: 'decimal' } }}
            />
            {selectedCustomer ? (
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.08) }}>
                <Typography variant="body2" fontWeight={600}>
                  العميل: {selectedCustomer.name}
                </Typography>
                <Typography variant="body2" color="error.main">
                  المديونية الحالية: {formatCurrency(selectedCustomer.balance || 0)}
                </Typography>
                {selectedCustomer.creditLimit ? (
                  <Typography variant="caption" color="text.secondary">
                    الحد الائتماني: {formatCurrency(selectedCustomer.creditLimit)}
                  </Typography>
                ) : null}
              </Box>
            ) : (
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.warning.main, 0.1) }}>
                <Typography variant="body2" color="warning.main" fontWeight={600}>
                  ⚠️ تنبيه: البيع الآجل يتطلب اختيار عميل مسجل لتسجيل المديونية على حسابه.
                </Typography>
              </Box>
            )}
          </Stack>
        );
      case 'giftCard':
        return (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1}>
              <TextField
                fullWidth
                label="كود بطاقة الهدية (Gift Card Code)"
                value={referenceInput}
                onChange={(e) => {
                  setReferenceInput(e.target.value.toUpperCase());
                  setGiftCardCheckResult(null);
                }}
                placeholder="مثال: GIFT-100 أو GIFT-250"
              />
              <Button
                variant="outlined"
                onClick={handleValidateCard}
                disabled={!referenceInput.trim() || checkingCard}
                sx={{ minWidth: 100, borderRadius: 3 }}
              >
                {checkingCard ? 'فحص...' : 'فحص الرصيد'}
              </Button>
            </Stack>

            {giftCardCheckResult && (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: giftCardCheckResult.valid ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.error.main, 0.1),
                  border: `1px solid ${giftCardCheckResult.valid ? alpha(theme.palette.success.main, 0.3) : alpha(theme.palette.error.main, 0.3)}`,
                }}
              >
                <Typography variant="body2" color={giftCardCheckResult.valid ? 'success.main' : 'error.main'} fontWeight={600}>
                  {giftCardCheckResult.message}
                </Typography>
                {giftCardCheckResult.valid && (
                  <Typography variant="body2" fontWeight={700}>
                    الرصيد المتاح بالبطاقة: {formatCurrency(giftCardCheckResult.balance || 0)}
                  </Typography>
                )}
              </Box>
            )}

            <AmountInput
              fullWidth
              type="number"
              placeholder="0.00"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              slotProps={{ htmlInput: { min: 0, step: 0.01, inputMode: 'decimal' } }}
            />
          </Stack>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '28px', // M3 Expressive Dialog Radius
          maxHeight: '90vh',
          boxShadow: theme.shadows[8],
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Receipt />
          <Typography variant="h6" fontWeight={600}>
            {t('pos.completeSale')}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} disabled={isProcessing} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" fontWeight={700} color="primary">
            {formatCurrency(totals.grandTotal)}
          </Typography>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2" color="text.secondary">
              {t('pos.paid')}: {formatCurrency(totals.totalPaid)}
            </Typography>
            {remaining > 0 && (
              <Typography variant="body2" color="error" fontWeight={600}>
                {t('pos.balance')}: {formatCurrency(remaining)}
              </Typography>
            )}
          </Box>
        </Box>

        {payments.length > 0 && (
          <Box sx={{ mb: 2, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {payments.map((p) => (
              <PaymentChip
                key={p.id}
                label={`${p.method} - ${formatCurrency(p.amount)}${p.reference ? ` (${p.reference})` : ''}`}
                onDelete={() => onRemovePayment(p.id)}
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>
        )}

        {!isFullyPaid && (
          <>
            <ToggleButtonGroup
              value={activeMethod}
              exclusive
              onChange={handleMethodChange}
              sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, width: '100%', mb: 2 }}
            >
              {paymentMethods.map((m) => (
                <PaymentMethodButton key={m.value} value={m.value}>
                  {m.icon}
                  <Typography variant="caption" fontWeight={600}>
                    {m.label}
                  </Typography>
                </PaymentMethodButton>
              ))}
            </ToggleButtonGroup>

            <Box sx={{ mb: 2 }}>
              {renderPaymentInput()}
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                fullWidth
                onClick={handleAddPayment}
                disabled={!amountInput || parseFloat(amountInput) <= 0}
                startIcon={<AddIcon />}
                sx={{ minHeight: 48, borderRadius: 12 }}
              >
                {t('pos.addPayment')}
              </Button>
              <Button
                variant="outlined"
                onClick={() => setSplitMode(!splitMode)}
                startIcon={<CallSplit />}
                sx={{ minHeight: 48, borderRadius: 12, minWidth: 48 }}
              >
                {t('pos.splitPayment')}
              </Button>
            </Box>
          </>
        )}

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
          {t('pos.printReceipt')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <FormControlLabel
            control={
              <Checkbox checked={printThermal58} onChange={(e) => setPrintThermal58(e.target.checked)} />
            }
            label="Thermal 58mm"
          />
          <FormControlLabel
            control={
              <Checkbox checked={printThermal80} onChange={(e) => setPrintThermal80(e.target.checked)} />
            }
            label="Thermal 80mm"
          />
          <FormControlLabel
            control={
              <Checkbox checked={printA4} onChange={(e) => setPrintA4(e.target.checked)} />
            }
            label="A4"
          />
          <FormControlLabel
            control={
              <Checkbox checked={printWhatsApp} onChange={(e) => setPrintWhatsApp(e.target.checked)} />
            }
            label="WhatsApp"
          />
        </Box>

        {lastInvoiceNumber && (
          <Box sx={{ mt: 2, p: 2, bgcolor: alpha(theme.palette.success.main, 0.08), borderRadius: 2 }}>
            <Typography variant="body2" color="success.main" fontWeight={600}>
              {t('pos.invoiceNumber')}: {lastInvoiceNumber}
            </Typography>
          </Box>
        )}

        <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.06), display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            {t('pos.items')}: <strong>{cart.length}</strong>
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('pos.subtotal')}: <strong>{formatCurrency(totals.subtotal)}</strong>
          </Typography>
          {totals.totalDiscount > 0 && (
            <Typography variant="caption" color="error.main" fontWeight={700}>
              {t('pos.discount')}: -{formatCurrency(totals.totalDiscount)}
            </Typography>
          )}
          {totals.totalTax > 0 && (
            <Typography variant="caption" color="text.secondary">
              ضريبة (14%): <strong>{formatCurrency(totals.totalTax)}</strong>
            </Typography>
          )}
          {totals.deliveryFee > 0 && (
            <Typography variant="caption" color="primary.main" fontWeight={700}>
              توصيل: +{formatCurrency(totals.deliveryFee)}
            </Typography>
          )}
          {selectedCustomer && (
            <Typography variant="caption" color="text.secondary">
              {t('pos.customer')}: <strong>{selectedCustomer.name}</strong>
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 1.5 }}>
        <Button
          onClick={handleClose}
          disabled={isProcessing}
          sx={{ minHeight: 48, borderRadius: 9999, px: 3, fontWeight: 600 }}
        >
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={handleCompleteSale}
          disabled={isProcessing || totals.grandTotal <= 0}
          startIcon={isProcessing ? undefined : <Receipt />}
          sx={{
            minHeight: 52,
            borderRadius: 9999,
            flex: 1,
            fontWeight: 800,
            fontSize: '1.05rem',
            boxShadow: theme.shadows[3],
            '&:hover': {
              boxShadow: theme.shadows[5],
            },
          }}
        >
          {isProcessing ? t('pos.processing') : t('pos.completeSale')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}