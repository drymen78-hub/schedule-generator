import { useState } from 'react';
import type { ScheduleConfig, StaffMember, PrevWeekOff } from '../../types';
import { getDatesInMonth, toDateStr, dow } from '../../logic/dateUtils';

interface Props {
  config: ScheduleConfig;
  onToggleLeave: (staffId: string, dateStr: string) => void;
  onUpdatePrevMonth: (data: Record<string, PrevWeekOff>) => void;
  onGenerate: () => void;
  onBack: () => void;
}

function PrevMonthPanel({
  staff, prevData, onChange,
}: {
  staff: StaffMember[];
  prevData: Record<string, PrevWeekOff>;
  onChange: (data: Record<string, PrevWeekOff>) => void;
}) {
  const [open, setOpen] = useState(false);
  const OPTIONS: PrevWeekOff[] = ['none', 'fri', 'sat', 'both'];
  const LABELS: Record<PrevWeekOff, string> = { none: '없음', fri: '금요일만', sat: '토요일만', both: '금+토 모두' };

  return (
    <div style={{ marginBottom: 20, border: '1px solid #bfdbfe', borderRadius: 10, overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', padding: '10px 16px', background: '#eff6ff', border: 'none', cursor: 'pointer',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: 13, fontWeight: 700, color: '#1d4ed8',
      }}>
        <span>📋 전월 마지막주 금/토 휴무 현황 입력 (주52시간 연속성)</span>
        <span>{open ? '▲ 닫기' : '▼ 펼치기'}</span>
      </button>
      {open && (
        <div style={{ padding: 16, background: '#fff' }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
            전월 마지막 주 금·토 휴무 현황을 입력하면, 당월 첫 주에 부족분이 자동 반영됩니다.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {staff.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <span style={{ fontWeight: 700, fontSize: 13, minWidth: 48 }}>{s.name}</span>
                <select value={prevData[s.id] ?? 'none'}
                  onChange={e => onChange({ ...prevData, [s.id]: e.target.value as PrevWeekOff })}
                  style={{ flex: 1, padding: '4px 6px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                  {OPTIONS.map(o => <option key={o} value={o}>{LABELS[o]}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PersonCalendar({
  staff, dates, offDaysTarget, leaves, mustWorkDays, onToggle,
}: {
  staff: StaffMember;
  dates: Date[];
  offDaysTarget: number;
  leaves: string[];
  mustWorkDays: number[];
  onToggle: (ds: string) => void;
}) {
  const used = leaves.length;
  const firstDow = dates[0].getDay();

  return (
    <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{staff.name}</span>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10,
          background: used > offDaysTarget ? '#fee2e2' : used === offDaysTarget ? '#dcfce7' : '#f1f5f9',
          color: used > offDaysTarget ? '#dc2626' : used === offDaysTarget ? '#15803d' : '#64748b',
        }}>
          {used} / {offDaysTarget}일
        </span>
      </div>

      {mustWorkDays.length > 0 && (
        <div style={{ fontSize: 10, color: '#854d0e', background: '#fef9c3', borderRadius: 6, padding: '3px 8px', marginBottom: 8, fontWeight: 600 }}>
          ⚠ 고정근무: {mustWorkDays.map(d => ['일','월','화','수','목','금','토'][d]).join('/')} (휴무 불가)
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {['일','월','화','수','목','금','토'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700,
            color: d === '일' ? '#dc2626' : d === '토' ? '#2563eb' : '#94a3b8', padding: '2px 0' }}>
            {d}
          </div>
        ))}
        {Array.from({ length: firstDow }, (_, i) => <div key={`e${i}`} />)}
        {dates.map(d => {
          const ds = toDateStr(d);
          const dayOfWeek = dow(d);
          const isMustWork = mustWorkDays.includes(dayOfWeek);
          const isLeave = leaves.includes(ds);
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          return (
            <div
              key={ds}
              onClick={() => !isMustWork && onToggle(ds)}
              style={{
                textAlign: 'center', fontSize: 10, padding: '4px 1px', borderRadius: 4,
                fontWeight: isLeave ? 900 : 600,
                cursor: isMustWork ? 'not-allowed' : 'pointer',
                border: isLeave ? '1.5px solid #ca8a04' : '1px solid #e2e8f0',
                background: isMustWork ? '#f1f5f9' : isLeave ? '#fef08a'
                  : isWeekend ? (dayOfWeek === 0 ? '#fef2f2' : '#eff6ff') : '#fff',
                color: isMustWork ? '#94a3b8' : isLeave ? '#78350f'
                  : dayOfWeek === 0 ? '#dc2626' : dayOfWeek === 6 ? '#2563eb' : '#1e293b',
                userSelect: 'none',
              }}
              title={isMustWork ? '고정근무일' : isLeave ? '휴무 취소' : '휴무 신청'}
            >
              {d.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Step3_LeaveInput({ config, onToggleLeave, onUpdatePrevMonth, onGenerate, onBack }: Props) {
  const dates = getDatesInMonth(config.year, config.month);
  const allStaff = [...config.laundryStaff, ...config.cleaningStaff];
  const totalLeaves = allStaff.reduce((sum, s) => sum + (config.requestedLeaves[s.id]?.length ?? 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1e293b' }}>
          🗓 3단계: 희망휴무 입력
        </h2>
        <span style={{ fontSize: 13, color: '#64748b' }}>
          {config.year}년 {config.month}월 · 총 {totalLeaves}명 희망휴무 입력됨
        </span>
      </div>

      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 12, color: '#1d4ed8', fontWeight: 600 }}>
        💡 날짜 클릭 시 희망휴무 등록/취소 · 노랗게 표시 · 고정근무일(수/토 등)은 선택 불가
      </div>

      {/* 전월 연속성 입력 */}
      <PrevMonthPanel
        staff={[...config.laundryStaff, ...config.cleaningStaff]}
        prevData={config.prevMonthLastWeek ?? {}}
        onChange={onUpdatePrevMonth}
      />

      {/* 런드리팀 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: '#1e3a5f', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          🧺 런드리팀
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
            (인당 목표 {config.laundryOffDays}일)
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {config.laundryStaff.map(s => (
            <PersonCalendar key={s.id} staff={s} dates={dates}
              offDaysTarget={config.laundryOffDays}
              leaves={config.requestedLeaves[s.id] ?? []}
              mustWorkDays={s.mustWorkDays ?? []}
              onToggle={ds => onToggleLeave(s.id, ds)} />
          ))}
        </div>
      </div>

      {/* 개별클리닝팀 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: '#1e3a5f', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          👔 개별클리닝팀
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
            (인당 목표 {config.cleaningOffDays}일)
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {config.cleaningStaff.map(s => (
            <PersonCalendar key={s.id} staff={s} dates={dates}
              offDaysTarget={config.cleaningOffDays}
              leaves={config.requestedLeaves[s.id] ?? []}
              mustWorkDays={s.mustWorkDays ?? []}
              onToggle={ds => onToggleLeave(s.id, ds)} />
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={onBack} style={backBtnStyle}>← 이전</button>
        <button onClick={onGenerate} style={generateBtnStyle}>
          🔄 스케줄 자동 생성
        </button>
      </div>
    </div>
  );
}

const backBtnStyle: React.CSSProperties = {
  padding: '13px 24px', background: '#f1f5f9', color: '#475569',
  border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
};
const generateBtnStyle: React.CSSProperties = {
  flex: 1, padding: '13px', background: 'linear-gradient(135deg, #059669, #047857)',
  color: '#fff', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 900, cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(5,150,105,0.4)',
};
