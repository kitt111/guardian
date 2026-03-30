import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, ShieldCheck, Terminal, Settings, Send, Trash2, Activity, Lock, Plus, List } from 'lucide-react';

// 1. Supabase 설정
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || "";
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
