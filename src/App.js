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
