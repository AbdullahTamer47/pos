import { useState, useCallback, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Stack, TextField, Autocomplete,
  Chip, Alert, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Skeleton, IconButton, useTheme, CircularProgress, Grid, Divider,
  alpha,
} from '@mui/material';
import {
  FileDownload as DownloadIcon, Refresh as RefreshIcon, TrendingUp,
  BarChart as BarChartIcon, Inventory2, Star, Speed, Person, Receipt,
  Business, ReceiptLong, CalendarMonth, Summarize, PictureAsPdf,
  GridOn, TableChart, Today, DateRange,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfMonth } from 'date-fns';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { useAppStore } from '@/stores/appStore';
import toast from 'react-hot-toast';
import api, { type ReportRequest, type CustomerResponse, type SupplierResponse, type BranchResponse } from '@/api/endpoints';
import { get } from '@/api/client';


const COLORS = ['#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2', '#00796b', '#c2185b', '#0288d1'];

interface ReportData {
  summary?: {
    totalSales?: number;
    totalOrders?: number;
    totalTax?: number;
    totalDiscount?: number;
    totalRevenue?: number;
    totalExpenses?: number;
    netProfit?: number;
    grossProfit?: number;
    costOfGoods?: number;
    totalCustomers?: number;
    averageOrderValue?: number;
    margin?: number;
    cashSales?: number;
    cardSales?: number;
    creditSales?: number;
    totalInvoices?: number;
    returns?: number;
    refunds?: number;
    openingBalance?: number;
    closingBalance?: number;
    expectedBalance?: number;
    difference?: number;
    shiftNumber?: string;
    openedBy?: string;
    closedBy?: string;
    startTime?: string;
    endTime?: string;
  };
  items?: Array<Record<string, unknown>>;
  chart?: Array<Record<string, unknown>>;
  ledger?: Array<Record<string, unknown>>;
  transactions?: Array<Record<string, unknown>>;
  shifts?: Array<Record<string, unknown>>;
  taxBreakdown?: Array<Record<string, unknown>>;
}

const reportApiMap: Record<string, (params: ReportRequest) => Promise<unknown>> = {
  sales: (p) => api.reports.salesReport(p),
  'profit-loss': (p) => api.reports.profitLossReport(p),
  'inventory-status': (p) => api.reports.inventoryStatusReport(p),
  'inventory-movements': (p) => api.reports.inventoryMovementsReport(p),
  'top-products': (p) => api.reports.topProductsReport(p),
  'slow-moving': (p) => api.reports.slowMovingReport(p),
  'cashier-performance': (p) => api.reports.cashierPerformanceReport(p),
  tax: (p) => api.reports.taxReport(p),
  'daily-summary': (p) => api.reports.dailySummary(p),
};

const reportTitles: Record<string, string> = {
  sales: 'reports.salesReport',
  'profit-loss': 'reports.profitLossReport',
  'inventory-status': 'reports.inventoryStatusReport',
  'inventory-movements': 'reports.inventoryMovementsReport',
  'top-products': 'reports.topProductsReport',
  'slow-moving': 'reports.slowMovingReport',
  'cashier-performance': 'reports.cashierPerformanceReport',
  'customer-statement': 'reports.customerStatement',
  'supplier-statement': 'reports.supplierStatement',
  tax: 'reports.taxReport',
  shift: 'reports.shiftReport',
  'daily-summary': 'reports.dailySummary',
};

