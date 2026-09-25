import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  forwardRef,
  createContext,
  useContext,
  Component,
  type ReactNode,
  type CSSProperties,
  type ChangeEvent,
  type MouseEvent,
  type KeyboardEvent,
  type DragEvent,
  type ReactElement,
} from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  TablePagination,
  TableSortLabel,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  LinearProgress,
  Avatar as MuiAvatar,
  Skeleton,
  Tooltip,
  Badge,
  Alert,
  AlertTitle,
  Snackbar,
  Tabs,
  Tab,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Breadcrumbs as MuiBreadcrumbs,
  Link,
  Rating,
  Slider,
  Divider,
  Drawer,
  AppBar,
  Toolbar,
  InputAdornment,
  Select,
  type SelectChangeEvent,
} from "@mui/material";
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Translate as TranslateIcon,
  FileDownload as FileDownloadIcon,
  PictureAsPdf as PdfIcon,
  GridOn as ExcelIcon,
  Description as CsvIcon,
  CloudOff as OfflineIcon,
  Close as CloseIcon,
  MoreVert as MoreIcon,
  Upload as UploadIcon,
  Delete as DeleteIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Home as HomeIcon,
  ChevronRight as ChevronRightIcon,
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  StarHalf as StarHalfIcon,
  Palette as PaletteIcon,
  Business as BusinessIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Inbox as InboxIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  FilterList as FilterListIcon,
  CalendarToday as CalendarIcon,
  PanoramaFishEye as CircleIcon,
} from "@mui/icons-material";
import type { UserRole, User, CashierPermission } from "@smartpos/types";
import { SortOrder } from "@smartpos/types";
import { formatCurrency, roundToTwo } from "@smartpos/utils";

// ──────────────────────────────────────────────────────────────────────────────
// Theme Context
// ──────────────────────────────────────────────────────────────────────────────

export type ThemeMode = "light" | "dark";
export type Language = "en" | "ar";

export interface ThemeContextValue {
  mode: ThemeMode;
  toggleTheme: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  mode: "light",
  toggleTheme: () => {},
  language: "en",
  setLanguage: () => {},
});

export function useThemeContext(): ThemeContextValue {
  return useContext(ThemeContext);
}

export interface ThemeProviderProps {
  children: ReactNode;
  defaultMode?: ThemeMode;
  defaultLanguage?: Language;
}

export function ThemeProvider({
  children,
  defaultMode = "light",
  defaultLanguage = "en",
}: ThemeProviderProps): ReactElement {
  const [mode, setMode] = useState<ThemeMode>(defaultMode);
  const [language, setLanguage] = useState<Language>(defaultLanguage);

  const toggleTheme = useCallback(() => {
    setMode((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, toggleTheme, language, setLanguage }),
    [mode, toggleTheme, language]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// StatusBadge
// ──────────────────────────────────────────────────────────────────────────────

export type StatusColor = "success" | "warning" | "error" | "info" | "inactive";

export interface StatusBadgeProps {
  status: string;
  color?: StatusColor;
  size?: "small" | "medium";
}

const STATUS_COLOR_MAP: Record<StatusColor, string> = {
  success: "#2e7d32",
  warning: "#ed6c02",
  error: "#d32f2f",
  info: "#0288d1",
  inactive: "#9e9e9e",
};

const STATUS_BG_MAP: Record<StatusColor, string> = {
  success: "#e8f5e9",
  warning: "#fff3e0",
  error: "#fdecea",
  info: "#e1f5fe",
  inactive: "#f5f5f5",
};

export function StatusBadge({
  status,
  color = "info",
  size = "small",
}: StatusBadgeProps): ReactElement {
  return (
    <Chip
      label={status}
      size={size}
      sx={{
        backgroundColor: STATUS_BG_MAP[color],
        color: STATUS_COLOR_MAP[color],
        fontWeight: 600,
        fontSize: size === "small" ? "0.75rem" : "0.875rem",
        borderRadius: "12px",
        border: `1px solid ${STATUS_COLOR_MAP[color]}`,
      }}
    />
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// EmptyState
// ──────────────────────────────────────────────────────────────────────────────

export interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps): ReactElement {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 8,
        px: 2,
        textAlign: "center",
      }}
    >
      {icon ? (
        <Box sx={{ color: "text.secondary", mb: 2 }}>{icon}</Box>
      ) : (
        <Box sx={{ mb: 2, color: "text.disabled" }}>
          <InboxIcon sx={{ fontSize: 64 }} />
        </Box>
      )}
      <Typography variant="h6" sx={{ color: "text.primary", mb: 0.5 }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 3, maxWidth: 400 }}>
          {description}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button variant="contained" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// LoadingSkeleton
// ──────────────────────────────────────────────────────────────────────────────

export type SkeletonVariant = "text" | "circular" | "rectangular";

export interface LoadingSkeletonProps {
  variant?: SkeletonVariant;
  width?: number | string;
  height?: number | string;
  count?: number;
}

export function LoadingSkeleton({
  variant = "text",
  width,
  height,
  count = 1,
}: LoadingSkeletonProps): ReactElement {
  return (
    <Box>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          variant={variant}
          width={width}
          height={height ?? (variant === "text" ? 24 : variant === "circular" ? 40 : 120)}
          animation="wave"
          sx={{ mb: variant === "text" ? 0.5 : 1 }}
        />
      ))}
    </Box>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// PageHeader
// ──────────────────────────────────────────────────────────────────────────────

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface PageHeaderAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: "contained" | "outlined" | "text";
  color?: "primary" | "secondary" | "success" | "error" | "warning" | "info";
  disabled?: boolean;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: PageHeaderAction[];
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
}: PageHeaderProps): ReactElement {
  return (
    <Box sx={{ mb: 3 }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <MuiBreadcrumbs
          separator={<ChevronRightIcon sx={{ fontSize: 16 }} />}
          sx={{ mb: 1 }}
        >
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return crumb.href ? (
              <Link
                key={crumb.label}
                href={crumb.href}
                underline="hover"
                color={isLast ? "text.primary" : "inherit"}
                sx={{ fontSize: "0.875rem" }}
              >
                {crumb.label}
              </Link>
            ) : (
              <Typography
                key={crumb.label}
                variant="body2"
                color={isLast ? "text.primary" : "text.secondary"}
                sx={{ cursor: crumb.onClick ? "pointer" : "default" }}
                onClick={crumb.onClick}
              >
                {crumb.label}
              </Typography>
            );
          })}
        </MuiBreadcrumbs>
      )}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: subtitle ? 0.5 : 0 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body1" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions && actions.length > 0 && (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {actions.map((action) => (
              <Button
                key={action.label}
                variant={action.variant ?? "contained"}
                color={action.color ?? "primary"}
                onClick={action.onClick}
                disabled={action.disabled}
                startIcon={action.icon}
              >
                {action.label}
              </Button>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// ConfirmDialog
