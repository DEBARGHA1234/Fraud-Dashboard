import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useListTransactions, useDeleteTransaction, getListTransactionsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import type { FraudTransaction } from '@workspace/api-client-react';

const STATUS_COLORS: Record<string, string> = {
  APPROVED: '#4CAF7D',
  REVIEW: '#C46A1A',
  BLOCKED: '#E53E3E',
};

const AML_COLORS: Record<string, string> = {
  PASSED: '#4CAF7D',
  FLAGGED: '#E53E3E',
};

const PAGE_SIZE = 15;

export function TransactionHistory() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [offset, setOffset] = useState(0);
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    status: '',
    category: '',
    minScore: '',
    maxScore: '',
  });

  const queryClient = useQueryClient();

  const queryParams = {
    search: appliedFilters.search || undefined,
    status: appliedFilters.status || undefined,
    category: appliedFilters.category || undefined,
    minScore: appliedFilters.minScore ? parseInt(appliedFilters.minScore) : undefined,
    maxScore: appliedFilters.maxScore ? parseInt(appliedFilters.maxScore) : undefined,
    limit: PAGE_SIZE,
    offset,
  };

  const { data, isLoading } = useListTransactions(queryParams);
  const deleteMutation = useDeleteTransaction();

  const transactions = data?.transactions ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  const handleApplyFilters = useCallback(() => {
    setOffset(0);
    setAppliedFilters({
      search,
      status: statusFilter === 'ALL' ? '' : statusFilter,
      category: categoryFilter === 'ALL' ? '' : categoryFilter,
      minScore,
      maxScore,
    });
  }, [search, statusFilter, categoryFilter, minScore, maxScore]);

  const handleClearFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setMinScore('');
    setMaxScore('');
    setOffset(0);
    setAppliedFilters({ search: '', status: '', category: '', minScore: '', maxScore: '' });
  }, []);

  const handleDelete = useCallback((id: number) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
      }
    });
  }, [deleteMutation, queryClient]);

  const handleExport = useCallback(() => {
    const params = new URLSearchParams();
    if (appliedFilters.search) params.set('search', appliedFilters.search);
    if (appliedFilters.status) params.set('status', appliedFilters.status);
    if (appliedFilters.category) params.set('category', appliedFilters.category);
    const url = `/api/transactions/export${params.toString() ? '?' + params.toString() : ''}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [appliedFilters]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <Card className="bg-card/50 border-card-custom backdrop-blur-sm shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="font-serif text-[#F5E6D3] flex items-center gap-3">
            Audit Trail
            <span className="text-xs font-mono font-normal text-[#A08060] border border-[#2A1A0E] px-2 py-0.5 rounded bg-[#1A1008]">
              {total.toLocaleString()} records
            </span>
          </CardTitle>
          <Button
            onClick={handleExport}
            variant="outline"
            className="text-xs border-[#C46A1A]/40 text-[#C46A1A] hover:bg-[#C46A1A]/10 hover:text-[#FF8C3A] font-mono tracking-wider"
            data-testid="button-export-csv"
          >
            ↓ Export CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filter Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          <Input
            placeholder="Search TXN ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleApplyFilters()}
            className="bg-[#0D0705] border-[#8B4A0F]/30 focus:border-[#C46A1A] font-mono text-[#F5E6D3] text-xs placeholder:text-[#A08060]/50 col-span-2 md:col-span-1"
            data-testid="input-search-history"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-[#0D0705] border-[#8B4A0F]/30 text-[#F5E6D3] text-xs" data-testid="select-filter-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1008] border-[#8B4A0F]/50 text-[#F5E6D3]">
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REVIEW">Review</SelectItem>
              <SelectItem value="BLOCKED">Blocked</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="bg-[#0D0705] border-[#8B4A0F]/30 text-[#F5E6D3] text-xs" data-testid="select-filter-category">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1008] border-[#8B4A0F]/50 text-[#F5E6D3]">
              <SelectItem value="ALL">All Categories</SelectItem>
              {['Retail', 'Travel', 'Online', 'ATM', 'Wire Transfer', 'Crypto'].map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            <Input
              placeholder="Min score"
              value={minScore}
              type="number"
              onChange={e => setMinScore(e.target.value)}
              className="bg-[#0D0705] border-[#8B4A0F]/30 focus:border-[#C46A1A] text-[#F5E6D3] text-xs placeholder:text-[#A08060]/50 w-full"
              data-testid="input-min-score"
            />
            <Input
              placeholder="Max"
              value={maxScore}
              type="number"
              onChange={e => setMaxScore(e.target.value)}
              className="bg-[#0D0705] border-[#8B4A0F]/30 focus:border-[#C46A1A] text-[#F5E6D3] text-xs placeholder:text-[#A08060]/50 w-full"
              data-testid="input-max-score"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleApplyFilters}
              className="flex-1 bg-[#C46A1A] hover:bg-[#FF8C3A] text-white text-xs font-mono tracking-wider"
              data-testid="button-apply-filters"
            >
              Filter
            </Button>
            <Button
              onClick={handleClearFilters}
              variant="outline"
              className="flex-1 border-[#2A1A0E] text-[#A08060] hover:text-[#F5E6D3] text-xs"
              data-testid="button-clear-filters"
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded border border-[#2A1A0E]">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-[#2A1A0E] bg-[#1A1008]">
                {['TXN Reference', 'Date/Time', 'Amount', 'Category', 'Device', 'Country', 'Risk Score', 'Status', 'AML', 'Actions'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[#A08060] font-normal tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#1A1008] animate-pulse">
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-3 py-3">
                        <div className="h-3 bg-[#2A1A0E] rounded w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-12 text-center text-[#A08060]">
                    <div className="space-y-2">
                      <div className="text-2xl opacity-30">⬡</div>
                      <div>No transactions found</div>
                      <div className="text-[#A08060]/50 text-xs">Analyze a transaction above to populate the audit trail</div>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((txn: FraudTransaction) => (
                  <TransactionRow
                    key={txn.id}
                    txn={txn}
                    formatDate={formatDate}
                    onDelete={handleDelete}
                    isDeleting={deleteMutation.isPending}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-[#A08060] font-mono">
              Page {currentPage} of {totalPages} · {total} records
            </span>
            <div className="flex gap-2">
              <Button
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={offset === 0}
                variant="outline"
                className="text-xs border-[#2A1A0E] text-[#A08060] hover:text-[#F5E6D3] disabled:opacity-30 px-3 py-1 h-auto"
                data-testid="button-prev-page"
              >
                ← Prev
              </Button>
              <Button
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={offset + PAGE_SIZE >= total}
                variant="outline"
                className="text-xs border-[#2A1A0E] text-[#A08060] hover:text-[#F5E6D3] disabled:opacity-30 px-3 py-1 h-auto"
                data-testid="button-next-page"
              >
                Next →
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TransactionRow({
  txn,
  formatDate,
  onDelete,
  isDeleting,
}: {
  txn: FraudTransaction;
  formatDate: (iso: string) => string;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}) {
  const scoreColor = txn.score <= 30 ? '#4CAF7D' : txn.score <= 60 ? '#C46A1A' : txn.score <= 85 ? '#FF8C3A' : '#E53E3E';

  return (
    <tr
      className="border-b border-[#1A1008] hover:bg-[#1A1008]/60 transition-colors group"
      data-testid={`row-transaction-${txn.id}`}
    >
      <td className="px-3 py-2.5 text-[#C46A1A] whitespace-nowrap">TXN-{txn.txnRef}</td>
      <td className="px-3 py-2.5 text-[#A08060] whitespace-nowrap">{formatDate(txn.createdAt)}</td>
      <td className="px-3 py-2.5 text-[#F5E6D3] whitespace-nowrap">${Number(txn.amount).toFixed(2)}</td>
      <td className="px-3 py-2.5 text-[#F5E6D3]">{txn.category}</td>
      <td className="px-3 py-2.5 text-[#A08060]">{txn.deviceType}</td>
      <td className="px-3 py-2.5 text-[#A08060]">{txn.country}</td>
      <td className="px-3 py-2.5">
        <span
          className="px-2 py-0.5 rounded text-xs font-bold border"
          style={{ color: scoreColor, borderColor: `${scoreColor}60`, backgroundColor: `${scoreColor}15` }}
        >
          {txn.score}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <span
          className="px-2 py-0.5 rounded text-xs font-bold tracking-widest border"
          style={{
            color: STATUS_COLORS[txn.status] ?? '#A08060',
            borderColor: `${STATUS_COLORS[txn.status] ?? '#A08060'}60`,
            backgroundColor: `${STATUS_COLORS[txn.status] ?? '#A08060'}15`,
          }}
        >
          {txn.status}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <span
          className="px-2 py-0.5 rounded text-xs font-bold border"
          style={{
            color: AML_COLORS[txn.amlStatus] ?? '#A08060',
            borderColor: `${AML_COLORS[txn.amlStatus] ?? '#A08060'}60`,
            backgroundColor: `${AML_COLORS[txn.amlStatus] ?? '#A08060'}15`,
          }}
        >
          {txn.amlStatus}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <button
          onClick={() => onDelete(txn.id)}
          disabled={isDeleting}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-[#E53E3E]/60 hover:text-[#E53E3E] text-xs font-mono disabled:opacity-30"
          data-testid={`button-delete-${txn.id}`}
          title="Remove record"
        >
          ✕
        </button>
      </td>
    </tr>
  );
}
