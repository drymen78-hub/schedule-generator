import type {
  ScheduleConfig, MonthSchedule, PersonSchedule,
  DayAssignment, DayStatus, StaffMember, Position, ValidationIssue, PrevWeekOff,
} from '../types';
import { getDatesInMonth, toDateStr, dow, groupByWeek } from './dateUtils';

/**
 * 전월 마지막 주 금/토 휴무 데이터를 기반으로
 * 당월 첫 주 금/토에 부족분을 자동 배정할 인원을 계산합니다.
 * (주52시간 법정기준: 금~토 구간 2개 휴무 보장)
 *
 * prevWeek[staffId] = 'none' | 'fri' | 'sat' | 'both'
 * 반환: staffId → 당월 첫 주에 추가로 쉬어야 할 요일 ('fri' | 'sat' | 'both' | null)
 */
export function calcFirstWeekCompensation(
  staff: StaffMember[],
  prevWeek: Record<string, PrevWeekOff>,
): Record<string, ('fri' | 'sat')[]> {
  const result: Record<string, ('fri' | 'sat')[]> = {};
  staff.forEach(p => {
    const prev = prevWeek[p.id] ?? 'none';
    const needed: ('fri' | 'sat')[] = [];
    if (prev === 'none') {
      // 전월에 금/토 모두 안 쉰 경우 → 당월 첫 주에 금 또는 토 1개 우선 배정
      needed.push('fri');
    } else if (prev === 'fri') {
      // 금만 쉬었으면 → 토 추가
      needed.push('sat');
    } else if (prev === 'sat') {
      // 토만 쉬었으면 → 금 추가
      needed.push('fri');
    }
    // 'both'이면 이미 충족
    if (needed.length > 0) result[p.id] = needed;
  });
  return result;
}

// ─── 오프데이 배분 ──────────────────────────────────────────────────────────

