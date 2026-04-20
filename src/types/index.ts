export type TeamType = 'laundry' | 'cleaning' | 'receiving';
export type DayStatus = 'work' | 'off' | 'requested';   // requested = 휴무지정
export type Position =
  | 'classification' | 'machine' | 'wet' | 'dry' | 'qc' | 'pretreat'  // 개별클리닝
  | 'recv_moving' | 'recv_rawwash' | 'recv_living' | 'recv_sort';       // 야간입고

export type SkillLevel = 'high' | 'mid' | 'low';

export type OffPattern = 'consecutive' | 'spread';  // 연속선호 | 분산선호

export interface StaffMember {
  id: string;
  name: string;
  team: TeamType;
  positions: Position[];
  skillLevel?: SkillLevel;
  part?: string;        // 야간입고팀: '관리자' | '1파트' | '2파트'
  offPattern?: OffPattern; // 개인 휴무 패턴 선호
}

export interface PositionRequirement {
  position: Position;
  label: string;
  min: number;
  max: number;
  color: string;   // Excel 셀 색상 (hex)
}

export interface DayAssignment {
  status: DayStatus;
  position?: Position;
}

export interface PersonSchedule {
  staffId: string;
  assignments: Record<string, DayAssignment>;   // 'YYYY-MM-DD' → assignment
}

export interface MonthSchedule {
  year: number;
  month: number;
  laundry: PersonSchedule[];
  cleaning: PersonSchedule[];
  receiving?: PersonSchedule[];
  validationIssues: ValidationIssue[];
}

export interface ValidationIssue {
  level: 'error' | 'warn';
  message: string;
}

export interface ScheduleConfig {
  year: number;
  month: number;
  laundryOffDays: number;
  cleaningOffDays: number;
  laundryStaff: StaffMember[];
  cleaningStaff: StaffMember[];
  positionRequirements: PositionRequirement[];
  requestedLeaves: Record<string, string[]>;    // staffId → 'YYYY-MM-DD'[]
  requestedWorks:  Record<string, string[]>;    // staffId → 근무 지정일 'YYYY-MM-DD'[]
  prevWeekNeeded?: Record<string, number>;
  // ── 야간입고팀 ──────────────────────────────────────────────────────────────
  receivingStaff?: StaffMember[];
  receivingOffDays?: number;                       // 야간입고팀 월 휴무일수
  receivingPositionRequirements?: PositionRequirement[];
  receivingDailyTargets?: Record<number, number>;  // 0(일)~6(토) → 목표 근무 인원 (알고리즘용)
}
