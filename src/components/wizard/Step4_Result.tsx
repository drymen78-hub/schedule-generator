import { useState } from 'react';
import type { MonthSchedule, ScheduleConfig, SkillLevel } from '../../types';
import { ScheduleTable } from '../ScheduleTable';
import { ProductionTab } from '../ProductionTab';
import { computeStats } from '../../logic/scheduler';
import type { RetryValidationResult } from '../../store/useAppStore';
import { POSITION_LABELS } from '../../constants/teams';

const SKILL_STYLE: Record<SkillLevel, { bg: string; color: string; label: string }> = {
  high: { bg: '#dcfce7', color: '#15803d', label: '상' },
  mid:  { bg: '#fef9c3', color: '#854d0e', label: '중' },
  low:  { bg: '#fee2e2', color: '#dc2626', label: '하' },
};

interface Props {
  schedule: MonthSchedule;
  config: ScheduleConfig;
  productionData: Record<string, number>;
  apiKey?: string;
  scriptUrl?: string;
  confirmedAt?: string | null;
  sheetsStatus?: string;
  lastGenerateResult?: RetryValidationResult | null;
  onUpdateProduction: (dateStr: string, quantity: number) => void;
  onDownload: () => void;
  onRegenerate: () => void;
  onReset: () => void;
  onToggleCell: (team: 'laundry' | 'cleaning' | 'receiving', staffId: string, dateStr: string) => void;
  onRevert: () => void;
  onConfirmSchedule?: () => void;
  onLoadConfirmedSchedule?: () => void;
}

