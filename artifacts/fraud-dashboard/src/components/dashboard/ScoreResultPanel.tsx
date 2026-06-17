import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Transaction } from './types';
import { useCountUp } from '@/hooks/use-count-up';

interface Props {
  transaction: Transaction | null;
}

export function ScoreResultPanel({ transaction }: Props) {
  const [displayedScore, setDisplayedScore] = useState(0);

  useEffect(() => {
    if (transaction) {
      // Small delay to trigger animation
      setDisplayedScore(0);
      const timer = setTimeout(() => {
        setDisplayedScore(transaction.score);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [transaction]);

  const animatedScore = useCountUp(displayedScore, 1500);

  if (!transaction) {
    return (
      <Card className="bg-card/50 border-card-custom backdrop-blur-sm h-full flex flex-col justify-center items-center shadow-xl">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 rounded-full border-4 border-dashed border-[#2A1A0E] flex items-center justify-center mx-auto opacity-50">
            <span className="text-4xl text-[#A08060]">?</span>
          </div>
          <p className="text-[#A08060] font-serif text-xl">Awaiting Analysis</p>
        </div>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score <= 30) return '#4CAF7D';
    if (score <= 60) return '#C46A1A';
    if (score <= 85) return '#FF8C3A';
    return '#E53E3E';
  };

  const getStatusText = (score: number) => {
    if (score <= 30) return 'APPROVED';
    if (score <= 60) return 'REVIEW';
    return 'BLOCKED';
  };

  const color = getScoreColor(transaction.score);
  const status = getStatusText(transaction.score);
  
  // Calculate sub-scores based on logic
  const velocityRisk = transaction.frequency > 10 ? 100 : transaction.frequency > 5 ? 60 : transaction.frequency > 2 ? 30 : 10;
  const geographicRisk = transaction.distance > 500 ? 100 : transaction.distance > 100 ? 50 : transaction.distance > 50 ? 25 : 5;
  const behavioralRisk = Math.min((transaction.isFirstTransaction ? 60 : 20) + (transaction.hour >= 1 && transaction.hour <= 5 ? 40 : 0), 100);
  const deviceRisk = transaction.deviceType === 'ATM' ? 40 : transaction.deviceType === 'Mobile' ? 20 : 15;

  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference - (displayedScore / 100) * circumference;

  return (
    <Card className="bg-card/50 border-card-custom backdrop-blur-sm h-full shadow-xl">
      <CardHeader>
        <CardTitle className="font-serif flex justify-between items-center text-[#F5E6D3]">
          Score Result
          <span className="text-xs font-mono text-[#A08060]">TXN-{transaction.id}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-8">
        
        {/* Gauge */}
        <div className="relative w-64 h-64">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="128" cy="128" r="120"
              fill="none"
              stroke="#1A1008"
              strokeWidth="16"
            />
            <circle
              cx="128" cy="128" r="120"
              fill="none"
              stroke={color}
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1500 ease-[cubic-bezier(0.4,0,0.2,1)]"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-6xl font-bold font-mono tracking-tighter" style={{ color }}>{animatedScore}</span>
            <span className="font-serif text-[#A08060] mt-1">Risk Score</span>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="flex gap-4 w-full justify-center">
            <div 
              className="px-4 py-2 rounded font-bold tracking-widest text-sm border bg-opacity-20"
              style={{ color, borderColor: color, backgroundColor: `${color}33` }}
            >
              {status}
            </div>
            <div className={`px-4 py-2 rounded font-bold tracking-widest text-sm border bg-opacity-20 ${transaction.score > 60 ? 'text-[#E53E3E] border-[#E53E3E] bg-[#E53E3E]/20' : 'text-[#4CAF7D] border-[#4CAF7D] bg-[#4CAF7D]/20'}`}>
              AML: {transaction.score > 60 ? 'FLAGGED' : 'PASSED'}
            </div>
          </div>
          
          <div className="text-xs font-mono tracking-wider text-center px-4 py-2 bg-[#1A1008] border border-[#2A1A0E] rounded w-full text-[#A08060]">
            {transaction.score > 85 ? 'SUSPICIOUS ACTIVITY REPORT (SAR)' : transaction.score > 60 ? 'ENHANCED DUE DILIGENCE' : 'STANDARD COMPLIANCE'}
          </div>
        </div>

        {/* Risk Bars */}
        <div className="w-full space-y-4 pt-4 border-t border-card-custom/50">
          <RiskBar label="Velocity Risk" value={velocityRisk} delay="100ms" />
          <RiskBar label="Geographic Risk" value={geographicRisk} delay="200ms" />
          <RiskBar label="Behavioral Risk" value={behavioralRisk} delay="300ms" />
          <RiskBar label="Device Risk" value={deviceRisk} delay="400ms" />
        </div>

      </CardContent>
    </Card>
  );
}

function RiskBar({ label, value, delay }: { label: string, value: number, delay: string }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setWidth(value);
    }, 50);
    return () => clearTimeout(timer);
  }, [value]);

  const color = value > 80 ? '#E53E3E' : value > 50 ? '#FF8C3A' : value > 20 ? '#C46A1A' : '#4CAF7D';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-[#A08060]">
        <span>{label}</span>
        <span className="font-mono">{value}%</span>
      </div>
      <div className="h-1.5 w-full bg-[#1A1008] rounded overflow-hidden">
        <div 
          className="h-full rounded transition-all duration-800 ease-out"
          style={{ 
            width: `${width}%`, 
            backgroundColor: color,
            transitionDelay: delay 
          }}
        />
      </div>
    </div>
  );
}
