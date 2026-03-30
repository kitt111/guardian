import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, ShieldCheck, Terminal, Settings, Send, Trash2, Activity, Lock, Plus, List } from 'lucide-react';

// 1. Supabase 설정
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || "";
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);
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

  // 3. 보안 스캔 및 API 호출 로직
  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setGeminiResponse({ text: '', loading: true });
    setGuardianLog({ text: '보안 스캔 중...', loading: true });

    // A. 로컬 보안 스캔 (DB에서 가져온 정책 기반)
    let detected = null;
    for (const p of policies) {
      const regex = new RegExp(p.pattern, 'gi');
      if (regex.test(input)) {
        detected = p;
        break;
      }
    }

    // B. 위협 발견 시 DB에 로그 저장
    if (detected) {
      await supabase.from('incident_logs').insert([
        { 
          policy_id: detected.id, 
          user_input: input, 
          detected_text: input.match(new RegExp(detected.pattern, 'gi'))?.[0],
          risk_score: detected.risk_level 
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
      setGeminiResponse({ text: data.candidates[0].content.parts[0].text, loading: false });
    } catch (e) {
      setGeminiResponse({ text: "연결 실패: API 키를 확인하세요.", loading: false });
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
    await supabase.from('policies').delete().eq('id', id);
    fetchPolicies();
  };

  // --- UI 컴포넌트 생략 (이전 UI와 동일하되 데이터 매핑만 변경) ---
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-4 md:p-8">
      <nav className="max-w-7xl mx-auto flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
        <h1 className="text-2xl font-black text-indigo-500 italic">GUARDIAN AI v2</h1>
        <button onClick={() => setIsAdmin(!isAdmin)} className="bg-slate-800 px-6 py-2 rounded-full font-bold border border-slate-700 hover:bg-slate-700 transition">
          {isAdmin ? "← 사용자 모드" : "관리자 콘솔 →"}
        </button>
      </nav>

      <main className="max-w-7xl mx-auto">
        {isAdmin ? (
          /* 관리자 대시보드 */
          <div className="space-y-8 animate-in fade-in duration-500">
            <section className="bg-slate-900 p-8 rounded-3xl border border-slate-800">
              <h3 className="text-xl font-bold mb-6">🛡️ 보안 정책 수동 설정</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <input placeholder="정책명" className="bg-slate-950 border border-slate-800 p-3 rounded-xl" value={newPolicy.name} onChange={e => setNewPolicy({...newPolicy, name: e.target.value})} />
                <input placeholder="패턴(단어/정규식)" className="bg-slate-950 border border-slate-800 p-3 rounded-xl" value={newPolicy.pattern} onChange={e => setNewPolicy({...newPolicy, pattern: e.target.value})} />
                <select className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-slate-400" value={newPolicy.category} onChange={e => setNewPolicy({...newPolicy, category: e.target.value})}>
                  <option value="CONFIDENTIAL">기밀 정보</option>
                  <option value="PII">개인정보</option>
                  <option value="PROHIBITED">금지어</option>
                </select>
                <button onClick={addPolicy} className="bg-indigo-600 rounded-xl font-bold hover:bg-indigo-500">정책 추가</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {policies.map(p => (
                  <div key={p.id} className="p-4 bg-slate-800/50 rounded-2xl flex justify-between items-center border border-slate-700">
                    <div><span className="text-xs text-indigo-400">[{p.category}]</span><p className="font-bold">{p.name}: <span className="font-mono text-slate-400">{p.pattern}</span></p></div>
                    <button onClick={() => deletePolicy(p.id)} className="text-red-500 text-sm underline">삭제</button>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
              <div className="p-6 font-bold bg-slate-800/30">실시간 위협 탐지 로그 (DB 연동)</div>
              <table className="w-full text-left text-sm">
                <thead className="text-slate-500 border-b border-slate-800 uppercase text-xs"><tr className="p-4"><th className="p-4">시간</th><th className="p-4">정책</th><th className="p-4">탐지내용</th></tr></thead>
                <tbody>
                  {incidentLogs.map(l => (
                    <tr key={l.id} className="border-b border-slate-800/50">
                      <td className="p-4 text-slate-500">{new Date(l.created_at).toLocaleString()}</td>
                      <td className="p-4 text-red-400 font-bold">{l.policies?.name || '삭제된 정책'}</td>
                      <td className="p-4 truncate max-w-xs">{l.user_input}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        ) : (
          /* 사용자 화면 */
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <section className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl">
              <textarea className="w-full h-40 bg-slate-950 border border-slate-800 rounded-2xl p-6 mb-4 focus:ring-2 focus:ring-indigo-500 outline-none text-lg" placeholder="가디언이 보호 중입니다. 질문을 입력하세요..." value={input} onChange={e => setInput(e.target.value)} />
              <button onClick={handleAnalyze} className="w-full py-5 bg-indigo-600 rounded-2xl font-black text-xl hover:bg-indigo-500 transition-all">{geminiResponse.loading ? "보안 스캔 및 생성 중..." : "안전하게 질문하기"}</button>
            </section>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 h-80 flex flex-col">
                <p className="text-blue-400 font-bold mb-4">Gemini AI</p>
                <div className="overflow-y-auto flex-1 whitespace-pre-wrap text-slate-300">{geminiResponse.text}</div>
              </div>
              <div className="bg-slate-950 rounded-3xl border-2 border-indigo-900/30 p-6 h-80 flex flex-col">
                <p className="text-indigo-400 font-bold mb-4">Guardian Security Log</p>
                <div className="overflow-y-auto flex-1 font-mono text-indigo-300/70">{guardianLog.text}</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
const App = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState({ gemini: '', security: null });
  
  // DB 데이터 상태 (초기값 빈 배열로 강제)
  const [policies, setPolicies] = useState([]);
  const [incidentLogs, setIncidentLogs] = useState([]);
  const [newPolicy, setNewPolicy] = useState({ name: '', pattern: '', category: 'CONFIDENTIAL' });

  // 2. 초기 데이터 로드
  const fetchData = async () => {
    try {
      const { data: pol, error: polErr } = await supabase.from('policies').select('*').eq('is_active', true);
      const { data: log, error: logErr } = await supabase.from('incident_logs').select('*, policies(name)').order('created_at', { ascending: false });
      
      if (pol) setPolicies(pol);
      if (log) setIncidentLogs(log);
    } catch (e) {
      console.error("데이터 로드 중 오류:", e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAdmin]);

  // 3. 보안 분석 및 Gemini 호출 (에러 방지 강화)
  const handleSecureAnalyze = async () => {
    if (!input.trim()) return;
    setIsAnalyzing(true);
    
    try {
      // [방어 코드] policies가 배열인지 확인하고, 패턴이 있는 것만 필터링
      let detectedPolicy = null;
      if (Array.isArray(policies)) {
        detectedPolicy = policies.find(p => {
          if (!p.pattern) return false;
          try {
            const regex = new RegExp(p.pattern, 'gi');
            return regex.test(input);
          } catch (e) {
            return false; // 잘못된 정규식 패턴인 경우 무시
          }
        });
      }

      if (detectedPolicy) {
        // 위협 감지 시 로그 저장
        await supabase.from('incident_logs').insert([{
          policy_id: detectedPolicy.id,
          user_input: input,
          detected_text: input.match(new RegExp(detectedPolicy.pattern, 'gi'))?.[0] || "감지됨",
          risk_score: 80
        }]);
        setResults(prev => ({ ...prev, security: { status: 'danger', msg: `⚠️ 위반 감지: [${detectedPolicy.name}]` } }));
      } else {
        setResults(prev => ({ ...prev, security: { status: 'safe', msg: '✅ 보안 검사 통과: 안전함' } }));
      }

      // Gemini API 호출
      const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: input }] }] })
      });
      
      const data = await res.json();
      if (data.candidates && data.candidates[0]) {
        setResults(prev => ({ ...prev, gemini: data.candidates[0].content.parts[0].text }));
      } else {
        setResults(prev => ({ ...prev, gemini: "AI가 응답을 생성하지 못했습니다. (내용 검열 혹은 오류)" }));
      }

    } catch (error) {
      console.error("분석 중 오류 발생:", error);
      setResults(prev => ({ ...prev, gemini: "오류가 발생했습니다. 환경변수와 네트워크를 확인하세요." }));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 4. 관리자 기능 (CRUD)
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
      {/* 배경 장식 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-fuchsia-600/10 blur-[120px] rounded-full" />
      </div>

      <nav className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2 group">
          <div className="p-2 bg-indigo-600 rounded-xl"><Shield size={24} className="text-white" /></div>
          <h1 className="text-xl font-black tracking-tighter text-white">GUARDIAN <span className="text-indigo-500">PRO</span></h1>
        </div>
        <button onClick={() => setIsAdmin(!isAdmin)} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800/50 border border-white/10 rounded-full hover:bg-slate-700 transition-all backdrop-blur-md">
          {isAdmin ? <Terminal size={18} /> : <Settings size={18} />}
          <span className="text-sm font-semibold">{isAdmin ? "사용자 모드" : "관리자 콘솔"}</span>
        </button>
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
        <AnimatePresence mode="wait">
          {isAdmin ? (
            <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8 pt-6">
              <section className="bg-slate-900/60 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2
