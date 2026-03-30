import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Shield, Send, Settings, Terminal, AlertTriangle, User, Zap } from 'lucide-react';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || "";
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const App = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    { role: "model", text: "가디언 보안 채널에 오신 것을 환영합니다.", type: "ai" }
  ]);
  const [chatHistory, setChatHistory] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [incidentLogs, setIncidentLogs] = useState([]);
  const [newPolicy, setNewPolicy] = useState({ name: '', pattern: '', category: 'CONFIDENTIAL' });

  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: pol } = await supabase.from('policies').select('*').eq('is_active', true);
      const { data: log } = await supabase.from('incident_logs').select('*, policies(name)').order('created_at', { ascending: false });
      if (pol) setPolicies(pol);
      if (log) setIncidentLogs(log);
    };
    fetchData();
  }, [isAdmin]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userQuery = input;
    setInput('');
    setLoading(true);
    setMessages(prev => [...prev, { role: "user", text: userQuery, type: "user" }]);

    let detected = policies.find(p => new RegExp(p.pattern, 'gi').test(userQuery));

    if (detected) {
      await supabase.from('incident_logs').insert([{ 
        policy_id: detected.id, user_input: userQuery, 
        detected_text: userQuery.match(new RegExp(detected.pattern, 'gi'))?.[0], risk_score: 80 
      }]);
      setMessages(prev => [...prev, { role: "system", text: `🛡️ [보안] "${detected.name}" 위반 감지. 전송이 차단되었습니다.`, type: "system" }]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.REACT_APP_GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [...chatHistory, { role: "user", parts: [{ text: userQuery }] }] })
      });
      const data = await res.json();
      const aiText = data.candidates[0].content.parts[0].text;

      setMessages(prev => [...prev, { role: "model", text: aiText, type: "ai" }]);
      setChatHistory(prev => [...prev, { role: "user", parts: [{ text: userQuery }] }, { role: "model", parts: [{ text: aiText }] }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: "system", text: "❌ 에러가 발생했습니다.", type: "system" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-white text-slate-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-[#3F0E40] text-white flex flex-col hidden md:flex shrink-0">
        <div className="p-4 border-b border-white/10 font-bold text-lg flex items-center gap-2"><Zap size={18} className="text-yellow-400"/> Guardian</div>
        <div className="flex-1 py-4 space-y-1">
          <button onClick={() => setIsAdmin(false)} className={`w-full text-left px-6 py-2 text-sm ${!isAdmin ? 'bg-[#1164A3]' : 'hover:bg-white/5'}`}># 일반-채팅</button>
          <button onClick={() => setIsAdmin(true)} className={`w-full text-left px-6 py-2 text-sm ${isAdmin ? 'bg-[#1164A3]' : 'hover:bg-white/5'}`}># 보안-관리</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-slate-200 flex items-center justify-between px-6 bg-white shrink-0">
          <span className="font-bold text-slate-800">{isAdmin ? "보안 정책 센터" : "가디언 AI 채팅"}</span>
          <button onClick={() => setIsAdmin(!isAdmin)} className="text-xs bg-slate-100 px-3 py-1.5 rounded-md hover:bg-slate-200 transition-colors">모드 전환</button>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col">
          {isAdmin ? (
            <div className="p-6 overflow-y-auto bg-slate-50 flex-1 space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold mb-4 flex items-center gap-2"><Settings size={18}/> 정책 추가</h3>
                <div className="flex gap-2">
                  <input placeholder="정책명" className="flex-1 border p-2 rounded text-sm outline-none focus:ring-1 ring-indigo-500" value={newPolicy.name} onChange={e => setNewPolicy({...newPolicy, name: e.target.value})} />
                  <input placeholder="패턴" className="flex-1 border p-2 rounded text-sm font-mono outline-none focus:ring-1 ring-indigo-500" value={newPolicy.pattern} onChange={e => setNewPolicy({...newPolicy, pattern: e.target.value})} />
                  <button onClick={async () => { await supabase.from('policies').insert([newPolicy]); window.location.reload(); }} className="bg-indigo-600 text-white px-4 rounded text-sm font-bold">추가</button>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 uppercase text-slate-500">
                    <tr><th className="p-3">시간</th><th className="p-3">정책</th><th className="p-3">내용</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {incidentLogs.map(l => (
                      <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-slate-400 font-mono">{new Date(l.created_at).toLocaleTimeString()}</td>
                        <td className="p-3 text-red-500 font-bold">{l.policies?.name}</td>
                        <td className="p-3 italic">"{l.user_input}"</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
                {messages.map((m, i) => (
                  <div key={i} className={`flex items-start gap-4 ${m.type === 'system' ? 'justify-center' : ''}`}>
                    {m.type === 'system' ? (
                      <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-lg border border-amber-100 text-xs flex items-center gap-2 shadow-sm"><AlertTriangle size={14}/> {m.text}</div>
                    ) : (
                      <>
                        <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center text-white font-bold text-xs ${m.type === 'ai' ? 'bg-indigo-600 shadow-indigo-100' : 'bg-slate-700'}`}>{m.type === 'ai' ? <Shield size={16}/> : <User size={16}/>}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1"><span className="font-bold text-sm text-slate-900">{m.type === 'ai' ? 'Guardian AI' : '사용자'}</span><span className="text-[10px] text-slate-400 font-medium">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>
                          <div className="text-[15px] leading-relaxed text-slate-800 whitespace-pre-wrap">{m.text}</div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="p-6 bg-white border-t border-slate-100">
                <form onSubmit={handleSendMessage} className="relative border-2 border-slate-200 rounded-xl focus-within:border-slate-400 transition-all shadow-sm">
                  <textarea className="w-full h-24 p-4 text-slate-800 outline-none resize-none text-[15px] bg-transparent" placeholder="가디언 보호 채널에 메시지 전송..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} />
                  <div className="bg-slate-50 p-2 flex justify-end border-t border-slate-100 rounded-b-xl"><button type="submit" disabled={loading || !input.trim()} className={`px-4 py-1.5 rounded text-sm font-bold flex items-center gap-2 ${loading || !input.trim() ? 'bg-slate-200 text-slate-400' : 'bg-[#007a5a] text-white hover:bg-[#005a44]'}`}><Send size={14}/> {loading ? "전송 중" : "전송"}</button></div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
