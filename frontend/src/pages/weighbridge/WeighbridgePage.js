import { useState, useEffect } from 'react';
import { weighbridgeEntriesAPI, weighbridgesAPI, branchesAPI } from '../../lib/api';
import { formatNumber, formatDateTime, getStatusColor } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Scale, Plus, Loader2, Check, Lock, Truck, AlertCircle } from 'lucide-react';

export default function WeighbridgePage() {
  const [entries, setEntries] = useState([]);
  const [weighbridges, setWeighbridges] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showSecondWeightDialog, setShowSecondWeightDialog] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [formData, setFormData] = useState({
    weighbridge_id: '',
    branch_id: '',
    vehicle_number: '',
    driver_name: '',
    transaction_type: 'purchase',
    gross_weight: ''
  });
  const [tareWeight, setTareWeight] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [entriesRes, wbRes, branchRes] = await Promise.all([
        weighbridgeEntriesAPI.list(),
        weighbridgesAPI.list(),
        branchesAPI.list()
      ]);
      setEntries(entriesRes.data || []);
      setWeighbridges(wbRes.data || []);
      setBranches(branchRes.data || []);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEntry = async () => {
    if (!formData.weighbridge_id || !formData.branch_id || !formData.vehicle_number || !formData.gross_weight) {
      toast.error('Please fill all required fields');
      return;
    }

    setSaving(true);
    try {
      await weighbridgeEntriesAPI.create({
        ...formData,
        gross_weight: parseFloat(formData.gross_weight)
      });
      toast.success('Weighbridge entry created');
      setShowNewDialog(false);
      setFormData({
        weighbridge_id: '',
        branch_id: '',
        vehicle_number: '',
        driver_name: '',
        transaction_type: 'purchase',
        gross_weight: ''
      });
      loadData();
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to create entry';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleRecordSecondWeight = async () => {
    if (!tareWeight) {
      toast.error('Please enter tare weight');
      return;
    }

    setSaving(true);
    try {
      await weighbridgeEntriesAPI.recordSecondWeight(selectedEntry.id, parseFloat(tareWeight));
      toast.success('Second weight recorded');
      setShowSecondWeightDialog(false);
      setTareWeight('');
      setSelectedEntry(null);
      loadData();
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to record weight';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleLockEntry = async (entryId) => {
    try {
      await weighbridgeEntriesAPI.lock(entryId);
      toast.success('Entry locked');
      loadData();
    } catch (error) {
      toast.error('Failed to lock entry');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="weighbridge-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">
            Weighbridge
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Record vehicle weights for purchases and sales
          </p>
        </div>
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogTrigger asChild>
            <Button className="btn-accent gap-2" data-testid="new-weighbridge-btn">
              <Plus className="w-4 h-4" />
              New Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-manrope">New Weighbridge Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {(branches.length === 0 || weighbridges.length === 0) && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-sm p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div className="text-sm text-amber-700 dark:text-amber-400">
                      <p className="font-medium">Missing Master Data</p>
                      <p>Please set up {branches.length === 0 ? 'Branches' : ''}{branches.length === 0 && weighbridges.length === 0 ? ' and ' : ''}{weighbridges.length === 0 ? 'Weighbridges' : ''} first.</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="form-label">Branch / Yard</Label>
                  <Select
                    value={formData.branch_id || "select"}
                    onValueChange={(value) => setFormData({ ...formData, branch_id: value === "select" ? "" : value })}
                    disabled={branches.length === 0}
                  >
                    <SelectTrigger className="form-input" data-testid="wb-branch-select">
                      <SelectValue placeholder={branches.length === 0 ? "No branches available" : "Select branch"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="select" disabled>Select branch</SelectItem>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="form-label">Weighbridge</Label>
                  <Select
                    value={formData.weighbridge_id || "select"}
                    onValueChange={(value) => setFormData({ ...formData, weighbridge_id: value === "select" ? "" : value })}
                    disabled={weighbridges.length === 0}
                  >
                    <SelectTrigger className="form-input" data-testid="wb-weighbridge-select">
                      <SelectValue placeholder={weighbridges.length === 0 ? "No weighbridges available" : "Select weighbridge"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="select" disabled>Select weighbridge</SelectItem>
                      {weighbridges.map((wb) => (
                        <SelectItem key={wb.id} value={wb.id}>{wb.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="form-label">Vehicle Number</Label>
                  <Input
                    value={formData.vehicle_number}
                    onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value.toUpperCase() })}
                    placeholder="e.g., DXB 12345"
                    className="form-input"
                    data-testid="wb-vehicle-input"
                  />
                </div>
                <div>
                  <Label className="form-label">Driver Name</Label>
                  <Input
                    value={formData.driver_name}
                    onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                    placeholder="Driver name"
                    className="form-input"
                    data-testid="wb-driver-input"
                  />
                </div>
              </div>

              <div>
                <Label className="form-label">Transaction Type</Label>
                <Select
                  value={formData.transaction_type}
                  onValueChange={(value) => setFormData({ ...formData, transaction_type: value })}
                >
                  <SelectTrigger className="form-input" data-testid="wb-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">Purchase (Incoming)</SelectItem>
                    <SelectItem value="sales">Sales (Outgoing)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Weight Display - Kiosk Style */}
              <div className="bg-slate-900 p-6 rounded-sm">
                <Label className="text-xs uppercase tracking-wider text-slate-400 mb-2 block">
                  Gross Weight (First Weight)
                </Label>
                <div className="flex items-end gap-4">
                  <Input
                    type="number"
                    step="0.001"
                    value={formData.gross_weight}
                    onChange={(e) => setFormData({ ...formData, gross_weight: e.target.value })}
                    placeholder="0.000"
                    className="text-4xl font-mono font-bold bg-amber-400 text-slate-900 h-20 text-center border-0"
                    data-testid="wb-gross-weight-input"
                  />
                  <span className="text-2xl font-bold text-amber-400 mb-4">MT</span>
                </div>
              </div>

              <Button
                onClick={handleCreateEntry}
                disabled={saving}
                className="w-full btn-accent h-12 text-base"
                data-testid="wb-create-btn"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Record First Weight'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="kpi-card flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-sm flex items-center justify-center">
            <Scale className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Entries</p>
            <p className="text-2xl font-mono font-bold">{entries.length}</p>
          </div>
        </div>
        <div className="kpi-card flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-sm flex items-center justify-center">
            <Truck className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Second Weight</p>
            <p className="text-2xl font-mono font-bold">
              {entries.filter(e => e.status === 'first_weight').length}
            </p>
          </div>
        </div>
        <div className="kpi-card flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-sm flex items-center justify-center">
            <Check className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Completed Today</p>
            <p className="text-2xl font-mono font-bold">
              {entries.filter(e => e.status === 'completed').length}
            </p>
          </div>
        </div>
      </div>

      {/* Entries Table */}
      <div className="kpi-card p-0 overflow-hidden">
        <table className="erp-table" data-testid="weighbridge-table">
          <thead>
            <tr>
              <th>Slip #</th>
              <th>Vehicle</th>
              <th>Type</th>
              <th className="text-right">Gross (MT)</th>
              <th className="text-right">Tare (MT)</th>
              <th className="text-right">Net (MT)</th>
              <th>Status</th>
              <th>Time</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-slate-400">
                  <Scale className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No weighbridge entries yet</p>
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} data-testid={`wb-row-${entry.id}`}>
                  <td className="font-mono font-medium">{entry.slip_number}</td>
                  <td className="font-medium">{entry.vehicle_number}</td>
                  <td className="capitalize">{entry.transaction_type}</td>
                  <td className="text-right font-mono">{formatNumber(entry.gross_weight, 3)}</td>
                  <td className="text-right font-mono">{entry.tare_weight ? formatNumber(entry.tare_weight, 3) : '-'}</td>
                  <td className="text-right font-mono font-bold">
                    {entry.net_weight ? formatNumber(entry.net_weight, 3) : '-'}
                  </td>
                  <td>
                    <Badge className={`${getStatusColor(entry.status)} border rounded-full text-xs`}>
                      {entry.status?.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="text-slate-500 text-sm">{formatDateTime(entry.created_at)}</td>
                  <td>
                    <div className="flex gap-2">
                      {entry.status === 'first_weight' && !entry.is_locked && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedEntry(entry);
                            setShowSecondWeightDialog(true);
                          }}
                          data-testid={`wb-second-weight-btn-${entry.id}`}
                        >
                          2nd Weight
                        </Button>
                      )}
                      {entry.status === 'completed' && !entry.is_locked && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleLockEntry(entry.id)}
                          data-testid={`wb-lock-btn-${entry.id}`}
                        >
                          <Lock className="w-4 h-4" />
                        </Button>
                      )}
                      {entry.is_locked && (
                        <Lock className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Second Weight Dialog */}
      <Dialog open={showSecondWeightDialog} onOpenChange={setShowSecondWeightDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-manrope">Record Second Weight (Tare)</DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4 mt-4">
              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-sm">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Slip Number</p>
                    <p className="font-mono font-bold">{selectedEntry.slip_number}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Vehicle</p>
                    <p className="font-bold">{selectedEntry.vehicle_number}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Gross Weight</p>
                    <p className="font-mono font-bold">{formatNumber(selectedEntry.gross_weight, 3)} MT</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 p-6 rounded-sm">
                <Label className="text-xs uppercase tracking-wider text-slate-400 mb-2 block">
                  Tare Weight (Second Weight)
                </Label>
                <div className="flex items-end gap-4">
                  <Input
                    type="number"
                    step="0.001"
                    value={tareWeight}
                    onChange={(e) => setTareWeight(e.target.value)}
                    placeholder="0.000"
                    className="text-4xl font-mono font-bold bg-amber-400 text-slate-900 h-20 text-center border-0"
                    data-testid="wb-tare-weight-input"
                  />
                  <span className="text-2xl font-bold text-amber-400 mb-4">MT</span>
                </div>
              </div>

              {tareWeight && selectedEntry.gross_weight && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-sm border border-emerald-200 dark:border-emerald-800">
                  <p className="text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
                    Calculated Net Weight
                  </p>
                  <p className="text-3xl font-mono font-bold text-emerald-700 dark:text-emerald-300">
                    {formatNumber(selectedEntry.gross_weight - parseFloat(tareWeight || 0), 3)} MT
                  </p>
                </div>
              )}

              <Button
                onClick={handleRecordSecondWeight}
                disabled={saving}
                className="w-full btn-accent h-12 text-base"
                data-testid="wb-record-second-btn"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Record Tare Weight'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
