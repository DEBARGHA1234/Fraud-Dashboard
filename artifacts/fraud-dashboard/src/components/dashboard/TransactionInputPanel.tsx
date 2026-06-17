import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { TransactionInput } from './types';

interface Props {
  onAnalyze: (data: TransactionInput) => void;
}

export function TransactionInputPanel({ onAnalyze }: Props) {
  const [data, setData] = React.useState<TransactionInput>({
    amount: 0,
    category: 'Retail',
    hour: 12,
    distance: 0,
    frequency: 1,
    deviceType: 'Mobile',
    country: 'US',
    isFirstTransaction: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAnalyze(data);
  };

  return (
    <Card className="bg-card/50 border-card-custom backdrop-blur-sm shadow-xl">
      <CardHeader>
        <CardTitle className="font-serif text-[#F5E6D3]">Transaction Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="amount" className="text-[#A08060]">Transaction Amount ($)</Label>
              <Input 
                id="amount" 
                type="number" 
                min="0" 
                step="0.01" 
                value={data.amount || ''}
                onChange={e => setData({...data, amount: parseFloat(e.target.value) || 0})}
                className="bg-[#0D0705] border-[#8B4A0F]/30 focus:border-[#C46A1A] font-mono text-[#F5E6D3]"
                data-testid="input-amount"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-[#A08060]">Merchant Category</Label>
              <Select value={data.category} onValueChange={v => setData({...data, category: v})}>
                <SelectTrigger className="bg-[#0D0705] border-[#8B4A0F]/30 text-[#F5E6D3]" data-testid="select-category">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1008] border-[#8B4A0F]/50 text-[#F5E6D3]">
                  {['Retail', 'Travel', 'Online', 'ATM', 'Wire Transfer', 'Crypto'].map(cat => (
                    <SelectItem key={cat} value={cat} className="focus:bg-[#8B4A0F]/20 focus:text-white">{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4">
              <div className="flex justify-between items-center">
                <Label className="text-[#A08060]">Time of Day (Hour: {data.hour})</Label>
              </div>
              <Slider 
                value={[data.hour]} 
                min={0} max={23} step={1}
                onValueChange={v => setData({...data, hour: v[0]})}
                className="[&>[data-radix-slider-range]]:bg-[#C46A1A] [&>[data-radix-slider-thumb]]:bg-[#FF8C3A]"
                data-testid="slider-hour"
              />
            </div>

            <div className="grid gap-4">
              <div className="flex justify-between items-center">
                <Label className="text-[#A08060]">Distance from Home (km: {data.distance})</Label>
              </div>
              <Slider 
                value={[data.distance]} 
                min={0} max={1000} step={10}
                onValueChange={v => setData({...data, distance: v[0]})}
                className="[&>[data-radix-slider-range]]:bg-[#C46A1A] [&>[data-radix-slider-thumb]]:bg-[#FF8C3A]"
                data-testid="slider-distance"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="frequency" className="text-[#A08060]">Transaction Frequency Today</Label>
              <Input 
                id="frequency" 
                type="number" 
                min="1" 
                value={data.frequency || ''}
                onChange={e => setData({...data, frequency: parseInt(e.target.value) || 1})}
                className="bg-[#0D0705] border-[#8B4A0F]/30 focus:border-[#C46A1A] font-mono text-[#F5E6D3]"
                data-testid="input-frequency"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-[#A08060]">Device Type</Label>
              <Select value={data.deviceType} onValueChange={v => setData({...data, deviceType: v})}>
                <SelectTrigger className="bg-[#0D0705] border-[#8B4A0F]/30 text-[#F5E6D3]" data-testid="select-device">
                  <SelectValue placeholder="Select Device" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1008] border-[#8B4A0F]/50 text-[#F5E6D3]">
                  {['Mobile', 'Desktop', 'POS Terminal', 'ATM'].map(dev => (
                    <SelectItem key={dev} value={dev} className="focus:bg-[#8B4A0F]/20 focus:text-white">{dev}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label className="text-[#A08060]">Country</Label>
              <Select value={data.country} onValueChange={v => setData({...data, country: v})}>
                <SelectTrigger className="bg-[#0D0705] border-[#8B4A0F]/30 text-[#F5E6D3]" data-testid="select-country">
                  <SelectValue placeholder="Select Country" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1008] border-[#8B4A0F]/50 text-[#F5E6D3]">
                  {[
                    { val: 'US', label: '🇺🇸 United States' },
                    { val: 'UK', label: '🇬🇧 United Kingdom' },
                    { val: 'DE', label: '🇩🇪 Germany' },
                    { val: 'FR', label: '🇫🇷 France' },
                    { val: 'JP', label: '🇯🇵 Japan' },
                    { val: 'CN', label: '🇨🇳 China' },
                    { val: 'RU', label: '🇷🇺 Russia' },
                    { val: 'NG', label: '🇳🇬 Nigeria' },
                    { val: 'BR', label: '🇧🇷 Brazil' },
                    { val: 'MX', label: '🇲🇽 Mexico' },
                    { val: 'ZA', label: '🇿🇦 South Africa' },
                    { val: 'IN', label: '🇮🇳 India' }
                  ].map(c => (
                    <SelectItem key={c.val} value={c.val} className="focus:bg-[#8B4A0F]/20 focus:text-white">{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch 
                id="isFirst" 
                checked={data.isFirstTransaction} 
                onCheckedChange={v => setData({...data, isFirstTransaction: v})}
                className="data-[state=checked]:bg-[#C46A1A]"
                data-testid="switch-first-transaction"
              />
              <Label htmlFor="isFirst" className="text-[#A08060] cursor-pointer">Is First Transaction with Merchant?</Label>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full font-serif text-lg py-6 bg-gradient-to-r from-[#C46A1A] to-[#8B4A0F] text-white border border-[#FF8C3A]/50 shimmer-button hover:opacity-90 transition-opacity"
            data-testid="button-analyze"
          >
            Analyze Transaction
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
