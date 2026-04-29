import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Thermometer, Heart, Calendar, Send, Info } from 'lucide-react';

interface RecalibrationProps {
  onComplete: (data: any) => void;
}

const RecalibrationNeumorphic: React.FC<RecalibrationProps> = ({ onComplete }) => {
  const [data, setData] = useState({
    hrv: 65,
    rhr: 70,
    temp_diff: 0.2,
    steps: 8000,
    cycle_day: 14,
    subjective_stress: 5
  });

  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = () => {
    setIsProcessing(true);
    // Simulate model processing
    setTimeout(() => {
      onComplete(data);
      setIsProcessing(false);
    }, 2000);
  };

  const FeatureInput = ({ label, icon, value, min, max, step, unit, field }: any) => (
    <div className="soft-raised" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="soft-inset" style={{ padding: '8px', borderRadius: '12px' }}>
            {icon}
          </div>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
        </div>
        <span style={{ fontWeight: 700, color: 'var(--primary-lavender)' }}>{value}{unit}</span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        step={step} 
        value={value} 
        onChange={(e) => setData({...data, [field]: parseFloat(e.target.value)})}
        style={{ 
          width: '100%', 
          height: '6px', 
          borderRadius: '3px',
          appearance: 'none',
          background: 'var(--dark-shadow)',
          cursor: 'pointer'
        }}
      />
    </div>
  );

  return (
    <div className="container fade-in">
      <h1 className="screen-title">Recalibrate Model</h1>
      <p className="screen-subtitle">Feed your current truth back into the P4 hypothesis.</p>

      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>Physiological Features</h3>
        
        <FeatureInput 
          label="HRV (RMSSD)" 
          icon={<Heart size={18} color="var(--primary-lavender)" />}
          value={data.hrv}
          min={20} max={120} step={1} unit="ms"
          field="hrv"
        />

        <FeatureInput 
          label="Resting Heart Rate" 
          icon={<Activity size={18} color="var(--error)" />}
          value={data.rhr}
          min={40} max={100} step={1} unit="bpm"
          field="rhr"
        />

        <FeatureInput 
          label="Body Temp Diff" 
          icon={<Thermometer size={18} color="var(--warm-beige)" />}
          value={data.temp_diff}
          min={-1} max={1} step={0.1} unit="°C"
          field="temp_diff"
        />
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>Contextual Features</h3>
        
        <FeatureInput 
          label="Menstrual Day" 
          icon={<Calendar size={18} color="var(--secondary-mint)" />}
          value={data.cycle_day}
          min={1} max={32} step={1} unit=""
          field="cycle_day"
        />

        <div className="soft-raised" style={{ padding: '1.5rem', background: 'var(--primary-lavender)', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
            <span style={{ fontWeight: 700 }}>Subjective Stress (The Truth)</span>
            <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>{data.subjective_stress}/10</span>
          </div>
          <input 
            type="range" 
            min={1} max={10} step={1} 
            value={data.subjective_stress} 
            onChange={(e) => setData({...data, subjective_stress: parseInt(e.target.value)})}
            style={{ width: '100%', cursor: 'pointer' }}
          />
        </div>
      </div>

      <button 
        className="soft-btn soft-btn-primary" 
        onClick={handleSubmit}
        disabled={isProcessing}
        style={{ width: '100%', padding: '20px', marginTop: '1rem', height: '70px' }}
      >
        {isProcessing ? (
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
            <Activity size={24} />
          </motion.div>
        ) : (
          <>
            <Send size={20} />
            <span>Run Recalibration Model</span>
          </>
        )}
      </button>

      <div className="soft-raised" style={{ marginTop: '2rem', padding: '1.2rem', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Info size={20} color="var(--primary-lavender)" />
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Running this model will synchronize your perceived stress with your wearable's Z-scores using a Gradient Boosted logic.
        </p>
      </div>
    </div>
  );
};

export default RecalibrationNeumorphic;
