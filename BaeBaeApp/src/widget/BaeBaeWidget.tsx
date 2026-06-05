import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { ColorProp } from 'react-native-android-widget/lib/typescript/widgets/utils/style.props';

const PRIMARY    = '#3D8A5A';
const HDR_BG     = '#3D8A5A';
const DAY_BG     = '#2D6E47';
const CARD_BG    = '#FFFFFF';
const FOOTER_BG  = '#EDEBE5';
const TEXT_MAIN  = '#1A1918';
const TEXT_MUTED = '#8A8480';
const TEXT_SUN   = '#D95F4B';
const TEXT_SAT   = '#3D8A5A';
const ME_COLOR   = '#6B9EC7';
const PTR_COLOR  = '#C97B8A';

type DayData = {
  myExpense: boolean;
  myIncome: boolean;
  partnerExpense: boolean;
  partnerIncome: boolean;
};

export type CalendarWidgetData = {
  year: number;
  month: number;
  firstDay: number;
  daysInMonth: number;
  today: number;
  days: { [day: number]: DayData };
  myName: string;
  partnerName: string;
  myMonthlyExpense: number;
  partnerMonthlyExpense: number;
};

function FilledDot({ color }: { color: ColorProp }) {
  return <FlexWidget style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color }} />;
}

function RingDot({ color }: { color: ColorProp }) {
  return (
    <FlexWidget style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color, justifyContent: 'center', alignItems: 'center' }}>
      <FlexWidget style={{ width: 2, height: 2, borderRadius: 2, backgroundColor: CARD_BG }} />
    </FlexWidget>
  );
}

function DateCell({ day, isToday, data, isSun, isSat }: {
  day: number | null;
  isToday: boolean;
  data?: DayData;
  isSun: boolean;
  isSat: boolean;
}) {
  const hasDots = !!data && (data.myExpense || data.myIncome || data.partnerExpense || data.partnerIncome);

  return (
    <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      {day == null ? null : isToday ? (
        <FlexWidget style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center' }}>
          <TextWidget text={String(day)} style={{ fontSize: 11, fontWeight: 'bold', color: '#FFFFFF' }} />
        </FlexWidget>
      ) : (
        <TextWidget
          text={String(day)}
          style={{ fontSize: 11, fontWeight: '500', color: isSun ? TEXT_SUN : isSat ? TEXT_SAT : TEXT_MAIN }}
        />
      )}
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', height: 7 }}>
        {hasDots && data ? (
          <>
            {data.myExpense && <FilledDot color={ME_COLOR} />}
            {data.myIncome && !data.myExpense && <RingDot color={ME_COLOR} />}
            {(data.partnerExpense || data.partnerIncome) && <FlexWidget style={{ width: 2 }} />}
            {data.partnerExpense && <FilledDot color={PTR_COLOR} />}
            {data.partnerIncome && !data.partnerExpense && <RingDot color={PTR_COLOR} />}
          </>
        ) : null}
      </FlexWidget>
    </FlexWidget>
  );
}

export function BaeBaeCalendarWidget({ data }: { data: CalendarWidgetData }) {
  const { year, month, firstDay, daysInMonth, today, days, myName, partnerName, myMonthlyExpense, partnerMonthlyExpense } = data;

  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
  const DAY_COLORS: ColorProp[] = [TEXT_SUN, TEXT_MUTED, TEXT_MUTED, TEXT_MUTED, TEXT_MUTED, TEXT_MUTED, TEXT_SAT];

  return (
    <FlexWidget
      style={{ flex: 1, flexDirection: 'column', backgroundColor: FOOTER_BG, borderRadius: 20 }}
      clickAction="OPEN_APP"
    >
      {/* 헤더 */}
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: HDR_BG, borderRadius: 16, paddingLeft: 14, paddingRight: 14, height: 44 }}>
        <FlexWidget style={{ flex: 1 }}>
          <TextWidget text={`${month}월 ${year}`} style={{ fontSize: 13, fontWeight: 'bold', color: '#FFFFFF' }} />
        </FlexWidget>
      </FlexWidget>

      {/* 요일 */}
      <FlexWidget style={{ flexDirection: 'row', backgroundColor: DAY_BG, height: 26, alignItems: 'center', paddingLeft: 4, paddingRight: 4 }}>
        {DAY_LABELS.map((d, i) => (
          <FlexWidget key={i} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <TextWidget text={d} style={{ fontSize: 9, fontWeight: '600', color: DAY_COLORS[i] }} />
          </FlexWidget>
        ))}
      </FlexWidget>

      {/* 캘린더 그리드 */}
      <FlexWidget style={{ flex: 1, flexDirection: 'column', backgroundColor: CARD_BG, paddingLeft: 2, paddingRight: 2, paddingTop: 2, paddingBottom: 2 }}>
        {weeks.map((week, wi) => (
          <FlexWidget key={wi} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            {week.map((day, di) => (
              <DateCell
                key={di}
                day={day}
                isToday={day === today}
                data={day != null ? days[day] : undefined}
                isSun={di === 0}
                isSat={di === 6}
              />
            ))}
          </FlexWidget>
        ))}
      </FlexWidget>

      {/* 하단 요약 */}
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: FOOTER_BG, borderRadius: 16, paddingLeft: 12, paddingRight: 12, height: 42 }}>
        <FlexWidget style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: ME_COLOR }} />
        <FlexWidget style={{ width: 5 }} />
        <TextWidget text={myName || '나'} style={{ fontSize: 10, color: TEXT_MUTED }} />
        <FlexWidget style={{ flex: 1 }} />
        <TextWidget text={`-₩${myMonthlyExpense.toLocaleString('ko-KR')}`} style={{ fontSize: 11, fontWeight: 'bold', color: ME_COLOR }} />
        <FlexWidget style={{ width: 12 }} />
        <FlexWidget style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: PTR_COLOR }} />
        <FlexWidget style={{ width: 5 }} />
        <TextWidget text={partnerName || '파트너'} style={{ fontSize: 10, color: TEXT_MUTED }} />
        <FlexWidget style={{ flex: 1 }} />
        <TextWidget text={`-₩${partnerMonthlyExpense.toLocaleString('ko-KR')}`} style={{ fontSize: 11, fontWeight: 'bold', color: PTR_COLOR }} />
      </FlexWidget>
    </FlexWidget>
  );
}
