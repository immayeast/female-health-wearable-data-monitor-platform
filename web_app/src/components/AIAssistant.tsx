import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! I am the mcPHASES NeMo Agent. How can I help you understand the physiological gap?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = { role: 'user' as const, content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
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
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="glass-panel"
            style={{
              position: 'fixed', bottom: '6rem', right: '2rem',
              width: '350px', height: '500px',
              display: 'flex', flexDirection: 'column',
              padding: 0, overflow: 'hidden', zIndex: 50
            }}
          >
            {/* Header */}
            <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bot size={20} color="var(--primary-accent)" />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>mcPHASES Agent</h3>
              </div>
              <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Chat Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {messages.map((msg, idx) => (
                <div key={idx} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                  <div style={{
                    padding: '10px 14px', borderRadius: '12px', fontSize: '0.95rem', lineHeight: 1.5,
                    background: msg.role === 'user' ? 'linear-gradient(to right, var(--primary-accent), var(--secondary-accent))' : 'rgba(255,255,255,0.05)',
                    color: 'white',
                    borderBottomRightRadius: msg.role === 'user' ? '4px' : '12px',
                    borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '12px',
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Thinking...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Ask about the model..."
                style={{ flex: 1, padding: '10px 14px', borderRadius: '20px', fontSize: '0.95rem', background: 'rgba(0,0,0,0.4)' }}
              />
              <button 
                className="btn btn-primary" 
                onClick={handleSend}
                style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0 }}
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
