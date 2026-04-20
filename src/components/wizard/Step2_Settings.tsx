import { useState, useRef } from 'react';
import type { ScheduleConfig, StaffMember, Position, PositionRequirement, SkillLevel, OffPattern } from '../../types';
import { POSITION_LABELS, CLEANING_POSITION_KEYS, RECEIVING_POSITION_KEYS } from '../../constants/teams';

interface Props {
  config: ScheduleConfig;
  onAddStaff: (m: StaffMember) => void;
  onRemoveStaff: (id: string) => void;
  onUpdatePositions: (id: string, positions: StaffMember['positions']) => void;
  onUpdateStaff: (id: string, patch: Partial<StaffMember>) => void;
  onUpdateRequirement: (req: PositionRequirement) => void;
  onUpdateReceivingRequirement: (req: PositionRequirement) => void;
  onReorderStaff: (team: 'laundry' | 'cleaning' | 'receiving', fromIdx: number, toIdx: number) => void;
  onNext: () => void;
  onBack: () => void;
}

// ── 상수 ──────────────────────────────────────────────────────────────────────

const SKILL_OPTIONS: { value: SkillLevel; label: string; bg: string; color: string }[] = [
  { value: 'high', label: '상', bg: '#dcfce7', color: '#15803d' },
  { value: 'mid',  label: '중', bg: '#fef9c3', color: '#854d0e' },
  { value: 'low',  label: '하', bg: '#fee2e2', color: '#dc2626' },
];

const PATTERN_OPTIONS: { value: OffPattern; label: string; title: string; bg: string; color: string; border: string }[] = [
  { value: 'consecutive', label: '연속↕', title: '2일 연속 휴무 선호 (예: 토+일)',     bg: '#fef9c3', color: '#854d0e', border: '#ca8a04' },
  { value: 'spread',      label: '분산·', title: '2~3일마다 1일씩 분산 휴무 선호',      bg: '#eff6ff', color: '#1d4ed8', border: '#3b82f6' },
];

// ── 공통 컴포넌트 ─────────────────────────────────────────────────────────────

function SkillBadge({ level }: { level?: SkillLevel }) {
  if (!level) return <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>-</span>;
  const opt = SKILL_OPTIONS.find(o => o.value === level)!;
  return (
    <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 8, background: opt.bg, color: opt.color }}>
      {opt.label}
    </span>
  );
}

