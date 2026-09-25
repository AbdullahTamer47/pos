import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  TextField,
  Select,
  MenuItem,
  styled,
  alpha,
  useTheme,
  SelectChangeEvent,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  DeleteOutline as DeleteIcon,
  LocalOffer as DiscountIcon,
} from '@mui/icons-material';
import { type CartItem as CartItemType } from '@/stores/posStore';
import { formatCurrency as formatCur } from '@smartpos/utils';

const ItemRow = styled(Box)<{ swiped: boolean }>(({ theme, swiped }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1, 1.25),
  borderRadius: 16,
  backgroundColor: theme.palette.surfaceContainerLow || theme.palette.background.paper,
  border: `1px solid ${theme.palette.outlineVariant || theme.palette.divider}`,
  minHeight: 56,
  position: 'relative',
  overflow: 'hidden',
  transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
  transform: swiped ? 'translateX(-80px)' : 'translateX(0)',
  touchAction: 'pan-y',
  [theme.breakpoints.down('sm')]: {
    minHeight: 50,
    padding: theme.spacing(0.75, 1),
    borderRadius: 14,
  },
  '&:hover': {
    borderColor: alpha(theme.palette.primary.main, 0.4),
    boxShadow: theme.shadows[2],
  },
}));

const DeleteOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  right: 0,
  top: 0,
  bottom: 0,
  width: 80,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: theme.palette.error.main,
  color: '#fff',
  cursor: 'pointer',
  borderTopRightRadius: 18,
  borderBottomRightRadius: 18,
}));

const StepperContainer = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: 9999, // M3 Pill Stepper
  backgroundColor: theme.palette.surfaceContainerHighest || alpha(theme.palette.primary.main, 0.08),
  padding: '2px 4px',
  gap: 2,
}));

const StepperButton = styled(IconButton)(({ theme }) => ({
  width: 30,
  height: 30,
  borderRadius: '50%',
  backgroundColor: theme.palette.surfaceContainerLowest || theme.palette.background.paper,
  color: theme.palette.text.primary,
  boxShadow: theme.shadows[1],
  transition: 'all 0.15s ease',
  [theme.breakpoints.down('sm')]: {
    width: 28,
    height: 28,
  },
  '&:hover': {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    transform: 'scale(1.08)',
  },
  '&.Mui-disabled': {
    opacity: 0.4,
    backgroundColor: 'transparent',
    boxShadow: 'none',
  },
}));

const QuantityInput = styled(TextField)(({ theme }) => ({
  width: 44,
  '& .MuiOutlinedInput-root': {
    '& fieldset': { border: 'none' },
    '& input': {
      textAlign: 'center',
      padding: '2px 0',
      fontSize: '0.9rem',
      fontWeight: 800,
      color: theme.palette.text.primary,
      MozAppearance: 'textfield',
      '&::-webkit-inner-spin-button, &::-webkit-outer-spin-button': {
        WebkitAppearance: 'none',
        margin: 0,
      },
    },
  },
}));

const DiscountField = styled(TextField)(({ theme }) => ({
  width: 80,
  '& .MuiOutlinedInput-root': {
    borderRadius: 12,
    '& input': {
      textAlign: 'right',
      padding: '6px 8px',
      fontSize: '0.8rem',
      fontWeight: 600,
    },
  },
}));

const DiscountTypeSelect = styled(Select)(({ theme }) => ({
  borderRadius: 12,
  '& .MuiSelect-select': {
    padding: '6px 24px 6px 8px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  width: 72,
}));

function formatCurrency(amount: number): string {
  return formatCur(amount, 'EGP');
}

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onUpdateDiscount: (itemId: string, discount: number, discountType: 'percentage' | 'fixed') => void;
  onRemove: (itemId: string) => void;
}

