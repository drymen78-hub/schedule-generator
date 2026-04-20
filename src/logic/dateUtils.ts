export function getDatesInMonth(year: number, month: number): Date[] {
  const dates: Date[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(new Date(year, month - 1, d));
  }
  return dates;
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fromDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 0=일, 1=월, ..., 6=토 */
export function dow(d: Date): number {
  return d.getDay();
}

/** 해당 월의 모든 날짜를 주 단위로 그룹핑 (토요일 시작 ~ 금요일 종료) */
export function groupByWeek(dates: Date[]): Date[][] {
  if (dates.length === 0) return [];
  const weeks: Date[][] = [];
  let week: Date[] = [];

  // 토요일이 나오면 이전 그룹을 닫고 새 주 시작
  for (const d of dates) {
    if (dow(d) === 6 && week.length > 0) {
      weeks.push(week);
      week = [];
    }
    week.push(d);
  }
  if (week.length > 0) weeks.push(week);
  return weeks;
}

export function formatMonthLabel(year: number, month: number): string {
  return `${year}년 ${month}월`;
}

export function getDayLabel(d: Date): string {
  return ['일', '월', '화', '수', '목', '금', '토'][dow(d)];
}
