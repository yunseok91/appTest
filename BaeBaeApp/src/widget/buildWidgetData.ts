import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CalendarWidgetData } from './BaeBaeWidget';

type Transaction = {
  type: 'expense' | 'income';
  amount: number;
  date: string;
  createdBy?: string;
};

export async function buildWidgetData(): Promise<CalendarWidgetData> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = now.getDate();
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const [txStr, myNameStr, partnerNameStr, myUidStr] = await Promise.all([
    AsyncStorage.getItem('@baebae_transactions'),
    AsyncStorage.getItem('@profile_myname'),
    AsyncStorage.getItem('@profile_partnername'),
    AsyncStorage.getItem('@baebae_last_uid'),
  ]);

  const transactions: Transaction[] = txStr ? JSON.parse(txStr) : [];
  const myUid = myUidStr ?? '';
  const monthTxs = transactions.filter(tx => tx.date.startsWith(monthStr));

  const days: CalendarWidgetData['days'] = {};
  for (const tx of monthTxs) {
    const dayNum = parseInt(tx.date.split('-')[2], 10);
    if (!days[dayNum]) {
      days[dayNum] = { myExpense: false, myIncome: false, partnerExpense: false, partnerIncome: false };
    }
    const isMine = !myUid || tx.createdBy === myUid;
    if (isMine) {
      if (tx.type === 'expense') days[dayNum].myExpense = true;
      else days[dayNum].myIncome = true;
    } else {
      if (tx.type === 'expense') days[dayNum].partnerExpense = true;
      else days[dayNum].partnerIncome = true;
    }
  }

  const myMonthlyExpense = monthTxs
    .filter(tx => tx.type === 'expense' && (!myUid || tx.createdBy === myUid))
    .reduce((s, tx) => s + tx.amount, 0);

  const partnerMonthlyExpense = monthTxs
    .filter(tx => tx.type === 'expense' && !!myUid && tx.createdBy !== myUid)
    .reduce((s, tx) => s + tx.amount, 0);

  return {
    year, month, firstDay, daysInMonth, today, days,
    myName: myNameStr || '나',
    partnerName: partnerNameStr || '파트너',
    myMonthlyExpense, partnerMonthlyExpense,
  };
}
