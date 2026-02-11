import { useState, useEffect } from 'react';
import { journalEntriesAPI } from '../../lib/api';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { FileText, Loader2 } from 'lucide-react';

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => { loadData(); }, [typeFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = typeFilter ? { reference_type: typeFilter } : {};
      const res = await journalEntriesAPI.list(params);
      setEntries(res.data);
    } catch (error) { toast.error('Failed to load journal entries'); } finally { setLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="journal-entries-page">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-manrope font-bold text-slate-900 dark:text-white">Journal Entries</h1><p className="text-slate-600 dark:text-slate-400 mt-1">Automatic accounting postings</p></div>
      </div>
      <div className="kpi-card">
        <div className="flex gap-4">
          <div className="w-48">
            <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
              <SelectTrigger data-testid="je-type-filter"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="local_purchase">Local Purchase</SelectItem>
                <SelectItem value="intl_purchase">Intl Purchase</SelectItem>
                <SelectItem value="local_sale">Local Sale</SelectItem>
                <SelectItem value="export_sale">Export Sale</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="kpi-card p-0 overflow-hidden">
        <table className="erp-table" data-testid="journal-entries-table">
          <thead><tr><th>Entry #</th><th>Date</th><th>Reference</th><th>Description</th><th className="text-right">Debit</th><th className="text-right">Credit</th></tr></thead>
          <tbody>
            {entries.length === 0 ? (<tr><td colSpan={6} className="text-center py-12 text-slate-400"><FileText className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No journal entries yet</p></td></tr>) : (
              entries.map((e) => (
                <tr key={e.id} data-testid={`je-row-${e.id}`}>
                  <td className="font-mono font-medium">{e.entry_number}</td>
                  <td>{e.entry_date}</td>
                  <td><span className="font-mono text-sm">{e.reference_number}</span><Badge className="ml-2 status-draft text-xs">{e.reference_type?.replace('_', ' ')}</Badge></td>
                  <td className="max-w-xs truncate">{e.description}</td>
                  <td className="text-right font-mono">{formatCurrency(e.total_debit)}</td>
                  <td className="text-right font-mono">{formatCurrency(e.total_credit)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
