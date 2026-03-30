import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Shield, Send, Settings, Terminal, AlertTriangle, User, Zap, Trash2, Plus, List, MessageSquare } from 'lucide-react';

// 1. Supabase 설정
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || "";
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const App = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 대화 및 데이터 상태
  const [messages, setMessages] = useState([
    { role: "model", text: "안녕하세요! 보안 가디언 채널입니다. 대화 내용은 실시간으로 보호됩니다.", type: "ai" }
  ]);
  const [chatHistory, setChatHistory] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [incidentLogs, setIncidentLogs] = useState([]);
  const [newPolicy, setNewPolicy] = useState({ name: '', pattern: '', category: 'CONFIDENTIAL' });

  const scrollRef = useRef(null);

  // 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // 데이터 로드
  const fetchAllData = async () => {
    const { data: pol } = await supabase.from('policies').select('*').eq('is_active', true);
    const { data: log } = await supabase.from('incident_logs').select('*, policies(name)').order('created_at', { ascending: false });
    if (pol) setPolicies(pol);
    if (log) setIncidentLogs(log);
  };

  useEffect(() => {
    fetchAllData();
  }, [isAdmin]);

  // 3. 메인 분석 및 대화 로직
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userQuery = input;
    setInput('');
    setLoading(true);
    setMessages(prev => [...prev, { role: "user", text: userQuery, type: "user" }]);

    // A. 보안 스캔
    let detected = policies.find(p => new RegExp(p.pattern, 'gi').test(userQuery));

    if (detected) {
      await supabase.from('incident_logs').insert([{ 
        policy_id: detected.id, 
        user_input: userQuery, 
        detected_text: userQuery.match(new RegExp(detected.pattern, 'gi'))?.[0], 
        risk_score: 80 
      }]);
      setMessages(prev => [...prev, { 
        role: "system", 
        text: `🛡️ [보안 차단] "${detected.name}" 정책 위반이 감지되어 메시지 전송이 중단되었습니다.`, 
        type: "system" 
      }]);
      setLoading(false);
      return;
    }

    // B. Gemini API 호출 (대화 연속성 포함)
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.REACT_APP_GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [...chatHistory, { role: "user", parts: [{ text: userQuery }] }] })
      });
      const data = await res.json();
      const aiText = data.candidates[0].content.parts[0].text;

      setMessages(prev => [...prev, { role: "model", text: aiText, type: "ai" }]);
      setChatHistory(prev => [...prev, 
        { role: "user", parts: [{ text: userQuery }] }, 
        { role: "model", parts: [{ text: aiText }] }
      ]);
    } catch (error) {
      setMessages(prev => [...prev, { role: "system", text: "❌ AI 응답 생성 중 오류가 발생했습니다.", type: "system" }]);
    } finally {
      setLoading(false);
    }
  };

  // 4. 관리자 기능 (CRUD 복구)
  const addPolicy = async () => {
    if (!newPolicy.name || !newPolicy.pattern) return alert("내용을 입력하세요.");
    const { error } = await supabase.from('policies').insert([newPolicy]);
    if (!error) {
      setNewPolicy({ name: '', pattern: '', category: 'CONFIDENTIAL' });
      fetchAllData();
    }
