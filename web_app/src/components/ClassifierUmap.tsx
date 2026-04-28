import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { UserData } from '../App';
import { Map, ArrowRight, Loader2 } from 'lucide-react';

interface TrajectoryPoint {
  date: string;
  stress: number;
  phase: string;
  x: number;
  y: number;
  rmssd: number | null;
}

interface PopulationPoint {
  x: number;
  y: number;
  type: string;
}

interface TrajectoryData {
  user_trajectory: TrajectoryPoint[];
  population_background: PopulationPoint[];
}

interface ClassifierUmapProps {
  userData: UserData;
  onNext: () => void;
}

const ClassifierUmap: React.FC<ClassifierUmapProps> = ({ onNext }) => {
  const [data, setData] = useState<TrajectoryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/user_trajectory.json')
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load trajectory:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Loader2 className="animate-spin" size={48} color="var(--primary-accent)" />
      </div>
    );
  }

  // Fallback to mock logic if data failed to load
  const userTrajectory = data?.user_trajectory || [];
  const popData = data?.population_background || [];
  
  // Get most recent instance
  const latestInstance = userTrajectory[userTrajectory.length - 1];
  const recentTrajectory = userTrajectory.slice(-14); // Last 2 weeks

  return (
    <div className="container" style={{ margin: 'auto', maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <Map size={48} color="var(--primary-accent)" style={{ marginBottom: '1rem' }} />
        <h2 className="title text-gradient" style={{ fontSize: '2.5rem' }}>Trajectory Analysis</h2>
        <p className="subtitle" style={{ maxWidth: '700px', margin: '0 auto' }}>
          Visualizing your movement through the physiological manifold over the last {userTrajectory.length} days.
        </p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel" 
        style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '3rem', alignItems: 'center' }}
      >
        <div style={{ height: '500px', width: '100%', position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <XAxis type="number" dataKey="x" hide domain={['auto', 'auto']} />
              <YAxis type="number" dataKey="y" hide domain={['auto', 'auto']} />
              <ZAxis type="number" range={[50, 400]} />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }} 
                contentStyle={{ background: 'rgba(255,255,255,0.9)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '8px' }} 
                formatter={(value: any, name?: any) => {
                  if (name === 'stress') return [`${Number(value).toFixed(2)}`, 'Calibrated Stress'];
                  if (name === 'date') return [value, 'Date'];
                  return [value, name ?? ''];
                }}
              />
              
              {/* Population Background */}
              <Scatter name="Population" data={popData} fill="var(--text-muted)" opacity={0.1} />
              
              {/* Full User Trajectory (Faded) */}
              <Scatter name="History" data={userTrajectory.slice(0, -14)} fill="var(--primary-accent)" opacity={0.2} line={{ stroke: 'var(--primary-accent)', strokeWidth: 1, strokeOpacity: 0.1 }} />
              
              {/* Recent Trajectory (Highlighted) */}
              <Scatter name="Recent" data={recentTrajectory} fill="var(--secondary-accent)" line={{ stroke: 'var(--secondary-accent)', strokeWidth: 2 }}>
                {recentTrajectory.map((_, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={index === recentTrajectory.length - 1 ? 'var(--primary-accent)' : 'var(--secondary-accent)'} 
                    strokeWidth={index === recentTrajectory.length - 1 ? 4 : 1}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h3 style={{ fontSize: '1rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '1px', marginBottom: '0.5rem' }}>
            Latest Calibrated State
          </h3>
          <h2 style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--primary-accent)', marginBottom: '0.5rem', lineHeight: 1.1 }}>
            {latestInstance?.stress.toFixed(1)} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 5.0</span>
          </h2>
          <p style={{ color: 'var(--text-primary)', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Based on your HRV ({latestInstance?.rmssd?.toFixed(0)}ms) and {latestInstance?.phase} phase context, your calibrated stress score is {latestInstance?.stress > 3 ? 'Elevated' : 'Stable'}.
          </p>
          
          <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', marginBottom: '2rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Recent Momentum</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Your physiological "momentum" has shifted {Math.abs(recentTrajectory[0].stress - latestInstance.stress).toFixed(1)} points over the last 14 days.
            </p>
          </div>

          <button className="btn btn-primary" onClick={onNext} style={{ width: '100%' }}>
            Recalibrate Baseline <ArrowRight size={20} />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ClassifierUmap;
