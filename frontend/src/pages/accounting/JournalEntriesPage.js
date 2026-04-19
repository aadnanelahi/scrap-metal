import { useState, useEffect } from 'react';
import { journalEntriesAPI, chartOfAccountsAPI, companiesAPI } from '../../lib/api';
import { formatCurrency, formatDate, toISODateString, printDocument } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Loader2, BookOpen, Eye, RotateCcw, Trash2, Printer, Filter, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function JournalEntriesPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [reverseDialogOpen, setReverseDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [saving, setSaving] = useState(false);
  const [reverseReason, setReverseReason] = useState('');
  
  // Filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    entryNumber: '',
    reference: '',
    description: '',
    source: 'all',
    status: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);
  
  const isAdmin = user?.role === 'admin';
  
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
      const [entriesRes, accRes, companiesRes] = await Promise.all([
        journalEntriesAPI.list(),
        chartOfAccountsAPI.list(),
        companiesAPI.list()
      ]);
      setEntries(entriesRes.data || []);
      setAccounts((accRes.data || []).filter(a => !a.is_header));
      const companies = companiesRes.data || [];
      setCompany(companies.find(c => c.is_active) || companies[0] || null);
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

  const handlePrint = (entry) => {
    const html = generateJournalEntryHTML(entry, company);
    printDocument(html, `JE-${entry.entry_number}`);
  };

  const generateJournalEntryHTML = (entry, company) => {
    const statusClass = entry.is_reversed ? 'reversed' : 'posted';
    const statusText = entry.is_reversed ? 'REVERSED' : 'POSTED';
    
    const sourceLabels = {
      'manual': 'Manual Entry',
      'auto_purchase': 'Purchase Order',
      'auto_sale': 'Sales Order',
      'auto_expense': 'Expense Entry',
      'auto_income': 'Income Entry',
      'auto_payment': 'Payment',
      'manual_exchange': 'Exchange Adjustment',
      'reversal': 'Reversal Entry'
    };
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Journal Entry - ${entry.entry_number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 900px; margin: 0 auto; font-size: 12px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
          .logo { max-height: 50px; margin-bottom: 10px; }
          .company-name { font-size: 20px; font-weight: bold; }
          .doc-title { font-size: 16px; color: #7c3aed; margin-top: 10px; font-weight: bold; }
          .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
          .info-item { padding: 10px; background: #f9f9f9; border-radius: 5px; }
          .info-label { font-size: 10px; color: #666; text-transform: uppercase; }
          .info-value { font-size: 14px; font-weight: bold; margin-top: 3px; }
          .status-posted { color: #059669; }
          .status-reversed { color: #d97706; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #f5f5f5; font-weight: bold; text-transform: uppercase; font-size: 11px; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .total-row { background: #f0f0f0; font-weight: bold; }
          .debit { color: #059669; }
          .credit { color: #dc2626; }
          .description-box { background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 50px; }
          .signature-box { text-align: center; padding-top: 40px; border-top: 1px solid #333; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #888; }
          .source-badge { display: inline-block; padding: 3px 8px; background: #e0e7ff; color: #4338ca; border-radius: 4px; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          ${company?.logo_url ? `<img src="${company.logo_url}" class="logo" alt="Logo">` : ''}
          <div class="company-name">${company?.name || 'Company Name'}</div>
          <div>${company?.address || ''}</div>
          <div class="doc-title">JOURNAL ENTRY VOUCHER</div>
        </div>
        
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Entry Number</div>
            <div class="info-value">${entry.entry_number}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Entry Date</div>
            <div class="info-value">${formatDate(entry.entry_date)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Reference</div>
            <div class="info-value">${entry.reference_number || entry.reference_id || 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Status</div>
            <div class="info-value status-${statusClass}">${statusText}</div>
          </div>
        </div>
        
        <div class="description-box">
          <strong>Description:</strong> ${entry.description || 'N/A'}<br>
          <strong>Source:</strong> <span class="source-badge">${sourceLabels[entry.source] || entry.source || 'Manual'}</span>
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width: 15%">Account Code</th>
              <th style="width: 35%">Account Name</th>
              <th style="width: 25%">Description</th>
              <th class="text-right" style="width: 12.5%">Debit</th>
              <th class="text-right" style="width: 12.5%">Credit</th>
            </tr>
          </thead>
          <tbody>
            ${(entry.lines || []).map(line => `
              <tr>
                <td class="text-center"><strong>${line.account_code || '-'}</strong></td>
                <td>${line.account_name || '-'}</td>
                <td>${line.description || '-'}</td>
                <td class="text-right debit">${line.debit_amount > 0 ? formatCurrency(line.debit_amount) : '-'}</td>
                <td class="text-right credit">${line.credit_amount > 0 ? formatCurrency(line.credit_amount) : '-'}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="3" class="text-right"><strong>TOTALS</strong></td>
              <td class="text-right debit"><strong>${formatCurrency(entry.total_debit)}</strong></td>
              <td class="text-right credit"><strong>${formatCurrency(entry.total_credit)}</strong></td>
            </tr>
          </tbody>
        </table>
        
        <div class="signatures">
          <div class="signature-box">Prepared By</div>
          <div class="signature-box">Checked By</div>
          <div class="signature-box">Approved By</div>
        </div>
        
        <div class="footer">
          Generated on ${new Date().toLocaleString()}
        </div>
      </body>
      </html>
    `;
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

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await journalEntriesAPI.delete(deleteId);
      toast.success('Journal entry deleted permanently');
      setDeleteDialogOpen(false);
      setDeleteId(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const totals = calculateTotals();

  // Filter entries
  const filteredEntries = entries.filter(entry => {
    // Date filter
    if (filters.startDate && entry.entry_date < filters.startDate) return false;
    if (filters.endDate && entry.entry_date > filters.endDate) return false;
    
    // Entry number filter
    if (filters.entryNumber && !entry.entry_number?.toLowerCase().includes(filters.entryNumber.toLowerCase())) return false;
    
    // Reference filter
    if (filters.reference && !entry.reference_number?.toLowerCase().includes(filters.reference.toLowerCase())) return false;
    
    // Description filter
    if (filters.description && !entry.description?.toLowerCase().includes(filters.description.toLowerCase())) return false;
    
    // Source/type filter
    if (filters.source !== 'all' && entry.source !== filters.source && entry.reference_type !== filters.source) return false;
    
    // Status filter
    if (filters.status === 'posted' && entry.is_reversed) return false;
    if (filters.status === 'reversed' && !entry.is_reversed) return false;
    
    return true;
  });

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      entryNumber: '',
      reference: '',
      description: '',
      source: 'all',
      status: 'all'
    });
  };

  const hasActiveFilters = filters.startDate || filters.endDate || filters.entryNumber || 
    filters.reference || filters.description || filters.source !== 'all' || filters.status !== 'all';

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

      {/* Filters Panel */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
            {hasActiveFilters && <Badge className="bg-orange-500 text-white ml-2">{Object.values(filters).filter(v => v && v !== 'all').length}</Badge>}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-500 gap-1">
              <X className="w-4 h-4" />
              Clear Filters
            </Button>
          )}
        </div>
        
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div>
              <Label className="text-xs">From Date</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">To Date</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Entry #</Label>
              <Input
                placeholder="JE-..."
                value={filters.entryNumber}
                onChange={(e) => setFilters({...filters, entryNumber: e.target.value})}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Reference</Label>
              <Input
                placeholder="Reference..."
                value={filters.reference}
                onChange={(e) => setFilters({...filters, reference: e.target.value})}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input
                placeholder="Search..."
                value={filters.description}
                onChange={(e) => setFilters({...filters, description: e.target.value})}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Source</Label>
              <Select value={filters.source} onValueChange={(v) => setFilters({...filters, source: v})}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="auto_purchase">Purchase</SelectItem>
                  <SelectItem value="auto_sale">Sale</SelectItem>
                  <SelectItem value="auto_expense">Expense</SelectItem>
                  <SelectItem value="auto_income">Income</SelectItem>
                  <SelectItem value="auto_payment">Payment</SelectItem>
                  <SelectItem value="reversal">Reversal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={filters.status} onValueChange={(v) => setFilters({...filters, status: v})}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="posted">Posted</SelectItem>
                  <SelectItem value="reversed">Reversed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        
        <div className="text-sm text-slate-500 mt-2">
          Showing {filteredEntries.length} of {entries.length} entries
        </div>
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
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-8 text-slate-500">
                  {entries.length === 0 ? 'No journal entries yet' : 'No entries match the filters'}
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry) => (
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
                      <Button size="sm" variant="ghost" onClick={() => handlePrint(entry)} title="Print">
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openViewDialog(entry)} title="View Details">
                        <Eye className="w-4 h-4" />
                      </Button>
                      {!entry.is_reversed && entry.reference_type === 'manual' && (
                        <Button size="sm" variant="ghost" className="text-yellow-600" onClick={() => openReverseDialog(entry)} title="Reverse">
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => { setDeleteId(entry.id); setDeleteDialogOpen(true); }}
                          title="Delete permanently"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Delete Dialog - Admin Only */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Permanently Delete Journal Entry</DialogTitle>
            <DialogDescription>
              This will permanently delete the journal entry.
              Account balances will be reversed.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">
              Are you sure you want to delete this journal entry?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
