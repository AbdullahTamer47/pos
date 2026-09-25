import { useState, useCallback, useMemo } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Stack,
  IconButton,
  Tooltip,
  Chip,
  Collapse,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Switch,
  FormControlLabel,
  Autocomplete,
  Paper,
  alpha,
  useTheme,
  useMediaQuery,
  Avatar,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Refresh as RefreshIcon,
  DragIndicator as DragIcon,
  Category as CategoryIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api, { type CategoryResponse } from '@/api/endpoints';

const categorySchema = z.object({
  nameAr: z.string().min(1, 'اسم التصنيف مطلوب'),
  nameEn: z.string().optional().default(''),
  parentId: z.string().optional().nullable(),
  description: z.string().optional().default(''),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().optional().default(0),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface CategoryNodeProps {
  category: CategoryResponse;
  level: number;
  onEdit: (cat: CategoryResponse) => void;
  onDelete: (cat: CategoryResponse) => void;
  onToggleActive: (id: string) => void;
}

function CategoryNode({ category, level, onEdit, onDelete, onToggleActive }: CategoryNodeProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [expanded, setExpanded] = useState(level < 2);

  const hasChildren = category.children && category.children.length > 0;

  return (
    <Box>
      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          borderRadius: 2,
          mb: 0.5,
          ml: { xs: level * 1.5, sm: level * 3 },
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          transition: theme.transitions.create(['box-shadow', 'border-color'], {
            duration: theme.transitions.duration.short,
          }),
          '&:hover': {
            borderColor: theme.palette.primary.main,
            boxShadow: theme.shadows[1],
          },
        }}
      >
        {hasChildren && (
          <IconButton size="small" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        )}
        {!hasChildren && level > 0 && <Box sx={{ width: 32 }} />}

        <Avatar
          src={category.image}
          variant="rounded"
          sx={{ width: 36, height: 36, bgcolor: alpha(theme.palette.primary.main, 0.12) }}
        >
          <CategoryIcon color="primary" fontSize="small" />
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {category.nameAr || category.nameEn || category.name}
          </Typography>
          {category.nameEn && category.nameAr && category.nameEn !== category.nameAr && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {category.nameEn}
            </Typography>
          )}
        </Box>

        <Chip
          size="small"
          label={`${category.productCount || 0} ${t('categories.productCount')}`}
          variant="outlined"
          sx={{ minWidth: 80, justifyContent: 'center', display: { xs: 'none', sm: 'inline-flex' } }}
        />

        <Tooltip title={category.isActive ? t('common.deactivate') : t('common.activate')}>
          <IconButton
            size="small"
            onClick={() => onToggleActive(category.id)}
            color={category.isActive ? 'success' : 'default'}
          >
            {category.isActive ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
          </IconButton>
        </Tooltip>

        <Tooltip title={t('common.edit')}>
          <IconButton size="small" onClick={() => onEdit(category)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title={t('common.delete')}>
          <IconButton size="small" color="error" onClick={() => onDelete(category)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Paper>

      {hasChildren && (
        <Collapse in={expanded}>
          {category.children!.map((child) => (
            <CategoryNode
              key={child.id}
              category={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleActive={onToggleActive}
            />
          ))}
        </Collapse>
      )}
    </Box>
  );
}

function buildCategoryTree(categories?: any): CategoryResponse[] {
  const rawList: CategoryResponse[] = Array.isArray(categories)
    ? categories
    : Array.isArray(categories?.data)
      ? categories.data
      : [];
  const map = new Map<string, CategoryResponse>();
  const roots: CategoryResponse[] = [];

  rawList.filter(Boolean).forEach((cat) => {
    if (cat?.id) {
      map.set(cat.id, { ...cat, children: [] });
    }
  });

  rawList.filter(Boolean).forEach((cat) => {
    if (!cat?.id) return;
    const node = map.get(cat.id);
    if (!node) return;
    if (cat.parentId && map.has(cat.parentId)) {
      const parent = map.get(cat.parentId)!;
      if (!parent.children) parent.children = [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

export default function CategoriesPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryResponse | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery<CategoryResponse[]>({
    queryKey: ['categories', 'tree'],
    queryFn: () => api.categories.getCategories({ limit: 1000 }),
  });

  const categoryList: CategoryResponse[] = useMemo(() => {
    if (Array.isArray(data)) return data;
    if (Array.isArray((data as any)?.data)) return (data as any).data;
    return [];
  }, [data]);

  const tree = useMemo(() => {
    return buildCategoryTree(categoryList);
  }, [categoryList]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      nameAr: '',
      nameEn: '',
      parentId: null,
      description: '',
      isActive: true,
      sortOrder: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: (formData: CategoryFormValues) =>
      api.categories.createCategory({
        name: formData.nameAr || formData.nameEn || 'قسم بدون اسم',
        nameAr: formData.nameAr,
        nameEn: formData.nameEn || formData.nameAr,
        parentId: formData.parentId || undefined,
        description: formData.description || undefined,
        isActive: formData.isActive,
        sortOrder: formData.sortOrder,
      }),
    meta: { successMsg: t('categories.created') || 'Category created' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: CategoryFormValues }) =>
      api.categories.updateCategory(id, {
        name: formData.nameAr || formData.nameEn || 'قسم بدون اسم',
        nameAr: formData.nameAr,
        nameEn: formData.nameEn || formData.nameAr,
        parentId: formData.parentId || undefined,
        description: formData.description || undefined,
        isActive: formData.isActive,
        sortOrder: formData.sortOrder,
      }),
    meta: { successMsg: t('categories.updated') || 'Category updated' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.categories.deleteCategory(id),
    meta: { successMsg: t('categories.deleted') || 'Category deleted' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDeleteTarget(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) =>
      api.categories.updateCategory(id, {}),
    meta: { successMsg: t('categories.updated') || 'Category updated' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const handleOpenAdd = () => {
    reset({
      nameAr: '',
      nameEn: '',
      parentId: null,
      description: '',
      isActive: true,
      sortOrder: 0,
    });
    setEditingCategory(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (cat: CategoryResponse) => {
    reset({
      nameAr: cat.nameAr || cat.name || '',
      nameEn: cat.nameEn || cat.name || '',
      parentId: cat.parentId || null,
      description: cat.description || '',
      isActive: cat.isActive,
      sortOrder: cat.sortOrder || 0,
    });
    setEditingCategory(cat);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
  };

  const onSubmit = (formData: CategoryFormValues) => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (cat: CategoryResponse) => {
    setDeleteTarget(cat);
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id);
    }
  };

  const handleToggleActive = (id: string) => {
    const cat = data?.find((c) => c.id === id);
    if (cat) {
      toggleMutation.mutate(id);
    }
  };

  const mutationError = createMutation.error || updateMutation.error || deleteMutation.error;
  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

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
          {t('nav.categories')}
        </Typography>
        <Stack direction="row" spacing={1}>
          <IconButton onClick={() => refetch()} size="small" sx={{ border: 1, borderColor: 'divider' }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAdd}
            sx={{ flexGrow: { xs: 1, sm: 0 } }}
          >
            {t('categories.addCategory')}
          </Button>
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

      {mutationError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(mutationError as Error)?.message || t('common.somethingWentWrong')}
        </Alert>
      )}

      {isLoading ? (
        <Stack spacing={1}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={56} sx={{ ml: i % 3 === 0 ? 0 : 3 }} />
          ))}
        </Stack>
      ) : tree.length > 0 ? (
        <Box>
          {tree.map((cat) => (
            <CategoryNode
              key={cat.id}
              category={cat}
              level={0}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
            />
          ))}
        </Box>
      ) : (
        <Paper
          sx={{
            py: 8,
            textAlign: 'center',
            borderRadius: 3,
          }}
        >
          <Stack alignItems="center" spacing={2}>
            <CategoryIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
            <Typography variant="h6" color="text.secondary">
              {t('categories.categoryName')}
            </Typography>
            <Typography variant="body2" color="text.disabled" mb={2}>
              {t('common.noData')}
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}>
              {t('categories.addCategory')}
            </Button>
          </Stack>
        </Paper>
      )}

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 3,
            m: isMobile ? 0 : 2,
          },
        }}
      >
        <DialogTitle>
          {editingCategory ? t('categories.editCategory') : t('categories.addCategory')}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack spacing={2.5}>
              <TextField
                label={t('categories.categoryNameAr')}
                fullWidth
                required
                {...register('nameAr')}
                error={!!errors.nameAr}
                helperText={errors.nameAr?.message}
              />
              <TextField
                label={t('categories.categoryNameEn')}
                fullWidth
                {...register('nameEn')}
                error={!!errors.nameEn}
                helperText={errors.nameEn?.message || 'اختياري - يملأ تلقائياً بالاسم العربي'}
              />
              <Controller
                name="parentId"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    value={categoryList.find((c) => c.id === field.value) || null}
                    onChange={(_, val) => field.onChange(val?.id || null)}
                    options={categoryList.filter(
                      (c) => !editingCategory || c.id !== editingCategory.id
                    )}
                    getOptionLabel={(opt) => opt.nameAr || opt.nameEn || opt.name}
                    renderInput={(params) => (
                      <TextField {...params} label={t('categories.parentCategory')} />
                    )}
                    isOptionEqualToValue={(opt, val) => opt.id === val.id}
                  />
                )}
              />
              <TextField
                label={t('common.description')}
                fullWidth
                multiline
                rows={2}
                {...register('description')}
              />
              <TextField
                label={t('categories.sortOrder')}
                type="number"
                fullWidth
                {...register('sortOrder', { valueAsNumber: true })}
              />
              <FormControlLabel
                control={<Switch defaultChecked {...register('isActive')} />}
                label={t('categories.isActive')}
              />
            </Stack>
          </DialogContent>
          <DialogActions
            sx={{
              p: 2,
              borderTop: `1px solid ${theme.palette.divider}`,
              position: isMobile ? 'sticky' : 'relative',
              bottom: 0,
              bgcolor: 'background.paper',
              zIndex: 10,
              flexDirection: { xs: 'column-reverse', sm: 'row' },
            }}
          >
            <Button onClick={handleCloseDialog} fullWidth={isMobile} sx={{ minHeight: 44, borderRadius: 2 }}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={isPending} fullWidth={isMobile} sx={{ minHeight: 44, borderRadius: 2, fontWeight: 700 }}>
              {isPending ? t('common.processing') : t('common.save')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>{t('common.confirmDelete')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('common.confirmDeleteMessage')}</DialogContentText>
          <Typography variant="body2" fontWeight={600} mt={1}>
            {deleteTarget?.nameAr || deleteTarget?.nameEn || deleteTarget?.name}
          </Typography>
          {deleteTarget && (deleteTarget.productCount || 0) > 0 && (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              {t('categories.productCount')}: {deleteTarget.productCount}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleConfirmDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? t('common.processing') : t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}