export function Step4_Result({ schedule, config, productionData, apiKey, scriptUrl, confirmedAt, sheetsStatus, lastGenerateResult, onUpdateProduction, onDownload, onRegenerate, onReset, onToggleCell, onRevert, onConfirmSchedule, onLoadConfirmedSchedule }: Props) {
  const [tab, setTab] = useState<'laundry' | 'cleaning' | 'receiving' | 'stats' | 'production'>('laundry');
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
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={onRegenerate} style={reBtnStyle}
            title="현재 설정을 유지한 채로 스케줄을 다시 생성합니다">🔄 재생성</button>
          <button onClick={onRevert} style={revertBtnStyle}
            title="셀 수동 변경 이전, 자동 생성된 원본 스케줄로 되돌립니다">↩ 원복</button>
          <button onClick={onDownload} style={dlBtnStyle}
            title="현재 스케줄과 생산량 데이터를 Excel 파일로 저장합니다">📥 엑셀 다운로드</button>

          {/* Google Sheets 공유 기능 */}
          {scriptUrl && (
            <>
              <button onClick={onConfirmSchedule}
                disabled={sheetsStatus === 'saving'}
                style={{
                  padding: '9px 16px',
                  background: confirmedAt ? 'linear-gradient(135deg,#059669,#047857)' : 'linear-gradient(135deg,#7c3aed,#6d28d9)',
                  color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800,
                  cursor: sheetsStatus === 'saving' ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(109,40,217,0.35)',
                  opacity: sheetsStatus === 'saving' ? 0.7 : 1,
                }}
                title="스케줄을 Google Sheets에 저장하고 팀원과 공유합니다">
                {sheetsStatus === 'saving' ? '💾 저장 중...' : confirmedAt ? '✅ 확정됨' : '📤 스케줄 확정·공유'}
              </button>
              <button onClick={onLoadConfirmedSchedule}
                style={{ ...revertBtnStyle, fontSize: 11 }}
                title="Google Sheets에서 확정된 스케줄을 불러옵니다">
                ↓ 최신 불러오기
              </button>
            </>
          )}
          {confirmedAt && (
            <span style={{ fontSize: 10, color: '#64748b' }}>
              확정: {new Date(confirmedAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}

          <button onClick={onReset} style={resetBtnStyle}
            title="모든 설정과 스케줄을 초기화하고 1단계로 돌아갑니다">처음부터</button>
        </div>
      </div>

      {/* 반복 생성 결과 요약 */}
      {lastGenerateResult && (
        <div style={{
          marginBottom: 12, padding: '10px 16px',
          background: lastGenerateResult.score === 0 ? '#f0fdf4' : '#fffbeb',
          border: `1px solid ${lastGenerateResult.score === 0 ? '#86efac' : '#fde68a'}`,
          borderRadius: 10, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#475569' }}>
            {lastGenerateResult.attempts}회 시도 후 최적 결과 선택
          </span>
          {([
            ['dailyVariance', '인원 편차 ±1'],
            ['weeklyOff',     '주간 휴무 2개'],
            ['consecWork',    '연속 근무 ≤3일'],
            ['consecOff',     '연속 휴무 ≤1일'],
          ] as const).map(([key, label]) => {
            const ok = lastGenerateResult.checks[key];
            return (
              <span key={key} style={{
                fontSize: 11, fontWeight: 700,
                padding: '2px 9px', borderRadius: 6,
                background: ok ? '#dcfce7' : '#fee2e2',
                color: ok ? '#15803d' : '#dc2626',
              }}>
                {ok ? '✓' : '✗'} {label}
              </span>
            );
          })}
        </div>
      )}

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
      <div style={{ display: 'flex', gap: 4, marginBottom: -1, flexWrap: 'wrap' }}>
        {(([
          ['laundry',   '🧺 런드리팀'],
          ['cleaning',  '👔 개별클리닝팀'],
          ...(schedule.receiving ? [['receiving', '🌙 야간입고팀']] : []),
          ['stats',     '📊 통계'],
          ['production','📦 생산량 분석'],
        ]) as Array<[typeof tab, string]>).map(([key, label]) => (
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
          <div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
              💡 셀 클릭: 근무 ↔ 휴무 변경 · 하단 <b>생산량</b> 행에 일별 처리 건수 입력
            </div>
            <ScheduleTable schedule={schedule} config={config} team="laundry"
              onToggleCell={(staffId, dateStr) => onToggleCell('laundry', staffId, dateStr)}
              productionData={productionData}
              onUpdateProduction={onUpdateProduction} />
          </div>
        )}
        {tab === 'cleaning' && (
          <div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
              💡 셀 클릭: 근무 ↔ 휴무 변경 · 하단 <b>생산량</b> 행에 일별 처리 건수 입력
            </div>
            <ScheduleTable schedule={schedule} config={config} team="cleaning"
              onToggleCell={(staffId, dateStr) => onToggleCell('cleaning', staffId, dateStr)}
              productionData={productionData}
              onUpdateProduction={onUpdateProduction} />
          </div>
        )}
        {tab === 'receiving' && schedule.receiving && (
          <div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
              💡 셀 클릭: 근무 ↔ 휴무 변경 · 파트별(관리자/1파트/2파트) 색 구분
            </div>
            <ScheduleTable schedule={schedule} config={config} team="receiving"
              onToggleCell={(staffId, dateStr) => onToggleCell('receiving', staffId, dateStr)} />
          </div>
        )}
        {tab === 'production' && (
          <ProductionTab
            schedule={schedule}
            config={config}
            productionData={productionData}
            apiKey={apiKey}
          />
        )}
        {tab === 'stats' && (
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#1e3a5f' }}>
                  {['이름', '역량도', '팀', '근무일', '휴무일', '휴무지정', ...Object.values(POSITION_LABELS)].map(h => (
                    <th key={h} style={{ padding: '8px 10px', color: '#93c5fd', fontWeight: 800, textAlign: 'center', borderRight: '1px solid #334155', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.map((s, i) => {
                  const allStaff = [...config.laundryStaff, ...config.cleaningStaff];
                  const member = allStaff.find(m => m.id === s.staffId);
                  const skill = member?.skillLevel;
                  const skillS = skill ? SKILL_STYLE[skill] : null;
                  return (
                  <tr key={s.staffId} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={{ padding: '6px 10px', fontWeight: 800, borderRight: '1px solid #e2e8f0' }}>{s.name}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                      {skillS
                        ? <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 8, background: skillS.bg, color: skillS.color }}>{skillS.label}</span>
                        : <span style={{ color: '#94a3b8', fontSize: 11 }}>-</span>}
                    </td>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 범례 */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: '#64748b', alignItems: 'center' }}>
        <span style={{ fontWeight: 700 }}>범례:</span>
        <span style={{ background: '#fef08a', color: '#78350f', padding: '2px 10px', borderRadius: 6, fontWeight: 700 }}>휴무</span>
        <span style={{ background: '#fcd34d', color: '#78350f', padding: '2px 10px', borderRadius: 6, fontWeight: 700 }}>휴무지정</span>
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
const revertBtnStyle: React.CSSProperties = { padding: '9px 14px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' };
const dlBtnStyle: React.CSSProperties = { padding: '9px 20px', background: 'linear-gradient(135deg,#059669,#047857)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 900, cursor: 'pointer', boxShadow: '0 2px 8px rgba(5,150,105,0.4)' };
const resetBtnStyle: React.CSSProperties = { padding: '9px 14px', background: 'rgba(239,68,68,0.1)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' };
