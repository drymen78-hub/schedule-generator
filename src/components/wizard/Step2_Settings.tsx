import { useState } from 'react';
import type { ScheduleConfig, StaffMember, Position, PositionRequirement } from '../../types';
import { POSITION_LABELS } from '../../constants/teams';

interface Props {
  config: ScheduleConfig;
  onAddStaff: (m: StaffMember) => void;
  onRemoveStaff: (id: string) => void;
  onUpdatePositions: (id: string, positions: StaffMember['positions']) => void;
  onUpdateRequirement: (req: PositionRequirement) => void;
  onNext: () => void;
  onBack: () => void;
}

const ALL_POSITIONS: Position[] = ['classification', 'machine', 'wet', 'dry', 'qc', 'pretreat'];

function StaffRow({
  staff, isEditable, onRemove, onTogglePosition,
}: {
  staff: StaffMember; isEditable: boolean;
  onRemove: () => void;
  onTogglePosition: (pos: Position) => void;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
      background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0',
      flexWrap: 'wrap',
    }}>
      <span style={{ fontWeight: 800, fontSize: 14, color: '#1e293b', minWidth: 56 }}>
        {staff.name}
      </span>
      {staff.mustWorkDays && staff.mustWorkDays.length > 0 && (
        <span style={{ fontSize: 10, background: '#fef9c3', color: '#854d0e', borderRadius: 10, padding: '2px 8px', fontWeight: 700 }}>
          고정: {staff.mustWorkDays.map(d => ['일','월','화','수','목','금','토'][d]).join('/')}
        </span>
      )}
      {isEditable && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {ALL_POSITIONS.map(pos => {
            const active = staff.positions.includes(pos);
            const priority = staff.positions.indexOf(pos) + 1;
            return (
              <button key={pos} onClick={() => onTogglePosition(pos)} style={{
                padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                background: active ? '#1e3a5f' : '#f1f5f9',
                color: active ? '#93c5fd' : '#64748b',
                border: active ? '1px solid #2563eb' : '1px solid #e2e8f0',
              }}>
                {POSITION_LABELS[pos]}
                {active && <span style={{ marginLeft: 3, opacity: 0.7 }}>({priority}순)</span>}
              </button>
            );
          })}
        </div>
      )}
      <button onClick={onRemove} style={{
        marginLeft: 'auto', padding: '3px 10px', borderRadius: 6, fontSize: 11,
        background: 'rgba(239,68,68,0.1)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.3)',
        cursor: 'pointer', fontWeight: 700,
      }}>삭제</button>
    </div>
  );
}

function AddStaffForm({ team, onAdd }: { team: StaffMember['team']; onAdd: (m: StaffMember) => void }) {
  const [name, setName] = useState('');
  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({ id: `${team}-${Date.now()}`, name: name.trim(), team, positions: [] });
    setName('');
  };
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
      <input value={name} onChange={e => setName(e.target.value)}
        placeholder="이름 입력"
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
        style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontWeight: 600 }} />
      <button onClick={handleAdd} style={{
        padding: '8px 18px', background: '#059669', color: '#fff', border: 'none',
        borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer',
      }}>+ 추가</button>
    </div>
  );
}

export function Step2_Settings({ config, onAddStaff, onRemoveStaff, onUpdatePositions, onUpdateRequirement, onNext, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<'staff' | 'position'>('staff');

  const togglePos = (staff: StaffMember, pos: Position) => {
    const cur = staff.positions;
    const next = cur.includes(pos) ? cur.filter(p => p !== pos) : [...cur, pos];
    onUpdatePositions(staff.id, next);
  };

  const tab = (label: string, key: 'staff' | 'position') => (
    <button onClick={() => setActiveTab(key)} style={{
      padding: '8px 20px', borderRadius: '8px 8px 0 0', fontSize: 13, fontWeight: 700,
      border: 'none', cursor: 'pointer',
      background: activeTab === key ? '#fff' : '#f1f5f9',
      color: activeTab === key ? '#1e3a5f' : '#64748b',
      borderBottom: activeTab === key ? '2px solid #2563eb' : '2px solid transparent',
    }}>{label}</button>
  );

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1e293b', marginBottom: 20 }}>
        ⚙️ 2단계: 팀원 및 포지션 설정
      </h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: -1, borderBottom: '1px solid #e2e8f0' }}>
        {tab('👥 팀원 관리', 'staff')}
        {tab('🏭 포지션 요구인원', 'position')}
      </div>

      <div className="card" style={{ borderRadius: '0 8px 8px 8px', padding: 20, marginBottom: 20 }}>
        {activeTab === 'staff' && (
          <div style={{ display: 'flex', gap: 20 }}>
            {/* 런드리팀 */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#1e3a5f', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                🧺 런드리팀 <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>({config.laundryStaff.length}명)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {config.laundryStaff.map(s => (
                  <StaffRow key={s.id} staff={s} isEditable={false}
                    onRemove={() => onRemoveStaff(s.id)}
                    onTogglePosition={pos => togglePos(s, pos)} />
                ))}
              </div>
              <AddStaffForm team="laundry" onAdd={onAddStaff} />
            </div>

            {/* 개별클리닝팀 */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#1e3a5f', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                👔 개별클리닝팀 <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>({config.cleaningStaff.length}명)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {config.cleaningStaff.map(s => (
                  <StaffRow key={s.id} staff={s} isEditable={true}
                    onRemove={() => onRemoveStaff(s.id)}
                    onTogglePosition={pos => togglePos(s, pos)} />
                ))}
              </div>
              <AddStaffForm team="cleaning" onAdd={onAddStaff} />
            </div>
          </div>
        )}

        {activeTab === 'position' && (
          <div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              각 포지션의 하루 최소/최대 필요 인원을 설정합니다.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {config.positionRequirements.map(req => (
                <div key={req.position} style={{
                  padding: '14px 16px', borderRadius: 10, border: '1.5px solid #e2e8f0',
                  background: `#${req.color}44`,
                }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: '#1e293b', marginBottom: 12 }}>
                    {req.label}
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>최소</div>
                      <input type="number" min={0} max={6} value={req.min}
                        onChange={e => onUpdateRequirement({ ...req, min: Number(e.target.value) })}
                        style={{ width: '100%', padding: '6px', border: '1px solid #e2e8f0', borderRadius: 6, textAlign: 'center', fontSize: 18, fontWeight: 900 }} />
                    </div>
                    <div style={{ fontSize: 16, color: '#94a3b8', marginTop: 16 }}>~</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>최대</div>
                      <input type="number" min={0} max={6} value={req.max}
                        onChange={e => onUpdateRequirement({ ...req, max: Number(e.target.value) })}
                        style={{ width: '100%', padding: '6px', border: '1px solid #e2e8f0', borderRadius: 6, textAlign: 'center', fontSize: 18, fontWeight: 900 }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 8 }}>
                    가능인원: {config.cleaningStaff.filter(s => s.positions.includes(req.position)).map(s => s.name).join(', ') || '없음'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={onBack} style={backBtnStyle}>← 이전</button>
        <button onClick={onNext} style={nextBtnStyle}>다음 단계: 희망휴무 입력 →</button>
      </div>
    </div>
  );
}

const backBtnStyle: React.CSSProperties = {
  padding: '13px 24px', background: '#f1f5f9', color: '#475569',
  border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
};
const nextBtnStyle: React.CSSProperties = {
  flex: 1, padding: '13px', background: 'linear-gradient(135deg, #1e3a5f, #1a3050)',
  color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: 'pointer',
};
