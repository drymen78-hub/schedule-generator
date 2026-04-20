import { useState } from 'react';
import { GAS_SCRIPT_CODE } from '../services/googleSheets';

interface Props {
  scriptUrl: string;
  apiKey: string;
  sheetsStatus: 'idle' | 'loading' | 'saving' | 'error' | 'ok';
  confirmedAt?: string | null;
  onSetScriptUrl: (url: string) => void;
  onSetApiKey: (key: string) => void;
  onLoadFromSheets: () => void;
  onLoadConfirmedSchedule?: () => void;
  onClose: () => void;
}

export function AppSettings({ scriptUrl, apiKey, sheetsStatus, confirmedAt, onSetScriptUrl, onSetApiKey, onLoadFromSheets, onLoadConfirmedSchedule, onClose }: Props) {
  const [urlDraft, setUrlDraft] = useState(scriptUrl);
  const [keyDraft, setKeyDraft] = useState(apiKey);
  const [showScript, setShowScript] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSave = () => {
    onSetScriptUrl(urlDraft.trim());
    onSetApiKey(keyDraft.trim());
    onClose();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(GAS_SCRIPT_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
    }
  };

  const statusColor = sheetsStatus === 'ok' ? '#15803d'
    : sheetsStatus === 'error' ? '#dc2626'
    : sheetsStatus === 'loading' || sheetsStatus === 'saving' ? '#2563eb'
    : '#94a3b8';
  const statusLabel = sheetsStatus === 'ok' ? '✅ 연결됨'
    : sheetsStatus === 'error' ? '❌ 오류'
    : sheetsStatus === 'loading' ? '⏳ 불러오는 중...'
    : sheetsStatus === 'saving' ? '💾 저장 중...'
    : '○ 미연결';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 28,
        maxWidth: 600, width: '100%', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }} onClick={e => e.stopPropagation()}>

        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#1e293b' }}>⚙️ 앱 설정</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}>✕</button>
        </div>

        {/* ── Google Sheets 연동 ── */}
        <section style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#1e3a5f', marginBottom: 4 }}>
            📊 Google Sheets 연동
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12, lineHeight: 1.6 }}>
            팀원 명단·포지션·생산량을 여러 PC에서 공유할 수 있습니다.<br />
            Google Apps Script를 배포하고 URL을 입력하세요.
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, padding: '3px 10px', background: '#f8fafc', borderRadius: 20, border: `1px solid ${statusColor}` }}>
              {statusLabel}
            </span>
            {urlDraft && (
              <>
                <button onClick={onLoadFromSheets} disabled={sheetsStatus === 'loading'}
                  style={{ padding: '4px 14px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  ↓ 팀원·설정 불러오기
                </button>
                {onLoadConfirmedSchedule && (
                  <button onClick={onLoadConfirmedSchedule} disabled={sheetsStatus === 'loading'}
                    style={{ padding: '4px 14px', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    📅 확정 스케줄 불러오기
                  </button>
                )}
              </>
            )}
          {confirmedAt && (
            <span style={{ fontSize: 10, color: '#059669', fontWeight: 700 }}>
              ✅ 확정: {new Date(confirmedAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          </div>

          <input
            value={urlDraft}
            onChange={e => setUrlDraft(e.target.value)}
            placeholder="https://script.google.com/macros/s/.../exec"
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, boxSizing: 'border-box', marginBottom: 10 }}
          />

          {/* Apps Script 코드 토글 */}
          <button onClick={() => setShowScript(s => !s)} style={{
            padding: '6px 14px', background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', color: '#475569',
          }}>
            {showScript ? '▲ Apps Script 코드 숨기기' : '▼ Apps Script 코드 보기 (설정 방법)'}
          </button>

          {showScript && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, lineHeight: 1.7 }}>
                1. Google Sheets 열기 → <b>[확장 프로그램 &gt; Apps Script]</b><br />
                2. 아래 코드 전체 복사 후 붙여넣기<br />
                3. <b>[배포 &gt; 새 배포]</b> → 웹 앱 / 실행: 나 / 액세스: <b>모든 사용자</b><br />
                4. 배포 URL을 위 입력란에 붙여넣기
              </div>
              <div style={{ position: 'relative' }}>
                <pre style={{
                  background: '#0f172a', color: '#e2e8f0', padding: 14,
                  borderRadius: 8, fontSize: 10, lineHeight: 1.5,
                  overflowX: 'auto', maxHeight: 240,
                  margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                }}>
                  {GAS_SCRIPT_CODE}
                </pre>
                <button onClick={handleCopy} style={{
                  position: 'absolute', top: 8, right: 8,
                  padding: '4px 10px', background: copied ? '#059669' : '#334155',
                  color: '#fff', border: 'none', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                }}>
                  {copied ? '✓ 복사됨' : '복사'}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ── AI 분석 API 키 ── */}
        <section style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#1e3a5f', marginBottom: 4 }}>
            🤖 AI 분석 (Claude API 키)
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12, lineHeight: 1.6 }}>
            생산량 탭에서 Claude AI 인원·생산성 분석을 사용하려면 Anthropic API 키를 입력하세요.<br />
            키는 이 기기의 로컬스토리지에만 저장됩니다.
          </div>
          <input
            type="password"
            value={keyDraft}
            onChange={e => setKeyDraft(e.target.value)}
            placeholder="sk-ant-..."
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, boxSizing: 'border-box', fontFamily: 'monospace' }}
          />
          {keyDraft && (
            <div style={{ marginTop: 6, fontSize: 11, color: '#15803d' }}>
              ✅ API 키 입력됨 (sk-ant-...{keyDraft.slice(-4)})
            </div>
          )}
        </section>

        {/* 저장 버튼 */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            padding: '11px 20px', background: '#f1f5f9', color: '#475569',
            border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>취소</button>
          <button onClick={handleSave} style={{
            flex: 1, padding: '11px', background: 'linear-gradient(135deg, #1e3a5f, #1a3050)',
            color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: 'pointer',
          }}>저장</button>
        </div>
      </div>
    </div>
  );
}
