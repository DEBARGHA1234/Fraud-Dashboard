import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useCountUp } from '@/hooks/use-count-up';

const fraudTrendData = Array.from({ length: 12 }, (_, i) => ({
  hour: `${i * 2}:00`,
  attempts: Math.floor(Math.random() * 50) + 10,
}));

const maxAttempts = Math.max(...fraudTrendData.map(d => d.attempts));

const riskDistributionData = [
  { name: 'Low', value: 450, color: '#4CAF7D' },
  { name: 'Medium', value: 300, color: '#C46A1A' },
  { name: 'High', value: 150, color: '#FF8C3A' },
  { name: 'Blocked', value: 100, color: '#E53E3E' },
];

export function AnalyticsDashboard() {
  const totalAnalyzed = useCountUp(1000, 2000);
  const avgRiskScore = useCountUp(42, 1500);
  const falsePositiveRate = useCountUp(2, 1500);
  const amountProtected = useCountUp(12450000, 2500);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
      <Card className="bg-card/50 border-card-custom backdrop-blur-sm shadow-xl">
        <CardHeader>
          <CardTitle className="font-serif text-[#F5E6D3]">Fraud Trend (Last 12h)</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fraudTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="hour" stroke="#A08060" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#A08060" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                cursor={{ fill: '#2A1A0E', opacity: 0.5 }}
                contentStyle={{ backgroundColor: '#1A1008', borderColor: '#C46A1A', color: '#F5E6D3' }}
                itemStyle={{ color: '#F5E6D3' }}
              />
              <Bar dataKey="attempts" radius={[4, 4, 0, 0]}>
                {fraudTrendData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.attempts === maxAttempts ? '#C46A1A' : '#2A1A0E'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-card-custom backdrop-blur-sm shadow-xl">
        <CardHeader>
          <CardTitle className="font-serif text-[#F5E6D3]">Risk Distribution</CardTitle>
        </CardHeader>
        <CardContent className="h-64 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={riskDistributionData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {riskDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1A1008', borderColor: '#C46A1A', color: '#F5E6D3' }}
                itemStyle={{ color: '#F5E6D3' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-4">
            <span className="text-3xl font-mono font-bold text-[#F5E6D3]">{totalAnalyzed}</span>
            <span className="text-xs text-[#A08060]">Total Analyzed</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-card-custom backdrop-blur-sm shadow-xl">
        <CardHeader>
          <CardTitle className="font-serif text-[#F5E6D3]">Stats Grid</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 h-64">
          <div className="flex flex-col justify-center items-center p-4 bg-[#1A1008] border border-[#2A1A0E] rounded-lg">
            <span className="text-3xl font-mono font-bold text-[#FF8C3A]">{avgRiskScore}</span>
            <span className="text-xs text-[#A08060] mt-1 text-center">Avg Risk Score</span>
          </div>
          <div className="flex flex-col justify-center items-center p-4 bg-[#1A1008] border border-[#2A1A0E] rounded-lg">
            <span className="text-3xl font-mono font-bold text-[#4CAF7D]">{falsePositiveRate}%</span>
            <span className="text-xs text-[#A08060] mt-1 text-center">False Positive Rate</span>
          </div>
          <div className="col-span-2 flex flex-col justify-center items-center p-4 bg-[#1A1008] border border-[#2A1A0E] rounded-lg relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#C46A1A]/10 to-transparent translate-x-[-100%] group-hover:animate-shimmer" />
            <span className="text-3xl font-mono font-bold text-[#F5E6D3]">${amountProtected.toLocaleString()}</span>
            <span className="text-xs text-[#A08060] mt-1">Total Amount Protected</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
