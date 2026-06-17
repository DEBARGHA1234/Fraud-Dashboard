export type Transaction = {
  id: string;
  amount: number;
  hour: number;
  distance: number;
  frequency: number;
  category: string;
  isFirstTransaction: boolean;
  deviceType: string;
  country: string;
  score: number;
  status: 'APPROVED' | 'REVIEW' | 'BLOCKED';
  timestamp: Date;
};

export type TransactionInput = {
  amount: number;
  category: string;
  hour: number;
  distance: number;
  frequency: number;
  deviceType: string;
  country: string;
  isFirstTransaction: boolean;
};
