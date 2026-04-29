import React, { useState } from 'react';
import { Lock, Mail, ShieldCheck, ArrowRight } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string, consented: boolean) => void;
}

const LoginNeumorphic: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consented, setConsented] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password && consented) {
      onLogin(email, consented);
    }
  };

  return (
    <div className="container fade-in" style={{ justifyContent: 'center', maxWidth: '450px' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div className="soft-raised soft-circle" style={{ width: '80px', height: '80px', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShieldCheck size={40} color="var(--primary-lavender)" />
        </div>
        <h1 className="screen-title">mcPHASES</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Secure Physiological Research Platform</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', paddingLeft: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Mail size={14} /> Email Address
          </label>
          <input 
            type="email" 
            placeholder="name@example.com" 
            value={email} 
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', paddingLeft: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Lock size={14} /> Password
          </label>
          <input 
            type="password" 
            placeholder="••••••••" 
            value={password} 
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>

        {/* Consent Toggle */}
        <div 
          onClick={() => setConsented(!consented)}
          className="soft-raised"
          style={{ 
            padding: '1.25rem', 
            marginTop: '1rem',
            cursor: 'pointer',
            border: consented ? '2px solid var(--primary-lavender)' : 'none',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}
        >
          <div className={consented ? 'soft-inset' : 'soft-raised'} style={{ 
            width: '24px', height: '24px', borderRadius: '6px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: consented ? 'var(--primary-lavender)' : 'var(--card-surface)'
          }}>
            {consented && <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#fff' }} />}
          </div>
          <div style={{ fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            <strong>Consent to Data Collection:</strong> I agree to allow mcPHASES to process my anonymized physiological markers for stress recalibration research.
          </div>
        </div>

        <button 
          type="submit"
          disabled={!consented || !email || !password}
          className="soft-btn soft-btn-primary" 
          style={{ marginTop: '1rem', padding: '18px', opacity: (consented && email && password) ? 1 : 0.5 }}
        >
          <span>Sign In</span>
          <ArrowRight size={18} />
        </button>
      </form>

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer' }}>
          New researcher? Request access.
        </button>
      </div>
    </div>
  );
};

export default LoginNeumorphic;
