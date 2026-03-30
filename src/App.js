import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// 1. Supabase 설정 (Vercel 환경변수 사용)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const App = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [input, setInput] = useState('');
  const [geminiResponse, setGeminiResponse] = useState({ text: '', loading: false });
  const [guardianLog, setGuardianLog] = useState({ text: '', loading: false });

  // DB 데이터 상태
  const [policies, setPolicies] = useState([]);
  const [incidentLogs, setIncidentLogs] = useState([]);
  const [newPolicy, setNewPolicy] = useState({ name: '', pattern: '', category: 'CONFIDENTIAL' });

  // 2. 초기 데이터 로드 (정책 및 로그)
  useEffect(() => {
    fetchPolicies();
    fetchLogs();
  }, [isAdmin]);

  const fetchPolicies = async () => {
    const { data } = await supabase.from('policies').select('*').eq('is_active', true);
    if (data) setPolicies(data);
  };

  const fetchLogs = async () => {
    const { data } = await supabase.from('incident_logs').select('*, policies(name)').order('created_at', { ascending: false });
    if (data) setIncidentLogs(data);
  };

  // 3. 보안 스캔 및 API 호출 로직 (기존 로직 유지)
  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setGeminiResponse({ text: '', loading: true });
    setGuardianLog({ text: '🛡️ 가디언이 데이터를 스캔 중입니다...', loading: true });

    // A. 로컬 보안 스캔 (DB에서 가져온 정책 기반)
    let detected = null;
    if (Array.isArray(policies)) {
      for (const p of policies) {
        if (!p.pattern) continue;
        try {
          const regex = new RegExp(p.pattern, 'gi');
          if (regex.test(input)) {
            detected = p;
            break;
          }
        } catch (e) { console.error("Regex error:", e); }
      }
    }

    // B. 위협 발견 시 DB에 로그 저장
    if (detected) {
      await supabase.from('incident_logs').insert([
        { 
          policy_id: detected.id, 
          user_input: input, 
          detected_text: input.match(new RegExp(detected.pattern, 'gi'))?.[0] || '감지됨',
          risk_score: detected.risk_level || 80
        }
      ]);
      setGuardianLog({ text: `⚠️ 위험 감지: [${detected.name}]\n보안 정책 위반으로 로그가 기록되었습니다.`, loading: false });
    } else {
      setGuardianLog({ text: `✅ 안전함: 위협 요소가 발견되지 않았습니다.`, loading: false });
    }

    // C. Gemini API 호출
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.REACT_APP_GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: input }] }] })
      });
      const data = await res.json();
      setGeminiResponse({ text: data.candidates?.[0]?.content?.parts?.[0]?.text || "AI 응답 생성 실패.", loading: false });
    } catch (e) {
      setGeminiResponse({ text: "연결 실패: API 키 혹은 네트워크를 확인하세요.", loading: false });
    }
  };

  // 4. 관리자 기능: 정책 추가/삭제
  const addPolicy = async () => {
    if (!newPolicy.name || !newPolicy.pattern) return alert("내용을 입력하세요.");
    const { error } = await supabase.from('policies').insert([newPolicy]);
    if (!error) {
      setNewPolicy({ name: '', pattern: '', category: 'CONFIDENTIAL' });
      fetchPolicies();
    }
  };

  const deletePolicy = async (id) => {
    if(window.confirm("정말 이 정책을 삭제하시겠습니까?")) {
      await supabase.from('policies').delete().eq('id', id);
      fetchPolicies();
    }
  };

  // --- UI 컴포넌트 (흰색 배경의 멋스러운 디자인으로 완전히 새단장) ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
      {/* 내비게이션 - 깔끔한 흰색 상단 바 */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <span className="text-white font-black">G</span>
            </div>
            <h1 className="text-xl font-bold text-slate-950 tracking-tight">GUARDIAN <span className="text-indigo-600 font-light">AI</span></h1>
          </div>
          <button onClick={() => setIsAdmin(!isAdmin)} className="bg-slate-100 text-slate-800 px-5 py-2 rounded-full font-bold border border-slate-200 hover:bg-slate-200 transition-all text-sm shadow-sm active:scale-95">
            {isAdmin ? "← 사용자 화면" : "관리자 콘솔 →"}
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-10">
        {isAdmin ? (
          /* 관리자 대시보드 - 화사한 카드 스타일 */
          <div className="space-y-10">
            <header className="py-6">
              <h2 className="text-3xl font-extrabold text-slate-950 tracking-tighter">보안 정책 중앙 관리</h2>
              <p className="text-slate-600 mt-2">가디언의 실시간 탐지 엔진을 위한 보안 규칙을 설정하세요.</p>
            </header>

            <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50">
              <h3 className="text-lg font-bold mb-6 text-slate-900 flex items-center gap-2">🛠️ 새 정책 추가</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <input placeholder="정책명 (예: 신용카드번호)" className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-indigo-200 outline-none transition-all" value={newPolicy.name} onChange={e => setNewPolicy({...newPolicy, name: e.target.value})} />
                <input placeholder="패턴 (정규식/단어)" className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-mono text-sm" value={newPolicy.pattern} onChange={e => setNewPolicy({...newPolicy, pattern: e.target.value})} />
                <select className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200 transition-all" value={newPolicy.category} onChange={e => setNewPolicy({...newPolicy, category: e.target.value})}>
                  <option value="CONFIDENTIAL">기밀 정보</option>
                  <option value="PII">개인정보</option>
                  <option value="PROHIBITED">금지어</option>
                </select>
                <button onClick={addPolicy} className="bg-indigo-600 rounded-xl font-bold hover:bg-indigo-700 transition-all text-white shadow-lg shadow-indigo-200 active:scale-95">정책 추가</button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-10">
                {policies.map(p => (
                  <div key={p.id} className="p-5 bg-slate-50/50 rounded-2xl flex justify-between items-center border border-slate-100 hover:border-slate-200 transition-all">
                    <div>
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">{p.category}</span>
                      <p className="font-bold text-slate-900 mt-1.5">{p.name}</p>
                      <p className="font-mono text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-100 mt-1 inline-block">{p.pattern}</p>
                    </div>
                    <button onClick={() => deletePolicy(p.id)} className="text-red-500 p-3 hover:bg-red-50 rounded-xl transition-all">삭제</button>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden">
              <div className="p-6 font-bold bg-slate-100/50 text-slate-900 text-lg border-b border-slate-100">🛡️ 실시간 위협 탐지 로그</div>
              <table className="w-full text-left text-sm">
                <thead className="text-slate-600 bg-slate-50 border-b border-slate-200 uppercase text-xs tracking-wider">
                  <tr className="p-4"><th className="p-5">탐지 시간</th><th className="p-5">적용 정책</th><th className="p-5">사용자 입력 내용 (원본)</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {incidentLogs.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-5 text-slate-600 font-mono text-xs">{new Date(l.created_at).toLocaleString()}</td>
                      <td className="p-5 text-red-600 font-semibold">{l.policies?.name || '삭제된 정책'}</td>
                      <td className="p-5 truncate max-w-lg italic text-slate-700">"{l.user_input}"</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        ) : (
          /* 사용자 화면 - 화사하고 집중력 있는 채팅 스타일 */
          <div className="space-y-10">
            <header className="text-center py-10">
              <span className="text-[11px] bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold tracking-widest uppercase">Safe AI Chat</span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-950 tracking-tighter mt-4">안전한 AI와 대화하세요</h2>
              <p className="text-lg text-slate-600 mt-3 max-w-2xl mx-auto">가디언이 실시간으로 개인정보와 기밀을 보호합니다. 안심하고 질문을 입력하세요.</p>
            </header>

            <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-2xl shadow-slate-200/50 max-w-4xl mx-auto">
              <textarea 
                className="w-full h-44 bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-4 focus:ring-2 focus:ring-indigo-200 outline-none text-lg text-slate-900 placeholder:text-slate-400 resize-none transition-all" 
                placeholder="가디언이 보호 중입니다. 질문을 입력하세요..." 
                value={input} 
                onChange={e => setInput(e.target.value)} 
              />
              <button 
                onClick={handleAnalyze} 
                className={`w-full py-5 rounded-2xl font-black text-xl transition-all shadow-lg active:scale-[0.98] ${geminiResponse.loading ? 'bg-slate-300 text-slate-600 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'}`}
                disabled={geminiResponse.loading}
              >
                {geminiResponse.loading ? "🛡️ 스캔 및 생성 중..." : "안전하게 질문하기"}
              </button>
            </section>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
              <div className="bg-white rounded-3xl border border-slate-100 p-7 h-96 flex flex-col shadow-xl shadow-slate-100/50">
                <p className="text-blue-600 font-bold mb-4 flex items-center gap-2"><span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span> Gemini AI 응답</p>
                <div className="overflow-y-auto flex-1 whitespace-pre-wrap text-slate-700 leading-relaxed scrollbar-thin">
                  {geminiResponse.loading ? (
                    <div className="text-slate-400 italic">답변을 생성하는 중입니다...</div>
                  ) : geminiResponse.text || "가디언이 보안을 확인한 후, AI의 답변이 이곳에 표시됩니다."}
                </div>
              </div>
              <div className="bg-slate-950 rounded-3xl border-4 border-indigo-200/50 p-7 h-96 flex flex-col shadow-2xl shadow-indigo-100">
                <p className="text-indigo-300 font-bold mb-4 flex items-center gap-2">🛡️ Guardian Security Log</p>
                <div className="overflow-y-auto flex-1 font-mono text-indigo-100 text-sm leading-relaxed scrollbar-hide">
                  {guardianLog.loading ? (
                    <div className="text-indigo-400 animate-pulse">데이터 스캔 중...</div>
                  ) : guardianLog.text || "> 분석 대기 중..."}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="max-w-7xl mx-auto p-10 mt-10 text-center border-t border-slate-100 text-slate-400 text-xs">
        © 2024 Guardian AI Pro. All rights reserved.
      </footer>
    </div>
  );
};

export default App;
