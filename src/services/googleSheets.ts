// Google Apps Script를 통한 Google Sheets 연동 서비스

async function gasGet<T>(scriptUrl: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${scriptUrl}?${qs}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as T;
}

async function gasPost<T>(scriptUrl: string, body: unknown): Promise<T> {
  // Content-Type을 text/plain으로 설정해 CORS preflight 방지
  const res = await fetch(scriptUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as T;
}

export async function fetchConfig(scriptUrl: string): Promise<unknown> {
  const r = await gasGet<{ data: unknown; error?: string }>(scriptUrl, { action: 'getConfig' });
  if (r.error) throw new Error(r.error);
  return r.data;
}

export async function pushConfig(scriptUrl: string, config: unknown): Promise<void> {
  const r = await gasPost<{ success?: boolean; error?: string }>(scriptUrl, { action: 'saveConfig', config });
  if (r.error) throw new Error(r.error);
}

export async function fetchProduction(scriptUrl: string, year: number, month: number): Promise<Record<string, number>> {
  const r = await gasGet<{ data: Record<string, number>; error?: string }>(scriptUrl, {
    action: 'getProduction',
    year: String(year),
    month: String(month),
  });
  if (r.error) throw new Error(r.error);
  return r.data ?? {};
}

export async function pushProduction(scriptUrl: string, year: number, month: number, data: Record<string, number>): Promise<void> {
  const r = await gasPost<{ success?: boolean; error?: string }>(scriptUrl, { action: 'saveProduction', year, month, data });
  if (r.error) throw new Error(r.error);
}

/** 확정 스케줄 저장 */
export async function pushSchedule(scriptUrl: string, year: number, month: number, schedule: unknown): Promise<void> {
  const r = await gasPost<{ success?: boolean; error?: string }>(scriptUrl, {
    action: 'saveSchedule', year, month, schedule,
    confirmedAt: new Date().toISOString(),
  });
  if (r.error) throw new Error(r.error);
}

/** 확정 스케줄 불러오기 */
export async function fetchSchedule(scriptUrl: string, year: number, month: number): Promise<{ schedule: unknown; confirmedAt: string } | null> {
  const r = await gasGet<{ data: { schedule: unknown; confirmedAt: string } | null; error?: string }>(scriptUrl, {
    action: 'getSchedule',
    year: String(year),
    month: String(month),
  });
  if (r.error) throw new Error(r.error);
  return r.data;
}

// 앱에 붙여넣을 Google Apps Script 코드
export const GAS_SCRIPT_CODE = `// ─── 스케줄 생성기 · Google Apps Script 백엔드 v2 ──────────────────────────
// 1. Google Sheets에서 [확장 프로그램 > Apps Script] 실행
// 2. 아래 코드를 전체 복사 후 붙여넣기 (기존 코드 전체 교체)
// 3. [배포 > 새 배포] → 유형: 웹 앱
//    실행 계정: 나(Me)  /  액세스: 모든 사용자(Anyone, even anonymous)
// 4. 배포 URL을 앱 설정 화면에 입력

function doGet(e) {
  var action = e.parameter.action;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  try {
    if (action === 'getConfig') {
      var s = ss.getSheetByName('AppConfig');
      if (!s) return ok({ data: null });
      var v = s.getRange('A1').getValue();
      return ok({ data: v ? JSON.parse(v) : null });
    }
    if (action === 'getProduction') {
      var name = 'Prod_' + e.parameter.year + '_' + e.parameter.month;
      var ps = ss.getSheetByName(name);
      if (!ps) return ok({ data: {} });
      var pv = ps.getRange('A1').getValue();
      return ok({ data: pv ? JSON.parse(pv) : {} });
    }
    if (action === 'getSchedule') {
      var sname = 'Sched_' + e.parameter.year + '_' + e.parameter.month;
      var sc = ss.getSheetByName(sname);
      if (!sc) return ok({ data: null });
      var sv = sc.getRange('A1').getValue();
      return ok({ data: sv ? JSON.parse(sv) : null });
    }
    return ok({ error: 'unknown action' });
  } catch(err) { return ok({ error: err.toString() }); }
}

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    if (body.action === 'saveConfig') {
      var s = ss.getSheetByName('AppConfig') || ss.insertSheet('AppConfig');
      s.getRange('A1').setValue(JSON.stringify(body.config));
      return ok({ success: true });
    }
    if (body.action === 'saveProduction') {
      var name = 'Prod_' + body.year + '_' + body.month;
      var ps = ss.getSheetByName(name) || ss.insertSheet(name);
      ps.getRange('A1').setValue(JSON.stringify(body.data));
      return ok({ success: true });
    }
    if (body.action === 'saveSchedule') {
      var sname = 'Sched_' + body.year + '_' + body.month;
      var sc = ss.getSheetByName(sname) || ss.insertSheet(sname);
      sc.getRange('A1').setValue(JSON.stringify({
        schedule: body.schedule,
        confirmedAt: body.confirmedAt
      }));
      return ok({ success: true });
    }
    return ok({ error: 'unknown action' });
  } catch(err) { return ok({ error: err.toString() }); }
  finally { try { lock.releaseLock(); } catch(_) {} }
}

function ok(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}`;
