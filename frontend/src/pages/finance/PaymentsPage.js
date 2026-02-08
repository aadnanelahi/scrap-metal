import { useState, useEffect } from 'react';
import { paymentsAPI, customersAPI, suppliersAPI, companiesAPI } from '../../lib/api';
import { formatCurrency, formatDate, toISODateString, getStatusColor, printDocument, generatePaymentReceiptHTML } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Printer, Loader2, Check, Wallet, CreditCard, Building2, Users } from 'lucide-react';

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    type: 'received',
    party_type: 'customer',
    party_id: '',
    party_name: '',
    payment_date: toISODateString(new Date()),
    amount: 0,
    currency: 'AED',
    payment_method: 'cash',
    reference_number: '',
    document_number: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [paymentsRes, custRes, suppRes, companiesRes] = await Promise.all([
        paymentsAPI.list(),
        customersAPI.list(),
        suppliersAPI.list(),
        companiesAPI.list()
      ]);
      setPayments(paymentsRes.data || []);
      setCustomers(custRes.data || []);
      setSuppliers(suppRes.data || []);
      const companies = companiesRes.data || [];
      setCompany(companies.find(c => c.is_active) || companies[0] || null);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handlePartyChange = (partyId) => {
    const partyList = formData.party_type === 'customer' ? customers : suppliers;
    const party = partyList.find(p => p.id === partyId);
    setFormData(prev => ({
      ...prev,
      party_id: partyId,
      party_name: party?.name || ''
    }));
  };

  const handleTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      type,
      party_type: type === 'received' ? 'customer' : 'supplier',
      party_id: '',
      party_name: ''
    }));
  };

  const handleSubmit = async () => {
    if (!formData.party_id || !formData.amount) {
      toast.error('Please fill all required fields');
      return;
    }

    setSaving(true);
    try {
      await paymentsAPI.create(formData);
      toast.success('Payment created');
      setShowDialog(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create payment');
    } finally {
      setSaving(false);
    }
  };

  const handlePost = async (id) => {
    try {
      await paymentsAPI.post(id);
      toast.success('Payment posted');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to post');
    }
  };

  const handlePrint = (payment) => {
    const html = generatePaymentReceiptHTML(payment, company);
    printDocument(html, `Receipt-${payment.receipt_number}`);
  };

  const resetForm = () => {
    setFormData({
      type: 'received',
      party_type: 'customer',
      party_id: '',
      party_name: '',
      payment_date: toISODateString(new Date()),
      amount: 0,
      currency: 'AED',
      payment_method: 'cash',
      reference_number: '',
      document_number: '',
      notes: ''
    });
  };

  const partyList = formData.party_type === 'customer' ? customers : suppliers;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="payments-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">Payments</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Receipts & Payment Vouchers</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="btn-accent gap-2" data-testid="new-payment-btn">
              <Plus className="w-4 h-4" />
              New Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="form-label">Payment Type</Label>
                  <Select value={formData.type} onValueChange={handleTypeChange}>
                    <SelectTrigger className="form-input" data-testid="payment-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="received">
                        <span className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-emerald-500" />
                          Receipt (From Customer)
                        </span>
                      </SelectItem>
                      <SelectItem value="paid">
                        <span className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-blue-500" />
                          Payment (To Supplier)
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="form-label">{formData.party_type === 'customer' ? 'Customer' : 'Supplier'}</Label>
                  <Select value={formData.party_id || "select"} onValueChange={(v) => handlePartyChange(v === "select" ? "" : v)}>
                    <SelectTrigger className="form-input" data-testid="payment-party-select">
                      <SelectValue placeholder={`Select ${formData.party_type}`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="select" disabled>Select {formData.party_type}</SelectItem>
                      {partyList.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="form-label">Payment Date</Label>
                  <Input
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <Label className="form-label">Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="form-input"
                    data-testid="payment-amount-input"
                  />
                </div>
                <div>
                  <Label className="form-label">Payment Method</Label>
                  <Select value={formData.payment_method} onValueChange={(v) => setFormData({ ...formData, payment_method: v })}>
                    <SelectTrigger className="form-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="form-label">Reference Number</Label>
                  <Input
                    value={formData.reference_number}
                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                    className="form-input"
                    placeholder="Cheque/Transfer #"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="form-label">Against Document</Label>
                  <Input
                    value={formData.document_number}
                    onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                    className="form-input"
                    placeholder="Invoice/PO Number"
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
              <Button onClick={handleSubmit} disabled={saving} className="btn-accent" data-testid="save-payment-btn">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Payment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="kpi-card">
          <p className="text-xs font-bold uppercase text-slate-500">Total Receipts</p>
          <p className="text-2xl font-mono font-bold text-emerald-600">
            {formatCurrency(payments.filter(p => p.type === 'received' && p.status === 'posted').reduce((sum, p) => sum + (p.amount || 0), 0))}
          </p>
        </div>
        <div className="kpi-card">
          <p className="text-xs font-bold uppercase text-slate-500">Total Payments</p>
          <p className="text-2xl font-mono font-bold text-blue-600">
            {formatCurrency(payments.filter(p => p.type === 'paid' && p.status === 'posted').reduce((sum, p) => sum + (p.amount || 0), 0))}
          </p>
        </div>
        <div className="kpi-card">
          <p className="text-xs font-bold uppercase text-slate-500">Pending</p>
          <p className="text-2xl font-mono font-bold">
            {payments.filter(p => p.status !== 'posted').length}
          </p>
        </div>
      </div>

      {/* Payments Table */}
      <div className="kpi-card p-0 overflow-hidden">
        <table className="erp-table" data-testid="payments-table">
          <thead>
            <tr>
              <th>Receipt #</th>
              <th>Type</th>
              <th>Date</th>
              <th>Party</th>
              <th>Method</th>
              <th className="text-right">Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-400">
                  <Wallet className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No payments yet</p>
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="font-mono font-medium">{payment.receipt_number}</td>
                  <td>
                    <Badge variant="outline" className={payment.type === 'received' ? 'text-emerald-600 border-emerald-300' : 'text-blue-600 border-blue-300'}>
                      {payment.type === 'received' ? 'Receipt' : 'Payment'}
                    </Badge>
                  </td>
                  <td>{formatDate(payment.payment_date)}</td>
                  <td className="font-medium">{payment.party_name}</td>
                  <td className="capitalize">{payment.payment_method?.replace('_', ' ')}</td>
                  <td className="text-right font-mono font-bold">{formatCurrency(payment.amount, payment.currency)}</td>
                  <td>
                    <Badge className={`${getStatusColor(payment.status)} border rounded-full text-xs`}>
                      {payment.status}
                    </Badge>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handlePrint(payment)}
                        data-testid={`print-payment-btn-${payment.id}`}
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                      {payment.status !== 'posted' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePost(payment.id)}
                          data-testid={`post-payment-btn-${payment.id}`}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Post
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
    </div>
  );
}
