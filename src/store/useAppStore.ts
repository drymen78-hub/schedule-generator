import { useState, useCallback, useEffect, useRef } from 'react';
import type { ScheduleConfig, MonthSchedule, StaffMember, PositionRequirement, DayAssignment } from '../types';
import {
  DEFAULT_LAUNDRY_STAFF, DEFAULT_CLEANING_STAFF, DEFAULT_POSITION_REQUIREMENTS,
  DEFAULT_RECEIVING_STAFF, DEFAULT_RECEIVING_POSITION_REQUIREMENTS, DEFAULT_RECEIVING_DAILY_TARGETS,
} from '../constants/teams';
import { generateSchedule, validateScheduleForRetry, RetryValidationResult } from '../logic/scheduler';
import { downloadExcel } from '../logic/exporter';
import { fetchConfig, pushConfig, fetchProduction, pushProduction, pushSchedule, fetchSchedule } from '../services/googleSheets';

const STORAGE_KEY = 'schedule-config-v1';
const SCHEDULE_KEY = 'schedule-result-v1';
const ORIGINAL_SCHEDULE_KEY = 'schedule-original-v1';
const SCRIPT_URL_KEY = 'gas-script-url';
const API_KEY_KEY = 'anthropic-api-key';

function loadScriptUrl(): string {
  try { return localStorage.getItem(SCRIPT_URL_KEY) ?? ''; } catch { return ''; }
}
function loadApiKey(): string {
  try { return localStorage.getItem(API_KEY_KEY) ?? ''; } catch { return ''; }
}

function productionKey(year: number, month: number) {
  return `production-data-${year}-${month}`;
}
function loadProduction(year: number, month: number): Record<string, number> {
  try {
    const saved = localStorage.getItem(productionKey(year, month));
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
}

function loadSchedule(): MonthSchedule | null {
  try {
    const saved = localStorage.getItem(SCHEDULE_KEY);
    if (saved) return JSON.parse(saved) as MonthSchedule;
  } catch {}
  return null;
}

function makeDefaultConfig(): ScheduleConfig {
  const today = new Date();
  return {
    year:  today.getFullYear(),
    month: today.getMonth() + 2 <= 12 ? today.getMonth() + 2 : 1,
    laundryOffDays: 9,
    cleaningOffDays: 9,
    laundryStaff:   DEFAULT_LAUNDRY_STAFF.map(s => ({ ...s, positions: [...s.positions] })),
    cleaningStaff:  DEFAULT_CLEANING_STAFF.map(s => ({ ...s, positions: [...s.positions] })),
    positionRequirements: DEFAULT_POSITION_REQUIREMENTS.map(r => ({ ...r })),
    requestedLeaves: {},
    requestedWorks:  {},
    receivingStaff: DEFAULT_RECEIVING_STAFF.map(s => ({ ...s, positions: [...s.positions] })),
    receivingOffDays: 10,
    receivingPositionRequirements: DEFAULT_RECEIVING_POSITION_REQUIREMENTS.map(r => ({ ...r })),
    receivingDailyTargets: { ...DEFAULT_RECEIVING_DAILY_TARGETS },
  };
}

function loadConfig(): ScheduleConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<ScheduleConfig>;
      const defaults = makeDefaultConfig();
      // Merge saved data; keep saved staff/position settings, but allow year/month override
      return {
        ...defaults,
        ...parsed,
        requestedLeaves: parsed.requestedLeaves ?? {},
        requestedWorks:  parsed.requestedWorks  ?? {},
        receivingStaff: parsed.receivingStaff ?? defaults.receivingStaff,
        receivingOffDays: parsed.receivingOffDays ?? defaults.receivingOffDays,
        receivingPositionRequirements: parsed.receivingPositionRequirements ?? defaults.receivingPositionRequirements,
        receivingDailyTargets: parsed.receivingDailyTargets ?? defaults.receivingDailyTargets,
      };
    }
  } catch {
    // localStorage unavailable or corrupt
  }
  return makeDefaultConfig();
}

export type WizardStep = 1 | 2 | 3 | 4;
export type SheetsStatus = 'idle' | 'loading' | 'saving' | 'error' | 'ok';

