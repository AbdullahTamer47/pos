import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  InputAdornment,
  Typography,
  Box,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon, FlashOn as FlashIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { type Product } from '@/stores/posStore';

interface QuickProductModalProps {
  open: boolean;
  onClose: () => void;
  onAddCustomProduct: (product: Product, quantity: number) => void;
}

export function QuickProductModal({
  open,
  onClose,
  onAddCustomProduct,
}: QuickProductModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');

  const handleAdd = () => {
    const numPrice = parseFloat(price);
    const numQty = parseFloat(quantity) || 1;
    if (isNaN(numPrice) || numPrice <= 0) return;

    const finalName = name.trim() || `صنف حر (${numPrice} ج.م)`;

    const customProduct: Product = {
      id: `custom-${Date.now()}`,
      name: finalName,
      nameAr: finalName,
      nameEn: finalName,
      sku: `CUSTOM-${Date.now().toString().slice(-4)}`,
      barcode: '',
      image: '',
      categoryId: '',
      unit: 'قطعة',
      costPrice: 0,
      sellingPrice: numPrice,
      taxRate: 0,
      isActive: true,
      hasExpiry: false,
      hasVariants: false,
    };

    onAddCustomProduct(customProduct, numQty);
    setName('');
    setPrice('');
    setQuantity('1');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FlashIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            إضافة صنف سريع / حر
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            autoFocus
            fullWidth
            type="number"
            label="السعر (ج.م) *"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
            placeholder="اكتب سعر البيع مباشرة"
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start">ج.م</InputAdornment>,
                inputMode: 'decimal',
              },
            }}
          />

          <TextField
            fullWidth
            label="اسم الصنف (اختياري)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
            placeholder="افتراضياً: صنف حر"
            helperText="يمكن تركه فارغاً وسيتم تسميته تلقائياً بصنف حر"
          />

          <TextField
            fullWidth
            type="number"
            label="الكمية"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
            slotProps={{
              htmlInput: {
                min: 0.1,
                step: 1,
              },
            }}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ borderRadius: 2 }}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleAdd}
          disabled={!price || parseFloat(price) <= 0}
          sx={{ borderRadius: 2, fontWeight: 700, px: 3 }}
        >
          إضافة للسلة 🛒
        </Button>
      </DialogActions>
    </Dialog>
  );
}
