import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, FileJson, Layers, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type Persona = 'clinical' | 'empathetic' | 'technical';

const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [persona, setPersona] = useState<Persona>('clinical');
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: "Hello. I am the mcPHASES NeMo Agent. I can help you understand the 'Truth vs. Wearable' gap in your physiological data. Please select my persona below to begin." 
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (overrideInput?: string) => {
    const text = overrideInput || input;
    if (!text.trim()) return;
    
    const userMsg = { role: 'user' as const, content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    if (!overrideInput) setInput('');
    setIsTyping(true);

    try {
      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, userMsg],
          persona: persona 
        }),
      });
      
      const data = await response.json();
      
      if (data.choices && data.choices[0]) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.choices[0].message.content }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Connection to NeMo Agent failed or timed out.' }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I am currently disconnected from the server.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleMockCsv = () => {
    setInput("Please analyze my exported health data CSV from last month.");
    handleSend("Please analyze my exported health data CSV from last month. (Simulated CSV Upload)");
  };

  return (
    <>
      <button 
        className="btn btn-primary"
        style={{
          position: 'fixed', bottom: '2rem', right: '2rem',
          borderRadius: '50%', width: '60px', height: '60px',
          padding: 0, zIndex: 50,
          boxShadow: '0 10px 25px rgba(129, 140, 248, 0.4)'
        }}
        onClick={() => setIsOpen(true)}
      >
        <MessageSquare size={24} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9, rotateX: 10 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="glass-panel"
            style={{
              position: 'fixed', bottom: '6rem', right: '2rem',
              width: '380px', height: '550px',
              display: 'flex', flexDirection: 'column',
              padding: 0, overflow: 'hidden', zIndex: 50,
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)'
            }}
          >
            {/* Header */}
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.6)', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ background: 'var(--primary-accent)', borderRadius: '8px', padding: '6px' }}>
                  <Bot size={18} color="#fff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>mcPHASES Agent</h3>
                  <span style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 600 }}>● Online</span>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Persona Selector */}
            <div style={{ display: 'flex', gap: '4px', padding: '8px 16px', background: 'rgba(255,255,255,0.3)', borderBottom: '1px solid var(--glass-border)' }}>
              {(['clinical', 'empathetic', 'technical'] as Persona[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPersona(p)}
                  style={{
                    flex: 1, fontSize: '0.75rem', padding: '6px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                    background: persona === p ? 'var(--primary-accent)' : 'transparent',
                    color: persona === p ? '#fff' : 'var(--text-secondary)',
                    fontWeight: 600, transition: 'all 0.2s'
                  }}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>

            {/* Chat Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {messages.map((msg, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={idx} 
                  style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}
                >
                  <div style={{
                    padding: '10px 14px', borderRadius: '14px', fontSize: '0.9rem', lineHeight: 1.5,
                    background: msg.role === 'user' ? 'linear-gradient(135deg, var(--primary-accent), var(--secondary-accent))' : 'rgba(255,255,255,0.9)',
                    color: msg.role === 'user' ? '#ffffff' : 'var(--text-primary)',
                    boxShadow: msg.role === 'assistant' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                    borderBottomRightRadius: msg.role === 'user' ? '4px' : '14px',
                    borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '14px',
                  }}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              {isTyping && (
                <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '4px', padding: '10px 14px' }}>
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary-accent)' }} />
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary-accent)' }} />
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary-accent)' }} />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: '8px', padding: '0 16px 8px' }}>
              <button 
                onClick={handleMockCsv}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', padding: '6px 12px', 
                  borderRadius: '20px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer', color: 'var(--text-primary)'
                }}
              >
                <FileJson size={14} /> Analyze CSV
              </button>
              <button 
                onClick={() => handleSend("Tell me about the P4 hypothesis.")}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', padding: '6px 12px', 
                  borderRadius: '20px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer', color: 'var(--text-primary)'
                }}
              >
                <Layers size={14} /> P4 Hypothesis
              </button>
            </div>

            {/* Input Footer */}
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.6)', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input 
                  type="text" 
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder={`Speak to the ${persona} agent...`}
                  style={{ width: '100%', padding: '10px 14px', paddingRight: '40px', borderRadius: '25px', fontSize: '0.9rem', background: 'rgba(255,255,255,0.8)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)' }}
                />
                <Wand2 size={16} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary-accent)', opacity: 0.5 }} />
              </div>
              <button 
                className="btn btn-primary" 
                onClick={() => handleSend()}
                style={{ borderRadius: '50%', width: '42px', height: '42px', padding: 0, flexShrink: 0 }}
              >
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIAssistant;

