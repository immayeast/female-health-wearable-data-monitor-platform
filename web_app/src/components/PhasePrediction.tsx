import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { UserData } from '../App';
import { Sparkles, ArrowRight } from 'lucide-react';

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
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Mock SHAP/GB Model Feature Importance dynamically scaled by user input
  const factorData = [
    { name: 'HRV', value: Math.abs(userData.hrv - 45) * 1.5 + 20, color: '#818cf8' },
    { name: 'Resting HR', value: Math.abs(userData.restingHR - 60) * 1.2 + 15, color: '#c084fc' },
    { name: 'Sleep Score', value: userData.sleep * 3 + 10, color: '#34d399' },
    { name: 'Steps', value: (userData.steps / 1000) * 2 + 5, color: '#64748b' }
  ].sort((a, b) => b.value - a.value);

  // Mock Inference Phase
  let inferredPhase = 'Mid-Luteal';
  if (userData.hrv > 55 && userData.restingHR < 60) inferredPhase = 'Follicular';
  else if (userData.hrv > 65) inferredPhase = 'Ovulatory';

  return (
    <div className="container" style={{ margin: 'auto', maxWidth: '900px' }}>
      {loading ? (
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles size={64} color="var(--primary-accent)" />
          </motion.div>
          <h2 className="title" style={{ fontSize: '2rem' }}>Running mcPHASES Inference...</h2>
          <p className="subtitle">Mapping physiological vectors to menstrual phase manifolds.</p>
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
              Inference Complete
            </h2>
            <h1 className="title text-gradient" style={{ fontSize: '4rem', marginBottom: '0' }}>
              {inferredPhase} Phase
            </h1>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 1fr', gap: '3rem', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontWeight: 600 }}>GB Model Factors</h3>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '2rem' }}>
                The Gradient Boosting tree evaluated the structural relationships between your Resting HR, HRV, and lifestyle metrics to infer your endogenous hormonal state. Note the heavy reliance on HRV, mapping closely to the PMC7141121 Progesterone dependency curve.
              </p>
              
              <button className="btn btn-primary" onClick={onNext} style={{ width: '100%' }}>
                Continue to Classification <ArrowRight size={20} />
              </button>
            </div>

            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={factorData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)' }} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                    contentStyle={{ backgroundColor: 'var(--bg-dark)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
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
