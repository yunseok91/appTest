export type Category = {
  key: string;
  label: string;
  icon: string;
  iconColor: string;
  bgColor: string;
};

export const EXPENSE_CATEGORIES: Category[] = [
  { key: 'food',       label: '식비',      icon: 'restaurant-outline',         iconColor: '#E8956D', bgColor: '#FDF2EC' },
  { key: 'transport',  label: '교통',      icon: 'bus-outline',                iconColor: '#6B9EC7', bgColor: '#EBF4FB' },
  { key: 'shopping',   label: '쇼핑',      icon: 'bag-handle-outline',         iconColor: '#B87BA5', bgColor: '#F7EEF5' },
  { key: 'health',     label: '의료/건강', icon: 'medkit-outline',             iconColor: '#E8736D', bgColor: '#FDECEA' },
  { key: 'culture',    label: '문화/여가', icon: 'film-outline',               iconColor: '#7C8FC5', bgColor: '#EEF1FA' },
  { key: 'travel',     label: '여행',      icon: 'airplane-outline',           iconColor: '#5A8FA8', bgColor: '#E8F2F8' },
  { key: 'utility',    label: '공과금',    icon: 'flash-outline',              iconColor: '#D4A84B', bgColor: '#FBF5E8' },
  { key: 'education',  label: '교육',      icon: 'book-outline',               iconColor: '#5A8F78', bgColor: '#E8F5EE' },
  { key: 'insurance',  label: '보험',      icon: 'shield-outline',             iconColor: '#4A8AB5', bgColor: '#E8F2F8' },
  { key: 'beauty',     label: '미용/관리', icon: 'color-wand-outline',         iconColor: '#E8A0B5', bgColor: '#FEF0F4' },
  { key: 'exercise',   label: '운동',      icon: 'bicycle-outline',            iconColor: '#6DAF7E', bgColor: '#EDF7F0' },
  { key: 'pet',        label: '반려동물',  icon: 'paw-outline',                iconColor: '#C4956D', bgColor: '#F9F1E8' },
  { key: 'gift',       label: '선물/경조사', icon: 'gift-outline',             iconColor: '#A87BA5', bgColor: '#F5EEF5' },
  { key: 'telecom',    label: '통신',      icon: 'phone-portrait-outline',     iconColor: '#6B9EC7', bgColor: '#EBF4FB' },
  { key: 'housing',    label: '주거',      icon: 'home-outline',               iconColor: '#5A8FA8', bgColor: '#E8F2F8' },
  { key: 'daily',      label: '생활/생필품', icon: 'basket-outline',           iconColor: '#3A8A5A', bgColor: '#E8F5EE' },
  { key: 'savings',    label: '저축/투자', icon: 'wallet-outline',             iconColor: '#2A7A4A', bgColor: '#EAF6EE' },
  { key: 'childcare',  label: '육아/자녀', icon: 'happy-outline',              iconColor: '#E8A0B5', bgColor: '#FEF0F4' },
  { key: 'etc',        label: '기타',      icon: 'ellipsis-horizontal-outline', iconColor: '#999999', bgColor: '#F0EFEC' },
];

export const INCOME_CATEGORIES: Category[] = [
  { key: 'salary',    label: '급여',    icon: 'briefcase-outline',       iconColor: '#3A8A5A', bgColor: '#EDF7F0' },
  { key: 'allowance', label: '용돈',    icon: 'gift-outline',            iconColor: '#E8956D', bgColor: '#FDF2EC' },
  { key: 'part_time', label: '부업',    icon: 'laptop-outline',          iconColor: '#6B9EC7', bgColor: '#EBF4FB' },
  { key: 'transfer',  label: '이체',    icon: 'swap-horizontal-outline', iconColor: '#7C8FC5', bgColor: '#EEF1FA' },
  { key: 'etc',       label: '기타',    icon: 'ellipsis-horizontal-outline', iconColor: '#A09585', bgColor: '#F5F2EF' },
];
