import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// 1. Supabase 설정
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const App = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 대화 기록 상태 (연속성 핵심)
  const [messages, setMessages] = useState([
    { role: "model", text: "안녕하세요! 가디언 보안 엔진이 보호 중인 채팅방입니다. 무엇을 도와드릴까요?", type: "ai" }
  ]);
  
  // Gemini API용 히스토리 포맷
  const [chatHistory, setChatHistory] = useState([]);

  // DB 데이터 상태
  const [policies, setPolicies] = useState([]);
  const [incidentLogs, setIncidentLogs] = useState([]);
  const [newPolicy, setNewPolicy] = useState({ name: '', pattern: '', category: 'CONFIDENTIAL' });

  const scrollRef = useRef(null);

  // 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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

  // 3. 메인 분석 및 대화 로직
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userQuery = input;
    setInput('');
    setLoading(true);

    // 사용자의 메시지를 화면에 즉시 추가
    setMessages(prev => [...prev, { role: "user", text: userQuery, type: "user" }]);

    // A. 보안 스캔 (Guardian)
    let detected = null;
    if (Array.isArray(policies)) {
      for (const p of policies) {
        const regex = new RegExp(p.pattern, 'gi');
        if (regex.test(userQuery)) {
          detected = p;
          break;
        }
      }
    }

    // B. 보안 위반 시 처리
    if (detected) {
      await supabase.from('incident_logs').insert([
        { 
          policy_id: detected.id, 
          user_input: userQuery, 
          detected_text: userQuery.match(new RegExp(detected.pattern, 'gi'))?.[0],
          risk_score: 80 
        }
      ]);
      setMessages(prev => [...prev, { 
        role: "system", 
        text: `🛡️ [보안 경고] "${detected.name}" 정책 위반이 감지되었습니다. 해당 내용은 로그에 기록되었으며, AI에게 전달되지 않습니다.`, 
        type: "system" 
      }]);
      setLoading(false);
      return; // 보안 위반 시 AI에게 메시지를 보내지 않음
    }

    // C. Gemini API 호출 (연속성 포함)
    try {
      // API용 페이로드 구성 (과거 기록 + 현재 질문)
      const contents = [
        ...chatHistory,
        { role: "user", parts: [{ text: userQuery }] }
      ];

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.REACT_APP_GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      });

      const data = await res.json();
      const aiText = data.candidates[0].content.parts[0].text;

      // 화면에 AI 메시지 추가
      setMessages(prev => [...prev, { role: "model", text: aiText, type: "ai" }]);
      
      // 대화 히스토리 업데이트 (연속성 유지)
      setChatHistory(prev => [
        ...prev,
        { role: "user", parts: [{ text: userQuery }] },
        { role: "model", parts: [{ text: aiText }] }
      ]);

    } catch (error) {
      setMessages(prev => [...prev, { role: "system", text: "❌ AI 응답 중 오류가 발생했습니다.", type: "system" }]);
    } finally {
      setLoading(false);
    }
  };

  const addPolicy = async () => {
    if (!newPolicy.name || !newPolicy.pattern) return alert("내용을 입력하세요.");
    await supabase.from('policies').insert([newPolicy]);
    setNewPolicy({ name: '', pattern: '', category: 'CONFIDENTIAL' });
    fetchPolicies();
  };

  return (
    <div className="flex h-screen bg-white text-slate-900 font-sans">
      
      {/* 왼쪽 사이드바 (슬랙 스타일) */}
      <div className="w-64 bg-[#3F0E40] text-white flex flex-col hidden md:flex">
        <div className="p-4 border-b border-white/10 shadow-sm">
          <h1 className="text-xl font-black flex items-center gap-2">
            <span className="w-6 h-6 bg-indigo-500 rounded flex items-center justify-center text-xs">G</span>
            Guardian Workspace
          </h1>
        </div>
        <div className="flex-1 py-4 overflow-y-auto">
          <div className="px-4 mb-4 text-white/60 text-sm font-medium">Channels</div>
          <button 
            onClick={() => setIsAdmin(false)}
            className={`w-full text-left px-6 py-1.5 text-sm ${!isAdmin ? 'bg-[#1164A3] text-white' : 'hover:bg-white/10 text-white/70'}`}
          >
            # general-chat
          </button>
          <button 
            onClick={() => setIsAdmin(true)}
            className={`w-full text-left px-6 py-1.5 text-sm mt-1 ${isAdmin ? 'bg-[#1164A3] text-white' : 'hover:bg-white/10 text-white/70'}`}
          >
            # security-admin
          </button>
        </div>
      </div>

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* 헤더 */}
        <header className="h-14 border-b border-slate-200 flex items