export default function ReportDetailPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { type } = useParams<{ type: string }>();
  const language = useAppStore((s) => s.language);
  const isRTL = language === 'ar';

  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('month');
  const [startDate, setStartDate] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [branchId, setBranchId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [shiftId, setShiftId] = useState('');

  const handleSetPeriod = (p: 'today' | 'week' | 'month' | 'custom') => {
    setPeriod(p);
    const now = new Date();
    if (p === 'today') {
      setStartDate(format(now, 'yyyy-MM-dd'));
      setEndDate(format(now, 'yyyy-MM-dd'));
    } else if (p === 'week') {
      setStartDate(format(subDays(now, 7), 'yyyy-MM-dd'));
      setEndDate(format(now, 'yyyy-MM-dd'));
    } else if (p === 'month') {
      setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
      setEndDate(format(now, 'yyyy-MM-dd'));
    }
  };

  const { data: branches } = useQuery<BranchResponse[]>({
    queryKey: ['branches-list'],
    queryFn: () => get('/branches'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: customers } = useQuery<CustomerResponse[]>({
    queryKey: ['customers-list', customerId],
    queryFn: () => get('/customers'),
    staleTime: 5 * 60 * 1000,
    enabled: type === 'customer-statement',
  });

  const { data: suppliers } = useQuery<SupplierResponse[]>({
    queryKey: ['suppliers-list', supplierId],
    queryFn: () => get('/suppliers'),
    staleTime: 5 * 60 * 1000,
    enabled: type === 'supplier-statement',
  });

  const branchList = useMemo<BranchResponse[]>(() => {
    if (!branches) return [];
    if (Array.isArray(branches)) return branches;
    if (Array.isArray((branches as any).data)) return (branches as any).data;
    return [];
  }, [branches]);

  const customerList = useMemo<CustomerResponse[]>(() => {
    if (!customers) return [];
    if (Array.isArray(customers)) return customers;
    if (Array.isArray((customers as any).data)) return (customers as any).data;
    return [];
  }, [customers]);

  const supplierList = useMemo<SupplierResponse[]>(() => {
    if (!suppliers) return [];
    if (Array.isArray(suppliers)) return suppliers;
    if (Array.isArray((suppliers as any).data)) return (suppliers as any).data;
    return [];
  }, [suppliers]);

  // Automatically fetch report data on page load
  const { data: reportData, isFetching, error, refetch } = useQuery<ReportData>({
    queryKey: ['report', type, startDate, endDate, branchId, customerId, supplierId, shiftId],
    queryFn: async () => {
      const params: ReportRequest = { startDate, endDate };
      if (branchId) params.branchId = branchId;

      if (type === 'customer-statement') {
        if (!customerId) return { summary: {}, items: [] };
        return api.reports.customerStatement(customerId, params) as Promise<ReportData>;
      }
      if (type === 'supplier-statement') {
        if (!supplierId) return { summary: {}, items: [] };
        return api.reports.supplierStatement(supplierId, params) as Promise<ReportData>;
      }
      if (type === 'shift') {
        if (!shiftId) return { summary: {}, items: [] };
        return api.reports.shiftReport(shiftId) as Promise<ReportData>;
      }

      const fn = reportApiMap[type || ''];
      if (fn) {
        try {
          const res = await fn(params);
          return (res || { summary: {}, items: [] }) as ReportData;
        } catch (e) {
          console.warn('Report fetch warning:', e);
          return { summary: {}, items: [] };
        }
      }
      return { summary: {}, items: [] };
    },
    enabled: Boolean(
      type &&
      (type !== 'customer-statement' || Boolean(customerId)) &&
      (type !== 'supplier-statement' || Boolean(supplierId))
    ),
  });

  const summary = reportData?.summary || {};
  const items = Array.isArray(reportData?.items) ? reportData.items : [];
  const chartData = Array.isArray(reportData?.chart) ? reportData.chart : [];
  const ledger = Array.isArray(reportData?.ledger) ? reportData.ledger : [];
  const taxBreakdown = Array.isArray(reportData?.taxBreakdown) ? reportData.taxBreakdown : [];

  const handleExport = useCallback((exportFormat: string) => {
    if (exportFormat === 'pdf') {
      window.print();
      return;
    }

    const COLUMN_NAMES_AR: Record<string, string> = {
      date: 'التاريخ',
      productName: 'اسم الصنف',
      sku: 'كود الصنف SKU',
      category: 'التصنيف',
      quantity: 'الكمية المباعة',
      total: 'الإجمالي (ج.م)',
      totalSales: 'إجمالي المبيعات (ج.م)',
      sales: 'المبيعات',
      profit: 'الربح',
      netProfit: 'صافي الربح',
      margin: 'هامش الربح %',
      stock: 'المخزون الحالي',
      orders: 'عدد الطلبات',
      invoices: 'عدد الفواتير',
      cashierName: 'اسم الكاشير',
      tax: 'الضريبة',
      cost: 'التكلفة',
      difference: 'الفارق',
    };

    // Prepare dataset for CSV / Excel
    let dataToExport: Array<Record<string, unknown>> = [];
    if (items.length > 0) {
      dataToExport = items;
    } else if (ledger.length > 0) {
      dataToExport = ledger;
    } else if (chartData.length > 0) {
      dataToExport = chartData;
    } else if (taxBreakdown.length > 0) {
      dataToExport = taxBreakdown;
    }

    if (dataToExport.length === 0 && Object.keys(summary).length === 0) {
      toast.error('لا توجد بيانات متاحة للتصدير في هذه الفترة');
      return;
    }

    const csvLines: string[] = [];
    const reportTitleText = t(reportTitles[type || ''] || 'تقرير');

    // Header info
    csvLines.push(`"التقرير:","${reportTitleText}"`);
    csvLines.push(`"الفترة من:","${startDate}","إلى:","${endDate}"`);
    csvLines.push(`"تاريخ التصدير:","${new Date().toLocaleString('ar-EG')}"`);
    csvLines.push('');

    // Summary section if available
    if (Object.keys(summary).length > 0) {
      csvLines.push('"ملخص المؤشرات المالية والتشغيلية:"');
      for (const [k, v] of Object.entries(summary)) {
        if (v !== undefined && v !== null && typeof v !== 'object') {
          const label = COLUMN_NAMES_AR[k] || t(`reports.${k}`) || k;
          csvLines.push(`"${label}","${v}"`);
        }
      }
      csvLines.push('');
    }

    // Detailed table if available
    if (dataToExport.length > 0) {
      csvLines.push('"جدول تفاصيل التقرير:"');
      const keys = Object.keys(dataToExport[0] || {});
      const headerRow = keys.map((k) => `"${COLUMN_NAMES_AR[k] || k}"`).join(',');
      csvLines.push(headerRow);

      for (const row of dataToExport) {
        const line = keys
          .map((k) => {
            const val = row[k];
            if (val === null || val === undefined) return '""';
            const strVal = String(val).replace(/"/g, '""');
            return `"${strVal}"`;
          })
          .join(',');
        csvLines.push(line);
      }
    }

    // Prepend UTF-8 BOM so Excel displays Arabic flawlessly
    const csvContent = '\uFEFF' + csvLines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${type || 'report'}_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(exportFormat === 'excel' ? 'تم تصدير ملف Excel بنجاح!' : 'تم تصدير ملف CSV بنجاح!');
  }, [type, startDate, endDate, items, ledger, chartData, taxBreakdown, summary, t]);


  const KPI = ({ label, value, prefix }: { label: string; value?: number; prefix?: string }) => (
    <Card sx={{ borderRadius: 3, flex: 1, minWidth: 160 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Typography variant="caption" color="text.secondary" fontWeight={500}>
          {t(label)}
        </Typography>
        <Typography variant="h6" fontWeight={700} color="primary.main">
          {prefix ? `${value ?? 0}${prefix}` : (value ?? 0).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { minimumFractionDigits: 2 })}
        </Typography>
      </CardContent>
    </Card>
  );

  const renderDataTable = (data: Array<Record<string, unknown>>) => {
    if (!Array.isArray(data) || data.length === 0) {
      return (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <Typography variant="body2" color="text.secondary">
            لا توجد بيانات مسجلة لهذه الفترة المحددة.
          </Typography>
        </Paper>
      );
    }
    const keys = Object.keys(data[0] || {});
    return (
      <TableContainer component={Paper} sx={{ borderRadius: 3, maxHeight: 500 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {keys.map((key) => (
                <TableCell key={key} sx={{ fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                  {key}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row, i) => (
              <TableRow key={i} hover>
                {keys.map((key) => (
                  <TableCell key={key}>
                    {typeof row[key] === 'number'
                      ? (row[key] as number).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { minimumFractionDigits: 2 })
                      : String(row[key] ?? '—')}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderSalesReport = () => (
    <>
      {chartData.length > 0 && (
        <Paper sx={{ p: 2, borderRadius: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>{t('reports.salesTrend')}</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke="#1976d2" strokeWidth={2} name={t('reports.totalSales')} />
              <Line type="monotone" dataKey="orders" stroke="#388e3c" strokeWidth={2} name={t('reports.totalOrders')} />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      )}
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={3}>
        <KPI label="reports.totalSales" value={summary?.totalSales} />
        <KPI label="reports.totalOrders" value={summary?.totalOrders} />
        <KPI label="reports.totalTax" value={summary?.totalTax} />
        <KPI label="reports.totalDiscount" value={summary?.totalDiscount} />
        <KPI label="reports.averageOrderValue" value={summary?.averageOrderValue} />
      </Stack>
      {renderDataTable(items)}
    </>
  );

  const renderProfitLoss = () => (
    <>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={3}>
        <KPI label="reports.totalRevenue" value={summary?.totalRevenue} />
        <KPI label="reports.costOfGoods" value={summary?.costOfGoods} />
        <KPI label="reports.grossProfit" value={summary?.grossProfit} />
        <KPI label="reports.totalExpenses" value={summary?.totalExpenses} />
        <KPI label="reports.netProfit" value={summary?.netProfit} />
        <KPI label="reports.marginPercent" value={summary?.margin} prefix="%" />
      </Stack>
      {renderDataTable(items)}
    </>
  );

  const renderInventoryStatus = () => renderDataTable(items);

  const renderTopProducts = () => (
    <>
      {chartData.length > 0 && (
        <Paper sx={{ p: 2, borderRadius: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>{t('reports.topProducts')}</Typography>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={150} />
              <Tooltip />
              <Bar dataKey="sales" fill="#1976d2" name={t('reports.totalSales')} />
              <Bar dataKey="revenue" fill="#388e3c" name={t('reports.totalRevenue')} />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      )}
      {renderDataTable(items)}
    </>
  );

  const renderSlowMoving = () => renderDataTable(items);

  const renderCashierPerformance = () => (
    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={3}>
      {renderDataTable(items)}
    </Stack>
  );

  const renderCustomerStatement = () => (
    <>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={3}>
        <KPI label="reports.openingBalance" value={summary?.openingBalance} />
        <KPI label="reports.totalSales" value={summary?.totalSales} />
        <KPI label="reports.closingBalance" value={summary?.closingBalance} />
      </Stack>
      {renderDataTable(ledger)}
    </>
  );

  const renderSupplierStatement = () => (
    <>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={3}>
        <KPI label="reports.openingBalance" value={summary?.openingBalance} />
        <KPI label="reports.closingBalance" value={summary?.closingBalance} />
      </Stack>
      {renderDataTable(ledger)}
    </>
  );

  const renderTaxReport = () => (
    <>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={3}>
        <KPI label="reports.totalTax" value={summary?.totalTax} />
        <KPI label="reports.totalSales" value={summary?.totalSales} />
      </Stack>
      {taxBreakdown.length > 0 && renderDataTable(taxBreakdown)}
      {renderDataTable(items)}
    </>
  );

  const renderShiftReport = () => (
    <>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={3}>
        <KPI label="reports.openingBalance" value={summary?.openingBalance} />
        <KPI label="reports.closingBalance" value={summary?.closingBalance} />
        <KPI label="reports.expectedBalance" value={summary?.expectedBalance} />
        <KPI label="reports.difference" value={summary?.difference} />
      </Stack>
      {summary?.shiftNumber && (
        <Paper sx={{ p: 2, borderRadius: 3, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Typography variant="caption" color="text.secondary">{t('shifts.shiftNumber')}</Typography>
              <Typography variant="body1" fontWeight={600}>{summary.shiftNumber}</Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Typography variant="caption" color="text.secondary">{t('shifts.openedBy')}</Typography>
              <Typography variant="body1" fontWeight={600}>{summary.openedBy || '—'}</Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Typography variant="caption" color="text.secondary">{t('shifts.startTime')}</Typography>
              <Typography variant="body1" fontWeight={600}>{summary.startTime ? format(new Date(summary.startTime), 'HH:mm') : '—'}</Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Typography variant="caption" color="text.secondary">{t('shifts.endTime')}</Typography>
              <Typography variant="body1" fontWeight={600}>{summary.endTime ? format(new Date(summary.endTime), 'HH:mm') : '—'}</Typography>
            </Grid>
          </Grid>
        </Paper>
      )}
      {renderDataTable(items)}
    </>
  );

  const renderDailySummary = () => (
    <>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={3}>
        <KPI label="reports.totalSales" value={summary?.totalSales} />
        <KPI label="reports.totalInvoices" value={summary?.totalInvoices} />
        <KPI label="reports.cashSales" value={summary?.cashSales} />
        <KPI label="reports.cardSales" value={summary?.cardSales} />
      </Stack>
      {renderDataTable(items)}
    </>
  );

  const renderContent = () => {
    if (isFetching) {
      return (
        <Stack spacing={2}>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={64} sx={{ borderRadius: 2 }} />
          ))}
        </Stack>
      );
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ borderRadius: 3 }}>
          {(error as Error).message || t('common.somethingWentWrong')}
        </Alert>
      );
    }

    switch (type) {
      case 'sales': return renderSalesReport();
      case 'profit-loss': return renderProfitLoss();
      case 'inventory-status': return renderInventoryStatus();
      case 'inventory-movements': return renderDataTable(items);
      case 'top-products': return renderTopProducts();
      case 'slow-moving': return renderSlowMoving();
      case 'cashier-performance': return renderCashierPerformance();
      case 'customer-statement': return renderCustomerStatement();
      case 'supplier-statement': return renderSupplierStatement();
      case 'tax': return renderTaxReport();
      case 'shift': return renderShiftReport();
      case 'daily-summary': return renderDailySummary();
      default: return renderDataTable(items);
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap mb={3}>
        <Typography variant="h4" fontWeight={700}>
          {t(reportTitles[type || ''] || 'reports.report')}
        </Typography>
        {!isFetching && !error && (
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<PictureAsPdf />} size="small" onClick={() => handleExport('pdf')}>
              PDF
            </Button>
            <Button variant="outlined" startIcon={<GridOn />} size="small" onClick={() => handleExport('excel')}>
              Excel
            </Button>
            <Button variant="outlined" startIcon={<TableChart />} size="small" onClick={() => handleExport('csv')}>
              CSV
            </Button>
            <IconButton onClick={() => refetch()} title="تحديث التقرير">
              <RefreshIcon />
            </IconButton>
          </Stack>
        )}
      </Stack>

      {/* Quick Date Shortcuts (Daily / Weekly / Monthly / Custom) */}
      <Paper sx={{ p: 2, borderRadius: 3, mb: 3 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={1.5}>
          فترة التقرير السريعة:
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={2}>
          <Chip
            icon={<Today />}
            label="اليوم (يومي)"
            color={period === 'today' ? 'primary' : 'default'}
            variant={period === 'today' ? 'filled' : 'outlined'}
            onClick={() => handleSetPeriod('today')}
            sx={{ fontWeight: 600 }}
          />
          <Chip
            icon={<DateRange />}
            label="هذا الأسبوع (أسبوعي)"
            color={period === 'week' ? 'primary' : 'default'}
            variant={period === 'week' ? 'filled' : 'outlined'}
            onClick={() => handleSetPeriod('week')}
            sx={{ fontWeight: 600 }}
          />
          <Chip
            icon={<CalendarMonth />}
            label="هذا الشهر (شهري)"
            color={period === 'month' ? 'primary' : 'default'}
            variant={period === 'month' ? 'filled' : 'outlined'}
            onClick={() => handleSetPeriod('month')}
            sx={{ fontWeight: 600 }}
          />
          <Chip
            label="تحديد فترة مخصصة"
            color={period === 'custom' ? 'primary' : 'default'}
            variant={period === 'custom' ? 'filled' : 'outlined'}
            onClick={() => setPeriod('custom')}
            sx={{ fontWeight: 600 }}
          />
        </Stack>

        <Divider sx={{ my: 1.5 }} />

        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField
            label="من تاريخ"
            type="date"
            size="small"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPeriod('custom');
            }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 160 }}
          />
          <TextField
            label="إلى تاريخ"
            type="date"
            size="small"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPeriod('custom');
            }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 160 }}
          />
          {branchList.length > 0 && (
            <Autocomplete
              size="small"
              options={branchList}
              getOptionLabel={(b) => (language === 'ar' ? b.nameAr || b.name : b.nameEn || b.name)}
              value={branchList.find((b) => b.id === branchId) || null}
              onChange={(_, v) => setBranchId(v?.id || '')}
              renderInput={(p) => <TextField {...p} label="الفرع" />}
              sx={{ minWidth: 180 }}
              isOptionEqualToValue={(o, v) => o.id === v.id}
            />
          )}
          {type === 'customer-statement' && (
            <Autocomplete
              size="small"
              options={customerList}
              getOptionLabel={(c) => c.name}
              value={customerList.find((c) => c.id === customerId) || null}
              onChange={(_, v) => setCustomerId(v?.id || '')}
              renderInput={(p) => <TextField {...p} label={t('customers.customer')} required />}
              sx={{ minWidth: 220 }}
              isOptionEqualToValue={(o, v) => o.id === v.id}
            />
          )}
          {type === 'supplier-statement' && (
            <Autocomplete
              size="small"
              options={supplierList}
              getOptionLabel={(s) => s.name}
              value={supplierList.find((s) => s.id === supplierId) || null}
              onChange={(_, v) => setSupplierId(v?.id || '')}
              renderInput={(p) => <TextField {...p} label={t('suppliers.supplier')} required />}
              sx={{ minWidth: 220 }}
              isOptionEqualToValue={(o, v) => o.id === v.id}
            />
          )}
          {type === 'shift' && (
            <TextField
              size="small"
              label={t('shifts.shiftNumber')}
              value={shiftId}
              onChange={(e) => setShiftId(e.target.value)}
              sx={{ minWidth: 160 }}
            />
          )}
          <Button
            variant="contained"
            onClick={() => refetch()}
            disabled={isFetching}
            startIcon={isFetching ? <CircularProgress size={18} color="inherit" /> : <RefreshIcon />}
          >
            تحديث
          </Button>
        </Stack>
      </Paper>

      {renderContent()}
    </Box>
  );
}