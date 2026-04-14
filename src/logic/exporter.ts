/* eslint-disable @typescript-eslint/no-explicit-any */
import XLSX from 'xlsx-js-style';
import type { MonthSchedule, ScheduleConfig, Position, PersonSchedule } from '../types';
import { getDatesInMonth, toDateStr, dow, getDayLabel } from './dateUtils';
import { POSITION_LABELS } from '../constants/teams';

const COLORS = {
  header:    { fgColor: { rgb: '1E3A5F' } },
  teamRow:   { fgColor: { rgb: '1E3A5F' } },
  off:       { fgColor: { rgb: 'FEF08A' } },   // 휴무: 노랑
  requested: { fgColor: { rgb: 'FCD34D' } },   // 희망휴무: 진노랑
  saturday:  { fgColor: { rgb: 'EFF6FF' } },   // 토요일 열
  sunday:    { fgColor: { rgb: 'FEF2F2' } },   // 일요일 열
  classification: { fgColor: { rgb: 'DBEAFE' } },
  machine:        { fgColor: { rgb: 'E0E7FF' } },
  wet:            { fgColor: { rgb: 'CFFAFE' } },
  dry:            { fgColor: { rgb: 'DCFCE7' } },
  qc:             { fgColor: { rgb: 'FEF9C3' } },
  pretreat:       { fgColor: { rgb: 'FCE7F3' } },
  기타:           { fgColor: { rgb: 'F1F5F9' } },
};

function cell(v: string | number, bold = false, fill?: typeof COLORS.header, color = 'FFFFFF', center = true): any {
  return {
    v,
    t: 's',
    s: {
      font: { name: 'Malgun Gothic', sz: 9, bold, color: { rgb: color } },
      alignment: { horizontal: center ? 'center' : 'left', vertical: 'center', wrapText: true },
      fill: fill ? { patternType: 'solid', ...fill } : { patternType: 'none' },
      border: {
        top:    { style: 'thin', color: { rgb: 'CBD5E1' } },
        bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
        left:   { style: 'thin', color: { rgb: 'CBD5E1' } },
        right:  { style: 'thin', color: { rgb: 'CBD5E1' } },
      },
    },
  };
}

function buildSheet(
  schedules: PersonSchedule[],
  staff: ScheduleConfig['laundryStaff'],
  dates: Date[],
  isClean: boolean,
  teamLabel: string,
): XLSX.WorkSheet {
  const aoa: any[][] = [];

  // ── 헤더 행 ──────────────────────────────────────────────────────────────
  const header = ['이름', ...dates.map(d => `${d.getDate()}\n(${getDayLabel(d)})`), '근무일', '휴무일'];
  aoa.push(header.map((v, i) => cell(v, true, COLORS.header, 'FFFFFF', i !== 0)));

  // ── 팀 구분 행 ───────────────────────────────────────────────────────────
  const teamHeaderRow = [teamLabel, ...dates.map(() => ''), '', ''];
  aoa.push(teamHeaderRow.map((v, i) => cell(v, true, COLORS.teamRow, '93C5FD', i !== 0)));

  // ── 데이터 행 ────────────────────────────────────────────────────────────
  schedules.forEach((ps: PersonSchedule) => {
    const person = staff.find(s => s.id === ps.staffId);
    if (!person) return;

    let workDays = 0, offDays = 0;
    const dateCells = dates.map(d => {
      const ds = toDateStr(d);
      const a = ps.assignments[ds];
      const dayOfWeek = dow(d);

      if (!a || a.status === 'work') {
        workDays++;
        const pos = a?.position as Position | '기타' | undefined;
        const label = pos && pos !== '기타' ? (POSITION_LABELS[pos] ?? pos) : (isClean ? '근무' : '런드리');
        const posColor = pos ? COLORS[pos as keyof typeof COLORS] : undefined;
        const bgColor = posColor ?? (dayOfWeek === 6 ? COLORS.saturday : dayOfWeek === 0 ? COLORS.sunday : undefined);
        return cell(label, false, bgColor, '1E293B');
      } else {
        offDays++;
        const isReq = a.status === 'requested';
        return cell(isReq ? '희망휴무' : '휴무', true, isReq ? COLORS.requested : COLORS.off, '78350F');
      }
    });

    aoa.push([
      cell(person.name, true, undefined, '1E293B', false),
      ...dateCells,
      cell(String(workDays), true, undefined, '1E293B'),
      cell(String(offDays), true, { fgColor: { rgb: 'FEF08A' } }, '78350F'),
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // ── 열 너비 ──────────────────────────────────────────────────────────────
  ws['!cols'] = [
    { wch: 8 },                          // 이름
    ...dates.map(() => ({ wch: 5 })),   // 날짜 열
    { wch: 6 }, { wch: 6 },             // 근무일/휴무일
  ];

  // ── 행 높이 ──────────────────────────────────────────────────────────────
  ws['!rows'] = aoa.map(() => ({ hpt: 28 }));

  return ws;
}

export function downloadExcel(schedule: MonthSchedule, config: ScheduleConfig): void {
  const dates = getDatesInMonth(config.year, config.month);
  const wb = XLSX.utils.book_new();

  const laundryWs = buildSheet(schedule.laundry, config.laundryStaff, dates, false, '🧺 런드리팀');
  XLSX.utils.book_append_sheet(wb, laundryWs, '런드리팀');

  const cleaningWs = buildSheet(schedule.cleaning, config.cleaningStaff, dates, true, '👔 개별클리닝팀');
  XLSX.utils.book_append_sheet(wb, cleaningWs, '개별클리닝팀');

  const filename = `야간세탁_스케줄_${config.year}년${config.month}월.xlsx`;
  XLSX.writeFile(wb, filename);
}
