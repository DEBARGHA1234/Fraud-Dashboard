import React from 'react';
import { Button } from '@/components/ui/button';
import { Transaction } from './types';

interface Props {
  transaction: Transaction | null;
  onDismiss: () => void;
  onLog: () => void;
}

export function HighRiskAlertModal({ transaction, onDismiss, onLog }: Props) {
  if (!transaction || transaction.score <= 85) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#1A1008] border border-[#E53E3E] rounded-xl shadow-[0_0_50px_rgba(229,62,62,0.2)] overflow-hidden">
        {/* Glowing border effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#E53E3E]/20 to-transparent animate-[shimmer_3s_linear_infinite]" />
        
        <div className="relative p-6 space-y-6">
          <div className="flex items-center gap-3 text-[#E53E3E]">
            <span className="text-2xl">⚠</span>
            <h2 className="font-serif text-xl font-bold tracking-wide">HIGH RISK ALERT — Escalated to Compliance Desk</h2>
          </div>
          
          <div className="bg-[#0D0705] p-4 rounded border border-[#E53E3E]/30 space-y-3 font-mono text-sm">
            <div className="flex justify-between">
              <span className="text-[#A08060]">TXN Reference:</span>
              <span className="text-[#F5E6D3]">{transaction.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A08060]">Amount:</span>
              <span className="text-[#F5E6D3]">${transaction.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A08060]">Category:</span>
              <span className="text-[#F5E6D3]">{transaction.category}</span>
            </div>
            <div className="flex justify-between border-t border-[#E53E3E]/20 pt-2 mt-2">
              <span className="text-[#A08060]">Risk Score:</span>
              <span className="text-[#E53E3E] font-bold text-lg">{transaction.score}</span>
            </div>
          </div>
          
          <div className="flex gap-3 pt-2">
            <Button 
              onClick={onLog}
              className="flex-1 bg-[#E53E3E] hover:bg-[#C53030] text-white font-bold"
              data-testid="button-log-incident"
            >
              Log Incident
            </Button>
            <Button 
              onClick={onDismiss}
              variant="outline"
              className="flex-1 border-[#A08060]/30 text-[#A08060] hover:bg-[#2A1A0E] hover:text-[#F5E6D3]"
              data-testid="button-dismiss-alert"
            >
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
