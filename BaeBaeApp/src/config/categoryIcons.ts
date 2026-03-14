export type Category = {
  key: string;
  label: string;
  icon: string;
  iconColor: string;
  bgColor: string;
};

export const EXPENSE_CATEGORIES: Category[] = [
  { key: 'food',      label: '식비',    icon: 'restaurant-outline',   iconColor: '#E8956D', bgColor: '#FDF2EC' },
  { key: 'transport', label: '교통',    icon: 'bus-outline',           iconColor: '#6B9EC7', bgColor: '#EBF4FB' },
  { key: 'shopping',  label: '쇼핑',    icon: 'bag-handle-outline',    iconColor: '#B87BA5', bgColor: '#F7EEF5' },
  { key: 'culture',   label: '문화/여가', icon: 'film-outline',         iconColor: '#7C8FC5', bgColor: '#EEF1FA' },
  { key: 'beauty',    label: '미용/관리', icon: 'color-wand-outline',   iconColor: '#E8A0B5', bgColor: '#FEF0F4' },
  { key: 'health',    label: '운동',    icon: 'bicycle-outline',       iconColor: '#6DAF7E', bgColor: '#EDF7F0' },
  { key: 'housing',   label: '주거/통신', icon: 'home-outline',         iconColor: '#8AA5B8', bgColor: '#EBF2F7' },
  { key: 'etc',       label: '기타',    icon: 'ellipsis-horizontal-outline', iconColor: '#A09585', bgColor: '#F5F2EF' },
];

export const INCOME_CATEGORIES: Category[] = [
  { key: 'salary',    label: '급여',    icon: 'briefcase-outline',     iconColor: '#3A8A5A', bgColor: '#EDF7F0' },
  { key: 'allowance', label: '용돈',    icon: 'gift-outline',          iconColor: '#E8956D', bgColor: '#FDF2EC' },
  { key: 'part_time', label: '부업',    icon: 'laptop-outline',        iconColor: '#6B9EC7', bgColor: '#EBF4FB' },
  { key: 'transfer',  label: '이체',    icon: 'swap-horizontal-outline', iconColor: '#7C8FC5', bgColor: '#EEF1FA' },
  { key: 'etc',       label: '기타',    icon: 'ellipsis-horizontal-outline', iconColor: '#A09585', bgColor: '#F5F2EF' },
];
