import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Chip,
  Typography,
  Badge,
  Tooltip,
  Paper,
  Alert,
  Skeleton,
  Stack,
  styled,
  alpha,
  useTheme,
  useMediaQuery,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  QrCodeScanner as BarcodeIcon,
  Pause as HoldIcon,
  RestartAlt as NewSaleIcon,
  ShoppingCart as CartIcon,
  ReceiptLong as ReceiptIcon,
  Keyboard as KeyboardIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Print as PrintIcon,
  LocalOffer as CouponIcon,
  CardGiftcard as GiftCardIcon,
  ShoppingCartCheckout,
  Inventory2,
  Storefront,
  FlashOn as FlashIcon,
  WhatsApp as WhatsAppIcon,
  Bolt as BoltIcon,
  Description as QuoteIcon,
  FolderOpen as HeldFolderIcon,
  Add as AddIcon,
  SwapHoriz as SwapHorizIcon,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { usePOSStore, type Product, type Customer, type Coupon, type GiftCard, type Payment } from '@/stores/posStore';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { UserRole } from '@smartpos/types';
import api from '@/api/endpoints';
import { ProductCard } from './ProductCard';
import { CartItem } from './CartItem';
import { PaymentModal, type SalePrintOptions } from './PaymentModal';
import { CustomerSelect } from './CustomerSelect';
import { HeldInvoicesDialog } from './HeldInvoicesDialog';
import { QuotationModal } from './QuotationModal';
import { QuotationsListDialog } from './QuotationsListDialog';
import { PrintQuotationDialog } from './PrintQuotationDialog';
import { QuickProductModal } from './QuickProductModal';
import { printThermalReceipt, printA4Invoice } from './ThermalReceipt';
import { offlineService } from '@/services/offlineService';
import { formatCurrency as formatCur } from '@smartpos/utils';

// ==================== STYLED COMPONENTS (Google Material 3 Expressive) ====================

const StyledContainer = styled(Box)(({ theme }) => ({
  height: '100%',
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  backgroundColor: theme.palette.background.default,
}));

const TopCommandBar = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing(1.5),
  padding: theme.spacing(0.75, 2),
  backgroundColor: theme.palette.surfaceContainerLow || theme.palette.background.paper,
  borderBottom: `1px solid ${theme.palette.outlineVariant || theme.palette.divider}`,
  minHeight: 56,
  flexShrink: 0,
  flexWrap: 'nowrap',
  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
}));

const SearchField = styled(TextField)(({ theme }) => ({
  flex: '1 1 340px',
  maxWidth: 480,
  '& .MuiOutlinedInput-root': {
    backgroundColor: theme.palette.surfaceContainerHighest || alpha(theme.palette.primary.main, 0.05),
    borderRadius: 9999, // M3 Expressive Full Pill
    transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
    '& fieldset': {
      borderColor: theme.palette.outlineVariant || 'transparent',
      borderWidth: '1px',
    },
    '&:hover fieldset': {
      borderColor: theme.palette.primary.main,
    },
    '&.Mui-focused fieldset': {
      borderWidth: '2px',
      borderColor: theme.palette.primary.main,
    },
  },
  '& .MuiInputBase-input': {
    padding: '8px 16px',
    fontSize: '0.9rem',
    fontWeight: 500,
  },
}));

const CategoryRibbon = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(0.6, 2),
  overflowX: 'auto',
  flexShrink: 0,
  backgroundColor: theme.palette.surfaceContainerLowest || theme.palette.background.default,
  borderBottom: `1px solid ${theme.palette.outlineVariant || theme.palette.divider}`,
  '&::-webkit-scrollbar': { height: 4 },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: alpha(theme.palette.primary.main, 0.2),
    borderRadius: 9999,
  },
}));

const MainWorkspace = styled(Box)({
  display: 'flex',
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
});

const CatalogPanel = styled(Box)(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  backgroundColor: theme.palette.surfaceContainerLowest || theme.palette.background.default,
}));

const TerminalCartPanel = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'mobileMode',
})<{ mobileMode?: 'split' | 'expanded' | 'collapsed' }>(({ theme, mobileMode = 'split' }) => ({
  width: 440,
  flexShrink: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  backgroundColor: theme.palette.surfaceContainerLow || theme.palette.background.paper,
  borderRight: theme.direction === 'rtl' ? 'none' : `1px solid ${theme.palette.outlineVariant || theme.palette.divider}`,
  borderLeft: theme.direction === 'rtl' ? `1px solid ${theme.palette.outlineVariant || theme.palette.divider}` : 'none',
  boxShadow: theme.direction === 'rtl' ? '4px 0 24px rgba(0,0,0,0.03)' : '-4px 0 24px rgba(0,0,0,0.03)',
  [theme.breakpoints.down('lg')]: {
    width: 380,
  },
  [theme.breakpoints.down('md')]: {
    width: '100%',
    borderLeft: 'none',
    borderRight: 'none',
    borderTop: `2px solid ${alpha(theme.palette.primary.main, 0.4)}`,
    boxShadow: '0 -8px 24px rgba(0,0,0,0.12)',
    flexShrink: 0,
    transition: 'height 0.25s cubic-bezier(0.2, 0, 0, 1), max-height 0.25s cubic-bezier(0.2, 0, 0, 1)',
    height: mobileMode === 'collapsed' ? '54px' : mobileMode === 'expanded' ? '72vh' : '285px',
    maxHeight: mobileMode === 'collapsed' ? '54px' : mobileMode === 'expanded' ? '82vh' : '300px',
  },
}));

const CartHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.8),
  padding: theme.spacing(1, 1.5),
  borderBottom: `1px solid ${theme.palette.outlineVariant || theme.palette.divider}`,
  backgroundColor: theme.palette.surfaceContainerLow,
  flexShrink: 0,
}));

const CartStream = styled(Box)(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  padding: theme.spacing(1),
  '&::-webkit-scrollbar': { width: 5 },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: alpha(theme.palette.primary.main, 0.15),
    borderRadius: 9999,
  },
}));

const CartCheckoutDock = styled(Paper)(({ theme }) => ({
  flexShrink: 0,
  padding: theme.spacing(1.2, 1.5),
  backgroundColor: theme.palette.surfaceContainerHigh || theme.palette.background.paper,
  borderTop: `1px solid ${theme.palette.outlineVariant || theme.palette.divider}`,
  borderRadius: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.8),
  boxShadow: '0 -4px 20px rgba(0,0,0,0.04)',
}));

const SummaryRow = styled(Box)<{ highlight?: boolean }>(({ theme, highlight }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(0.3, 0),
  ...(highlight && {
    marginTop: theme.spacing(0.8),
    paddingTop: theme.spacing(1.2),
    borderTop: `1px dashed ${theme.palette.outlineVariant || theme.palette.divider}`,
  }),
}));

const QuickKeysRibbon = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1, 2.5),
  overflowX: 'auto',
  flexShrink: 0,
  backgroundColor: theme.palette.surfaceContainerLow || theme.palette.background.paper,
  borderTop: `1px solid ${theme.palette.outlineVariant || theme.palette.divider}`,
  '&::-webkit-scrollbar': { height: 4 },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: alpha(theme.palette.primary.main, 0.2),
    borderRadius: 9999,
  },
}));

// ==================== HELPER FUNCTIONS ====================

function formatCurrency(amount: number): string {
  return formatCur(amount, 'EGP');
}

function getStockStatus(stock: number, minStock: number): 'green' | 'yellow' | 'red' {
  if (stock <= 0) return 'red';
  if (stock <= minStock) return 'yellow';
  return 'green';
}

const CATEGORY_ICONS: Record<string, string> = {
  'cat-snacks': '🍟',
  'cat-drinks': '🥤',
  'cat-sweets': '🍫',
  'cat-care': '🧴',
  'cat-stationery': '📚',
  'cat-grocery': '🛒',
};

// ==================== MAIN POS COMPONENT ====================

