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
  InputAdornment,
  Paper,
  Chip,
  Stack,
  Divider,
  CircularProgress,
  styled,
  alpha,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Close as CloseIcon,
  Search as SearchIcon,
  Description as QuoteIcon,
  ShoppingCartCheckout as ConvertIcon,
  Print as PrintIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { usePOSStore, type Product } from '@/stores/posStore';
import { formatCurrency, formatDate } from '@smartpos/utils';
import api from '@/api/endpoints';

const QuoteCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: 14,
  border: `1.5px solid ${theme.palette.divider}`,
  transition: theme.transitions.create(['transform', 'box-shadow', 'border-color']),
  backgroundColor: theme.palette.background.paper,
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
    borderColor: theme.palette.primary.main,
  },
}));

interface QuotationsListDialogProps {
  open: boolean;
  onClose: () => void;
  onPrintQuotation: (quotation: Record<string, any>) => void;
  onOpenPaymentModal?: () => void;
}

export function QuotationsListDialog({
  open,
  onClose,
  onPrintQuotation,
  onOpenPaymentModal,
}: QuotationsListDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const { clearCart, addToCart, setCustomer } = usePOSStore();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: invoicesData, isLoading, refetch } = useQuery({
    queryKey: ['invoices', 'quotations'],
    queryFn: () => api.invoices.getInvoices({ page: 1, limit: 100, type: 'QUOTATION' }),
    enabled: open,
    staleTime: 5000,
  });

  const quotations = useMemo(() => {
    const list = (invoicesData as any)?.data?.data || (invoicesData as any)?.data || [];
    if (!Array.isArray(list)) return [];
    return list;
  }, [invoicesData]);

  const filteredQuotations = useMemo(() => {
    if (!searchQuery.trim()) return quotations;
    const q = searchQuery.toLowerCase().trim();
    return quotations.filter((item: any) => {
      const name = (item.customerName || item.customer?.name || '').toLowerCase();
      const phone = (item.customerPhone || item.customer?.phone || '').toLowerCase();
      const invNum = (item.invoiceNumber || '').toLowerCase();
      const notes = (item.notes || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || invNum.includes(q) || notes.includes(q);
    });
  }, [quotations, searchQuery]);

  const handleConvertToSale = useCallback(
    async (quote: any) => {
      try {
        // Fetch full details of the quotation
        const fullQuoteRes = await api.invoices.getInvoice(quote.id);
        const fullQuote = (fullQuoteRes as any)?.data || fullQuoteRes;

        clearCart();

        // Populate customer
        if (fullQuote.customer) {
          setCustomer({
            id: fullQuote.customer.id,
            name: fullQuote.customer.name,
            phone: fullQuote.customer.phone,
            email: fullQuote.customer.email,
            loyaltyPoints: fullQuote.customer.loyaltyPoints || 0,
            creditLimit: Number(fullQuote.customer.creditLimit || 0),
            balance: Number(fullQuote.customer.balance || 0),
          });
        } else if (fullQuote.customerName || fullQuote.customerPhone) {
          setCustomer({
            id: '',
            name: fullQuote.customerName || 'عميل استفسار',
            phone: fullQuote.customerPhone || '',
            email: '',
            loyaltyPoints: 0,
            creditLimit: 0,
            balance: 0,
          });
        }

        // Add items to cart
        const items = fullQuote.items || [];
        for (const item of items) {
          const prod: Product = {
            id: item.productId || item.product?.id || item.id,
            name: item.productName || item.product?.nameAr || item.product?.name || 'منتج',
            nameAr: item.product?.nameAr || item.productName,
            nameEn: item.product?.nameEn,
            sku: item.productSku || item.product?.sku || '',
            barcode: item.product?.barcode,
            unit: item.product?.unit || 'PIECE',
            costPrice: Number(item.costPrice || item.product?.costPrice || 0),
            sellingPrice: Number(item.unitPrice || 0),
            taxRate: Number(item.taxRate || 0),
            isActive: true,
            hasExpiry: false,
            hasVariants: false,
          };
          addToCart(prod, Number(item.quantity || 1));
        }

        toast.success(`تم استرجاع وتحميل أصناف عرض السعر #${fullQuote.invoiceNumber} إلى السلة بنجاح!`);
        onClose();
        if (onOpenPaymentModal) {
          setTimeout(() => onOpenPaymentModal(), 200);
        }
      } catch (err: any) {
        toast.error('حدث خطأ أثناء تحميل أصناف عرض السعر');
      }
    },
    [clearCart, setCustomer, addToCart, onClose, onOpenPaymentModal]
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 4,
          maxHeight: isMobile ? '100%' : '85vh',
          m: isMobile ? 0 : 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: alpha(theme.palette.primary.main, 0.06),
          borderBottom: `1px solid ${theme.palette.divider}`,
          py: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <QuoteIcon color="primary" />
          <Box>
            <Typography variant="h6" fontWeight={700}>
              سجل عروض الأسعار واستفسارات العملاء
            </Typography>
            <Typography variant="caption" color="text.secondary">
              البحث برقم الهاتف أو الاسم، ومعاينة الأسعار السابقة والتحويل الفوري لفاتورة بيع
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 2.5 }}>
        {/* Search Bar */}
        <Box sx={{ mb: 2.5 }}>
          <TextField
            fullWidth
            placeholder="ابحث برقم هاتف العميل (مثال: 01012345678)، اسم العميل، أو رقم العرض..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery('')}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
          />
        </Box>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : filteredQuotations.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
            <QuoteIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5 }} />
            <Typography variant="h6" fontWeight={600}>
              {searchQuery ? 'لا توجد عروض أسعار مطابقة للبحث' : 'لا توجد عروض أسعار أو استفسارات مسجلة'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              عندما يستفسر أي عميل عن أسعار، يمكنك تسجيلها من زر "عرض أسعار / استفسار" في شاشة الـ POS
            </Typography>
          </Box>
        ) : (
          <Stack spacing={2} sx={{ maxHeight: 460, overflowY: 'auto', pr: 0.5 }}>
            {filteredQuotations.map((quote: any) => {
              const isCompleted = quote.status === 'COMPLETED' || quote.type === 'SALE';
              return (
                <QuoteCard key={quote.id} elevation={0}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                          {quote.invoiceNumber || 'QT-0001'}
                        </Typography>
                        <Chip
                          size="small"
                          label={isCompleted ? 'تم الشراء وتحويله لبيع' : 'استفسار مفتوح / ساري'}
                          color={isCompleted ? 'success' : 'primary'}
                          icon={isCompleted ? <CheckIcon /> : <ScheduleIcon />}
                          variant="outlined"
                        />
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.8, color: 'text.secondary', fontSize: '0.85rem' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PersonIcon fontSize="inherit" color="action" />
                          <Typography variant="body2" fontWeight={600} color="text.primary">
                            {quote.customerName || quote.customer?.name || 'عميل نقدي'}
                          </Typography>
                        </Box>

                        {(quote.customerPhone || quote.customer?.phone) && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <PhoneIcon fontSize="inherit" color="action" />
                            <Typography variant="body2" fontWeight={600} color="primary.dark">
                              {quote.customerPhone || quote.customer?.phone}
                            </Typography>
                          </Box>
                        )}

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CalendarIcon fontSize="inherit" color="action" />
                          <Typography variant="caption">
                            {quote.createdAt ? formatDate(new Date(quote.createdAt)) : ''}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        إجمالي العرض
                      </Typography>
                      <Typography variant="h6" fontWeight={800} color="primary.main">
                        {formatCurrency(Number(quote.grandTotal || 0), 'EGP')}
                      </Typography>
                    </Box>
                  </Box>

                  {quote.notes && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, bgcolor: '#f8fafc', p: 1, borderRadius: 1.5 }}>
                      <strong>ملاحظات:</strong> {quote.notes}
                    </Typography>
                  )}

                  <Divider sx={{ my: 1.5 }} />

                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: 1,
                      flexDirection: { xs: 'column-reverse', sm: 'row' },
                    }}
                  >
                    <Button
                      size="small"
                      variant="outlined"
                      color="inherit"
                      fullWidth={isMobile}
                      startIcon={<PrintIcon />}
                      onClick={() => onPrintQuotation(quote)}
                      sx={{ minHeight: 38, borderRadius: 2 }}
                    >
                      معاينة وطباعة
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      fullWidth={isMobile}
                      startIcon={<ConvertIcon />}
                      onClick={() => handleConvertToSale(quote)}
                      sx={{ fontWeight: 700, minHeight: 38, borderRadius: 2 }}
                    >
                      تحويل إلى فاتورة بيع (تحميل للسلة)
                    </Button>
                  </Box>
                </QuoteCard>
              );
            })}
          </Stack>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          p: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
          position: isMobile ? 'sticky' : 'relative',
          bottom: 0,
          zIndex: 10,
          bgcolor: 'background.paper',
        }}
      >
        <Button onClick={onClose} fullWidth={isMobile} variant="outlined" sx={{ minHeight: 44, borderRadius: 2 }}>
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
}
