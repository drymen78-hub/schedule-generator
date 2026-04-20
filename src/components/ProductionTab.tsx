import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  BarElement, LineElement, PointElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import Anthropic from '@anthropic-ai/sdk';
import type { MonthSchedule, ScheduleConfig } from '../types';
import { getDatesInMonth, toDateStr, dow } from '../logic/dateUtils';
import { POSITION_LABELS } from '../constants/teams';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

interface Props {
  schedule: MonthSchedule;
  config: ScheduleConfig;
  productionData: Record<string, number>;
  apiKey?: string;
}

const DAY_LABELS_KO = ['일', '월', '화', '수', '목', '금', '토'];

function buildAnalysisPrompt(
  config: ScheduleConfig,
  schedule: MonthSchedule,
  productionData: Record<string, number>,
): string {
  const dates = getDatesInMonth(config.year, config.month);
  const datesWithData = dates.filter(d => productionData[toDateStr(d)] !== undefined);

  const rows = datesWithData.map(d => {
    const ds = toDateStr(d);
    const qty = productionData[ds] ?? 0;
    const dayName = DAY_LABELS_KO[dow(d)];

    const laundryWorkers = schedule.laundry
      .filter(ps => ps.assignments[ds]?.status === 'work')
      .map(ps => config.laundryStaff.find(s => s.id === ps.staffId)?.name ?? ps.staffId);

    const cleaningWorkers = schedule.cleaning
      .filter(ps => ps.assignments[ds]?.status === 'work')
      .map(ps => {
        const staff = config.cleaningStaff.find(s => s.id === ps.staffId);
        const pos = ps.assignments[ds]?.position;
        const posLabel = pos ? (POSITION_LABELS[pos] ?? pos) : '-';
        return `${staff?.name ?? ps.staffId}(${posLabel})`;
      });

    return `${d.getDate()}일(${dayName}) | ${qty.toLocaleString()}개 | 런드리(${laundryWorkers.length}명): ${laundryWorkers.join(', ') || '없음'} | 클리닝(${cleaningWorkers.length}명): ${cleaningWorkers.join(', ') || '없음'}`;
  });

  const totalDays = datesWithData.length;
  const totalQty = Object.values(productionData).reduce((a, b) => a + b, 0);
  const avgQty = totalDays > 0 ? Math.round(totalQty / totalDays) : 0;

  return `${config.year}년 ${config.month}월 야간 세탁운영팀의 일별 인원편성과 생산량 데이터입니다.
총 ${totalDays}일 데이터 | 총 생산량: ${totalQty.toLocaleString()}개 | 일평균: ${avgQty.toLocaleString()}개

[날짜(요일) | 생산량 | 런드리팀 근무자 | 클리닝팀 근무자(포지션)]
${rows.join('\n')}

위 데이터를 분석하여 다음 3가지 인사이트를 한국어로 구체적으로 제시해 주세요.
각 항목은 실제 수치(날짜, 인원명, 생산량)를 반드시 인용하세요.

**인사이트 1 – 생산성 높은 인원 조합**
생산량이 평균보다 높은 날의 팀 구성 패턴을 찾아서, 어떤 인원 조합이 효과적인지 설명해 주세요.

**인사이트 2 – 요일별 생산성 패턴**
요일별 평균 생산량을 계산하고, 생산성이 높은 요일과 낮은 요일의 차이 원인을 추론해 주세요.

**인사이트 3 – 다음 달 스케줄링 제안**
위 분석을 바탕으로 다음 달 스케줄 편성 시 반영할 수 있는 구체적인 제안 1가지를 제시해 주세요.`;
}

