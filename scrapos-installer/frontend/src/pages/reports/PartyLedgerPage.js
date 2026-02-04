import { useState, useEffect } from 'react';
import { customersAPI, suppliersAPI } from '../../lib/api';
import { formatCurrency, formatDate, toISODateString } from '../../lib/utils';
import { exportReport } from '../../lib/export';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { Users, Building2, Loader2, Download, FileText, FileSpreadsheet, TrendingUp, TrendingDown } from 'lucide-react';
import api from '../../lib/api';

export default function PartyLedgerPage() {
  const [activeTab, setActiveTab] = useState('customer');
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedParty, setSelectedParty] = useState('');
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    start_date: toISODateString(new Date(new Date().getFullYear(), 0, 1)),
    end_date: toISODateString(new Date())
  });

  useEffect(() => {
    loadParties();
  }, []);

  useEffect(() => {
    if (selectedParty) loadLedger();
  }, [selectedParty, activeTab]);

  const loadParties = async () => {
    try {
      const [custRes, suppRes] = await Promise.all([
        customersAPI.list(),
        suppliersAPI.list()
      ]);
      setCustomers(custRes.data || []);
      setSuppliers(suppRes.data || []);
    } catch (error) {
      toast.error('Failed to load parties');
    }
  };

  const loadLedger = async () => {
    if (!selectedParty) return;
    setLoading(true);
    try {
      const endpoint = activeTab === 'customer' 
        ? `/reports/customer-ledger/${selectedParty}`
        : `/reports/supplier-ledger/${selectedParty}`;
      const res = await api.get(endpoint, { params: filters });
      setLedger(res.data);
    } catch (error) {
      toast.error('Failed to load ledger');
      setLedger(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format) => {
    if (!ledger?.entries?.length) {
      toast.error('No data to export');
      return;
    }

    const columns = [
      { key: 'date', header: 'Date', format: 'date', width: 12 },
      { key: 'type', header: 'Type', width: 15 },
      { key: 'reference', header: 'Reference', width: 18 },
      { key: 'description', header: 'Description', width: 30 },
      { key: 'debit', header: 'Debit', format: 'currency', align: 'right', width: 15 },
      { key: 'credit', header: 'Credit', format: 'currency', align: 'right', width: 15 },
      { key: 'balance', header: 'Balance', format: 'currency', align: 'right', width: 15 }
    ];

    const partyList = activeTab === 'customer' ? customers : suppliers;
    const partyName = partyList.find(p => p.id === selectedParty)?.name || 'Unknown';
    const title = `${activeTab === 'customer' ? 'Customer' : 'Supplier'} Ledger - ${partyName}`;

    exportReport(format, title, columns, ledger.entries, {
      dateRange: `${filters.start_date} to ${filters.end_date}`,
      totals: {
        'Opening Balance': formatCurrency(ledger.opening_balance || 0),
        'Total Debit': formatCurrency(ledger.total_debit || 0),
        'Total Credit': formatCurrency(ledger.total_credit || 0),
        'Closing Balance': formatCurrency(ledger.closing_balance || 0)
      }
    });
    toast.success(`Exported to ${format.toUpperCase()}`);
  };

  const partyList = activeTab === 'customer' ? customers : suppliers;
  const partyName = selectedParty ? partyList.find(p => p.id === selectedParty)?.name : '';

  return (
    <div className="space-y-6 animate-fade-in" data-testid="party-ledger-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">Party Ledger</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Customer & Supplier account statements</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2" disabled={!ledger?.entries?.length} data-testid="export-ledger-btn">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleExport('pdf')}>
              <FileText className="w-4 h-4 mr-2" />
              Export to PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('excel')}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export to Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs defaultValue="customer" value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedParty(''); setLedger(null); }}>
        <TabsList>
          <TabsTrigger value="customer" className="gap-2">
            <Users className="w-4 h-4" />
            Customer Ledger
          </TabsTrigger>
          <TabsTrigger value="supplier" className="gap-2">
            <Building2 className="w-4 h-4" />
            Supplier Ledger
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="kpi-card">
            <div className="flex gap-4 items-end flex-wrap">
              <div className="w-64">
                <Label className="form-label">{activeTab === 'customer' ? 'Customer' : 'Supplier'}</Label>
                <Select value={selectedParty || "select"} onValueChange={(v) => setSelectedParty(v === "select" ? "" : v)}>
                  <SelectTrigger data-testid="party-select">
                    <SelectValue placeholder={`Select ${activeTab}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="select" disabled>Select {activeTab}</SelectItem>
                    {partyList.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="form-label">Start Date</Label>
                <Input type="date" value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} className="form-input w-44" />
              </div>
              <div>
                <Label className="form-label">End Date</Label>
                <Input type="date" value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} className="form-input w-44" />
              </div>
              <Button onClick={loadLedger} disabled={!selectedParty || loading} className="btn-accent">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate'}
              </Button>
            </div>
          </div>

          {ledger && (
            <>
              <div className="grid grid-cols-4 gap-4">
                <div className="kpi-card">
                  <p className="text-xs font-bold uppercase text-slate-500">Opening Balance</p>
                  <p className="text-2xl font-mono font-bold">{formatCurrency(ledger.opening_balance || 0)}</p>
                </div>
                <div className="kpi-card">
                  <p className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-500" /> Total Debit
                  </p>
                  <p className="text-2xl font-mono font-bold text-emerald-600">{formatCurrency(ledger.total_debit || 0)}</p>
                </div>
                <div className="kpi-card">
                  <p className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-blue-500" /> Total Credit
                  </p>
                  <p className="text-2xl font-mono font-bold text-blue-600">{formatCurrency(ledger.total_credit || 0)}</p>
                </div>
                <div className="kpi-card bg-slate-900 text-white">
                  <p className="text-xs font-bold uppercase text-slate-400">Closing Balance</p>
                  <p className="text-2xl font-mono font-bold">{formatCurrency(ledger.closing_balance || 0)}</p>
                  <p className="text-xs mt-1 text-slate-400">
                    {(ledger.closing_balance || 0) > 0 
                      ? (activeTab === 'customer' ? 'Receivable' : 'Payable') 
                      : (activeTab === 'customer' ? 'Advance received' : 'Advance paid')}
                  </p>
                </div>
              </div>

              <div className="kpi-card p-0 overflow-hidden">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Reference</th>
                      <th>Description</th>
                      <th className="text-right">Debit</th>
                      <th className="text-right">Credit</th>
                      <th className="text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ledger.entries || []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-slate-400">
                          <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No transactions found</p>
                        </td>
                      </tr>
                    ) : (
                      ledger.entries.map((entry, idx) => (
                        <tr key={idx}>
                          <td>{formatDate(entry.date)}</td>
                          <td>
                            <Badge variant="outline" className="text-xs">
                              {entry.type}
                            </Badge>
                          </td>
                          <td className="font-mono">{entry.reference}</td>
                          <td className="text-slate-600 dark:text-slate-400">{entry.description}</td>
                          <td className="text-right font-mono text-emerald-600">
                            {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                          </td>
                          <td className="text-right font-mono text-blue-600">
                            {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                          </td>
                          <td className="text-right font-mono font-bold">{formatCurrency(entry.balance)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {!selectedParty && (
            <div className="kpi-card text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500">Select a {activeTab} to view their ledger</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
