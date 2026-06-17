import React, { useState, useEffect, useCallback } from 'react';
import { TransactionInputPanel, ScoreResultPanel, LiveFeedPanel, AnalyticsDashboard, RiskFactorPanel, HighRiskAlertModal, TransactionHistory, BulkUploadPanel } from '@/components/dashboard';
import { Transaction, TransactionInput } from '@/components/dashboard/types';
import { useCreateTransaction, getListTransactionsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { calculateFraudScore, generateRandomId, computeSubScores } from '@/lib/fraud-scoring';

const generateRandomTransaction = (): Transaction => {
  const amount = Math.random() > 0.9 ? Math.random() * 8000 : Math.random() * 500;
  const hour = Math.floor(Math.random() * 24);
  const distance = Math.random() > 0.8 ? Math.random() * 800 : Math.random() * 50;
  const frequency = Math.floor(Math.random() * 15) + 1;
  const categories = ['Retail', 'Travel', 'Online', 'ATM', 'Wire Transfer', 'Crypto'];
  const category = categories[Math.floor(Math.random() * categories.length)];
  const isFirstTransaction = Math.random() > 0.7;
  const deviceTypes = ['Mobile', 'Desktop', 'POS Terminal', 'ATM'];
  const deviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
  const country = 'US';
  const score = calculateFraudScore({ amount, hour, distance, frequency, category, isFirstTransaction, deviceType });
  const status: 'APPROVED' | 'REVIEW' | 'BLOCKED' = score <= 30 ? 'APPROVED' : score <= 60 ? 'REVIEW' : 'BLOCKED';
  return { id: generateRandomId(), amount, hour, distance, frequency, category, isFirstTransaction, deviceType, country, score, status, timestamp: new Date() };
};

export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);

  const queryClient = useQueryClient();
  const createTransaction = useCreateTransaction();

  useEffect(() => {
    const initial = Array.from({ length: 15 }, generateRandomTransaction)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    setTransactions(initial);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const newTxn = generateRandomTransaction();
      setTransactions(prev => [newTxn, ...prev].slice(0, 20));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleAnalyze = useCallback((data: TransactionInput) => {
    const score = calculateFraudScore(data);
    const status: 'APPROVED' | 'REVIEW' | 'BLOCKED' = score <= 30 ? 'APPROVED' : score <= 60 ? 'REVIEW' : 'BLOCKED';
    const txnRef = generateRandomId();
    const { velocityRisk, geographicRisk, behavioralRisk, deviceRisk } = computeSubScores({
      ...data,
      deviceType: data.deviceType,
    });
    const amlStatus: 'PASSED' | 'FLAGGED' = score > 60 ? 'FLAGGED' : 'PASSED';
    const complianceTier = score > 85
      ? 'SUSPICIOUS ACTIVITY REPORT (SAR)'
      : score > 60
        ? 'ENHANCED DUE DILIGENCE'
        : 'STANDARD';

    const newTxn: Transaction = {
      ...data,
      id: txnRef,
      score,
      status,
      timestamp: new Date(),
    };

    setCurrentTransaction(newTxn);
    setTransactions(prev => [newTxn, ...prev].slice(0, 20));
    if (score > 85) setShowAlertModal(true);

    createTransaction.mutate({
      data: {
        txnRef,
        amount: data.amount,
        category: data.category,
        hour: data.hour,
        distance: data.distance,
        frequency: data.frequency,
        deviceType: data.deviceType,
        country: data.country,
        isFirstTransaction: data.isFirstTransaction,
        score,
        status,
        velocityRisk,
        geographicRisk,
        behavioralRisk,
        deviceRisk,
        amlStatus,
        complianceTier,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
      }
    });
  }, [createTransaction, queryClient]);

  const currentRiskLevel = transactions.length > 0
    ? (transactions[0].score > 60 ? 'HIGH' : transactions[0].score > 30 ? 'MEDIUM' : 'LOW')
    : 'LOW';
  const riskColor = currentRiskLevel === 'HIGH' ? '#E53E3E' : currentRiskLevel === 'MEDIUM' ? '#C46A1A' : '#4CAF7D';

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 relative overflow-hidden selection:bg-[#C46A1A]/30">
      <div
        className="fixed inset-0 z-0 pointer-events-none select-none flex items-end justify-end p-8 leading-none"
        style={{ opacity: 0.04, fontSize: '20rem', fontFamily: 'serif', fontWeight: 700, color: '#F5E6D3' }}
      >
        MS
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-card-custom bg-gradient-to-r from-[#003366] to-[#0D0705] backdrop-blur supports-[backdrop-filter]:bg-opacity-80 shadow-lg">
        <div className="flex h-16 items-center px-6 gap-4 justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[#C46A1A] text-xl">⬡</span>
              <h1 className="font-serif text-xl font-bold tracking-tight text-[#C46A1A]">FraudIQ</h1>
            </div>
            <span className="text-[10px] text-[#A08060] uppercase tracking-widest">
              Real-Time Threat Detection by J.P. Morgan MLCoE
            </span>
          </div>

          <div className="flex items-center gap-3 bg-black/40 px-4 py-1.5 rounded-full border border-card-custom">
            <div className="h-2.5 w-2.5 rounded-full bg-[#4CAF7D] animate-pulse-fast" />
            <span className="text-xs font-mono text-[#F5E6D3]">
              System Online — Monitoring 2.4M transactions/sec
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#A08060] uppercase tracking-wider">Risk Level</span>
            <span
              className="px-2 py-1 rounded text-xs font-bold border transition-colors duration-500"
              style={{ color: riskColor, borderColor: riskColor, backgroundColor: `${riskColor}33` }}
            >
              {currentRiskLevel}
            </span>
          </div>
        </div>
        <div className="h-[1px] w-full bg-gradient-to-r from-[#003366] via-[#C46A1A]/50 to-transparent" />
      </header>

      <main className="p-6 max-w-[1600px] mx-auto z-10 relative">
        {/* Main 3-column analysis panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in duration-700">
          <div className="xl:col-span-1">
            <TransactionInputPanel onAnalyze={handleAnalyze} />
            <RiskFactorPanel transaction={currentTransaction} />
          </div>
          <div className="xl:col-span-1">
            <ScoreResultPanel transaction={currentTransaction} />
          </div>
          <div className="xl:col-span-1 h-[800px]">
            <LiveFeedPanel transactions={transactions} />
          </div>
        </div>

        {/* Analytics dashboard */}
        <div className="mt-6">
          <AnalyticsDashboard />
        </div>

        {/* Batch Upload */}
        <div className="mt-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-[#C46A1A]/30 to-transparent" />
            <span className="text-xs font-mono text-[#A08060] uppercase tracking-widest px-2">
              Batch Analysis
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-[#C46A1A]/30 to-transparent" />
          </div>
          <BulkUploadPanel />
        </div>

        {/* Compliance Audit Trail */}
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-[#C46A1A]/30 to-transparent" />
            <span className="text-xs font-mono text-[#A08060] uppercase tracking-widest px-2">
              Compliance Audit Trail
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-[#C46A1A]/30 to-transparent" />
          </div>
          <TransactionHistory />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 text-center border-t border-card-custom/50 bg-[#0D0705]/80 backdrop-blur z-10 relative">
        <p className="text-xs text-[#A08060]">
          Powered by JPMorgan MLCoE | Compliance-Ready | SOC 2 Certified | Basel III Compliant | FATF Guidelines
        </p>
      </footer>

      {/* High risk alert modal */}
      <HighRiskAlertModal
        transaction={currentTransaction}
        onDismiss={() => setShowAlertModal(false)}
        onLog={() => setShowAlertModal(false)}
      />
    </div>
  );
}