export function ProductionTab({ schedule, config, productionData, apiKey: apiKeyProp }: Props) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisText, setAnalysisText] = useState('');
  const [analysisError, setAnalysisError] = useState('');

  // 분석 결과 저장/복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`analysis-${config.year}-${config.month}`);
      setAnalysisText(saved ?? '');
    } catch {}
  }, [config.year, config.month]);

  const dates = getDatesInMonth(config.year, config.month);
  const datesWithData = dates.filter(d => productionData[toDateStr(d)] !== undefined);
  const hasChartData = datesWithData.length >= 3;
  const totalProduction = Object.values(productionData).reduce((a, b) => a + b, 0);
  const apiKey = apiKeyProp || (import.meta as unknown as { env: Record<string, string> }).env.VITE_ANTHROPIC_API_KEY;
  const apiKeyReady = !!(apiKey && apiKey.startsWith('sk-ant-'));

  // 일별 라인 차트 데이터
  const lineData = {
    labels: datesWithData.map(d => `${d.getDate()}일`),
    datasets: [{
      label: '생산량',
      data: datesWithData.map(d => productionData[toDateStr(d)] ?? 0),
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37,99,235,0.08)',
      tension: 0.35,
      fill: true,
      pointRadius: 4,
      pointBackgroundColor: '#2563eb',
    }],
  };

  // 요일별 평균 바 차트 (월화수목금토일 순)
  const dowOrder = [1, 2, 3, 4, 5, 6, 0];
  const dowAvgs = dowOrder.map(d => {
    const vals = datesWithData
      .filter(date => dow(date) === d)
      .map(date => productionData[toDateStr(date)] ?? 0);
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  });
  const barData = {
    labels: ['월', '화', '수', '목', '금', '토', '일'],
    datasets: [{
      label: '평균 생산량',
      data: dowAvgs,
      backgroundColor: dowOrder.map(d =>
        d === 0 ? 'rgba(239,68,68,0.7)' : d === 6 ? 'rgba(37,99,235,0.7)' : 'rgba(16,185,129,0.7)'
      ),
      borderRadius: 6,
    }],
  };

  const handleAnalyze = async () => {
    if (!apiKeyReady) {
      setAnalysisError('.env.local 파일에 VITE_ANTHROPIC_API_KEY를 설정해 주세요.');
      return;
    }
    if (datesWithData.length < 3) {
      setAnalysisError('최소 3일 이상의 생산량 데이터를 입력 후 분석을 요청하세요.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisText('');
    setAnalysisError('');

    try {
      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
      const prompt = buildAnalysisPrompt(config, schedule, productionData);

      const stream = client.messages.stream({
        model: 'claude-opus-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      });

      let fullText = '';
      stream.on('text', (text: string) => {
        fullText += text;
        setAnalysisText(prev => prev + text);
      });
      await stream.finalMessage();
      try {
        localStorage.setItem(`analysis-${config.year}-${config.month}`, fullText);
      } catch {}
    } catch (err) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류';
      setAnalysisError(`분석 중 오류: ${msg}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: 16, fontWeight: 900, color: '#1e293b', margin: 0 }}>
          📈 생산량 분석
        </h3>
        <div style={{ padding: '4px 12px', background: datesWithData.length > 0 ? '#dcfce7' : '#f1f5f9', borderRadius: 20, fontSize: 12, fontWeight: 700, color: datesWithData.length > 0 ? '#15803d' : '#64748b' }}>
          {datesWithData.length}일 입력됨{totalProduction > 0 && ` · 총 ${totalProduction.toLocaleString()}개`}
        </div>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>
          💡 생산량은 스케줄표 하단 <b style={{ color: '#6ee7b7', background: '#064e3b', padding: '1px 6px', borderRadius: 4 }}>생산량</b> 행에서 입력하세요
        </span>
      </div>

      {/* 그래프 (데이터 3일 이상) */}
      {hasChartData && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginBottom: 12 }}>
            📈 생산량 그래프
          </div>
          <div className="chart-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff' }}>
              <Line
                data={lineData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                    title: {
                      display: true,
                      text: '일별 생산량 추이',
                      font: { size: 12, weight: 'bold' },
                      color: '#1e293b',
                    },
                  },
                  scales: {
                    y: { beginAtZero: false, ticks: { font: { size: 10 } } },
                    x: { ticks: { font: { size: 9 }, maxRotation: 45 } },
                  },
                }}
              />
            </div>
            <div style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff' }}>
              <Bar
                data={barData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                    title: {
                      display: true,
                      text: '요일별 평균 생산량',
                      font: { size: 12, weight: 'bold' },
                      color: '#1e293b',
                    },
                  },
                  scales: {
                    y: { beginAtZero: true, ticks: { font: { size: 10 } } },
                    x: { ticks: { font: { size: 11 } } },
                  },
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* AI 분석 섹션 */}
      <div style={{ border: '1.5px solid #bfdbfe', borderRadius: 12, overflow: 'hidden' }}>
        {/* 헤더 + 버튼 */}
        <div style={{
          padding: '14px 20px',
          background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
          borderBottom: '1px solid #bfdbfe',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#1d4ed8' }}>
              🤖 AI 데이터 분석 (Claude)
            </div>
            <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 2 }}>
              인원편성 + 생산량 패턴을 분석해 다음 달 스케줄 인사이트를 제공합니다
            </div>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            style={{
              padding: '10px 22px',
              background: isAnalyzing
                ? '#94a3b8'
                : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 13, fontWeight: 800,
              cursor: isAnalyzing ? 'not-allowed' : 'pointer',
              boxShadow: isAnalyzing ? 'none' : '0 2px 8px rgba(37,99,235,0.4)',
              whiteSpace: 'nowrap',
            }}
          >
            {isAnalyzing ? '⏳ 분석 중...' : '✨ AI 분석 요청'}
          </button>
        </div>

        {/* API 키 경고 */}
        {!apiKeyReady && (
          <div style={{
            padding: '10px 20px', background: '#fef9c3',
            borderBottom: '1px solid #fde047', fontSize: 12, color: '#854d0e',
          }}>
            ⚠️ 우측 상단 <strong>⚙️ 설정</strong> 버튼에서 Claude API 키를 입력하면 AI 분석을 사용할 수 있습니다.
          </div>
        )}

        {/* 결과 영역 */}
        <div style={{ padding: 20, minHeight: 120 }}>
          {!analysisText && !isAnalyzing && !analysisError && (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '24px 0' }}>
              {datesWithData.length < 3
                ? `최소 3일 이상 생산량을 입력하세요 (현재 ${datesWithData.length}일)`
                : '위 버튼을 클릭하면 Claude가 데이터를 분석합니다'}
            </div>
          )}

          {analysisError && (
            <div style={{
              padding: '10px 14px', background: '#fee2e2', borderRadius: 8,
              fontSize: 12, color: '#dc2626', fontWeight: 600,
            }}>
              ❌ {analysisError}
            </div>
          )}

          {(analysisText || isAnalyzing) && (
            <div style={{ fontSize: 13, lineHeight: 1.9, color: '#1e293b', whiteSpace: 'pre-wrap' }}>
              {analysisText}
              {isAnalyzing && (
                <span style={{ color: '#2563eb', fontWeight: 900, marginLeft: 2 }}>▋</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
