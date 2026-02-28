import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { localPurchasesAPI, suppliersAPI, branchesAPI, scrapItemsAPI, vatCodesAPI, brokersAPI, companiesAPI } from '../../lib/api';
import { formatCurrency, toISODateString } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Loader2, Save, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';

export default function NewLocalPurchasePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const { user } = useAuth();
  
  const [companies, setCompanies] = useState([]);
  const [branches, setBranches] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [vatCodes, setVatCodes] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingStatus, setExistingStatus] = useState('draft');
  const [editReasonDialogOpen, setEditReasonDialogOpen] = useState(false);
  const [editReason, setEditReason] = useState('');

  const [formData, setFormData] = useState({
    company_id: '',
    branch_id: '',
    supplier_id: '',
    supplier_name: '',
    order_date: toISODateString(new Date()),
    expected_date: '',
    broker_id: '',
    broker_commission_type: 'per_mt',
    broker_commission_rate: 0,
    currency: 'AED',
    notes: '',
    lines: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [compRes, branchRes, suppRes, itemRes, vatRes, brokerRes] = await Promise.all([
        companiesAPI.list(),
        branchesAPI.list(),
        suppliersAPI.list('local'),
        scrapItemsAPI.list(),
        vatCodesAPI.list(),
        brokersAPI.list()
      ]);
      setCompanies(compRes.data || []);
      setBranches(branchRes.data || []);
      setSuppliers(suppRes.data || []);
      setItems(itemRes.data || []);
      setVatCodes(vatRes.data || []);
      setBrokers(brokerRes.data || []);

      // If edit mode, load existing PO data
      if (isEditMode) {
        const poRes = await localPurchasesAPI.get(id);
        const po = poRes.data;
        setExistingStatus(po.status || 'draft');
        setFormData({
          company_id: po.company_id || '',
          branch_id: po.branch_id || '',
          supplier_id: po.supplier_id || '',
          supplier_name: po.supplier_name || '',
          order_date: po.order_date || toISODateString(new Date()),
          expected_date: po.expected_date || '',
          broker_id: po.broker_id || '',
          broker_commission_type: po.broker_commission_type || 'per_mt',
          broker_commission_rate: po.broker_commission_rate || 0,
          currency: po.currency || 'AED',
          notes: po.notes || '',
          lines: po.lines || []
        });
      } else {
        // Set defaults for new PO
        if (compRes.data && compRes.data.length > 0) {
          setFormData(prev => ({ ...prev, company_id: compRes.data[0].id }));
        }
        if (branchRes.data && branchRes.data.length > 0) {
          setFormData(prev => ({ ...prev, branch_id: branchRes.data[0].id }));
        }
      }
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSupplierChange = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    setFormData(prev => ({
      ...prev,
      supplier_id: supplierId,
      supplier_name: supplier?.name || ''
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
        vat_rate: 5,
        vat_amount: 0,
        line_total: 0
      }]
    }));
  };

  const updateLine = (index, field, value) => {
    const newLines = [...formData.lines];
    newLines[index][field] = value;

    // Update item name if item_id changed
    if (field === 'item_id') {
      const item = items.find(i => i.id === value);
      newLines[index].item_name = item?.name || '';
    }

    // Update VAT rate if vat_code_id changed
    if (field === 'vat_code_id') {
      const vat = vatCodes.find(v => v.id === value);
      newLines[index].vat_rate = vat?.rate || 0;
    }

    // Calculate line amounts
    const qty = parseFloat(newLines[index].quantity) || 0;
    const price = parseFloat(newLines[index].unit_price) || 0;
    const vatRate = parseFloat(newLines[index].vat_rate) || 0;
    const subtotal = qty * price;
    newLines[index].vat_amount = subtotal * (vatRate / 100);
    newLines[index].line_total = subtotal + newLines[index].vat_amount;

    setFormData(prev => ({ ...prev, lines: newLines }));
  };

  const removeLine = (index) => {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index)
    }));
  };

  const calculateTotals = () => {
    const subtotal = formData.lines.reduce((sum, line) => {
      return sum + (parseFloat(line.quantity) || 0) * (parseFloat(line.unit_price) || 0);
    }, 0);
    const vatAmount = formData.lines.reduce((sum, line) => sum + (line.vat_amount || 0), 0);
    return { subtotal, vatAmount, total: subtotal + vatAmount };
  };

  const handleSubmit = async (reasonForEdit = null) => {
    if (!formData.company_id || !formData.branch_id || !formData.supplier_id) {
      toast.error('Please fill all required fields');
      return;
    }
    if (formData.lines.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }
    
    // Validate line items have required data
    const invalidLines = formData.lines.filter(line => !line.item_id || !line.quantity || line.quantity <= 0 || !line.unit_price || line.unit_price <= 0);
    if (invalidLines.length > 0) {
      toast.error('Please fill in Item, Quantity, and Unit Price for all line items');
      return;
    }

    // If editing a posted document, require edit reason
    if (isEditMode && existingStatus === 'posted' && !reasonForEdit) {
      setEditReasonDialogOpen(true);
      return;
    }

    setSaving(true);
    try {
      const totals = calculateTotals();
      const payload = {
        ...formData,
        subtotal: totals.subtotal,
        vat_amount: totals.vatAmount,
        total_amount: totals.total
      };
      
      // Add edit reason for posted documents
      if (reasonForEdit) {
        payload.edit_reason = reasonForEdit;
      }
      
      if (isEditMode) {
        await localPurchasesAPI.update(id, payload);
        toast.success('Purchase order updated');
      } else {
        await localPurchasesAPI.create(payload);
        toast.success('Purchase order created');
      }
      navigate('/local-purchases');
    } catch (error) {
      console.error('PO creation error:', error.message);
      const message = error.response?.data?.detail || `Failed to ${isEditMode ? 'update' : 'create'} purchase order`;
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditWithReason = () => {
    if (!editReason.trim()) {
      toast.error('Edit reason is required for posted documents');
      return;
    }
    setEditReasonDialogOpen(false);
    handleSubmit(editReason);
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // Check if master data is available
  const missingData = [];
  if (companies.length === 0) missingData.push('Companies');
  if (branches.length === 0) missingData.push('Branches');
  if (suppliers.length === 0) missingData.push('Suppliers (Local)');
  if (items.length === 0) missingData.push('Scrap Items');
  if (vatCodes.length === 0) missingData.push('VAT Codes');

  if (missingData.length > 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/local-purchases')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">
              New Local Purchase Order
            </h1>
          </div>
        </div>
        <div className="kpi-card border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800 dark:text-amber-300">Master Data Required</h3>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                Before creating a purchase order, you need to set up the following master data:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-amber-700 dark:text-amber-400">
                {missingData.map(item => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
              <div className="mt-4 flex gap-2">
                <Button onClick={() => navigate('/')} variant="outline" size="sm">
                  Go to Dashboard & Load Sample Data
                </Button>
                <Button onClick={() => navigate('/companies')} variant="outline" size="sm">
                  Create Company
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="new-local-purchase-page">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/local-purchases')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">
            {isEditMode ? 'Edit Local Purchase Order' : 'New Local Purchase Order'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Create a new local purchase with VAT
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Info */}
          <div className="kpi-card">
            <h3 className="fieldset-legend">Order Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="form-label">Company</Label>
                <Select
                  value={formData.company_id}
                  onValueChange={(value) => setFormData({ ...formData, company_id: value })}
                >
                  <SelectTrigger className="form-input" data-testid="lpo-company-select">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="form-label">Branch / Yard</Label>
                <Select
                  value={formData.branch_id}
                  onValueChange={(value) => setFormData({ ...formData, branch_id: value })}
                >
                  <SelectTrigger className="form-input" data-testid="lpo-branch-select">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="form-label">Supplier</Label>
                <Select
                  value={formData.supplier_id}
                  onValueChange={handleSupplierChange}
                >
                  <SelectTrigger className="form-input" data-testid="lpo-supplier-select">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="form-label">Order Date</Label>
                <Input
                  type="date"
                  value={formData.order_date}
                  onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                  className="form-input"
                  data-testid="lpo-date-input"
                />
              </div>
            </div>
          </div>

          {/* Broker Info (Optional) */}
          <div className="kpi-card">
            <h3 className="fieldset-legend">Broker (Optional)</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="form-label">Broker</Label>
                <Select
                  value={formData.broker_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, broker_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger className="form-input" data-testid="lpo-broker-select">
                    <SelectValue placeholder="Select broker" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {brokers.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="form-label">Commission Type</Label>
                <Select
                  value={formData.broker_commission_type}
                  onValueChange={(value) => setFormData({ ...formData, broker_commission_type: value })}
                >
                  <SelectTrigger className="form-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_mt">Per MT</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="form-label">Commission Rate</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.broker_commission_rate}
                  onChange={(e) => setFormData({ ...formData, broker_commission_rate: parseFloat(e.target.value) || 0 })}
                  className="form-input"
                  data-testid="lpo-commission-input"
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="kpi-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="fieldset-legend mb-0 border-0 pb-0">Line Items</h3>
              <Button onClick={addLine} variant="outline" size="sm" data-testid="lpo-add-line-btn">
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>

            {formData.lines.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p>No items added yet</p>
                <Button onClick={addLine} variant="link" className="mt-2">
                  Add your first item
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {formData.lines.map((line, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end p-4 bg-slate-50 dark:bg-slate-800 rounded-sm">
                    <div className="col-span-3">
                      <Label className="form-label text-xs">Item</Label>
                      <Select
                        value={line.item_id || ""}
                        onValueChange={(value) => updateLine(index, 'item_id', value)}
                      >
                        <SelectTrigger className="form-input h-9" data-testid={`lpo-line-item-${index}`}>
                          <SelectValue placeholder="Select Item" />
                        </SelectTrigger>
                        <SelectContent>
                          {items.map((i) => (
                            <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label className="form-label text-xs">Quantity (MT)</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={line.quantity}
                        onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                        className="form-input h-9"
                        data-testid={`lpo-line-qty-${index}`}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="form-label text-xs">Unit Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={line.unit_price}
                        onChange={(e) => updateLine(index, 'unit_price', e.target.value)}
                        className="form-input h-9"
                        data-testid={`lpo-line-price-${index}`}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="form-label text-xs">VAT Code</Label>
                      <Select
                        value={line.vat_code_id || "select"}
                        onValueChange={(value) => updateLine(index, 'vat_code_id', value === "select" ? "" : value)}
                      >
                        <SelectTrigger className="form-input h-9">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="select" disabled>Select VAT</SelectItem>
                          {vatCodes.map((v) => (
                            <SelectItem key={v.id} value={v.id}>{v.name} ({v.rate}%)</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label className="form-label text-xs">Line Total</Label>
                      <div className="h-9 flex items-center font-mono font-bold">
                        {formatCurrency(line.line_total)}
                      </div>
                    </div>
                    <div className="col-span-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLine(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="kpi-card">
            <h3 className="fieldset-legend">Notes</h3>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              className="form-input"
              rows={3}
            />
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-4">
          <div className="kpi-card sticky top-24">
            <h3 className="fieldset-legend">Order Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-mono">{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">VAT (5%)</span>
                <span className="font-mono">{formatCurrency(totals.vatAmount)}</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3 flex justify-between">
                <span className="font-bold">Total</span>
                <span className="font-mono font-bold text-lg">{formatCurrency(totals.total)}</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Button
                onClick={handleSubmit}
                disabled={saving}
                className="w-full btn-accent"
                data-testid="lpo-save-btn"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {isEditMode ? 'Update Purchase Order' : 'Save Purchase Order'}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/local-purchases')}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Reason Dialog for Posted Documents */}
      <Dialog open={editReasonDialogOpen} onOpenChange={setEditReasonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Posted Document</DialogTitle>
            <DialogDescription>
              This document has already been posted. Please provide a reason for the modification. This will be recorded in the edit history.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="edit-reason" className="text-sm font-medium">Edit Reason *</Label>
            <Textarea
              id="edit-reason"
              placeholder="Enter reason for editing this posted document..."
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditReasonDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditWithReason} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Update with Reason
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
