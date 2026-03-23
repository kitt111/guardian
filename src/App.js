import React, { useState } from 'react';

const GEMINI_API_KEY = "AIzaSyD-h-AK5Ldl4l4sGna806mhW0woVDiwS0s";

const App = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [input, setInput] = useState('');
  const [geminiResponse, setGeminiResponse] = useState({ text: '', loading: false });
  const [guardianLog, setGuardianLog] = useState({ text: '', loading: false });

  // --- [개선] 수동 관리가 가능한 정책 데이터 상태 ---
  const [policies, setPolicies] = useState([
    { id: 1, category: '기밀', pattern: '프로젝트X', risk: 'High' },
    { id: 2, category: '개인정보', pattern: '이메일 주소', risk: 'Medium' }
  ]);
  const [newPattern, setNewPattern] = useState('');
  const [logs, setLogs] = useState([]);

  // --- [개선] 키워드 수동 추가/삭제 함수 ---
  const addPolicy = () => {
    if (!newPattern.trim()) return;
    const newEntry = {
      id: Date.now(),
      category: '수동입력',
      pattern: newPattern,
      risk: 'High'
    };
    setPolicies([...policies, newEntry]);
    setNewPattern('');
    alert(`'${newPattern}'이(가) 감시 목록에 추가되었습니다.`);
  };

  const deletePolicy = (id) => {
    setPolicies(policies.filter(p => p.id !== id));
  };

  // --- 보안 스캔 로직 (수동 입력된 정책 기반) ---
  const scanThreats = (text) => {
    return policies.filter(p => text.includes(p.pattern));
  };

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setGeminiResponse({ text: '', loading: true });
    
    const matched = scanThreats(input);
    //const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

    // 로그 기록
    if (matched.length > 0) {
      const newLog = { id: Date.now(), time: new Date().toLocaleTimeString(), content: input, threat: matched[0].pattern };
      setLogs([newLog, ...logs]);
    }

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: input }] }] })
      });
      const data = await res.json();
      setGeminiResponse({ text: data.candidates?.[0]?.content?.parts?.[0]?.text || "에러 발생", loading: false });
      setGuardianLog({ text: matched.length > 0 ? `⚠️ 위험: [${matched[0].pattern}] 감지!` : "✅ 안전함", loading: false });
    } catch (e) {
      setGeminiResponse({ text: "연결 실패. API 키를 확인하세요.", loading: false });
    }
  };

  // --- [개선] 관리자 대시보드 UI ---
  const AdminDashboard = () => (
    <div className="space-y-8 animate-in fade-in">
      {/* 1. 정책 설정 카드 */}
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-2xl">
        <h3 className="text-xl font-bold mb-6 text-indigo-400">🛡️ 감시 규칙 수동 설정</h3>
        <div className="flex gap-4 mb-6">
          <input 
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="새로운 차단 키워드나 패턴을 입력하세요..."
            value={newPattern}
            onChange={(e) => setNewPattern(e.target.value)}
          />
          <button onClick={addPolicy} className="bg-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-500 transition">추가</button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {policies.map(p => (
            <div key={p.id} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
              <div>
                <span className="text-xs text-indigo-400 font-mono">[{p.category}]</span>
                <p className="font-bold">{p.pattern}</p>
              </div>
              <button onClick={() => deletePolicy(p.id)} className="text-red-500 hover:text-red-400 text-sm underline">삭제</button>
            </div>
          ))}
        </div>
      </div>

      {/* 2. 로그 테이블 */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 bg-slate-800/30 font-bold border-b border-slate-800">최근 위협 탐지 기록</div>
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500 border-b border-slate-800">
            <tr>
              <th className="p-4">시간</th>
              <th className="p-4">탐지 키워드</th>
              <th className="p-4">원본 메시지</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                <td className="p-4 text-slate-400">{l.time}</td>
                <td className="p-4"><span className="bg-red-900/30 text-red-400 px-2 py-1 rounded-md">{l.threat}</span></td>
                <td className="p-4 truncate max-w-xs">{l.content}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 font-sans">
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-10">
        <h1 className="text-2xl font-black italic tracking-tighter text-indigo-500">GUARDIAN.OS</h1>
        <button onClick={() => setIsAdmin(!isAdmin)} className="bg-slate-800 px-5 py-2 rounded-full text-sm font-bold border border-slate-700">
          {isAdmin ? "← 사용자 화면" : "관리자 콘솔 →"}
        </button>
      </header>

      <main className="max-w-7xl mx-auto">
        {isAdmin ? <AdminDashboard /> : (
          /* 사용자 화면 */
          <div className="grid grid-cols-1 gap-8">
            <section className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl text-center">
              <h2 className="text-3xl font-bold mb-4">무엇이든 물어보세요</h2>
              <p className="text-slate-500 mb-8 text-sm">가디언 에이전트가 모든 입력을 실시간으로 검증하고 보호합니다.</p>
              <textarea 
                className="w-full h-40 bg-slate-950 border border-slate-800 rounded-2xl p-6 mb-4 focus:ring-2 focus:ring-indigo-500 outline-none text-lg"
                placeholder="질문을 입력하면 Gemini가 답변합니다..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button onClick={handleAnalyze} className="w-full py-5 bg-indigo-600 rounded-2xl font-black text-xl hover:bg-indigo-500 shadow-lg transition-all active:scale-[0.98]">
                {geminiResponse.loading ? "보안 분석 중..." : "실시간 보호 모드 가동"}
              </button>
            </section>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[400px]">
              <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 flex flex-col overflow-hidden">
                <p className="text-blue-400 font-bold mb-4">Gemini 답변</p>
                <div className="overflow-y-auto flex-1 text-slate-300 leading-relaxed whitespace-pre-wrap">{geminiResponse.text}</div>
              </div>
              <div className="bg-slate-950 rounded-3xl border-2 border-indigo-900/30 p-6 flex flex-col overflow-hidden">
                <p className="text-indigo-400 font-bold mb-4">가디언 보안 로그</p>
                <div className="overflow-y-auto flex-1 font-mono text-indigo-200/60">{guardianLog.text}</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
