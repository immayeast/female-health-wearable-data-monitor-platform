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
        
        <div style={{ position: 'relative', width: '100%', height: '48px' }}>
          {/* The Deep Rectangular Trench */}
          <div className="soft-inset" style={{ 
            width: '100%', 
            height: '100%', 
            borderRadius: '4px', // Sharp, technical rectangle
            position: 'relative',
            overflow: 'hidden',
            background: 'var(--bg-main)',
            boxShadow: 'inset 6px 6px 12px var(--dark-shadow), inset -6px -6px 12px var(--light-shadow)'
          }}>
            {/* The Opaque Block Fill */}
            <div style={{ 
              position: 'absolute', left: 0, top: 0, bottom: 0, 
              width: `${percentage}%`, 
              background: color, 
              opacity: 1, 
              transition: 'width 0.1s cubic-bezier(0.2, 0.8, 0.2, 1)'
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
            style={{ height: '48px' }}
          />
          
          {/* Visual Overlay: Subtle Refraction Edge */}
          <div 
            style={{ 
              position: 'absolute', 
              left: `calc(${percentage}% - 1px)`, 
              top: 0,
              bottom: 0,
              width: '2px', 
              background: 'rgba(255, 255, 255, 0.4)', // Subtle light edge instead of obvious line
              pointerEvents: 'none',
              zIndex: 10,
              transition: 'left 0.1s cubic-bezier(0.2, 0.8, 0.2, 1)'
            }}
          />
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
          icon={<Heart size={18} color="#B9A7F5" />}
          value={data.hrv}
          min={20} max={120} step={1} unit="ms"
          field="hrv"
          color="#B9A7F5" // Muted Lavender
        />

        <WindowPaneSlider 
          label="Resting Heart Rate" 
          icon={<Activity size={18} color="#BFD8C8" />}
          value={data.rhr}
          min={40} max={100} step={1} unit="bpm"
          field="rhr"
          color="#BFD8C8" // Research Mint
        />

        <WindowPaneSlider 
          label="Body Temp Diff" 
          icon={<Thermometer size={18} color="#E8D8C3" />}
          value={data.temp_diff}
          min={-1} max={1} step={0.1} unit="°C"
          field="temp_diff"
          color="#E8D8C3" // Warm Beige
        />
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.2rem', color: 'var(--text-muted)' }}>Menstrual Context</h3>
        <WindowPaneSlider 
          label="Cycle Day" 
          icon={<Calendar size={18} color="#A7BED3" />}
          value={data.cycle_day}
          min={1} max={32} step={1} unit=""
          field="cycle_day"
          color="#A7BED3" // Distinct Slate Blue
        />

        <div style={{ marginTop: '2.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.2rem', color: 'var(--text-muted)' }}>Subjective Log</h3>
          <WindowPaneSlider 
            label="Stress Level" 
            icon={<Info size={18} color="#A6B0A0" />}
            value={data.subjective_stress}
            min={1} max={10} step={1} unit="/10"
            field="subjective_stress"
            color="#A6B0A0" // Distinct Muted Sage
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
