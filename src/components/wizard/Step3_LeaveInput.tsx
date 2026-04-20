import { useState } from 'react';
import type { ScheduleConfig, StaffMember } from '../../types';
import { getDatesInMonth, toDateStr, dow } from '../../logic/dateUtils';

interface Props {
  config: ScheduleConfig;
  onToggleLeave: (staffId: string, dateStr: string) => void;
  onToggleWork:  (staffId: string, dateStr: string) => void;
  onGenerate: () => void;
  generateError?: string | null;
  onBack: () => void;
}

/**
 * 개인별 달력 컴포넌트
 * mode='leave' : 희망휴무 입력 (노랑) / 근무 지정일은 초록으로 표시(클릭 불가)
 * mode='work'  : 근무 지정일 입력 (초록) / 희망휴무는 노랑으로 표시(클릭 불가)
 */
function PersonCalendar({
  staff, dates, offDaysTarget, leaves, works, mode, onToggle,
}: {
  staff: StaffMember;
  dates: Date[];
  offDaysTarget: number;
  leaves: string[];
  works: string[];
  mode: 'leave' | 'work';
  onToggle: (ds: string) => void;
}) {
  const selected  = mode === 'leave' ? leaves : works;
  const blocked   = mode === 'leave' ? works  : leaves;
  const firstDow  = dates[0].getDay();

  const countLabel = mode === 'leave'
    ? `${leaves.length} / ${offDaysTarget}일`
    : `${works.length}일 지정`;
  const countBg = mode === 'leave'
    ? (leaves.length > offDaysTarget ? '#fee2e2' : leaves.length === offDaysTarget ? '#dcfce7' : '#f1f5f9')
    : '#dcfce7';
  const countColor = mode === 'leave'
    ? (leaves.length > offDaysTarget ? '#dc2626' : leaves.length === offDaysTarget ? '#15803d' : '#64748b')
    : '#15803d';

  return (
    <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{staff.name}</span>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10,
          background: countBg, color: countColor,
        }}>
          {countLabel}
        </span>
      </div>

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
          const dayOfWeek  = dow(d);
          const isSelected = selected.includes(ds);
          const isBlocked  = blocked.includes(ds);
          const isWeekend  = dayOfWeek === 0 || dayOfWeek === 6;

          let bg = '#fff';
          let color = dayOfWeek === 0 ? '#dc2626' : dayOfWeek === 6 ? '#2563eb' : '#1e293b';
          let border = '1px solid #e2e8f0';
          let cursor = 'pointer';
          let title = mode === 'leave' ? (isSelected ? '휴무 취소' : '휴무 신청') : (isSelected ? '근무지정 취소' : '근무 지정');

          if (isBlocked) {
            // 반대 모드로 지정된 날 — 표시만, 클릭 불가
            bg     = mode === 'leave' ? '#d1fae5' : '#fef9c3';
            color  = mode === 'leave' ? '#065f46' : '#78350f';
            border = mode === 'leave' ? '1.5px solid #6ee7b7' : '1.5px solid #ca8a04';
            cursor = 'not-allowed';
            title  = mode === 'leave' ? '근무 지정일 (변경 불가)' : '휴무지정됨 (변경 불가)';
          } else if (isSelected) {
            bg     = mode === 'leave' ? '#fef08a' : '#bbf7d0';
            color  = mode === 'leave' ? '#78350f' : '#065f46';
            border = mode === 'leave' ? '1.5px solid #ca8a04' : '1.5px solid #16a34a';
          } else if (isWeekend) {
            bg = dayOfWeek === 0 ? '#fef2f2' : '#eff6ff';
          }

          return (
            <div
              key={ds}
              onClick={() => !isBlocked && onToggle(ds)}
              style={{
                textAlign: 'center', fontSize: 10, padding: '4px 1px', borderRadius: 4,
                fontWeight: (isSelected || isBlocked) ? 900 : 600,
                cursor, border, background: bg, color,
                userSelect: 'none',
              }}
              title={title}
            >
              {d.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 팀 섹션 — 희망휴무 / 근무 지정일 탭 전환 */
function TeamSection({
  label, staff, dates, offDaysTarget,
  leaves, works, onToggleLeave, onToggleWork, gridCols,
}: {
  label: string;
  staff: StaffMember[];
  dates: Date[];
  offDaysTarget: number;
  leaves: Record<string, string[]>;
  works:  Record<string, string[]>;
  onToggleLeave: (id: string, ds: string) => void;
  onToggleWork:  (id: string, ds: string) => void;
  gridCols: number;
}) {
  const [mode, setMode] = useState<'leave' | 'work'>('leave');

  const leaveCount = staff.reduce((s, p) => s + (leaves[p.id]?.length ?? 0), 0);
  const workCount  = staff.reduce((s, p) => s + (works[p.id]?.length  ?? 0), 0);

  return (
    <div style={{ marginBottom: 28 }}>
      {/* 팀 헤더 + 탭 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 900, color: '#1e3a5f' }}>{label}</span>
        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
          (인당 목표 {offDaysTarget}일)
        </span>
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          <button onClick={() => setMode('leave')} style={{
            padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            border: 'none', cursor: 'pointer',
            background: mode === 'leave' ? '#fef08a' : '#f1f5f9',
            color:      mode === 'leave' ? '#78350f' : '#64748b',
            outline:    mode === 'leave' ? '2px solid #ca8a04' : 'none',
          }}>
            🌙 휴무지정 {leaveCount > 0 && <span>({leaveCount})</span>}
          </button>
          <button onClick={() => setMode('work')} style={{
            padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            border: 'none', cursor: 'pointer',
            background: mode === 'work' ? '#bbf7d0' : '#f1f5f9',
            color:      mode === 'work' ? '#065f46' : '#64748b',
            outline:    mode === 'work' ? '2px solid #16a34a' : 'none',
          }}>
            ✅ 근무 지정 {workCount > 0 && <span>({workCount})</span>}
          </button>
        </div>
      </div>

      {/* 안내 메시지 */}
      <div style={{
        marginBottom: 10, padding: '7px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600,
        background: mode === 'leave' ? '#fffbeb' : '#f0fdf4',
        color:      mode === 'leave' ? '#92400e'  : '#14532d',
        border: `1px solid ${mode === 'leave' ? '#fde68a' : '#86efac'}`,
      }}>
        {mode === 'leave'
          ? '💡 클릭 → 휴무지정 등록/취소 (노랑). 초록 날짜는 근무 지정일로 변경 불가.'
          : '💡 클릭 → 근무 지정/취소 (초록). 근무 지정일은 스케줄 생성 시 무조건 근무로 처리됩니다.'}
      </div>

      {/* 달력 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: 12 }}>
        {staff.map(s => (
          <PersonCalendar
            key={s.id}
            staff={s}
            dates={dates}
            offDaysTarget={offDaysTarget}
            leaves={leaves[s.id] ?? []}
            works={works[s.id]  ?? []}
            mode={mode}
            onToggle={ds => mode === 'leave' ? onToggleLeave(s.id, ds) : onToggleWork(s.id, ds)}
          />
        ))}
      </div>
    </div>
  );
}

export function Step3_LeaveInput({ config, onToggleLeave, onToggleWork, onGenerate, generateError, onBack }: Props) {
  const dates = getDatesInMonth(config.year, config.month);
  const allStaff = [...config.laundryStaff, ...config.cleaningStaff];
  const totalLeaves = allStaff.reduce((sum, s) => sum + (config.requestedLeaves[s.id]?.length ?? 0), 0);
  const totalWorks  = allStaff.reduce((sum, s) => sum + (config.requestedWorks[s.id]?.length  ?? 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1e293b' }}>
          🗓 3단계: 휴무지정 · 근무 지정일 입력
        </h2>
        <span style={{ fontSize: 12, color: '#64748b' }}>
          {config.year}년 {config.month}월
          {totalLeaves > 0 && ` · 휴무지정 ${totalLeaves}건`}
          {totalWorks  > 0 && ` · 근무지정 ${totalWorks}건`}
        </span>
      </div>

      {/* 런드리팀 */}
      <TeamSection
        label="🧺 런드리팀"
        staff={config.laundryStaff}
        dates={dates}
        offDaysTarget={config.laundryOffDays}
        leaves={config.requestedLeaves}
        works={config.requestedWorks}
        onToggleLeave={onToggleLeave}
        onToggleWork={onToggleWork}
        gridCols={3}
      />

      {/* 개별클리닝팀 */}
      <TeamSection
        label="👔 개별클리닝팀"
        staff={config.cleaningStaff}
        dates={dates}
        offDaysTarget={config.cleaningOffDays}
        leaves={config.requestedLeaves}
        works={config.requestedWorks}
        onToggleLeave={onToggleLeave}
        onToggleWork={onToggleWork}
        gridCols={4}
      />

      {/* 야간입고팀 */}
      {config.receivingStaff && config.receivingStaff.length > 0 && (
        <TeamSection
          label="🌙 야간입고팀"
          staff={config.receivingStaff}
          dates={dates}
          offDaysTarget={Math.round(
            Object.values(config.receivingDailyTargets ?? {}).reduce((s, v) => s + v, 0) /
            Math.max(1, Object.keys(config.receivingDailyTargets ?? {}).length)
          )}
          leaves={config.requestedLeaves}
          works={config.requestedWorks}
          onToggleLeave={onToggleLeave}
          onToggleWork={onToggleWork}
          gridCols={5}
        />
      )}

      {generateError && (
        <div style={{
          marginBottom: 12, padding: '10px 16px', borderRadius: 8,
          background: '#fee2e2', color: '#991b1b',
          border: '1px solid #fca5a5', fontSize: 13, fontWeight: 600,
        }}>
          ⚠️ 스케줄 생성 실패: {generateError}
        </div>
      )}
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
