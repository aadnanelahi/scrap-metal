import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { toast } from 'sonner';
import api from '../../lib/api';
import { 
  Download, Upload, RotateCcw, Database, Loader2, Shield, 
  AlertTriangle, CheckCircle, HardDrive, RefreshCw, Clock, Calendar, Save
} from 'lucide-react';

export default function DataManagementPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backing, setBacking] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [runningScheduledBackup, setRunningScheduledBackup] = useState(false);
  
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [resetConfirm, setResetConfirm] = useState('');
  const [preserveUsers, setPreserveUsers] = useState(true);
  const [preserveMasterData, setPreserveMasterData] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [restorePreview, setRestorePreview] = useState(null);
  
  // Scheduled backup settings
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState('daily');
  const [scheduleTime, setScheduleTime] = useState('02:00');
  const [lastScheduledBackup, setLastScheduledBackup] = useState(null);
  const [backupHistory, setBackupHistory] = useState([]);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadStats();
    loadScheduleSettings();
  }, []);

  const loadStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } catch (error) {
      toast.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const loadScheduleSettings = async () => {
    try {
      const res = await api.get('/admin/backup-schedule');
      if (res.data) {
        setScheduleEnabled(res.data.enabled || false);
        setScheduleFrequency(res.data.frequency || 'daily');
        setScheduleTime(res.data.time || '02:00');
        setLastScheduledBackup(res.data.last_backup);
        setBackupHistory(res.data.history || []);
      }
    } catch (error) {
      // Settings might not exist yet, that's okay
      console.log('No backup schedule settings found');
    }
  };

  const handleSaveSchedule = async () => {
    setSavingSchedule(true);
    try {
      await api.post('/admin/backup-schedule', {
        enabled: scheduleEnabled,
        frequency: scheduleFrequency,
        time: scheduleTime
      });
      toast.success('Backup schedule saved');
      loadScheduleSettings();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save schedule');
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleRunScheduledBackup = async () => {
    setRunningScheduledBackup(true);
    try {
      await api.post('/admin/backup-now');
      toast.success('Scheduled backup completed successfully');
      loadScheduleSettings();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Scheduled backup failed');
    } finally {
      setRunningScheduledBackup(false);
    }
  };

  const handleBackup = async () => {
    setBacking(true);
    try {
      const res = await api.get('/admin/backup');
      const backupData = res.data;
      
      // Create and download file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scrapos_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Backup created successfully');
      loadScheduleSettings(); // Refresh to show new backup in history
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Backup failed');
    } finally {
      setBacking(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.json')) {
      toast.error('Please select a JSON backup file');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!data.metadata || !data.data) {
          toast.error('Invalid backup file format');
          return;
        }
        setSelectedFile(file);
        setRestorePreview(data);
        setShowRestoreDialog(true);
      } catch (err) {
        toast.error('Failed to parse backup file');
      }
    };
    reader.readAsText(file);
  };

  const handleRestore = async () => {
    if (!restorePreview) return;
    
    setRestoring(true);
    try {
      const res = await api.post('/admin/restore', restorePreview);
      toast.success(res.data.message);
      setShowRestoreDialog(false);
      setSelectedFile(null);
      setRestorePreview(null);
      loadStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Restore failed');
    } finally {
      setRestoring(false);
    }
  };

  const handleReset = async () => {
    if (resetConfirm !== 'CONFIRM_RESET') {
      toast.error('Please type CONFIRM_RESET to proceed');
      return;
    }
    
    setResetting(true);
    try {
      const res = await api.post('/admin/reset', null, {
        params: {
          confirm: 'CONFIRM_RESET',
          preserve_users: preserveUsers,
          preserve_master_data: preserveMasterData
        }
      });
      toast.success(res.data.message);
      setShowResetDialog(false);
      setResetConfirm('');
      loadStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Reset failed');
    } finally {
      setResetting(false);
    }
  };

  // Check admin access
  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <Shield className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Access Denied</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          This page is restricted to administrators only.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const getNextBackupTime = () => {
    const now = new Date();
    const [hours, minutes] = scheduleTime.split(':').map(Number);
    let next = new Date(now);
    next.setHours(hours, minutes, 0, 0);
    
    if (next <= now) {
      if (scheduleFrequency === 'daily') {
        next.setDate(next.getDate() + 1);
      } else if (scheduleFrequency === 'weekly') {
        next.setDate(next.getDate() + 7);
      } else if (scheduleFrequency === 'monthly') {
        next.setMonth(next.getMonth() + 1);
      }
    }
    
    return next.toLocaleString();
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="data-management-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">
            Data Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Backup, restore, and reset system data
          </p>
        </div>
        <Button variant="outline" onClick={loadStats} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* System Stats */}
      <div className="kpi-card">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-orange-500" />
          <h3 className="fieldset-legend mb-0 border-0 pb-0">Database Statistics</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {stats && Object.entries(stats.collections).map(([name, count]) => (
            <div key={name} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-sm">
              <p className="text-xs text-slate-500 capitalize">{name.replace('_', ' ')}</p>
              <p className="text-lg font-mono font-bold">{count}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <span className="text-slate-500">Total Records</span>
          <span className="text-2xl font-mono font-bold">{stats?.total_records || 0}</span>
        </div>
      </div>

      {/* Scheduled Backups */}
      <div className="kpi-card border-purple-200 dark:border-purple-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-500" />
            <h3 className="fieldset-legend mb-0 border-0 pb-0">Scheduled Backups</h3>
          </div>
          <Switch
            checked={scheduleEnabled}
            onCheckedChange={setScheduleEnabled}
            data-testid="schedule-toggle"
          />
        </div>
        
        <div className={`space-y-4 ${!scheduleEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm mb-2 block">Frequency</Label>
              <Select value={scheduleFrequency} onValueChange={setScheduleFrequency}>
                <SelectTrigger data-testid="schedule-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm mb-2 block">Time</Label>
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                data-testid="schedule-time"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleSaveSchedule} 
                disabled={savingSchedule}
                className="w-full bg-purple-600 hover:bg-purple-700"
                data-testid="save-schedule-btn"
              >
                {savingSchedule ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Schedule
              </Button>
            </div>
          </div>
          
          {scheduleEnabled && (
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-sm">
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">
                  Next backup: <strong>{getNextBackupTime()}</strong>
                </span>
              </div>
            </div>
          )}
          
          {backupHistory.length > 0 && (
            <div className="mt-4">
              <Label className="text-sm mb-2 block">Recent Backups</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {backupHistory.slice(0, 5).map((backup, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded text-sm">
                    <span>{formatDateTime(backup.created_at)}</span>
                    <span className={`text-xs ${backup.status === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {backup.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Backup */}
        <div className="kpi-card border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
              <Download className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Backup Data</h3>
              <p className="text-sm text-slate-500">Download complete backup</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Creates a JSON backup file containing all system data including users, 
            master data, transactions, and audit logs.
          </p>
          <Button 
            onClick={handleBackup} 
            disabled={backing} 
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            data-testid="backup-btn"
          >
            {backing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {backing ? 'Creating Backup...' : 'Download Backup'}
          </Button>
        </div>

        {/* Restore */}
        <div className="kpi-card border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Upload className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Restore Data</h3>
              <p className="text-sm text-slate-500">Upload backup file</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Restore system data from a previously created backup file. 
            This will replace all current data.
          </p>
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            variant="outline"
            className="w-full border-blue-300 text-blue-600 hover:bg-blue-50"
            data-testid="restore-btn"
          >
            <Upload className="w-4 h-4 mr-2" />
            Select Backup File
          </Button>
        </div>

        {/* Reset */}
        <div className="kpi-card border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
              <RotateCcw className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Reset Data</h3>
              <p className="text-sm text-slate-500">Clear all data</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Permanently delete all transaction data. You can choose to preserve 
            user accounts and master data.
          </p>
          <Button 
            onClick={() => setShowResetDialog(true)} 
            variant="outline"
            className="w-full border-red-300 text-red-600 hover:bg-red-50"
            data-testid="reset-btn"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset System Data
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="kpi-card bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-800 dark:text-amber-300">Important Notes</h4>
              <ul className="mt-2 text-sm text-amber-700 dark:text-amber-400 space-y-1">
                <li>• Always create a backup before restoring or resetting</li>
                <li>• Restore operation will replace ALL existing data</li>
                <li>• Reset cannot be undone - download backup first</li>
                <li>• Audit logs are always preserved for compliance</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="kpi-card bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-emerald-800 dark:text-emerald-300">Backup Contents</h4>
              <ul className="mt-2 text-sm text-emerald-700 dark:text-emerald-400 space-y-1">
                <li>• User accounts and roles</li>
                <li>• Master data (companies, items, customers, etc.)</li>
                <li>• All transactions (PO, SO, payments)</li>
                <li>• Inventory movements and stock levels</li>
                <li>• Journal entries and audit logs</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Restore Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-500" />
              Restore from Backup
            </DialogTitle>
            <DialogDescription>
              This will replace all current data with the backup data.
            </DialogDescription>
          </DialogHeader>
          {restorePreview && (
            <div className="py-4 space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-sm">
                <h4 className="font-semibold mb-2">Backup Information</h4>
                <div className="text-sm space-y-1 text-slate-600 dark:text-slate-400">
                  <p><strong>Created:</strong> {formatDateTime(restorePreview.metadata?.created_at)}</p>
                  <p><strong>Created By:</strong> {restorePreview.metadata?.created_by}</p>
                  <p><strong>Version:</strong> {restorePreview.metadata?.version}</p>
                </div>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-sm">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">Warning</span>
                </div>
                <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
                  This action will replace ALL current data. Make sure you have a backup of current data first.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRestoreDialog(false);
              setSelectedFile(null);
              setRestorePreview(null);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleRestore} 
              disabled={restoring}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {restoring ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              {restoring ? 'Restoring...' : 'Restore Data'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Reset System Data
            </DialogTitle>
            <DialogDescription>
              This action is irreversible. Please read carefully before proceeding.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-sm border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                This will permanently delete transaction data including:
              </p>
              <ul className="mt-2 text-sm text-red-600 dark:text-red-500 list-disc list-inside">
                <li>All purchase orders and sales orders</li>
                <li>Inventory movements and stock levels</li>
                <li>Weighbridge entries</li>
                <li>Journal entries and payments</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="preserve-users" className="text-sm">Preserve User Accounts</Label>
                <Switch
                  id="preserve-users"
                  checked={preserveUsers}
                  onCheckedChange={setPreserveUsers}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="preserve-master" className="text-sm">Preserve Master Data</Label>
                <Switch
                  id="preserve-master"
                  checked={preserveMasterData}
                  onCheckedChange={setPreserveMasterData}
                />
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">
                Type <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">CONFIRM_RESET</code> to proceed
              </Label>
              <Input
                value={resetConfirm}
                onChange={(e) => setResetConfirm(e.target.value)}
                placeholder="Type CONFIRM_RESET"
                className="mt-2"
                data-testid="reset-confirm-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowResetDialog(false);
              setResetConfirm('');
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleReset} 
              disabled={resetting || resetConfirm !== 'CONFIRM_RESET'}
              className="bg-red-600 hover:bg-red-700"
              data-testid="confirm-reset-btn"
            >
              {resetting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
              {resetting ? 'Resetting...' : 'Reset Data'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
