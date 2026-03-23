import React, { useState } from 'react';

const GuardianLanding = () => {
  const [input, setInput] = useState('');
  const [analysis, setAnalysis] = useState(null);

  const handleAnalyze = () => {
    // 실제로는 여기서 백엔드 API를 호출하여 데이터를 저장하고 분석합니다.
    setAnalysis("분석 중... (이 과정에서 사용자의 프롬프트 데이터가 수집됩니다)");
    setTimeout(() => {
      setAnalysis("⚠️ 위험 감지: 이 프롬프트는 시스템 권한 탈취 시도(Injection) 패턴을 포함하고 있습니다.");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      {/* Navigation */}
      <nav className="p-6 flex justify-between items-center border-b border-slate-800">
        <h1 className="text-2xl font-bold text-blue-400">Guardian AI</h1>
        <button className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-full transition">Early Access</button>
      </nav>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto pt-20 px-6 text-center">
        <h2 className="text-5xl font-extrabold mb-6">
          LLM의 보안 구멍, <br/>
          <span className="text-blue-500">가디언 에이전트</span>가 막아드립니다.
        </h2>
        <p className="text-slate-400 text-xl mb-12">
          Gemini와 같은 거대 모델을 안전하게 비즈니스에 도입하세요. 
          실시간 프롬프트 검사 및 데이터 유출 방지 솔루션.
        </p>

        {/* Data Collection / Demo Tool */}
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 text-left">
          <h3 className="text-lg font-semibold mb-4 text-blue-300">🛡️ 실시간 보안 진단 데모</h3>
          <textarea 
            className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-4 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Gemini에게 보낼 프롬프트를 입력해보세요. 가디언이 위험도를 체크합니다."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button 
            onClick={handleAnalyze}
            className="w-full bg-blue-600 py-3 rounded-lg font-bold hover:bg-blue-500 transition"
          >
            위험도 분석하기
          </button>
          
          {analysis && (
            <div className="mt-6 p-4 bg-slate-900 rounded border border-blue-500/30 text-blue-200 animate-pulse">
              {analysis}
            </div>
          )}
        </div>
      </main>

      {/* Footer / Contact */}
      <footer className="mt-20 py-10 text-center text-slate-500 border-t border-slate-800">
        <p>© 2026 Guardian AI Project. 모든 프롬프트 데이터는 보안 연구 목적으로만 활용됩니다.</p>
      </footer>
    </div>
  );
};

export default GuardianLanding;
