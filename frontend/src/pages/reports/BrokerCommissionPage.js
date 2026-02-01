import { useState, useEffect } from 'react';
import { reportsAPI, brokersAPI } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { exportReport } from '../../lib/export';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Users, Loader2, Download, FileText, FileSpreadsheet } from 'lucide-react';

export default function BrokerCommissionPage() {
  const [data, setData] = useState(null);
  const [brokers, setBrokers] = useState([]);
  const [brokerId, setBrokerId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadInitial(); }, []);
  useEffect(() => { loadReport(); }, [brokerId]);

  const loadInitial = async () => {
    try { 
      const res = await brokersAPI.list(); 
      setBrokers(res.data || []); 
    } catch (error) { 
      toast.error('Failed to load brokers'); 
    }
  };

  const loadReport = async () => {
    setLoading(true);
    try {
      const params = brokerId ? { broker_id: brokerId } : {};
      const res = await reportsAPI.brokerCommission(params);
      setData(res.data);
    } catch (error) { 
      toast.error('Failed to load report'); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleExport = (format) => {
    if (!data?.commissions?.length) {
      toast.error('No data to export');
      return;
    }

    const columns = [
      { key: 'broker_name', header: 'Broker', width: 20 },
      { key: 'type', header: 'Type', width: 15 },
      { key: 'reference', header: 'Reference', width: 18 },
      { key: 'date', header: 'Date', format: 'date', width: 12 },
      { key: 'amount', header: 'Commission', format: 'currency', align: 'right', width: 15 }
    ];

    const brokerName = brokerId ? brokers.find(b => b.id === brokerId)?.name : 'All Brokers';

    exportReport(format, 'Broker Commission Report', columns, data.commissions, {
      companyName: `ScrapOS Trading LLC - ${brokerName}`,
      totals: {
        'Total Commission': formatCurrency(data.total || 0)
      }
    });
    toast.success(`Exported to ${format.toUpperCase()}`);
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="broker-commission-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">Broker Commission Report</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Commission payable to brokers</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2" data-testid="export-broker-btn">
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
          <div className="w-64">
            <Select value={brokerId || "all"} onValueChange={(v) => setBrokerId(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="All Brokers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brokers</SelectItem>
                {brokers.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-2 gap-4">
          <div className="kpi-card"><p className="text-xs font-bold uppercase text-slate-500">Total Transactions</p><p className="text-2xl font-mono font-bold">{(data.commissions || []).length}</p></div>
          <div className="kpi-card bg-orange-50 dark:bg-orange-900/20"><p className="text-xs font-bold uppercase text-orange-600">Total Commission Payable</p><p className="text-2xl font-mono font-bold text-orange-600">{formatCurrency(data.total || 0)}</p></div>
        </div>
      )}

      <div className="kpi-card p-0 overflow-hidden">
        <table className="erp-table" data-testid="broker-commission-table">
          <thead><tr><th>Broker</th><th>Type</th><th>Reference</th><th>Date</th><th className="text-right">Commission</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-orange-500" /></td></tr>
            ) : (data?.commissions || []).length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-slate-400"><Users className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No commission data</p></td></tr>
            ) : (
              (data?.commissions || []).map((c, i) => (
                <tr key={i}>
                  <td className="font-medium">{c.broker_name}</td>
                  <td>{c.type}</td>
                  <td className="font-mono">{c.reference}</td>
                  <td>{formatDate(c.date)}</td>
                  <td className="text-right font-mono font-bold">{formatCurrency(c.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
