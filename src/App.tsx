import { useAppStore } from './store/useAppStore';
import { Step1_Month } from './components/wizard/Step1_Month';
import { Step2_Settings } from './components/wizard/Step2_Settings';
import { Step3_LeaveInput } from './components/wizard/Step3_LeaveInput';
import { Step4_Result } from './components/wizard/Step4_Result';

const STEPS = ['연/월 선택', '팀원·포지션', '희망휴무', '결과'];

export default function App() {
  const store = useAppStore();

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
        <div style={{ display: 'flex', gap: 6 }}>
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
            onUpdateRequirement={store.updateRequirement}
            onNext={() => store.setStep(3)}
            onBack={() => store.setStep(1)}
          />
        )}
        {store.step === 3 && (
          <Step3_LeaveInput
            config={store.config}
            onToggleLeave={store.toggleLeave}
            onUpdatePrevMonth={store.updatePrevMonth}
            onGenerate={store.generate}
            onBack={() => store.setStep(2)}
          />
        )}
        {store.step === 4 && store.schedule && (
          <Step4_Result
            schedule={store.schedule}
            config={store.config}
            onDownload={store.download}
            onRegenerate={store.generate}
            onReset={store.reset}
          />
        )}
      </div>
    </div>
  );
}
