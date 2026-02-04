import { useState, useEffect } from 'react';
import { reportsAPI } from '../../lib/api';
import { formatCurrency, formatDate, toISODateString, getStatusColor } from '../../lib/utils';
import { exportReport } from '../../lib/export';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Loader2, Download, FileText, FileSpreadsheet } from 'lucide-react';

export default function SalesRegisterPage() {
  const [localData, setLocalData] = useState(null);
  const [exportData, setExportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('local');
  const [filters, setFilters] = useState({
    start_date: toISODateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    end_date: toISODateString(new Date())
  });

  const loadReports = async () => {
    setLoading(true);
    try {
      const [localRes, exportRes] = await Promise.all([
        reportsAPI.salesRegister({ ...filters, type: 'local' }),
        reportsAPI.salesRegister({ ...filters, type: 'export' })
      ]);
      setLocalData(localRes.data);
      setExportData(exportRes.data);
    } catch (error) { 
      toast.error('Failed to load reports'); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { loadReports(); }, []);

  const handleExport = (format) => {
    const isLocal = activeTab === 'local';
    const data = isLocal ? localData : exportData;
    
    if (!data?.sales?.length) {
      toast.error('No data to export');
      return;
    }

    const columns = isLocal ? [
      { key: 'order_number', header: 'SO #', width: 15 },
      { key: 'order_date', header: 'Date', format: 'date', width: 12 },
      { key: 'customer_name', header: 'Customer', width: 25 },
      { key: 'subtotal', header: 'Subtotal', format: 'currency', align: 'right', width: 15 },
      { key: 'vat_amount', header: 'VAT', format: 'currency', align: 'right', width: 12 },
      { key: 'total_amount', header: 'Total', format: 'currency', align: 'right', width: 15 },
      { key: 'status', header: 'Status', width: 12 }
    ] : [
      { key: 'contract_number', header: 'Contract #', width: 15 },
      { key: 'contract_date', header: 'Date', format: 'date', width: 12 },
      { key: 'customer_name', header: 'Customer', width: 25 },
      { key: 'currency', header: 'Currency', width: 10 },
      { key: 'total_amount', header: 'Total', format: 'currency', align: 'right', width: 15 },
      { key: 'status', header: 'Status', width: 12 }
    ];

    const title = isLocal ? 'Local Sales Register' : 'Export Sales Register';
    const totals = isLocal ? {
      'Total Amount': formatCurrency(data.summary?.total_amount || 0),
      'Total VAT': formatCurrency(data.summary?.total_vat || 0)
    } : {
      'Total Amount': formatCurrency(data.summary?.total_amount || 0)
    };

    exportReport(format, title, columns, data.sales, {
      dateRange: `${filters.start_date} to ${filters.end_date}`,
      totals
    });
    toast.success(`Exported to ${format.toUpperCase()}`);
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="sales-register-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">Sales Register</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Local & Export sales report</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2" data-testid="export-sales-btn">
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

      <div className="kpi-card">
        <div className="flex gap-4 items-end">
          <div>
            <Label className="form-label">Start Date</Label>
            <Input type="date" value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} className="form-input w-44" />
          </div>
          <div>
            <Label className="form-label">End Date</Label>
            <Input type="date" value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} className="form-input w-44" />
          </div>
          <Button onClick={loadReports} disabled={loading} className="btn-accent">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="local" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="local">Local Sales</TabsTrigger>
          <TabsTrigger value="export">Export Sales</TabsTrigger>
        </TabsList>
        <TabsContent value="local" className="mt-4">
          {localData && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="kpi-card"><p className="text-xs font-bold uppercase text-slate-500">Count</p><p className="text-2xl font-mono font-bold">{localData.summary?.count || 0}</p></div>
                <div className="kpi-card"><p className="text-xs font-bold uppercase text-slate-500">Total Amount</p><p className="text-2xl font-mono font-bold">{formatCurrency(localData.summary?.total_amount || 0)}</p></div>
                <div className="kpi-card"><p className="text-xs font-bold uppercase text-slate-500">Total VAT</p><p className="text-2xl font-mono font-bold">{formatCurrency(localData.summary?.total_vat || 0)}</p></div>
              </div>
              <div className="kpi-card p-0 overflow-hidden">
                <table className="erp-table">
                  <thead><tr><th>SO #</th><th>Date</th><th>Customer</th><th className="text-right">Subtotal</th><th className="text-right">VAT</th><th className="text-right">Total</th><th>Status</th></tr></thead>
                  <tbody>
                    {(localData.sales || []).map((s) => (
                      <tr key={s.id}>
                        <td className="font-mono">{s.order_number}</td>
                        <td>{formatDate(s.order_date)}</td>
                        <td>{s.customer_name}</td>
                        <td className="text-right font-mono">{formatCurrency(s.subtotal)}</td>
                        <td className="text-right font-mono">{formatCurrency(s.vat_amount)}</td>
                        <td className="text-right font-mono font-bold">{formatCurrency(s.total_amount)}</td>
                        <td><Badge className={getStatusColor(s.status)}>{s.status}</Badge></td>
                      </tr>
                    ))}
                    {(localData.sales || []).length === 0 && <tr><td colSpan={7} className="text-center py-8 text-slate-400">No data</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
        <TabsContent value="export" className="mt-4">
          {exportData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="kpi-card"><p className="text-xs font-bold uppercase text-slate-500">Count</p><p className="text-2xl font-mono font-bold">{exportData.summary?.count || 0}</p></div>
                <div className="kpi-card"><p className="text-xs font-bold uppercase text-slate-500">Total Amount</p><p className="text-2xl font-mono font-bold">{formatCurrency(exportData.summary?.total_amount || 0)}</p></div>
              </div>
              <div className="kpi-card p-0 overflow-hidden">
                <table className="erp-table">
                  <thead><tr><th>Contract #</th><th>Date</th><th>Customer</th><th>Currency</th><th className="text-right">Total</th><th>Status</th></tr></thead>
                  <tbody>
                    {(exportData.sales || []).map((s) => (
                      <tr key={s.id}>
                        <td className="font-mono">{s.contract_number}</td>
                        <td>{formatDate(s.contract_date)}</td>
                        <td>{s.customer_name}</td>
                        <td>{s.currency}</td>
                        <td className="text-right font-mono font-bold">{formatCurrency(s.total_amount, s.currency)}</td>
                        <td><Badge className={getStatusColor(s.status)}>{s.status}</Badge></td>
                      </tr>
                    ))}
                    {(exportData.sales || []).length === 0 && <tr><td colSpan={6} className="text-center py-8 text-slate-400">No data</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
