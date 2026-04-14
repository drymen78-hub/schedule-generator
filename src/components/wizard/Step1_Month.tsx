import type { ScheduleConfig } from '../../types';
import { getDatesInMonth } from '../../logic/dateUtils';

interface Props {
  config: ScheduleConfig;
  onChange: (p: Partial<ScheduleConfig>) => void;
  onNext: () => void;
}

export function Step1_Month({ config, onChange, onNext }: Props) {
  const dates = getDatesInMonth(config.year, config.month);
  const friCount = dates.filter(d => d.getDay() === 5).length;
  const satCount = dates.filter(d => d.getDay() === 6).length;
  const sunCount = dates.filter(d => d.getDay() === 0).length;

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
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
            {/* 첫 날 빈칸 */}
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
          <div style={{ marginTop: 8, fontSize: 12, color: '#059669', fontWeight: 600 }}>
            ✓ 금/토 각 2명 휴무: {friCount + satCount}개 슬롯 (총 {(friCount + satCount) * 2}명 분)
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={labelStyle}>런드리팀 월 휴무일수</div>
          <input type="number" value={config.laundryOffDays} min={1} max={15}
            onChange={e => onChange({ laundryOffDays: Number(e.target.value) })}
            style={{ ...inputStyle, fontSize: 22, fontWeight: 900, textAlign: 'center' }} />
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
            인당 {config.laundryOffDays}일 · 6명 × {config.laundryOffDays}일 = {6 * config.laundryOffDays}일
          </div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={labelStyle}>개별클리닝팀 월 휴무일수</div>
          <input type="number" value={config.cleaningOffDays} min={1} max={15}
            onChange={e => onChange({ cleaningOffDays: Number(e.target.value) })}
            style={{ ...inputStyle, fontSize: 22, fontWeight: 900, textAlign: 'center' }} />
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
            인당 {config.cleaningOffDays}일 · 12명 × {config.cleaningOffDays}일 = {12 * config.cleaningOffDays}일
          </div>
        </div>
      </div>

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
