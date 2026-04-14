import type { MonthSchedule, ScheduleConfig, Position } from '../types';
import { getDatesInMonth, toDateStr, dow, getDayLabel } from '../logic/dateUtils';
import { POSITION_LABELS } from '../constants/teams';

interface Props {
  schedule: MonthSchedule;
  config: ScheduleConfig;
  team: 'laundry' | 'cleaning';
}

const POS_COLORS: Record<string, string> = {
  classification: '#dbeafe', machine: '#e0e7ff', wet: '#cffafe',
  dry: '#dcfce7', qc: '#fef9c3', pretreat: '#fce7f3', 기타: '#f1f5f9',
};
const POS_TEXT: Record<string, string> = {
  classification: '#1d4ed8', machine: '#4338ca', wet: '#0891b2',
  dry: '#15803d', qc: '#854d0e', pretreat: '#9d174d', 기타: '#475569',
};

export function ScheduleTable({ schedule, config, team }: Props) {
  const dates = getDatesInMonth(config.year, config.month);
  const schedules = team === 'laundry' ? schedule.laundry : schedule.cleaning;
  const staff = team === 'laundry' ? config.laundryStaff : config.cleaningStaff;

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
                </td>
                {dates.map(d => {
                  const ds = toDateStr(d);
                  const a = ps.assignments[ds];
                  const dayOfWeek = dow(d);
                  const isWeekend = dayOfWeek === 6 || dayOfWeek === 0;

                  if (!a || a.status === 'work') {
                    const pos = a?.position as Position | '기타' | undefined;
                    const label = pos ? (POSITION_LABELS[pos] ?? pos) : (team === 'laundry' ? '근무' : '근무');
                    const bg = pos ? (POS_COLORS[pos] ?? '#fff') : (isWeekend ? (dayOfWeek === 6 ? '#eff6ff' : '#fef2f2') : '#fff');
                    const fg = pos ? (POS_TEXT[pos] ?? '#1e293b') : (dayOfWeek === 6 ? '#1d4ed8' : dayOfWeek === 0 ? '#dc2626' : '#374151');
                    return (
                      <td key={ds} style={{ padding: '3px 1px', textAlign: 'center', background: bg, color: fg, fontWeight: 700, borderRight: '1px solid #e2e8f0', fontSize: 10 }}>
                        {label}
                      </td>
                    );
                  } else {
                    const isReq = a.status === 'requested';
                    return (
                      <td key={ds} style={{ padding: '3px 1px', textAlign: 'center', background: isReq ? '#fcd34d' : '#fef08a', color: '#78350f', fontWeight: 900, borderRight: '1px solid #e2e8f0', fontSize: 10 }}>
                        {isReq ? '희망' : '휴무'}
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
      </table>
    </div>
  );
}
