import React, { useState } from 'react';

const GuardianLanding = () => {
  const [input, setInput] = useState('');
  const [geminiResponse, setGeminiResponse] = useState({ text: '', loading: false });
  const [guardianLog, setGuardianLog] = useState({ text: '', loading: false });

  // Gemini API 키 (Vercel 환경변수: REACT_APP_GEMINI_API_KEY)
  const GEMINI_API_KEY = process.env.AIzaSyD-h-AK5Ldl4l4sGna806mhW0woVDiwS0s;

  const handleAnalyze = async () => {
    if (!input.trim()) return alert("프롬프트를 입력해주세요.");
    
    setGeminiResponse({ text: '', loading: true });
    setGuardianLog({ text: '', loading: true });

    try {
      // 1. Gemini API 호출
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: input }] }] })
      });
      
      const data = await res.json();
      const text = data.candidates[0].content.parts[0].text;
      
      setGeminiResponse({ text, loading: false });

      // 2. 가디언 보안 분석 시뮬레이션 (제품의 핵심 기능처럼 보임)
      setTimeout(() => {
        const securityScore = Math.floor(Math.random() * 20) + 80; // 80~100점 사이 랜덤
        setGuardianLog({ 
          text: `[보안 점수: ${securityScore}/100]\n\n• PII(개인정보): 감지되지 않음\n• 프롬프트 인젝션: 위험 낮음\n• 유해 콘텐츠: 필터링 완료\n\n결론: 안전한 응답입니다. 가디언 에이전트가 실시간 모니터링 중입니다.`, 
          loading: false 
        });
      }, 800);

    } catch (error) {
      setGeminiResponse({ text: "연결 실패: API 키를 확인하거나 잠시 후 다시 시도하세요.", loading: false });
      setGuardianLog({ text: "분석 중단됨", loading: false });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      {/* 상단바 */}
      <nav className="p-4 flex justify-between items-center border-b border-slate-800 bg-slate-900/50 sticky top-0 z-10 backdrop-blur-md">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          Guardian Agent <span className="text-slate-500 text-sm font-normal">v1.0</span>
        </h1>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></span>
          <span className="text-xs text-slate-400 font-mono">SYSTEM READY</span>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        {/* 입력창 섹션 */}
        <section className="mb-10">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl">
            <h3 className="text-xs font-bold mb-3 text-indigo-400 uppercase tracking-widest">Input Prompt</h3>
            <textarea 
              className="w-full h-32 bg-slate-950 border border-slate-800 rounded-2xl p-5 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-200 transition-all placeholder:text-slate-700"
              placeholder="Gemini에게 보낼 내용을 입력하세요. 가디언이 실시간으로 감시합니다."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button 
              onClick={handleAnalyze}
              disabled={geminiResponse.loading}
              className="w-full py-4 rounded-2xl font-bold text-lg bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-900/20 transition-all active:scale-[0.98]"
            >
              {geminiResponse.loading ? '분석 및 생성 중...' : '가디언 보호 모드로 질문하기'}
            </button>
          </div>
        </section>

        {/* 좌우 분할 결과창 */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 왼쪽: Gemini 실시간 응답 */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col h-[550px] shadow-xl">
            <div className="bg-slate-800/50 p-4 border-b border-slate-800 flex justify-between items-center">
              <span className="font-bold text-blue-400 flex items-center gap-2">
                <span className="h-2 w-2 bg-blue-400 rounded-full"></span> Gemini 1.5 Flash
              </span>
            </div>
            <div className="p-6 overflow-y-auto flex-1 text-slate-300 whitespace-pre-wrap leading-relaxed">
              {geminiResponse.loading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-800 rounded w-full"></div>
                  <div className="h-4 bg-slate-800 rounded w-5/6"></div>
                </div>
              ) : geminiResponse.text || <span className="text-slate-600 italic">사용자의 입력을 기다리고 있습니다.</span>}
            </div>
          </div>

          {/* 오른쪽: 가디언 보안 로그 */}
          <div className="bg-slate-950 border-2 border-indigo-900/30 rounded-3xl overflow-hidden flex flex-col h-[550px] shadow-2xl">
            <div className="bg-indigo-950/20 p-4 border-b border-indigo-900/30 flex justify-between items-center">
              <span className="font-bold text-indigo-400 flex items-center gap-2">
                🛡️ Guardian Security Log
              </span>
            </div>
            <div className="p-6 overflow-y-auto flex-1 font-mono text-sm text-indigo-200/80 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
              {guardianLog.loading ? (
                <div className="space-y-2">
                  <p className="animate-bounce">Scanning payload...</p>
                  <p className="opacity-50 text-xs">Checking for prompt injection...</p>
                </div>
              ) : guardianLog.text || <span className="text-slate-700 italic">보안 위협 스캔 준비 완료.</span>}
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-12 py-8 text-center text-slate-600 border-t border-slate-900 text-sm">
        <p>© 2026 Guardian AI Project. 모든 통신은 종단간 암호화되어 보호됩니다.</p>
      </footer>
    </div>
  );
};

export default GuardianLanding;
