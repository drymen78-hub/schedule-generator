import type { MonthSchedule, ScheduleConfig, Position, SkillLevel } from '../types';
import { getDatesInMonth, toDateStr, dow, getDayLabel } from '../logic/dateUtils';
import { POSITION_LABELS } from '../constants/teams';

interface Props {
  schedule: MonthSchedule;
  config: ScheduleConfig;
  team: 'laundry' | 'cleaning' | 'receiving';
  onToggleCell?: (staffId: string, dateStr: string) => void;
  productionData?: Record<string, number>;
  onUpdateProduction?: (dateStr: string, quantity: number) => void;
}

const SKILL_STYLE: Record<SkillLevel, { bg: string; color: string; label: string }> = {
  high: { bg: '#dcfce7', color: '#15803d', label: '상' },
  mid:  { bg: '#fef9c3', color: '#854d0e', label: '중' },
  low:  { bg: '#fee2e2', color: '#dc2626', label: '하' },
};

function SkillBadge({ level }: { level?: SkillLevel }) {
  if (!level) return null;
  const s = SKILL_STYLE[level];
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, padding: '1px 4px', borderRadius: 6,
      background: s.bg, color: s.color, marginLeft: 4, verticalAlign: 'middle',
    }}>{s.label}</span>
  );
}

const POS_COLORS: Record<string, string> = {
  classification: '#dbeafe', machine: '#e0e7ff', wet: '#cffafe',
  dry: '#dcfce7', qc: '#fef9c3', pretreat: '#fce7f3', 기타: '#f1f5f9',
  // 야간입고
  recv_moving: '#e0f2fe', recv_rawwash: '#fce7f3', recv_living: '#dcfce7', recv_sort: '#f8fafc',
};
const POS_TEXT: Record<string, string> = {
  classification: '#1d4ed8', machine: '#4338ca', wet: '#0891b2',
  dry: '#15803d', qc: '#854d0e', pretreat: '#9d174d', 기타: '#475569',
  // 야간입고
  recv_moving: '#0369a1', recv_rawwash: '#9d174d', recv_living: '#15803d', recv_sort: '#64748b',
};

