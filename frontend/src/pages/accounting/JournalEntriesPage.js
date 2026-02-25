import { useState, useEffect } from 'react';
import { journalEntriesAPI, chartOfAccountsAPI } from '../../lib/api';
import { formatCurrency, formatDate, toISODateString } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Loader2, BookOpen, Eye, RotateCcw, Trash2 } from 'lucide-react';

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [reverseDialogOpen, setReverseDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [saving, setSaving] = useState(false);
  const [reverseReason, setReverseReason] = useState('');
  
  const [formData, setFormData] = useState({
    entry_date: toISODateString(new Date()),
    description: '',
    reference_number: '',
    lines: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [entriesRes, accRes] = await Promise.all([
        journalEntriesAPI.list(),
        chartOfAccountsAPI.list()
      ]);
      setEntries(entriesRes.data || []);
      setAccounts((accRes.data || []).filter(a => !a.is_header));
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setFormData({
      entry_date: toISODateString(new Date()),
      description: '',
      reference_number: '',
      lines: [
        { account_id: '', account_code: '', account_name: '', debit_amount: 0, credit_amount: 0 },
        { account_id: '', account_code: '', account_name: '', debit_amount: 0, credit_amount: 0 }
      ]
    });
    setDialogOpen(true);
  };

  const openViewDialog = (entry) => {
    setSelectedEntry(entry);
    setViewDialogOpen(true);
  };

  const openReverseDialog = (entry) => {
    setSelectedEntry(entry);
    setReverseReason('');
    setReverseDialogOpen(true);
  };

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { account_id: '', account_code: '', account_name: '', debit_amount: 0, credit_amount: 0 }]
    });
  };

  const removeLine = (index) => {
    if (formData.lines.length <= 2) {
      toast.error('Minimum 2 lines required');
      return;
    }
    setFormData({
      ...formData,
      lines: formData.lines.filter((_, i) => i !== index)
    });
  };

  const updateLine = (index, field, value) => {
    const newLines = [...formData.lines];
    
    if (field === 'account_id') {
      const account = accounts.find(a => a.id === value);
      newLines[index] = {
        ...newLines[index],
        account_id: value,
        account_code: account?.account_code || '',
        account_name: account?.account_name || ''
      };
    } else {
      newLines[index] = {
        ...newLines[index],
        [field]: field.includes('amount') ? parseFloat(value) || 0 : value
      };
    }
    
    setFormData({ ...formData, lines: newLines });
  };

  const calculateTotals = () => {
    const debit = formData.lines.reduce((sum, l) => sum + (l.debit_amount || 0), 0);
    const credit = formData.lines.reduce((sum, l) => sum + (l.credit_amount || 0), 0);
    return { debit, credit, balanced: Math.abs(debit - credit) < 0.01 };
  };

  const handleSave = async () => {
    if (!formData.description) {
      toast.error('Description is required');
      return;
    }
    
    const totals = calculateTotals();
    if (!totals.balanced) {
      toast.error('Journal entry must balance (Debit = Credit)');
      return;
    }

    const validLines = formData.lines.filter(l => l.account_id && (l.debit_amount > 0 || l.credit_amount > 0));
    if (validLines.length < 2) {
      toast.error('At least 2 valid lines required');
      return;
    }

    setSaving(true);
    try {
      await journalEntriesAPI.create({
        ...formData,
        lines: validLines,
        reference_type: 'manual'
      });
      toast.success('Journal entry created');
      setDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save journal entry');
    } finally {
      setSaving(false);
    }
  };

  const handleReverse = async () => {
    if (!reverseReason) {
      toast.error('Reason is required');
      return;
    }

    setSaving(true);
    try {
      await journalEntriesAPI.reverse(selectedEntry.id, { reason: reverseReason });
      toast.success('Journal entry reversed');
      setReverseDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reverse entry');
    } finally {
      setSaving(false);
    }
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="journal-entries-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-purple-600" />
            Journal Entries
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Double-entry accounting journal
          </p>
        </div>
        <Button onClick={openCreateDialog} className="btn-accent">
          <Plus className="w-4 h-4 mr-2" />
          New Journal Entry
        </Button>
      </div>

      {/* Entries Table */}
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Entry #</th>
              <th>Date</th>
              <th>Type</th>
              <th>Description</th>
              <th className="text-right">Debit</th>
              <th className="text-right">Credit</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-8 text-slate-500">
                  No journal entries yet
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className={entry.is_reversed ? 'opacity-50' : ''}>
                  <td className="font-mono font-medium">{entry.entry_number}</td>
                  <td>{formatDate(entry.entry_date)}</td>
                  <td>
                    <Badge className={
                      entry.reference_type === 'manual' ? 'bg-purple-100 text-purple-800' :
                      entry.reference_type === 'expense' ? 'bg-red-100 text-red-800' :
                      entry.reference_type === 'income' ? 'bg-green-100 text-green-800' :
                      entry.reference_type === 'reversal' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }>
                      {entry.reference_type}
                    </Badge>
                  </td>
                  <td className="max-w-xs truncate">{entry.description}</td>
                  <td className="text-right font-mono">{formatCurrency(entry.total_debit)}</td>
                  <td className="text-right font-mono">{formatCurrency(entry.total_credit)}</td>
                  <td>
                    {entry.is_reversed ? (
                      <Badge className="bg-yellow-100 text-yellow-800">Reversed</Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-800">Posted</Badge>
                    )}
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openViewDialog(entry)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {!entry.is_reversed && entry.reference_type === 'manual' && (
                        <Button size="sm" variant="ghost" className="text-yellow-600" onClick={() => openReverseDialog(entry)}>
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-600" />
              New Journal Entry
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Entry Date *</Label>
                <Input
                  type="date"
                  value={formData.entry_date}
                  onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Reference Number</Label>
                <Input
                  value={formData.reference_number}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label>Description *</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Entry description"
                />
              </div>
            </div>

            {/* Journal Lines */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="p-2 text-left">Account</th>
                    <th className="p-2 text-right w-32">Debit</th>
                    <th className="p-2 text-right w-32">Credit</th>
                    <th className="p-2 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.lines.map((line, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2">
                        <Select value={line.account_id} onValueChange={(v) => updateLine(idx, 'account_id', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map(acc => (
                              <SelectItem key={acc.id} value={acc.id}>
                                {acc.account_code} - {acc.account_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={line.debit_amount || ''}
                          onChange={(e) => updateLine(idx, 'debit_amount', e.target.value)}
                          className="text-right"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={line.credit_amount || ''}
                          onChange={(e) => updateLine(idx, 'credit_amount', e.target.value)}
                          className="text-right"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="p-2">
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => removeLine(idx)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold">
                  <tr>
                    <td className="p-2">
                      <Button size="sm" variant="outline" onClick={addLine}>
                        <Plus className="w-4 h-4 mr-1" /> Add Line
                      </Button>
                    </td>
                    <td className="p-2 text-right">{formatCurrency(totals.debit)}</td>
                    <td className="p-2 text-right">{formatCurrency(totals.credit)}</td>
                    <td className="p-2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Balance Check */}
            <div className={`p-3 rounded-lg ${totals.balanced ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
              {totals.balanced ? (
                <span>Entry is balanced</span>
              ) : (
                <span>Entry is NOT balanced. Difference: {formatCurrency(Math.abs(totals.debit - totals.credit))}</span>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !totals.balanced}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Post Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Journal Entry: {selectedEntry?.entry_number}</DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Date:</strong> {formatDate(selectedEntry.entry_date)}</div>
                <div><strong>Type:</strong> {selectedEntry.reference_type}</div>
                <div className="col-span-2"><strong>Description:</strong> {selectedEntry.description}</div>
              </div>
              <table className="w-full text-sm border rounded">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="p-2 text-left">Account</th>
                    <th className="p-2 text-right">Debit</th>
                    <th className="p-2 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEntry.lines?.map((line, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2">{line.account_code} - {line.account_name}</td>
                      <td className="p-2 text-right font-mono">{line.debit_amount > 0 ? formatCurrency(line.debit_amount) : ''}</td>
                      <td className="p-2 text-right font-mono">{line.credit_amount > 0 ? formatCurrency(line.credit_amount) : ''}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold">
                  <tr>
                    <td className="p-2">Total</td>
                    <td className="p-2 text-right">{formatCurrency(selectedEntry.total_debit)}</td>
                    <td className="p-2 text-right">{formatCurrency(selectedEntry.total_credit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reverse Dialog */}
      <Dialog open={reverseDialogOpen} onOpenChange={setReverseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reverse Journal Entry</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-500 mb-4">
              This will create a new journal entry with reversed debits and credits.
            </p>
            <Label>Reason for Reversal *</Label>
            <Textarea
              value={reverseReason}
              onChange={(e) => setReverseReason(e.target.value)}
              placeholder="Enter reason..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReverseDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleReverse} disabled={saving} className="bg-yellow-600 hover:bg-yellow-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Reverse Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
