import { useState, useEffect } from 'react';
import { paymentsAPI, customersAPI, suppliersAPI, companiesAPI, currenciesAPI } from '../../lib/api';
import { formatCurrency, formatDate, toISODateString, getStatusColor, printDocument, generatePaymentReceiptHTML } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Printer, Loader2, Check, Wallet, CreditCard, Building2, Users, TrendingUp, TrendingDown, ArrowRightLeft } from 'lucide-react';

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [currencies, setCurrencies] = useState([]);
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
    notes: '',
    // Exchange gain/loss fields
    original_currency: 'AED',
    original_amount: 0,
    original_exchange_rate: 1,
    payment_exchange_rate: 1,
    has_exchange_difference: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [paymentsRes, custRes, suppRes, companiesRes, currenciesRes] = await Promise.all([
        paymentsAPI.list(),
        customersAPI.list(),
        suppliersAPI.list(),
        companiesAPI.list(),
        currenciesAPI.list()
      ]);
      setPayments(paymentsRes.data || []);
      setCustomers(custRes.data || []);
      setSuppliers(suppRes.data || []);
      setCurrencies(currenciesRes.data || []);
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
      notes: '',
      original_currency: 'AED',
      original_amount: 0,
      original_exchange_rate: 1,
      payment_exchange_rate: 1,
      has_exchange_difference: false
    });
  };

  // Calculate exchange difference
  const calculateExchangeDifference = () => {
    if (!formData.has_exchange_difference || formData.original_currency === 'AED') {
      return { amount: 0, type: null };
    }
    
    // Original invoice amount in AED (at time of invoice)
    const originalAed = formData.original_amount * formData.original_exchange_rate;
    // Payment amount in AED (at time of payment)
    const paymentAed = formData.original_amount * formData.payment_exchange_rate;
    
    const difference = paymentAed - originalAed;
    
    if (Math.abs(difference) < 0.01) {
      return { amount: 0, type: null };
    }
    
    // For Receipts (from customer): 
    //   - Customer pays MORE AED than originally recorded = Exchange GAIN (positive)
    //   - Customer pays LESS AED than originally recorded = Exchange LOSS (negative)
    // For Payments (to supplier):
    //   - We pay LESS AED than originally recorded = Exchange GAIN
    //   - We pay MORE AED than originally recorded = Exchange LOSS
    
    if (formData.type === 'received') {
      // Receipt from customer
      return {
        amount: Math.abs(difference),
        type: difference > 0 ? 'gain' : 'loss'
      };
    } else {
      // Payment to supplier (reversed logic)
      return {
        amount: Math.abs(difference),
        type: difference < 0 ? 'gain' : 'loss'
      };
    }
  };

  const exchangeDiff = calculateExchangeDifference();

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
                
                {/* Exchange Gain/Loss Section */}
                <div className="col-span-2 border-t pt-4 mt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="has_exchange_difference"
                      checked={formData.has_exchange_difference}
                      onChange={(e) => setFormData({ ...formData, has_exchange_difference: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300"
                      data-testid="exchange-diff-checkbox"
                    />
                    <Label htmlFor="has_exchange_difference" className="flex items-center gap-2 cursor-pointer">
                      <ArrowRightLeft className="w-4 h-4 text-amber-500" />
                      Foreign Currency Payment (Exchange Gain/Loss)
                    </Label>
                  </div>
                  
                  {formData.has_exchange_difference && (
                    <div className="space-y-4 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="form-label">Original Currency</Label>
                          <Select 
                            value={formData.original_currency} 
                            onValueChange={(v) => setFormData({ ...formData, original_currency: v })}
                          >
                            <SelectTrigger className="form-input" data-testid="original-currency-select">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                              {currencies.filter(c => c.code !== 'AED').map((c) => (
                                <SelectItem key={c.code} value={c.code}>{c.code} - {c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="form-label">Invoice Amount ({formData.original_currency})</Label>
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
                          <Label className="form-label">Invoice Exchange Rate</Label>
                          <Input
                            type="number"
                            step="0.0001"
                            value={formData.original_exchange_rate}
                            onChange={(e) => setFormData({ ...formData, original_exchange_rate: parseFloat(e.target.value) || 1 })}
                            className="form-input"
                            placeholder="Rate at invoice date"
                            data-testid="original-rate-input"
                          />
                          <p className="text-xs text-slate-500 mt-1">
                            = {formatCurrency(formData.original_amount * formData.original_exchange_rate)} at invoice
                          </p>
                        </div>
                        <div>
                          <Label className="form-label">Payment Exchange Rate</Label>
                          <Input
                            type="number"
                            step="0.0001"
                            value={formData.payment_exchange_rate}
                            onChange={(e) => setFormData({ ...formData, payment_exchange_rate: parseFloat(e.target.value) || 1 })}
                            className="form-input"
                            placeholder="Today's rate"
                            data-testid="payment-rate-input"
                          />
                          <p className="text-xs text-slate-500 mt-1">
                            = {formatCurrency(formData.original_amount * formData.payment_exchange_rate)} at payment
                          </p>
                        </div>
                      </div>
                      
                      {/* Exchange Difference Display */}
                      {exchangeDiff.type && (
                        <div className={`flex items-center justify-between p-3 rounded-lg ${
                          exchangeDiff.type === 'gain' 
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300' 
                            : 'bg-red-100 dark:bg-red-900/30 border border-red-300'
                        }`}>
                          <div className="flex items-center gap-2">
                            {exchangeDiff.type === 'gain' ? (
                              <TrendingUp className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <TrendingDown className="w-5 h-5 text-red-600" />
                            )}
                            <span className="font-medium">
                              Exchange {exchangeDiff.type === 'gain' ? 'Gain' : 'Loss'}
                            </span>
                          </div>
                          <span className={`font-mono font-bold ${
                            exchangeDiff.type === 'gain' ? 'text-emerald-700' : 'text-red-700'
                          }`}>
                            {formatCurrency(exchangeDiff.amount)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
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
              <th>Exchange Diff</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-slate-400">
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
                  <td className="text-center">
                    {payment.exchange_difference_type ? (
                      <div className="flex items-center justify-center gap-1">
                        {payment.exchange_difference_type === 'gain' ? (
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        <span className={`font-mono text-sm ${
                          payment.exchange_difference_type === 'gain' ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(payment.exchange_difference_amount || 0)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
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
