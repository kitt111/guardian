import React, { useState, useEffect } from 'react';

const App = () => {
  const [isAdmin, setIsAdmin] = useState(false); // 관리자 모드 전환 상태
  const [input, setInput] = useState('');
  const [geminiResponse, setGeminiResponse] = useState({ text: '', loading: false });
  const [guardianLog, setGuardianLog] = useState({ text: '', loading: false });

  // --- 관리자 데이터 상태 ---
  const [confidentialKeywords, setConfidentialKeywords] = useState(['프로젝트X', '매출현황', '보안코드']);
  const [securityLogs, setSecurityLogs] = useState([
    { id: 1, time: '2026-03-23 14:00', input: '프로젝트X의 기밀을 알려줘', status: '위험', type: '기밀 키워드' },
    { id: 2, time: '2026-03-23 15:20', input: '제 전화번호는 010-1234-5678 입니다.', status: '주의', type: '개인정보(PII)' },
  ]);

  const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

  // --- 보안 탐지 로직 (PII 및 키워드) ---
  const scanForThreats = (text) => {
    let threats = [];
    // 1. PII 탐지 (전화번호, 이메일 등 정규식)
    const phoneRegex = /\d{2,3}-\d{3,4}-\d{4}/;
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    
    if (phoneRegex.test(text)) threats.push({ type: '개인정보(전화번호)', status: '주의' });
    if (emailRegex.test(text)) threats.push({ type: '개인정보(이메일)', status: '주의' });

    // 2. 기밀 키워드 탐지
    confidentialKeywords.forEach(kw => {
      if (text.includes(kw)) threats.push({ type: `기밀 키워드(${kw})`, status: '위험' });
    });

    return threats;
  };

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    
    setGeminiResponse({ text: '', loading: true });
    setGuardianLog({ text: '', loading: true });

    // 실시간 보안 스캔 실행
    const detectedThreats = scanForThreats(input);
    
    // 관리자 로그에 저장 (시뮬레이션)
    if (detectedThreats.length > 0) {
      const newLog = {
        id: Date.now(),
        time: new Date().toLocaleString(),
        input: input,
        status: detectedThreats[0].status,
        type: detectedThreats.map(t => t.type).join(', ')
      };
      setSecurityLogs([newLog, ...securityLogs]);
    }

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: input }] }] })
      });
      const data = await res.json();
      setGeminiResponse({ text: data.candidates[0].content.parts[0].text, loading: false });

      // 보안 분석창 결과 표시
      setGuardianLog({ 
        text: detectedThreats.length > 0 
          ? `⚠️ 위협 감지됨!\n\n${detectedThreats.map(t => `[${t.status}] ${t.type}`).join('\n')}\n\n시스템 보호를 위해 해당 요청을 로그에 기록했습니다.`
          : `✅ 안전함\n\n특이사항 없음. 실시간 감시 중.`,
        loading: false 
      });
    } catch (error) {
      setGeminiResponse({ text: "연결 실패", loading: false });
    }
  };

  // --- 관리자 페이지 컴포넌트 ---
  const AdminPage = () => (
    <div className="animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <p className="text-slate-500 text-sm">총 탐지 건수</p>
          <p className="text-3xl font-bold text-indigo-400">{securityLogs.length}건</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <p className="text-slate-500 text-sm">위험 키워드 수</p>
          <p className="text-3xl font-bold text-red-400">{confidentialKeywords.length}개</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <p className="text-slate-500 text-sm">시스템 상태</p>
          <p className="text-3xl font-bold text-emerald-400">정상</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h3 className="font-bold text-xl">실시간 위협 탐지 로그</h3>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
            <tr>
              <th className="p-4">시간</th>
              <th className="p-4">입력 내용</th>
              <th className="p-4">위험 유형</th>
              <th className="p-4">상태</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-slate-800">
            {securityLogs.map(log => (
              <tr key={log.id} className="hover:bg-slate-800/30 transition">
                <td className="p-4 text-slate-500">{log.time}</td>
                <td className="p-4 truncate max-w-xs">{log.input}</td>
                <td className="p-4 text-indigo-300 font-mono">{log.type}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${log.status === '위험' ? 'bg-red-900/40 text-red-400' : 'bg-yellow-900/40 text-yellow-400'}`}>
                    {log.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <nav className="p-4 flex justify-between items-center border-b border-slate-800 bg-slate-900/50 sticky top-0 z-20 backdrop-blur-md">
        <h1 className="text-xl font-bold text-indigo-400">Guardian Agent Admin</h1>
        <button 
          onClick={() => setIsAdmin(!isAdmin)}
          className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition"
        >
          {isAdmin ? "사용자 모드로 전환" : "관리자 대시보드"}
        </button>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        {isAdmin ? (
          <AdminPage />
        ) : (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            {/* 기존의 사용자 UI (handleAnalyze 사용) */}
            <section className="mb-10 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl">
              <h3 className="text-xs font-bold mb-3 text-indigo-400 uppercase tracking-widest">User Input</h3>
              <textarea 
                className="w-full h-32 bg-slate-950 border border-slate-800 rounded-2xl p-5 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-200"
                placeholder="질문을 입력하세요. 가디언이 개인정보와 기밀 키워드를 탐지합니다."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button onClick={handleAnalyze} className="w-full py-4 rounded-2xl font-bold text-lg bg-indigo-600 hover:bg-indigo-500 transition-all">
                {geminiResponse.loading ? '보안 검사 중...' : '가디언 보호 모드로 질문하기'}
              </button>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl h-[450px] overflow-hidden flex flex-col">
                <div className="p-4 bg-slate-800/50 border-b border-slate-800 text-blue-400 font-bold">Gemini Response</div>
                <div className="p-6 overflow-y-auto whitespace-pre-wrap flex-1 text-slate-300">
                  {geminiResponse.loading ? "생성 중..." : geminiResponse.text}
                </div>
              </div>
              <div className="bg-slate-950 border-2 border-indigo-900/30 rounded-3xl h-[450px] overflow-hidden flex flex-col">
                <div className="p-4 bg-indigo-950/20 border-b border-indigo-900/30 text-indigo-400 font-bold">Security Analysis</div>
                <div className="p-6 overflow-y-auto font-mono text-sm text-indigo-200/80 flex-1">
                  {guardianLog.loading ? "Analyzing..." : guardianLog.text}
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
