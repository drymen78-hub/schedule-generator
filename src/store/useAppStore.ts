import { useState, useCallback } from 'react';
import type { ScheduleConfig, MonthSchedule, StaffMember, PositionRequirement, PrevWeekOff } from '../types';
import { DEFAULT_LAUNDRY_STAFF, DEFAULT_CLEANING_STAFF, DEFAULT_POSITION_REQUIREMENTS } from '../constants/teams';
import { generateSchedule } from '../logic/scheduler';
import { downloadExcel } from '../logic/exporter';

const today = new Date();

function makeDefaultConfig(): ScheduleConfig {
  return {
    year:  today.getFullYear(),
    month: today.getMonth() + 2 <= 12 ? today.getMonth() + 2 : 1,
    laundryOffDays: 9,
    cleaningOffDays: 9,
    laundryStaff:   DEFAULT_LAUNDRY_STAFF.map(s => ({ ...s, positions: [...s.positions] })),
    cleaningStaff:  DEFAULT_CLEANING_STAFF.map(s => ({ ...s, positions: [...s.positions] })),
    positionRequirements: DEFAULT_POSITION_REQUIREMENTS.map(r => ({ ...r })),
    requestedLeaves: {},
  };
}

export type WizardStep = 1 | 2 | 3 | 4;

export function useAppStore() {
  const [step, setStep] = useState<WizardStep>(1);
  const [config, setConfig] = useState<ScheduleConfig>(makeDefaultConfig);
  const [schedule, setSchedule] = useState<MonthSchedule | null>(null);

  const updateConfig = useCallback((partial: Partial<ScheduleConfig>) => {
    setConfig(c => ({ ...c, ...partial }));
  }, []);

  // 팀원 추가
  const addStaff = useCallback((member: StaffMember) => {
    setConfig(c => {
      if (member.team === 'laundry') return { ...c, laundryStaff: [...c.laundryStaff, member] };
      return { ...c, cleaningStaff: [...c.cleaningStaff, member] };
    });
  }, []);

  // 팀원 삭제
  const removeStaff = useCallback((id: string) => {
    setConfig(c => ({
      ...c,
      laundryStaff:  c.laundryStaff.filter(s => s.id !== id),
      cleaningStaff: c.cleaningStaff.filter(s => s.id !== id),
    }));
  }, []);

  // 팀원 포지션 업데이트
  const updateStaffPositions = useCallback((id: string, positions: StaffMember['positions']) => {
    setConfig(c => ({
      ...c,
      cleaningStaff: c.cleaningStaff.map(s => s.id === id ? { ...s, positions } : s),
    }));
  }, []);

  // 포지션 요구사항 업데이트
  const updateRequirement = useCallback((req: PositionRequirement) => {
    setConfig(c => ({
      ...c,
      positionRequirements: c.positionRequirements.map(r => r.position === req.position ? req : r),
    }));
  }, []);

  // 전월 마지막주 금/토 현황 업데이트
  const updatePrevMonth = useCallback((data: Record<string, PrevWeekOff>) => {
    setConfig(c => ({ ...c, prevMonthLastWeek: data }));
  }, []);

  // 희망휴무 토글
  const toggleLeave = useCallback((staffId: string, dateStr: string) => {
    setConfig(c => {
      const leaves = c.requestedLeaves[staffId] ?? [];
      const next = leaves.includes(dateStr)
        ? leaves.filter(d => d !== dateStr)
        : [...leaves, dateStr];
      return { ...c, requestedLeaves: { ...c.requestedLeaves, [staffId]: next } };
    });
  }, []);

  // 스케줄 생성
  const generate = useCallback(() => {
    const result = generateSchedule(config);
    setSchedule(result);
    setStep(4);
  }, [config]);

  // 엑셀 다운로드
  const download = useCallback(() => {
    if (schedule) downloadExcel(schedule, config);
  }, [schedule, config]);

  const reset = useCallback(() => {
    setConfig(makeDefaultConfig());
    setSchedule(null);
    setStep(1);
  }, []);

  return {
    step, setStep,
    config, updateConfig,
    addStaff, removeStaff, updateStaffPositions,
    updateRequirement,
    toggleLeave, updatePrevMonth,
    schedule,
    generate, download, reset,
  };
}
