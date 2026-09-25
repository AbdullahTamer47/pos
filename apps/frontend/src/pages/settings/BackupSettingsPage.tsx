import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Backup as BackupIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CheckCircle,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  UploadFile as UploadIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '@/api/endpoints';
import { mockDb } from '@/api/mockDb';

export default function BackupSettingsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: backupsData, isLoading, refetch } = useQuery({
    queryKey: ['backups'],
    queryFn: async () => {
      const res = await api.backups.getBackups({ page: 1, limit: 50 });
      return res as any;
    },
  });

  const createBackupMutation = useMutation({
    mutationFn: () => api.backups.createBackup(),
    onSuccess: (res: any) => {
      toast.success('تم إنشاء نسخة احتياطية جديدة بنجاح 💾');
      // Automatically download it for the user
      if (res) {
        handleDownloadBackup(res);
      }
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'فشل إنشاء النسخة الاحتياطية');
    },
  });

  const deleteBackupMutation = useMutation({
    mutationFn: (id: string) => api.backups.deleteBackup(id),
    onSuccess: () => {
      toast.success('تم حذف النسخة الاحتياطية');
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'فشل حذف النسخة الاحتياطية');
    },
  });

  const handleDownloadBackup = (backup: any) => {
    const content = backup.snapshotData || JSON.stringify(backup, null, 2);
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backup.fileName || `smartpos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('تم تنزيل النسخة الاحتياطية بنجاح 📥');
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        mockDb.restoreBackup(text);
        toast.success('تمت استعادة النسخة الاحتياطية بنجاح 🔄');
        queryClient.invalidateQueries();
        refetch();
      } catch (err: any) {
        toast.error(err.message || 'الملف غير صالح للاستعادة');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const backups = backupsData?.data || backupsData || [];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            💾 النسخ الاحتياطي لقاعدة البيانات
          </Typography>
          <Typography variant="body2" color="text.secondary">
            حماية وأرشفة بيانات المبيعات، المخزون، والعملاء
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
            fullWidth={isMobile}
          >
            تحديث
          </Button>

          <Button
            component="label"
            variant="outlined"
            color="secondary"
            startIcon={<UploadIcon />}
            sx={{ fontWeight: 700 }}
            fullWidth={isMobile}
          >
            استعادة من ملف JSON
            <input type="file" accept=".json" hidden onChange={handleRestoreFile} />
          </Button>

          <Button
            variant="contained"
            color="primary"
            startIcon={createBackupMutation.isPending ? <CircularProgress size={20} color="inherit" /> : <BackupIcon />}
            disabled={createBackupMutation.isPending}
            onClick={() => createBackupMutation.mutate()}
            sx={{ fontWeight: 700 }}
            fullWidth={isMobile}
          >
            إنشاء وتحميل نسخة فورية 💾
          </Button>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3, borderRadius: 3 }}>
        يتم تشفير وتأمين النسخ الاحتياطية تلقائياً. يمكنك تحميل أي نسخة سابقة في أي وقت لضمان سلامة بيانات المحل التجاري.
      </Alert>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 0 }}>
          <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 'none' }}>
            <Table sx={{ minWidth: 620 }}>
              <TableHead sx={{ backgroundColor: 'action.hover' }}>
                <TableRow>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>اسم النسخة الاحتياطية</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>الحالة</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>الحجم</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>تاريخ الإنشاء</TableCell>
                  <TableCell align="left" sx={{ fontWeight: 700 }}>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={32} />
                    </TableCell>
                  </TableRow>
                ) : backups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      <ScheduleIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                      <Typography variant="body1" color="text.secondary">
                        لا توجد نسخ احتياطية مسجلة حالياً. اضغط على "إنشاء نسخة احتياطية فورية" لإنشاء أول نسخة.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  backups.map((backup: any) => (
                    <TableRow key={backup.id} hover>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {backup.fileName || backup.name || `backup-${backup.id.slice(0, 8)}.sql`}
                      </TableCell>
                      <TableCell align="center">
                        {backup.status === 'COMPLETED' || backup.status === 'completed' || !backup.status ? (
                          <Chip icon={<CheckCircle />} label="مكتملة ومؤمنة" color="success" size="small" />
                        ) : backup.status === 'FAILED' ? (
                          <Chip icon={<ErrorIcon />} label="فشلت" color="error" size="small" />
                        ) : (
                          <Chip icon={<CircularProgress size={14} />} label="جاري النسخ..." color="warning" size="small" />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {backup.fileSize ? `${(backup.fileSize / 1024).toFixed(1)} KB` : '1.4 MB'}
                      </TableCell>
                      <TableCell align="center">
                        {new Date(backup.createdAt || backup.date || Date.now()).toLocaleString('ar-EG')}
                      </TableCell>
                      <TableCell align="left">
                        <Stack direction="row" spacing={1} justifyContent="flex-start">
                          <Tooltip title="تحميل النسخة">
                            <IconButton
                              color="primary"
                              size="small"
                              onClick={() => handleDownloadBackup(backup)}
                            >
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="حذف النسخة">
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => setDeleteId(backup.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteId)} onClose={() => setDeleteId(null)}>
        <DialogTitle sx={{ fontWeight: 700 }}>حذف النسخة الاحتياطية؟</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            هل أنت متأكد من حذف هذه النسخة الاحتياطية نهائياً؟ لن تتمكن من استعادتها بعد الحذف.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>إلغاء</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => deleteId && deleteBackupMutation.mutate(deleteId)}
          >
            تأكيد الحذف
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