function assignOffDays(
  staff: StaffMember[],
  dates: Date[],
  offCount: number,
  requestedLeaves: Record<string, string[]>,
  issues: ValidationIssue[],
  config?: ScheduleConfig,
): Record<string, Set<string>> {   // staffId → off date strings

  const offMap: Record<string, Set<string>> = {};
  const budget: Record<string, number> = {};
  staff.forEach(p => { offMap[p.id] = new Set(); budget[p.id] = offCount; });

  const mustWorkSet: Record<string, Set<string>> = {};
  staff.forEach(p => {
    mustWorkSet[p.id] = new Set(
      (p.mustWorkDays ?? []).flatMap(dw =>
        dates.filter(d => dow(d) === dw).map(toDateStr)
      )
    );
  });

  const canBeOff = (personId: string, ds: string) =>
    !mustWorkSet[personId]?.has(ds) && !offMap[personId].has(ds) && budget[personId] > 0;

  const markOff = (personId: string, ds: string, status?: DayStatus) => {
    offMap[personId].add(ds);
    budget[personId]--;
    // store requested flag separately if needed (handled in buildSchedule)
    void status;
  };

  const offCountOnDay = (ds: string) =>
    staff.filter(p => offMap[p.id].has(ds)).length;

  // ── Step 0: 전월 연속성 보상 (첫 주 금/토 우선 배정) ─────────────────────
  if (config && config.prevMonthLastWeek) {
    const compensation = calcFirstWeekCompensation(staff, config.prevMonthLastWeek);
    const firstWeek = groupByWeek(dates)[0] ?? [];
    const firstFri = firstWeek.find(d => dow(d) === 5);
    const firstSat = firstWeek.find(d => dow(d) === 6);

    Object.entries(compensation).forEach(([staffId, days]) => {
      days.forEach(day => {
        const target = day === 'fri' ? firstFri : firstSat;
        if (!target) return;
        const ds = toDateStr(target);
        if (canBeOff(staffId, ds)) markOff(staffId, ds);
      });
    });
  }

  // ── Step 1: 희망휴무 적용 ─────────────────────────────────────────────────
  staff.forEach(p => {
    const req = requestedLeaves[p.id] ?? [];
    req.forEach(ds => {
      if (canBeOff(p.id, ds)) markOff(p.id, ds, 'requested');
      else if (mustWorkSet[p.id]?.has(ds)) {
        issues.push({ level: 'warn', message: `${p.name}: ${ds} 희망휴무가 고정근무(수/토)와 겹쳐 제외됨` });
      }
    });
  });

  // ── Step 2: 금/토 각 2명 휴무 보장 ────────────────────────────────────────
  const fridays = dates.filter(d => dow(d) === 5).map(toDateStr);
  const saturdays = dates.filter(d => dow(d) === 6).map(toDateStr);

  [...fridays, ...saturdays].forEach(ds => {
    const current = offCountOnDay(ds);
    const needed = 2 - current;
    if (needed <= 0) return;

    const candidates = staff
      .filter(p => canBeOff(p.id, ds))
      .sort((a, b) => budget[b.id] - budget[a.id])   // 잔여 많은 순
      .slice(0, needed);

    if (candidates.length < needed) {
      issues.push({ level: 'warn', message: `${ds}: 금/토 2명 휴무 부족 (가능 ${candidates.length}명)` });
    }
    candidates.forEach(p => markOff(p.id, ds));
  });

  // ── Step 3: 나머지 휴무 분산 ──────────────────────────────────────────────
  const weeks = groupByWeek(dates);

  // 잔여 많은 순으로 배분
  const sorted = [...staff].sort((a, b) => budget[b.id] - budget[a.id]);

  sorted.forEach(p => {
    weeks.forEach(week => {
      if (budget[p.id] <= 0) return;

      // 이번 주에서 이미 쉬는 날이 몇 개인지 확인 (주당 1~2개 제한)
      const alreadyOffThisWeek = week.filter(d => offMap[p.id].has(toDateStr(d))).length;
      const weeklyLimit = Math.ceil(offCount / weeks.length) + 1;
      if (alreadyOffThisWeek >= weeklyLimit) return;

      // 이 주에서 쉴 수 있는 날 (비선호 순: 월·화·목·수·일 우선, 금·토는 이미 2명이면 스킵)
      const eligible = week
        .map(toDateStr)
        .filter(ds => canBeOff(p.id, ds))
        .filter(ds => {
          // 금/토는 이미 2명 이상 쉬면 추가 배정 지양
          const d = dow(new Date(ds));
          if (d === 5 || d === 6) return offCountOnDay(ds) < 2;
          return true;
        })
        .sort((a, b) => offCountOnDay(a) - offCountOnDay(b));  // 적게 쉬는 날 우선

      if (eligible.length > 0) markOff(p.id, eligible[0]);
    });
  });

  // 잔여 있으면 아무 날이나
  staff.forEach(p => {
    if (budget[p.id] <= 0) return;
    const all = dates.map(toDateStr)
      .filter(ds => canBeOff(p.id, ds))
      .sort((a, b) => offCountOnDay(a) - offCountOnDay(b));
    all.forEach(ds => {
      if (budget[p.id] <= 0) return;
      markOff(p.id, ds);
    });
    if (budget[p.id] > 0) {
      issues.push({ level: 'warn', message: `${p.name}: 휴무 ${budget[p.id]}일 미배정 (날짜 부족)` });
    }
  });

  return offMap;
}

// ─── 클리닝팀 포지션 배정 ──────────────────────────────────────────────────

function assignPositions(
  workingStaff: StaffMember[],
  requirements: ScheduleConfig['positionRequirements'],
  issues: ValidationIssue[],
  dateStr: string,
): Record<string, Position | '기타'> {
  const result: Record<string, Position | '기타'> = {};
  const assigned = new Set<string>();

  // 제약이 강한 포지션부터 배정 (가능 인원 적은 순)
  const reqSorted = [...requirements].sort((a, b) => {
    const aEligible = workingStaff.filter(p => p.positions.includes(a.position)).length;
    const bEligible = workingStaff.filter(p => p.positions.includes(b.position)).length;
    return aEligible - bEligible;
  });

  const posCount = (pos: Position) =>
    Object.values(result).filter(v => v === pos).length;

  reqSorted.forEach(req => {
    const eligible = workingStaff
      .filter(p => p.positions.includes(req.position) && !assigned.has(p.id))
      .sort((a, b) => a.positions.indexOf(req.position) - b.positions.indexOf(req.position));

    for (let i = 0; i < req.min; i++) {
      if (eligible[i]) {
        result[eligible[i].id] = req.position;
        assigned.add(eligible[i].id);
      } else {
        issues.push({ level: 'error', message: `${dateStr}: ${req.label} 포지션 최소 인원 미달 (필요 ${req.min}, 가능 ${eligible.length})` });
      }
    }
  });

  // 배정 안 된 인원 → 남은 max 슬롯에 배정
  workingStaff.filter(p => !assigned.has(p.id)).forEach(p => {
    for (const pos of p.positions as Position[]) {
      const req = requirements.find(r => r.position === pos);
      if (req && posCount(pos) < req.max) {
        result[p.id] = pos;
        assigned.add(p.id);
        break;
      }
    }
    if (!assigned.has(p.id)) {
      result[p.id] = '기타';
      assigned.add(p.id);
    }
  });

  return result;
}

