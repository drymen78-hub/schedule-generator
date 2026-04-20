import type {
  ScheduleConfig, MonthSchedule, PersonSchedule,
  DayAssignment, DayStatus, StaffMember, Position, ValidationIssue,
} from '../types';
import { getDatesInMonth, toDateStr, dow, groupByWeek } from './dateUtils';
import {
  DEFAULT_RECEIVING_POSITION_REQUIREMENTS,
  DEFAULT_RECEIVING_DAILY_TARGETS,
} from '../constants/teams';

// ─── 오프데이 배분 ──────────────────────────────────────────────────────────

function assignOffDays(
  staff: StaffMember[],
  dates: Date[],
  offCount: number,
  requestedLeaves: Record<string, string[]>,
  issues: ValidationIssue[],
  config?: ScheduleConfig,
  perDateOffCap?: Record<string, number>,  // 날짜별 최대 off 인원 (야간입고팀 등)
): Record<string, Set<string>> {   // staffId → off date strings

  const offMap: Record<string, Set<string>> = {};
  const budget: Record<string, number> = {};
  staff.forEach(p => { offMap[p.id] = new Set(); budget[p.id] = offCount; });

  // 개인별 휴무 패턴 맵
  const offPatternMap: Record<string, 'consecutive' | 'spread' | undefined> =
    Object.fromEntries(staff.map(p => [p.id, p.offPattern]));

  // 근무 지정일: 해당 날짜는 절대 off 불가 (최우선 제약)
  const requestedWorks = config?.requestedWorks ?? {};
  const mustWorkSet: Record<string, Set<string>> = {};
  staff.forEach(p => {
    mustWorkSet[p.id] = new Set(requestedWorks[p.id] ?? []);
  });

  const canBeOff = (personId: string, ds: string) =>
    !mustWorkSet[personId]?.has(ds) && !offMap[personId]?.has(ds) && (budget[personId] ?? 0) > 0;

  const offCountOnDay = (ds: string) =>
    staff.filter(p => offMap[p.id].has(ds)).length;

  // ── 균등 분산용 일일 soft cap ────────────────────────────────────────────
  // (총 off 슬롯 / 월 일수)의 올림값 → 하루 최대 off 인원
  const maxOffPerDay = Math.max(1, Math.ceil((staff.length * offCount) / dates.length));

  // ── 주말/평일 비율 기준 쿼터 ─────────────────────────────────────────────
  const isWknd = (ds: string): boolean => { const d = dow(new Date(ds)); return d === 0 || d === 6; };
  const totalWeekends = dates.filter(d => dow(d) === 0 || dow(d) === 6).length;
  // 주말일수 비율 × 휴무일 = 주말 상한, 나머지 = 평일 하한
  const weekendTarget = Math.round((totalWeekends * offCount) / dates.length);
  const weekdayTarget = offCount - weekendTarget;
  const weekendOffCount: Record<string, number> = {};
  const weekdayOffCount: Record<string, number> = {};
  staff.forEach(p => { weekendOffCount[p.id] = 0; weekdayOffCount[p.id] = 0; });

  const markOff = (personId: string, ds: string, status?: DayStatus) => {
    offMap[personId].add(ds);
    budget[personId]--;
    if (isWknd(ds)) weekendOffCount[personId]++;
    else             weekdayOffCount[personId]++;
    void status;
  };

  const unmarkOff = (personId: string, ds: string) => {
    offMap[personId].delete(ds);
    budget[personId]++;
    if (isWknd(ds)) weekendOffCount[personId]--;
    else             weekdayOffCount[personId]--;
  };

  // ── 연속 추적 헬퍼 ───────────────────────────────────────────────────────
  const dateStrs = dates.map(toDateStr);
  const dateIdx: Record<string, number> = Object.fromEntries(dateStrs.map((ds, i) => [ds, i]));

  // ds를 off로 배정할 경우 발생하는 연속 휴무 길이 (앞뒤 이미 배정된 off 포함)
  const consecOffRun = (personId: string, ds: string): number => {
    const i = dateIdx[ds];
    let run = 1;
    for (let j = i - 1; j >= 0 && offMap[personId].has(dateStrs[j]); j--) run++;
    for (let j = i + 1; j < dateStrs.length && offMap[personId].has(dateStrs[j]); j++) run++;
    return run;
  };

  // ds 바로 이전까지의 연속 근무 일수
  const leadingWork = (personId: string, ds: string): number => {
    const i = dateIdx[ds];
    let n = 0;
    for (let j = i - 1; j >= 0 && !offMap[personId].has(dateStrs[j]); j--) n++;
    return n;
  };

  // 날짜 선택 점수 — 낮을수록 우선 배정
  //   • 하루 off 인원 × 10              (균등 분산)
  //   • cap 초과 시 +500                (soft cap 페널티)
  //   • 평일 off 하한 미달 시 -2        (평일 우선 보너스)
  //   • 주말 off 상한 초과 시 +200      (주말 과다 방지)
  //   • 패턴별 연속 페널티/보너스        (개인 선호 반영)
  //   • 직전 4일 이상 근무 시 -300      (연속 근무 해소 우선)
  //   • 직전 3일 근무 시 -30            (연속 근무 완화)
  const dayScore = (personId: string, ds: string): number => {
    const cnt         = offCountOnDay(ds);
    const cap         = perDateOffCap?.[ds] ?? maxOffPerDay;
    const capPenalty  = cnt >= cap ? 500 : 0;
    const wkdayBonus  = !isWknd(ds) && weekdayOffCount[personId] < weekdayTarget ? -2 : 0;
    const wkndPenalty =  isWknd(ds) && weekendOffCount[personId] >= weekendTarget ? 200 : 0;
    const runLen      = consecOffRun(personId, ds);
    const pattern     = offPatternMap[personId];
    // 연속선호: 2연속 보너스(-400), 3연속+ 강력 페널티(+3000)
    // 분산선호(기본): 2연속부터 페널티(+2000)
    const consecOffP  = pattern === 'consecutive'
      ? (runLen >= 3 ? 3000 : runLen === 2 ? -400 : 0)
      : (runLen >= 2 ? 2000 : 0);
    const cWork       = leadingWork(personId, ds);
    const longWorkB   = cWork >= 4 ? -300 : cWork >= 3 ? -30 : 0;
    return cnt * 10 + capPenalty + wkdayBonus + wkndPenalty + consecOffP + longWorkB;
  };

  // ── Step 0: 전월 연속성 보정 — 첫 금요일까지 지정 수만큼 우선 배정 ────────
  if (config?.prevWeekNeeded) {
    // 첫 금요일 ~ 없으면 월말을 기준으로 삼음
    const firstFriday = dates.find(d => dow(d) === 5);
    const cutoff      = firstFriday ?? dates[dates.length - 1];
    const firstPeriod = dates.filter(d => d <= cutoff).map(toDateStr);

    Object.entries(config.prevWeekNeeded).forEach(([staffId, needed]) => {
      if (!needed || needed <= 0) return;
      if (!offMap[staffId]) return;  // 이 팀 소속이 아닌 staffId 무시
      let assigned = 0;
      // 균등 분산: 해당 기간 중 off 인원이 가장 적은 날부터
      const eligible = firstPeriod
        .filter(ds => canBeOff(staffId, ds))
        .sort((a, b) => offCountOnDay(a) - offCountOnDay(b));
      for (const ds of eligible) {
        if (assigned >= needed) break;
        markOff(staffId, ds);
        assigned++;
      }
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

  // ── Step 2: 토~금 주간 단위로 인원별 최소 휴무 2개 보장 ────────────────────
  const weeks = groupByWeek(dates);

  weeks.forEach(week => {
    // 월 경계 부분 주 처리: 4일 미만 짧은 주는 강제 배정 건너뜀 (집중 방지)
    const minOff = week.length >= 7 ? 2 : week.length >= 4 ? 1 : 0;
    if (minOff === 0) return;

    const weekLabel = `${week[0].getMonth() + 1}/${week[0].getDate()}~${week[week.length - 1].getMonth() + 1}/${week[week.length - 1].getDate()}`;
    staff.forEach(p => {
      const alreadyOff = week.filter(d => offMap[p.id].has(toDateStr(d))).length;
      const needed = minOff - alreadyOff;
      if (needed <= 0) return;

      // dayScore 기반 정렬 (cap + 평일/주말 쿼터 반영)
      const eligible = week
        .map(toDateStr)
        .filter(ds => canBeOff(p.id, ds))
        .sort((a, b) => dayScore(p.id, a) - dayScore(p.id, b));

      for (let i = 0; i < needed; i++) {
        if (eligible[i]) markOff(p.id, eligible[i]);
      }

      const finalOff = week.filter(d => offMap[p.id].has(toDateStr(d))).length;
      if (finalOff < minOff) {
        issues.push({ level: 'warn', message: `${p.name} (${weekLabel}): 주간 휴무 ${finalOff}개 — 최소 ${minOff}개 미충족` });
      }
    });
  });

  // ── Step 3: 나머지 휴무 균등 분산 (round-robin + dayScore) ──────────────
  // 라운드당 1인 1일씩 배정 → 하루 off 집중 방지 + 주말 공평 배분
  let anyProgress = true;
  let iterLimit3 = staff.length * dates.length + 1; // 최대 배정 가능한 총 횟수
  while (anyProgress && iterLimit3-- > 0) {
    anyProgress = false;
    // 잔여 휴무 많은 순 (공평한 기회 보장)
    const sorted = [...staff].sort((a, b) => budget[b.id] - budget[a.id]);
    for (const p of sorted) {
      if (budget[p.id] <= 0) continue;

      const best = dates.map(toDateStr)
        .filter(ds => canBeOff(p.id, ds))
        .map(ds => ({ ds, score: dayScore(p.id, ds) }))
        .sort((a, b) => a.score - b.score)[0];

      if (best) {
        markOff(p.id, best.ds);
        anyProgress = true;
      }
    }
  }

  // ── Step 4: 연속 근무/휴무 repair ────────────────────────────────────────
  staff.forEach(p => {
    const rid = p.id;
    const reqLeaves = config?.requestedLeaves[rid] ?? [];

    // 스왑 후 새로운 5연속 근무가 생기는지 확인하는 헬퍼
    const wouldCreate5Consec = (ds: string): boolean => {
      const si = dateIdx[ds];
      let before = 0;
      for (let j = si - 1; j >= 0 && !offMap[rid].has(dateStrs[j]); j--) before++;
      let after = 0;
      for (let j = si + 1; j < dateStrs.length && !offMap[rid].has(dateStrs[j]); j++) after++;
      return before + 1 + after >= 5;
    };

    // 4a: 5일 연속 근무 → 5번째 날 강제 휴무 (필요 시 다른 off 와 스왑)
    // 최대 반복 횟수 제한: 날수 × 2 (무한 루프 방지)
    let changed = true;
    let iterLimit4a = dateStrs.length * 2;
    while (changed && iterLimit4a-- > 0) {
      changed = false;
      for (let i = 4; i < dateStrs.length; i++) {
        const allWork = [0,1,2,3,4].every(k => !offMap[rid].has(dateStrs[i - k]));
        if (!allWork) continue;

        const forceDs = dateStrs[i];
        if (mustWorkSet[rid]?.has(forceDs)) {
          continue;
        }

        if (budget[rid] > 0) {
          markOff(rid, forceDs);
        } else {
          // 예산 소진 → 이동해도 새 5연속을 만들지 않는 off를 forceDs로 이동
          const fi = dateIdx[forceDs];
          const swapSrc = dateStrs.find(ds => {
            if (!offMap[rid].has(ds)) return false;
            if (reqLeaves.includes(ds)) return false;
            if (Math.abs(dateIdx[ds] - fi) <= 1) return false; // 인접 → 연속 off 방지
            if (wouldCreate5Consec(ds)) return false;           // 이동 시 새 5연속 발생 방지
            return true;
          });
          if (swapSrc) {
            unmarkOff(rid, swapSrc);
            markOff(rid, forceDs);
          } else {
            issues.push({ level: 'warn', message: `${p.name}: 5연속 근무 발생 (이동 가능한 휴무 없음)` });
            continue;
          }
        }
        changed = true;
        break;
      }
    }

    // 4b: 연속 휴무 repair
    //   - 분산선호(기본): 2연속 이상 → repair
    //   - 연속선호: 3연속 이상만 → repair (2연속은 허용)
    const maxAllowedConsec = offPatternMap[rid] === 'consecutive' ? 2 : 1;

    changed = true;
    let iterLimit4b = dateStrs.length * 2;
    while (changed && iterLimit4b-- > 0) {
      changed = false;
      for (let i = 0; i < dateStrs.length - maxAllowedConsec; i++) {
        // 연속 run 길이 계산
        let runEnd = i;
        while (runEnd + 1 < dateStrs.length && offMap[rid].has(dateStrs[runEnd + 1])) runEnd++;
        const runLen = runEnd - i + 1;
        if (runLen <= maxAllowedConsec) { i = runEnd; continue; } // 허용 범위 내

        // maxAllowedConsec + 1 번째 날(초과분)을 해제
        const removeIdx = i + maxAllowedConsec;
        const removeDs = dateStrs[removeIdx];
        if (reqLeaves.includes(removeDs)) { i = runEnd; continue; } // 희망휴무 보호

        unmarkOff(rid, removeDs);

        // 비연속 날에 재배정 (없으면 해당 휴무일 포기)
        const best = dateStrs
          .filter(ds => canBeOff(rid, ds) && consecOffRun(rid, ds) < maxAllowedConsec + 1)
          .map(ds => ({ ds, score: dayScore(rid, ds) }))
          .sort((a, b) => a.score - b.score)[0];

        if (best) markOff(rid, best.ds);

        changed = true;
        break;
      }
    }
  });

  // 미배정 경고
  staff.forEach(p => {
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

// ─── 야간입고팀 포지션 배정 ────────────────────────────────────────────────
// 이동·생빨·리빙 우선 배정 후 나머지는 분류(recv_sort)

function assignReceivingPositions(
  workingStaff: StaffMember[],
  requirements: ScheduleConfig['positionRequirements'],
  issues: ValidationIssue[],
  dateStr: string,
): Record<string, Position | '기타'> {
  const result: Record<string, Position | '기타'> = {};
  const assigned = new Set<string>();

  // recv_sort(분류) 제외한 특수 포지션 먼저 배정 (가능 인원 적은 순)
  const special = (requirements ?? [])
    .filter(r => r.position !== 'recv_sort')
    .sort((a, b) => {
      const aE = workingStaff.filter(p => p.positions.includes(a.position)).length;
      const bE = workingStaff.filter(p => p.positions.includes(b.position)).length;
      return aE - bE;
    });

  special.forEach(req => {
    const eligible = workingStaff.filter(p => p.positions.includes(req.position) && !assigned.has(p.id));
    for (let i = 0; i < req.min; i++) {
      if (eligible[i]) {
        result[eligible[i].id] = req.position;
        assigned.add(eligible[i].id);
      } else {
        issues.push({ level: 'warn', message: `야간입고 ${dateStr}: ${req.label} 최소 인원 미달 (필요 ${req.min}, 가능 ${eligible.length})` });
      }
    }
  });

  // 나머지 전원 → 분류
  workingStaff.filter(p => !assigned.has(p.id)).forEach(p => {
    result[p.id] = 'recv_sort';
    assigned.add(p.id);
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

  // ── 야간입고팀 ─────────────────────────────────────────────────────────────
  let receivingSchedule: PersonSchedule[] | undefined;

  if (config.receivingStaff && config.receivingStaff.length > 0) {
    const rStaff   = config.receivingStaff;
    const rTargets = config.receivingDailyTargets ?? DEFAULT_RECEIVING_DAILY_TARGETS;
    const rReqs    = config.receivingPositionRequirements ?? DEFAULT_RECEIVING_POSITION_REQUIREMENTS;

    // 날짜별 off 상한 (총원 - 목표 근무 인원)
    // 날짜별 off 상한 (일별 목표 근무인원 기반, 분포 가중치용)
    const rPerDateOffCap: Record<string, number> = {};
    let totalOffSlots = 0;
    dates.forEach(d => {
      const ds = toDateStr(d);
      const target = rTargets[dow(d)] ?? rTargets[1] ?? 10;
      const cap = Math.round(Math.max(0, rStaff.length - target));
      rPerDateOffCap[ds] = cap;
      totalOffSlots += cap;
    });

    // 월 휴무일수: 직접 입력값 우선, 없으면 daily targets에서 계산
    const rOffDays = (config.receivingOffDays != null && config.receivingOffDays > 0)
      ? Math.min(dates.length - 1, config.receivingOffDays)
      : Math.min(dates.length - 1, Math.round(totalOffSlots / rStaff.length));

    const receivingOffMap = assignOffDays(
      rStaff, dates, rOffDays,
      config.requestedLeaves, issues, config,
      rPerDateOffCap,
    );

    const rPosByDate: Record<string, Record<string, Position | '기타'>> = {};
    dates.forEach(d => {
      const ds = toDateStr(d);
      const working = rStaff.filter(p => !receivingOffMap[p.id]?.has(ds));
      rPosByDate[ds] = assignReceivingPositions(working, rReqs, issues, ds);
    });

    receivingSchedule = rStaff.map(p => ({
      staffId: p.id,
      assignments: Object.fromEntries(
        dates.map(d => {
          const ds = toDateStr(d);
          const isOff = receivingOffMap[p.id]?.has(ds) ?? false;
          const isReq = isOff && (config.requestedLeaves[p.id] ?? []).includes(ds);
          const position = !isOff ? (rPosByDate[ds]?.[p.id] as Position | undefined) : undefined;
          return [ds, { status: isOff ? (isReq ? 'requested' : 'off') : 'work', position } as DayAssignment];
        })
      ),
    }));

    // 일별 인원 편차 검증
    const dailyRec = dates.map(d => {
      const ds = toDateStr(d);
      return rStaff.filter(p => !receivingOffMap[p.id]?.has(ds)).length;
    });
    const rMin = Math.min(...dailyRec), rMax = Math.max(...dailyRec);
    if (rMax - rMin > 4) {
      issues.push({ level: 'warn', message: `야간입고팀 일별 인원 편차 ${rMax - rMin}명 (${rMin}~${rMax}명)` });
    }
  }

  return {
    year: config.year,
    month: config.month,
    laundry: laundrySchedule,
    cleaning: cleaningSchedule,
    receiving: receivingSchedule,
    validationIssues: issues,
  };
}

// ─── 반복 생성용 스케줄 품질 검증 ─────────────────────────────────────────────

export interface RetryValidationResult {
  score: number;   // 낮을수록 좋음 (0 = 완벽)
  checks: {
    dailyVariance: boolean;  // 일별 인원 편차 ±1 이내
    weeklyOff: boolean;      // 주간 휴무 2개 이상 (토~금)
    consecWork: boolean;     // 연속 근무 3일 이하
    consecOff: boolean;      // 연속 휴무 1일 이하
  };
  attempts?: number;
}

export function validateScheduleForRetry(
  schedule: MonthSchedule,
  config: ScheduleConfig,
): RetryValidationResult {
  const dates  = getDatesInMonth(config.year, config.month);
  const dstrs  = dates.map(toDateStr);
  const weeks  = groupByWeek(dates);
  let score    = 0;
  const checks = { dailyVariance: true, weeklyOff: true, consecWork: true, consecOff: true };

  // 연속 근무/휴무 run 검사
  const checkRuns = (ps: PersonSchedule) => {
    let workRun = 0, offRun = 0;
    for (const ds of dstrs) {
      const status = ps.assignments[ds]?.status ?? 'work';
      if (status === 'work') {
        offRun = 0;
        workRun++;
        if (workRun === 4) { checks.consecWork = false; score += 2; }
        else if (workRun > 4) score += 2;
      } else {
        workRun = 0;
        offRun++;
        if (offRun === 2) { checks.consecOff = false; score += 1; }
        else if (offRun > 2) score += 1;
      }
    }
  };

  // 일별 인원 편차 ±1 이내 검사
  const checkVariance = (teamSched: PersonSchedule[], staff: StaffMember[]) => {
    if (!staff.length) return;
    const counts = dstrs.map(ds =>
      staff.filter(p => {
        const ps = teamSched.find(s => s.staffId === p.id);
        return ps?.assignments[ds]?.status === 'work';
      }).length
    );
    const diff = Math.max(...counts) - Math.min(...counts);
    if (diff > 1) { checks.dailyVariance = false; score += (diff - 1) * 5; }
  };

  // 주간 휴무 2개 보장 (토~금) 검사
  const checkWeeklyOff = (teamSched: PersonSchedule[], staff: StaffMember[]) => {
    weeks.forEach(week => {
      const minOff = week.length >= 7 ? 2 : week.length >= 4 ? 1 : 0;
      if (!minOff) return;
      staff.forEach(p => {
        const ps = teamSched.find(s => s.staffId === p.id);
        if (!ps) return;
        const cnt = week.filter(d => {
          const st = ps.assignments[toDateStr(d)]?.status;
          return st === 'off' || st === 'requested';
        }).length;
        if (cnt < minOff) { checks.weeklyOff = false; score += 3; }
      });
    });
  };

  checkVariance(schedule.laundry, config.laundryStaff);
  checkWeeklyOff(schedule.laundry, config.laundryStaff);
  schedule.laundry.forEach(checkRuns);

  checkVariance(schedule.cleaning, config.cleaningStaff);
  checkWeeklyOff(schedule.cleaning, config.cleaningStaff);
  schedule.cleaning.forEach(checkRuns);

  if (schedule.receiving && config.receivingStaff?.length) {
    checkWeeklyOff(schedule.receiving, config.receivingStaff);
    schedule.receiving.forEach(checkRuns);
  }

  return { score, checks };
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
  const allStaff = [...config.laundryStaff, ...config.cleaningStaff, ...(config.receivingStaff ?? [])];
  const allSchedules = [...schedule.laundry, ...schedule.cleaning, ...(schedule.receiving ?? [])];

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
      team: staff.team === 'laundry' ? '런드리' : staff.team === 'receiving' ? '야간입고' : '개별클리닝',
      workDays,
      offDays: offDays + requestedOffDays,
      requestedOffDays,
      positions,
    };
  });
}
