import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Thermometer, Heart, Calendar, Send, Info, GripVertical } from 'lucide-react';

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
    setTimeout(() => {
      onComplete(data);
      setIsProcessing(false);
    }, 2000);
  };

  const WindowSlider = ({ label, icon, value, min, max, step, unit, field, color = "var(--primary-lavender)" }: any) => {
    const percentage = ((value - min) / (max - min)) * 100;
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setData({...data, [field]: parseFloat(e.target.value)});
    };

    return (
      <div className="soft-raised" style={{ padding: '1.5rem', marginBottom: '1.5rem', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.2rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="soft-inset" style={{ padding: '8px', borderRadius: '12px' }}>
              {icon}
            </div>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{label}</span>
          </div>
          <span style={{ fontWeight: 700, color: color, fontSize: '1rem' }}>{value}{unit}</span>
        </div>
        
        <div style={{ position: 'relative', height: '40px', display: 'flex', alignItems: 'center' }}>
          {/* The Rail/Track */}
          <div className="soft-inset" style={{ width: '100%', height: '12px', borderRadius: '6px', position: 'relative' }}>
            {/* Active Progress */}
            <div style={{ 
              position: 'absolute', left: 0, top: 0, bottom: 0, 
              width: `${percentage}%`, 
              background: color, 
              opacity: 0.15,
              borderRadius: '6px 0 0 6px',
              transition: 'width 0.1s ease-out'
            }} />
          </div>

          {/* The Sliding Window Handle */}
          <input 
            type="range" 
            min={min} 
            max={max} 
            step={step} 
            value={value} 
            onChange={handleChange}
            className="window-slider-input"
          />
          
          {/* Visual Overlay of the "Window Pane" */}
          <div 
            style={{ 
              position: 'absolute', 
              left: `calc(${percentage}% - 12px)`, 
              pointerEvents: 'none',
              width: '24px',
              height: '40px',
              borderRadius: '6px',
              background: 'var(--bg-main)',
              boxShadow: '6px 0 15px var(--dark-shadow), -2px 0 5px var(--light-shadow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--light-shadow)',
              zIndex: 10
            }}
          >
            <GripVertical size={14} color="var(--text-muted)" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container fade-in" style={{ paddingBottom: '120px' }}>
      <h1 className="screen-title">P4 Recalibration</h1>
      <p className="screen-subtitle">Adjust your physiological baselines to reveal the Truth Gap.</p>

      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>Physiological Features</h3>
        
        <WindowSlider 
          label="HRV (RMSSD)" 
          icon={<Heart size={18} color="var(--primary-lavender)" />}
          value={data.hrv}
          min={20} max={120} step={1} unit="ms"
          field="hrv"
        />

        <WindowSlider 
          label="Resting Heart Rate" 
          icon={<Activity size={18} color="var(--error)" />}
          value={data.rhr}
          min={40} max={100} step={1} unit="bpm"
          field="rhr"
          color="var(--error)"
        />

        <WindowSlider 
          label="Body Temp Diff" 
          icon={<Thermometer size={18} color="var(--warm-beige)" />}
          value={data.temp_diff}
          min={-1} max={1} step={0.1} unit="°C"
          field="temp_diff"
          color="var(--warm-beige)"
        />
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>Contextual Features</h3>
        
        <WindowSlider 
          label="Menstrual Day" 
          icon={<Calendar size={18} color="var(--secondary-mint)" />}
          value={data.cycle_day}
          min={1} max={32} step={1} unit=""
          field="cycle_day"
          color="var(--secondary-mint)"
        />

        <div style={{ marginTop: '2.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>Interoceptive Log (Subjective Truth)</h3>
          <WindowSlider 
            label="Stress Perception" 
            icon={<Info size={18} color="var(--primary-lavender)" />}
            value={data.subjective_stress}
            min={1} max={10} step={1} unit="/10"
            field="subjective_stress"
          />
        </div>
      </div>

      <button 
        className="soft-btn soft-btn-primary" 
        onClick={handleSubmit}
        disabled={isProcessing}
        style={{ width: '100%', padding: '20px', marginTop: '1rem', height: '70px', borderRadius: '24px' }}
      >
        {isProcessing ? (
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
            <Activity size={24} />
          </motion.div>
        ) : (
          <>
            <Send size={20} />
            <span>Apply Recalibration</span>
          </>
        )}
      </button>

      <div className="soft-raised" style={{ marginTop: '2rem', padding: '1.2rem', display: 'flex', gap: '12px', alignItems: 'center', borderRadius: '20px' }}>
        <Info size={20} color="var(--primary-lavender)" />
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Your inputs will update the Gradient Boosted model in real-time.
        </p>
      </div>
    </div>
  );
};

export default RecalibrationNeumorphic;