// ─── 메인 스케줄 생성 ──────────────────────────────────────────────────────

export function generateSchedule(config: ScheduleConfig): MonthSchedule {
  const issues: ValidationIssue[] = [];
  const dates = getDatesInMonth(config.year, config.month);

  // ── 런드리팀 ─────────────────────────────────────────────────────────────
  const laundryOffMap = assignOffDays(
    config.laundryStaff, dates, config.laundryOffDays,
    config.requestedLeaves, issues, config,
  );

  const laundrySchedule: PersonSchedule[] = config.laundryStaff.map(p => ({
    staffId: p.id,
    assignments: Object.fromEntries(
      dates.map(d => {
        const ds = toDateStr(d);
        const isOff = laundryOffMap[p.id].has(ds);
        const isReq = isOff && (config.requestedLeaves[p.id] ?? []).includes(ds);
        return [ds, { status: isOff ? (isReq ? 'requested' : 'off') : 'work' } as DayAssignment];
      })
    ),
  }));

  // ── 클리닝팀 ─────────────────────────────────────────────────────────────
  const cleaningOffMap = assignOffDays(
    config.cleaningStaff, dates, config.cleaningOffDays,
    config.requestedLeaves, issues, config,
  );

  // 날짜별 근무자 포지션 배정
  const positionsByDate: Record<string, Record<string, Position | '기타'>> = {};
  dates.forEach(d => {
    const ds = toDateStr(d);
    const working = config.cleaningStaff.filter(p => !cleaningOffMap[p.id].has(ds));
    positionsByDate[ds] = assignPositions(working, config.positionRequirements, issues, ds);
  });

  const cleaningSchedule: PersonSchedule[] = config.cleaningStaff.map(p => ({
    staffId: p.id,
    assignments: Object.fromEntries(
      dates.map(d => {
        const ds = toDateStr(d);
        const isOff = cleaningOffMap[p.id].has(ds);
        const isReq = isOff && (config.requestedLeaves[p.id] ?? []).includes(ds);
        const position = !isOff ? (positionsByDate[ds]?.[p.id] as Position | undefined) : undefined;
        return [ds, { status: isOff ? (isReq ? 'requested' : 'off') : 'work', position } as DayAssignment];
      })
    ),
  }));

  // ── 검증 ─────────────────────────────────────────────────────────────────
  // 매일 동일 인원 유지 체크
  const dailyLaundry = dates.map(d => {
    const ds = toDateStr(d);
    return config.laundryStaff.filter(p => !laundryOffMap[p.id].has(ds)).length;
  });
  const lMin = Math.min(...dailyLaundry), lMax = Math.max(...dailyLaundry);
  if (lMax - lMin > 2) {
    issues.push({ level: 'warn', message: `런드리팀 일별 인원 편차 ${lMax - lMin}명 (${lMin}~${lMax}명)` });
  }

  return {
    year: config.year,
    month: config.month,
    laundry: laundrySchedule,
    cleaning: cleaningSchedule,
    validationIssues: issues,
  };
}

// ─── 통계 ──────────────────────────────────────────────────────────────────

export interface ScheduleStats {
  staffId: string;
  name: string;
  team: string;
  workDays: number;
  offDays: number;
  requestedOffDays: number;
  positions: Partial<Record<Position | '기타', number>>;
}

export function computeStats(schedule: MonthSchedule, config: ScheduleConfig): ScheduleStats[] {
  const allStaff = [...config.laundryStaff, ...config.cleaningStaff];
  const allSchedules = [...schedule.laundry, ...schedule.cleaning];

  return allSchedules.map(ps => {
    const staff = allStaff.find(s => s.id === ps.staffId)!;
    const days = Object.values(ps.assignments);
    const workDays = days.filter(d => d.status === 'work').length;
    const offDays = days.filter(d => d.status === 'off').length;
    const requestedOffDays = days.filter(d => d.status === 'requested').length;
    const positions: Partial<Record<Position | '기타', number>> = {};
    days.filter(d => d.position).forEach(d => {
      const pos = d.position as Position | '기타';
      positions[pos] = (positions[pos] ?? 0) + 1;
    });
    return {
      staffId: ps.staffId,
      name: staff.name,
      team: staff.team === 'laundry' ? '런드리' : '개별클리닝',
      workDays,
      offDays: offDays + requestedOffDays,
      requestedOffDays,
      positions,
    };
  });
}
