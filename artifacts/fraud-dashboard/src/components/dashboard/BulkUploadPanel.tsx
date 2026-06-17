import React, { useState, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useBulkCreateTransactions, getListTransactionsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { calculateFraudScore, generateRandomId, computeSubScores } from '@/lib/fraud-scoring';

type ParsedRow = Record<string, string | number | boolean>;

type ScoredRow = {
  txnRef: string;
  amount: number;
  category: string;
  hour: number;
  distance: number;
  frequency: number;
  deviceType: string;
  country: string;
  isFirstTransaction: boolean;
  score: number;
  status: 'APPROVED' | 'REVIEW' | 'BLOCKED';
  velocityRisk: number;
  geographicRisk: number;
  behavioralRisk: number;
  deviceRisk: number;
  amlStatus: 'PASSED' | 'FLAGGED';
  complianceTier: string;
  rowIndex: number;
  parseError?: string;
};

type UploadState = 'idle' | 'parsing' | 'scored' | 'saving' | 'saved';

const COLUMN_ALIASES: Record<string, string[]> = {
  amount: ['amount', 'transaction_amount', 'txn_amount', 'value', 'sum', 'price', 'total'],
  category: ['category', 'merchant_category', 'merchant_type', 'type', 'mcc', 'merchant'],
  hour: ['hour', 'time_of_day', 'hour_of_day', 'txn_hour', 'transaction_hour'],
  distance: ['distance', 'distance_from_home', 'dist', 'km', 'distance_km'],
  frequency: ['frequency', 'txn_frequency', 'transaction_frequency', 'freq', 'daily_freq'],
  deviceType: ['device_type', 'device', 'terminal_type', 'channel'],
  country: ['country', 'country_code', 'nation', 'origin_country'],
  isFirstTransaction: ['is_first_transaction', 'first_transaction', 'new_merchant', 'first_time', 'is_new'],
};

const VALID_CATEGORIES = ['Retail', 'Travel', 'Online', 'ATM', 'Wire Transfer', 'Crypto'];
const VALID_DEVICES = ['Mobile', 'Desktop', 'POS Terminal', 'ATM'];

function resolveField(row: ParsedRow, field: string, aliases: string[]): string | undefined {
  const keys = Object.keys(row).map(k => k.toLowerCase().trim());
  for (const alias of aliases) {
    const idx = keys.indexOf(alias.toLowerCase());
    if (idx !== -1) return String(Object.values(row)[idx] ?? '').trim();
  }
  return undefined;
}

function parseBoolean(val: string | undefined): boolean {
  if (!val) return false;
  const v = val.toLowerCase().trim();
  return v === 'true' || v === '1' || v === 'yes' || v === 'y';
}

function coerceCategory(raw: string | undefined): string {
  if (!raw) return 'Retail';
  const norm = raw.trim();
  const match = VALID_CATEGORIES.find(c => c.toLowerCase() === norm.toLowerCase());
  return match ?? 'Retail';
}

function coerceDevice(raw: string | undefined): string {
  if (!raw) return 'Mobile';
  const norm = raw.trim();
  const match = VALID_DEVICES.find(d => d.toLowerCase() === norm.toLowerCase());
  return match ?? 'Mobile';
}

function scoreRow(row: ParsedRow, idx: number): ScoredRow {
  const amountRaw = resolveField(row, 'amount', COLUMN_ALIASES.amount);
  const categoryRaw = resolveField(row, 'category', COLUMN_ALIASES.category);
  const hourRaw = resolveField(row, 'hour', COLUMN_ALIASES.hour);
  const distanceRaw = resolveField(row, 'distance', COLUMN_ALIASES.distance);
  const frequencyRaw = resolveField(row, 'frequency', COLUMN_ALIASES.frequency);
  const deviceRaw = resolveField(row, 'deviceType', COLUMN_ALIASES.deviceType);
  const countryRaw = resolveField(row, 'country', COLUMN_ALIASES.country);
  const firstRaw = resolveField(row, 'isFirstTransaction', COLUMN_ALIASES.isFirstTransaction);

  const amount = parseFloat(amountRaw ?? '0') || 0;
  const category = coerceCategory(categoryRaw);
  const hour = Math.min(23, Math.max(0, parseInt(hourRaw ?? '12') || 12));
  const distance = parseFloat(distanceRaw ?? '0') || 0;
  const frequency = Math.max(1, parseInt(frequencyRaw ?? '1') || 1);
  const deviceType = coerceDevice(deviceRaw);
  const country = (countryRaw ?? 'US').slice(0, 3).toUpperCase() || 'US';
  const isFirstTransaction = parseBoolean(firstRaw);

  const score = calculateFraudScore({ amount, category, hour, distance, frequency, deviceType, isFirstTransaction });
  const status: 'APPROVED' | 'REVIEW' | 'BLOCKED' = score <= 30 ? 'APPROVED' : score <= 60 ? 'REVIEW' : 'BLOCKED';
  const { velocityRisk, geographicRisk, behavioralRisk, deviceRisk } = computeSubScores({ frequency, distance, isFirstTransaction, hour, deviceType });
  const amlStatus: 'PASSED' | 'FLAGGED' = score > 60 ? 'FLAGGED' : 'PASSED';
  const complianceTier = score > 85 ? 'SUSPICIOUS ACTIVITY REPORT (SAR)' : score > 60 ? 'ENHANCED DUE DILIGENCE' : 'STANDARD';

  return {
    txnRef: generateRandomId(),
    amount, category, hour, distance, frequency, deviceType, country, isFirstTransaction,
    score, status, velocityRisk, geographicRisk, behavioralRisk, deviceRisk,
    amlStatus, complianceTier,
    rowIndex: idx + 1,
  };
}

function downloadTemplate() {
  const headers = ['amount', 'category', 'hour', 'distance', 'frequency', 'device_type', 'country', 'is_first_transaction'];
  const example = [
    [1250.00, 'Crypto', 2, 350, 8, 'Mobile', 'US', 'true'],
    [89.99, 'Retail', 14, 5, 2, 'POS Terminal', 'UK', 'false'],
    [7500.00, 'Wire Transfer', 3, 600, 12, 'Desktop', 'NG', 'true'],
  ];
  const csv = [headers, ...example].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'FraudIQ_Bulk_Template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function downloadResults(rows: ScoredRow[]) {
  const headers = ['Row', 'TXN Reference', 'Amount', 'Category', 'Hour', 'Distance', 'Frequency', 'Device', 'Country', 'First w/ Merchant', 'Risk Score', 'Status', 'AML', 'Compliance Tier'];
  const data = rows.map(r => [
    r.rowIndex,
    `TXN-${r.txnRef}`,
    r.amount.toFixed(2),
    r.category,
    r.hour,
    r.distance.toFixed(1),
    r.frequency,
    r.deviceType,
    r.country,
    r.isFirstTransaction ? 'Yes' : 'No',
    r.score,
    r.status,
    r.amlStatus,
    r.complianceTier,
  ]);
  const csv = [headers, ...data].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `FraudIQ_Bulk_Results_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const SCORE_COLOR = (s: number) => s <= 30 ? '#4CAF7D' : s <= 60 ? '#C46A1A' : s <= 85 ? '#FF8C3A' : '#E53E3E';
const STATUS_COLOR: Record<string, string> = { APPROVED: '#4CAF7D', REVIEW: '#C46A1A', BLOCKED: '#E53E3E' };

export function BulkUploadPanel() {
  const [state, setState] = useState<UploadState>('idle');
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ScoredRow[]>([]);
  const [saveResult, setSaveResult] = useState<{ saved: number; failed: number } | null>(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const PAGE_SIZE = 50;

  const queryClient = useQueryClient();
  const bulkCreate = useBulkCreateTransactions();

  const processFile = useCallback((file: File) => {
    setError('');
    setSaveResult(null);
    setFileName(file.name);
    setState('parsing');
    setPage(0);

    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      Papa.parse<ParsedRow>(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: (result) => {
          if (!result.data.length) {
            setError('The CSV file appears to be empty.');
            setState('idle');
            return;
          }
          const scored = result.data.map((r, i) => scoreRow(r, i));
          setRows(scored);
          setState('scored');
        },
        error: (err) => {
          setError(`CSV parse error: ${err.message}`);
          setState('idle');
        },
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(sheet, { defval: '' });
          if (!jsonData.length) {
            setError('The Excel file appears to be empty.');
            setState('idle');
            return;
          }
          const scored = jsonData.map((r, i) => scoreRow(r, i));
          setRows(scored);
          setState('scored');
        } catch (err) {
          setError(`Excel parse error: ${(err as Error).message}`);
          setState('idle');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setError('Unsupported file type. Please upload a .csv or .xlsx file.');
      setState('idle');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  }, [processFile]);

  const handleSaveAll = useCallback(() => {
    setState('saving');
    bulkCreate.mutate({
      data: { transactions: rows }
    }, {
      onSuccess: (result) => {
        setSaveResult({ saved: result.saved, failed: result.failed });
        setState('saved');
        queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
      },
      onError: () => {
        setError('Failed to save transactions. Please try again.');
        setState('scored');
      }
    });
  }, [rows, bulkCreate, queryClient]);

  const handleReset = useCallback(() => {
    setState('idle');
    setRows([]);
    setFileName('');
    setSaveResult(null);
    setError('');
    setPage(0);
  }, []);

  const summary = rows.length > 0 ? {
    approved: rows.filter(r => r.status === 'APPROVED').length,
    review: rows.filter(r => r.status === 'REVIEW').length,
    blocked: rows.filter(r => r.status === 'BLOCKED').length,
    avgScore: Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length),
    highRisk: rows.filter(r => r.score > 85).length,
  } : null;

  const pagedRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);

  return (
    <Card className="bg-card/50 border-card-custom backdrop-blur-sm shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="font-serif text-[#F5E6D3] flex items-center gap-3">
            Batch Transaction Analysis
            <span className="text-xs font-normal font-mono text-[#A08060] border border-[#2A1A0E] px-2 py-0.5 rounded bg-[#1A1008]">
              CSV / Excel
            </span>
          </CardTitle>
          <button
            onClick={downloadTemplate}
            className="text-xs font-mono text-[#C46A1A] hover:text-[#FF8C3A] border border-[#C46A1A]/30 hover:border-[#FF8C3A]/50 px-3 py-1.5 rounded transition-colors"
            data-testid="button-download-template"
          >
            ↓ Download Template
          </button>
        </div>
        <p className="text-xs text-[#A08060] mt-1">
          Upload a CSV or Excel file to score multiple transactions at once. Download the template to see the expected column format.
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Drop zone */}
        {state === 'idle' && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-300 ${
              dragOver
                ? 'border-[#C46A1A] bg-[#C46A1A]/10 scale-[1.01]'
                : 'border-[#2A1A0E] hover:border-[#8B4A0F] hover:bg-[#1A1008]/80'
            }`}
            data-testid="dropzone-upload"
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileInput}
              data-testid="input-file-upload"
            />
            <div className="space-y-3">
              <div className="text-4xl opacity-40" style={{ color: '#C46A1A' }}>⬡</div>
              <div>
                <p className="text-[#F5E6D3] font-serif text-lg">Drop your file here</p>
                <p className="text-[#A08060] text-sm mt-1">or click to browse — CSV or Excel (.xlsx, .xls)</p>
              </div>
              <div className="flex justify-center gap-4 pt-2">
                {['.CSV', '.XLSX', '.XLS'].map(ext => (
                  <span key={ext} className="text-xs font-mono text-[#A08060] border border-[#2A1A0E] px-2 py-0.5 rounded bg-[#1A1008]">{ext}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Parsing state */}
        {state === 'parsing' && (
          <div className="border border-[#2A1A0E] rounded-xl p-10 text-center space-y-3">
            <div className="flex justify-center">
              <div className="h-8 w-8 border-2 border-[#C46A1A] border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-[#F5E6D3] font-mono text-sm">Parsing <span className="text-[#C46A1A]">{fileName}</span>...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="border border-[#E53E3E]/40 bg-[#E53E3E]/10 rounded-lg p-4 text-sm text-[#E53E3E] font-mono flex items-center gap-3">
            <span>⚠</span> {error}
          </div>
        )}

        {/* Results */}
        {(state === 'scored' || state === 'saving' || state === 'saved') && summary && (
          <div className="space-y-4">
            {/* File info bar */}
            <div className="flex items-center justify-between bg-[#1A1008] border border-[#2A1A0E] rounded-lg px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span className="text-[#C46A1A] text-lg">⬡</span>
                <div>
                  <p className="text-xs font-mono text-[#F5E6D3]">{fileName}</p>
                  <p className="text-[10px] text-[#A08060]">{rows.length} transactions scored</p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="text-xs text-[#A08060] hover:text-[#F5E6D3] font-mono transition-colors"
                data-testid="button-reset-upload"
              >
                × Clear
              </button>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: 'Total', value: rows.length, color: '#F5E6D3' },
                { label: 'Approved', value: summary.approved, color: '#4CAF7D' },
                { label: 'Review', value: summary.review, color: '#C46A1A' },
                { label: 'Blocked', value: summary.blocked, color: '#E53E3E' },
                { label: 'Avg Score', value: summary.avgScore, color: SCORE_COLOR(summary.avgScore) },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-[#1A1008] border border-[#2A1A0E] rounded-lg p-3 text-center">
                  <div className="text-2xl font-mono font-bold" style={{ color }}>{value}</div>
                  <div className="text-[10px] text-[#A08060] uppercase tracking-wider mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {summary.highRisk > 0 && (
              <div className="flex items-center gap-3 border border-[#E53E3E]/30 bg-[#E53E3E]/8 rounded-lg px-4 py-2.5">
                <span className="text-[#E53E3E]">⚠</span>
                <p className="text-sm text-[#E53E3E] font-mono">
                  <strong>{summary.highRisk}</strong> high-risk transaction{summary.highRisk !== 1 ? 's' : ''} detected (score &gt; 85) — requires SAR escalation
                </p>
              </div>
            )}

            {/* Saved confirmation */}
            {state === 'saved' && saveResult && (
              <div className="flex items-center gap-3 border border-[#4CAF7D]/30 bg-[#4CAF7D]/8 rounded-lg px-4 py-2.5">
                <span className="text-[#4CAF7D]">✓</span>
                <p className="text-sm text-[#4CAF7D] font-mono">
                  <strong>{saveResult.saved}</strong> transaction{saveResult.saved !== 1 ? 's' : ''} saved to audit trail
                  {saveResult.failed > 0 && ` · ${saveResult.failed} failed`}
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 flex-wrap">
              {state !== 'saved' && (
                <Button
                  onClick={handleSaveAll}
                  disabled={state === 'saving'}
                  className="bg-gradient-to-r from-[#C46A1A] to-[#8B4A0F] text-white border border-[#FF8C3A]/30 hover:opacity-90 font-serif disabled:opacity-50"
                  data-testid="button-save-all"
                >
                  {state === 'saving' ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 border border-white border-t-transparent rounded-full animate-spin" />
                      Saving {rows.length} records...
                    </span>
                  ) : (
                    `Save All to Audit Trail (${rows.length})`
                  )}
                </Button>
              )}
              <Button
                onClick={() => downloadResults(rows)}
                variant="outline"
                className="border-[#C46A1A]/40 text-[#C46A1A] hover:bg-[#C46A1A]/10 hover:text-[#FF8C3A] font-mono text-xs tracking-wider"
                data-testid="button-download-results"
              >
                ↓ Download Scored Results
              </Button>
            </div>

            {/* Results table */}
            <div className="overflow-x-auto rounded border border-[#2A1A0E]">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#2A1A0E] bg-[#1A1008]">
                    {['#', 'Amount', 'Category', 'Hour', 'Dist km', 'Freq', 'Device', 'Country', 'First', 'Risk Score', 'Status', 'AML'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[#A08060] font-normal tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((row) => {
                    const sc = SCORE_COLOR(row.score);
                    const st = STATUS_COLOR[row.status] ?? '#A08060';
                    return (
                      <tr
                        key={row.rowIndex}
                        className={`border-b border-[#1A1008] transition-colors ${row.score > 85 ? 'bg-[#E53E3E]/5' : 'hover:bg-[#1A1008]/60'}`}
                        data-testid={`row-bulk-${row.rowIndex}`}
                      >
                        <td className="px-3 py-2 text-[#A08060]">{row.rowIndex}</td>
                        <td className="px-3 py-2 text-[#F5E6D3] whitespace-nowrap">${row.amount.toFixed(2)}</td>
                        <td className="px-3 py-2 text-[#F5E6D3]">{row.category}</td>
                        <td className="px-3 py-2 text-[#A08060]">{row.hour}:00</td>
                        <td className="px-3 py-2 text-[#A08060]">{row.distance.toFixed(0)}</td>
                        <td className="px-3 py-2 text-[#A08060]">{row.frequency}</td>
                        <td className="px-3 py-2 text-[#A08060]">{row.deviceType}</td>
                        <td className="px-3 py-2 text-[#A08060]">{row.country}</td>
                        <td className="px-3 py-2 text-[#A08060]">{row.isFirstTransaction ? 'Yes' : 'No'}</td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded font-bold border" style={{ color: sc, borderColor: `${sc}60`, backgroundColor: `${sc}15` }}>
                            {row.score}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded font-bold tracking-widest border text-[10px]" style={{ color: st, borderColor: `${st}60`, backgroundColor: `${st}15` }}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`font-bold ${row.amlStatus === 'FLAGGED' ? 'text-[#E53E3E]' : 'text-[#4CAF7D]'}`}>
                            {row.amlStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#A08060] font-mono">
                  Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, rows.length)} of {rows.length}
                </span>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    variant="outline"
                    className="text-xs border-[#2A1A0E] text-[#A08060] hover:text-[#F5E6D3] disabled:opacity-30 px-3 py-1 h-auto"
                  >
                    ← Prev
                  </Button>
                  <Button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    variant="outline"
                    className="text-xs border-[#2A1A0E] text-[#A08060] hover:text-[#F5E6D3] disabled:opacity-30 px-3 py-1 h-auto"
                  >
                    Next →
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
