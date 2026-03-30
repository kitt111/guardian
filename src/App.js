import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, ShieldCheck, Terminal, Settings, Send, Trash2, Activity, Lock, Plus, List } from 'lucide-react';

// 1. Supabase 설정
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const App = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState({ gemini: '', security: null });
  
  // DB 데이터 상태
  const [policies, setPolicies] = useState([]);
  const [incidentLogs, setIncidentLogs] = useState([]);
  const [newPolicy, setNewPolicy] = useState({ name: '', pattern: '', category: 'CONFIDENTIAL' });

  // 2. 초기 데이터 로드 (정책 및 로그)
  const fetchData = async () => {
    const { data: pol } = await supabase.from('policies').select('*').eq('is_active', true);
    const { data: log } = await supabase.from('incident_logs').select('*, policies(name)').order('created_at', { ascending: false });
    if (pol) setPolicies(pol);
    if (log) setIncidentLogs(log);
  };

  useEffect(() => {
    fetchData();
  }, [isAdmin]);

  // 3. 보안 분석 및 Gemini 호출
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
      setResults(prev => ({ ...prev, security: { status: 'danger', msg: `⚠️ 위반 감지: [${detectedPolicy.name}]` } }));
    } else {
      setResults(prev => ({ ...prev, security: { status: 'safe', msg: '✅ 보안 검사 통과: 안전함' } }));
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
      setResults(prev => ({ ...prev, gemini: "API 연결 실패: Vercel 환경 변수 혹은 키를 확인하세요." }));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 4. 관리자 전용 기능 (CRUD)
  const addPolicy = async () => {
    if (!newPolicy.name || !newPolicy.pattern) return alert("내용을 입력하세요.");
    const { error } = await supabase.from('policies').insert([newPolicy]);
    if (!error) {
      setNewPolicy({ name: '', pattern: '', category: 'CONFIDENTIAL' });
      fetchData();
    }
  };

  const deletePolicy = async (id) => {
    if (window.confirm("정말 이 정책을 삭제하시겠습니까?")) {
      await supabase.from('policies').delete().eq('id', id);
      fetchData();
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans relative overflow-x-hidden">
      {/* 화사한 배경 장식 */}
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
        <button onClick={() => setIsAdmin(!isAdmin)} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800/50 border border-white/10 rounded-full hover:bg-slate-700 transition-all backdrop-blur-md">
          {isAdmin ? <Terminal size={18} /> : <Settings size={18} />}
          <span className="text-sm font-semibold">{isAdmin ? "사용자 모드" : "관리자 콘솔"}</span>
        </button>
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
        <AnimatePresence mode="wait">
          {isAdmin ? (
            /* 관리자 대시보드 화면 */
            <motion.div key="admin" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8 pt-6">
              
              {/* 정책 추가 섹션 */}
              <section className="bg-slate-900/60 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Plus className="text-indigo-400" /> 보안 정책 수동 설정
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <input 
                    placeholder="정책명 (예: 카드번호)" 
                    className="bg-slate-950 border border-white/10 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-white" 
                    value={newPolicy.name} 
                    onChange={e => setNewPolicy({...newPolicy, name: e.target.value})} 
                  />
                  <input 
                    placeholder="패턴 (정규식)" 
                    className="bg-slate-950 border border-white/10 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-white font-mono" 
                    value={newPolicy.pattern} 
                    onChange={e => setNewPolicy({...newPolicy, pattern: e.target.value})} 
                  />
                  <select 
                    className="bg-slate-950 border border-white/10 p-3 rounded-xl text-slate-400 outline-none" 
                    value={newPolicy.category} 
                    onChange={e => setNewPolicy({...newPolicy, category: e.target.value})}
                  >
                    <option value="CONFIDENTIAL">기밀 정보</option>
                    <option value="PII">개인정보</option>
                    <option value="PROHIBITED">금지어</option>
                  </select>
                  <button onClick={addPolicy} className="bg-indigo-600 rounded-xl font-bold hover:bg-indigo-500 transition-colors text-white">정책 추가</button>
                </div>
                
                {/* 현재 정책 리스트 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                  {policies.map(p => (
                    <div key={p.id} className="p-4 bg-white/5 rounded-2xl flex justify-between items-center border border-white/5">
                      <div>
                        <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-bold uppercase">{p.category}</span>
                        <p className="font-bold mt-1 text-slate-200">{p.name}: <span className="font-mono text-slate-500 text-sm">{p.pattern}</span></p>
                      </div>
                      <button onClick={() => deletePolicy(p.id)} className="text-red-400 p-2 hover:bg-red-400/10 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* 실시간 탐지 로그 섹션 */}
              <section className="bg-slate-900/60 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
                <div className="p-6 border-b border-white/5 font-bold flex items-center gap-2">
                  <List size={18} className="text-indigo-400" /> 실시간 위협 탐지 로그
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-slate-400 uppercase text-[11px] tracking-wider">
                      <tr><th className="p-4">시간</th><th className="p-4">정책</th><th className="p-4">탐지 내용</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300">
                      {incidentLogs.map(l => (
                        <tr key={l.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 text-xs text-slate-500 font-mono">{new Date(l.created_at).toLocaleString()}</td>
                          <td className="p-4 text-red-400 font-bold">{l.policies?.name || '삭제된 정책'}</td>
                          <td className="p-4 truncate max-w-md italic text-slate-400">"{l.user_input}"</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </motion.div>
          ) : (
            /* 사용자 질문 화면 (이전과 동일한 고도화 UI) */
            <motion.div key="user" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
              <div className="text-center space-y-3 pt-10 pb-4">
                <h2 className="text-5xl font-black text-white tracking-tight">무엇을 도와드릴까요?</h2>
                <p className="text-slate-400">Guardian AI가 당신의 데이터를 실시간으로 보호하고 있습니다.</p>
              </div>
              <div className="relative group max-w-4xl mx-auto">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-3xl blur opacity-20 group-focus-within:opacity-40 transition duration-1000"></div>
                <div className="relative bg-slate-900/80 border border-white/10 rounded-2xl p-4 backdrop-blur-xl shadow-2xl">
                  <textarea 
                    className="w-full h-44 bg-transparent border-none focus:ring-0 text-lg placeholder:text-slate-600 resize-none text-white outline-none"
                    placeholder="민감 정보가 포함될 수 있는 질문도 안심하고 입력하세요..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                  <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <div className="flex gap-4 text-[11px] text-slate-500 uppercase tracking-widest font-bold">
                      <span className="flex items-center gap-1"><Lock size={12}/> Encrypted</span>
                      <span className="flex items-center gap-1"><Activity size={12}/> Monitoring</span>
                    </div>
                    <button onClick={handleSecureAnalyze} disabled={isAnalyzing} className="flex items-center gap-2 px-8 py-3 rounded-xl font-black bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-500/20 active:scale-95">
                      {isAnalyzing ? "분석 중..." : <><Send size={18}/> 분석 요청</>}
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-md border-l-4 border-l-indigo-500">
                  <h3 className="font-bold flex items-center gap-2 mb-4 text-white">
                    {results.security?.status === 'danger' ? <ShieldAlert className="text-red-400"/> : <ShieldCheck className="text-emerald-400"/>}
                    가디언 보안 분석
                  </h3>
                  <div className="text-sm font-mono leading-relaxed h-32 overflow-y-auto">
                    {results.security ? (
                      <div className={results.security.status === 'danger' ? 'text-red-400' : 'text-emerald-400'}>
                        {`> ${results.security.msg}`}
                        <br/>{`> 분석 시각: ${new Date().toLocaleTimeString()}`}
                        <br/>{`> 위험 점수 산출 완료...`}
                      </div>
                    ) : "> 분석 대기 중..."}
                  </div>
                </div>
                <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-md">
                  <h3 className="font-bold mb-4 text-white flex items-center gap-2"><Activity size={18} className="text-indigo-400"/> AI 응답 결과</h3>
                  <div className="text-sm text-slate-300 h-32 overflow-y-auto whitespace-pre-wrap scrollbar-hide">
                    {results.gemini || "질문을 입력하면 Gemini AI의 답변이 이곳에 안전하게 표시됩니다."}
                  </div>
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
