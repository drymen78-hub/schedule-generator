import type { StaffMember, PositionRequirement } from '../types';

export const DEFAULT_LAUNDRY_STAFF: StaffMember[] = [
  { id: 'l1', name: '최성욱', team: 'laundry', positions: [] },
  { id: 'l2', name: '양성용', team: 'laundry', positions: [] },
  { id: 'l3', name: '신일상', team: 'laundry', positions: [] },
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

// ── 야간입고팀 ──────────────────────────────────────────────────────────────

export const DEFAULT_RECEIVING_STAFF: StaffMember[] = [
  // 관리자
  { id: 'rv-m1', name: '송윤정', team: 'receiving', positions: ['recv_sort'], part: '관리자' },
  { id: 'rv-m2', name: '우혜진', team: 'receiving', positions: ['recv_sort'], part: '관리자' },
  // 1파트
  { id: 'rv1-1', name: '박신은', team: 'receiving', positions: ['recv_sort'], part: '1파트' },
  { id: 'rv1-2', name: '서지현', team: 'receiving', positions: ['recv_sort'], part: '1파트' },
  { id: 'rv1-3', name: '이노영', team: 'receiving', positions: ['recv_sort'], part: '1파트' },
  { id: 'rv1-4', name: '정정훈', team: 'receiving', positions: ['recv_sort'], part: '1파트' },
  { id: 'rv1-5', name: '김재연', team: 'receiving', positions: ['recv_sort'], part: '1파트' },
  { id: 'rv1-6', name: '권주철', team: 'receiving', positions: ['recv_sort'], part: '1파트' },
  { id: 'rv1-7', name: '김영웅', team: 'receiving', positions: ['recv_sort'], part: '1파트' },
  { id: 'rv1-8', name: '옥민호', team: 'receiving', positions: ['recv_sort'], part: '1파트' },
  { id: 'rv1-9', name: '이상우', team: 'receiving', positions: ['recv_sort'], part: '1파트' },
  // 2파트
  { id: 'rv2-1',  name: '김지영', team: 'receiving', positions: ['recv_sort'], part: '2파트' },
  { id: 'rv2-2',  name: '김가윤', team: 'receiving', positions: ['recv_sort'], part: '2파트' },
  { id: 'rv2-3',  name: '김미경', team: 'receiving', positions: ['recv_sort'], part: '2파트' },
  { id: 'rv2-4',  name: '남유진', team: 'receiving', positions: ['recv_sort'], part: '2파트' },
  { id: 'rv2-5',  name: '김찬수', team: 'receiving', positions: ['recv_sort'], part: '2파트' },
  { id: 'rv2-6',  name: '위창범', team: 'receiving', positions: ['recv_sort'], part: '2파트' },
  { id: 'rv2-7',  name: '이희연', team: 'receiving', positions: ['recv_sort'], part: '2파트' },
  { id: 'rv2-8',  name: '박환상', team: 'receiving', positions: ['recv_sort'], part: '2파트' },
  { id: 'rv2-9',  name: '최정용', team: 'receiving', positions: ['recv_sort'], part: '2파트' },
  { id: 'rv2-10', name: '차선구', team: 'receiving', positions: ['recv_sort'], part: '2파트' },
  { id: 'rv2-11', name: '황태일', team: 'receiving', positions: ['recv_sort'], part: '2파트' },
];

export const DEFAULT_RECEIVING_POSITION_REQUIREMENTS: PositionRequirement[] = [
  { position: 'recv_moving',  label: '이동', min: 1, max: 2, color: 'E0F2FE' },
  { position: 'recv_rawwash', label: '생빨', min: 1, max: 2, color: 'FCE7F3' },
  { position: 'recv_living',  label: '리빙', min: 1, max: 1, color: 'DCFCE7' },
  // 분류는 나머지 전원 (min=0, max=99 → 자동 배정)
  { position: 'recv_sort',    label: '분류', min: 0, max: 99, color: 'F1F5F9' },
];

/** 요일별 목표 근무 인원 (총원 13.4명 기준 비율) — 0=일 ~ 6=토 */
export const DEFAULT_RECEIVING_DAILY_TARGETS: Record<number, number> = {
  0: 11.8,  // 일요일
  1: 11.9,  // 월요일
  2: 9.0,   // 화요일
  3: 8.05,  // 수요일
  4: 8.05,  // 목요일
  5: 8.05,  // 금요일
  6: 10.0,  // 토요일
};

// ── 포지션 레이블 (전체) ────────────────────────────────────────────────────

export const POSITION_LABELS: Record<string, string> = {
  // 개별클리닝
  classification: '분류',
  machine: '기계',
  wet: '웨트',
  dry: '건조',
  qc: 'QC',
  pretreat: '전처리',
  // 야간입고
  recv_moving:  '이동',
  recv_rawwash: '생빨',
  recv_living:  '리빙',
  recv_sort:    '분류',
};

export const CLEANING_POSITION_KEYS = ['classification', 'machine', 'wet', 'dry', 'qc', 'pretreat'] as const;
export const RECEIVING_POSITION_KEYS = ['recv_moving', 'recv_rawwash', 'recv_living', 'recv_sort'] as const;

export const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
