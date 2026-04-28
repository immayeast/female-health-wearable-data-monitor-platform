import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { UserData } from '../App';
import { ArrowRight, BrainCircuit } from 'lucide-react';

interface PhasePredictionProps {
  userData: UserData;
  onNext: () => void;
}

const PhasePrediction: React.FC<PhasePredictionProps> = ({ userData, onNext }) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate GB Model inference time
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  // Mock SHAP/GB Model Feature Importance dynamically scaled by user input
  // Simulating how volatility and phase features predict the "Truth"
  const factorData = [
    { name: 'HRV Volatility', value: Math.abs(userData.hrv - 45) * 1.5 + 20, color: '#818cf8' },
    { name: 'Resting HR Spike', value: Math.abs(userData.restingHR - 60) * 1.2 + 15, color: '#c084fc' },
    { name: 'Perceived Baseline', value: userData.perceivedStress * 4 + 10, color: '#fb7185' },
    { name: 'Phase Inference', value: 25, color: '#34d399' }
  ].sort((a, b) => b.value - a.value);

  // Inferred Phase
  let inferredPhase = userData.phase ? (userData.phase.charAt(0).toUpperCase() + userData.phase.slice(1)) : 'Luteal';
  
  if (!userData.phase) {
    // Mock Inference Phase fallback
    if (userData.hrv > 55 && userData.restingHR < 60) inferredPhase = 'Follicular';
    else if (userData.hrv > 65) inferredPhase = 'Fertility';
    else if (userData.hrv < 40) inferredPhase = 'Menstrual';
  }

  return (
    <div className="container" style={{ margin: 'auto', maxWidth: '950px' }}>
      {loading ? (
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <BrainCircuit size={64} color="var(--primary-accent)" />
          </motion.div>
          <h2 className="title" style={{ fontSize: '2rem' }}>Extracting Volatility Features...</h2>
          <p className="subtitle" style={{ maxWidth: '500px', margin: '0 auto' }}>
            Analyzing heart rate spikes, HRV floors, and mapping against your {userData.perceivedStress}/10 subjective state.
          </p>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.5 }}
          className="glass-panel"
        >
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 className="subtitle" style={{ marginBottom: '0.5rem', color: 'var(--primary-accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '2px' }}>
              Inferred Hormonal Context
            </h2>
            <h1 className="title text-gradient" style={{ fontSize: '4rem', marginBottom: '0' }}>
              {inferredPhase} Phase
            </h1>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontWeight: 600 }}>GB Model Drivers</h3>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                The Gradient Boosting engine relies heavily on <strong>physiological volatility</strong> (spikes and drops) rather than static daily averages to map to your perceived state.
              </p>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '2.5rem' }}>
                Because you are inferred to be in the {inferredPhase} phase, the model expects a specific baseline shift driven by {inferredPhase === 'Follicular' ? 'Estrogen' : 'Progesterone'}. 
                If the wearable algorithm ignores this context, a "Truth Gap" will emerge.
              </p>
              
              <button className="btn btn-primary" onClick={onNext} style={{ width: '100%', padding: '16px', borderRadius: '30px' }}>
                Evaluate Truth Gap <ArrowRight size={20} />
              </button>
            </div>

            <div style={{ height: '350px', width: '100%', background: 'rgba(0,0,0,0.1)', borderRadius: '16px', padding: '1rem' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '1rem' }}>Truth Model Feature Importance (SHAP)</h4>
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={factorData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-primary)', fontSize: 12, fontWeight: 500 }} width={120} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(168, 155, 220, 0.1)' }} 
                    contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-primary)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
                    formatter={(value: any) => [`${Number(value).toFixed(1)} impact`, 'Importance']}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                    {factorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default PhasePrediction;
