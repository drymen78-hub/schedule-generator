import { useState } from 'react';
import { useAppStore } from './store/useAppStore';
import { Step1_Month } from './components/wizard/Step1_Month';
import { Step2_Settings } from './components/wizard/Step2_Settings';
import { Step3_LeaveInput } from './components/wizard/Step3_LeaveInput';
import { Step4_Result } from './components/wizard/Step4_Result';
import { AppSettings } from './components/AppSettings';

const STEPS = ['연/월 선택', '팀원·포지션', '희망휴무', '결과'];

export default function App() {
  const store = useAppStore();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: '#e8edf2', padding: '16px' }}>
      {/* 헤더 */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a5f, #1a3050)',
        borderRadius: 14, padding: '14px 22px', marginBottom: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 4px 16px rgba(30,58,95,0.3)', maxWidth: 1400, margin: '0 auto 16px',
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', letterSpacing: 2, marginBottom: 3 }}>
            🌙 야간 세탁운영팀
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>
            월간 근무 스케줄 자동 생성 시스템
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {STEPS.map((label, i) => {
            const stepNum = (i + 1) as 1|2|3|4;
            const isDone = store.step > stepNum;
            const isActive = store.step === stepNum;
            return (
              <button key={i} onClick={() => isDone && store.setStep(stepNum)} style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                border: 'none', cursor: isDone ? 'pointer' : 'default',
                background: isActive ? '#2563eb' : isDone ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)',
                color: isActive ? '#fff' : isDone ? '#93c5fd' : '#475569',
              }}>
                {isDone ? '✓ ' : `${stepNum}. `}{label}
              </button>
            );
          })}
          {/* 설정 버튼 */}
          <button onClick={() => setShowSettings(true)} style={{
            marginLeft: 8, padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            border: 'none', cursor: 'pointer',
            background: store.scriptUrl
              ? (store.sheetsStatus === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)')
              : 'rgba(255,255,255,0.1)',
            color: store.scriptUrl
              ? (store.sheetsStatus === 'error' ? '#fca5a5' : '#6ee7b7')
              : '#94a3b8',
          }}>
            ⚙️ 설정
            {store.sheetsStatus === 'saving' && <span style={{ marginLeft: 4 }}>💾</span>}
            {store.sheetsStatus === 'error'  && <span style={{ marginLeft: 4 }}>!</span>}
          </button>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="card" style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
        {store.step === 1 && (
          <Step1_Month
            config={store.config}
            onChange={store.updateConfig}
            onNext={() => store.setStep(2)}
          />
        )}
        {store.step === 2 && (
          <Step2_Settings
            config={store.config}
            onAddStaff={store.addStaff}
            onRemoveStaff={store.removeStaff}
            onUpdatePositions={store.updateStaffPositions}
            onUpdateStaff={store.updateStaff}
            onUpdateRequirement={store.updateRequirement}
            onUpdateReceivingRequirement={store.updateReceivingRequirement}
            onReorderStaff={store.reorderStaff}
            onNext={() => store.setStep(3)}
            onBack={() => store.setStep(1)}
          />
        )}
        {store.step === 3 && (
          <Step3_LeaveInput
            config={store.config}
            onToggleLeave={store.toggleLeave}
            onToggleWork={store.toggleWork}
            onGenerate={store.generate}
            generateError={store.generateError}
            onBack={() => store.setStep(2)}
          />
        )}
        {store.step === 4 && store.schedule && (
          <Step4_Result
            schedule={store.schedule}
            config={store.config}
            productionData={store.productionData}
            apiKey={store.apiKey}
            scriptUrl={store.scriptUrl}
            confirmedAt={store.confirmedAt}
            sheetsStatus={store.sheetsStatus}
            lastGenerateResult={store.lastGenerateResult}
            onUpdateProduction={store.updateProduction}
            onDownload={store.download}
            onRegenerate={store.generate}
            onReset={store.reset}
            onToggleCell={store.toggleScheduleCell}
            onRevert={store.revertSchedule}
            onConfirmSchedule={store.confirmSchedule}
            onLoadConfirmedSchedule={store.loadConfirmedSchedule}
          />
        )}
      </div>

      {/* 생성 중 오버레이 */}
      {store.generateProgress && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15,23,42,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: '32px 40px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, minWidth: 260,
          }}>
            <div style={{ fontSize: 28 }}>⚙️</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>스케줄 생성 중...</div>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
              시도 {store.generateProgress.attempt} / {store.generateProgress.total}
            </div>
            <div style={{ width: '100%', height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 4,
                background: 'linear-gradient(90deg, #2563eb, #7c3aed)',
                width: `${(store.generateProgress.attempt / store.generateProgress.total) * 100}%`,
                transition: 'width 0.1s',
              }} />
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>최적 결과를 선택합니다</div>
          </div>
        </div>
      )}

      {showSettings && (
        <AppSettings
          scriptUrl={store.scriptUrl}
          apiKey={store.apiKey}
          sheetsStatus={store.sheetsStatus}
          confirmedAt={store.confirmedAt}
          onSetScriptUrl={store.setScriptUrl}
          onSetApiKey={store.setApiKey}
          onLoadFromSheets={() => { store.loadFromSheets(); setShowSettings(false); }}
          onLoadConfirmedSchedule={store.step === 4 ? () => { store.loadConfirmedSchedule(); setShowSettings(false); } : undefined}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