export default function POSPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    cart,
    isScanning,
    searchQuery,
    selectedCategory,
    selectedCustomer,
    appliedCoupon,
    appliedGiftCard,
    payments,
    isProcessing,
    addToCart,
    removeFromCart,
    updateQuantity,
    updateDiscount,
    clearCart,
    setCustomer,
    setCoupon,
    removeCoupon,
    setGiftCard,
    removeGiftCard,
    addPayment,
    removePayment,
    clearPayments,
    setScanning,
    setSearchQuery,
    setSelectedCategory,
    quickKeys,
    setQuickKeys,
    setProcessing,
    calculateTotals,
    holdCurrentInvoice,
    heldInvoices,
    deliveryFee,
    setDeliveryFee,
    invoiceDiscount,
    invoiceDiscountType,
    setInvoiceDiscount,
  } = usePOSStore();

  const { user } = useAuthStore();
  const { isOffline } = useAppStore();

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [heldDialogOpen, setHeldDialogOpen] = useState(false);
  const [quotationModalOpen, setQuotationModalOpen] = useState(false);
  const [quotationsListOpen, setQuotationsListOpen] = useState(false);
  const [printQuotationOpen, setPrintQuotationOpen] = useState(false);
  const [quickProductOpen, setQuickProductOpen] = useState(false);
  const [activeQuotationToPrint, setActiveQuotationToPrint] = useState<Record<string, any> | null>(null);
  const [lastCompletedItems, setLastCompletedItems] = useState<any[]>([]);

  const handleQuotationCreated = useCallback((quotation: Record<string, unknown>, printNow: boolean) => {
    if (printNow) {
      setActiveQuotationToPrint(quotation);
      setPrintQuotationOpen(true);
    }
  }, []);

  const handlePrintQuotation = useCallback((quotation: Record<string, any>) => {
    setActiveQuotationToPrint(quotation);
    setPrintQuotationOpen(true);
  }, []);

  const [couponInput, setCouponInput] = useState('');
  const [giftCardInput, setGiftCardInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [giftCardError, setGiftCardError] = useState('');
  const [saleSuccess, setSaleSuccess] = useState(false);
  const [lastInvoiceNumber, setLastInvoiceNumber] = useState('');
  const [lastCompletedTotal, setLastCompletedTotal] = useState(0);
  const [lastCompletedSubtotal, setLastCompletedSubtotal] = useState(0);
  const [lastCompletedDiscount, setLastCompletedDiscount] = useState(0);
  const [lastCompletedTax, setLastCompletedTax] = useState(0);
  const [lastCompletedPaymentMethod, setLastCompletedPaymentMethod] = useState('cash');
  const [lastCompletedPaid, setLastCompletedPaid] = useState(0);
  const [lastCompletedCustomer, setLastCompletedCustomer] = useState('');
  const pendingPrintOptionsRef = useRef<SalePrintOptions | null>(null);

  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileCartMode, setMobileCartMode] = useState<'split' | 'expanded' | 'collapsed'>('split');

  const [cartPosition, setCartPosition] = useState<'right' | 'left'>(() => {
    try {
      return (localStorage.getItem('smartpos_cart_pos') as 'right' | 'left') || 'right';
    } catch {
      return 'right';
    }
  });

  const toggleCartPosition = useCallback(() => {
    setCartPosition((prev) => {
      const next = prev === 'right' ? 'left' : 'right';
      try {
        localStorage.setItem('smartpos_cart_pos', next);
      } catch {}
      toast.success(next === 'right' ? 'تم نقل السلة إلى اليمين' : 'تم نقل السلة إلى اليسار');
      return next;
    });
  }, []);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scanBufferRef = useRef('');
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [localSearch, setLocalSearch] = useState(searchQuery);

  const debouncedSearch = useCallback(
    (value: string) => {
      setLocalSearch(value);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        setSearchQuery(value);
      }, 100);
    },
    [setSearchQuery]
  );

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Fetch Products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products', 'pos', selectedCategory, searchQuery],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: 1,
        limit: 1000,
        isActive: true,
      };
      if (searchQuery) {
        return api.products.searchProducts(searchQuery, { page: 1, limit: 1000 });
      }
      if (selectedCategory) {
        (params as Record<string, unknown>).categoryId = selectedCategory;
      }
      return api.products.getProducts({ page: 1, limit: 1000, ...params });
    },
    staleTime: 30000,
  });

  const products = useMemo(() => {
    const rawList = Array.isArray(productsData)
      ? productsData
      : Array.isArray((productsData as any)?.data)
        ? (productsData as any).data
        : [];
    if (!rawList || rawList.length === 0) {
      return [];
    }
    return rawList.filter(Boolean).map((p: any) => ({
      id: p.id as string,
      name: (p.nameAr as string) || (p.name as string) || '',
      nameAr: p.nameAr as string,
      nameEn: p.nameEn as string,
      sku: p.sku as string,
      barcode: p.barcode as string,
      image: p.image as string,
      categoryId: p.categoryId as string,
      categoryName: p.categoryName as string,
      unit: p.unit as string,
      costPrice: Number(p.costPrice) || 0,
      sellingPrice: Number(p.sellingPrice) || 0,
      taxRate: typeof p.taxRate === 'number' && !isNaN(p.taxRate) && p.taxRate > 0 ? p.taxRate : 14,
      isActive: (p.isActive as boolean) ?? true,
      hasExpiry: (p.hasExpiry as boolean) ?? false,
      hasVariants: (p.hasVariants as boolean) ?? false,
      stock: Number(p.stock) || 0,
      minStock: Number(p.minStock) || 0,
    })) as Product[];
  }, [productsData]);

  const { data: categoriesData } = useQuery({
    queryKey: ['categories', 'pos'],
    queryFn: () => api.categories.getCategories({ page: 1, limit: 100 }),
    staleTime: 60000,
  });

  const categories = useMemo<Array<{ id: string; name: string; productCount: number }>>(() => {
    const rawList = Array.isArray(categoriesData)
      ? categoriesData
      : Array.isArray((categoriesData as any)?.data)
        ? (categoriesData as any).data
        : [];
    if (!rawList || rawList.length === 0) {
      return [];
    }
    return rawList.filter(Boolean).map((c: any) => ({
      id: (c.id as string) || '',
      name: (c.nameAr as string) || (c.name as string) || '',
      productCount: Number(c.productCount) || 0,
    }));
  }, [categoriesData]);

  const { data: favoritesData } = useQuery({
    queryKey: ['products', 'favorites'],
    queryFn: () => api.products.getProducts({ page: 1, limit: 20, sortBy: 'totalSales', sortOrder: 'desc' }),
    staleTime: 300000,
  });

  useEffect(() => {
    const rawList = Array.isArray(favoritesData)
      ? favoritesData
      : Array.isArray((favoritesData as any)?.data)
        ? (favoritesData as any).data
        : [];
    if (rawList.length > 0 && quickKeys.length === 0) {
      setQuickKeys(
        rawList.filter(Boolean).slice(0, 10).map((p: any) => ({
          id: p.id as string,
          name: (p.nameAr as string) || (p.name as string) || '',
          nameAr: p.nameAr as string,
          nameEn: p.nameEn as string,
          sku: p.sku as string,
          barcode: p.barcode as string,
          image: p.image as string,
          categoryId: p.categoryId as string,
          unit: p.unit as string,
          costPrice: Number(p.costPrice) || 0,
          sellingPrice: Number(p.sellingPrice) || 0,
          taxRate: Number(p.taxRate) || 0,
          isActive: true,
          hasExpiry: false,
          hasVariants: false,
        })) as Product[]
      );
    }
  }, [favoritesData, quickKeys.length, setQuickKeys]);

  // Mutations
  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      const totals = calculateTotals();
      const items = cart.map((item) => ({
        productId: item.product.id.startsWith('custom-') ? 'CUSTOM' : item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        discountType: item.discountType,
        taxRate: item.taxRate,
        variantId: item.variant?.id,
      }));
      const paymentDtos = payments.map((p) => ({
        method: p.method,
        amount: p.amount,
        reference: p.reference,
      }));
      return api.invoices.createInvoice({
        customerId: selectedCustomer?.id,
        items,
        discount: totals.totalDiscount,
        discountType: 'fixed',
        notes: '',
        payments: paymentDtos,
        couponCode: appliedCoupon?.code,
        giftCardCode: appliedGiftCard?.code,
      });
    },
    onSuccess: (data) => {
      const invoiceData = data as { invoiceNumber: string; grandTotal?: number };
      const invNum = invoiceData.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;
      setLastInvoiceNumber(invNum);
      const totals = calculateTotals();
      setLastCompletedSubtotal(totals.subtotal);
      setLastCompletedDiscount(totals.totalDiscount);
      setLastCompletedTax(totals.totalTax);
      setLastCompletedTotal(totals.grandTotal);
      setLastCompletedCustomer(selectedCustomer?.name || 'زبون نقدي');
      const primaryPayment = payments[0];
      setLastCompletedPaymentMethod(primaryPayment?.method || 'cash');
      setLastCompletedPaid(totals.totalPaid || totals.grandTotal);

      const completedItems = cart.map((i) => {
        const lineTotal = i.unitPrice * i.quantity;
        const itemDiscount =
          i.discountType === 'percentage'
            ? Math.round(((lineTotal * Math.min(100, i.discount || 0)) / 100) * 100) / 100
            : Math.min(lineTotal, i.discount || 0);
        const lineTaxable = Math.max(0, lineTotal - itemDiscount);
        const taxRate = typeof i.taxRate === 'number' ? i.taxRate : 14;
        const lineTax = Math.round(((lineTaxable * taxRate) / 100) * 100) / 100;
        return {
          name: i.product.nameAr || i.product.name,
          sku: i.product.sku,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: itemDiscount,
          taxRate,
          taxAmount: lineTax,
          total: lineTaxable + lineTax,
        };
      });

      setLastCompletedItems(completedItems);

      const receiptPayload = {
        storeName: 'متجر الأمل الذكي',
        storePhone: '01000000000',
        storeAddress: 'القاهرة - مصر',
        taxNumber: '399-456-789',
        commercialRegister: '128456',
        invoiceNumber: invNum,
        cashierName: user?.fullName || 'كاشير المتجر',
        customerName: selectedCustomer?.name || 'عميل نقدي',
        customerPhone: selectedCustomer?.phone,
        items: completedItems,
        subtotal: totals.subtotal,
        discount: totals.totalDiscount,
        taxableAmount: totals.taxableAmount,
        tax: totals.totalTax,
        shipping: totals.deliveryFee,
        grandTotal: totals.grandTotal,
        paidAmount: totals.totalPaid || totals.grandTotal,
        changeAmount: totals.change,
        balanceAmount: totals.balance,
        paymentMethod: primaryPayment?.method || 'cash',
      };

      const printOpts = pendingPrintOptionsRef.current;
      if (printOpts?.printThermal58) {
        printThermalReceipt({ ...receiptPayload, paperSize: '58mm' });
      } else if (printOpts?.printThermal80) {
        printThermalReceipt({ ...receiptPayload, paperSize: '80mm' });
      }
      if (printOpts?.printA4) {
        printA4Invoice(receiptPayload);
      }
      if (printOpts?.printWhatsApp && selectedCustomer?.phone) {
        const phone = selectedCustomer.phone.replace(/[^0-9]/g, '');
        const message = encodeURIComponent(
          `مرحباً ${selectedCustomer.name}، فاتورتك رقم #${invNum} بقيمة ${formatCurrency(totals.grandTotal)} جاهزة. شكراً لتعاملك معنا!`
        );
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
      }
      pendingPrintOptionsRef.current = null;

      setSaleSuccess(true);
      setPaymentModalOpen(false);
      clearPayments();
      setTimeout(() => {
        clearCart();
        searchInputRef.current?.focus();
      }, 500);
    },
    onError: (err: any) => {
      setProcessing(false);
      const totals = calculateTotals();
      const items = cart.map((item) => ({
        productId: item.product.id,
        productName: item.product.nameAr || item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        discountType: item.discountType,
        taxRate: item.taxRate,
        variantId: item.variant?.id,
      }));
      const paymentDtos = payments.map((p) => ({
        method: p.method,
        amount: p.amount,
        reference: p.reference,
      }));
      offlineService.saveOfflineInvoice({
        customerId: selectedCustomer?.id,
        items,
        discount: totals.totalDiscount,
        discountType: 'fixed',
        notes: 'Offline invoice',
        payments: paymentDtos,
        couponCode: appliedCoupon?.code,
        giftCardCode: appliedGiftCard?.code,
      });

      const offInvoiceNum = `OFF-${Date.now().toString().slice(-6)}`;
      setLastInvoiceNumber(offInvoiceNum);
      setLastCompletedSubtotal(totals.subtotal);
      setLastCompletedDiscount(totals.totalDiscount);
      setLastCompletedTax(totals.totalTax);
      setLastCompletedTotal(totals.grandTotal);
      setLastCompletedCustomer(selectedCustomer?.name || 'زبون نقدي');
      const primaryPayment = payments[0];
      setLastCompletedPaymentMethod(primaryPayment?.method || 'cash');
      setLastCompletedPaid(totals.totalPaid || totals.grandTotal);

      const completedItems = cart.map((i) => {
        const lineTotal = i.unitPrice * i.quantity;
        const itemDiscount =
          i.discountType === 'percentage'
            ? Math.round(((lineTotal * Math.min(100, i.discount || 0)) / 100) * 100) / 100
            : Math.min(lineTotal, i.discount || 0);
        const lineTaxable = Math.max(0, lineTotal - itemDiscount);
        const taxRate = typeof i.taxRate === 'number' ? i.taxRate : 14;
        const lineTax = Math.round(((lineTaxable * taxRate) / 100) * 100) / 100;
        return {
          name: i.product.nameAr || i.product.name,
          sku: i.product.sku,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: itemDiscount,
          taxRate,
          taxAmount: lineTax,
          total: lineTaxable + lineTax,
        };
      });

      setLastCompletedItems(completedItems);

      const receiptPayload = {
        storeName: 'متجر الأمل الذكي',
        storePhone: '01000000000',
        storeAddress: 'القاهرة - مصر',
        taxNumber: '399-456-789',
        commercialRegister: '128456',
        invoiceNumber: offInvoiceNum,
        cashierName: user?.fullName || 'كاشير المتجر',
        customerName: selectedCustomer?.name || 'عميل نقدي',
        customerPhone: selectedCustomer?.phone,
        items: completedItems,
        subtotal: totals.subtotal,
        discount: totals.totalDiscount,
        taxableAmount: totals.taxableAmount,
        tax: totals.totalTax,
        shipping: totals.deliveryFee,
        grandTotal: totals.grandTotal,
        paidAmount: totals.totalPaid || totals.grandTotal,
        changeAmount: totals.change,
        balanceAmount: totals.balance,
        paymentMethod: primaryPayment?.method || 'cash',
      };

      const printOpts = pendingPrintOptionsRef.current;
      if (printOpts?.printThermal58) {
        printThermalReceipt({ ...receiptPayload, paperSize: '58mm' });
      } else if (printOpts?.printThermal80) {
        printThermalReceipt({ ...receiptPayload, paperSize: '80mm' });
      }
      if (printOpts?.printA4) {
        printA4Invoice(receiptPayload);
      }
      if (printOpts?.printWhatsApp && selectedCustomer?.phone) {
        const phone = selectedCustomer.phone.replace(/[^0-9]/g, '');
        const message = encodeURIComponent(
          `مرحباً ${selectedCustomer.name}، فاتورتك رقم #${offInvoiceNum} بقيمة ${formatCurrency(totals.grandTotal)} جاهزة. شكراً لتعاملك معنا!`
        );
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
      }
      pendingPrintOptionsRef.current = null;

      setSaleSuccess(true);
      setPaymentModalOpen(false);
      clearPayments();
      toast.success('⚡ تم حفظ الفاتورة بنجاح في سجل المبيعات');
      setTimeout(() => {
        clearCart();
        searchInputRef.current?.focus();
      }, 500);
    },
  });

  const handleQuickCash = useCallback(() => {
    if (cart.length === 0 || isProcessing) return;
    const totals = calculateTotals();
    clearPayments();
    addPayment({
      id: `cash-${Date.now()}`,
      method: 'cash',
      amount: totals.grandTotal,
    });
    setProcessing(true);
    createInvoiceMutation.mutate();
  }, [cart.length, isProcessing, calculateTotals, clearPayments, addPayment, setProcessing, createInvoiceMutation]);

  // حماية التاجر: منع الكاشير من تطبيق أي خصم يجعل سعر البيع أقل من سعر التكلفة
  const handleUpdateDiscount = useCallback(
    (itemId: string, discount: number, discountType: 'percentage' | 'fixed') => {
      const item = cart.find((i) => i.id === itemId);
      if (!item) return;

      const costPrice = Number(item.product.costPrice || 0);
      if (costPrice > 0 && user?.role === UserRole.CASHIER) {
        const lineTotal = item.unitPrice * item.quantity;
        const discountAmount =
          discountType === 'percentage'
            ? (lineTotal * discount) / 100
            : discount;
        const unitDiscount = discountAmount / (item.quantity || 1);
        const finalUnitPrice = item.unitPrice - unitDiscount;

        if (finalUnitPrice < costPrice) {
          toast.error(
            `غير مسموح بخصم يجعل سعر البيع (${finalUnitPrice.toFixed(2)} ج.م) أقل من سعر التكلفة (${costPrice} ج.م) لمنع الخسارة!`
          );
          return;
        }
      }

      updateDiscount(itemId, discount, discountType);
    },
    [cart, user?.role, updateDiscount]
  );

  const validateCouponMutation = useMutation({
    mutationFn: async (code: string) => {
      const totals = calculateTotals();
      return api.coupons.validateCoupon(code, totals.grandTotal);
    },
    onSuccess: (data) => {
      const couponData = data as any;
      const c = couponData?.coupon || couponData;
      if (couponData?.valid && c) {
        setCoupon({
          id: c.id || `coupon-${Date.now()}`,
          code: c.code || couponInput,
          discountType: (c.discountType as 'percentage' | 'fixed') || 'fixed',
          discountValue: Number(c.discountValue) || 0,
          maxDiscount: c.maxDiscount ? Number(c.maxDiscount) : undefined,
          minOrderAmount: c.minOrderAmount ? Number(c.minOrderAmount) : undefined,
        });
        setCouponInput('');
        setCouponError('');
        toast.success(`تم تفعيل كوبون الخصم: ${c.code || couponInput} بنجاح!`);
      } else {
        const msg = couponData?.message || t('pos.invalidCoupon') || 'كوبون الخصم غير صالح أو لا يلبي الحد الأدنى';
        setCouponError(msg);
        toast.error(msg);
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || t('pos.invalidCoupon') || 'فشل التحقق من الكوبون';
      setCouponError(msg);
      toast.error(msg);
    },
  });

  const validateGiftCardMutation = useMutation({
    mutationFn: async (code: string) => {
      return api.giftCards.validateGiftCard(code);
    },
    onSuccess: (data) => {
      const gcData = data as { valid: boolean; balance: number; code: string };
      if (gcData.valid) {
        setGiftCard({
          id: `gc-${Date.now()}`,
          code: gcData.code,
          balance: gcData.balance,
          isActive: true,
        });
        setGiftCardInput('');
        setGiftCardError('');
      } else {
        setGiftCardError(t('giftCards.invalidGiftCard'));
      }
    },
    onError: () => {
      setGiftCardError(t('giftCards.invalidGiftCard'));
    },
  });

  const handleApplyCoupon = useCallback(
    (codeToApply?: string) => {
      const target = (codeToApply || couponInput).trim();
      if (!target) return;
      if (codeToApply) setCouponInput(target);
      validateCouponMutation.mutate(target);
    },
    [couponInput, validateCouponMutation]
  );

  const handleApplyGiftCard = useCallback(() => {
    if (!giftCardInput.trim()) return;
    validateGiftCardMutation.mutate(giftCardInput.trim());
  }, [giftCardInput, validateGiftCardMutation]);

  const handleBarcodeScanned = useCallback(
    (barcode: string) => {
      // 1. Check weight scale barcode (13-digit EAN starting with 20 or 21)
      if (barcode.length === 13 && (barcode.startsWith('20') || barcode.startsWith('21'))) {
        const productCode = barcode.substring(2, 7);
        const rawValue = parseFloat(barcode.substring(7, 12));
        const matched = products.find((p) => p.sku?.includes(productCode) || p.barcode?.includes(productCode));
        if (matched) {
          const weightKg = rawValue > 100 ? rawValue / 1000 : rawValue;
          addToCart(matched, weightKg);
          toast.success(`تمت إضافة ${matched.name} (وزن: ${weightKg.toFixed(3)} كجم)`);
          return;
        }
      }

      // 2. Standard product barcode check
      const found = products.find((p) => p.barcode === barcode);
      if (found) {
        addToCart(found, 1);
        toast.success(`تم مسح: ${found.name}`);
      } else {
        toast.error(`لم يتم العثور على باركود: ${barcode}`);
      }
    },
    [products, addToCart]
  );

  useEffect(() => {
    if (!isScanning) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const barcode = scanBufferRef.current;
        scanBufferRef.current = '';
        if (barcode) {
          handleBarcodeScanned(barcode);
        }
        return;
      }
      if (e.key.length === 1) {
        scanBufferRef.current += e.key;
        if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
        scanTimerRef.current = setTimeout(() => {
          scanBufferRef.current = '';
        }, 50);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    };
  }, [isScanning, handleBarcodeScanned]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case 'F1':
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
        case 'F2':
          e.preventDefault();
          setScanning(!isScanning);
          break;
        case 'F3':
          e.preventDefault();
          if (cart.length > 0) {
            const heldId = holdCurrentInvoice();
            if (heldId) toast.success('تم تعليق الفاتورة بنجاح');
          } else {
            setHeldDialogOpen(true);
          }
          break;
        case 'F4':
          e.preventDefault();
          if (cart.length > 0) handleQuickCash();
          break;
        case 'F7':
          e.preventDefault();
          setQuickProductOpen(true);
          break;
        case 'F8':
          e.preventDefault();
          if (cart.length > 0) setPaymentModalOpen(true);
          break;
        case 'F9':
          e.preventDefault();
          setQuotationsListOpen(true);
          break;
        case 'Escape':
          e.preventDefault();
          setPaymentModalOpen(false);
          setHeldDialogOpen(false);
          setQuickProductOpen(false);
          searchInputRef.current?.focus();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isScanning, setScanning, cart.length, handleQuickCash, holdCurrentInvoice]);

  const handleCompleteSale = useCallback((options?: SalePrintOptions) => {
    if (options) {
      pendingPrintOptionsRef.current = options;
    }
    setProcessing(true);
    createInvoiceMutation.mutate();
  }, [setProcessing, createInvoiceMutation]);

  const totals = useMemo(() => calculateTotals(), [calculateTotals, cart, payments, appliedCoupon]);

  const handleAddProduct = useCallback(
    (product: Product) => {
      addToCart(product, 1);
    },
    [addToCart]
  );

  const filteredProducts = useMemo(() => {
    if (!localSearch) return products;
    const q = localSearch.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.nameAr || '').toLowerCase().includes(q) ||
        (p.nameEn || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q)
    );
  }, [products, localSearch]);

  const totalCartUnits = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  return (
    <StyledContainer>
      {/* Sale Success Notification Bar */}
      {saleSuccess && (
        <Alert
          severity="success"
          sx={{
            borderRadius: 0,
            display: 'flex',
            alignItems: 'center',
            py: 0.5,
            px: 2.5,
            boxShadow: theme.shadows[2],
          }}
          action={
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                startIcon={<PrintIcon />}
                onClick={() => {
                  printThermalReceipt({
                    storeName: 'متجر الأمل الذكي',
                    invoiceNumber: lastInvoiceNumber,
                    cashierName: user?.fullName || 'كاشير المتجر',
                    customerName: lastCompletedCustomer || selectedCustomer?.name,
                    items:
                      lastCompletedItems.length > 0
                        ? lastCompletedItems
                        : [{ name: 'مشتريات عامة', quantity: 1, unitPrice: lastCompletedTotal, total: lastCompletedTotal }],
                    subtotal: lastCompletedSubtotal || lastCompletedTotal,
                    discount: lastCompletedDiscount,
                    tax: lastCompletedTax,
                    grandTotal: lastCompletedTotal,
                    paidAmount: lastCompletedPaid || lastCompletedTotal,
                    changeAmount: Math.max(0, (lastCompletedPaid || lastCompletedTotal) - lastCompletedTotal),
                    paymentMethod: lastCompletedPaymentMethod,
                    paperSize: '80mm',
                  });
                }}
                sx={{ borderRadius: 9999, fontWeight: 700 }}
              >
                🖨️ حراري 80mm
              </Button>
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                startIcon={<PrintIcon />}
                onClick={() => {
                  printThermalReceipt({
                    storeName: 'متجر الأمل الذكي',
                    invoiceNumber: lastInvoiceNumber,
                    cashierName: user?.fullName || 'كاشير المتجر',
                    customerName: lastCompletedCustomer || selectedCustomer?.name,
                    items:
                      lastCompletedItems.length > 0
                        ? lastCompletedItems
                        : [{ name: 'مشتريات عامة', quantity: 1, unitPrice: lastCompletedTotal, total: lastCompletedTotal }],
                    subtotal: lastCompletedSubtotal || lastCompletedTotal,
                    discount: lastCompletedDiscount,
                    tax: lastCompletedTax,
                    grandTotal: lastCompletedTotal,
                    paidAmount: lastCompletedPaid || lastCompletedTotal,
                    changeAmount: Math.max(0, (lastCompletedPaid || lastCompletedTotal) - lastCompletedTotal),
                    paymentMethod: lastCompletedPaymentMethod,
                    paperSize: '58mm',
                  });
                }}
                sx={{ borderRadius: 9999, fontWeight: 700 }}
              >
                🖨️ حراري 58mm
              </Button>
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                startIcon={<QuoteIcon />}
                onClick={() => {
                  printA4Invoice({
                    storeName: 'متجر الأمل الذكي',
                    invoiceNumber: lastInvoiceNumber,
                    cashierName: user?.fullName || 'كاشير المتجر',
                    customerName: lastCompletedCustomer || selectedCustomer?.name,
                    items:
                      lastCompletedItems.length > 0
                        ? lastCompletedItems
                        : [{ name: 'مشتريات عامة', quantity: 1, unitPrice: lastCompletedTotal, total: lastCompletedTotal }],
                    subtotal: lastCompletedSubtotal || lastCompletedTotal,
                    discount: lastCompletedDiscount,
                    tax: lastCompletedTax,
                    grandTotal: lastCompletedTotal,
                    paidAmount: lastCompletedPaid || lastCompletedTotal,
                    changeAmount: Math.max(0, (lastCompletedPaid || lastCompletedTotal) - lastCompletedTotal),
                    paymentMethod: lastCompletedPaymentMethod,
                  });
                }}
                sx={{ borderRadius: 9999, fontWeight: 700 }}
              >
                📄 فاتورة A4
              </Button>
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                startIcon={<WhatsAppIcon />}
                onClick={() => {
                  const phone = selectedCustomer?.phone ? selectedCustomer.phone.replace(/[^0-9]/g, '') : '';
                  const message = encodeURIComponent(
                    `مرحباً بك! فاتورتك رقم ${lastInvoiceNumber} بمبلغ ${formatCurrency(lastCompletedTotal)} تم إصدارها بنجاح.`
                  );
                  const url = phone
                    ? `https://wa.me/20${phone.startsWith('0') ? phone.slice(1) : phone}?text=${message}`
                    : `https://wa.me/?text=${message}`;
                  window.open(url, '_blank');
                }}
                sx={{ borderRadius: 9999, fontWeight: 700 }}
              >
                واتساب 📲
              </Button>
              <IconButton
                size="small"
                color="inherit"
                onClick={() => {
                  setSaleSuccess(false);
                  setLastInvoiceNumber('');
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          }
        >
          تم إتمام البيع بنجاح! رقم الفاتورة: <strong>{lastInvoiceNumber}</strong> (الإجمالي: {formatCurrency(lastCompletedTotal)})
        </Alert>
      )}

      {/* ================= TOP COMMAND BAR (M3 Expressive) ================= */}
      <TopCommandBar>
        {/* Search & Barcode Scanner Pill */}
        <SearchField
          placeholder="ابحث بالاسم، الكود، أو الباركود... (F1)"
          value={localSearch}
          onChange={(e) => debouncedSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const q = localSearch.trim();
              if (!q) return;
              // Check exact barcode or SKU match
              const matched = products.find(
                (p) => p.barcode?.toLowerCase() === q.toLowerCase() || p.sku?.toLowerCase() === q.toLowerCase()
              );
              if (matched) {
                addToCart(matched, 1);
                toast.success(`تمت إضافة: ${matched.name}`);
                debouncedSearch('');
                return;
              }
              // If filtered results has exactly 1 product
              const singleMatch = filteredProducts[0];
              if (filteredProducts.length === 1 && singleMatch) {
                addToCart(singleMatch, 1);
                toast.success(`تمت إضافة: ${singleMatch.name}`);
                debouncedSearch('');
                return;
              }
            }
          }}
          inputRef={searchInputRef}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'primary.main', ml: 0.5 }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  {localSearch && (
                    <IconButton size="small" onClick={() => debouncedSearch('')} sx={{ mr: 0.5 }}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  )}
                  <Tooltip title={isScanning ? 'قارئ الباركود نشط (F2)' : 'تفعيل قارئ الباركود (F2)'}>
                    <IconButton
                      size="small"
                      color={isScanning ? 'primary' : 'default'}
                      onClick={() => setScanning(!isScanning)}
                      sx={{
                        backgroundColor: isScanning ? alpha(theme.palette.primary.main, 0.15) : 'transparent',
                        borderRadius: '50%',
                        p: 0.8,
                      }}
                    >
                      <BarcodeIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            },
          }}
        />

        {/* Action Controls */}
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="outlined"
            size="medium"
            onClick={() => setQuickProductOpen(true)}
            startIcon={<FlashIcon />}
            sx={{
              borderRadius: 9999,
              px: 2,
              minHeight: 40,
              fontWeight: 700,
              borderColor: alpha(theme.palette.primary.main, 0.3),
              '&:hover': { borderColor: theme.palette.primary.main },
            }}
          >
            صنف حر (F7)
          </Button>

          <Button
            variant="outlined"
            size="medium"
            disabled={cart.length === 0}
            onClick={() => {
              const heldId = holdCurrentInvoice();
              if (heldId) {
                toast.success('تم تعليق الفاتورة بنجاح');
              } else {
                toast.error('السلة فارغة، لا يمكن تعليق فاتورة فارغة');
              }
            }}
            startIcon={<HoldIcon />}
            sx={{
              borderRadius: 9999,
              px: 2,
              minHeight: 40,
              fontWeight: 700,
            }}
          >
            تعليق (F3)
          </Button>

          <Button
            variant="outlined"
            size="medium"
            onClick={() => setHeldDialogOpen(true)}
            startIcon={
              <Badge badgeContent={heldInvoices?.length || 0} color="warning">
                <HeldFolderIcon />
              </Badge>
            }
            sx={{
              borderRadius: 9999,
              px: { xs: 1.5, sm: 2 },
              minHeight: 40,
              fontWeight: 700,
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>الفواتير المعلقة</Box>
            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>معلقة</Box> ({heldInvoices?.length || 0})
          </Button>

          <Button
            variant="outlined"
            size="medium"
            onClick={() => setQuotationsListOpen(true)}
            startIcon={<QuoteIcon />}
            sx={{
              borderRadius: 9999,
              px: { xs: 1.5, sm: 2 },
              minHeight: 40,
              fontWeight: 700,
              display: { xs: 'none', sm: 'inline-flex' },
            }}
          >
            عروض الأسعار (F9)
          </Button>

          <Button
            variant="contained"
            color="primary"
            size="medium"
            onClick={() => {
              if (cart.length > 0) {
                if (window.confirm('هل تريد بدء بيع جديد وتفريغ السلة؟')) {
                  clearCart();
                }
              }
            }}
            startIcon={<NewSaleIcon />}
            sx={{
              borderRadius: 9999,
              px: { xs: 1.5, sm: 2.5 },
              minHeight: 40,
              fontWeight: 800,
              boxShadow: theme.shadows[2],
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>فاتورة جديدة</Box>
            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>جديدة</Box>
          </Button>

          {!isMobile && (
            <Button
              variant="outlined"
              size="medium"
              onClick={toggleCartPosition}
              startIcon={<SwapHorizIcon />}
              sx={{
                borderRadius: 9999,
                px: 2,
                minHeight: 40,
                fontWeight: 700,
                color: 'text.secondary',
                borderColor: alpha(theme.palette.divider, 0.8),
              }}
            >
              مكان السلة: {cartPosition === 'right' ? 'يمين' : 'يسار'}
            </Button>
          )}
        </Stack>
      </TopCommandBar>

      {/* ================= CATEGORY PILLS RIBBON ================= */}
      <CategoryRibbon>
        <Chip
          label="🌟 جميع الأصناف"
          clickable
          color={!selectedCategory ? 'primary' : 'default'}
          variant={!selectedCategory ? 'filled' : 'outlined'}
          onClick={() => setSelectedCategory(null)}
          sx={{
            borderRadius: 9999,
            px: 1.5,
            py: 2.2,
            fontWeight: 800,
            fontSize: '0.9rem',
            boxShadow: !selectedCategory ? theme.shadows[2] : 'none',
          }}
        />
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const icon = CATEGORY_ICONS[cat.id] || '📦';
          return (
            <Chip
              key={cat.id}
              label={`${icon} ${cat.name}${cat.productCount ? ` (${cat.productCount})` : ''}`}
              clickable
              color={isSelected ? 'primary' : 'default'}
              variant={isSelected ? 'filled' : 'outlined'}
              onClick={() => setSelectedCategory(cat.id)}
              sx={{
                borderRadius: 9999,
                px: 1.5,
                py: 2.2,
                fontWeight: isSelected ? 800 : 600,
                fontSize: '0.88rem',
                boxShadow: isSelected ? theme.shadows[2] : 'none',
                borderColor: isSelected ? theme.palette.primary.main : theme.palette.outlineVariant || theme.palette.divider,
                backgroundColor: isSelected
                  ? undefined
                  : theme.palette.surfaceContainerLow || theme.palette.background.paper,
                '&:hover': {
                  backgroundColor: isSelected
                    ? undefined
                    : alpha(theme.palette.primary.main, 0.08),
                },
              }}
            />
          );
        })}
      </CategoryRibbon>

      {/* ================= MAIN WORKSPACE (CATALOG + CASHIER TERMINAL) ================= */}
      <MainWorkspace sx={{ flexDirection: isMobile ? 'column' : (cartPosition === 'right' ? 'row-reverse' : 'row') }}>
        {/* RIGHT (IN RTL): PRODUCT CATALOG GRID - ALWAYS VISIBLE */}
        <CatalogPanel sx={{ display: 'flex', position: 'relative', order: 1, flex: 1, minHeight: 0 }}>
          {productsLoading ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, 1fr)',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(3, 1fr)',
                  lg: 'repeat(4, 1fr)',
                  xl: 'repeat(5, 1fr)',
                },
                gap: 2,
                p: 2.5,
              }}
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <Paper
                  key={i}
                  sx={{
                    p: 1.5,
                    borderRadius: '20px',
                    border: `1px solid ${theme.palette.divider}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                  }}
                >
                  <Skeleton variant="rounded" width="100%" height={110} sx={{ borderRadius: '16px' }} />
                  <Skeleton variant="text" width="80%" height={24} />
                  <Skeleton variant="text" width="40%" height={18} />
                </Paper>
              ))}
            </Box>
          ) : filteredProducts.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: 2,
                color: 'text.secondary',
                p: 4,
                textAlign: 'center',
              }}
            >
              <Inventory2 sx={{ fontSize: 72, color: 'primary.main', opacity: 0.6 }} />
              <Typography variant="h6" fontWeight={800} color="text.primary">
                {searchQuery ? 'لا توجد نتائج مطابقة لبحثك' : 'لا توجد أصناف في المتجر بعد'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 440, lineHeight: 1.7 }}>
                {searchQuery
                  ? 'تأكد من كتابة الاسم أو الباركود بشكل صحيح، أو أضف المنتج لقائمة الأصناف.'
                  : 'يمكنك البدء بإضافة منتجاتك الخاصة الآن، أو استخدام البيع المباشر السريع لأي صنف.'}
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
                {searchQuery ? (
                  <Button
                    variant="outlined"
                    onClick={() => debouncedSearch('')}
                    sx={{ borderRadius: 9999, px: 3, fontWeight: 700 }}
                  >
                    إعادة ضبط البحث
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => navigate('/products/new')}
                      sx={{ borderRadius: 9999, px: 3, py: 1.2, fontWeight: 800 }}
                    >
                      إضافة صنف جديد
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<FlashIcon />}
                      onClick={() => setQuickProductOpen(true)}
                      sx={{ borderRadius: 9999, px: 3, py: 1.2, fontWeight: 700 }}
                    >
                      بيع صنف حر (F7)
                    </Button>
                  </>
                )}
              </Stack>
            </Box>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, 1fr)',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(3, 1fr)',
                  lg: 'repeat(4, 1fr)',
                  xl: 'repeat(5, 1fr)',
                },
                gap: 2,
                p: 2,
                overflowY: 'auto',
                flex: 1,
                minHeight: 0,
                alignContent: 'start',
              }}
            >
              {filteredProducts.map((product) => {
                const inCartItem = cart.find((i) => i.product.id === product.id);
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddProduct}
                    stockStatus={getStockStatus(product.stock ?? 0, product.minStock ?? 0)}
                    inCartCount={inCartItem ? inCartItem.quantity : 0}
                  />
                );
              })}
            </Box>
          )}

          {/* Quick Keys Fast Moving Items Bar */}
          {quickKeys.length > 0 && (
            <QuickKeysRibbon>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, flexShrink: 0 }}>
                الأكثر طلباً:
              </Typography>
              {quickKeys.map((product) => (
                <Chip
                  key={product.id}
                  label={product.name}
                  clickable
                  onClick={() => handleAddProduct(product)}
                  variant="outlined"
                  size="small"
                  sx={{
                    borderRadius: 9999,
                    fontWeight: 600,
                    backgroundColor: theme.palette.surfaceContainerHighest || alpha(theme.palette.primary.main, 0.05),
                    '&:hover': {
                      borderColor: theme.palette.primary.main,
                    },
                  }}
                />
              ))}
            </QuickKeysRibbon>
          )}
        </CatalogPanel>

        {/* LEFT (IN RTL): CASHIER TERMINAL & CART STREAM - ALWAYS VISIBLE RECTANGLE */}
        <TerminalCartPanel mobileMode={mobileCartMode} sx={{ order: 2 }}>
          {/* Cart Header: Status & Controls */}
          <CartHeader sx={{ py: isMobile ? 0.75 : 1, px: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    backgroundColor: 'success.main',
                    boxShadow: '0 0 8px rgba(76, 175, 80, 0.6)',
                  }}
                />
                <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                  طلب بيع مباشر #1
                </Typography>
                <Chip
                  label={`${totalCartUnits} قطعة`}
                  size="small"
                  color="primary"
                  sx={{ borderRadius: 9999, fontWeight: 700, height: 20, fontSize: '0.72rem' }}
                />
              </Box>

              <Stack direction="row" spacing={0.5} alignItems="center">
                {cart.length > 0 && (
                  <Tooltip title="تفريغ السلة">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        if (window.confirm('هل أنت متأكد من رغبتك في تفريغ محتويات السلة بالكامل؟')) {
                          clearCart();
                        }
                      }}
                      sx={{ borderRadius: 9999, p: 0.5 }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}

                {isMobile && (
                  <Tooltip title={mobileCartMode === 'collapsed' ? 'توسيع الفاتورة' : mobileCartMode === 'expanded' ? 'تصغير إلى شاشة منقسمة' : 'توسيع التفاصيل'}>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => {
                        setMobileCartMode((prev) => (prev === 'collapsed' ? 'split' : prev === 'split' ? 'expanded' : 'split'));
                      }}
                      sx={{ borderRadius: 9999, p: 0.5, bgcolor: alpha(theme.palette.primary.main, 0.08) }}
                    >
                      {mobileCartMode === 'expanded' ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            </Box>

            {/* Customer Selector Capsule - Always Accessible on desktop, or when expanded on mobile */}
            {(!isMobile || mobileCartMode === 'expanded') && (
              <CustomerSelect
                value={selectedCustomer ?? undefined}
                onChange={(c) => setCustomer(c ?? null)}
              />
            )}
          </CartHeader>

          {/* Cart Items Stream */}
          <CartStream>
            {cart.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: isMobile ? 'row' : 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  gap: 1.5,
                  py: isMobile ? 1.5 : 2.5,
                  px: 2,
                  textAlign: 'center',
                }}
              >
                <Box
                  sx={{
                    width: isMobile ? 36 : 54,
                    height: isMobile ? 36 : 54,
                    borderRadius: isMobile ? '12px' : '18px',
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'primary.main',
                    boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.15)}`,
                    flexShrink: 0,
                  }}
                >
                  <ShoppingCartCheckout sx={{ fontSize: isMobile ? 20 : 28 }} />
                </Box>
                <Box sx={{ textAlign: isMobile ? 'right' : 'center' }}>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.25, fontSize: isMobile ? '0.82rem' : '0.88rem' }}>
                    المستطيل جاهز لتسجيل الأصناف
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.72rem' : '0.75rem' }}>
                    اضغط على أي صنف أعلاه لإضافته وحساب السعر فوراً
                  </Typography>
                </Box>
                {!isMobile && (
                  <Stack direction="row" spacing={0.8} sx={{ mt: 0.5 }}>
                    <Chip label="F1: بحث" size="small" variant="outlined" sx={{ borderRadius: 9999, fontSize: '0.72rem', height: 22 }} />
                    <Chip label="F2: باركود" size="small" variant="outlined" sx={{ borderRadius: 9999, fontSize: '0.72rem', height: 22 }} />
                    <Chip label="F4: كاش" size="small" variant="outlined" sx={{ borderRadius: 9999, fontSize: '0.72rem', height: 22 }} />
                  </Stack>
                )}
              </Box>
            ) : (
              <Stack spacing={1}>
                {cart.map((item) => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onUpdateQuantity={updateQuantity}
                    onUpdateDiscount={handleUpdateDiscount}
                    onRemove={removeFromCart}
                  />
                ))}
              </Stack>
            )}
          </CartStream>

          {/* Direct Invoice Discount & Delivery Fee Row */}
          {cart.length > 0 && (
            <Box sx={{ px: 2, py: 1.2, borderTop: `1px solid ${theme.palette.outlineVariant || theme.palette.divider}`, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  size="small"
                  type="number"
                  placeholder="خصم الفاتورة..."
                  value={invoiceDiscount || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setInvoiceDiscount(val, invoiceDiscountType);
                  }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Typography variant="caption" fontWeight={700} color="error.main">
                            خصم:
                          </Typography>
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <Button
                            size="small"
                            onClick={() => {
                              const nextType = invoiceDiscountType === 'fixed' ? 'percentage' : 'fixed';
                              setInvoiceDiscount(invoiceDiscount, nextType);
                            }}
                            sx={{ minWidth: 34, px: 0.5, py: 0.2, fontSize: '0.75rem', fontWeight: 800 }}
                          >
                            {invoiceDiscountType === 'fixed' ? 'ج.م' : '%'}
                          </Button>
                        </InputAdornment>
                      ),
                    },
                    htmlInput: { min: 0, step: 0.5 },
                  }}
                  sx={{
                    flex: 1,
                    '& .MuiOutlinedInput-root': { borderRadius: 9999, height: 36 },
                  }}
                />

                <TextField
                  size="small"
                  type="number"
                  placeholder="رسوم التوصيل..."
                  value={deliveryFee || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setDeliveryFee(val);
                  }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Typography variant="caption" fontWeight={700} color="text.secondary">
                            توصيل:
                          </Typography>
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <Typography variant="caption" fontWeight={700}>
                            ج.م
                          </Typography>
                        </InputAdornment>
                      ),
                    },
                    htmlInput: { min: 0, step: 1 },
                  }}
                  sx={{
                    flex: 1,
                    '& .MuiOutlinedInput-root': { borderRadius: 9999, height: 36 },
                  }}
                />
              </Stack>

              {/* Coupon Row */}
              {appliedCoupon ? (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 1.5,
                    py: 0.8,
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                    border: `1px dashed ${theme.palette.success.main}`,
                    borderRadius: 2,
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CouponIcon color="success" fontSize="small" />
                    <Typography variant="body2" fontWeight={700} color="success.main">
                      كوبون مفعل: {appliedCoupon.code}
                    </Typography>
                    <Chip
                      size="small"
                      color="success"
                      label={
                        appliedCoupon.discountType === 'percentage'
                          ? `خصم ${appliedCoupon.discountValue}%`
                          : `خصم ${appliedCoupon.discountValue} ج.م`
                      }
                      sx={{ height: 20, fontSize: '0.7rem', fontWeight: 800 }}
                    />
                  </Stack>
                  <Tooltip title="إلغاء الكوبون">
                    <IconButton size="small" color="error" onClick={() => removeCoupon()}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              ) : (
                <Stack spacing={0.8}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      size="small"
                      placeholder="كود الكوبون (مثال: SAVE50)..."
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value.toUpperCase());
                        setCouponError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleApplyCoupon();
                        }
                      }}
                      error={!!couponError}
                      helperText={couponError}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <CouponIcon fontSize="small" color="action" />
                            </InputAdornment>
                          ),
                        },
                      }}
                      sx={{
                        flex: 1,
                        '& .MuiOutlinedInput-root': { borderRadius: 9999, height: 36 },
                      }}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      disabled={!couponInput.trim()}
                      onClick={() => handleApplyCoupon()}
                      sx={{ borderRadius: 9999, px: 2, height: 36, fontWeight: 700 }}
                    >
                      تطبيق
                    </Button>
                  </Stack>

                  <Stack direction="row" spacing={0.6} alignItems="center" flexWrap="wrap">
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                      كوبونات سريعة:
                    </Typography>
                    {['WELCOME', 'SAVE50', 'RAMADAN20'].map((code) => (
                      <Chip
                        key={code}
                        label={code}
                        size="small"
                        clickable
                        onClick={() => handleApplyCoupon(code)}
                        variant="outlined"
                        sx={{
                          height: 22,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          borderRadius: 9999,
                          borderColor: alpha(theme.palette.primary.main, 0.4),
                          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                        }}
                      />
                    ))}
                  </Stack>
                </Stack>
              )}
            </Box>
          )}

          {/* Cart Checkout Dock: Totals & Grand Payment Actions */}
          <CartCheckoutDock elevation={0} sx={{ p: isMobile && mobileCartMode === 'split' ? 1 : 1.5 }}>
            {isMobile && mobileCartMode === 'collapsed' ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <Typography variant="subtitle2" fontWeight={800}>
                  {totalCartUnits} أصناف | {formatCurrency(totals.grandTotal)}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    disabled={cart.length === 0 || isProcessing}
                    onClick={handleQuickCash}
                    startIcon={<BoltIcon />}
                    sx={{ borderRadius: 9999, fontWeight: 800, px: 2 }}
                  >
                    كاش
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setMobileCartMode('split')}
                    sx={{ borderRadius: 9999, fontSize: '0.75rem' }}
                  >
                    عرض الفاتورة 🔼
                  </Button>
                </Stack>
              </Box>
            ) : isMobile && mobileCartMode === 'split' ? (
              <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                {/* Summary line */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    المجموع: {formatCurrency(totals.subtotal)} | ضريبة (14%): {formatCurrency(totals.totalTax)}
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => setMobileCartMode('expanded')}
                    sx={{ fontSize: '0.72rem', py: 0, minHeight: 20, fontWeight: 700 }}
                  >
                    الخصومات والكوبونات ℹ️
                  </Button>
                </Box>

                {/* Grand Price and Action Buttons */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.68rem', lineHeight: 1 }}>
                      المبلغ المستحق
                    </Typography>
                    <Typography variant="h6" fontWeight={900} color="primary.main" sx={{ lineHeight: 1.2 }}>
                      {formatCurrency(totals.grandTotal)}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} sx={{ flex: 1, justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      color="success"
                      size="medium"
                      disabled={cart.length === 0 || isProcessing}
                      onClick={handleQuickCash}
                      startIcon={<BoltIcon sx={{ fontSize: 20 }} />}
                      sx={{
                        borderRadius: 9999,
                        px: 2,
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        boxShadow: '0 2px 10px rgba(46, 125, 50, 0.35)',
                      }}
                    >
                      ⚡ كاش فوري
                    </Button>

                    <Button
                      variant="contained"
                      color="primary"
                      size="medium"
                      disabled={cart.length === 0 || isProcessing}
                      onClick={() => setPaymentModalOpen(true)}
                      sx={{
                        borderRadius: 9999,
                        px: 1.5,
                        fontWeight: 800,
                        fontSize: '0.88rem',
                      }}
                    >
                      دفع
                    </Button>
                  </Stack>
                </Box>
              </Box>
            ) : (
              <>
                {/* Summary Details */}
            <Box>
              <SummaryRow>
                <Typography variant="body2" color="text.secondary">
                  المجموع الفرعي
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatCurrency(totals.subtotal)}
                </Typography>
              </SummaryRow>

              {totals.itemDiscounts > 0 && (
                <SummaryRow>
                  <Typography variant="body2" color="error.main">
                    خصم الأصناف
                  </Typography>
                  <Typography variant="body2" color="error.main" fontWeight={600}>
                    -{formatCurrency(totals.itemDiscounts)}
                  </Typography>
                </SummaryRow>
              )}

              {totals.invoiceDiscountAmount > 0 && (
                <SummaryRow>
                  <Typography variant="body2" color="error.main">
                    خصم الفاتورة {invoiceDiscountType === 'percentage' ? `(${invoiceDiscount}%)` : ''}
                  </Typography>
                  <Typography variant="body2" color="error.main" fontWeight={600}>
                    -{formatCurrency(totals.invoiceDiscountAmount)}
                  </Typography>
                </SummaryRow>
              )}

              {appliedCoupon && totals.couponDiscountAmount > 0 && (
                <SummaryRow>
                  <Typography variant="body2" color="success.main" fontWeight={600}>
                    خصم الكوبون ({appliedCoupon.code})
                  </Typography>
                  <Typography variant="body2" color="success.main" fontWeight={700}>
                    -{formatCurrency(totals.couponDiscountAmount)}
                  </Typography>
                </SummaryRow>
              )}

              {totals.totalDiscount > 0 && (totals.invoiceDiscountAmount > 0 || totals.couponDiscountAmount > 0) && (
                <SummaryRow>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    صافي القيمة الخاضعة للضريبة
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {formatCurrency(totals.taxableAmount)}
                  </Typography>
                </SummaryRow>
              )}

              {totals.totalTax > 0 ? (
                <SummaryRow>
                  <Typography variant="body2" color="text.secondary">
                    ضريبة القيمة المضافة (14%)
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatCurrency(totals.totalTax)}
                  </Typography>
                </SummaryRow>
              ) : (
                <SummaryRow>
                  <Typography variant="body2" color="text.secondary">
                    ضريبة القيمة المضافة (0%)
                  </Typography>
                  <Typography variant="body2" color="text.disabled">
                    0.00 ج.م
                  </Typography>
                </SummaryRow>
              )}

              {totals.deliveryFee > 0 && (
                <SummaryRow>
                  <Typography variant="body2" color="text.secondary">
                    رسوم التوصيل
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color="primary.main">
                    +{formatCurrency(totals.deliveryFee)}
                  </Typography>
                </SummaryRow>
              )}

              <SummaryRow highlight>
                <Typography variant="h6" fontWeight={800} color="text.primary">
                  المبلغ المستحق
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight={900}
                  color="primary.main"
                  sx={{ letterSpacing: -0.5 }}
                >
                  {formatCurrency(totals.grandTotal)}
                </Typography>
              </SummaryRow>
            </Box>

            {/* Action Buttons */}
            <Stack spacing={1.2}>
              {/* Quick Cash Presets */}
              <Box sx={{ display: 'flex', gap: 0.8, alignItems: 'center', py: 0.2, flexWrap: 'wrap' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  كاش سريع:
                </Typography>
                {[20, 50, 100, 200, 500].map((amt) => (
                  <Chip
                    key={amt}
                    label={`${amt} ج.م`}
                    clickable
                    disabled={cart.length === 0 || isProcessing}
                    onClick={() => {
                      if (cart.length === 0 || isProcessing) return;
                      clearPayments();
                      addPayment({
                        id: `cash-${Date.now()}`,
                        method: 'cash',
                        amount: amt,
                      });
                      setProcessing(true);
                      createInvoiceMutation.mutate();
                    }}
                    variant="outlined"
                    size="small"
                    sx={{
                      borderRadius: 9999,
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      backgroundColor: alpha(theme.palette.success.main, 0.08),
                      borderColor: alpha(theme.palette.success.main, 0.4),
                      color: 'success.main',
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.success.main, 0.18),
                      },
                    }}
                  />
                ))}
              </Box>

              {/* Giant Quick Cash Pill Button */}
              <Button
                variant="contained"
                size="medium"
                fullWidth
                color="success"
                onClick={handleQuickCash}
                disabled={cart.length === 0 || isProcessing}
                startIcon={<BoltIcon sx={{ fontSize: 22 }} />}
                sx={{
                  minHeight: 44,
                  borderRadius: 9999, // M3 Full Pill
                  fontSize: '1.02rem',
                  fontWeight: 800,
                  boxShadow: '0 4px 14px rgba(46, 125, 50, 0.35)',
                  '&:hover': {
                    boxShadow: '0 6px 20px rgba(46, 125, 50, 0.45)',
                    transform: 'translateY(-1px)',
                  },
                  '&:active': {
                    transform: 'scale(0.98)',
                  },
                }}
              >
                ⚡ كاش فوري (F4) - {formatCurrency(totals.grandTotal)}
              </Button>

              {/* Multi-pay & Quotation Row */}
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => setPaymentModalOpen(true)}
                  disabled={cart.length === 0 || isProcessing}
                  startIcon={<ReceiptIcon fontSize="small" />}
                  sx={{
                    minHeight: 40,
                    borderRadius: 9999,
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    boxShadow: theme.shadows[2],
                    '&:hover': {
                      boxShadow: theme.shadows[4],
                    },
                  }}
                >
                  💳 دفع متعدد / بطاقة (F8)
                </Button>

                <Button
                  variant="outlined"
                  onClick={() => setQuotationModalOpen(true)}
                  disabled={cart.length === 0 || isProcessing}
                  startIcon={<QuoteIcon fontSize="small" />}
                  sx={{
                    minHeight: 40,
                    borderRadius: 9999,
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    flexShrink: 0,
                    px: 1.8,
                  }}
                >
                  عرض أسعار
                </Button>
              </Stack>
            </Stack>
              </>
            )}
          </CartCheckoutDock>
        </TerminalCartPanel>
      </MainWorkspace>

      {/* ================= MODALS & DIALOGS ================= */}
      <PaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        totals={totals}
        payments={payments}
        onAddPayment={addPayment}
        onRemovePayment={removePayment}
        onCompleteSale={handleCompleteSale}
        isProcessing={isProcessing}
        cart={cart}
        selectedCustomer={selectedCustomer}
        lastInvoiceNumber={lastInvoiceNumber}
      />

      <HeldInvoicesDialog
        open={heldDialogOpen}
        onClose={() => setHeldDialogOpen(false)}
      />

      <QuotationModal
        open={quotationModalOpen}
        onClose={() => setQuotationModalOpen(false)}
        cart={cart}
        customer={selectedCustomer}
        totals={totals}
        onQuotationCreated={handleQuotationCreated}
      />

      <QuotationsListDialog
        open={quotationsListOpen}
        onClose={() => setQuotationsListOpen(false)}
        onPrintQuotation={handlePrintQuotation}
      />

      <PrintQuotationDialog
        open={printQuotationOpen}
        onClose={() => {
          setPrintQuotationOpen(false);
          setActiveQuotationToPrint(null);
        }}
        quotation={activeQuotationToPrint}
      />

      <QuickProductModal
        open={quickProductOpen}
        onClose={() => setQuickProductOpen(false)}
        onAddCustomProduct={(prod: any, qty: number) => addToCart(prod, qty)}
      />
    </StyledContainer>
  );
}