const MAX_RETRY_ATTEMPTS = 50;

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function reorderSchedule(sched: ReturnType<typeof generateSchedule>, config: ScheduleConfig) {
  const reorder = <T extends { staffId: string }>(arr: T[], staff: StaffMember[]): T[] =>
    staff.map(s => arr.find(ps => ps.staffId === s.id)!).filter(Boolean);
  return {
    ...sched,
    laundry:   reorder(sched.laundry,  config.laundryStaff),
    cleaning:  reorder(sched.cleaning, config.cleaningStaff),
    receiving: sched.receiving && config.receivingStaff?.length
      ? reorder(sched.receiving, config.receivingStaff)
      : sched.receiving,
  };
}

export type { RetryValidationResult };

export function useAppStore() {
  const savedSchedule = loadSchedule();
  const [step, setStep] = useState<WizardStep>(savedSchedule ? 4 : 1);
  const [config, setConfig] = useState<ScheduleConfig>(loadConfig);
  const [schedule, setSchedule] = useState<MonthSchedule | null>(savedSchedule);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateProgress, setGenerateProgress] = useState<{ attempt: number; total: number } | null>(null);
  const [lastGenerateResult, setLastGenerateResult] = useState<RetryValidationResult | null>(null);
  const [scriptUrl, setScriptUrlState] = useState<string>(loadScriptUrl);
  const [apiKey, setApiKeyState] = useState<string>(loadApiKey);
  const [sheetsStatus, setSheetsStatus] = useState<SheetsStatus>('idle');
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const configSaveTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prodSaveTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLocalProdTime  = useRef<number>(0);  // 마지막 로컬 생산량 변경 시각
  const [productionData, setProductionData] = useState<Record<string, number>>(() => {
    const c = loadConfig();
    return loadProduction(c.year, c.month);
  });
  const [originalSchedule, setOriginalSchedule] = useState<MonthSchedule | null>(() => {
    try {
      const s = localStorage.getItem(ORIGINAL_SCHEDULE_KEY);
      return s ? JSON.parse(s) as MonthSchedule : savedSchedule;
    } catch { return savedSchedule; }
  });

  // Auto-save config to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {}
  }, [config]);

  // Auto-save config to Google Sheets (debounced 2s)
  useEffect(() => {
    if (!scriptUrl) return;
    if (configSaveTimer.current) clearTimeout(configSaveTimer.current);
    configSaveTimer.current = setTimeout(async () => {
      setSheetsStatus('saving');
      try {
        await pushConfig(scriptUrl, config);
        setSheetsStatus('ok');
      } catch (err) {
        console.warn('[Sheets] config 저장 실패:', err);
        setSheetsStatus('error');
      }
    }, 2000);
    return () => { if (configSaveTimer.current) clearTimeout(configSaveTimer.current); };
  }, [config, scriptUrl]);

  // Auto-save production to Google Sheets (debounced 2s)
  useEffect(() => {
    if (!scriptUrl) return;
    if (prodSaveTimer.current) clearTimeout(prodSaveTimer.current);
    prodSaveTimer.current = setTimeout(async () => {
      setSheetsStatus('saving');
      try {
        await pushProduction(scriptUrl, config.year, config.month, productionData);
        setSheetsStatus('ok');
      } catch (err) {
        console.warn('[Sheets] production 저장 실패:', err);
        setSheetsStatus('error');
      }
    }, 2000);
    return () => { if (prodSaveTimer.current) clearTimeout(prodSaveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productionData, scriptUrl, config.year, config.month]);

  // Reload production data when year/month changes
  useEffect(() => {
    setProductionData(loadProduction(config.year, config.month));
  }, [config.year, config.month]);

  // Auto-save production data
  useEffect(() => {
    try {
      localStorage.setItem(productionKey(config.year, config.month), JSON.stringify(productionData));
    } catch {}
  }, [productionData, config.year, config.month]);

  // Auto-save schedule to localStorage on every change
  useEffect(() => {
    try {
      if (schedule) {
        localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule));
      } else {
        localStorage.removeItem(SCHEDULE_KEY);
      }
    } catch {}
  }, [schedule]);

  const updateConfig = useCallback((partial: Partial<ScheduleConfig>) => {
    setConfig(c => ({ ...c, ...partial }));
  }, []);

  // 팀원 추가
  const addStaff = useCallback((member: StaffMember) => {
    setConfig(c => {
      if (member.team === 'laundry')   return { ...c, laundryStaff: [...c.laundryStaff, member] };
      if (member.team === 'receiving') return { ...c, receivingStaff: [...(c.receivingStaff ?? []), member] };
      return { ...c, cleaningStaff: [...c.cleaningStaff, member] };
    });
  }, []);

  // 팀원 삭제
  const removeStaff = useCallback((id: string) => {
    setConfig(c => ({
      ...c,
      laundryStaff:   c.laundryStaff.filter(s => s.id !== id),
      cleaningStaff:  c.cleaningStaff.filter(s => s.id !== id),
      receivingStaff: (c.receivingStaff ?? []).filter(s => s.id !== id),
    }));
  }, []);

  // 팀원 필드 범용 업데이트 (포지션, 역량도 등)
  const updateStaff = useCallback((id: string, patch: Partial<StaffMember>) => {
    setConfig(c => ({
      ...c,
      laundryStaff:   c.laundryStaff.map(s => s.id === id ? { ...s, ...patch } : s),
      cleaningStaff:  c.cleaningStaff.map(s => s.id === id ? { ...s, ...patch } : s),
      receivingStaff: (c.receivingStaff ?? []).map(s => s.id === id ? { ...s, ...patch } : s),
    }));
  }, []);

  // 팀원 포지션 업데이트 (updateStaff 래퍼, 기존 호환 유지)
  const updateStaffPositions = useCallback((id: string, positions: StaffMember['positions']) => {
    updateStaff(id, { positions });
  }, [updateStaff]);

  // 포지션 요구사항 업데이트
  const updateRequirement = useCallback((req: PositionRequirement) => {
    setConfig(c => ({
      ...c,
      positionRequirements: c.positionRequirements.map(r => r.position === req.position ? req : r),
    }));
  }, []);

  // 전월 연속성 보정 업데이트 (첫 금요일까지 필요 휴무 수)
  const updatePrevWeekNeeded = useCallback((data: Record<string, number>) => {
    setConfig(c => ({ ...c, prevWeekNeeded: data }));
  }, []);

  // 희망휴무 토글
  const toggleLeave = useCallback((staffId: string, dateStr: string) => {
    setConfig(c => {
      // 근무 지정일이면 휴무 불가
      if ((c.requestedWorks[staffId] ?? []).includes(dateStr)) return c;
      const leaves = c.requestedLeaves[staffId] ?? [];
      const next = leaves.includes(dateStr)
        ? leaves.filter(d => d !== dateStr)
        : [...leaves, dateStr];
      return { ...c, requestedLeaves: { ...c.requestedLeaves, [staffId]: next } };
    });
  }, []);

  // 근무 지정일 토글
  const toggleWork = useCallback((staffId: string, dateStr: string) => {
    setConfig(c => {
      const works = c.requestedWorks[staffId] ?? [];
      const isAdding = !works.includes(dateStr);
      const nextWorks = isAdding ? [...works, dateStr] : works.filter(d => d !== dateStr);
      // 근무 지정 추가 시 같은 날 희망휴무 자동 제거
      const leaves = c.requestedLeaves[staffId] ?? [];
      const nextLeaves = isAdding ? leaves.filter(d => d !== dateStr) : leaves;
      return {
        ...c,
        requestedWorks:  { ...c.requestedWorks,  [staffId]: nextWorks  },
        requestedLeaves: { ...c.requestedLeaves, [staffId]: nextLeaves },
      };
    });
  }, []);

  // 스케줄 생성 (반복 검증 루프)
  const generate = useCallback(async () => {
    setGenerateError(null);
    setLastGenerateResult(null);
    setGenerateProgress({ attempt: 0, total: MAX_RETRY_ATTEMPTS });

    let best: { schedule: MonthSchedule; validation: RetryValidationResult } | null = null;
    let finalAttempt = 0;

    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      finalAttempt = attempt;
      setGenerateProgress({ attempt, total: MAX_RETRY_ATTEMPTS });
      await new Promise<void>(r => setTimeout(r, 0)); // React 렌더 양보

      try {
        const shuffledConfig: ScheduleConfig = {
          ...config,
          laundryStaff:   shuffleArray(config.laundryStaff),
          cleaningStaff:  shuffleArray(config.cleaningStaff),
          receivingStaff: config.receivingStaff ? shuffleArray(config.receivingStaff) : config.receivingStaff,
        };
        const raw        = generateSchedule(shuffledConfig);
        const validation = validateScheduleForRetry(raw, shuffledConfig);

        if (!best || validation.score < best.validation.score) {
          best = { schedule: reorderSchedule(raw, config), validation };
        }
        if (validation.score === 0) break;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setGenerateError(msg);
        setGenerateProgress(null);
        return;
      }
    }

    setGenerateProgress(null);

    if (best) {
      setLastGenerateResult({ ...best.validation, attempts: finalAttempt });
      setSchedule(best.schedule);
      setOriginalSchedule(best.schedule);
      try { localStorage.setItem(ORIGINAL_SCHEDULE_KEY, JSON.stringify(best.schedule)); } catch {}
      setStep(4);
    }
  }, [config]);

  // 셀 수동 토글 (근무 ↔ 휴무)
  const toggleScheduleCell = useCallback((team: 'laundry' | 'cleaning' | 'receiving', staffId: string, dateStr: string) => {
    setSchedule(prev => {
      if (!prev) return prev;
      const list = (team === 'laundry' ? prev.laundry : team === 'receiving' ? (prev.receiving ?? []) : prev.cleaning);
      const personSchedules = list.map(ps => {
        if (ps.staffId !== staffId) return ps;
        const cur = ps.assignments[dateStr];
        const isWork = !cur || cur.status === 'work';
        let next: DayAssignment;
        if (isWork) {
          next = { status: 'off' };
        } else {
          const staffList = team === 'laundry' ? config.laundryStaff
            : team === 'receiving' ? (config.receivingStaff ?? [])
            : config.cleaningStaff;
          const staffMember = staffList.find(s => s.id === staffId);
          const pos = cur?.position ?? staffMember?.positions[0];
          next = { status: 'work', ...(pos ? { position: pos } : {}) };
        }
        return { ...ps, assignments: { ...ps.assignments, [dateStr]: next } };
      });
      return { ...prev, [team]: personSchedules };
    });
  }, [config]);

  // 최초 생성 결과로 원복
  const revertSchedule = useCallback(() => {
    setSchedule(originalSchedule);
  }, [originalSchedule]);

  // 포지션 요구사항 업데이트 (야간입고팀)
  const updateReceivingRequirement = useCallback((req: PositionRequirement) => {
    setConfig(c => ({
      ...c,
      receivingPositionRequirements: (c.receivingPositionRequirements ?? []).map(r => r.position === req.position ? req : r),
    }));
  }, []);

  // 야간입고팀 요일별 목표 업데이트
  const updateReceivingDailyTargets = useCallback((targets: Record<number, number>) => {
    setConfig(c => ({ ...c, receivingDailyTargets: targets }));
  }, []);

  // 팀원 순서 변경
  const reorderStaff = useCallback((team: 'laundry' | 'cleaning' | 'receiving', fromIdx: number, toIdx: number) => {
    setConfig(c => {
      const key = team === 'laundry' ? 'laundryStaff' : team === 'receiving' ? 'receivingStaff' : 'cleaningStaff';
      const arr = [...((c[key] as StaffMember[]) ?? [])];
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, item);
      return { ...c, [key]: arr };
    });
  }, []);

  // 엑셀 다운로드 (생산량 포함)
  const download = useCallback(() => {
    if (schedule) downloadExcel(schedule, config, productionData);
  }, [schedule, config, productionData]);

  // 생산량 업데이트
  const updateProduction = useCallback((dateStr: string, quantity: number) => {
    lastLocalProdTime.current = Date.now();
    setProductionData(prev => {
      if (!quantity || quantity <= 0) {
        const { [dateStr]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [dateStr]: quantity };
    });
  }, []);

  // ── 생산량 폴링 (30초, Google Sheets 연동 시) ──────────────────────────────
  useEffect(() => {
    if (!scriptUrl) return;
    const poll = async () => {
      const idleSec = (Date.now() - lastLocalProdTime.current) / 1000;
      if (idleSec < 15) return; // 15초 이내 로컬 편집 중이면 skip
      try {
        const remoteProd = await fetchProduction(scriptUrl, config.year, config.month);
        setProductionData(remoteProd);
      } catch {
        // 폴링 실패는 조용히 무시
      }
    };
    const timer = setInterval(poll, 30000);
    return () => clearInterval(timer);
  }, [scriptUrl, config.year, config.month]);

  // 스케줄 확정 → Google Sheets 저장
  const confirmSchedule = useCallback(async () => {
    if (!schedule || !scriptUrl) return;
    setSheetsStatus('saving');
    try {
      await Promise.all([
        pushSchedule(scriptUrl, config.year, config.month, schedule),
        pushConfig(scriptUrl, config),
      ]);
      const ts = new Date().toISOString();
      setConfirmedAt(ts);
      setSheetsStatus('ok');
    } catch (err) {
      console.error('[Sheets] 스케줄 확정 실패:', err);
      setSheetsStatus('error');
    }
  }, [schedule, scriptUrl, config]);

  // 확정된 스케줄 불러오기 (다른 PC에서)
  const loadConfirmedSchedule = useCallback(async () => {
    if (!scriptUrl) return;
    setSheetsStatus('loading');
    try {
      const result = await fetchSchedule(scriptUrl, config.year, config.month);
      if (result?.schedule) {
        const s = result.schedule as MonthSchedule;
        setSchedule(s);
        setOriginalSchedule(s);
        setConfirmedAt(result.confirmedAt);
        try { localStorage.setItem(SCHEDULE_KEY, JSON.stringify(s)); } catch {}
        setStep(4);
      }
      setSheetsStatus('ok');
    } catch (err) {
      console.error('[Sheets] 확정 스케줄 불러오기 실패:', err);
      setSheetsStatus('error');
    }
  }, [scriptUrl, config.year, config.month]);

  // 설정 저장
  const setScriptUrl = useCallback((url: string) => {
    setScriptUrlState(url);
    try { localStorage.setItem(SCRIPT_URL_KEY, url); } catch {}
  }, []);

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    try { localStorage.setItem(API_KEY_KEY, key); } catch {}
  }, []);

  // Google Sheets에서 불러오기
  const loadFromSheets = useCallback(async () => {
    if (!scriptUrl) return;
    setSheetsStatus('loading');
    try {
      const [remoteConfig, remoteProd] = await Promise.all([
        fetchConfig(scriptUrl),
        fetchProduction(scriptUrl, config.year, config.month),
      ]);
      if (remoteConfig) {
        const c = remoteConfig as Partial<ScheduleConfig>;
        const merged: ScheduleConfig = {
          ...makeDefaultConfig(),
          ...c,
          requestedLeaves: c.requestedLeaves ?? {},
          requestedWorks:  c.requestedWorks  ?? {},
        };
        setConfig(merged);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch {}
      }
      setProductionData(remoteProd);
      setSheetsStatus('ok');
    } catch (err) {
      console.error('[Sheets] 불러오기 실패:', err);
      setSheetsStatus('error');
    }
  }, [scriptUrl, config.year, config.month]);

  // 초기화 (localStorage도 클리어)
  const reset = useCallback(() => {
    const fresh = makeDefaultConfig();
    setConfig(fresh);
    setSchedule(null);
    setOriginalSchedule(null);
    setProductionData({});
    setStep(1);
    localStorage.removeItem(SCHEDULE_KEY);
    localStorage.removeItem(ORIGINAL_SCHEDULE_KEY);
  }, []);

  return {
    step, setStep,
    config, updateConfig,
    addStaff, removeStaff, updateStaff, updateStaffPositions,
    updateRequirement,
    toggleLeave, updatePrevWeekNeeded,
    schedule, originalSchedule,
    productionData, updateProduction,
    generate, generateError, generateProgress, lastGenerateResult,
    toggleScheduleCell, revertSchedule, download, reset,
    reorderStaff,
    toggleWork,
    // 야간입고팀
    updateReceivingRequirement, updateReceivingDailyTargets,
    // 설정 / 동기화
    scriptUrl, setScriptUrl,
    apiKey, setApiKey,
    sheetsStatus, loadFromSheets,
    confirmedAt, confirmSchedule, loadConfirmedSchedule,
  };
}
