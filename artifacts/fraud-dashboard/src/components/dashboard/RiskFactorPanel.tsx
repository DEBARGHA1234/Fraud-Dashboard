import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Transaction } from './types';

interface Props {
  transaction: Transaction | null;
}

export function RiskFactorPanel({ transaction }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (expanded) {
      // Trigger animation after mount
      const timer = setTimeout(() => setMounted(true), 50);
      return () => clearTimeout(timer);
    } else {
      setMounted(false);
    }
  }, [expanded, transaction]);

  if (!transaction) return null;

  // Derive feature contributions somewhat arbitrarily for the demo
  const factors = [
    { label: 'Amount Anomaly', value: Math.min(100, (transaction.amount / 5000) * 100), color: '#C46A1A' },
    { label: 'Time Pattern', value: (transaction.hour >= 1 && transaction.hour <= 5) || (transaction.hour >= 22 || transaction.hour === 0) ? 80 : 10, color: '#C46A1A' },
    { label: 'Location Deviation', value: Math.min(100, (transaction.distance / 500) * 100), color: '#FF8C3A' },
    { label: 'Velocity Spike', value: Math.min(100, (transaction.frequency / 10) * 100), color: '#E53E3E' },
    { label: 'Device Mismatch', value: transaction.deviceType === 'ATM' ? 90 : 20, color: '#C46A1A' },
  ].sort((a, b) => b.value - a.value);

  return (
    <Card className="bg-card/50 border-card-custom backdrop-blur-sm shadow-xl mt-6 overflow-hidden transition-all duration-300">
      <div 
        className="p-4 cursor-pointer flex justify-between items-center bg-[#1A1008]/50 hover:bg-[#1A1008] transition-colors"
        onClick={() => setExpanded(!expanded)}
        data-testid="panel-risk-factors"
      >
        <div>
          <h3 className="font-serif text-lg text-[#F5E6D3]">Risk Factor Analysis</h3>
          <p className="text-xs text-[#A08060]">Why this score?</p>
        </div>
        {expanded ? <ChevronUp className="text-[#C46A1A]" /> : <ChevronDown className="text-[#C46A1A]" />}
      </div>
      
      <div 
        className={`transition-all duration-500 ease-in-out ${expanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <CardContent className="pt-2 pb-6 space-y-4 border-t border-card-custom/30">
          {factors.map((factor, idx) => (
            <div key={factor.label} className="space-y-1">
              <div className="flex justify-between text-xs text-[#F5E6D3]">
                <span>{factor.label}</span>
                <span className="font-mono text-[#A08060]">+{factor.value.toFixed(1)}</span>
              </div>
              <div className="h-2 w-full bg-[#0D0705] rounded overflow-hidden">
                <div 
                  className="h-full rounded transition-all duration-1000 ease-out"
                  style={{ 
                    width: mounted ? `${factor.value}%` : '0%', 
                    backgroundColor: factor.color,
                    transitionDelay: `${idx * 100}ms`
                  }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </div>
    </Card>
  );
}