// ──────────────────────────────────────────────────────────────────────────────

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  severity?: "warning" | "error" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  severity = "warning",
  onConfirm,
  onCancel,
}: ConfirmDialogProps): ReactElement {
  const severityIcon = severity === "error" ? <ErrorIcon /> : severity === "info" ? <InfoIcon /> : <WarningIcon />;

  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {severityIcon}
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={loading} color="inherit">
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          variant="contained"
          color={severity === "error" ? "error" : severity === "info" ? "info" : "warning"}
          startIcon={loading ? <CircularProgress size={18} /> : undefined}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// DataTable
// ──────────────────────────────────────────────────────────────────────────────

export interface DataTableColumn<T> {
  id: string;
  label: string;
  accessor: (row: T) => ReactNode;
  sortable?: boolean;
  width?: number | string;
  align?: "left" | "center" | "right";
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  totalCount?: number;
  page?: number;
  rowsPerPage?: number;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  sortBy?: string;
  sortOrder?: SortOrder;
  onSort?: (columnId: string, order: SortOrder) => void;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  idAccessor?: (row: T) => string;
  emptyMessage?: string;
  rowsPerPageOptions?: number[];
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  totalCount,
  page = 0,
  rowsPerPage = 10,
  onPageChange,
  onRowsPerPageChange,
  sortBy,
  sortOrder,
  onSort,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  idAccessor = (row: T) => (row as Record<string, string>)["id"] ?? "",
  emptyMessage = "No data available",
  rowsPerPageOptions = [5, 10, 25, 50],
}: DataTableProps<T>): ReactElement {
  const handleSort = (columnId: string): void => {
    if (!onSort) return;
    const newOrder: SortOrder =
      sortBy === columnId && sortOrder === SortOrder.ASC ? SortOrder.DESC : SortOrder.ASC;
    onSort(columnId, newOrder);
  };

  const handleSelectAll = (checked: boolean): void => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange(data.map(idAccessor));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean): void => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter((sid) => sid !== id));
    }
  };

  const allSelected =
    data.length > 0 && data.every((row) => selectedIds.includes(idAccessor(row)));
  const someSelected =
    data.some((row) => selectedIds.includes(idAccessor(row))) && !allSelected;

  return (
    <Paper variant="outlined" sx={{ width: "100%", overflow: "hidden" }}>
      {loading && <LinearProgress />}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={someSelected}
                    checked={allSelected}
                    onChange={(_, checked) => handleSelectAll(checked)}
                  />
                </TableCell>
              )}
              {columns.map((col) => (
                <TableCell
                  key={col.id}
                  align={col.align ?? "left"}
                  sx={{ width: col.width, fontWeight: 600 }}
                >
                  {col.sortable ? (
                    <TableSortLabel
                      active={sortBy === col.id}
                      direction={sortBy === col.id ? sortOrder : "asc"}
                      onClick={() => handleSort(col.id)}
                    >
                      {col.label}
                    </TableSortLabel>
                  ) : (
                    col.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && data.length === 0 ? (
              Array.from({ length: 3 }).map((_, rowIdx) => (
                <TableRow key={`skeleton-${rowIdx}`}>
                  {selectable && (
                    <TableCell padding="checkbox">
                      <Skeleton variant="circular" width={24} height={24} />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={col.id}>
                      <Skeleton variant="text" width="80%" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={selectable ? columns.length + 1 : columns.length}
                  align="center"
                  sx={{ py: 6 }}
                >
                  <EmptyState title={emptyMessage} />
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, rowIdx) => {
                const rowId = idAccessor(row);
                const isSelected = selectedIds.includes(rowId);
                return (
                  <TableRow
                    key={rowId || rowIdx}
                    selected={isSelected}
                    hover
                    sx={{ "&:last-child td": { border: 0 } }}
                  >
                    {selectable && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isSelected}
                          onChange={(_, checked) => handleSelectRow(rowId, checked)}
                        />
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell key={col.id} align={col.align ?? "left"}>
                        {col.accessor(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {onPageChange && (
        <TablePagination
          component="div"
          count={totalCount ?? data.length}
          page={page}
          onPageChange={(_, newPage) => onPageChange(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            if (onRowsPerPageChange) {
              onRowsPerPageChange(parseInt(event.target.value, 10));
            }
          }}
          rowsPerPageOptions={rowsPerPageOptions}
        />
      )}
    </Paper>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// SearchInput
// ──────────────────────────────────────────────────────────────────────────────

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  loading?: boolean;
  debounceMs?: number;
  fullWidth?: boolean;
  size?: "small" | "medium";
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  loading = false,
  debounceMs = 300,
  fullWidth = true,
  size = "small",
}: SearchInputProps): ReactElement {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      onChange(newValue);
      timerRef.current = null;
    }, debounceMs);
  };

  const handleClear = (): void => {
    setLocalValue("");
    onChange("");
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <TextField
      value={localValue}
      onChange={handleChange}
      placeholder={placeholder}
      size={size}
      fullWidth={fullWidth}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            {loading ? <CircularProgress size={18} /> : <SearchIcon fontSize="small" />}
          </InputAdornment>
        ),
        endAdornment: localValue ? (
          <InputAdornment position="end">
            <IconButton size="small" onClick={handleClear}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ) : undefined,
      }}
    />
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// StatCard
// ──────────────────────────────────────────────────────────────────────────────

export interface StatCardTrend {
  value: number;
  direction: "up" | "down" | "flat";
  label?: string;
}

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: StatCardTrend;
  loading?: boolean;
  color?: "primary" | "secondary" | "success" | "warning" | "error" | "info";
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  loading = false,
  color = "primary",
}: StatCardProps): ReactElement {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column" }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          {label}
        </Typography>
        {icon && (
          <Box sx={{ color: `${color}.main`, opacity: 0.7 }}>{icon}</Box>
        )}
      </Box>
      {loading ? (
        <Skeleton variant="text" width="60%" height={40} />
      ) : (
        <Typography variant="h5" sx={{ fontWeight: 700, mb: trend ? 0.5 : 0 }}>
          {value}
        </Typography>
      )}
      {trend && !loading && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {trend.direction === "up" ? (
            <TrendingUpIcon fontSize="small" color="success" />
          ) : trend.direction === "down" ? (
            <TrendingDownIcon fontSize="small" color="error" />
          ) : (
            <TrendingFlatIcon fontSize="small" color="disabled" />
          )}
          <Typography
            variant="caption"
            color={
              trend.direction === "up"
                ? "success.main"
                : trend.direction === "down"
                  ? "error.main"
                  : "text.secondary"
            }
          >
            {trend.value > 0 ? "+" : ""}
            {trend.value}%
            {trend.label && ` ${trend.label}`}
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// ErrorBoundary
// ──────────────────────────────────────────────────────────────────────────────

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            py: 6,
            px: 2,
            textAlign: "center",
          }}
        >
          <ErrorIcon sx={{ fontSize: 48, color: "error.main", mb: 2 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>
            Something went wrong
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
            {this.state.error?.message ?? "An unexpected error occurred. Please try again."}
          </Typography>
          <Button variant="contained" onClick={this.handleRetry} startIcon={<RefreshIcon />}>
            Retry
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Avatar
// ──────────────────────────────────────────────────────────────────────────────

export type AvatarSize = "sm" | "md" | "lg" | "xl";

const AVATAR_SIZE_MAP: Record<AvatarSize, number> = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 72,
};

const AVATAR_FONT_MAP: Record<AvatarSize, string> = {
  sm: "0.875rem",
  md: "1rem",
  lg: "1.25rem",
  xl: "1.5rem",
};

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  onClick?: () => void;
  badge?: ReactNode;
}

export function Avatar({
  src,
  alt,
  name,
  size = "md",
  onClick,
  badge,
}: AvatarProps): ReactElement {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : undefined;

  const avatar = (
    <MuiAvatar
      src={src ?? undefined}
      alt={alt ?? name ?? "Avatar"}
      onClick={onClick}
      sx={{
        width: AVATAR_SIZE_MAP[size],
        height: AVATAR_SIZE_MAP[size],
        fontSize: AVATAR_FONT_MAP[size],
        cursor: onClick ? "pointer" : "default",
        bgcolor: !src ? "primary.main" : undefined,
      }}
    >
      {initials}
    </MuiAvatar>
  );

  if (badge) {
    return (
      <Badge
        overlap="circular"
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        badgeContent={badge}
      >
        {avatar}
      </Badge>
    );
  }

  return avatar;
}

// ──────────────────────────────────────────────────────────────────────────────
// AppShell
// ──────────────────────────────────────────────────────────────────────────────

export interface AppShellSidebarItem {
  id: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  items?: AppShellSidebarItem[];
  badge?: string | number;
  disabled?: boolean;
}

export interface AppShellProps {
  children: ReactNode;
  sidebarItems: AppShellSidebarItem[];
  sidebarWidth?: number;
  activeSidebarItem?: string;
  onSidebarItemClick?: (item: AppShellSidebarItem) => void;
  headerContent?: ReactNode;
  headerActions?: ReactNode;
  userAvatar?: ReactNode;
  username?: string;
  onLogout?: () => void;
  logo?: ReactNode;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function AppShell({
  children,
  sidebarItems,
  sidebarWidth = 260,
  activeSidebarItem,
  onSidebarItemClick,
  headerContent,
  headerActions,
  userAvatar,
  username,
  onLogout,
  logo,
  collapsed = false,
  onToggleCollapse,
}: AppShellProps): ReactElement {
  const actualWidth = collapsed ? 64 : sidebarWidth;

  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Drawer
        variant="permanent"
        sx={{
          width: actualWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: actualWidth,
            boxSizing: "border-box",
            transition: "width 0.2s ease",
            overflowX: "hidden",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            px: collapsed ? 0 : 2,
            py: 1.5,
            minHeight: 56,
          }}
        >
          {!collapsed && logo}
          {onToggleCollapse && (
            <IconButton onClick={onToggleCollapse} size="small">
              {collapsed ? <ChevronRightIcon /> : <MenuIcon />}
            </IconButton>
          )}
        </Box>
        <Divider />
        <Box sx={{ flex: 1, overflow: "auto", py: 1 }}>
          {sidebarItems.map((item) => {
            const isActive = activeSidebarItem === item.id;
            return (
              <Box key={item.id}>
                <Button
                  fullWidth
                  onClick={() => {
                    item.onClick?.();
                    onSidebarItemClick?.(item);
                  }}
                  disabled={item.disabled}
                  sx={{
                    justifyContent: collapsed ? "center" : "flex-start",
                    px: collapsed ? 1 : 2,
                    py: 1,
                    color: isActive ? "primary.main" : "text.primary",
                    backgroundColor: isActive ? "action.selected" : "transparent",
                    minWidth: 0,
                    textTransform: "none",
                    "&:hover": {
                      backgroundColor: isActive ? "action.selected" : "action.hover",
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    {item.icon && (
                      <Box sx={{ display: "flex", alignItems: "center", minWidth: 24 }}>
                        {item.badge ? (
                          <Badge badgeContent={item.badge} color="error">
                            {item.icon}
                          </Badge>
                        ) : (
                          item.icon
                        )}
                      </Box>
                    )}
                    {!collapsed && (
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: isActive ? 600 : 400, textAlign: "left" }}
                      >
                        {item.label}
                      </Typography>
                    )}
                  </Box>
                </Button>
                {item.items && !collapsed && (
                  <Box sx={{ pl: 4 }}>
                    {item.items.map((subItem) => {
                      const subActive = activeSidebarItem === subItem.id;
                      return (
                        <Button
                          key={subItem.id}
                          fullWidth
                          disabled={subItem.disabled}
                          onClick={() => {
                            subItem.onClick?.();
                            onSidebarItemClick?.(subItem);
                          }}
                          sx={{
                            justifyContent: "flex-start",
                            px: 2,
                            py: 0.5,
                            color: subActive ? "primary.main" : "text.secondary",
                            backgroundColor: subActive ? "action.selected" : "transparent",
                            textTransform: "none",
                            fontSize: "0.8rem",
                            minWidth: 0,
                          }}
                        >
                          {subItem.label}
                        </Button>
                      );
                    })}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
        <Divider />
        {!collapsed && username && (
          <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
            {userAvatar}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                {username}
              </Typography>
            </Box>
            {onLogout && (
              <Tooltip title="Logout">
                <IconButton size="small" onClick={onLogout}>
                  <LogoutIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}
      </Drawer>
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <AppBar position="static" color="default" elevation={1} sx={{ zIndex: 1 }}>
          <Toolbar sx={{ gap: 1 }}>
            {headerContent}
            <Box sx={{ flex: 1 }} />
            {headerActions}
          </Toolbar>
        </AppBar>
        <Box
          component="main"
          sx={{
            flex: 1,
            overflow: "auto",
            p: 3,
            backgroundColor: "background.default",
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// PageContainer
// ──────────────────────────────────────────────────────────────────────────────

export interface PageContainerProps {
  children: ReactNode;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
  padding?: number | string;
}

export function PageContainer({
  children,
  maxWidth = "lg",
  padding = 3,
}: PageContainerProps): ReactElement {
  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: maxWidth === false ? undefined : maxWidth,
        mx: maxWidth === false ? 0 : "auto",
        p: padding,
      }}
    >
      {children}
    </Box>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// NotificationToast
// ──────────────────────────────────────────────────────────────────────────────

export type ToastType = "info" | "success" | "warning" | "error";

export interface NotificationToastOptions {
  type: ToastType;
  message: string;
  title?: string;
  autoDismissMs?: number;
  onClose?: () => void;
}

export interface NotificationToastProps extends NotificationToastOptions {
  open: boolean;
  onClose: () => void;
}

const TOAST_ICON_MAP: Record<ToastType, ReactNode> = {
  info: <InfoIcon />,
  success: <CheckCircleIcon />,
  warning: <WarningIcon />,
  error: <ErrorIcon />,
};

export function NotificationToast({
  open,
  type,
  message,
  title,
  autoDismissMs = 5000,
  onClose,
}: NotificationToastProps): ReactElement {
  useEffect(() => {
    if (!open || autoDismissMs <= 0) return;
    const timer = setTimeout(() => {
      onClose();
    }, autoDismissMs);
    return () => clearTimeout(timer);
  }, [open, autoDismissMs, onClose]);

  return (
    <Snackbar
      open={open}
      autoHideDuration={autoDismissMs > 0 ? autoDismissMs : null}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
    >
      <Alert
        severity={type}
        variant="filled"
        onClose={onClose}
        icon={TOAST_ICON_MAP[type]}
        sx={{ width: "100%", maxWidth: 400, alignItems: "center" }}
      >
        {title && <AlertTitle>{title}</AlertTitle>}
        {message}
      </Alert>
    </Snackbar>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// TabPanel
// ──────────────────────────────────────────────────────────────────────────────

export interface TabPanelProps {
  children: ReactNode;
  value: number;
  index: number;
}

export function TabPanel({ children, value, index }: TabPanelProps): ReactElement {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      sx={{ py: 2 }}
    >
      {value === index && children}
    </Box>
  );
}

export interface TabItem {
  label: string;
  icon?: ReactElement;
  disabled?: boolean;
}

export interface AccessibleTabsProps {
  tabs: TabItem[];
  activeTab: number;
  onChange: (index: number) => void;
  children: ReactNode;
  variant?: "standard" | "scrollable" | "fullWidth";
}

export function AccessibleTabs({
  tabs,
  activeTab,
  onChange,
  children,
  variant = "standard",
}: AccessibleTabsProps): ReactElement {
  return (
    <Box>
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => onChange(newValue as number)}
        variant={variant}
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        {tabs.map((tab, idx) => (
          <Tab
            key={idx}
            label={tab.label}
            icon={tab.icon}
            disabled={tab.disabled}
            id={`tab-${idx}`}
            aria-controls={`tabpanel-${idx}`}
          />
        ))}
      </Tabs>
      {React.Children.toArray(children).map((child, idx) => {
        if (React.isValidElement(child) && child.type === TabPanel) {
          return React.cloneElement(child as ReactElement<TabPanelProps>, {
            value: activeTab,
            index: idx,
          });
        }
        return child;
      })}
    </Box>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// RoleGuard
// ──────────────────────────────────────────────────────────────────────────────

export interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  userRole: UserRole | null | undefined;
  fallback?: ReactNode;
}

export function RoleGuard({
  children,
  allowedRoles,
  userRole,
  fallback = null,
}: RoleGuardProps): ReactElement | null {
  if (!userRole || !allowedRoles.includes(userRole)) {
    return fallback as ReactElement | null;
  }
  return <>{children}</>;
}

// ──────────────────────────────────────────────────────────────────────────────
// PermissionGuard
// ──────────────────────────────────────────────────────────────────────────────

export interface PermissionGuardProps {
  children: ReactNode;
  permissions: CashierPermission | null | undefined;
  requiredPermission: keyof CashierPermission;
  fallback?: ReactNode;
}

export function PermissionGuard({
  children,
  permissions,
  requiredPermission,
  fallback = null,
}: PermissionGuardProps): ReactElement | null {
  if (!permissions || !permissions[requiredPermission]) {
    return fallback as ReactElement | null;
  }
  return <>{children}</>;
}

// ──────────────────────────────────────────────────────────────────────────────
// OfflineIndicator
// ──────────────────────────────────────────────────────────────────────────────

export interface OfflineIndicatorProps {
  isOffline?: boolean;
  message?: string;
}

export function OfflineIndicator({
  isOffline,
  message = "You are currently offline. Some features may be unavailable.",
}: OfflineIndicatorProps): ReactElement | null {
  const [offline, setOffline] = useState(isOffline ?? false);

  useEffect(() => {
    if (isOffline !== undefined) {
      setOffline(isOffline);
      return;
    }

    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);

    setOffline(!navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isOffline]);

  if (!offline) return null;

  return (
    <Box
      sx={{
        backgroundColor: "warning.main",
        color: "warning.contrastText",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
        py: 0.5,
        px: 2,
      }}
    >
      <OfflineIcon fontSize="small" />
      <Typography variant="caption">{message}</Typography>
    </Box>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// LoadingOverlay
// ──────────────────────────────────────────────────────────────────────────────

export interface LoadingOverlayProps {
  loading: boolean;
  children: ReactNode;
  fullScreen?: boolean;
  message?: string;
}

export function LoadingOverlay({
  loading,
  children,
  fullScreen = false,
  message,
}: LoadingOverlayProps): ReactElement {
  return (
    <Box
      sx={{
        position: "relative",
        ...(fullScreen && {
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1300,
        }),
      }}
    >
      {children}
      {loading && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            zIndex: 1,
          }}
        >
          <CircularProgress size={48} />
          {message && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {message}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// SplitPane
// ──────────────────────────────────────────────────────────────────────────────

export interface SplitPaneProps {
  left: ReactNode;
  right: ReactNode;
  defaultLeftWidth?: number;
  minLeftWidth?: number;
  maxLeftWidth?: number;
  direction?: "horizontal" | "vertical";
}

export function SplitPane({
  left,
  right,
  defaultLeftWidth = 300,
  minLeftWidth = 200,
  maxLeftWidth = 600,
  direction = "horizontal",
}: SplitPaneProps): ReactElement {
  const [leftSize, setLeftSize] = useState(defaultLeftWidth);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
    document.body.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
  }, [direction]);

  const handleMouseMove = useCallback(
    (e: globalThis.MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newSize =
        direction === "horizontal"
          ? e.clientX - rect.left
          : e.clientY - rect.top;
      setLeftSize(Math.min(maxLeftWidth, Math.max(minLeftWidth, newSize)));
    },
    [direction, minLeftWidth, maxLeftWidth]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const isHorizontal = direction === "horizontal";

  return (
    <Box
      ref={containerRef}
      sx={{
        display: "flex",
        flexDirection: isHorizontal ? "row" : "column",
        height: "100%",
        width: "100%",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          [isHorizontal ? "width" : "height"]: leftSize,
          overflow: "auto",
          flexShrink: 0,
        }}
      >
        {left}
      </Box>
      <Box
        onMouseDown={handleMouseDown}
        sx={{
          [isHorizontal ? "width" : "height"]: 4,
          cursor: isHorizontal ? "col-resize" : "row-resize",
          backgroundColor: "divider",
          flexShrink: 0,
          "&:hover": {
            backgroundColor: "primary.main",
          },
        }}
      />
      <Box sx={{ flex: 1, overflow: "auto", minWidth: 0, minHeight: 0 }}>
        {right}
      </Box>
    </Box>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// ThemeToggle
// ──────────────────────────────────────────────────────────────────────────────

export interface ThemeToggleProps {
  size?: "small" | "medium" | "large";
  showLabel?: boolean;
}

export function ThemeToggle({
  size = "medium",
  showLabel = false,
}: ThemeToggleProps): ReactElement {
  const { mode, toggleTheme } = useThemeContext();

  return (
    <Tooltip title={mode === "light" ? "Switch to dark mode" : "Switch to light mode"}>
      <Button
        onClick={toggleTheme}
        size={size}
        startIcon={mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
        variant="outlined"
        color="inherit"
        sx={{ textTransform: "none", minWidth: showLabel ? undefined : "auto" }}
      >
        {showLabel ? (mode === "light" ? "Dark Mode" : "Light Mode") : undefined}
      </Button>
    </Tooltip>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// LanguageSwitcher
// ──────────────────────────────────────────────────────────────────────────────

export interface LanguageSwitcherProps {
  size?: "small" | "medium";
}

export function LanguageSwitcher({
  size = "small",
}: LanguageSwitcherProps): ReactElement {
  const { language, setLanguage } = useThemeContext();

  const toggleLanguage = (): void => {
    setLanguage(language === "en" ? "ar" : "en");
  };

  return (
    <Tooltip title={language === "en" ? "Switch to Arabic" : "Switch to English"}>
      <Button
        size={size}
        variant="outlined"
        color="inherit"
        onClick={toggleLanguage}
        startIcon={<TranslateIcon />}
        sx={{ textTransform: "none", minWidth: "auto" }}
      >
        {language === "en" ? "AR" : "EN"}
      </Button>
    </Tooltip>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Breadcrumbs
// ──────────────────────────────────────────────────────────────────────────────

export interface BreadcrumbItemDef {
  label: string;
  path?: string;
  onClick?: () => void;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItemDef[];
  separator?: ReactNode;
}

export function Breadcrumbs({
  items,
  separator = <ChevronRightIcon sx={{ fontSize: 16 }} />,
}: BreadcrumbsProps): ReactElement {
  return (
    <MuiBreadcrumbs separator={separator} sx={{ mb: 2 }}>
      <Link
        underline="hover"
        color="inherit"
        href="/"
        sx={{ display: "flex", alignItems: "center" }}
      >
        <HomeIcon sx={{ mr: 0.5, fontSize: 18 }} />
        Home
      </Link>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        if (item.path && !isLast) {
          return (
            <Link
              key={item.label}
              underline="hover"
              color="inherit"
              href={item.path}
              sx={{ fontSize: "0.875rem" }}
            >
              {item.label}
            </Link>
          );
        }
        return (
          <Typography
            key={item.label}
            variant="body2"
            color={isLast ? "text.primary" : "text.secondary"}
            sx={{
              cursor: item.onClick ? "pointer" : "default",
              fontWeight: isLast ? 600 : 400,
            }}
            onClick={item.onClick}
          >
            {item.label}
          </Typography>
        );
      })}
    </MuiBreadcrumbs>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// ExportMenu
// ──────────────────────────────────────────────────────────────────────────────

export type ExportFormat = "pdf" | "excel" | "csv";

export interface ExportMenuProps {
  onExport: (format: ExportFormat) => void;
  loading?: boolean;
  loadingFormat?: ExportFormat;
  availableFormats?: ExportFormat[];
  buttonLabel?: string;
}

const EXPORT_ICONS: Record<ExportFormat, ReactNode> = {
  pdf: <PdfIcon />,
  excel: <ExcelIcon />,
  csv: <CsvIcon />,
};

export function ExportMenu({
  onExport,
  loading = false,
  loadingFormat,
  availableFormats = ["pdf", "excel", "csv"],
  buttonLabel = "Export",
}: ExportMenuProps): ReactElement {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleOpen = (event: MouseEvent<HTMLElement>): void => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (): void => {
    setAnchorEl(null);
  };

  const handleExport = (format: ExportFormat): void => {
    onExport(format);
    handleClose();
  };

  return (
    <>
      <Button
        variant="outlined"
        onClick={handleOpen}
        startIcon={loading ? <CircularProgress size={18} /> : <FileDownloadIcon />}
        disabled={loading}
      >
        {buttonLabel}
      </Button>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        {availableFormats.map((format) => (
          <MenuItem
            key={format}
            onClick={() => handleExport(format)}
            disabled={loading && loadingFormat === format}
          >
            <ListItemIcon>
              {loading && loadingFormat === format ? (
                <CircularProgress size={18} />
              ) : (
                EXPORT_ICONS[format]
              )}
            </ListItemIcon>
            <ListItemText>
              {format === "pdf" ? "PDF" : format === "excel" ? "Excel" : "CSV"}
            </ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// FilterBar
// ──────────────────────────────────────────────────────────────────────────────

export interface FilterChip {
  id: string;
  label: string;
  active: boolean;
  color?: "primary" | "secondary" | "success" | "error" | "warning" | "info" | "default";
  onToggle: () => void;
  onDelete?: () => void;
}

export interface FilterBarProps {
  chips: FilterChip[];
  onClearAll?: () => void;
  clearLabel?: string;
}

export function FilterBar({
  chips,
  onClearAll,
  clearLabel = "Clear All",
}: FilterBarProps): ReactElement {
  const hasActive = chips.some((c) => c.active);

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 2 }}>
      <FilterListIcon sx={{ color: "text.secondary" }} />
      {chips.map((chip) => (
        <Chip
          key={chip.id}
          label={chip.label}
          color={chip.active ? (chip.color ?? "primary") : "default"}
          variant={chip.active ? "filled" : "outlined"}
          onClick={chip.onToggle}
          onDelete={chip.active && chip.onDelete ? chip.onDelete : undefined}
          size="small"
        />
      ))}
      {hasActive && onClearAll && (
        <Button
          size="small"
          onClick={onClearAll}
          sx={{ textTransform: "none", fontSize: "0.75rem" }}
        >
          {clearLabel}
        </Button>
      )}
    </Box>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// RatingStars
// ──────────────────────────────────────────────────────────────────────────────

export interface RatingStarsProps {
  value: number;
  max?: number;
  readOnly?: boolean;
  onChange?: (value: number) => void;
  size?: "small" | "medium" | "large";
  precision?: number;
}

export function RatingStars({
  value,
  max = 5,
  readOnly = true,
  onChange,
  size = "medium",
  precision = 0.5,
}: RatingStarsProps): ReactElement {
  return (
    <Rating
      value={value}
      max={max}
      readOnly={readOnly}
      onChange={onChange ? (_, newValue) => onChange(newValue ?? 0) : undefined}
      precision={precision}
      size={size}
      icon={<StarIcon fontSize="inherit" />}
      emptyIcon={<StarBorderIcon fontSize="inherit" />}
    />
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// ProgressBar
// ──────────────────────────────────────────────────────────────────────────────

export interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  color?: "primary" | "secondary" | "success" | "warning" | "error" | "info";
  animated?: boolean;
  height?: number;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = true,
  color = "primary",
  animated = true,
  height = 8,
}: ProgressBarProps): ReactElement {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <Box sx={{ width: "100%" }}>
      {(label || showPercentage) && (
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
          {label && <Typography variant="body2">{label}</Typography>}
          {showPercentage && (
            <Typography variant="body2" color="text.secondary">
              {roundToTwo(percentage)}%
            </Typography>
          )}
        </Box>
      )}
      <LinearProgress
        variant={animated ? "determinate" : "determinate"}
        value={percentage}
        color={color}
        sx={{
          height,
          borderRadius: height / 2,
          backgroundColor: "action.hover",
        }}
      />
    </Box>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Timeline
// ──────────────────────────────────────────────────────────────────────────────

export interface TimelineItemData {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  icon?: ReactNode;
  color?: "primary" | "secondary" | "success" | "warning" | "error" | "info";
}

export interface TimelineProps {
  items: TimelineItemData[];
  loading?: boolean;
}

export function Timeline({
  items,
  loading = false,
}: TimelineProps): ReactElement {
  if (loading) {
    return (
      <Box>
        {Array.from({ length: 4 }).map((_, i) => (
          <Box key={i} sx={{ display: "flex", gap: 2, mb: 3 }}>
            <Skeleton variant="circular" width={32} height={32} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="40%" />
              <Skeleton variant="text" width="70%" />
              <Skeleton variant="text" width="30%" />
            </Box>
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box>
      {items.map((item, idx) => (
        <Box
          key={item.id}
          sx={{
            display: "flex",
            gap: 2,
            position: "relative",
            pb: idx < items.length - 1 ? 3 : 0,
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: `${item.color ?? "primary"}.main`,
                color: "white",
                fontSize: "0.875rem",
              }}
            >
              {item.icon ?? <CircleIcon sx={{ fontSize: 10 }} />}
            </Box>
            {idx < items.length - 1 && (
              <Box
                sx={{
                  width: 2,
                  flex: 1,
                  minHeight: 24,
                  backgroundColor: "divider",
                  mt: 0.5,
                }}
              />
            )}
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {item.title}
            </Typography>
            {item.description && (
              <Typography variant="body2" color="text.secondary">
                {item.description}
              </Typography>
            )}
            <Typography variant="caption" color="text.disabled">
              {item.timestamp}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// FileDropzone
// ──────────────────────────────────────────────────────────────────────────────

export interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  loading?: boolean;
  label?: string;
  preview?: boolean;
  existingFiles?: { name: string; url: string }[];
  onRemoveFile?: (index: number) => void;
}

export function FileDropzone({
  onFilesSelected,
  accept = "*",
  maxSize = 10 * 1024 * 1024,
  multiple = false,
  loading = false,
  label = "Drag and drop files here, or click to browse",
  preview = true,
  existingFiles = [],
  onRemoveFile,
}: FileDropzoneProps): ReactElement {
  const [isDragOver, setIsDragOver] = useState(false);
  const [previews, setPreviews] = useState<{ name: string; url: string }[]>(existingFiles);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreviews(existingFiles);
  }, [existingFiles]);

  const handleFiles = (files: FileList): void => {
    const fileArray = Array.from(files).filter((f) => f.size <= maxSize);
    if (fileArray.length === 0) return;

    if (preview) {
      const newPreviews = fileArray.map((f) => ({
        name: f.name,
        url: URL.createObjectURL(f),
      }));
      setPreviews((prev) => (multiple ? [...prev, ...newPreviews] : newPreviews));
    }

    onFilesSelected(fileArray);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (): void => {
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleClick = (): void => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    if (e.target) {
      e.target.value = "";
    }
  };

  const handleRemove = (index: number): void => {
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    onRemoveFile?.(index);
  };

  return (
    <Box>
      <Box
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        sx={{
          border: "2px dashed",
          borderColor: isDragOver ? "primary.main" : "divider",
          borderRadius: 2,
          p: 4,
          textAlign: "center",
          cursor: "pointer",
          backgroundColor: isDragOver ? "action.hover" : "background.paper",
          transition: "all 0.2s ease",
          "&:hover": {
            borderColor: "primary.light",
            backgroundColor: "action.hover",
          },
        }}
      >
        {loading ? (
          <CircularProgress size={32} />
        ) : (
          <>
            <UploadIcon sx={{ fontSize: 40, color: "text.secondary", mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: "block" }}>
              Max file size: {(maxSize / (1024 * 1024)).toFixed(0)}MB
            </Typography>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInputChange}
          style={{ display: "none" }}
        />
      </Box>
      {previews.length > 0 && (
        <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
          {previews.map((file, idx) => (
            <Box
              key={idx}
              sx={{
                position: "relative",
                width: 80,
                height: 80,
                borderRadius: 1,
                overflow: "hidden",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              {file.url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ? (
                <Box
                  component="img"
                  src={file.url}
                  alt={file.name}
                  sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <Box
                  sx={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "action.hover",
                  }}
                >
                  <Typography variant="caption" align="center" sx={{ px: 0.5 }}>
                    {file.name}
                  </Typography>
                </Box>
              )}
              {onRemoveFile && (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(idx);
                  }}
                  sx={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    color: "white",
                    borderRadius: 0,
                    p: 0.2,
                    "&:hover": { backgroundColor: "rgba(0,0,0,0.7)" },
                  }}
                >
                  <DeleteIcon sx={{ fontSize: 14 }} />
                </IconButton>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// ColorPicker
// ──────────────────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  "#f44336", "#e91e63", "#9c27b0", "#673ab7", "#3f51b5",
  "#2196f3", "#03a9f4", "#00bcd4", "#009688", "#4caf50",
  "#8bc34a", "#cddc39", "#ffeb3b", "#ffc107", "#ff9800",
  "#ff5722", "#795548", "#607d8b", "#9e9e9e", "#000000",
  "#ffffff", "#f5f5f5", "#e0e0e0", "#bdbdbd",
];

export interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  size?: "small" | "medium";
}

export function ColorPicker({
  value,
  onChange,
  label,
  size = "small",
}: ColorPickerProps): ReactElement {
  const [customColor, setCustomColor] = useState(value);

  useEffect(() => {
    setCustomColor(value);
  }, [value]);

  return (
    <Box>
      {label && (
        <Typography variant="body2" sx={{ mb: 1 }}>
          {label}
        </Typography>
      )}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1 }}>
        {PRESET_COLORS.map((color) => (
          <Box
            key={color}
            onClick={() => onChange(color)}
            sx={{
              width: size === "small" ? 24 : 28,
              height: size === "small" ? 24 : 28,
              borderRadius: "50%",
              backgroundColor: color,
              border: "2px solid",
              borderColor: value === color ? "primary.main" : "divider",
              cursor: "pointer",
              transition: "transform 0.1s",
              "&:hover": { transform: "scale(1.15)" },
            }}
          />
        ))}
      </Box>
      <TextField
        size={size}
        value={customColor}
        onChange={(e) => {
          setCustomColor(e.target.value);
          if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
            onChange(e.target.value);
          }
        }}
        placeholder="#000000"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <PaletteIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
        sx={{ width: 140 }}
      />
    </Box>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// TenantSelector
// ──────────────────────────────────────────────────────────────────────────────

export interface TenantOption {
  id: string;
  name: string;
  logoUrl?: string;
}

export interface TenantSelectorProps {
  tenants: TenantOption[];
  selectedTenantId: string | null;
  onChange: (tenantId: string) => void;
  loading?: boolean;
  size?: "small" | "medium";
}

export function TenantSelector({
  tenants,
  selectedTenantId,
  onChange,
  loading = false,
  size = "small",
}: TenantSelectorProps): ReactElement {
  const handleChange = (e: SelectChangeEvent<string>): void => {
    onChange(e.target.value);
  };

  return (
    <Select
      value={selectedTenantId ?? ""}
      onChange={handleChange}
      size={size}
      disabled={loading}
      startAdornment={
        <InputAdornment position="start">
          <BusinessIcon fontSize="small" />
        </InputAdornment>
      }
      sx={{ minWidth: 200 }}
    >
      {tenants.map((tenant) => (
        <MenuItem key={tenant.id} value={tenant.id}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {tenant.logoUrl ? (
              <Box
                component="img"
                src={tenant.logoUrl}
                sx={{ width: 20, height: 20, borderRadius: "50%" }}
              />
            ) : (
              <BusinessIcon fontSize="small" />
            )}
            <Typography variant="body2">{tenant.name}</Typography>
          </Box>
        </MenuItem>
      ))}
    </Select>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// CurrencyDisplay
// ──────────────────────────────────────────────────────────────────────────────

export interface CurrencyDisplayProps {
  amount: number;
  currency?: string;
  locale?: string;
  variant?: "inherit" | "body1" | "body2" | "h6" | "h5" | "h4";
  color?: string;
  positive?: boolean;
  negative?: boolean;
}

export function CurrencyDisplay({
  amount,
  currency = "USD",
  locale = "en-US",
  variant = "body1",
  color,
  positive = false,
  negative = false,
}: CurrencyDisplayProps): ReactElement {
  const formatted = formatCurrency(amount, currency, locale);

  const displayColor = color
    ? color
    : positive && amount > 0
      ? "success.main"
      : negative && amount < 0
        ? "error.main"
        : undefined;

  return (
    <Typography
      variant={variant}
      sx={{
        color: displayColor ?? "text.primary",
        fontVariantNumeric: "tabular-nums",
        fontWeight: amount !== 0 ? 600 : 400,
      }}
    >
      {formatted}
    </Typography>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// DateRangePicker
// ──────────────────────────────────────────────────────────────────────────────

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  label?: string;
  size?: "small" | "medium";
  presets?: { label: string; range: DateRange }[];
}

function getDefaultPresets(): { label: string; range: DateRange }[] {
  const today = new Date();
  const formatDate = (d: Date): string => d.toISOString().split("T")[0] ?? "";
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  return [
    { label: "Today", range: { startDate: formatDate(today), endDate: formatDate(today) } },
    {
      label: "This Week",
      range: { startDate: formatDate(startOfWeek), endDate: formatDate(today) },
    },
    {
      label: "This Month",
      range: { startDate: formatDate(startOfMonth), endDate: formatDate(today) },
    },
    {
      label: "This Year",
      range: { startDate: formatDate(startOfYear), endDate: formatDate(today) },
    },
  ];
}

export function DateRangePicker({
  value,
  onChange,
  label,
  size = "small",
  presets,
}: DateRangePickerProps): ReactElement {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const displayPresets = presets ?? getDefaultPresets();

  const handlePreset = (preset: DateRange): void => {
    onChange(preset);
    setAnchorEl(null);
  };

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {label && (
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
            {label}
          </Typography>
        )}
        <TextField
          size={size}
          type="date"
          value={value.startDate}
          onChange={(e) => onChange({ ...value, startDate: e.target.value })}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <CalendarIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ width: 160 }}
        />
        <Typography variant="body2" color="text.secondary">
          to
        </Typography>
        <TextField
          size={size}
          type="date"
          value={value.endDate}
          onChange={(e) => onChange({ ...value, endDate: e.target.value })}
          sx={{ width: 160 }}
        />
        <Button
          size={size}
          onClick={(e) => setAnchorEl(e.currentTarget)}
          endIcon={<ExpandMoreIcon />}
          sx={{ textTransform: "none" }}
        >
          Presets
        </Button>
      </Box>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {displayPresets.map((preset) => (
          <MenuItem key={preset.label} onClick={() => handlePreset(preset.range)}>
            {preset.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// InfiniteScroll
// ──────────────────────────────────────────────────────────────────────────────

export interface InfiniteScrollProps {
  children: ReactNode;
  onLoadMore: () => void;
  hasMore: boolean;
  loading?: boolean;
  loader?: ReactNode;
  endMessage?: ReactNode;
  threshold?: number;
  scrollContainer?: HTMLElement | null;
}

export function InfiniteScroll({
  children,
  onLoadMore,
  hasMore,
  loading = false,
  loader,
  endMessage,
  threshold = 200,
  scrollContainer,
}: InfiniteScrollProps): ReactElement {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollContainer ?? null;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          onLoadMore();
        }
      },
      {
        root: container,
        rootMargin: `0px 0px ${threshold}px 0px`,
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore, loading, threshold, scrollContainer]);

  return (
    <Box>
      {children}
      <div ref={sentinelRef} />
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          {loader ?? <CircularProgress size={28} />}
        </Box>
      )}
      {!hasMore && !loading && endMessage && (
        <Box sx={{ textAlign: "center", py: 2 }}>
          {endMessage}
        </Box>
      )}
      {!hasMore && !loading && !endMessage && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "center", py: 2 }}
        >
          No more items to load
        </Typography>
      )}
    </Box>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Re-export all types
// ──────────────────────────────────────────────────────────────────────────────

export type {
  UserRole,
  User,
  CashierPermission,
  SortOrder,
  PaginationParams,
  PaginationMeta,
  ApiResponse,
  ApiError,
  Branch,
  Category,
  Customer,
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  InvoiceType,
  Product,
  ProductVariant,
  PaymentMethod,
  Payment,
  Notification,
  NotificationType,
  PurchaseOrder,
  PurchaseOrderStatus,
  PriceList,
  PriceListType,
  Supplier,
  StockAlert,
  CashShift,
  Expense,
  Coupon,
  CouponType,
  GiftCard,
  LoyaltyConfig,
  TaxConfig,
  SubscriptionPlan,
  Subscription,
  SubscriptionInterval,
  AuditLog,
  FeatureFlag,
  TenantBranding,
  TenantSettings,
  InventoryMovement,
  InventoryMovementType,
  UnitType,
  CustomerTier,
  TicketPriority,
  TicketStatus,
  WebhookEndpoint,
  ApiKey,
  Backup,
  ReportDateRange,
  Revenue,
  SupportTicket,
} from "@smartpos/types";