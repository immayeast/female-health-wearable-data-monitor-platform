import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { UserData } from '../App';
import { Map, ArrowRight } from 'lucide-react';

interface ClassifierUmapProps {
  userData: UserData;
  onNext: () => void;
}

// Generate static fake background data points for the population
const generatePopulation = () => {
  const points = [];
  for(let i=0; i<150; i++) {
    points.push({
      x: (Math.random() - 0.5) * 10,
      y: (Math.random() - 0.5) * 10,
      type: 'aligned',
      color: '#34d399' // Green
    });
  }
  for(let i=0; i<50; i++) {
    points.push({
      x: (Math.random() * 5) + 3,
      y: (Math.random() * 5) + 3,
      type: 'self_higher',
      color: '#fb7185' // Red
    });
  }
  for(let i=0; i<30; i++) {
    points.push({
      x: (Math.random() * 5) - 8,
      y: (Math.random() * 5) - 8,
      type: 'wearable_higher',
      color: '#818cf8' // Blue
    });
  }
  return points;
};

const ClassifierUmap: React.FC<ClassifierUmapProps> = ({ userData, onNext }) => {
  const popData = useMemo(() => generatePopulation(), []);

  // Determine user position based on metrics
  let userX = 0;
  let userY = 0;
  let label = "Aligned";
  let labelColor = "#34d399";
  let desc = "Your subjective feeling of stress perfectly matches the hardware's physiological baseline.";

  if (userData.hrv < 40 && userData.restingHR > 70) {
    userX = -5; userY = -5;
    label = "Wearable Higher (Over-estimation)";
    labelColor = "#818cf8";
    desc = "The algorithm reads your physiology as 'stressed' but you feel fine. This is the classic locus of un-adjusted Progesterone depression.";
  } else if (userData.hrv > 60 && userData.restingHR < 55) {
    userX = 5; userY = 5;
    label = "Self Higher (Under-estimation)";
    labelColor = "#fb7185";
    desc = "You feel internally stressed, but the algorithm sees low HR / high HRV and tells you that you are relaxed.";
  }

  const userPoint = [{ x: userX, y: userY, type: 'You', color: '#1e293b' }];

  return (
    <div className="container" style={{ margin: 'auto', maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <Map size={48} color="var(--primary-accent)" style={{ marginBottom: '1rem' }} />
        <h2 className="title">Classification Manifold</h2>
        <p className="subtitle" style={{ maxWidth: '700px', margin: '0 auto' }}>
          Mapping your uncalibrated physiological footprint against the dataset's perceptual boundaries.
        </p>
      </div>

      <motion.div 
        whileHover={{ rotateX: 3, rotateY: -3, z: 20 }}
        className="glass-panel" 
        style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '3rem', alignItems: 'center' }}
      >
        <div style={{ height: '400px', width: '100%', position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <XAxis type="number" dataKey="x" name="UMAP 1" hide domain={[-10, 10]} />
              <YAxis type="number" dataKey="y" name="UMAP 2" hide domain={[-10, 10]} />
              <ZAxis type="number" range={[100, 600]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: 'rgba(255,255,255,0.9)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '8px' }} />
              
              <Scatter name="Population" data={popData} fill="#8884d8">
                {popData.map((entry, index) => (
                  <Cell 
                    key={`pop-${index}`} 
                    fill={entry.color} 
                    opacity={0.3 + (entry.x + 10) / 40} 
                  />
                ))}
              </Scatter>
              
              <Scatter name="You" data={userPoint} fill="#1e293b">
                <Cell key="user" fill="#1e293b" />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <motion.div 
            className="animate-pulse-slow"
            style={{ 
              position: 'absolute', 
              top: `${50 - (userY * 5)}%`, 
              left: `${50 + (userX * 5)}%`, 
              transform: 'translate(-50%, -50%) translateZ(40px)',
              width: '40px', height: '40px', 
              borderRadius: '50%', 
              border: '2px solid #1e293b', 
              pointerEvents: 'none',
              boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
            }} 
          />
        </div>

        <div>
          <h3 style={{ fontSize: '1rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '1px', marginBottom: '0.5rem' }}>
            Result Locus
          </h3>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 700, color: labelColor, marginBottom: '1rem', lineHeight: 1.1 }}>
            {label}
          </h2>
          <p style={{ color: 'var(--text-primary)', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            {desc}
          </p>

          <button className="btn btn-primary" onClick={onNext} style={{ width: '100%' }}>
            Recalibrate Baseline <ArrowRight size={20} />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ClassifierUmap;
