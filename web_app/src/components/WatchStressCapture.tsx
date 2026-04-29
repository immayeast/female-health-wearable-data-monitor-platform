import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Heart, Play, SkipForward, X, Check } from 'lucide-react';

type TriggerType = 'physiological_spike' | 'self_prompt';
type Screen = 'prompt' | 'vitals' | 'capturing' | 'success';

interface WatchStressCaptureProps {
  onClose: () => void;
  onSave: (event: any) => void;
  triggerType: TriggerType;
  currentVitals: {
    hr: number;
    hrv: number;
    restingHR: number;
    predictedStress: number;
    phase: string;
  };
}

const WatchStressCapture: React.FC<WatchStressCaptureProps> = ({ 
  onClose, 
  onSave, 
  triggerType,
  currentVitals
}) => {
  const [screen, setScreen] = useState<Screen>('prompt');
  const [selfReport, setSelfReport] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);

  // Simulation of vitals capture
  useEffect(() => {
    if (screen === 'capturing') {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setScreen('success');
            return 100;
          }
          return prev + 5;
        });
      }, 150);
      return () => clearInterval(interval);
    }
  }, [screen]);

  const handleResponse = (val: number) => {
    setSelfReport(val);
    setScreen('vitals');
  };

  const handleFinalSave = () => {
    const event = {
      event_id: `ev_${Date.now()}`,
      timestamp: new Date().toISOString(),
      trigger_type: triggerType,
      self_report_stress: selfReport,
      heart_rate: currentVitals.hr,
      hrv: currentVitals.hrv,
      resting_hr: currentVitals.restingHR,
      activity_context: 'sedentary',
      sleep_context: 'normal',
      cycle_phase: currentVitals.phase,
      model_predicted_stress: currentVitals.predictedStress,
      // Simplified Gap Score: (Self - Predicted)
      // In a real app, z-scoring would happen across a larger dataset
      gap_score: (selfReport || 0) - currentVitals.predictedStress
    };
    onSave(event);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)'
    }}>
      {/* Watch Body */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{
          width: '320px', height: '320px',
          borderRadius: '60px',
          background: '#000',
          border: '8px solid #222',
          boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          position: 'relative'
        }}
      >
        {/* Watch Screen Content */}
        <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          
          <AnimatePresence mode="wait">
            {screen === 'prompt' && (
              <motion.div key="prompt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '8px', textTransform: 'uppercase' }}>
                  {triggerType === 'physiological_spike' ? 'Body Signal Change' : 'Log Stress'}
                </p>
                <h3 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 600, marginBottom: '24px' }}>
                  {triggerType === 'physiological_spike' ? 'Do you feel stressed?' : 'How stressed do you feel?'}
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                  <button onClick={() => handleResponse(1)} style={watchBtnStyle}>
                    {triggerType === 'physiological_spike' ? 'No' : 'Low'}
                  </button>
                  <button onClick={() => handleResponse(3)} style={watchBtnStyle}>
                    {triggerType === 'physiological_spike' ? 'A little' : 'Medium'}
                  </button>
                  <button onClick={() => handleResponse(5)} style={watchBtnStyle}>
                    {triggerType === 'physiological_spike' ? 'Yes' : 'High'}
                  </button>
                </div>
              </motion.div>
            )}

            {screen === 'vitals' && (
              <motion.div key="vitals" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Activity size={32} color="#B9A7F5" style={{ marginBottom: '12px' }} />
                <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600, marginBottom: '20px' }}>
                  Take a 30-sec vitals snapshot?
                </h3>
                <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                  <button onClick={() => setScreen('capturing')} style={{ ...watchBtnStyle, background: '#B9A7F5', color: '#000' }}>
                    <Play size={16} /> Start
                  </button>
                  <button onClick={handleFinalSave} style={{ ...watchBtnStyle, background: '#333' }}>
                    <SkipForward size={16} /> Skip
                  </button>
                </div>
              </motion.div>
            )}

            {screen === 'capturing' && (
              <motion.div key="capturing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto 20px' }}>
                   <svg width="100" height="100" viewBox="0 0 100 100">
                     <circle cx="50" cy="50" r="45" fill="none" stroke="#333" strokeWidth="8" />
                     <circle cx="50" cy="50" r="45" fill="none" stroke="#B9A7F5" strokeWidth="8" 
                       strokeDasharray="282" strokeDashoffset={282 - (282 * progress) / 100} 
                       strokeLinecap="round" transform="rotate(-90 50 50)" />
                   </svg>
                   <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <Heart size={32} color="#B9A7F5" className="animate-pulse" />
                   </div>
                </div>
                <p style={{ color: '#fff', fontSize: '1rem', fontWeight: 600 }}>Capturing Vitals...</p>
                <p style={{ color: '#aaa', fontSize: '0.8rem', marginTop: '4px' }}>Keep still</p>
              </motion.div>
            )}

            {screen === 'success' && (
              <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div style={{ background: 'rgba(52, 211, 153, 0.2)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Check size={32} color="#34D399" />
                </div>
                <h3 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 600, marginBottom: '12px' }}>Capture Complete</h3>
                <p style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '24px' }}>Data synced to Research Cloud</p>
                <button onClick={handleFinalSave} style={watchBtnStyle}>Done</button>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
      </motion.div>
    </div>
  );
};

const watchBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  borderRadius: '12px',
  border: 'none',
  background: '#222',
  color: '#fff',
  fontSize: '0.9rem',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px'
};

export default WatchStressCapture;
