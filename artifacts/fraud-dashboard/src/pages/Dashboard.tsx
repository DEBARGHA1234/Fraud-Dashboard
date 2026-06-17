import React, { useState, useEffect, useCallback } from 'react';
import { TransactionInputPanel, ScoreResultPanel, LiveFeedPanel, AnalyticsDashboard, RiskFactorPanel, HighRiskAlertModal } from '@/components/dashboard';
import { Transaction, TransactionInput } from '@/components/dashboard/types';

export function calculateFraudScore(transaction: {
  amount: number;
  hour: number;
  distance: number;
  frequency: number;
  category: string;
  isFirstTransaction: boolean;
  deviceType?: string;
}): number {
  let score = 0;
  const { amount, hour, distance, frequency, category, isFirstTransaction } = transaction;
  
  if (amount > 5000) score += 25;
  else if (amount > 1000) score += 15;
  else if (amount > 500) score += 8;
  
  if (hour >= 1 && hour <= 5) score += 15;
  else if (hour >= 22 || hour === 0) score += 8;
  
  if (distance > 500) score += 20;
  else if (distance > 100) score += 10;
  
  if (frequency > 10) score += 20;
  else if (frequency > 5) score += 12;
  
  const highRiskCategories = ['Crypto', 'Wire Transfer', 'ATM'];
  if (highRiskCategories.includes(category)) score += 10;
  
  if (isFirstTransaction) score += 10;
  
  return Math.min(score, 100);
}

export function generateRandomId() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

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
  const status = score <= 30 ? 'APPROVED' : score <= 60 ? 'REVIEW' : 'BLOCKED';

  return {
    id: generateRandomId(),
    amount,
    hour,
    distance,
    frequency,
    category,
    isFirstTransaction,
    deviceType,
    country,
    score,
    status,
    timestamp: new Date()
  };
};

export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);

  // Initialize with some data
  useEffect(() => {
    const initial = Array.from({ length: 15 }, generateRandomTransaction).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    setTransactions(initial);
  }, []);

  // Auto-generate transaction feed
  useEffect(() => {
    const interval = setInterval(() => {
      const newTxn = generateRandomTransaction();
      setTransactions(prev => [newTxn, ...prev].slice(0, 20));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleAnalyze = useCallback((data: TransactionInput) => {
    const score = calculateFraudScore(data);
    const status = score <= 30 ? 'APPROVED' : score <= 60 ? 'REVIEW' : 'BLOCKED';
    
    const newTxn: Transaction = {
      ...data,
      id: generateRandomId(),
      score,
      status,
      timestamp: new Date()
    };

    setCurrentTransaction(newTxn);
    setTransactions(prev => [newTxn, ...prev].slice(0, 20));
    
    if (score > 85) {
      setShowAlertModal(true);
    }
  }, []);

  const currentRiskLevel = transactions.length > 0 ? (transactions[0].score > 60 ? 'HIGH' : transactions[0].score > 30 ? 'MEDIUM' : 'LOW') : 'LOW';
  const riskColor = currentRiskLevel === 'HIGH' ? '#E53E3E' : currentRiskLevel === 'MEDIUM' ? '#C46A1A' : '#4CAF7D';

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 relative overflow-hidden selection:bg-[#C46A1A]/30">
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.04] select-none text-[20rem] font-serif font-bold flex items-end justify-end p-8 leading-none" style={{ color: '#F5E6D3' }}>
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
            <span className="text-[10px] text-[#A08060] uppercase tracking-widest">Real-Time Threat Detection by J.P. Morgan MLCoE</span>
          </div>
          
          <div className="flex items-center gap-3 bg-black/40 px-4 py-1.5 rounded-full border border-card-custom">
            <div className="h-2.5 w-2.5 rounded-full bg-[#4CAF7D] animate-pulse-fast"></div>
            <span className="text-xs font-mono text-[#F5E6D3]">System Online — Monitoring 2.4M transactions/sec</span>
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
        <div className="h-[1px] w-full bg-gradient-to-r from-[#003366] via-[#C46A1A]/50 to-transparent"></div>
      </header>

      <main className="p-6 max-w-[1600px] mx-auto z-10 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in duration-700">
            <div className="xl:col-span-1 slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
                <TransactionInputPanel onAnalyze={handleAnalyze} />
                <RiskFactorPanel transaction={currentTransaction} />
            </div>
            <div className="xl:col-span-1 slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both">
                <ScoreResultPanel transaction={currentTransaction} />
            </div>
            <div className="xl:col-span-1 h-[800px] slide-in-from-bottom-4 duration-500 delay-450 fill-mode-both">
                <LiveFeedPanel transactions={transactions} />
            </div>
        </div>
        
        <div className="animate-in slide-in-from-bottom-8 duration-700 delay-500 fill-mode-both">
          <AnalyticsDashboard />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 text-center border-t border-card-custom/50 bg-[#0D0705]/80 backdrop-blur z-10 relative">
        <p className="text-xs text-[#A08060]">Powered by JPMorgan MLCoE | Compliance-Ready | SOC 2 Certified | Basel III Compliant | FATF Guidelines</p>
      </footer>

      {/* Modal */}
      <HighRiskAlertModal 
        transaction={currentTransaction} 
        onDismiss={() => setShowAlertModal(false)}
        onLog={() => setShowAlertModal(false)}
      />
    </div>
  );
}
