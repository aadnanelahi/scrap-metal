import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { exportSalesAPI, customersAPI, branchesAPI, scrapItemsAPI, companiesAPI, incotermsAPI, portsAPI, currenciesAPI } from '../../lib/api';
import { formatCurrency, toISODateString } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Loader2, Save, AlertCircle } from 'lucide-react';

export default function NewExportSalePage() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [branches, setBranches] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [incoterms, setIncoterms] = useState([]);
  const [ports, setPorts] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    company_id: '',
    branch_id: '',
    customer_id: '',
    customer_name: '',
    contract_date: toISODateString(new Date()),
    shipment_date: '',
    currency: 'USD',
    exchange_rate: 3.67,
    incoterm_id: '',
    port_of_loading_id: '',
    port_of_destination_id: '',
    shipping_line: '',
    container_number: '',
    bl_number: '',
    freight_cost: 0,
    notes: '',
    lines: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [compRes, branchRes, custRes, itemRes, incRes, portRes, currRes] = await Promise.all([
        companiesAPI.list(),
        branchesAPI.list(),
        customersAPI.list('international'),
        scrapItemsAPI.list(),
        incotermsAPI.list(),
        portsAPI.list(),
        currenciesAPI.list()
      ]);
      setCompanies(compRes.data || []);
      setBranches(branchRes.data || []);
      setCustomers(custRes.data || []);
      setItems(itemRes.data || []);
      setIncoterms(incRes.data || []);
      setPorts(portRes.data || []);
      setCurrencies(currRes.data || []);

      if (compRes.data?.length > 0) {
        setFormData(prev => ({ ...prev, company_id: compRes.data[0].id }));
      }
      if (branchRes.data?.length > 0) {
        setFormData(prev => ({ ...prev, branch_id: branchRes.data[0].id }));
      }
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerChange = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    setFormData(prev => ({
      ...prev,
      customer_id: customerId,
      customer_name: customer?.name || '',
      currency: customer?.currency || 'USD'
    }));
  };

  const addLine = () => {
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, {
        item_id: '',
        item_name: '',
        quantity: 0,
        unit: 'MT',
        unit_price: 0,
        vat_code_id: '',
        vat_rate: 0,
        vat_amount: 0,
        line_total: 0
      }]
    }));
  };

  const updateLine = (index, field, value) => {
    const newLines = [...formData.lines];
    newLines[index][field] = value;

    if (field === 'item_id') {
      const item = items.find(i => i.id === value);
      newLines[index].item_name = item?.name || '';
    }

    const qty = parseFloat(newLines[index].quantity) || 0;
    const price = parseFloat(newLines[index].unit_price) || 0;
    newLines[index].line_total = qty * price;
    newLines[index].vat_amount = 0; // Zero-rated for exports

    setFormData(prev => ({ ...prev, lines: newLines }));
  };

  const removeLine = (index) => {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index)
    }));
  };

  const calculateTotals = () => {
    const subtotal = formData.lines.reduce((sum, line) => sum + (line.line_total || 0), 0);
    const total = subtotal + (parseFloat(formData.freight_cost) || 0);
    return { subtotal, total };
  };

  const handleSubmit = async () => {
    if (!formData.company_id || !formData.branch_id || !formData.customer_id) {
      toast.error('Please fill all required fields');
      return;
    }
    if (formData.lines.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }

    setSaving(true);
    try {
      const totals = calculateTotals();
      await exportSalesAPI.create({
        ...formData,
        subtotal: totals.subtotal,
        total_amount: totals.total
      });
      toast.success('Export sales contract created');
      navigate('/export-sales');
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to create contract';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const missingData = [];
  if (companies.length === 0) missingData.push('Companies');
  if (branches.length === 0) missingData.push('Branches');
  if (customers.length === 0) missingData.push('Customers (International)');
  if (items.length === 0) missingData.push('Scrap Items');

  if (missingData.length > 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/export-sales')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">
              New Export Sales Contract
            </h1>
          </div>
        </div>
        <div className="kpi-card border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800 dark:text-amber-300">Master Data Required</h3>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                Before creating an export contract, you need to set up:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-amber-700 dark:text-amber-400">
                {missingData.map(item => (<li key={item}>• {item}</li>))}
              </ul>
              <div className="mt-4 flex gap-2">
                <Button onClick={() => navigate('/customers')} variant="outline" size="sm">
                  Add International Customer
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="new-export-sale-page">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/export-sales')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">
            New Export Sales Contract
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Create export contract (zero-rated VAT)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Contract Info */}
          <div className="kpi-card">
            <h3 className="fieldset-legend">Contract Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="form-label">Company</Label>
                <Select value={formData.company_id} onValueChange={(v) => setFormData({ ...formData, company_id: v })}>
                  <SelectTrigger className="form-input" data-testid="exp-company-select">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="form-label">Branch / Yard</Label>
                <Select value={formData.branch_id} onValueChange={(v) => setFormData({ ...formData, branch_id: v })}>
                  <SelectTrigger className="form-input" data-testid="exp-branch-select">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="form-label">Customer</Label>
                <Select value={formData.customer_id || "select"} onValueChange={(v) => handleCustomerChange(v === "select" ? "" : v)}>
                  <SelectTrigger className="form-input" data-testid="exp-customer-select">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="select" disabled>Select customer</SelectItem>
                    {customers.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="form-label">Contract Date</Label>
                <Input type="date" value={formData.contract_date} onChange={(e) => setFormData({ ...formData, contract_date: e.target.value })} className="form-input" />
              </div>
              <div>
                <Label className="form-label">Currency</Label>
                <Select value={formData.currency} onValueChange={(v) => {
                  const selectedCurrency = currencies.find(c => c.code === v);
                  setFormData({ 
                    ...formData, 
                    currency: v,
                    exchange_rate: selectedCurrency?.exchange_rate || formData.exchange_rate
                  });
                }}>
                  <SelectTrigger className="form-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.filter(c => c.is_active).map(c => (
                      <SelectItem key={c.id} value={c.code}>{c.code} - {c.name} ({c.symbol})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="form-label">Exchange Rate (to AED)</Label>
                <Input type="number" step="0.0001" value={formData.exchange_rate} onChange={(e) => setFormData({ ...formData, exchange_rate: parseFloat(e.target.value) || 0 })} className="form-input" />
              </div>
            </div>
          </div>

          {/* Shipping Info */}
          <div className="kpi-card">
            <h3 className="fieldset-legend">Shipping Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="form-label">Incoterm</Label>
                <Select value={formData.incoterm_id || "select"} onValueChange={(v) => setFormData({ ...formData, incoterm_id: v === "select" ? "" : v })}>
                  <SelectTrigger className="form-input">
                    <SelectValue placeholder="Select incoterm" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="select" disabled>Select incoterm</SelectItem>
                    {incoterms.map((i) => (<SelectItem key={i.id} value={i.id}>{i.code} - {i.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="form-label">Shipping Line</Label>
                <Input value={formData.shipping_line} onChange={(e) => setFormData({ ...formData, shipping_line: e.target.value })} className="form-input" placeholder="e.g., MSC, Maersk" />
              </div>
              <div>
                <Label className="form-label">Port of Loading (UAE)</Label>
                <Select value={formData.port_of_loading_id || "select"} onValueChange={(v) => setFormData({ ...formData, port_of_loading_id: v === "select" ? "" : v })}>
                  <SelectTrigger className="form-input">
                    <SelectValue placeholder="Select port" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="select" disabled>Select port</SelectItem>
                    {ports.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name} ({p.country})</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="form-label">Port of Destination</Label>
                <Select value={formData.port_of_destination_id || "select"} onValueChange={(v) => setFormData({ ...formData, port_of_destination_id: v === "select" ? "" : v })}>
                  <SelectTrigger className="form-input">
                    <SelectValue placeholder="Select port" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="select" disabled>Select port</SelectItem>
                    {ports.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name} ({p.country})</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="form-label">Container Number</Label>
                <Input value={formData.container_number} onChange={(e) => setFormData({ ...formData, container_number: e.target.value.toUpperCase() })} className="form-input" placeholder="e.g., MSCU1234567" />
              </div>
              <div>
                <Label className="form-label">B/L Number</Label>
                <Input value={formData.bl_number} onChange={(e) => setFormData({ ...formData, bl_number: e.target.value.toUpperCase() })} className="form-input" placeholder="Bill of Lading #" />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="kpi-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="fieldset-legend mb-0 border-0 pb-0">Line Items</h3>
              <Button onClick={addLine} variant="outline" size="sm" data-testid="exp-add-line-btn">
                <Plus className="w-4 h-4 mr-1" />Add Item
              </Button>
            </div>

            {formData.lines.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p>No items added yet</p>
                <Button onClick={addLine} variant="link" className="mt-2">Add your first item</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {formData.lines.map((line, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end p-4 bg-slate-50 dark:bg-slate-800 rounded-sm">
                    <div className="col-span-4">
                      <Label className="form-label text-xs">Item</Label>
                      <Select value={line.item_id || "select"} onValueChange={(v) => updateLine(index, 'item_id', v === "select" ? "" : v)}>
                        <SelectTrigger className="form-input h-9">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="select" disabled>Select Item</SelectItem>
                          {items.map((i) => (<SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label className="form-label text-xs">Quantity (MT)</Label>
                      <Input type="number" step="0.001" value={line.quantity} onChange={(e) => updateLine(index, 'quantity', e.target.value)} className="form-input h-9" />
                    </div>
                    <div className="col-span-2">
                      <Label className="form-label text-xs">Unit Price ({formData.currency})</Label>
                      <Input type="number" step="0.01" value={line.unit_price} onChange={(e) => updateLine(index, 'unit_price', e.target.value)} className="form-input h-9" />
                    </div>
                    <div className="col-span-1">
                      <Label className="form-label text-xs">VAT</Label>
                      <div className="h-9 flex items-center text-sm text-emerald-600">0%</div>
                    </div>
                    <div className="col-span-2">
                      <Label className="form-label text-xs">Line Total</Label>
                      <div className="h-9 flex items-center font-mono font-bold">{formatCurrency(line.line_total, formData.currency)}</div>
                    </div>
                    <div className="col-span-1">
                      <Button variant="ghost" size="sm" onClick={() => removeLine(index)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Freight */}
          <div className="kpi-card">
            <h3 className="fieldset-legend">Freight (if applicable)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="form-label">Freight Cost</Label>
                <Input type="number" step="0.01" value={formData.freight_cost} onChange={(e) => setFormData({ ...formData, freight_cost: parseFloat(e.target.value) || 0 })} className="form-input" />
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <h3 className="fieldset-legend">Notes</h3>
            <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional notes..." className="form-input" rows={3} />
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <div className="kpi-card sticky top-24">
            <h3 className="fieldset-legend">Contract Summary</h3>
            <div className="p-3 mb-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-sm border border-emerald-200 dark:border-emerald-800">
              <p className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">Zero-Rated VAT</p>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">Export sales are VAT exempt</p>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-mono">{formatCurrency(totals.subtotal, formData.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Freight</span>
                <span className="font-mono">{formatCurrency(formData.freight_cost, formData.currency)}</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3 flex justify-between">
                <span className="font-bold">Total</span>
                <span className="font-mono font-bold text-lg">{formatCurrency(totals.total, formData.currency)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>In AED (@ {formData.exchange_rate})</span>
                <span className="font-mono">{formatCurrency(totals.total * formData.exchange_rate, 'AED')}</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Button onClick={handleSubmit} disabled={saving} className="w-full btn-accent" data-testid="exp-save-btn">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Save Contract</>}
              </Button>
              <Button variant="outline" onClick={() => navigate('/export-sales')} className="w-full">Cancel</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