export function ScheduleTable({ schedule, config, team, onToggleCell, productionData, onUpdateProduction }: Props) {
  const dates = getDatesInMonth(config.year, config.month);
  const schedules = team === 'laundry' ? schedule.laundry
    : team === 'receiving' ? (schedule.receiving ?? [])
    : schedule.cleaning;
  const staff = team === 'laundry' ? config.laundryStaff
    : team === 'receiving' ? (config.receivingStaff ?? [])
    : config.cleaningStaff;

  const thStyle = (d: Date): React.CSSProperties => ({
    padding: '6px 2px', fontSize: 10, fontWeight: 800, textAlign: 'center',
    background: dow(d) === 6 ? '#dbeafe' : dow(d) === 0 ? '#fee2e2' : '#1e3a5f',
    color: dow(d) === 6 ? '#1d4ed8' : dow(d) === 0 ? '#dc2626' : '#93c5fd',
    borderRight: '1px solid #334155', whiteSpace: 'nowrap', minWidth: 32,
  });

  return (
    <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #e2e8f0' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ padding: '8px 12px', background: '#1e3a5f', color: '#93c5fd', fontSize: 11, fontWeight: 800, textAlign: 'left', minWidth: 60, borderRight: '1px solid #334155' }}>
              이름
            </th>
            {dates.map(d => (
              <th key={toDateStr(d)} style={thStyle(d)}>
                {d.getDate()}<br />
                <span style={{ fontSize: 9 }}>{getDayLabel(d)}</span>
              </th>
            ))}
            <th style={{ padding: '6px 8px', background: '#1e3a5f', color: '#93c5fd', fontSize: 10, fontWeight: 800, textAlign: 'center', borderLeft: '1px solid #334155' }}>근무</th>
            <th style={{ padding: '6px 8px', background: '#fef08a', color: '#78350f', fontSize: 10, fontWeight: 800, textAlign: 'center' }}>휴무</th>
          </tr>
        </thead>
        <tbody>
          {schedules.map((ps, rowIdx) => {
            const person = staff.find(s => s.id === ps.staffId);
            if (!person) return null;
            const assignments = Object.entries(ps.assignments);
            const workDays = assignments.filter(([, a]) => a.status === 'work').length;
            const offDays = assignments.filter(([, a]) => a.status !== 'work').length;

            return (
              <tr key={ps.staffId} style={{ background: rowIdx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                <td style={{ padding: '4px 10px', fontWeight: 800, fontSize: 12, color: '#1e293b', borderRight: '1px solid #e2e8f0', background: rowIdx % 2 === 0 ? '#f8fafc' : '#f1f5f9', whiteSpace: 'nowrap' }}>
                  {person.name}
                  <SkillBadge level={person.skillLevel} />
                  {person.part && (
                    <span style={{ fontSize: 8, fontWeight: 700, marginLeft: 3, color: '#94a3b8' }}>{person.part}</span>
                  )}
                </td>
                {dates.map(d => {
                  const ds = toDateStr(d);
                  const a = ps.assignments[ds];
                  const dayOfWeek = dow(d);
                  const isWeekend = dayOfWeek === 6 || dayOfWeek === 0;

                  const editable = !!onToggleCell;
                  const cellBase: React.CSSProperties = {
                    padding: '3px 1px', textAlign: 'center', borderRight: '1px solid #e2e8f0',
                    fontSize: 10, fontWeight: 700,
                    cursor: editable ? 'pointer' : 'default',
                    transition: editable ? 'filter 0.1s' : undefined,
                  };
                  if (!a || a.status === 'work') {
                    const pos = a?.position as Position | '기타' | undefined;
                    const label = pos ? (POSITION_LABELS[pos] ?? pos) : '근무';
                    const bg = pos ? (POS_COLORS[pos] ?? '#fff') : (isWeekend ? (dayOfWeek === 6 ? '#eff6ff' : '#fef2f2') : '#fff');
                    const fg = pos ? (POS_TEXT[pos] ?? '#1e293b') : (dayOfWeek === 6 ? '#1d4ed8' : dayOfWeek === 0 ? '#dc2626' : '#374151');
                    return (
                      <td key={ds}
                        onClick={() => onToggleCell?.(ps.staffId, ds)}
                        title={editable ? '클릭: 휴무로 변경' : undefined}
                        style={{ ...cellBase, background: bg, color: fg }}>
                        {label}
                      </td>
                    );
                  } else {
                    const isReq = a.status === 'requested';
                    return (
                      <td key={ds}
                        onClick={() => onToggleCell?.(ps.staffId, ds)}
                        title={editable ? '클릭: 근무로 변경' : undefined}
                        style={{ ...cellBase, background: isReq ? '#fcd34d' : '#fef08a', color: '#78350f', fontWeight: 900 }}>
                        {isReq ? '지정' : '휴무'}
                      </td>
                    );
                  }
                })}
                <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 900, fontSize: 13, color: '#1e293b', borderLeft: '1px solid #e2e8f0' }}>{workDays}</td>
                <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 900, fontSize: 13, color: '#78350f', background: '#fef9c3' }}>{offDays}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ background: '#0f2744' }}>
            <td style={{ padding: '5px 10px', fontSize: 10, fontWeight: 800, color: '#7dd3fc', borderRight: '1px solid #334155', whiteSpace: 'nowrap' }}>
              근무인원
            </td>
            {dates.map(d => {
              const ds = toDateStr(d);
              const count = schedules.filter(ps => {
                const a = ps.assignments[ds];
                return !a || a.status === 'work';
              }).length;
              const dayOfWeek = dow(d);
              return (
                <td key={ds} style={{
                  padding: '5px 1px', textAlign: 'center', fontSize: 11, fontWeight: 900,
                  color: dayOfWeek === 0 ? '#fca5a5' : dayOfWeek === 6 ? '#93c5fd' : '#e2e8f0',
                  borderRight: '1px solid #1e3a5f',
                }}>
                  {count}
                </td>
              );
            })}
            <td colSpan={2} style={{ borderLeft: '1px solid #1e3a5f' }} />
          </tr>
          {productionData !== undefined && onUpdateProduction && (
            <tr style={{ background: '#064e3b' }}>
              <td style={{ padding: '5px 10px', fontSize: 10, fontWeight: 800, color: '#6ee7b7', borderRight: '1px solid #065f46', whiteSpace: 'nowrap' }}>
                생산량
              </td>
              {dates.map(d => {
                const ds = toDateStr(d);
                const dayOfWeek = dow(d);
                const val = productionData[ds];
                return (
                  <td key={ds}
                    style={{ padding: '0', borderRight: '1px solid #065f46', verticalAlign: 'middle' }}
                    onClick={e => e.stopPropagation()}>
                    <input
                      type="number"
                      min={0}
                      value={val ?? ''}
                      onChange={e => {
                        const v = parseInt(e.target.value, 10);
                        onUpdateProduction(ds, isNaN(v) ? 0 : v);
                      }}
                      onFocus={e => e.target.select()}
                      onClick={e => e.stopPropagation()}
                      onPointerDown={e => e.stopPropagation()}
                      placeholder="-"
                      style={{
                        display: 'block',
                        width: '100%',
                        minHeight: 28,
                        textAlign: 'center',
                        border: 'none',
                        background: 'transparent',
                        fontSize: 10,
                        fontWeight: 700,
                        color: val !== undefined
                          ? '#a7f3d0'
                          : dayOfWeek === 0 ? '#fca5a5' : dayOfWeek === 6 ? '#93c5fd' : '#6ee7b7',
                        outline: 'none',
                        padding: '4px 2px',
                        cursor: 'text',
                        boxSizing: 'border-box',
                        MozAppearance: 'textfield',
                      } as React.CSSProperties}
                    />
                  </td>
                );
              })}
              <td colSpan={2} style={{ borderLeft: '1px solid #065f46' }} />
            </tr>
          )}
        </tfoot>
      </table>
    </div>
  );
}