export function CartItem({ item, onUpdateQuantity, onUpdateDiscount, onRemove }: CartItemProps) {
  const [swiped, setSwiped] = useState(false);
  const [discountInput, setDiscountInput] = useState(
    item.discount > 0 ? String(item.discount) : ''
  );
  const [showDiscount, setShowDiscount] = useState(item.discount > 0);
  const touchStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const theme = useTheme();

  useEffect(() => {
    setDiscountInput(item.discount > 0 ? String(item.discount) : '');
    if (item.discount > 0) {
      setShowDiscount(true);
    }
  }, [item.discount]);

  const lineTotal = item.unitPrice * item.quantity;
  const discountAmount =
    item.discountType === 'percentage'
      ? (lineTotal * Math.min(100, item.discount || 0)) / 100
      : Math.min(lineTotal, item.discount || 0);
  const afterDiscount = Math.max(0, lineTotal - discountAmount);
  const taxRate = typeof item.taxRate === 'number' ? item.taxRate : 14;
  const taxAmount = (afterDiscount * taxRate) / 100;
  const total = afterDiscount + taxAmount;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartPos.current = {
      x: e.touches[0]!.clientX,
      y: e.touches[0]!.clientY,
    };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const deltaX = touchStartPos.current.x - e.touches[0]!.clientX;
    const deltaY = Math.abs(touchStartPos.current.y - e.touches[0]!.clientY);

    // Only swipe if horizontal movement is dominant (avoid accidental swipe when scrolling vertically)
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > deltaY * 1.8) {
      if (deltaX > 45) {
        setSwiped(true);
      } else if (deltaX < -20) {
        setSwiped(false);
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    // Keep swiped state if already swiped, otherwise do nothing
  }, []);

  const handleSwipeDelete = useCallback(() => {
    onRemove(item.id);
    setSwiped(false);
  }, [item.id, onRemove]);

  const handleDiscountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDiscountInput(val);
    if (val === '') {
      onUpdateDiscount(item.id, 0, item.discountType);
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      onUpdateDiscount(item.id, num, item.discountType);
    }
  }, [item.id, item.discountType, onUpdateDiscount]);

  const handleDiscountTypeChange = useCallback((e: SelectChangeEvent<unknown>) => {
    const type = e.target.value as 'percentage' | 'fixed';
    const num = parseFloat(discountInput) || 0;
    onUpdateDiscount(item.id, num, type);
  }, [item.id, discountInput, onUpdateDiscount]);

  const handleQuantityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 0) {
      onUpdateQuantity(item.id, val);
    }
  }, [item.id, onUpdateQuantity]);

  return (
    <Box sx={{ position: 'relative', mb: 1 }}>
      <ItemRow
        swiped={swiped}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            fontWeight={700}
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.3,
              color: theme.palette.text.primary,
            }}
            dir="auto"
          >
            {item.product.name}
          </Typography>
          {item.variant && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {item.variant.name}: {item.variant.value}
            </Typography>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              {formatCurrency(item.unitPrice)}
            </Typography>
            {item.discount > 0 && (
              <Box
                sx={{
                  px: 0.8,
                  py: 0.1,
                  borderRadius: 9999,
                  bgcolor: alpha(theme.palette.error.main, 0.1),
                  color: theme.palette.error.main,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                }}
              >
                -{item.discountType === 'percentage' ? `${item.discount}%` : formatCurrency(item.discount)}
              </Box>
            )}
          </Box>
        </Box>

        {/* M3 Pill Stepper */}
        <StepperContainer>
          <StepperButton
            size="small"
            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
            disabled={item.quantity <= 1}
            aria-label="decrease quantity"
          >
            <RemoveIcon sx={{ fontSize: 16 }} />
          </StepperButton>
          <QuantityInput
            size="small"
            type="number"
            value={item.quantity}
            onChange={handleQuantityChange}
            slotProps={{ htmlInput: { min: 0, inputMode: 'numeric' } }}
          />
          <StepperButton
            size="small"
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
            aria-label="increase quantity"
          >
            <AddIcon sx={{ fontSize: 16 }} />
          </StepperButton>
        </StepperContainer>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 68 }}>
          <Typography variant="body2" fontWeight={800} color="primary.main">
            {formatCurrency(total)}
          </Typography>
          <IconButton
            size="small"
            onClick={() => setShowDiscount(!showDiscount)}
            sx={{
              width: 26,
              height: 26,
              mt: 0.5,
              borderRadius: '50%',
              bgcolor: showDiscount ? alpha(theme.palette.warning.main, 0.14) : 'transparent',
              color: showDiscount ? 'warning.main' : 'text.secondary',
            }}
          >
            <DiscountIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Box>

        <IconButton
          size="small"
          onClick={() => onRemove(item.id)}
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            color: 'text.secondary',
            '&:hover': {
              color: 'error.main',
              bgcolor: alpha(theme.palette.error.main, 0.1),
            },
          }}
          aria-label="delete item"
        >
          <DeleteIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </ItemRow>

      {showDiscount && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1,
            backgroundColor: alpha(theme.palette.warning.main, 0.06),
            borderRadius: '0 0 16px 16px',
            border: `1px solid ${theme.palette.outlineVariant || theme.palette.divider}`,
            borderTop: 'none',
            mt: '-6px',
          }}
        >
          <DiscountIcon sx={{ fontSize: 16, color: 'warning.main' }} />
          <Typography variant="caption" fontWeight={600} color="warning.main">
            خصم:
          </Typography>
          <DiscountField
            size="small"
            type="number"
            placeholder="0"
            value={discountInput}
            onChange={handleDiscountChange}
            slotProps={{ htmlInput: { min: 0, inputMode: 'decimal' } }}
          />
          <DiscountTypeSelect
            size="small"
            value={item.discountType}
            onChange={handleDiscountTypeChange}
          >
            <MenuItem value="percentage">% نسبة</MenuItem>
            <MenuItem value="fixed">مبلغ ج.م</MenuItem>
          </DiscountTypeSelect>
        </Box>
      )}

      {swiped && (
        <DeleteOverlay onClick={handleSwipeDelete}>
          <DeleteIcon sx={{ fontSize: 26 }} />
        </DeleteOverlay>
      )}
    </Box>
  );
}