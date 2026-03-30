import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, ShieldCheck, Terminal, Settings, Send, Trash2, Activity, Lock } from 'lucide-react';

// 1. Supabase 설정 (파일 하나에서 처리하도록 상단에 배치)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const App = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState({ gemini: '', security: null });
  
  // 데이터 상태
  const [policies, setPolicies] = useState([]);
  const [incidentLogs, setIncidentLogs] = useState([]);

  // 데이터 로드 로직
  const fetchData = async () => {
    const { data: pol } = await supabase.from('policies').select('*').eq('is_active', true);
    const { data: log } = await supabase.from('incident_logs').select('*, policies(name)').order('created_at', { ascending: false });
    if (pol) setPolicies(pol);
    if (log) setIncidentLogs(log);
  };

  useEffect(() => {
    fetchData();
  }, [isAdmin]);

  // 보안 분석 및 실행
  const handleSecureAnalyze = async () => {
    if (!input.trim()) return;
    setIsAnalyzing(true);
    
    let detectedPolicy = policies.find(p => new RegExp(p.pattern, 'gi').test(input));

    if (detectedPolicy) {
      await supabase.from('incident_logs').insert([{
        policy_id: detectedPolicy.id,
        user_input: input,
        detected_text: input.match(new RegExp(detectedPolicy.pattern, 'gi'))?.[0],
        risk_score: 80
      }]);
      setResults(prev => ({ ...prev, security: { status: 'danger', msg: `[${detectedPolicy.name}] 위반 감지` } }));
    } else {
      setResults(prev => ({ ...prev, security: { status: 'safe', msg: '보안 검사 통과' } }));
    }

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.REACT_APP_GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: input }] }] })
      });
      const data = await res.json();
      setResults(prev => ({ ...prev, gemini: data.candidates[0].content.parts[0].text }));
    } catch (e) {
      setResults(prev => ({ ...prev, gemini: "API 연결 실패: Vercel 환경 변수를 확인하세요." }));
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans relative overflow-x-hidden">
      {/* 배경 디자인 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-fuchsia-600/10 blur-[120px] rounded-full" />
      </div>

      {/* 내비게이션 */}
      <nav className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2 group">
          <div className="p-2 bg-indigo-600 rounded-xl">
            <Shield size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tighter text-white">
            GUARDIAN <span className="text-indigo-500">PRO</span>
          </h1>
        </div>
        <button onClick={() => setIsAdmin(!isAdmin)} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-full hover:bg-slate-700 transition-all backdrop-blur-md">
          {isAdmin ? <Terminal size={18} /> : <Settings size={18} />}
          <span className="text-sm font-semibold">{isAdmin ? "콘솔 종료" : "관리자 모드"}</span>
        </button>
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
        <AnimatePresence mode="wait">
          {isAdmin ? (
            <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 pt-6">
              <section className="bg-slate-900/60 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/5 font-bold">실시간 보안 로그</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-slate-400">
                      <tr><th className="p-4">시간</th><th className="p-4">정책</th><th className="p-4">내용</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {incidentLogs.map(l => (
                        <tr key={l.id} className="hover:bg-white/5">
                          <td className="p-4 text-xs text-slate-500">{new Date(l.created_at).toLocaleString()}</td>
                          <td className="p-4 text-red-400 font-bold">{l.policies?.name || '기본정책'}</td>
                          <td className="p-4 truncate max-w-xs">{l.user_input}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </motion.div>
          ) : (
            <motion.div key="user" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
              <div className="text-center space-y-3 pt-10 pb-4">
                <h2 className="text-4xl font-bold text-white tracking-tight">무엇을 도와드릴까요?</h2>
                <p className="text-slate-400">보안 엔진이 활성화되어 안전한 대화가 가능합니다.</p>
              </div>
              <div className="relative group max-w-4xl mx-auto">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-3xl blur opacity-20 group-focus-within:opacity-40 transition duration-1000"></div>
                <div className="relative bg-slate-900/80 border border-white/10 rounded-2xl p-4 backdrop-blur-xl">
                  <textarea 
                    className="w-full h-44 bg-transparent border-none focus:ring-0 text-lg placeholder:text-slate-600 resize-none text-white outline-none"
                    placeholder="내용을 입력하세요..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                  <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <div className="flex gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Lock size={12}/> 보안 암호화</span>
                      <span className="flex items-center gap-1"><Activity size={12}/> 실시간 감시</span>
                    </div>
                    <button onClick={handleSecureAnalyze} disabled={isAnalyzing} className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all">
                      {isAnalyzing ? "분석 중..." : <><Send size={18}/> 분석 요청</>}
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                  <h3 className="font-bold flex items-center gap-2 mb-4">
                    {results.security?.status === 'danger' ? <ShieldAlert className="text-red-400"/> : <ShieldCheck className="text-emerald-400"/>}
                    보안 분석
                  </h3>
                  <div className="text-sm font-mono text-slate-400">{results.security ? `> ${results.security.msg}` : "대기 중..."}</div>
                </div>
                <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                  <h3 className="font-bold mb-4">AI 응답</h3>
                  <div className="text-sm text-slate-300 h-32 overflow-y-auto whitespace-pre-wrap">{results.gemini || "답변이 여기에 표시됩니다."}</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default App;
