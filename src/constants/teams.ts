import type { StaffMember, PositionRequirement } from '../types';

export const DEFAULT_LAUNDRY_STAFF: StaffMember[] = [
  { id: 'l1', name: '최성욱', team: 'laundry', positions: [] },
  { id: 'l2', name: '양성용', team: 'laundry', positions: [] },
  { id: 'l3', name: '신일상', team: 'laundry', positions: [], mustWorkDays: [3, 6] }, // 수=3, 토=6
  { id: 'l4', name: '김록',   team: 'laundry', positions: [] },
  { id: 'l5', name: '김영진', team: 'laundry', positions: [] },
  { id: 'l6', name: '이종찬', team: 'laundry', positions: [] },
];

// 포지션 우선순위: 배열 앞 = 높은 우선순위 (생산성 순)
export const DEFAULT_CLEANING_STAFF: StaffMember[] = [
  { id: 'c1',  name: '김외대', team: 'cleaning', positions: ['classification', 'machine'] },
  { id: 'c2',  name: '이성환', team: 'cleaning', positions: ['machine', 'classification'] },
  { id: 'c3',  name: '유이수', team: 'cleaning', positions: ['classification'] },
  { id: 'c4',  name: '김삼남', team: 'cleaning', positions: ['classification'] },
  { id: 'c5',  name: '이형만', team: 'cleaning', positions: ['classification'] },
  { id: 'c6',  name: '강형수', team: 'cleaning', positions: ['wet', 'classification'] },
  { id: 'c7',  name: '최점용', team: 'cleaning', positions: ['wet'] },
  { id: 'c8',  name: '소성은', team: 'cleaning', positions: ['dry'] },
  { id: 'c9',  name: '오창걸', team: 'cleaning', positions: ['machine', 'pretreat'] },
  { id: 'c10', name: '박권영', team: 'cleaning', positions: ['dry'] },
  { id: 'c11', name: '최민하', team: 'cleaning', positions: ['qc'] },
  { id: 'c12', name: '레사',   team: 'cleaning', positions: ['qc', 'pretreat'] },
];

export const DEFAULT_POSITION_REQUIREMENTS: PositionRequirement[] = [
  { position: 'classification', label: '분류',   min: 2, max: 3, color: 'DBEAFE' },
  { position: 'machine',        label: '기계',   min: 1, max: 2, color: 'E0E7FF' },
  { position: 'wet',            label: '웨트',   min: 1, max: 1, color: 'CFFAFE' },
  { position: 'dry',            label: '건조',   min: 1, max: 1, color: 'DCFCE7' },
  { position: 'qc',             label: 'QC',     min: 1, max: 2, color: 'FEF9C3' },
  { position: 'pretreat',       label: '전처리', min: 1, max: 1, color: 'FCE7F3' },
];

export const POSITION_LABELS: Record<string, string> = {
  classification: '분류',
  machine: '기계',
  wet: '웨트',
  dry: '건조',
  qc: 'QC',
  pretreat: '전처리',
};

export const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
