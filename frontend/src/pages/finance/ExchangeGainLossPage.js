import { useState, useEffect } from 'react';
import { exchangeGainLossAPI, currenciesAPI, companiesAPI } from '../../lib/api';
import { formatCurrency, formatDate, toISODateString, getStatusColor, printDocument } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Printer, Loader2, Check, TrendingUp, TrendingDown, ArrowRightLeft, Trash2 } from 'lucide-react';

export default function ExchangeGainLossPage() {
  const [entries, setEntries] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    entry_type: 'gain',
    entry_date: toISODateString(new Date()),
    currency: 'USD',
    original_amount: 0,
    original_rate: 1,
    current_rate: 1,
    reference_number: '',
    description: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [entriesRes, currenciesRes, companiesRes] = await Promise.all([
        exchangeGainLossAPI.list(),
        currenciesAPI.list(),
        companiesAPI.list()
      ]);
      setEntries(entriesRes.data || []);
      setCurrencies(currenciesRes.data || []);
      const companies = companiesRes.data || [];
      setCompany(companies.find(c => c.is_active) || companies[0] || null);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate exchange difference
  const calculateDifference = () => {
    const originalAed = formData.original_amount * formData.original_rate;
    const currentAed = formData.original_amount * formData.current_rate;
    return Math.abs(currentAed - originalAed);
  };

  const handleSubmit = async () => {
    if (!formData.original_amount || formData.original_amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (!formData.description) {
      toast.error('Please enter a description');
      return;
    }

    setSaving(true);
    try {
      await exchangeGainLossAPI.create({
        ...formData,
        calculated_amount: calculateDifference()
      });
      toast.success('Exchange entry created');
      setShowDialog(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create entry');
    } finally {
      setSaving(false);
    }
  };

  const handlePost = async (id) => {
    try {
      await exchangeGainLossAPI.post(id);
      toast.success('Entry posted to journal');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to post');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    try {
      await exchangeGainLossAPI.delete(id);
      toast.success('Entry deleted');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete');
    }
  };

  const handlePrint = (entry) => {
    const html = generateExchangeVoucherHTML(entry, company);
    printDocument(html, `Exchange-${entry.entry_number}`);
  };

  const generateExchangeVoucherHTML = (entry, company) => {
    const isGain = entry.entry_type === 'gain';
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Exchange ${isGain ? 'Gain' : 'Loss'} Voucher - ${entry.entry_number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
          .logo { max-height: 60px; margin-bottom: 10px; }
          .company-name { font-size: 24px; font-weight: bold; margin: 5px 0; }
          .voucher-title { font-size: 18px; color: ${isGain ? '#059669' : '#dc2626'}; margin-top: 10px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
          .info-item { padding: 10px; background: #f9f9f9; border-radius: 5px; }
          .info-label { font-size: 12px; color: #666; text-transform: uppercase; }
          .info-value { font-size: 16px; font-weight: bold; margin-top: 5px; }
          .amount-section { background: ${isGain ? '#ecfdf5' : '#fef2f2'}; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .amount-label { font-size: 14px; color: #666; }
          .amount-value { font-size: 32px; font-weight: bold; color: ${isGain ? '#059669' : '#dc2626'}; }
          .calculation { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .calc-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .calc-row:last-child { border-bottom: none; font-weight: bold; }
          .description { margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 5px; }
          .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 50px; }
          .signature-box { text-align: center; padding-top: 40px; border-top: 1px solid #333; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          ${company?.logo_url ? `<img src="${company.logo_url}" class="logo" alt="Logo">` : ''}
          <div class="company-name">${company?.name || 'Company Name'}</div>
          <div>${company?.address || ''}</div>
          <div class="voucher-title">FOREIGN EXCHANGE ${isGain ? 'GAIN' : 'LOSS'} VOUCHER</div>
        </div>
        
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Voucher Number</div>
            <div class="info-value">${entry.entry_number}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Date</div>
            <div class="info-value">${formatDate(entry.entry_date)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Reference</div>
            <div class="info-value">${entry.reference_number || 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Status</div>
            <div class="info-value">${entry.status?.toUpperCase()}</div>
          </div>
        </div>
        
        <div class="calculation">
          <div class="calc-row">
            <span>Original Currency</span>
            <span>${entry.currency}</span>
          </div>
          <div class="calc-row">
            <span>Original Amount</span>
            <span>${entry.original_amount?.toLocaleString()} ${entry.currency}</span>
          </div>
          <div class="calc-row">
            <span>Original Rate</span>
            <span>${entry.original_rate}</span>
          </div>
          <div class="calc-row">
            <span>Original Value (AED)</span>
            <span>${formatCurrency(entry.original_amount * entry.original_rate)}</span>
          </div>
          <div class="calc-row">
            <span>Current Rate</span>
            <span>${entry.current_rate}</span>
          </div>
          <div class="calc-row">
            <span>Current Value (AED)</span>
            <span>${formatCurrency(entry.original_amount * entry.current_rate)}</span>
          </div>
        </div>
        
        <div class="amount-section">
          <div class="amount-label">Exchange ${isGain ? 'Gain' : 'Loss'} Amount</div>
          <div class="amount-value">${formatCurrency(entry.calculated_amount || 0)}</div>
        </div>
        
        <div class="description">
          <strong>Description:</strong> ${entry.description || 'N/A'}
          ${entry.notes ? `<br><br><strong>Notes:</strong> ${entry.notes}` : ''}
        </div>
        
        <div class="signatures">
          <div class="signature-box">Prepared By</div>
          <div class="signature-box">Checked By</div>
          <div class="signature-box">Approved By</div>
        </div>
        
        <div class="footer">
          Printed on ${new Date().toLocaleString()}
        </div>
      </body>
      </html>
    `;
  };

  const resetForm = () => {
    setFormData({
      entry_type: 'gain',
      entry_date: toISODateString(new Date()),
      currency: 'USD',
      original_amount: 0,
      original_rate: 1,
      current_rate: 1,
      reference_number: '',
      description: '',
      notes: ''
    });
  };

  // Calculate totals
  const totalGain = entries
    .filter(e => e.entry_type === 'gain' && e.status === 'posted')
    .reduce((sum, e) => sum + (e.calculated_amount || 0), 0);
  
  const totalLoss = entries
    .filter(e => e.entry_type === 'loss' && e.status === 'posted')
    .reduce((sum, e) => sum + (e.calculated_amount || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="exchange-gain-loss-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">Exchange Gain/Loss</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manual Foreign Exchange Adjustments</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="btn-accent gap-2" data-testid="new-exchange-entry-btn">
              <Plus className="w-4 h-4" />
              New Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-amber-500" />
                New Exchange Gain/Loss Entry
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="form-label">Entry Type</Label>
                  <Select value={formData.entry_type} onValueChange={(v) => setFormData({ ...formData, entry_type: v })}>
                    <SelectTrigger className="form-input" data-testid="entry-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gain">
                        <span className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                          Exchange Gain
                        </span>
                      </SelectItem>
                      <SelectItem value="loss">
                        <span className="flex items-center gap-2">
                          <TrendingDown className="w-4 h-4 text-red-500" />
                          Exchange Loss
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="form-label">Entry Date</Label>
                  <Input
                    type="date"
                    value={formData.entry_date}
                    onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                    className="form-input"
                    data-testid="entry-date-input"
                  />
                </div>
                
                <div>
                  <Label className="form-label">Reference Number</Label>
                  <Input
                    value={formData.reference_number}
                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                    className="form-input"
                    placeholder="Invoice/PO #"
                    data-testid="reference-input"
                  />
                </div>
                
                <div>
                  <Label className="form-label">Currency</Label>
                  <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                    <SelectTrigger className="form-input" data-testid="currency-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.filter(c => c.code !== 'AED').map((c) => (
                        <SelectItem key={c.code} value={c.code}>{c.code} - {c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="form-label">Original Amount ({formData.currency})</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.original_amount}
                    onChange={(e) => setFormData({ ...formData, original_amount: parseFloat(e.target.value) || 0 })}
                    className="form-input"
                    data-testid="original-amount-input"
                  />
                </div>
                
                <div>
                  <Label className="form-label">Original Exchange Rate</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={formData.original_rate}
                    onChange={(e) => setFormData({ ...formData, original_rate: parseFloat(e.target.value) || 1 })}
                    className="form-input"
                    data-testid="original-rate-input"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    = {formatCurrency(formData.original_amount * formData.original_rate)} at booking
                  </p>
                </div>
                
                <div>
                  <Label className="form-label">Current Exchange Rate</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={formData.current_rate}
                    onChange={(e) => setFormData({ ...formData, current_rate: parseFloat(e.target.value) || 1 })}
                    className="form-input"
                    data-testid="current-rate-input"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    = {formatCurrency(formData.original_amount * formData.current_rate)} current
                  </p>
                </div>
                
                {/* Calculated Difference Display */}
                <div className="col-span-2">
                  <div className={`flex items-center justify-between p-4 rounded-lg ${
                    formData.entry_type === 'gain' 
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200' 
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      {formData.entry_type === 'gain' ? (
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      )}
                      <span className="font-medium">
                        Calculated {formData.entry_type === 'gain' ? 'Gain' : 'Loss'}
                      </span>
                    </div>
                    <span className={`font-mono text-xl font-bold ${
                      formData.entry_type === 'gain' ? 'text-emerald-700' : 'text-red-700'
                    }`}>
                      {formatCurrency(calculateDifference())}
                    </span>
                  </div>
                </div>
                
                <div className="col-span-2">
                  <Label className="form-label">Description *</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="form-input"
                    placeholder="e.g., Year-end currency revaluation"
                    data-testid="description-input"
                  />
                </div>
                
                <div className="col-span-2">
                  <Label className="form-label">Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="form-input"
                    placeholder="Additional notes..."
                    rows={2}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={() => handleSubmit()} disabled={saving} className="btn-accent" data-testid="save-entry-btn">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Entry'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="kpi-card">
          <p className="text-xs font-bold uppercase text-slate-500">Total Gains</p>
          <p className="text-2xl font-mono font-bold text-emerald-600">
            {formatCurrency(totalGain)}
          </p>
        </div>
        <div className="kpi-card">
          <p className="text-xs font-bold uppercase text-slate-500">Total Losses</p>
          <p className="text-2xl font-mono font-bold text-red-600">
            {formatCurrency(totalLoss)}
          </p>
        </div>
        <div className="kpi-card">
          <p className="text-xs font-bold uppercase text-slate-500">Net Position</p>
          <p className={`text-2xl font-mono font-bold ${totalGain - totalLoss >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(totalGain - totalLoss)}
          </p>
        </div>
      </div>

      {/* Entries Table */}
      <div className="kpi-card p-0 overflow-hidden">
        <table className="erp-table" data-testid="exchange-entries-table">
          <thead>
            <tr>
              <th>Entry #</th>
              <th>Type</th>
              <th>Date</th>
              <th>Currency</th>
              <th>Original Amount</th>
              <th className="text-right">Gain/Loss (AED)</th>
              <th>Reference</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-slate-400">
                  <ArrowRightLeft className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No exchange entries yet</p>
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="font-mono font-medium">{entry.entry_number}</td>
                  <td>
                    <Badge variant="outline" className={entry.entry_type === 'gain' ? 'text-emerald-600 border-emerald-300' : 'text-red-600 border-red-300'}>
                      <span className="flex items-center gap-1">
                        {entry.entry_type === 'gain' ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {entry.entry_type === 'gain' ? 'Gain' : 'Loss'}
                      </span>
                    </Badge>
                  </td>
                  <td>{formatDate(entry.entry_date)}</td>
                  <td className="font-medium">{entry.currency}</td>
                  <td className="font-mono">{entry.original_amount?.toLocaleString()}</td>
                  <td className={`text-right font-mono font-bold ${
                    entry.entry_type === 'gain' ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {entry.entry_type === 'gain' ? '+' : '-'}{formatCurrency(entry.calculated_amount || 0)}
                  </td>
                  <td>{entry.reference_number || '—'}</td>
                  <td>
                    <Badge className={`${getStatusColor(entry.status)} border rounded-full text-xs`}>
                      {entry.status}
                    </Badge>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handlePrint(entry)}
                        data-testid={`print-entry-btn-${entry.id}`}
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                      {entry.status !== 'posted' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePost(entry.id)}
                            data-testid={`post-entry-btn-${entry.id}`}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Post
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDelete(entry.id)}
                            data-testid={`delete-entry-btn-${entry.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
