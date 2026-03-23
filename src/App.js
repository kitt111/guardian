import React, { useState } from 'react';

const GuardianLanding = () => {
  const [input, setInput] = useState('');
  const [geminiResponse, setGeminiResponse] = useState({ text: '', loading: false });
  const [gptResponse, setGptResponse] = useState({ text: '', loading: false });

  const handleAnalyze = async () => {
    if (!input.trim()) return alert("프롬프트를 입력해주세요.");

    // 상태 초기화 및 로딩 시작
    setGeminiResponse({ text: '', loading: true });
    setGptResponse({ text: '', loading: true });

    // 1. Gemini 호출 시뮬레이션 (나중에 실제 API 연동)
    setTimeout(() => {
      setGeminiResponse({ 
        text: `[Gemini 응답]: 입력하신 "${input.slice(0, 10)}..."에 대한 가디언 필터링 결과입니다. 이 프롬프트는 안전한 것으로 판단됩니다.`, 
        loading: false 
      });
    }, 1200);

    // 2. ChatGPT 호출 시뮬레이션 (나중에 실제 API 연동)
    setTimeout(() => {
      setGptResponse({ 
        text: `[ChatGPT 응답]: 분석 결과, 해당 요청에서 잠재적인 데이터 유출 위험 0.5%가 감지되었습니다. 주의를 요합니다.`, 
        loading: false 
      });
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      {/* 상단 네비게이션 */}
      <nav className="p-4 flex justify-between items-center border-b border-slate-800 bg-slate-900/50 sticky top-0 z-10 backdrop-blur-md">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          Guardian Multi-Agent
        </h1>
        <div className="text-xs text-slate-500">Status: Running (v1.0.2)</div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        {/* 입력 섹션 */}
        <section className="mb-8">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
            <h3 className="text-sm font-semibold mb-3 text-blue-300 uppercase tracking-wider">Prompt Input</h3>
            <textarea 
              className="w-full h-32 bg-slate-950 border border-slate-700 rounded-xl p-4 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-200"
              placeholder="보안 검증이 필요한 프롬프트를 입력하세요..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button 
              onClick={handleAnalyze}
              disabled={geminiResponse.loading || gptResponse.loading}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                geminiResponse.loading ? 'bg-slate-700' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-900/20'
              }`}
            >
              {geminiResponse.loading ? '가디언 엔진 가동 중...' : '멀티 모델 동시 분석 실행'}
            </button>
          </div>
        </section>

        {/* 좌우 분할 응답 섹션 */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gemini 응답창 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[400px]">
            <div className="bg-blue-900/30 p-4 border-b border-slate-800 flex justify-between items-center">
              <span className="font-bold text-blue-400">Google Gemini</span>
              {geminiResponse.loading && <div className="animate-spin h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>}
            </div>
            <div className="p-5 overflow-y-auto flex-1 text-slate-300 leading-relaxed">
              {geminiResponse.loading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-800 rounded w-full"></div>
                  <div className="h-4 bg-slate-800 rounded w-5/6"></div>
                </div>
              ) : (
                geminiResponse.text || <span className="text-slate-600 italic">입력을 기다리는 중...</span>
              )}
            </div>
          </div>

          {/* ChatGPT 응답창 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[400px]">
            <div className="bg-emerald-900/30 p-4 border-b border-slate-800 flex justify-between items-center">
              <span className="font-bold text-emerald-400">OpenAI ChatGPT</span>
              {gptResponse.loading && <div className="animate-spin h-4 w-4 border-2 border-emerald-400 border-t-transparent rounded-full"></div>}
            </div>
            <div className="p-5 overflow-y-auto flex-1 text-slate-300 leading-relaxed">
              {gptResponse.loading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-800 rounded w-full"></div>
                  <div className="h-4 bg-slate-800 rounded w-5/6"></div>
                </div>
              ) : (
                gptResponse.text || <span className="text-slate-600 italic">입력을 기다리는 중...</span>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-12 py-8 text-center text-slate-600 border-t border-slate-900 text-sm">
        <p>© 2026 Guardian Multi-Agent Platform</p>
      </footer>
    </div>
  );
};

export default GuardianLanding;
