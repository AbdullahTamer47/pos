import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  Box,
  IconButton,
  Card,
  CardContent,
  Divider,
  Grid,
  Alert,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  PointOfSale as ShiftIcon,
  LockOpen as OpenIcon,
  Lock as CloseShiftIcon,
  MoneyOff as ExpenseIcon,
  ReceiptLong as ZReportIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/api/endpoints';
import { formatCurrency } from '@smartpos/utils';

interface ShiftModalProps {
  open: boolean;
  onClose: () => void;
}

export function ShiftModal({ open, onClose }: ShiftModalProps) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'status' | 'open' | 'close' | 'expense'>('status');

  // Form states
  const [openingCash, setOpeningCash] = useState('0');
  const [openNotes, setOpenNotes] = useState('');
  const [actualCash, setActualCash] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('نثريات / ضيافة');
  const [expenseDesc, setExpenseDesc] = useState('');

  // Fetch current shift
  const { data: currentShift, isLoading, refetch } = useQuery({
    queryKey: ['shifts', 'current'],
    queryFn: async () => {
      try {
        const res = await api.shifts.getCurrentShift();
        return res as Record<string, any> | null;
      } catch {
        return null;
      }
    },
    enabled: open,
  });

  // Open Shift Mutation
  const openShiftMutation = useMutation({
    mutationFn: async () => {
      return api.shifts.openShift({
        openingCash: parseFloat(openingCash) || 0,
        notes: openNotes,
      });
    },
    onSuccess: () => {
      toast.success('تم فتح الوردية بنجاح');
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      refetch();
      setTab('status');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'حدث خطأ أثناء فتح الوردية');
    },
  });

  // Close Shift Mutation
  const closeShiftMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      return api.shifts.closeShift(shiftId, {
        actualCash: parseFloat(actualCash) || 0,
        closingNote: closeNotes,
      });
    },
    onSuccess: () => {
      toast.success('تم إغلاق الوردية وحفظ تقرير Z-Report بنجاح');
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      refetch();
      setTab('status');
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'حدث خطأ أثناء إغلاق الوردية');
    },
  });

  // Add Expense Mutation
  const addExpenseMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      return api.shifts.addExpense(shiftId, {
        amount: parseFloat(expenseAmount) || 0,
        category: expenseCategory,
        description: expenseDesc,
      });
    },
    onSuccess: () => {
      toast.success('تم تسجيل المصروف من الدرج بنجاح');
      setExpenseAmount('');
      setExpenseDesc('');
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      refetch();
      setTab('status');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'حدث خطأ أثناء تسجيل المصروف');
    },
  });

  const summary = currentShift?.summary;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShiftIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            إدارة وردية الكاشير وتقفيل الدرج
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : !currentShift ? (
          <Box sx={{ py: 2, textAlign: 'center' }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              لا توجد وردية مفتوحة حالياً لهذا الكاشير. يرجى فتح وردية للبدء في البيع.
            </Alert>
            <Stack spacing={2} sx={{ maxWidth: 400, mx: 'auto', textAlign: 'right' }}>
              <TextField
                fullWidth
                type="number"
                label="العهدة الافتتاحية في الدرج (الفكة) - اختياري (افتراضياً 0)"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">ج.م</InputAdornment>,
                  },
                  htmlInput: { min: 0 },
                }}
              />
              <TextField
                fullWidth
                label="ملاحظات / اسم الوردية (اختياري)"
                value={openNotes}
                onChange={(e) => setOpenNotes(e.target.value)}
                placeholder="مثال: وردية صباحية"
              />
              <Button
                variant="contained"
                size="large"
                startIcon={<OpenIcon />}
                onClick={() => openShiftMutation.mutate()}
                disabled={openShiftMutation.isPending}
                sx={{ borderRadius: 2, fontWeight: 700, py: 1.5 }}
              >
                فتح الوردية والبدء 🚀
              </Button>
            </Stack>
          </Box>
        ) : tab === 'close' ? (
          <Box sx={{ py: 1 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              تقفيل الوردية وإصدار تقرير (Z-Report)
            </Typography>
            <Alert severity="warning" sx={{ mb: 2 }}>
              الكاش المتوقع في الدرج: <strong>{formatCurrency(summary?.expectedCash || 0, 'EGP')}</strong>
            </Alert>
            <Stack spacing={2}>
              <TextField
                autoFocus
                fullWidth
                type="number"
                label="الكاش الفعلي في الدرج بعد العد"
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">ج.م</InputAdornment>,
                  },
                }}
              />
              {actualCash && (
                <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    الفارق (عجز / زيادة):
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    color={
                      parseFloat(actualCash) - (summary?.expectedCash || 0) >= 0
                        ? 'success.main'
                        : 'error.main'
                    }
                  >
                    {formatCurrency(parseFloat(actualCash) - (summary?.expectedCash || 0), 'EGP')}
                  </Typography>
                </Box>
              )}
              <TextField
                fullWidth
                multiline
                rows={2}
                label="ملاحظات الإغلاق والتسليم"
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button onClick={() => setTab('status')} sx={{ borderRadius: 2 }}>
                  رجوع
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  fullWidth
                  onClick={() => closeShiftMutation.mutate(currentShift.id)}
                  disabled={!actualCash || closeShiftMutation.isPending}
                  sx={{ borderRadius: 2, fontWeight: 700 }}
                >
                  تأكيد إغلاق الوردية وتسليم الدرج 🔒
                </Button>
              </Box>
            </Stack>
          </Box>
        ) : tab === 'expense' ? (
          <Box sx={{ py: 1 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              تسجيل مصروف نثري من الدرج
            </Typography>
            <Stack spacing={2}>
              <TextField
                autoFocus
                fullWidth
                type="number"
                label="المبلغ"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">ج.م</InputAdornment>,
                  },
                }}
              />
              <TextField
                fullWidth
                label="نوع المصروف"
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
                placeholder="نثريات، شاي، نظافة، صيانة"
              />
              <TextField
                fullWidth
                label="بيان / تفاصيل"
                value={expenseDesc}
                onChange={(e) => setExpenseDesc(e.target.value)}
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button onClick={() => setTab('status')} sx={{ borderRadius: 2 }}>
                  رجوع
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => addExpenseMutation.mutate(currentShift.id)}
                  disabled={!expenseAmount || parseFloat(expenseAmount) <= 0 || addExpenseMutation.isPending}
                  sx={{ borderRadius: 2, fontWeight: 700 }}
                >
                  حفظ المصروف 💸
                </Button>
              </Box>
            </Stack>
          </Box>
        ) : (
          <Box sx={{ py: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  رقم الوردية: {currentShift.shiftNumber}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  الكاشير: {currentShift.cashier?.name} | بدأت:{' '}
                  {new Date(currentShift.openingTime).toLocaleTimeString('ar-EG', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                color="secondary"
                size="small"
                startIcon={<ExpenseIcon />}
                onClick={() => setTab('expense')}
                sx={{ borderRadius: 2 }}
              >
                مصروف من الدرج
              </Button>
            </Box>

            <Grid container spacing={1.5} sx={{ mb: 2 }}>
              <Grid size={{ xs: 6 }}>
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" color="text.secondary">
                      العهدة الافتتاحية
                    </Typography>
                    <Typography variant="h6" fontWeight={700}>
                      {formatCurrency(summary?.openingCash || 0, 'EGP')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 6 }}>
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" color="text.secondary">
                      مبيعات الكاش النقدية
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color="success.main">
                      {formatCurrency(summary?.cashSales || 0, 'EGP')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 6 }}>
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" color="text.secondary">
                      مبيعات إنستاباي والمحافظ
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color="primary.main">
                      {formatCurrency((summary?.instapaySales || 0) + (summary?.walletSales || 0), 'EGP')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 6 }}>
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" color="text.secondary">
                      المصروفات النثرية
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color="error.main">
                      -{formatCurrency(summary?.totalExpenses || 0, 'EGP')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Divider sx={{ my: 1.5 }} />

            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: 'primary.50',
                border: '1px solid',
                borderColor: 'primary.200',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography variant="subtitle1" fontWeight={700} color="primary.900">
                الكاش المتوقع في الدرج:
              </Typography>
              <Typography variant="h5" fontWeight={800} color="primary.900">
                {formatCurrency(summary?.expectedCash || 0, 'EGP')}
              </Typography>
            </Box>

            <Box sx={{ mt: 2.5, display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                color="error"
                fullWidth
                startIcon={<CloseShiftIcon />}
                onClick={() => setTab('close')}
                sx={{ borderRadius: 2, fontWeight: 700, py: 1.2 }}
              >
                تقفيل الوردية وتسليم الدرج (Z-Report) 🔒
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ borderRadius: 2 }}>
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
}
