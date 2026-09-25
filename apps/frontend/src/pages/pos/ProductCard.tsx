import React, { forwardRef, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  styled,
  alpha,
  useTheme,
} from '@mui/material';
import { Add as AddIcon, Inventory2 } from '@mui/icons-material';
import { type Product } from '@/stores/posStore';
import { formatCurrency } from '@smartpos/utils';

const CardContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  borderRadius: 20, // M3 Expressive Card Radius
  border: `1px solid ${theme.palette.outlineVariant || theme.palette.divider}`,
  backgroundColor: theme.palette.surfaceContainerLowest || theme.palette.background.paper,
  overflow: 'hidden',
  cursor: 'pointer',
  transition: 'all 0.25s cubic-bezier(0.2, 0, 0, 1)',
  minHeight: 180,
  position: 'relative',
  '&:hover': {
    transform: 'translateY(-3px)',
    boxShadow: theme.shadows[4],
    borderColor: alpha(theme.palette.primary.main, 0.5),
    '& .product-img': {
      transform: 'scale(1.05)',
    },
  },
  '&:active': {
    transform: 'scale(0.98)',
    boxShadow: theme.shadows[1],
  },
  WebkitTapHighlightColor: 'transparent',
  userSelect: 'none',
}));

const ImageContainer = styled(Box)<{ hasImage?: boolean }>(({ theme, hasImage }) => ({
  width: '100%',
  height: hasImage ? 105 : 68,
  backgroundColor: hasImage
    ? theme.palette.surfaceContainerLow || theme.palette.action.hover
    : alpha(theme.palette.primary.main, 0.05),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  overflow: 'hidden',
  transition: 'height 0.2s ease',
}));

const ProductImage = styled('img')({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  transition: 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)',
});

const StockBadge = styled(Box)<{ status: 'green' | 'yellow' | 'red' }>(({ theme, status }) => {
  const colors = {
    green: theme.palette.success.main,
    yellow: theme.palette.warning.main,
    red: theme.palette.error.main,
  };
  return {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: '2px 8px',
    borderRadius: 9999,
    fontSize: '0.65rem',
    fontWeight: 700,
    backgroundColor: alpha(colors[status], 0.9),
    color: '#FFFFFF',
    backdropFilter: 'blur(8px)',
    boxShadow: `0 2px 6px ${alpha(colors[status], 0.35)}`,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    '&::before': {
      content: '""',
      width: 6,
      height: 6,
      borderRadius: '50%',
      backgroundColor: '#FFFFFF',
    },
  };
});

const ContentArea = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1.25, 1.5, 1.25),
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  flex: 1,
  justifyContent: 'space-between',
}));

const PricePill = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '4px 10px',
  borderRadius: 9999,
  backgroundColor: alpha(theme.palette.primary.main, 0.1),
  color: theme.palette.primary.main,
  fontWeight: 700,
  fontSize: '0.8125rem',
}));

const QuickAddButton = styled(IconButton)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  borderRadius: '50%',
  width: 34,
  height: 34,
  transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
  boxShadow: `0 2px 6px ${alpha(theme.palette.primary.main, 0.3)}`,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
    transform: 'scale(1.1)',
  },
  '&:active': {
    transform: 'scale(0.92)',
  },
}));

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  stockStatus?: 'green' | 'yellow' | 'red';
  inCartCount?: number;
}

function formatPrice(amount: number): string {
  return formatCurrency(amount, 'EGP');
}

export const ProductCard = forwardRef<HTMLDivElement, ProductCardProps>(
  function ProductCard({ product, onAddToCart, stockStatus = 'green', inCartCount = 0 }, ref) {
    const theme = useTheme();

    const handleAdd = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      onAddToCart(product);
    }, [onAddToCart, product]);

    const handleCardClick = useCallback(() => {
      onAddToCart(product);
    }, [onAddToCart, product]);

    const isInCart = inCartCount > 0;

    return (
      <CardContainer
        ref={ref}
        onClick={handleCardClick}
        sx={{
          ...(isInCart && {
            borderColor: theme.palette.primary.main,
            boxShadow: `0 0 0 1px ${alpha(theme.palette.primary.main, 0.3)}`,
          }),
        }}
      >
        <ImageContainer hasImage={Boolean(product.image)}>
          {product.image ? (
            <ProductImage className="product-img" src={product.image} alt={product.name} loading="lazy" />
          ) : (
            <Inventory2 sx={{ fontSize: 32, color: alpha(theme.palette.primary.main, 0.4) }} />
          )}
          <StockBadge status={stockStatus}>
            {stockStatus === 'green' ? `متوفر (${product.stock ?? 0})` : stockStatus === 'yellow' ? `منخفض (${product.stock ?? 0})` : 'نفد'}
          </StockBadge>
          {isInCart && (
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                left: 8,
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                borderRadius: 9999,
                px: 1,
                py: 0.2,
                fontSize: '0.72rem',
                fontWeight: 800,
                boxShadow: 2,
                letterSpacing: -0.2,
              }}
            >
              {inCartCount} بالسلة
            </Box>
          )}
        </ImageContainer>
        <ContentArea>
          <Box>
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
              {product.name}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mt: 0.2 }}
            >
              {product.barcode ? `باركود: ${product.barcode}` : product.sku ? `كود: ${product.sku}` : 'عام'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
            <PricePill>
              {formatPrice(product.sellingPrice)}
            </PricePill>
            <QuickAddButton
              size="small"
              onClick={handleAdd}
              aria-label={`Add ${product.name} to cart`}
            >
              <AddIcon sx={{ fontSize: 18 }} />
            </QuickAddButton>
          </Box>
        </ContentArea>
      </CardContainer>
    );
  }
);