import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';

export type WidgetData = {
  monthlyExpense: number;
  monthlyIncome: number;
  budget: number;
  monthLabel: string;
  householdName: string;
};

const PRIMARY = '#4CAF7D';
const TEXT = '#1A1918';
const TEXT_SECONDARY = '#8A8480';
const CANVAS = '#F0EDE8';
const CARD = '#FFFFFF';
const DANGER = '#E05C5C';

export function BaeBaeWidget({ data }: { data: WidgetData }) {
  const { monthlyExpense, monthlyIncome, budget, monthLabel, householdName } = data;
  const hasBudget = budget > 0;
  const budgetPct = hasBudget ? Math.min(Math.round((monthlyExpense / budget) * 100), 100) : 0;
  const remaining = budget - monthlyExpense;
  const isOver = hasBudget && monthlyExpense > budget;
  const barColor = isOver ? DANGER : PRIMARY;

  return (
    <FlexWidget
      style={{
        flex: 1,
        flexDirection: 'column',
        backgroundColor: CARD,
        borderRadius: 20,
        padding: 16,
        justifyContent: 'space-between',
      }}
      clickAction="OPEN_APP"
    >
      {/* 헤더 */}
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget
            text="♥ "
            style={{ fontSize: 13, color: PRIMARY }}
          />
          <TextWidget
            text={householdName || '배배'}
            style={{ fontSize: 13, fontWeight: 'bold', color: TEXT }}
          />
        </FlexWidget>
        <TextWidget
          text={monthLabel}
          style={{ fontSize: 11, color: TEXT_SECONDARY }}
        />
      </FlexWidget>

      {/* 지출 금액 */}
      <FlexWidget style={{ flexDirection: 'column', marginTop: 4 }}>
        <TextWidget
          text="이번 달 지출"
          style={{ fontSize: 11, color: TEXT_SECONDARY }}
        />
        <TextWidget
          text={`₩${monthlyExpense.toLocaleString('ko-KR')}`}
          style={{ fontSize: 22, fontWeight: 'bold', color: isOver ? DANGER : TEXT }}
        />
      </FlexWidget>

      {/* 예산 바 or 수입 표시 */}
      {hasBudget ? (
        <FlexWidget style={{ flexDirection: 'column', marginTop: 6 }}>
          {/* 진행 바 배경 */}
          <FlexWidget style={{ height: 6, backgroundColor: CANVAS, borderRadius: 3, flexDirection: 'row' }}>
            <FlexWidget
              style={{
                flex: budgetPct,
                height: 6,
                backgroundColor: barColor,
                borderRadius: 3,
              }}
            />
            <FlexWidget style={{ flex: 100 - budgetPct, height: 6 }} />
          </FlexWidget>
          <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TextWidget
              text={isOver ? '예산 초과!' : `${budgetPct}% 사용`}
              style={{ fontSize: 10, color: isOver ? DANGER : TEXT_SECONDARY }}
            />
            <TextWidget
              text={isOver ? `-₩${Math.abs(remaining).toLocaleString('ko-KR')}` : `₩${remaining.toLocaleString('ko-KR')} 남음`}
              style={{ fontSize: 10, color: isOver ? DANGER : PRIMARY, fontWeight: 'bold' }}
            />
          </FlexWidget>
        </FlexWidget>
      ) : (
        <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <FlexWidget style={{ flexDirection: 'column' }}>
            <TextWidget text="수입" style={{ fontSize: 10, color: TEXT_SECONDARY }} />
            <TextWidget
              text={`₩${monthlyIncome.toLocaleString('ko-KR')}`}
              style={{ fontSize: 12, fontWeight: 'bold', color: PRIMARY }}
            />
          </FlexWidget>
          <FlexWidget style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
            <TextWidget text="잔액" style={{ fontSize: 10, color: TEXT_SECONDARY }} />
            <TextWidget
              text={`₩${(monthlyIncome - monthlyExpense).toLocaleString('ko-KR')}`}
              style={{ fontSize: 12, fontWeight: 'bold', color: TEXT }}
            />
          </FlexWidget>
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
