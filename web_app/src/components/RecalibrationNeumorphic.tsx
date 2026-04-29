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
    setTimeout(() => {
      onComplete(data);
      setIsProcessing(false);
    }, 2000);
  };

  const WindowPaneSlider = ({ label, icon, value, min, max, step, unit, field, color = "var(--primary-lavender)" }: any) => {
    const percentage = ((value - min) / (max - min)) * 100;
    
    return (
      <div className="soft-raised" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="soft-inset" style={{ padding: '8px', borderRadius: '12px' }}>
              {icon}
            </div>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{label}</span>
          </div>
          <span style={{ fontWeight: 700, color: color }}>{value}{unit}</span>
        </div>
        
        <div style={{ position: 'relative', width: '100%', height: '54px' }}>
          {/* The Inset Track (The Frame) */}
          <div className="soft-inset" style={{ 
            width: '100%', 
            height: '100%', 
            borderRadius: '27px', 
            position: 'relative',
            overflow: 'hidden',
            background: 'var(--bg-main)'
          }}>
            {/* The "Closed" Area Reveal */}
            <div style={{ 
              position: 'absolute', left: 0, top: 0, bottom: 0, 
              width: `${percentage}%`, 
              background: color, 
              opacity: 0.1,
              transition: 'width 0.15s ease-out'
            }} />
          </div>

          {/* The Transparent Input Control */}
          <input 
            type="range" 
            min={min} 
            max={max} 
            step={step} 
            value={value} 
            onChange={(e) => setData({...data, [field]: parseFloat(e.target.value)})}
            className="pane-slider-input"
          />
          
          {/* Visual Overlay: The "Seamless Door" Edge */}
          <div 
            style={{ 
              position: 'absolute', 
              left: `calc(${percentage}% * 0.98)`, 
              top: '4px',
              bottom: '4px',
              width: '2px', 
              background: color,
              boxShadow: `0 0 10px ${color}44`,
              pointerEvents: 'none',
              zIndex: 10,
              transition: 'left 0.1s ease-out'
            }}
          >
            {/* Subtle glow tips */}
            <div style={{ position: 'absolute', top: -2, left: -2, width: 6, height: 6, borderRadius: '50%', background: color, opacity: 0.5 }} />
            <div style={{ position: 'absolute', bottom: -2, left: -2, width: 6, height: 6, borderRadius: '50%', background: color, opacity: 0.5 }} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container fade-in" style={{ paddingBottom: '120px' }}>
      <h1 className="screen-title">P4 Recalibration</h1>
      <p className="screen-subtitle">Adjust the sharp window panes to align your physiological truth.</p>

      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.2rem', color: 'var(--text-muted)' }}>Physiological Markers</h3>
        
        <WindowPaneSlider 
          label="HRV (RMSSD)" 
          icon={<Heart size={18} color="var(--primary-lavender)" />}
          value={data.hrv}
          min={20} max={120} step={1} unit="ms"
          field="hrv"
        />

        <WindowPaneSlider 
          label="Resting Heart Rate" 
          icon={<Activity size={18} color="var(--error)" />}
          value={data.rhr}
          min={40} max={100} step={1} unit="bpm"
          field="rhr"
          color="var(--error)"
        />

        <WindowPaneSlider 
          label="Body Temp Diff" 
          icon={<Thermometer size={18} color="var(--warm-beige)" />}
          value={data.temp_diff}
          min={-1} max={1} step={0.1} unit="°C"
          field="temp_diff"
          color="var(--warm-beige)"
        />
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.2rem', color: 'var(--text-muted)' }}>Menstrual Context</h3>
        <WindowPaneSlider 
          label="Cycle Day" 
          icon={<Calendar size={18} color="var(--secondary-mint)" />}
          value={data.cycle_day}
          min={1} max={32} step={1} unit=""
          field="cycle_day"
          color="var(--secondary-mint)"
        />

        <div style={{ marginTop: '2.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.2rem', color: 'var(--text-muted)' }}>Subjective Log</h3>
          <WindowPaneSlider 
            label="Stress Level" 
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
        style={{ 
          width: '100%', 
          padding: '20px', 
          marginTop: '3rem', 
          height: '72px', 
          borderRadius: '36px', 
          fontSize: '1rem',
          fontWeight: 700,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '10px 10px 20px var(--dark-shadow), -10px -10px 20px var(--light-shadow)'
        }}
      >
        {isProcessing ? (
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
            <Activity size={24} />
          </motion.div>
        ) : (
          <>
            <Send size={20} />
            <span>Verify Model Calibration</span>
          </>
        )}
      </button>

      <div className="soft-raised" style={{ marginTop: '2.5rem', padding: '1.2rem', display: 'flex', gap: '12px', alignItems: 'center', borderRadius: '24px' }}>
        <Info size={20} color="var(--primary-lavender)" />
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Applying these changes recalibrates your population Z-score distribution.
        </p>
      </div>
    </div>
  );
};

export default RecalibrationNeumorphic;
