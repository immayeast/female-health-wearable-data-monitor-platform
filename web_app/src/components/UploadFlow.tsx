import React, { useState } from 'react';
import { UploadCloud, ChevronRight, Activity, Moon, Footprints, Heart, User, Brain, Sparkles, Loader2, Wand2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { UserData } from '../App';

interface UploadFlowProps {
  userData: UserData;
  setUserData: React.Dispatch<React.SetStateAction<UserData>>;
  onNext: () => void;
}

const UploadFlow: React.FC<UploadFlowProps> = ({ userData, setUserData, onNext }) => {
  const [magicText, setMagicText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  const handleMagicParse = async () => {
    if (!magicText.trim()) return;
    setIsParsing(true);
    try {
      const response = await fetch('/.netlify/functions/parse-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: magicText })
      });
      const data = await response.json();
      
      const updates: Partial<UserData> = {};
      if (data.restingHR) updates.restingHR = data.restingHR;
      if (data.hrv) updates.hrv = data.hrv;
      if (data.sleep) updates.sleep = data.sleep;
      if (data.steps) updates.steps = data.steps;
      if (data.perceivedStress) updates.perceivedStress = data.perceivedStress;

      setUserData(prev => ({ ...prev, ...updates }));
      setMagicText('');
    } catch (err) {
      console.error("Magic parse failed:", err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleChange = (field: keyof UserData, value: string | number) => {
    setUserData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = userData.sex !== '' && userData.restingHR > 0 && userData.hrv > 0 && userData.sleep > 0 && userData.steps > 0;

  return (
    <div className="container" style={{ margin: 'auto', maxWidth: '850px' }}>
      <motion.div 
        initial={{ opacity: 0, z: -100 }}
        animate={{ opacity: 1, z: 0 }}
        className="glass-panel"
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
             <UploadCloud size={32} color="var(--primary-accent)" />
             <Wand2 size={32} color="var(--secondary-accent)" />
          </div>
          <h2 className="title" style={{ fontSize: '2.5rem' }}>Truth Mapping</h2>
          <p className="subtitle">Synchronizing your subjective perception with physiological truth.</p>
        </div>

        {/* Magic Input Mode */}
        <div className="glass-panel" style={{ background: 'rgba(168, 155, 220, 0.08)', marginBottom: '2.5rem', padding: '1.5rem', borderStyle: 'dashed' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
            <Sparkles size={20} color="var(--primary-accent)" />
            <h4 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>Natural Language Calibration</h4>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Describe how you're feeling or list your metrics in a sentence. We'll extract them automatically.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <textarea 
              value={magicText}
              onChange={e => setMagicText(e.target.value)}
              placeholder="e.g., 'My HRV was 45, heart rate 62, and I feel moderate stress today.'"
              style={{ 
                flex: 1, height: '80px', background: 'rgba(255,255,255,0.7)', 
                borderRadius: '12px', padding: '12px', border: '1px solid var(--glass-border)',
                fontSize: '0.9rem', resize: 'none'
              }}
            />
            <button 
              className="btn btn-primary"
              onClick={handleMagicParse}
              disabled={isParsing || !magicText.trim()}
              style={{ width: '120px', display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px' }}
            >
              {isParsing ? <Loader2 className="animate-spin" /> : <Wand2 size={20} />}
              <span style={{ fontSize: '0.75rem' }}>{isParsing ? 'Parsing...' : 'Sync Data'}</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h4 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>1. Physiological Signatures</h4>
            
            {/* Sex Select */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                <User size={18} /> Biological Sex
              </label>
              <select 
                value={userData.sex} 
                onChange={e => handleChange('sex', e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="" disabled>Select Sex</option>
                <option value="female">Female (Naturally Cycling)</option>
                <option value="male">Male</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  <Activity size={18} /> Resting HR
                </label>
                <input type="number" value={userData.restingHR} onChange={e => handleChange('restingHR', Number(e.target.value))} />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  <Heart size={18} /> HRV (ms)
                </label>
                <input type="number" value={userData.hrv} onChange={e => handleChange('hrv', Number(e.target.value))} />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  <Moon size={18} /> Sleep (hrs)
                </label>
                <input type="number" step="0.1" value={userData.sleep} onChange={e => handleChange('sleep', Number(e.target.value))} />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  <Footprints size={18} /> Steps
                </label>
                <input type="number" value={userData.steps} onChange={e => handleChange('steps', Number(e.target.value))} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'rgba(168, 155, 220, 0.05)', padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--glass-border)' }}>
            <h4 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Brain size={20} color="var(--primary-accent)" /> 2. Subjective Perception
            </h4>
            
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              The mcPHASES model compares your perceived stress to your physiological markers to calculate your unique <strong>Perception Gap</strong>.
            </p>

            <div style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Perceived Stress</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-accent)' }}>{userData.perceivedStress} / 10</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="10" 
                step="1"
                value={userData.perceivedStress} 
                onChange={e => handleChange('perceivedStress', Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--primary-accent)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <span>Low</span>
                <span>Moderate</span>
                <span>Peak</span>
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
              <div className="alert-box" style={{ background: 'rgba(255,255,255,0.4)', padding: '12px', borderRadius: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)', border: '1px dashed var(--glass-border)' }}>
                <strong>Truth Model:</strong> We map your {userData.hrv}ms HRV against your {userData.perceivedStress}/10 perception to identify hormonal misclassification.
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            className="btn btn-primary" 
            onClick={onNext} 
            disabled={!isFormValid}
            style={{ 
              opacity: isFormValid ? 1 : 0.5, 
              cursor: isFormValid ? 'pointer' : 'not-allowed',
              boxShadow: '0 10px 20px rgba(129, 140, 248, 0.3)' 
            }}
          >
            Calculate Truth Gap <ChevronRight size={20} style={{ marginLeft: '4px' }} />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default UploadFlow;

