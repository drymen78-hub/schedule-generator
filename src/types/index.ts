export type TeamType = 'laundry' | 'cleaning';
export type DayStatus = 'work' | 'off' | 'requested';   // requested = 희망휴무
export type Position = 'classification' | 'machine' | 'wet' | 'dry' | 'qc' | 'pretreat';

export interface StaffMember {
  id: string;
  name: string;
  team: TeamType;
  positions: Position[];          // 가능한 포지션 (우선순위 순)
  mustWorkDays?: number[];        // 반드시 근무 요일 (0=일,1=월,...,6=토)
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
  position?: Position;  // cleaning team 근무일에만
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
  validationIssues: ValidationIssue[];
}

export interface ValidationIssue {
  level: 'error' | 'warn';
  message: string;
}

/**
 * 전월 마지막 주 금/토 휴무 현황
 * 주52시간 준수를 위해 당월 첫 주 배정에 반영
 * key = staffId, value = 'fri' | 'sat' | 'both' | 'none'
 */
export type PrevWeekOff = 'none' | 'fri' | 'sat' | 'both';

export interface ScheduleConfig {
  year: number;
  month: number;
  laundryOffDays: number;
  cleaningOffDays: number;
  laundryStaff: StaffMember[];
  cleaningStaff: StaffMember[];
  positionRequirements: PositionRequirement[];
  requestedLeaves: Record<string, string[]>;    // staffId → 'YYYY-MM-DD'[]
  prevMonthLastWeek?: Record<string, PrevWeekOff>; // staffId → 전월 마지막주 금/토 현황
}
