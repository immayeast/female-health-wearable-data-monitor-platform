import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Thermometer, Heart, Calendar, Send, Info, Zap, Droplet, Waves, Microscope } from 'lucide-react';
import { pythonEngine } from '../utils/PythonEngine';

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
    subjective_stress: 5,
    lh: 10,
    estrogen: 120,
    pdg: 5
  });

  const [simulation, setSimulation] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Live Simulation Trigger
  useEffect(() => {
    const runSim = async () => {
      // Create a dummy CSV row for the engine matching model features
      const dummyCsv = `resting_hr,hrv_rmssd,temp_diff,cycle_day,lh,estrogen,pdg,hr_mean\n${data.rhr},${data.hrv},${data.temp_diff},${data.cycle_day},${data.lh},${data.estrogen},${data.pdg},${data.rhr}`;
      try {
        const result = await pythonEngine.runRecalibration(dummyCsv);
        setSimulation(result);
      } catch (e) {
        console.warn("Simulation pending engine init...");
      }
    };
    const timer = setTimeout(runSim, 300);
    return () => clearTimeout(timer);
  }, [data]);

  const handleSubmit = () => {
    setIsProcessing(true);
    setTimeout(() => {
      onComplete(data);
      setIsProcessing(false);
    }, 1500);
  };

  const WindowPaneSlider = ({ label, icon, value, min, max, step, unit, field, color = "var(--primary-lavender)" }: any) => {
    const percentage = ((value - min) / (max - min)) * 100;
    
    return (
      <div className="soft-raised" style={{ padding: '1.25rem', marginBottom: '1.25rem', borderRadius: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="soft-inset" style={{ padding: '8px', borderRadius: '10px', background: 'rgba(255,255,255,0.5)' }}>
              {icon}
            </div>
            <span style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{label}</span>
          </div>
          <span style={{ fontWeight: 800, color: color, fontSize: '0.9rem' }}>{value}{unit}</span>
        </div>
        
        <div style={{ position: 'relative', width: '100%', height: '36px' }}>
          <div className="soft-inset" style={{ 
            width: '100%', height: '100%', borderRadius: '18px', overflow: 'hidden', position: 'relative', background: 'var(--bg-main)'
          }}>
            <div style={{ 
              position: 'absolute', left: 0, top: 0, bottom: 0, width: `${percentage}%`, background: color, transition: 'width 0.2s ease'
            }} />
          </div>
          <input 
            type="range" min={min} max={max} step={step} value={value} 
            onChange={(e) => setData({...data, [field]: parseFloat(e.target.value)})}
            className="pane-slider-input" style={{ height: '36px' }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="container fade-in" style={{ paddingBottom: '120px' }}>
      <h1 className="screen-title">Research Sandbox</h1>
      <p className="screen-subtitle">Simulate physiological shifts to observe model recalibration in real-time.</p>

      {/* Live Simulation Preview Card */}
      <AnimatePresence>
        {simulation && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="soft-raised"
            style={{ 
              padding: '2rem', 
              marginBottom: '2.5rem', 
              borderRadius: '32px', 
              background: 'linear-gradient(135deg, #fff 0%, #f8f9ff 100%)',
              border: '1px solid #fff'
            }}
          >
            {/* 3D State Visualization Card */}
        <div 
          className="soft-raised" 
          style={{ 
            gridColumn: 'span 2', 
            padding: '2.5rem', 
            borderRadius: '40px',
            background: 'linear-gradient(145deg, #f0f2f8, #ffffff)',
            position: 'relative',
            overflow: 'hidden',
            minHeight: '400px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <div style={{ position: 'absolute', top: '2rem', left: '2rem', zIndex: 10 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Latent Space Simulation</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>3D Hormonal Trajectory</p>
          </div>

          {/* Synthetic 3D Visualizer */}
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <motion.div
              animate={{ 
                rotateX: data.lh * 0.5, 
                rotateY: data.estrogen * 0.5,
                scale: 1 + (data.pdg / 200)
              }}
              style={{
                width: '150px',
                height: '150px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 30% 30%, var(--primary-lavender), var(--primary-teal))',
                boxShadow: '20px 20px 60px rgba(0,0,0,0.1), -20px -20px 60px #fff',
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                filter: 'blur(2px)',
                opacity: 0.8
              }}
            />
            <motion.div
              animate={{ 
                x: (data.hrv - 60) * 2,
                y: (data.rhr - 70) * 2,
                z: data.pdg
              }}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '10px 10px 30px rgba(0,0,0,0.15)',
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 20,
                border: '4px solid var(--primary-lavender)'
              }}
            />
            {/* Grid Lines */}
            <div style={{ position: 'absolute', inset: 0, border: '1px dashed rgba(0,0,0,0.05)', borderRadius: '50%', transform: 'rotateX(60deg)' }} />
            <div style={{ position: 'absolute', inset: '20%', border: '1px dashed rgba(0,0,0,0.05)', borderRadius: '50%', transform: 'rotateY(60deg)' }} />
          </div>

          <div className="soft-inset" style={{ padding: '1rem 2rem', borderRadius: '20px', marginTop: '2rem', zIndex: 10 }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-lavender)' }}>
              Trajectory: {simulation?.phase || 'Analyzing...'}
            </span>
          </div>
        </div>

        {/* Input Controls */}
        <div className="soft-raised" style={{ padding: '2.5rem', borderRadius: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Inferred State</p>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#2D3748', margin: 0 }}>{simulation.phase}</h2>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>AI Correction</p>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: simulation.gap >= 0 ? 'var(--error)' : 'var(--success)', margin: 0 }}>
                  {simulation.gap > 0 ? '+' : ''}{simulation.gap} pts
                </h2>
              </div>
            </div>
            <div style={{ marginTop: '1.5rem', height: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
              <motion.div 
                animate={{ width: `${simulation.score}%` }} 
                style={{ height: '100%', background: 'var(--primary-lavender)' }}
              />
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '12px', textAlign: 'center', fontWeight: 600 }}>
              Resulting Aligned Score: <span style={{ color: 'var(--primary-lavender)', fontWeight: 800 }}>{simulation.score}%</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '2.5rem' }}>
        <div>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Microscope size={16} /> PHYSIOLOGY
          </h3>
          <WindowPaneSlider label="HRV" icon={<Heart size={16} color="#B9A7F5" />} value={data.hrv} min={20} max={120} step={1} unit="ms" field="hrv" color="#B9A7F5" />
          <WindowPaneSlider label="RHR" icon={<Activity size={16} color="#BFD8C8" />} value={data.rhr} min={40} max={100} step={1} unit="bpm" field="rhr" color="#BFD8C8" />
          <WindowPaneSlider label="Temp" icon={<Thermometer size={16} color="#E8D8C3" />} value={data.temp_diff} min={-1} max={1} step={0.1} unit="°C" field="temp_diff" color="#E8D8C3" />
        </div>
        <div>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={16} /> SIGNATURES
          </h3>
          <WindowPaneSlider label="LH" icon={<Droplet size={16} color="#F5A7B9" />} value={data.lh} min={0} max={50} step={1} unit="mIU" field="lh" color="#F5A7B9" />
          <WindowPaneSlider label="Estrogen" icon={<Waves size={16} color="#A7D6F5" />} value={data.estrogen} min={50} max={400} step={10} unit="pg" field="estrogen" color="#A7D6F5" />
          <WindowPaneSlider label="PdG" icon={<Waves size={16} color="#D6A7F5" />} value={data.pdg} min={0} max={30} step={1} unit="ug" field="pdg" color="#D6A7F5" />
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-muted)' }}>CONTEXTUAL DATA</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <WindowPaneSlider label="Cycle Day" icon={<Calendar size={16} color="#A7BED3" />} value={data.cycle_day} min={1} max={45} step={1} unit="" field="cycle_day" color="#A7BED3" />
          <WindowPaneSlider label="Stress Log" icon={<Info size={16} color="#A6B0A0" />} value={data.subjective_stress} min={1} max={10} step={1} unit="/10" field="subjective_stress" color="#A6B0A0" />
        </div>
      </div>
      
      <button 
        className="soft-btn soft-btn-primary" onClick={handleSubmit} disabled={isProcessing}
        style={{ width: '100%', padding: '20px', height: '72px', borderRadius: '36px', fontSize: '1rem', fontWeight: 800, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}
      >
        {isProcessing ? <Activity size={24} className="spin" /> : <> <Send size={20} /> <span>Lock Calibration</span> </>}
      </button>
    </div>
  );
};

export default RecalibrationNeumorphic;
