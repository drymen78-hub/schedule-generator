import { useState } from 'react';
import type { MonthSchedule, ScheduleConfig } from '../../types';
import { ScheduleTable } from '../ScheduleTable';
import { computeStats } from '../../logic/scheduler';
import { POSITION_LABELS } from '../../constants/teams';

interface Props {
  schedule: MonthSchedule;
  config: ScheduleConfig;
  onDownload: () => void;
  onRegenerate: () => void;
  onReset: () => void;
}

export function Step4_Result({ schedule, config, onDownload, onRegenerate, onReset }: Props) {
  const [tab, setTab] = useState<'laundry' | 'cleaning' | 'stats'>('laundry');
  const stats = computeStats(schedule, config);
  const errors = schedule.validationIssues.filter(i => i.level === 'error');
  const warns = schedule.validationIssues.filter(i => i.level === 'warn');

  return (
    <div>
      {/* 상단 액션 바 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1e293b' }}>
          ✅ 4단계: 스케줄 생성 결과 ({config.year}년 {config.month}월)
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onRegenerate} style={reBtnStyle}>🔄 재생성</button>
          <button onClick={onDownload} style={dlBtnStyle}>📥 엑셀 다운로드</button>
          <button onClick={onReset} style={resetBtnStyle}>처음부터</button>
        </div>
      </div>

      {/* 검증 결과 */}
      {(errors.length > 0 || warns.length > 0) && (
        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {errors.map((e, i) => (
            <div key={i} style={{ padding: '8px 14px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 12, color: '#dc2626', fontWeight: 700 }}>
              ❌ {e.message}
            </div>
          ))}
          {warns.map((w, i) => (
            <div key={i} style={{ padding: '8px 14px', background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8, fontSize: 12, color: '#854d0e', fontWeight: 600 }}>
              ⚠ {w.message}
            </div>
          ))}
        </div>
      )}
      {errors.length === 0 && warns.length === 0 && (
        <div style={{ marginBottom: 16, padding: '8px 14px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, fontSize: 12, color: '#15803d', fontWeight: 700 }}>
          ✅ 모든 제약조건을 만족합니다
        </div>
      )}

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: -1 }}>
        {([['laundry', '🧺 런드리팀'], ['cleaning', '👔 개별클리닝팀'], ['stats', '📊 통계']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '8px 18px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
            borderRadius: '8px 8px 0 0',
            background: tab === key ? '#fff' : '#f1f5f9',
            color: tab === key ? '#1e3a5f' : '#64748b',
            borderBottom: tab === key ? '2px solid #2563eb' : '2px solid transparent',
          }}>{label}</button>
        ))}
      </div>

      <div className="card" style={{ borderRadius: '0 8px 8px 8px', padding: 16, marginBottom: 20 }}>
        {tab === 'laundry' && (
          <ScheduleTable schedule={schedule} config={config} team="laundry" />
        )}
        {tab === 'cleaning' && (
          <ScheduleTable schedule={schedule} config={config} team="cleaning" />
        )}
        {tab === 'stats' && (
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#1e3a5f' }}>
                  {['이름', '팀', '근무일', '휴무일', '희망휴무', ...Object.values(POSITION_LABELS)].map(h => (
                    <th key={h} style={{ padding: '8px 10px', color: '#93c5fd', fontWeight: 800, textAlign: 'center', borderRight: '1px solid #334155', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.map((s, i) => (
                  <tr key={s.staffId} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={{ padding: '6px 10px', fontWeight: 800, borderRight: '1px solid #e2e8f0' }}>{s.name}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', color: '#64748b', borderRight: '1px solid #e2e8f0' }}>{s.team}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, borderRight: '1px solid #e2e8f0' }}>{s.workDays}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: '#78350f', background: '#fef9c3', borderRight: '1px solid #e2e8f0' }}>{s.offDays}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: '#854d0e', background: '#fcd34d', borderRight: '1px solid #e2e8f0' }}>{s.requestedOffDays}</td>
                    {Object.keys(POSITION_LABELS).map(pos => (
                      <td key={pos} style={{ padding: '6px 10px', textAlign: 'center', borderRight: '1px solid #e2e8f0', color: '#64748b' }}>
                        {s.positions[pos as keyof typeof s.positions] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 범례 */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: '#64748b', alignItems: 'center' }}>
        <span style={{ fontWeight: 700 }}>범례:</span>
        <span style={{ background: '#fef08a', color: '#78350f', padding: '2px 10px', borderRadius: 6, fontWeight: 700 }}>휴무</span>
        <span style={{ background: '#fcd34d', color: '#78350f', padding: '2px 10px', borderRadius: 6, fontWeight: 700 }}>희망휴무</span>
        <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 10px', borderRadius: 6, fontWeight: 700 }}>분류</span>
        <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '2px 10px', borderRadius: 6, fontWeight: 700 }}>기계</span>
        <span style={{ background: '#cffafe', color: '#0891b2', padding: '2px 10px', borderRadius: 6, fontWeight: 700 }}>웨트</span>
        <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 10px', borderRadius: 6, fontWeight: 700 }}>건조</span>
        <span style={{ background: '#fef9c3', color: '#854d0e', padding: '2px 10px', borderRadius: 6, fontWeight: 700 }}>QC</span>
        <span style={{ background: '#fce7f3', color: '#9d174d', padding: '2px 10px', borderRadius: 6, fontWeight: 700 }}>전처리</span>
      </div>
    </div>
  );
}

const reBtnStyle: React.CSSProperties = { padding: '9px 18px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' };
const dlBtnStyle: React.CSSProperties = { padding: '9px 20px', background: 'linear-gradient(135deg,#059669,#047857)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 900, cursor: 'pointer', boxShadow: '0 2px 8px rgba(5,150,105,0.4)' };
const resetBtnStyle: React.CSSProperties = { padding: '9px 14px', background: 'rgba(239,68,68,0.1)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' };
