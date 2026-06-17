import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Transaction } from './types';

interface Props {
  transactions: Transaction[];
}

export function LiveFeedPanel({ transactions }: Props) {
  return (
    <Card className="bg-card/50 border-card-custom backdrop-blur-sm h-full flex flex-col shadow-xl overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="font-serif flex justify-between items-center text-[#F5E6D3]">
          Live Transaction Feed
          <span className="bg-[#1A1008] border border-card-custom text-[#C46A1A] px-2 py-0.5 rounded-full text-xs font-mono">
            {transactions.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto pr-2 pb-0">
        <div className="space-y-2">
          {transactions.map((txn, i) => (
            <FeedRow key={txn.id} transaction={txn} isNew={i === 0} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FeedRow({ transaction: txn, isNew }: { transaction: Transaction, isNew: boolean }) {
  const isFraud = txn.score > 60;
  
  const getScoreColor = (score: number) => {
    if (score <= 30) return '#4CAF7D';
    if (score <= 60) return '#C46A1A';
    if (score <= 85) return '#FF8C3A';
    return '#E53E3E';
  };

  const color = getScoreColor(txn.score);

  return (
    <div 
      className={`p-3 rounded border border-card-custom/50 flex items-center justify-between
        ${isNew ? 'animate-[slideDown_0.4s_ease-out_forwards]' : ''}
        ${isFraud ? 'animate-[flashRed_1s_ease-out] bg-[rgba(229,62,62,0.1)] border-[#E53E3E]/30' : 'bg-[#1A1008]'}
      `}
    >
      <div className="flex flex-col">
        <span className="font-mono text-xs text-[#F5E6D3]">{txn.id}</span>
        <span className="text-xs text-[#A08060]">{txn.category}</span>
      </div>
      
      <div className="flex flex-col items-end gap-1">
        <span className="font-mono text-sm text-[#F5E6D3]">${txn.amount.toFixed(2)}</span>
        <div className="flex gap-2 items-center">
          <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color }}>{txn.status}</span>
          <div 
            className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-mono font-bold bg-opacity-20 border"
            style={{ color, borderColor: color, backgroundColor: `${color}33` }}
          >
            {txn.score}
          </div>
        </div>
      </div>
    </div>
  );
}