function StaffRow({
  staff, showPositions, availablePositions, onRemove, onUpdateStaff,
  onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd,
  isDragging, isDragOver,
}: {
  staff: StaffMember;
  showPositions: boolean;
  availablePositions?: Position[];
  onRemove: () => void;
  onUpdateStaff: (patch: Partial<StaffMember>) => void;
  onDragStart?: React.DragEventHandler<HTMLDivElement>;
  onDragOver?: React.DragEventHandler<HTMLDivElement>;
  onDragLeave?: React.DragEventHandler<HTMLDivElement>;
  onDrop?: React.DragEventHandler<HTMLDivElement>;
  onDragEnd?: React.DragEventHandler<HTMLDivElement>;
  isDragging?: boolean;
  isDragOver?: boolean;
}) {
  const togglePos = (pos: Position) => {
    const cur = staff.positions;
    let next: Position[];
    if (staff.team === 'receiving') {
      // 야간입고: recv_sort는 항상 유지 (분류는 자동 배정)
      next = cur.includes(pos) ? cur.filter(p => p !== pos) : [...cur.filter(p => p !== 'recv_sort'), pos, 'recv_sort'];
      if (!next.includes('recv_sort')) next.push('recv_sort');
    } else {
      next = cur.includes(pos) ? cur.filter(p => p !== pos) : [...cur, pos];
    }
    onUpdateStaff({ positions: next });
  };

  const positions = availablePositions ?? [...CLEANING_POSITION_KEYS];

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        background: '#f8fafc', borderRadius: 8,
        border: isDragOver ? '2px dashed #2563eb' : '1px solid #e2e8f0',
        flexWrap: 'wrap',
        opacity: isDragging ? 0.4 : 1,
        transition: 'opacity 0.15s, border-color 0.1s',
      }}>
      {/* 드래그 핸들 */}
      <div style={{ color: '#cbd5e1', fontSize: 15, cursor: 'grab', userSelect: 'none', lineHeight: 1 }}>⠿</div>

      {/* 이름 + 배지 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 60 }}>
        <span style={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>{staff.name}</span>
        <SkillBadge level={staff.skillLevel} />
        {staff.part && (
          <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 8,
            background: '#e0f2fe', color: '#0369a1' }}>{staff.part}</span>
        )}
      </div>

      {/* 역량도 버튼 */}
      <div style={{ display: 'flex', gap: 3 }}>
        {SKILL_OPTIONS.map(opt => (
          <button key={opt.value}
            onClick={() => onUpdateStaff({ skillLevel: staff.skillLevel === opt.value ? undefined : opt.value })}
            title={`역량도: ${opt.label}`}
            style={{
              padding: '2px 7px', borderRadius: 6, fontSize: 10, fontWeight: 800, cursor: 'pointer',
              background: staff.skillLevel === opt.value ? opt.bg : '#f1f5f9',
              color:      staff.skillLevel === opt.value ? opt.color : '#94a3b8',
              border:     staff.skillLevel === opt.value ? `1.5px solid ${opt.color}` : '1px solid #e2e8f0',
            }}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* 휴무 패턴 버튼 */}
      <div style={{ display: 'flex', gap: 3 }}>
        {PATTERN_OPTIONS.map(opt => (
          <button key={opt.value}
            onClick={() => onUpdateStaff({ offPattern: staff.offPattern === opt.value ? undefined : opt.value })}
            title={opt.title}
            style={{
              padding: '2px 7px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer',
              background: staff.offPattern === opt.value ? opt.bg : '#f1f5f9',
              color:      staff.offPattern === opt.value ? opt.color : '#94a3b8',
              border:     staff.offPattern === opt.value ? `1.5px solid ${opt.border}` : '1px solid #e2e8f0',
            }}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* 포지션 토글 */}
      {showPositions && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {positions.map(pos => {
            const active  = staff.positions.includes(pos);
            const priority = staff.positions.indexOf(pos) + 1;
            return (
              <button key={pos} onClick={() => togglePos(pos)} style={{
                padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                background: active ? '#1e3a5f' : '#f1f5f9',
                color:      active ? '#93c5fd' : '#64748b',
                border:     active ? '1px solid #2563eb' : '1px solid #e2e8f0',
              }}>
                {POSITION_LABELS[pos]}
                {active && staff.team !== 'receiving' && (
                  <span style={{ marginLeft: 3, opacity: 0.7 }}>({priority}순)</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <button onClick={onRemove} style={{
        marginLeft: 'auto', padding: '3px 10px', borderRadius: 6, fontSize: 11,
        background: 'rgba(239,68,68,0.1)', color: '#dc2626',
        border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer', fontWeight: 700,
      }}>삭제</button>
    </div>
  );
}

function AddStaffForm({ team, part, onAdd }: {
  team: StaffMember['team'];
  part?: string;
  onAdd: (m: StaffMember) => void;
}) {
  const [name, setName] = useState('');
  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({
      id: `${team}-${Date.now()}`,
      name: name.trim(),
      team,
      positions: team === 'receiving' ? ['recv_sort'] : [],
      ...(part ? { part } : {}),
    });
    setName('');
  };
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
      <input value={name} onChange={e => setName(e.target.value)}
        placeholder={part ? `${part} 이름 입력` : '이름 입력'}
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
        style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontWeight: 600 }} />
      <button onClick={handleAdd} style={{
        padding: '8px 18px', background: '#059669', color: '#fff', border: 'none',
        borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer',
      }}>+ 추가</button>
    </div>
  );
}

function PositionRequirementsGrid({
  requirements, staff, onUpdate,
}: {
  requirements: PositionRequirement[];
  staff: StaffMember[];
  onUpdate: (req: PositionRequirement) => void;
}) {
  const filtered = requirements.filter(r => r.position !== 'recv_sort');
  return (
    <div>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        각 포지션의 하루 최소/최대 필요 인원을 설정합니다.
      </div>
      <div className="position-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {filtered.map(req => (
          <div key={req.position} style={{
            padding: '14px 16px', borderRadius: 10, border: '1.5px solid #e2e8f0',
            background: `#${req.color}44`,
          }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#1e293b', marginBottom: 10 }}>{req.label}</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginBottom: 3 }}>최소</div>
                <input type="number" min={0} max={10} value={req.min}
                  onChange={e => onUpdate({ ...req, min: Number(e.target.value) })}
                  style={{ width: '100%', padding: '6px', border: '1px solid #e2e8f0', borderRadius: 6, textAlign: 'center', fontSize: 18, fontWeight: 900 }} />
              </div>
              <div style={{ fontSize: 16, color: '#94a3b8', marginTop: 16 }}>~</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginBottom: 3 }}>최대</div>
                <input type="number" min={0} max={10} value={req.max}
                  onChange={e => onUpdate({ ...req, max: Number(e.target.value) })}
                  style={{ width: '100%', padding: '6px', border: '1px solid #e2e8f0', borderRadius: 6, textAlign: 'center', fontSize: 18, fontWeight: 900 }} />
              </div>
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 8 }}>
              가능: {staff.filter(s => s.positions.includes(req.position)).map(s => s.name).join(', ') || '없음'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export function Step2_Settings({
  config, onAddStaff, onRemoveStaff, onUpdatePositions, onUpdateStaff,
  onUpdateRequirement, onUpdateReceivingRequirement, onReorderStaff, onNext, onBack,
}: Props) {
  const [selectedTeam, setSelectedTeam] = useState<'laundry' | 'cleaning' | 'receiving'>('laundry');
  const draggingTeam = useRef<'laundry' | 'cleaning' | 'receiving' | null>(null);
  const draggingIdx  = useRef<number | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const getDragProps = (team: 'laundry' | 'cleaning' | 'receiving', idx: number) => ({
    onDragStart: (e: React.DragEvent<HTMLDivElement>) => {
      draggingTeam.current = team;
      draggingIdx.current  = idx;
      e.dataTransfer.effectAllowed = 'move';
    },
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverKey(`${team}-${idx}`);
    },
    onDragLeave: () => setDragOverKey(null),
    onDrop: (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (draggingTeam.current === team && draggingIdx.current !== null && draggingIdx.current !== idx) {
        onReorderStaff(team, draggingIdx.current, idx);
      }
      draggingTeam.current = null;
      draggingIdx.current  = null;
      setDragOverKey(null);
    },
    onDragEnd: () => {
      draggingTeam.current = null;
      draggingIdx.current  = null;
      setDragOverKey(null);
    },
  });

  const TEAMS = [
    { key: 'laundry'   as const, label: '🧺 런드리팀',    count: config.laundryStaff.length },
    { key: 'cleaning'  as const, label: '👔 개별클리닝팀', count: config.cleaningStaff.length },
    { key: 'receiving' as const, label: '🌙 야간입고팀',   count: (config.receivingStaff ?? []).length },
  ];

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1e293b' }}>
          ⚙️ 2단계: 팀원 및 포지션 설정
        </h2>
        <span style={{ fontSize: 12, color: '#10b981', fontWeight: 700 }}>💾 변경사항 자동저장 중</span>
      </div>

      {/* 팀 선택 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {TEAMS.map(({ key, label, count }) => (
          <button key={key} onClick={() => setSelectedTeam(key)} style={{
            padding: '12px 22px', borderRadius: 12, fontWeight: 700, fontSize: 14,
            border: selectedTeam === key ? '2px solid #2563eb' : '1.5px solid #e2e8f0',
            background: selectedTeam === key ? '#eff6ff' : '#f8fafc',
            color: selectedTeam === key ? '#1d4ed8' : '#475569',
            cursor: 'pointer',
            boxShadow: selectedTeam === key ? '0 2px 8px rgba(37,99,235,0.15)' : 'none',
            transition: 'all 0.15s',
          }}>
            {label}
            <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 600, opacity: 0.7 }}>({count}명)</span>
          </button>
        ))}
      </div>

      {/* 안내 */}
      <div style={{ marginBottom: 12, padding: '7px 12px', borderRadius: 8, fontSize: 11,
        background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>
        {selectedTeam === 'laundry' && '🧺 런드리팀은 포지션 없이 인원 관리만 합니다.'}
        {selectedTeam === 'cleaning' && '👔 포지션 토글: 가능한 포지션을 선택하고 순서대로 배정됩니다.'}
        {selectedTeam === 'receiving' && '🌙 이동·생빨·리빙 포지션을 설정하면 우선 배정, 나머지는 자동으로 분류 배정됩니다.'}
        &nbsp;역량도(상/중/하)·휴무패턴(연속↕/분산·)도 개인별 설정 가능합니다. 드래그로 순서 변경.
      </div>

      {/* ── 런드리팀 ─────────────────────────────────────────────────────────── */}
      {selectedTeam === 'laundry' && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {config.laundryStaff.map((s, idx) => (
              <StaffRow key={s.id} staff={s} showPositions={false}
                onRemove={() => onRemoveStaff(s.id)}
                onUpdateStaff={patch => onUpdateStaff(s.id, patch)}
                {...getDragProps('laundry', idx)}
                isDragging={draggingTeam.current === 'laundry' && draggingIdx.current === idx}
                isDragOver={dragOverKey === `laundry-${idx}`}
              />
            ))}
          </div>
          <AddStaffForm team="laundry" onAdd={onAddStaff} />
        </div>
      )}

      {/* ── 개별클리닝팀 ──────────────────────────────────────────────────────── */}
      {selectedTeam === 'cleaning' && (
        <div className="card" style={{ padding: 20 }}>
          {/* 팀원 목록 */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#1e3a5f', marginBottom: 10 }}>
              팀원 관리 ({config.cleaningStaff.length}명)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {config.cleaningStaff.map((s, idx) => (
                <StaffRow key={s.id} staff={s} showPositions={true}
                  availablePositions={[...CLEANING_POSITION_KEYS]}
                  onRemove={() => onRemoveStaff(s.id)}
                  onUpdateStaff={patch => {
                    if (patch.positions) { onUpdatePositions(s.id, patch.positions); }
                    else { onUpdateStaff(s.id, patch); }
                  }}
                  {...getDragProps('cleaning', idx)}
                  isDragging={draggingTeam.current === 'cleaning' && draggingIdx.current === idx}
                  isDragOver={dragOverKey === `cleaning-${idx}`}
                />
              ))}
            </div>
            <AddStaffForm team="cleaning" onAdd={onAddStaff} />
          </div>

          {/* 포지션 설정 */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#1e3a5f', marginBottom: 14 }}>
              🏭 포지션 설정
            </div>
            <PositionRequirementsGrid
              requirements={config.positionRequirements}
              staff={config.cleaningStaff}
              onUpdate={onUpdateRequirement}
            />
          </div>
        </div>
      )}

      {/* ── 야간입고팀 ────────────────────────────────────────────────────────── */}
      {selectedTeam === 'receiving' && (
        <div className="card" style={{ padding: 20 }}>
          {/* 파트별 팀원 목록 */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#1e3a5f', marginBottom: 14 }}>
              팀원 관리 ({(config.receivingStaff ?? []).length}명)
            </div>
            {['관리자', '1파트', '2파트'].map(part => {
              const partStaff = (config.receivingStaff ?? []).filter(s => s.part === part);
              return (
                <div key={part} style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ padding: '2px 10px', background: '#e0f2fe', color: '#0369a1', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>
                      {part}
                    </span>
                    <span style={{ color: '#94a3b8' }}>({partStaff.length}명)</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {partStaff.map(s => {
                      const globalIdx = (config.receivingStaff ?? []).findIndex(x => x.id === s.id);
                      return (
                        <StaffRow key={s.id} staff={s} showPositions={true}
                          availablePositions={
                            [...RECEIVING_POSITION_KEYS].filter(p => p !== 'recv_sort') as Position[]
                          }
                          onRemove={() => onRemoveStaff(s.id)}
                          onUpdateStaff={patch => {
                            if (patch.positions) { onUpdatePositions(s.id, patch.positions); }
                            else { onUpdateStaff(s.id, patch); }
                          }}
                          {...getDragProps('receiving', globalIdx)}
                          isDragging={draggingTeam.current === 'receiving' && draggingIdx.current === globalIdx}
                          isDragOver={dragOverKey === `receiving-${globalIdx}`}
                        />
                      );
                    })}
                  </div>
                  <AddStaffForm team="receiving" part={part} onAdd={onAddStaff} />
                </div>
              );
            })}
          </div>

          {/* 포지션 설정 */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#1e3a5f', marginBottom: 14 }}>
              🏭 야간입고팀 포지션 설정
              <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginLeft: 8 }}>
                (분류는 나머지 전원 자동 배정)
              </span>
            </div>
            <PositionRequirementsGrid
              requirements={config.receivingPositionRequirements ?? []}
              staff={config.receivingStaff ?? []}
              onUpdate={onUpdateReceivingRequirement}
            />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <button onClick={onBack} style={backBtnStyle}>← 이전</button>
        <button onClick={onNext} style={nextBtnStyle}>다음 단계: 휴무지정 입력 →</button>
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
