import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, ShieldCheck, Terminal, Settings, Send, Trash2, Activity, Lock } from 'lucide-react';
import { useGuardian } from './hooks/useGuardian'; // 위에서 만든 훅
import { supabase } from './lib/supabase';

const App = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState({ gemini: '', security: null });
  
  const { policies, incidentLogs, fetchData } = useGuardian(isAdmin);

  // 보안 스캔 및 실행 로직
  const handleSecureAnalyze = async () => {
    if (!input.trim()) return;
    setIsAnalyzing(true);
    
    // 1. 로컬 보안 스캔 (보안 레이어)
    let detectedPolicy = policies.find(p => new RegExp(p.pattern, 'gi').test(input));

    if (detectedPolicy) {
      await supabase.from('incident_logs').insert([{
        policy_id: detectedPolicy.id,
        user_input: input,
        detected_text: input.match(new RegExp(detectedPolicy.pattern, 'gi'))?.[0],
        risk_score: 80 // 예시 점수
      }]);
      setResults(prev => ({ ...prev, security: { status: 'danger', msg: `[${detectedPolicy.name}] 위반 감지` } }));
    } else {
      setResults(prev => ({ ...prev, security: { status: 'safe', msg: '보안 검사 통과' } }));
    }

    // 2. Gemini API 호출 (보안 통과 시에만 호출하거나 경고와 함께 호출)
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.REACT_APP_GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: input }] }] })
      });
      const data = await res.json();
      setResults(prev => ({ ...prev, gemini: data.candidates[0].content.parts[0].text }));
    } catch (e) {
      setResults(prev => ({ ...prev, gemini: "API 연결에 실패했습니다." }));
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 selection:bg-indigo-500/30 font-sans">
      {/* 고정 배경 장식 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-fuchsia-600/10 blur-[120px] rounded-full" />
      </div>

      {/* 내비게이션 */}
      <nav className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2 group">
          <div className="p-2 bg-indigo-600 rounded-xl group-hover:rotate-12 transition-transform">
            <Shield size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tighter bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            GUARDIAN <span className="text-indigo-500">PRO</span>
          </h1>
        </div>
        
        <button 
          onClick={() => setIsAdmin(!isAdmin)}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-800/50 hover:bg-slate-700 border border-slate-700/50 rounded-full transition-all backdrop-blur-md"
        >
          {isAdmin ? <Terminal size={18} /> : <Settings size={18} />}
          <span className="text-sm font-semibold">{isAdmin ? "콘솔 종료" : "관리자 모드"}</span>
        </button>
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
        <AnimatePresence mode="wait">
          {isAdmin ? (
            <AdminDashboard key="admin" policies={policies} logs={incidentLogs} refresh={fetchData} />
          ) : (
            <UserInterface 
              key="user"
              input={input}
              setInput={setInput}
              onAnalyze={handleSecureAnalyze}
              loading={isAnalyzing}
              results={results}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

// --- 서브 컴포넌트: 사용자 인터페이스 ---
const UserInterface = ({ input, setInput, onAnalyze, loading, results }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
    className="space-y-8"
  >
    <div className="text-center space-y-3 pt-10 pb-4">
      <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">무엇을 도와드릴까요?</h2>
      <p className="text-slate-400">Guardian의 보안 필터가 실시간으로 데이터를 보호하고 있습니다.</p>
    </div>

    {/* 입력 영역 */}
    <div className="relative group max-w-4xl mx-auto">
      <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-3xl blur opacity-20 group-focus-within:opacity-40 transition duration-1000"></div>
      <div className="relative bg-slate-900/80 border border-white/10 rounded-2xl p-4 backdrop-blur-xl">
        <textarea 
          className="w-full h-44 bg-transparent border-none focus:ring-0 text-lg placeholder:text-slate-600 resize-none"
          placeholder="보안 검사가 필요한 질문이나 텍스트를 입력하세요..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <div className="flex justify-between items-center pt-4 border-t border-white/5">
          <div className="flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><Lock size={12}/> 256-bit 암호화</span>
            <span className="flex items-center gap-1"><Activity size={12}/> 실시간 스캔 활성</span>
          </div>
          <button 
            onClick={onAnalyze}
            disabled={loading}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all ${
              loading ? 'bg-slate-700 text-slate-400' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
            }`}
          >
            {loading ? "스캔 중..." : <><Send size={18}/> 분석 요청</>}
          </button>
        </div>
      </div>
    </div>

    {/* 결과창 */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
      {/* 보안 로그 */}
      <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className={`p-1.5 rounded-lg ${results.security?.status === 'danger' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
            {results.security?.status === 'danger' ? <ShieldAlert size={20}/> : <ShieldCheck size={20}/>}
          </div>
          <h3 className="font-bold">보안 레이어 분석</h3>
        </div>
        <div className="h-40 overflow-y-auto text-sm font-mono text-slate-400 leading-relaxed">
          {results.security ? (
            <div className={results.security.status === 'danger' ? 'text-red-400' : 'text-emerald-400'}>
              {`> ${results.security.msg}`}
              <br/>{`> 스캔 완료: ${new Date().toLocaleTimeString()}`}
            </div>
          ) : "분석 대기 중..."}
        </div>
      </div>

      {/* AI 응답 */}
      <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg">
            <Activity size={20}/>
          </div>
          AI 응답 결과
        </h3>
        <div className="h-40 overflow-y-auto text-sm text-slate-300 whitespace-pre-wrap">
          {results.gemini || "질문을 입력하면 AI의 답변이 이곳에 표시됩니다."}
        </div>
      </div>
    </div>
  </motion.div>
);

// --- 서브 컴포넌트: 관리자 대시보드 (간략화) ---
const AdminDashboard = ({ policies, logs, refresh }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
    className="space-y-6 pt-6"
  >
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 통계 카드 예시 */}
      <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-500/20">
        <p className="opacity-80 text-sm mb-1">총 탐지 건수</p>
        <h4 className="text-3xl font-black">{logs.length}건</h4>
      </div>
      {/* ... 기타 통계 카드 생략 ... */}
    </div>

    <section className="bg-slate-900/60 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
      <div className="p-6 border-b border-white/5 flex justify-between items-center">
        <h3 className="font-bold flex items-center gap-2"><Shield size={18}/> 활성 보안 정책</h3>
        <button className="text-xs bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full font-bold">새 정책 추가</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-slate-400 text-xs uppercase">
            <tr>
              <th className="p-4">정책명</th>
              <th className="p-4">카테고리</th>
              <th className="p-4">패턴</th>
              <th className="p-4">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {policies.map(p => (
              <tr key={p.id} className="hover:bg-white/5 transition-colors">
                <td className="p-4 font-semibold">{p.name}</td>
                <td className="p-4"><span className="px-2 py-0.5 bg-slate-800 rounded text-[10px]">{p.category}</span></td>
                <td className="p-4 font-mono text-indigo-400 text-xs">{p.pattern}</td>
                <td className="p-4"><button className="text-red-400 hover:text-red-300"><Trash2 size={16}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  </motion.div>
);

export default App;
