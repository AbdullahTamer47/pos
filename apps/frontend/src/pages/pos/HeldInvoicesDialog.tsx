import { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  Stack,
  Paper,
  Chip,
  styled,
  alpha,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  PlayArrow as ResumeIcon,
  Delete as DeleteIcon,
  ReceiptLong as ReceiptIcon,
  AccessTime as TimeIcon,
  ShoppingCart as CartIcon,
  Receipt,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/endpoints';
import { usePOSStore } from '@/stores/posStore';

const InvoiceCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: 14,
  border: `1.5px solid ${theme.palette.divider}`,
  cursor: 'pointer',
  transition: theme.transitions.create(['transform', 'box-shadow', 'border-color'], {
    duration: theme.transitions.duration.short,
    easing: theme.transitions.easing.easeInOut,
  }),
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
    borderColor: theme.palette.primary.main,
  },
}));

const EmptyState = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(6),
  gap: theme.spacing(2),
  color: theme.palette.text.secondary,
  textAlign: 'center',
}));

import { formatCurrency as formatCur } from '@smartpos/utils';

function formatCurrency(amount: number): string {
  return formatCur(amount, 'EGP');
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

interface HeldInvoice {
  id: string;
  invoiceNumber: string;
  items: Array<{ productId: string; productName: string; quantity: number }>;
  total: number;
  createdAt: string;
  heldAt: string;
  customerName?: string;
}

interface HeldInvoicesDialogProps {
  open: boolean;
  onClose: () => void;
}

export function HeldInvoicesDialog({ open, onClose }: HeldInvoicesDialogProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const {
    clearCart,
    addToCart,
    setCustomer,
    heldInvoices: localHeldInvoices,
    resumeHeldInvoice,
    deleteHeldInvoice,
  } = usePOSStore();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resumingId, setResumingId] = useState<string | null>(null);

  const { data: heldData, isLoading } = useQuery({
    queryKey: ['invoices', 'held'],
    queryFn: () => api.invoices.getHeldInvoices({ page: 1, limit: 50 }),
    enabled: open,
    staleTime: 10000,
  });

  const remoteHeldInvoices = useMemo(() => {
    const rawList = Array.isArray(heldData)
      ? heldData
      : Array.isArray((heldData as any)?.data)
        ? (heldData as any).data
        : [];
    return rawList.filter(Boolean).map((inv: any) => ({
      id: inv.id as string,
      invoiceNumber: inv.invoiceNumber as string,
      items: (Array.isArray(inv.items) ? inv.items : []).map((item: any) => ({
        productId: (item.productId as string) || '',
        productName: (item.productName as string) || '',
        quantity: Number(item.quantity) || 1,
      })),
      total: Number(inv.total) || Number(inv.grandTotal) || 0,
      createdAt: (inv.createdAt as string) || '',
      heldAt: (inv.heldAt as string) || (inv.createdAt as string) || '',
      customerName: (inv.customerName as string) || undefined,
    })) as HeldInvoice[];
  }, [heldData]);

  const heldInvoices = useMemo(() => {
    const local: HeldInvoice[] = localHeldInvoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      items: inv.cart.map((item) => ({
        productId: item.product.id,
        productName: item.product.nameAr || item.product.name,
        quantity: item.quantity,
      })),
      total: inv.total,
      createdAt: inv.heldAt,
      heldAt: inv.heldAt,
      customerName: inv.customer?.name,
    }));

    const ids = new Set(local.map((l) => l.id));
    const remote = remoteHeldInvoices.filter((r) => !ids.has(r.id));
    return [...local, ...remote];
  }, [localHeldInvoices, remoteHeldInvoices]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.invoices.deleteHeldInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', 'held'] });
      setDeletingId(null);
    },
    onError: () => {
      setDeletingId(null);
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => api.invoices.resumeInvoice(id),
    onSuccess: (data) => {
      const invoiceData = data as unknown as Record<string, unknown>;
      clearCart();
      const rawItems = invoiceData?.items;
      const items: Array<Record<string, unknown>> = Array.isArray(rawItems)
        ? rawItems
        : typeof rawItems === 'string'
          ? (() => {
              try {
                return JSON.parse(rawItems);
              } catch {
                return [];
              }
            })()
          : [];
      if (Array.isArray(items)) {
        items.forEach((item: Record<string, unknown>) => {
          const product = {
            id: (item.productId as string) || '',
            name: (item.productName as string) || '',
            sku: (item.sku as string) || '',
            unit: (item.unit as string) || 'PIECE',
            costPrice: Number(item.costPrice) || 0,
            sellingPrice: Number(item.unitPrice) || 0,
            taxRate: Number(item.taxRate) || 0,
            isActive: true,
            hasExpiry: false,
            hasVariants: false,
          };
          addToCart(product, Number(item.quantity) || 1);
        });
      }
      if (invoiceData.customer) {
        const cust = invoiceData.customer as Record<string, unknown>;
        setCustomer({
          id: cust.id as string,
          name: (cust.fullName as string) || (cust.name as string) || '',
          phone: cust.phone as string,
          email: cust.email as string,
          loyaltyPoints: (cust.loyaltyPoints as number) || 0,
          creditLimit: (cust.creditLimit as number) || 0,
          balance: (cust.balance as number) || 0,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['invoices', 'held'] });
      setResumingId(null);
      onClose();
    },
    onError: () => {
      setResumingId(null);
    },
  });

  const handleResume = useCallback((id: string) => {
    if (localHeldInvoices.some((h) => h.id === id)) {
      resumeHeldInvoice(id);
      onClose();
      return;
    }
    setResumingId(id);
    resumeMutation.mutate(id);
  }, [localHeldInvoices, resumeHeldInvoice, resumeMutation, onClose]);

  const handleDelete = useCallback((id: string) => {
    if (localHeldInvoices.some((h) => h.id === id)) {
      deleteHeldInvoice(id);
      return;
    }
    setDeletingId(id);
    deleteMutation.mutate(id);
  }, [localHeldInvoices, deleteHeldInvoice, deleteMutation]);

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
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Receipt color="primary" />
          <Typography variant="h6" fontWeight={700}>
            الفواتير المعلقة (المحفوظة مؤقتاً)
          </Typography>
          {heldInvoices.length > 0 && (
            <Chip label={`${heldInvoices.length} فواتير`} size="small" color="primary" sx={{ fontWeight: 700 }} />
          )}
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 1.5, sm: 2.5 } }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : heldInvoices.length === 0 ? (
          <EmptyState>
            <ReceiptIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
            <Typography variant="h6">{t('pos.noHeldInvoices')}</Typography>
            <Typography variant="body2" color="text.disabled">
              {t('pos.holdInvoice')}
            </Typography>
          </EmptyState>
        ) : (
          <Stack spacing={1.5}>
            {heldInvoices.map((invoice) => (
              <InvoiceCard key={invoice.id} onClick={() => handleResume(invoice.id)}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {invoice.invoiceNumber}
                    </Typography>
                    {invoice.customerName && (
                      <Typography variant="caption" color="text.secondary">
                        {invoice.customerName}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="h6" fontWeight={700} color="primary">
                    {formatCurrency(invoice.total)}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CartIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {invoice.items.length} {t('pos.items')}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {formatTimeAgo(invoice.heldAt || invoice.createdAt)}
                    </Typography>
                  </Box>
                </Box>

                {invoice.items.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                    {invoice.items.slice(0, 3).map((item, idx) => (
                      <Chip
                        key={idx}
                        label={`${item.productName} x${item.quantity}`}
                        size="small"
                        variant="outlined"
                        sx={{ height: 24, fontSize: '0.7rem' }}
                      />
                    ))}
                    {invoice.items.length > 3 && (
                      <Chip
                        label={`+${invoice.items.length - 3}`}
                        size="small"
                        variant="outlined"
                        sx={{ height: 24, fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                )}

                <Divider sx={{ my: 1 }} />

                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexDirection: { xs: 'column-reverse', sm: 'row' } }}>
                  <Button
                    size="small"
                    color="error"
                    fullWidth={isMobile}
                    startIcon={deletingId === invoice.id ? <CircularProgress size={16} /> : <DeleteIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(invoice.id);
                    }}
                    disabled={deletingId === invoice.id}
                    sx={{ minHeight: 38, borderRadius: 2 }}
                  >
                    {t('common.delete')}
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    fullWidth={isMobile}
                    startIcon={resumingId === invoice.id ? <CircularProgress size={16} color="inherit" /> : <ResumeIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResume(invoice.id);
                    }}
                    disabled={resumingId === invoice.id}
                    sx={{ minHeight: 38, borderRadius: 2, fontWeight: 700 }}
                  >
                    {t('pos.resume')}
                  </Button>
                </Box>
              </InvoiceCard>
            ))}
          </Stack>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          p: 2,
          position: isMobile ? 'sticky' : 'relative',
          bottom: 0,
          zIndex: 10,
          bgcolor: 'background.paper',
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Button onClick={onClose} fullWidth={isMobile} sx={{ minHeight: 44, borderRadius: 2 }}>
          {t('common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}