import React, { useState } from 'react';

const GuardianLanding = () => {
  const [input, setInput] = useState('');
  const [geminiResponse, setGeminiResponse] = useState({ text: '', loading: false });
  const [gptResponse, setGptResponse] = useState({ text: '', loading: false });

  // 환경 변수에서 API 키를 가져옵니다 (Vercel 설정 필요)
  const GEMINI_API_KEY = process.env.AIzaSyD-h-AK5Ldl4l4sGna806mhW0woVDiwS0s;
  const GPT_API_KEY = process.env.;

  const handleAnalyze = async () => {
    if (!input.trim()) return alert("프롬프트를 입력해주세요.");
    
    setGeminiResponse({ text: '', loading: true });
    setGptResponse({ text: '', loading: true });

    // 1. Gemini API 호출
    const fetchGemini = async () => {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: input }] }] })
        });
        const data = await res.json();
        const text = data.candidates[0].content.parts[0].text;
        setGeminiResponse({ text, loading: false });
      } catch (error) {
        setGeminiResponse({ text: "Gemini 연결 실패: " + error.message, loading: false });
      }
    };

    // 2. ChatGPT API 호출
    const fetchGPT = async () => {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GPT_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: input }]
          })
        });
        const data = await res.json();
        const text = data.choices[0].message.content;
        setGptResponse({ text, loading: false });
      } catch (error) {
        setGptResponse({ text: "ChatGPT 연결 실패: " + error.message, loading: false });
      }
    };

    // 두 API를 동시에 실행
    Promise.all([fetchGemini(), fetchGPT()]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <nav className="p-4 flex justify-between items-center border-b border-slate-800 bg-slate-900/50 sticky top-0 z-10 backdrop-blur-md">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          Guardian Multi-Agent
        </h1>
        <div className="text-xs text-slate-500 font-mono">LIVE API MODE</div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        <section className="mb-8">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
            <textarea 
              className="w-full h-32 bg-slate-950 border border-slate-700 rounded-xl p-4 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-200"
              placeholder="질문을 입력하면 Gemini와 ChatGPT가 동시에 대답합니다..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button 
              onClick={handleAnalyze}
              disabled={geminiResponse.loading || gptResponse.loading}
              className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 transition-all"
            >
              {geminiResponse.loading || gptResponse.loading ? '답변 생성 중...' : '동시 질문하기'}
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gemini Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[500px]">
            <div className="bg-blue-900/30 p-4 border-b border-slate-800 font-bold text-blue-400">Google Gemini</div>
            <div className="p-5 overflow-y-auto flex-1 text-slate-300 whitespace-pre-wrap">
              {geminiResponse.loading ? "Gemini가 생각 중입니다..." : geminiResponse.text || "입력을 기다리는 중..."}
            </div>
          </div>

          {/* ChatGPT Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[500px]">
            <div className="bg-emerald-900/30 p-4 border-b border-slate-800 font-bold text-emerald-400">OpenAI ChatGPT</div>
            <div className="p-5 overflow-y-auto flex-1 text-slate-300 whitespace-pre-wrap">
              {gptResponse.loading ? "ChatGPT가 생각 중입니다..." : gptResponse.text || "입력을 기다리는 중..."}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
