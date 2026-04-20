import { useState } from 'react';
import type { ScheduleConfig, StaffMember } from '../../types';
import { getDatesInMonth } from '../../logic/dateUtils';

interface Props {
  config: ScheduleConfig;
  onChange: (p: Partial<ScheduleConfig>) => void;
  onNext: () => void;
}

function PrevWeekPanel({
  laundryStaff, cleaningStaff, receivingStaff, prevWeekNeeded, onChange,
}: {
  laundryStaff: StaffMember[];
  cleaningStaff: StaffMember[];
  receivingStaff?: StaffMember[];
  prevWeekNeeded: Record<string, number>;
  onChange: (data: Record<string, number>) => void;
}) {
  const [open, setOpen] = useState(false);
  const allStaff = [...laundryStaff, ...cleaningStaff, ...(receivingStaff ?? [])];
  const activeCount = allStaff.filter(s => (prevWeekNeeded[s.id] ?? 0) > 0).length;

  const PersonRow = ({ s }: { s: StaffMember }) => {
    const val = prevWeekNeeded[s.id] ?? 0;
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
        background: val > 0 ? '#eff6ff' : '#f8fafc',
        borderRadius: 8, border: `1px solid ${val > 0 ? '#bfdbfe' : '#e2e8f0'}`,
      }}>
        <span style={{ fontWeight: 700, fontSize: 12, minWidth: 46, color: '#1e293b' }}>{s.name}</span>
        {s.part && (
          <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>{s.part}</span>
        )}
        <div style={{ display: 'flex', gap: 3, marginLeft: 'auto' }}>
          {[0, 1, 2].map(n => (
            <button key={n}
              onClick={() => onChange({ ...prevWeekNeeded, [s.id]: n })}
              style={{
                width: 28, height: 26, borderRadius: 6, fontSize: 11, fontWeight: 800,
                border: 'none', cursor: 'pointer',
                background: val === n ? '#1e3a5f' : '#e2e8f0',
                color:      val === n ? '#93c5fd'  : '#64748b',
              }}>
              {n}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', padding: '10px 16px', background: '#f8fafc', border: 'none', cursor: 'pointer',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: 13, fontWeight: 700, color: '#475569',
      }}>
        <span>
          📋 전월 연속성 보정 — 첫 금요일까지 필요 휴무 수
          {activeCount > 0 && (
            <span style={{ marginLeft: 8, fontSize: 11, background: '#dbeafe', color: '#1d4ed8',
              padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
              {activeCount}명 입력됨
            </span>
          )}
        </span>
        <span style={{ fontSize: 11 }}>{open ? '▲ 닫기' : '▼ 펼치기'}</span>
      </button>

      {open && (
        <div style={{ padding: 16, background: '#fff' }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14, lineHeight: 1.7 }}>
            전월 마지막 주에 주52시간 기준 휴무가 부족했던 경우, 이번 달 <b>첫 금요일까지</b> 우선 배정할 휴무 개수를 입력하세요.<br />
            <span style={{ color: '#2563eb' }}>예: 전월 마지막 주 휴무 1개만 했다면 → <b>1</b> 입력 → 이번 달 첫 주에 1일 추가 우선 배정</span>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1e3a5f', marginBottom: 8 }}>🧺 런드리팀</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {laundryStaff.map(s => <PersonRow key={s.id} s={s} />)}
            </div>
          </div>

          <div style={{ marginBottom: receivingStaff && receivingStaff.length > 0 ? 14 : 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1e3a5f', marginBottom: 8 }}>👔 개별클리닝팀</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {cleaningStaff.map(s => <PersonRow key={s.id} s={s} />)}
            </div>
          </div>

          {receivingStaff && receivingStaff.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1e3a5f', marginBottom: 8 }}>🌙 야간입고팀</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {receivingStaff.map(s => <PersonRow key={s.id} s={s} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Step1_Month({ config, onChange, onNext }: Props) {
  const dates = getDatesInMonth(config.year, config.month);
  const friCount = dates.filter(d => d.getDay() === 5).length;
  const satCount = dates.filter(d => d.getDay() === 6).length;
  const sunCount = dates.filter(d => d.getDay() === 0).length;
  const hasReceiving = (config.receivingStaff ?? []).length > 0;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1e293b', marginBottom: 24 }}>
        📅 1단계: 스케줄 연/월 선택
      </h2>

      <div className="card" style={{ padding: 28, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <label style={{ flex: 1 }}>
            <div style={labelStyle}>연도</div>
            <input type="number" value={config.year} min={2024} max={2030}
              onChange={e => onChange({ year: Number(e.target.value) })}
              style={inputStyle} />
          </label>
          <label style={{ flex: 1 }}>
            <div style={labelStyle}>월</div>
            <select value={config.month} onChange={e => onChange({ month: Number(e.target.value) })}
              style={inputStyle}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{m}월</option>
              ))}
            </select>
          </label>
        </div>

        {/* 월 미리보기 */}
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 12 }}>
            {config.year}년 {config.month}월 미리보기
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 10 }}>
            {['일','월','화','수','목','금','토'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700,
                color: d === '일' ? '#dc2626' : d === '토' ? '#2563eb' : '#64748b' }}>
                {d}
              </div>
            ))}
            {Array.from({ length: dates[0].getDay() }, (_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {dates.map(d => (
              <div key={d.getDate()} style={{
                textAlign: 'center', fontSize: 11, padding: '4px 2px', borderRadius: 5,
                background: d.getDay() === 0 ? '#fef2f2' : d.getDay() === 6 ? '#eff6ff' : '#fff',
                color: d.getDay() === 0 ? '#dc2626' : d.getDay() === 6 ? '#2563eb' : '#1e293b',
                fontWeight: 600, border: '1px solid #e2e8f0',
              }}>
                {d.getDate()}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748b', flexWrap: 'wrap' }}>
            <span>📆 총 <b>{dates.length}일</b></span>
            <span>📅 금요일 <b>{friCount}개</b></span>
            <span>📅 토요일 <b>{satCount}개</b></span>
            <span>📅 일요일 <b>{sunCount}개</b></span>
          </div>
        </div>
      </div>

      {/* 팀별 월 휴무일수 */}
      <div style={{ display: 'grid', gridTemplateColumns: hasReceiving ? 'repeat(3, 1fr)' : '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={labelStyle}>🧺 런드리팀 월 휴무일수</div>
          <input type="number" value={config.laundryOffDays} min={1} max={20}
            onChange={e => onChange({ laundryOffDays: Number(e.target.value) })}
            style={{ ...inputStyle, fontSize: 22, fontWeight: 900, textAlign: 'center' }} />
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
            인당 {config.laundryOffDays}일 · {config.laundryStaff.length}명
          </div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={labelStyle}>👔 개별클리닝팀 월 휴무일수</div>
          <input type="number" value={config.cleaningOffDays} min={1} max={20}
            onChange={e => onChange({ cleaningOffDays: Number(e.target.value) })}
            style={{ ...inputStyle, fontSize: 22, fontWeight: 900, textAlign: 'center' }} />
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
            인당 {config.cleaningOffDays}일 · {config.cleaningStaff.length}명
          </div>
        </div>
        {hasReceiving && (
          <div className="card" style={{ padding: 20 }}>
            <div style={labelStyle}>🌙 야간입고팀 월 휴무일수</div>
            <input type="number" value={config.receivingOffDays ?? 10} min={1} max={20}
              onChange={e => onChange({ receivingOffDays: Number(e.target.value) })}
              style={{ ...inputStyle, fontSize: 22, fontWeight: 900, textAlign: 'center' }} />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
              인당 {config.receivingOffDays ?? 10}일 · {(config.receivingStaff ?? []).length}명
            </div>
          </div>
        )}
      </div>

      {/* 전월 연속성 보정 */}
      <PrevWeekPanel
        laundryStaff={config.laundryStaff}
        cleaningStaff={config.cleaningStaff}
        receivingStaff={config.receivingStaff}
        prevWeekNeeded={config.prevWeekNeeded ?? {}}
        onChange={data => onChange({ prevWeekNeeded: data })}
      />

      <button onClick={onNext} style={nextBtnStyle}>
        다음 단계: 팀원 및 포지션 설정 →
      </button>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8 };
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8,
  fontSize: 15, fontWeight: 700, color: '#1e293b', background: '#fff',
};
const nextBtnStyle: React.CSSProperties = {
  width: '100%', padding: '14px', background: 'linear-gradient(135deg, #1e3a5f, #1a3050)',
  color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: 'pointer',
};
