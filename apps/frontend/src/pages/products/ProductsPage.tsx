import { useState, useCallback, useMemo } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Button,
  Chip,
  Typography,
  IconButton,
  Tooltip,
  Stack,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Avatar,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Fab,
  alpha,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
  Upload as UploadIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon,
  Inventory2 as InventoryIcon,
  QrCode as BarcodeIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { visuallyHidden } from '@mui/utils';
import api, { type ProductResponse, type PaginatedResponse } from '@/api/endpoints';
import { formatCurrency } from '@smartpos/utils';
import BarcodePrintDialog from './BarcodePrintDialog';


type SortField = 'name' | 'sku' | 'price' | 'stock' | 'createdAt';
type SortOrder = 'asc' | 'desc';

const columns: { id: SortField; label: string; sortable: boolean }[] = [
  { id: 'name', label: 'products.productName', sortable: true },
  { id: 'sku', label: 'products.sku', sortable: true },
  { id: 'price', label: 'products.sellingPrice', sortable: true },
  { id: 'stock', label: 'products.stock', sortable: true },
  { id: 'createdAt', label: 'common.created', sortable: true },
];

export default function ProductsPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<boolean | null>(null);
  const [expiryFilter, setExpiryFilter] = useState<boolean | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductResponse | null>(null);
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [barcodeProduct, setBarcodeProduct] = useState<ProductResponse | null>(null);


  const debouncedSetSearch = useMemo(
    () =>
      debounceFn((value: string) => {
        setDebouncedSearch(value);
        setPage(0);
      }, 400),
    []
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
      debouncedSetSearch(e.target.value);
    },
    [debouncedSetSearch]
  );

  const { data, isLoading, isError, error, refetch } = useQuery<PaginatedResponse<ProductResponse>>({
    queryKey: ['products', { page: page + 1, limit: rowsPerPage, search: debouncedSearch, sortBy, sortOrder, categoryFilter, activeFilter, expiryFilter }],
    queryFn: () =>
      api.products.getProducts({
        page: page + 1,
        limit: rowsPerPage,
        search: debouncedSearch || undefined,
        sortBy,
        sortOrder,
      }),
  });

  const productList: ProductResponse[] = useMemo(() => {
    if (Array.isArray(data)) return data;
    if (Array.isArray((data as any)?.data)) return (data as any).data;
    return [];
  }, [data]);

  const { data: categories } = useQuery({
    queryKey: ['categories', 'all'],
    queryFn: () => api.categories.getCategories({ limit: 1000 }),
    staleTime: 10 * 60 * 1000,
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.products.toggleActive(id),
    meta: { successMsg: t('products.updated') || 'Product updated' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.products.deleteProduct(id),
    meta: { successMsg: t('products.deleted') || 'Product deleted' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeleteTarget(null);
    },
  });

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(0);
  };

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const clearFilters = () => {
    setCategoryFilter(null);
    setActiveFilter(null);
    setExpiryFilter(null);
    setSearch('');
    setDebouncedSearch('');
    setPage(0);
  };

  const hasFilters = categoryFilter !== null || activeFilter !== null || expiryFilter !== null || debouncedSearch !== '';

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        mb={3}
        gap={2}
      >
        <Typography variant="h4" fontWeight={700}>
          {t('nav.products')}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          <Button
            variant="outlined"
            startIcon={<BarcodeIcon />}
            onClick={() => {
              setBarcodeProduct(null);
              setBarcodeModalOpen(true);
            }}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            طباعة الباركود
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => navigate('/products/import')}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            {t('products.bulkImport')}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/products/new')}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            {t('products.addProduct')}
          </Button>
        </Stack>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2} alignItems="flex-start">
        <TextField
          size="small"
          placeholder={t('pos.searchProducts')}
          value={search}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: search ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => { setSearch(''); setDebouncedSearch(''); }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
          sx={{ minWidth: { xs: '100%', sm: 280 }, width: { xs: '100%', sm: 280 } }}
        />

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip
            label={categoryFilter ? categories?.find((c) => c.id === categoryFilter)?.nameAr || categoryFilter : t('common.category')}
            onClick={() => setCategoryFilter(categoryFilter ? null : (categories?.[0]?.id || null))}
            onDelete={categoryFilter ? () => setCategoryFilter(null) : undefined}
            variant={categoryFilter ? 'filled' : 'outlined'}
            color={categoryFilter ? 'primary' : 'default'}
            icon={<FilterListIcon />}
          />
          <Chip
            label={t('common.active')}
            onClick={() => setActiveFilter(activeFilter === true ? null : true)}
            onDelete={activeFilter === true ? () => setActiveFilter(null) : undefined}
            variant={activeFilter === true ? 'filled' : 'outlined'}
            color={activeFilter === true ? 'success' : 'default'}
          />
          <Chip
            label={t('products.hasExpiry')}
            onClick={() => setExpiryFilter(expiryFilter === true ? null : true)}
            onDelete={expiryFilter === true ? () => setExpiryFilter(null) : undefined}
            variant={expiryFilter === true ? 'filled' : 'outlined'}
            color={expiryFilter === true ? 'warning' : 'default'}
          />
          {hasFilters && (
            <Chip
              label={t('common.clearFilters')}
              onDelete={clearFilters}
              variant="outlined"
              color="error"
              deleteIcon={<CloseIcon />}
            />
          )}
        </Stack>
      </Stack>

      {isError && (
        <Alert
          severity="error"
          action={
            <Button size="small" color="inherit" onClick={() => refetch()} startIcon={<RefreshIcon />}>
              {t('dashboard.retry')}
            </Button>
          }
          sx={{ mb: 2 }}
        >
          {(error as Error)?.message || t('common.somethingWentWrong')}
        </Alert>
      )}

      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table sx={{ minWidth: 700 }}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                {columns.map((col) => (
                  <TableCell key={col.id} sortDirection={sortBy === col.id ? sortOrder : false}>
                    {col.sortable ? (
                      <TableSortLabel
                        active={sortBy === col.id}
                        direction={sortBy === col.id ? sortOrder : 'asc'}
                        onClick={() => handleSort(col.id)}
                      >
                        {t(col.label)}
                        {sortBy === col.id ? (
                          <Box component="span" sx={visuallyHidden}>
                            {sortOrder === 'desc' ? 'sorted descending' : 'sorted ascending'}
                          </Box>
                        ) : null}
                      </TableSortLabel>
                    ) : (
                      t(col.label)
                    )}
                  </TableCell>
                ))}
                <TableCell align="right">{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell padding="checkbox">
                      <Skeleton variant="rounded" width={40} height={40} />
                    </TableCell>
                    {columns.map((col) => (
                      <TableCell key={col.id}>
                        <Skeleton variant="text" width={col.id === 'name' ? 160 : 80} />
                      </TableCell>
                    ))}
                    <TableCell align="right">
                      <Skeleton variant="rounded" width={80} height={32} />
                    </TableCell>
                  </TableRow>
                ))
              ) : productList.length > 0 ? (
                productList.map((product) => (
                  <TableRow
                    key={product.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/products/${product.id}`)}
                  >
                    <TableCell padding="checkbox">
                      <Avatar
                        src={product.image}
                        variant="rounded"
                        sx={{ width: 40, height: 40, bgcolor: alpha(theme.palette.primary.main, 0.12) }}
                      >
                        <InventoryIcon color="primary" />
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {product.nameAr || product.nameEn || product.name}
                      </Typography>
                      {product.barcode && (
                        <Typography variant="caption" color="text.secondary">
                          {product.barcode}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {product.sku}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {formatCurrency(product.sellingPrice)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={product.stock}
                        color={
                          product.stock === 0
                            ? 'error'
                            : product.lowStockAlert && product.stock <= product.lowStockAlert
                              ? 'warning'
                              : 'success'
                        }
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="طباعة ملصق الباركود">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setBarcodeProduct(product);
                              setBarcodeModalOpen(true);
                            }}
                          >
                            <BarcodeIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('common.edit')}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/products/${product.id}`);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={product.isActive ? t('common.deactivate') : t('common.activate')}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMutation.mutate(product.id);
                            }}
                            color={product.isActive ? 'success' : 'default'}
                          >
                            {product.isActive ? <ToggleOnIcon fontSize="small" /> : <ToggleOffIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('common.delete')}>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(product);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <Stack alignItems="center" spacing={2}>
                      <InventoryIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
                      <Typography variant="h6" color="text.secondary">
                        {t('products.productName')}
                      </Typography>
                      <Typography variant="body2" color="text.disabled">
                        {debouncedSearch ? t('common.noResults') : t('common.noData')}
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => navigate('/products/new')}
                      >
                        {t('products.addProduct')}
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {(typeof data?.total === 'number' ? data.total : productList.length) > 0 && (
          <TablePagination
            component="div"
            count={typeof data?.total === 'number' ? data.total : productList.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelRowsPerPage={t('common.itemsPerPage') + ':'}
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} ${t('common.of')} ${count}`}
          />
        )}
      </Paper>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>{t('common.confirmDelete')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('common.confirmDeleteMessage')}
          </DialogContentText>
          <Typography variant="body2" fontWeight={600} mt={1}>
            {deleteTarget?.nameAr || deleteTarget?.nameEn || deleteTarget?.name}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? t('common.processing') : t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      <BarcodePrintDialog
        open={barcodeModalOpen}
        onClose={() => setBarcodeModalOpen(false)}
        product={barcodeProduct}
        products={productList}
      />
    </Box>
  );
}

function debounceFn(fn: (value: string) => void, delay: number): (value: string) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (value: string) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(value), delay);
  };
}