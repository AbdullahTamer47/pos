import { useState } from 'react';
import {
  Box, Typography, Stack, Chip, Button, IconButton, Card, CardContent, Skeleton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Alert,
  Divider, Grid, alpha, useTheme, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon, Print as PrintIcon, Cancel as CancelIcon,
  Replay as ReturnIcon, Refresh as RefreshIcon, Receipt as ReceiptIcon,
  Phone as PhoneIcon, Person as PersonIcon, Description as DescriptionIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import api, { type InvoiceResponse, type PaymentResponse } from '@/api/endpoints';
import { formatCurrency } from '@smartpos/utils';
import { printThermalReceipt, printA4Invoice } from '@/pages/pos/ThermalReceipt';

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'default', pending: 'info', paid: 'success', partiallyPaid: 'warning', overdue: 'error', cancelled: 'error', refunded: 'info',
};

const TIER_COLORS: Record<string, 'default' | 'primary' | 'warning' | 'secondary'> = {
  REGULAR: 'default', SILVER: 'primary', GOLD: 'warning', PLATINUM: 'secondary',
};

export default function InvoiceDetailPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);

  const { data: invoice, isLoading, isError, error, refetch } = useQuery<InvoiceResponse>({
    queryKey: ['invoice', id],
    queryFn: () => api.invoices.getInvoice(id!),
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.invoices.cancelInvoice(id!),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoice', id] }); setCancelDialogOpen(false); },
  });

  const returnMutation = useMutation({
    mutationFn: () => api.invoices.returnInvoice(id!, { reason: 'Return' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoice', id] }); setReturnDialogOpen(false); },
  });

  const getReceiptData = () => {
    if (!invoice) return null;
    const items = (invoice.items || []).map((item) => ({
      name: item.productName || 'صنف',
      sku: item.sku,
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      total: Number(item.total) || (Number(item.quantity) * Number(item.unitPrice)),
      discount: Number(item.discount) || 0,
      taxRate: Number(item.taxRate) || 0,
    }));

    const primaryPayment = invoice.payments && invoice.payments.length > 0 ? invoice.payments[0] : null;

    return {
      storeName: 'متجر الأمل الذكي',
      invoiceNumber: invoice.invoiceNumber,
      date: invoice.invoiceDate ? `${new Date(invoice.invoiceDate).toLocaleDateString('ar-EG')} ${new Date(invoice.invoiceDate).toLocaleTimeString('ar-EG')}` : undefined,
      cashierName: invoice.cashierName || 'إدارة المتجر',
      customerName: invoice.customerName || 'عميل نقدي عام',
      customerPhone: undefined,
      items,
      subtotal: Number(invoice.subtotal) || Number(invoice.total) || 0,
      tax: Number(invoice.tax) || 0,
      discount: Number(invoice.discount) || 0,
      shipping: Number(invoice.shipping) || 0,
      grandTotal: Number(invoice.total) || 0,
      paidAmount: Number(invoice.paid) || Number(invoice.total) || 0,
      changeAmount: Math.max(0, (Number(invoice.paid) || 0) - (Number(invoice.total) || 0)),
      paymentMethod: primaryPayment?.method || 'cash',
      status: invoice.status,
      notes: invoice.notes,
    };
  };

  const handlePrintThermal = () => {
    const data = getReceiptData();
    if (data) printThermalReceipt(data);
  };

  const handlePrintA4 = () => {
    const data = getReceiptData();
    if (data) printA4Invoice(data);
  };

  const canCancel = invoice && !['cancelled', 'refunded'].includes(invoice.status);
  const canReturn = invoice && invoice.type === 'SALE' && !['cancelled', 'refunded'].includes(invoice.status);

  if (isLoading) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Skeleton variant="text" width={200} height={40} />
        <Stack spacing={2} mt={2}>
          <Skeleton variant="rounded" width="100%" height={120} />
          <Skeleton variant="rounded" width="100%" height={300} />
          <Skeleton variant="rounded" width="100%" height={200} />
        </Stack>
      </Box>
    );
  }

  if (isError || !invoice) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Alert severity="error" action={<Button size="small" color="inherit" onClick={() => refetch()} startIcon={<RefreshIcon />}>{t('common.tryAgain')}</Button>}>
          {(error as Error)?.message || t('common.somethingWentWrong')}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={3}>
        <IconButton onClick={() => navigate('/invoices')}><ArrowBackIcon /></IconButton>
        <Typography variant="h4" fontWeight={700}>{t('invoices.invoiceDetails')}</Typography>
      </Stack>

      <Grid container spacing={2} mb={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1.5}>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h5" fontWeight={700} fontFamily="monospace">{invoice.invoiceNumber}</Typography>
                    <Chip size="small" label={t(`invoices.${invoice.status}`)} color={STATUS_COLORS[invoice.status] || 'default'} variant="outlined" />
                    <Chip size="small" label={invoice.type} color={invoice.type === 'RETURN' ? 'warning' : 'primary'} variant="outlined" />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" mt={0.5}>
                    {new Date(invoice.invoiceDate).toLocaleDateString()} {new Date(invoice.invoiceDate).toLocaleTimeString()}
                  </Typography>
                  {invoice.branchName && <Typography variant="caption" color="text.secondary">{invoice.branchName}</Typography>}
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button variant="contained" color="primary" startIcon={<PrintIcon />} onClick={handlePrintThermal} sx={{ fontWeight: 700 }}>
                    طباعة إيصال (80mm)
                  </Button>
                  <Button variant="outlined" color="primary" startIcon={<DescriptionIcon />} onClick={handlePrintA4} sx={{ fontWeight: 700 }}>
                    فاتورة ضريبية A4
                  </Button>
                  {canCancel && <Button variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => setCancelDialogOpen(true)}>{t('invoices.cancelInvoice')}</Button>}
                  {canReturn && <Button variant="outlined" color="warning" startIcon={<ReturnIcon />} onClick={() => setReturnDialogOpen(true)}>{t('invoices.returnInvoice')}</Button>}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              {invoice.customerName ? (
                <Stack spacing={0.5}>
                  <Typography variant="subtitle2" color="text.secondary">{t('pos.customer')}</Typography>
                  <Typography variant="body1" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><PersonIcon fontSize="small" />{invoice.customerName}</Typography>
                  {invoice.customerId && <Typography variant="caption" color="text.secondary">{invoice.customerId}</Typography>}
                </Stack>
              ) : (
                <Stack spacing={0.5}>
                  <Typography variant="subtitle2" color="text.secondary">{t('pos.customer')}</Typography>
                  <Typography variant="body1" color="text.secondary">{t('pos.walkInCustomer')}</Typography>
                </Stack>
              )}
              {invoice.cashierName && <Typography variant="caption" color="text.secondary" mt={1}>{t('pos.cashier')}: {invoice.cashierName}</Typography>}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ borderRadius: 3, overflow: 'hidden', mb: 3 }}>
        <Typography variant="h6" fontWeight={600} sx={{ p: 2, pb: 0 }}>{t('invoices.items')}</Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('pos.productName')}</TableCell>
                <TableCell align="center">{t('pos.quantity')}</TableCell>
                <TableCell align="right">{t('pos.unitPrice')}</TableCell>
                <TableCell align="right">{t('invoices.discount')}</TableCell>
                <TableCell align="right">{t('invoices.tax')}</TableCell>
                <TableCell align="right">{t('invoices.total')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoice.items.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{item.productName}</Typography>
                    <Typography variant="caption" color="text.secondary" fontFamily="monospace">{item.sku}</Typography>
                    {item.variantName && <Typography variant="caption" color="text.secondary">{item.variantName}</Typography>}
                  </TableCell>
                  <TableCell align="center">{item.quantity}</TableCell>
                  <TableCell align="right">{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell align="right">{item.discount > 0 ? formatCurrency(item.discount) : '-'}</TableCell>
                  <TableCell align="right">{item.taxRate > 0 ? `${item.taxRate}%` : '-'}</TableCell>
                  <TableCell align="right"><Typography variant="body2" fontWeight={600}>{formatCurrency(item.total)}</Typography></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={600} sx={{ p: 2, pb: 0 }}>{t('common.summary')}</Typography>
            <Box sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">{t('invoices.subtotal')}</Typography>
                  <Typography variant="body2" fontWeight={600}>{formatCurrency(invoice.subtotal)}</Typography>
                </Stack>
                {invoice.discount > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">{t('invoices.discount')}</Typography>
                    <Typography variant="body2" fontWeight={600} color="error.main">-{formatCurrency(invoice.discount)}</Typography>
                  </Stack>
                )}
                {invoice.tax > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">{t('invoices.tax')}</Typography>
                    <Typography variant="body2" fontWeight={600}>{formatCurrency(invoice.tax)}</Typography>
                  </Stack>
                )}
                {invoice.shipping > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">{t('invoices.shipping')}</Typography>
                    <Typography variant="body2" fontWeight={600}>{formatCurrency(invoice.shipping)}</Typography>
                  </Stack>
                )}
                <Divider />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle1" fontWeight={700}>{t('invoices.total')}</Typography>
                  <Typography variant="subtitle1" fontWeight={700}>{formatCurrency(invoice.total)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="success.main">{t('invoices.paid')}</Typography>
                  <Typography variant="body2" fontWeight={600} color="success.main">{formatCurrency(invoice.paid)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color={invoice.balance > 0 ? 'error.main' : 'text.secondary'}>{t('invoices.balance')}</Typography>
                  <Typography variant="body2" fontWeight={600} color={invoice.balance > 0 ? 'error.main' : 'text.secondary'}>{formatCurrency(invoice.balance)}</Typography>
                </Stack>
              </Stack>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={600} sx={{ p: 2, pb: 0 }}>{t('invoices.paymentHistory')}</Typography>
            <Box sx={{ p: 2 }}>
              {invoice.payments && invoice.payments.length > 0 ? (
                <Stack spacing={1.5}>
                  {invoice.payments.map((payment: PaymentResponse) => {
                    const methodLabels: Record<string, string> = {
                      cash: 'نقداً (كاش)',
                      card: 'بطاقة بنكية / فيزا',
                      instapay: 'انستاباي InstaPay',
                      wallet: 'محفظة إلكترونية',
                      vodafone_cash: 'فودافون كاش',
                      credit: 'آجل / على الحساب',
                    };
                    const methodKey = (payment.method || '').toLowerCase();
                    const methodText = methodLabels[methodKey] || payment.method || 'نقداً';
                    const validDate = payment.date && !isNaN(new Date(payment.date).getTime())
                      ? new Date(payment.date)
                      : (invoice.invoiceDate && !isNaN(new Date(invoice.invoiceDate).getTime()) ? new Date(invoice.invoiceDate) : new Date());
                    const dateText = validDate.toLocaleDateString('ar-EG');

                    return (
                      <Paper key={payment.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="body2" fontWeight={600}>{methodText}</Typography>
                            <Typography variant="caption" color="text.secondary">{dateText}</Typography>
                            {payment.reference && <Typography variant="caption" color="text.secondary"> | {payment.reference}</Typography>}
                          </Box>
                          <Typography variant="body2" fontWeight={600} color="success.main">{formatCurrency(payment.amount)}</Typography>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>{t('common.noData')}</Typography>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {invoice.notes && (
        <Paper sx={{ borderRadius: 3, p: 2, mt: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">{t('common.notes')}</Typography>
          <Typography variant="body2" mt={0.5}>{invoice.notes}</Typography>
        </Paper>
      )}

      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
        <DialogTitle>{t('invoices.cancelInvoice')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">{t('common.confirmDeleteMessage')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button color="error" variant="contained" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
            {cancelMutation.isPending ? t('common.processing') : t('common.confirm')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={returnDialogOpen} onClose={() => setReturnDialogOpen(false)}>
        <DialogTitle>{t('invoices.returnInvoice')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">{t('common.confirmDeleteMessage')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReturnDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button color="warning" variant="contained" onClick={() => returnMutation.mutate()} disabled={returnMutation.isPending}>
            {t('invoices.returnInvoice')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}