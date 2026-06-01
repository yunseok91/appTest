import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BaeBaeWidget } from './BaeBaeWidget';

type Transaction = {
  type: 'expense' | 'income';
  amount: number;
  date: string;
};

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const action = props.widgetAction;

  if (
    action === 'WIDGET_ADDED' ||
    action === 'WIDGET_UPDATE' ||
    action === 'WIDGET_RESIZED'
  ) {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;

    const [txStr, budgetStr, nameStr] = await Promise.all([
      AsyncStorage.getItem('@baebae_transactions'),
      AsyncStorage.getItem('@profile_budget'),
      AsyncStorage.getItem('@profile_myname'),
    ]);

    const transactions: Transaction[] = txStr ? JSON.parse(txStr) : [];
    const budget = budgetStr ? Number(budgetStr) : 0;
    const myName = nameStr ?? '';

    const monthlyExpense = transactions
      .filter(tx => tx.type === 'expense' && tx.date.startsWith(monthStr))
      .reduce((s, tx) => s + tx.amount, 0);

    const monthlyIncome = transactions
      .filter(tx => tx.type === 'income' && tx.date.startsWith(monthStr))
      .reduce((s, tx) => s + tx.amount, 0);

    props.renderWidget(
      React.createElement(BaeBaeWidget, {
        data: {
          monthlyExpense,
          monthlyIncome,
          budget,
          monthLabel,
          householdName: myName || '배배',
        },
      }),
    );
  }
}
