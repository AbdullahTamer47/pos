import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Paper,
  Divider,
  Grid,
  Alert,
  useTheme,
} from '@mui/material';
import {
  Print as PrintIcon,
  Close as CloseIcon,
  QrCode as BarcodeIcon,
} from '@mui/icons-material';
import JsBarcode from 'jsbarcode';
import { type ProductResponse } from '@/api/endpoints';
import { formatCurrency } from '@smartpos/utils';

export interface BarcodePrintDialogProps {
  open: boolean;
  onClose: () => void;
  product?: ProductResponse | null;
  products?: ProductResponse[];
}

export default function BarcodePrintDialog({
  open,
  onClose,
  product: initialProduct,
  products = [],
}: BarcodePrintDialogProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [labelSize, setLabelSize] = useState<'38x25' | '50x25' | 'a4'>('50x25');
  const [showStoreName, setShowStoreName] = useState<boolean>(true);
  const [showProductName, setShowProductName] = useState<boolean>(true);
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showBarcodeText, setShowBarcodeText] = useState<boolean>(true);

  const previewSvgRef = useRef<SVGSVGElement | null>(null);

  // Sync selected product with initial product
  useEffect(() => {
    if (initialProduct?.id) {
      setSelectedProductId(initialProduct.id);
    } else if (products.length > 0 && products[0]?.id && !selectedProductId) {
      setSelectedProductId(products[0].id);
    }
  }, [initialProduct, products, selectedProductId]);

  const activeProduct = products.find((p) => p.id === selectedProductId) || initialProduct;
  const barcodeValue = activeProduct?.barcode || activeProduct?.sku || '1234567890';
  const productName = activeProduct?.nameAr || activeProduct?.nameEn || activeProduct?.name || 'صنف غير محدد';
  const productPrice = activeProduct?.sellingPrice ?? 0;

  // Render preview barcode
  useEffect(() => {
    if (open && previewSvgRef.current && barcodeValue) {
      try {
        JsBarcode(previewSvgRef.current, barcodeValue, {
          format: 'CODE128',
          width: labelSize === '38x25' ? 1.4 : 1.8,
          height: labelSize === '38x25' ? 32 : 45,
          displayValue: showBarcodeText,
          fontSize: 12,
          font: 'monospace',
          margin: 0,
        });
      } catch (e) {
        console.warn('Failed to render preview barcode:', e);
      }
    }
  }, [open, barcodeValue, labelSize, showBarcodeText]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Styles for print mode */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #barcode-print-zone, #barcode-print-zone * {
            visibility: visible !important;
          }
          #barcode-print-zone {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            display: block !important;
          }
          .barcode-sticker-item {
            page-break-inside: avoid;
            break-inside: avoid;
            display: inline-flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
            border: 1px dashed #ccc !important;
            box-sizing: border-box !important;
          }
          .sticker-38x25 {
            width: 38mm !important;
            height: 25mm !important;
            padding: 1.5mm !important;
            margin: 1mm !important;
          }
          .sticker-50x25 {
            width: 50mm !important;
            height: 25mm !important;
            padding: 2mm !important;
            margin: 1.5mm !important;
          }
          .sticker-a4 {
            width: 63.5mm !important;
            height: 33.9mm !important;
            padding: 3mm !important;
            margin: 1mm !important;
          }
        }
      `}</style>

      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <BarcodeIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>
              طباعة ملصقات الباركود
            </Typography>
          </Stack>
          <Button size="small" onClick={onClose} sx={{ minWidth: 36, p: 0.5 }}>
            <CloseIcon fontSize="small" />
          </Button>
        </DialogTitle>

        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* Left Controls */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={2.5}>
                {/* Product Select */}
                {products.length > 0 && (
                  <FormControl fullWidth size="small">
                    <InputLabel>الصنف المطلوب طباعته</InputLabel>
                    <Select
                      value={selectedProductId}
                      label="الصنف المطلوب طباعته"
                      onChange={(e) => setSelectedProductId(e.target.value)}
                    >
                      {products.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.nameAr || p.nameEn || p.name} — {p.barcode || p.sku} ({formatCurrency(p.sellingPrice)})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {/* Dimensions and Quantity */}
                <Stack direction="row" spacing={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>مقاس الملصق</InputLabel>
                    <Select
                      value={labelSize}
                      label="مقاس الملصق"
                      onChange={(e) => setLabelSize(e.target.value as any)}
                    >
                      <MenuItem value="50x25">50 × 25 مم (حراري قياسي)</MenuItem>
                      <MenuItem value="38x25">38 × 25 مم (حراري صغير)</MenuItem>
                      <MenuItem value="a4">ورقة A4 ملصقات (3×8 = 24 ملصق)</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    label="عدد النسخ"
                    type="number"
                    size="small"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(200, parseInt(e.target.value) || 1)))}
                    sx={{ width: 120 }}
                    slotProps={{ htmlInput: { min: 1, max: 200 } }}
                  />
                </Stack>

                {/* Display Elements Options */}
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} mb={1}>
                    البيانات المعروضة على الملصق:
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid size={{ xs: 6 }}>
                      <FormControlLabel
                        control={<Checkbox checked={showStoreName} onChange={(e) => setShowStoreName(e.target.checked)} size="small" />}
                        label="اسم المتجر"
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <FormControlLabel
                        control={<Checkbox checked={showProductName} onChange={(e) => setShowProductName(e.target.checked)} size="small" />}
                        label="اسم الصنف"
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <FormControlLabel
                        control={<Checkbox checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} size="small" />}
                        label="السعر (ج.م)"
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <FormControlLabel
                        control={<Checkbox checked={showBarcodeText} onChange={(e) => setShowBarcodeText(e.target.checked)} size="small" />}
                        label="رقم الباركود"
                      />
                    </Grid>
                  </Grid>
                </Paper>

                <Alert severity="info" sx={{ py: 0.5, fontSize: '0.85rem' }}>
                  يمكن استخدام طابعات الباركود الحرارية (Xprinter, Zebra, Bixolon) مباشرة عبر أمر الطباعة.
                </Alert>
              </Stack>
            </Grid>

            {/* Right Live Sticker Preview */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} mb={1.5}>
                  معاينة الملصق المباشرة ({labelSize === '38x25' ? '38×25 مم' : labelSize === '50x25' ? '50×25 مم' : 'مقاس A4'}):
                </Typography>

                <Paper
                  elevation={3}
                  sx={{
                    p: 2,
                    bgcolor: '#fff',
                    color: '#000',
                    border: '1px dashed #999',
                    borderRadius: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    minWidth: labelSize === '38x25' ? 200 : 250,
                    maxWidth: 300,
                  }}
                >
                  {showStoreName && (
                    <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.75rem', letterSpacing: 0.5, color: '#444' }}>
                      Smart POS Store
                    </Typography>
                  )}

                  {showProductName && (
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        fontSize: labelSize === '38x25' ? '0.8rem' : '0.9rem',
                        lineHeight: 1.2,
                        my: 0.5,
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {productName}
                    </Typography>
                  )}

                  {/* SVG Barcode */}
                  <Box sx={{ my: 0.5, overflow: 'hidden' }}>
                    <svg ref={previewSvgRef} />
                  </Box>

                  {showPrice && (
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 900,
                        fontSize: labelSize === '38x25' ? '0.85rem' : '1rem',
                        color: '#000',
                        mt: 0.5,
                      }}
                    >
                      السعر: {formatCurrency(productPrice)}
                    </Typography>
                  )}
                </Paper>

                <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5 }}>
                  إجمالي الملصقات المطلوب طباعتها: <strong>{quantity}</strong> ملصق
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit">
            إلغاء
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            sx={{ px: 3, fontWeight: 700 }}
          >
            طباعة الملصقات ({quantity})
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hidden Print Container that is only rendered during browser printing */}
      <div id="barcode-print-zone" style={{ display: 'none' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: labelSize === 'a4' ? '4mm' : '2mm',
            padding: '4mm',
          }}
        >
          {Array.from({ length: quantity }).map((_, i) => (
            <div
              key={i}
              className={`barcode-sticker-item sticker-${labelSize}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                backgroundColor: '#ffffff',
                color: '#000000',
                border: '1px dashed #cccccc',
                boxSizing: 'border-box',
                fontFamily: 'sans-serif',
              }}
            >
              {showStoreName && (
                <div style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px' }}>
                  Smart POS Store
                </div>
              )}
              {showProductName && (
                <div
                  style={{
                    fontSize: labelSize === '38x25' ? '10px' : '12px',
                    fontWeight: 'bold',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    marginBottom: '2px',
                  }}
                >
                  {productName}
                </div>
              )}
              <BarcodePrintItem
                value={barcodeValue}
                labelSize={labelSize}
                showBarcodeText={showBarcodeText}
              />
              {showPrice && (
                <div
                  style={{
                    fontSize: labelSize === '38x25' ? '11px' : '13px',
                    fontWeight: '900',
                    marginTop: '2px',
                  }}
                >
                  {formatCurrency(productPrice)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function BarcodePrintItem({
  value,
  labelSize,
  showBarcodeText,
}: {
  value: string;
  labelSize: '38x25' | '50x25' | 'a4';
  showBarcodeText: boolean;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width: labelSize === '38x25' ? 1.2 : 1.6,
          height: labelSize === '38x25' ? 28 : 38,
          displayValue: showBarcodeText,
          fontSize: 10,
          font: 'monospace',
          margin: 0,
        });
      } catch (e) {
        console.warn('Barcode print render error:', e);
      }
    }
  }, [value, labelSize, showBarcodeText]);

  return <svg ref={svgRef} />;
}
