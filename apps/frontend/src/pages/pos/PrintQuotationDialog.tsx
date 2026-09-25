import { useRef, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  Divider,
  Paper,
  styled,
  useTheme,
} from '@mui/material';
import {
  Close as CloseIcon,
  Print as PrintIcon,
  Description as DescriptionIcon,
  Store as StoreIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { formatCurrency, formatDate } from '@smartpos/utils';
import { printA4Invoice } from './ThermalReceipt';

const PrintableArea = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: 16,
  backgroundColor: '#fff',
  color: '#1e293b',
  border: '1px solid #e2e8f0',
  fontFamily: 'inherit',
  '@media print': {
    boxShadow: 'none',
    border: 'none',
    padding: 0,
  },
}));

interface PrintQuotationDialogProps {
  open: boolean;
  onClose: () => void;
  quotation: Record<string, any> | null;
}

export function PrintQuotationDialog({ open, onClose, quotation }: PrintQuotationDialogProps) {
  const printContentRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  const handlePrint = useCallback(() => {
    if (!quotation) return;
    const mappedItems = (quotation.items || []).map((item: any) => ({
      name: item.productName || item.product?.nameAr || item.product?.name || 'منتج',
      sku: item.sku || item.product?.sku,
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      total: Number(item.totalPrice || item.unitPrice * item.quantity) || 0,
      discount: Number(item.discount) || 0,
    }));

    printA4Invoice({
      storeName: 'متجر الأمل الذكي',
      invoiceNumber: quotation.invoiceNumber || 'QUO-001',
      date: quotation.createdAt ? new Date(quotation.createdAt).toLocaleDateString('ar-EG') : undefined,
      customerName: quotation.customerName || quotation.customer?.name || 'عميل استفسار عام',
      customerPhone: quotation.customerPhone,
      items: mappedItems,
      subtotal: Number(quotation.subtotal || quotation.grandTotal || 0),
      discount: Number(quotation.discountAmount || 0),
      tax: Number(quotation.taxAmount || 0),
      grandTotal: Number(quotation.grandTotal || 0),
      paidAmount: 0,
      changeAmount: 0,
      paymentMethod: 'عرض أسعار (Quotation)',
      status: 'معتمد',
      notes: quotation.notes || 'عرض الأسعار ساري لمدة 7 أيام من تاريخ إصداره.',
    });
  }, [quotation]);

  if (!quotation) return null;

  const items = quotation.items || [];
  const createdAt = quotation.createdAt ? formatDate(new Date(quotation.createdAt)) : formatDate(new Date());

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DescriptionIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>
            معاينة وطباعة عرض الأسعار
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3, backgroundColor: '#f8fafc' }}>
        <PrintableArea ref={printContentRef} elevation={0}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 2, pb: 2, borderBottom: '2px solid', borderColor: 'primary.main' }}>
            <Typography variant="h5" fontWeight={800} color="primary.main" gutterBottom>
              سوبرماركت ومحلات الأمل - مصر
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              نظام نقاط البيع وإدارة المبيعات Smart POS Egypt
            </Typography>
            <Box
              sx={{
                display: 'inline-block',
                bgcolor: 'primary.light',
                color: 'primary.contrastText',
                px: 2,
                py: 0.5,
                borderRadius: 4,
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              عرض أسعار واستفسار تسعير رسمي (Quotation)
            </Box>
          </Box>

          {/* Info Details */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, fontSize: '0.85rem', color: 'text.secondary' }}>
            <Box>
              <Typography variant="body2">
                <strong>رقم العرض:</strong> {quotation.invoiceNumber || 'QT-0001'}
              </Typography>
              <Typography variant="body2">
                <strong>التاريخ:</strong> {createdAt}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'left' }}>
              <Typography variant="body2">
                <strong>الفرع:</strong> فرع القاهرة - مدينة نصر
              </Typography>
              <Typography variant="body2">
                <strong>الهاتف:</strong> 01000000001
              </Typography>
            </Box>
          </Box>

          {/* Customer Box */}
          <Box
            sx={{
              p: 1.5,
              mb: 2,
              borderRadius: 2,
              bgcolor: '#f1f5f9',
              border: '1px solid #e2e8f0',
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} color="text.primary">
              بيانات العميل المستفسر:
            </Typography>
            <Typography variant="body2">
              <strong>الاسم:</strong> {quotation.customerName || quotation.customer?.name || 'عميل نقدي / استفسار عام'}
            </Typography>
            {quotation.customerPhone && (
              <Typography variant="body2">
                <strong>الهاتف:</strong> {quotation.customerPhone}
              </Typography>
            )}
          </Box>

          {/* Table */}
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', my: 2 }}>
            <thead>
              <Box component="tr" sx={{ bgcolor: '#f1f5f9' }}>
                <Box component="th" sx={{ p: 1, textAlign: 'right', borderBottom: '2px solid #cbd5e1' }}>
                  الصنف
                </Box>
                <Box component="th" sx={{ p: 1, textAlign: 'center', borderBottom: '2px solid #cbd5e1' }}>
                  الكمية
                </Box>
                <Box component="th" sx={{ p: 1, textAlign: 'left', borderBottom: '2px solid #cbd5e1' }}>
                  السعر
                </Box>
                <Box component="th" sx={{ p: 1, textAlign: 'left', borderBottom: '2px solid #cbd5e1' }}>
                  الإجمالي
                </Box>
              </Box>
            </thead>
            <tbody>
              {items.map((item: any, idx: number) => (
                <Box component="tr" key={idx} sx={{ borderBottom: '1px solid #e2e8f0' }}>
                  <Box component="td" sx={{ p: 1, textAlign: 'right' }}>
                    {item.productName || item.product?.nameAr || item.product?.name || 'منتج'}
                  </Box>
                  <Box component="td" sx={{ p: 1, textAlign: 'center' }}>
                    {item.quantity}
                  </Box>
                  <Box component="td" sx={{ p: 1, textAlign: 'left' }}>
                    {formatCurrency(Number(item.unitPrice), 'EGP')}
                  </Box>
                  <Box component="td" sx={{ p: 1, textAlign: 'left', fontWeight: 600 }}>
                    {formatCurrency(Number(item.totalPrice || item.unitPrice * item.quantity), 'EGP')}
                  </Box>
                </Box>
              ))}
            </tbody>
          </Box>

          {/* Totals */}
          <Box sx={{ width: 240, ml: 'auto', mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
              <Typography variant="body2" color="text.secondary">المجموع الفرعي:</Typography>
              <Typography variant="body2">{formatCurrency(Number(quotation.subtotal || 0), 'EGP')}</Typography>
            </Box>
            {Number(quotation.discountAmount) > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, color: 'error.main' }}>
                <Typography variant="body2">الخصم:</Typography>
                <Typography variant="body2">-{formatCurrency(Number(quotation.discountAmount), 'EGP')}</Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
              <Typography variant="body2" color="text.secondary">الضريبة:</Typography>
              <Typography variant="body2">{formatCurrency(Number(quotation.taxAmount || 0), 'EGP')}</Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, color: 'primary.main', fontWeight: 800 }}>
              <Typography variant="subtitle1" fontWeight={800}>الإجمالي النهائي:</Typography>
              <Typography variant="subtitle1" fontWeight={800}>{formatCurrency(Number(quotation.grandTotal || 0), 'EGP')}</Typography>
            </Box>
          </Box>

          {/* Notes */}
          {quotation.notes && (
            <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700 }}>
                ملاحظات وشروط الصلاحية:
              </Typography>
              <Typography variant="caption" color="text.primary">
                {quotation.notes}
              </Typography>
            </Box>
          )}

          {/* Footer */}
          <Box sx={{ mt: 3, pt: 2, borderTop: '1px dashed #cbd5e1', textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              شكراً لزيارتكم! يسعدنا خدمتكم في أي وقت - الأسعار قابلة للتثبيت بمجرد إتمام الشراء.
            </Typography>
          </Box>
        </PrintableArea>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" color="inherit">
          إغلاق
        </Button>
        <Button onClick={handlePrint} variant="contained" color="primary" startIcon={<PrintIcon />} sx={{ px: 3, fontWeight: 700 }}>
          طباعة عرض السعر
        </Button>
      </DialogActions>
    </Dialog>
  );
}
