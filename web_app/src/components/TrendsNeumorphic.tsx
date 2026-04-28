import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface TrendsProps {
  data: any[];
}

const TrendsNeumorphic: React.FC<TrendsProps> = ({ data }) => {
  const [metric, setMetric] = useState<'stress' | 'rmssd'>('stress');

  return (
    <div className="container fade-in">
      <h1 className="screen-title">Trends</h1>
      <p className="screen-subtitle">Your physiological patterns over time.</p>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="soft-inset" style={{ padding: '8px', display: 'flex', gap: '4px' }}>
          {(['stress', 'rmssd'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={metric === m ? 'soft-raised' : ''}
              style={{
                flex: 1,
                border: 'none',
                background: metric === m ? 'var(--card-surface)' : 'transparent',
                padding: '10px',
                borderRadius: '16px',
                fontSize: '0.8rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: metric === m ? 'var(--primary-lavender)' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              {m === 'rmssd' ? 'HRV (Gap)' : 'Stress'}
            </button>
          ))}
        </div>

        <div className="soft-raised" style={{ height: '300px', width: '100%', padding: '1rem' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.slice(-30)}>
              <XAxis dataKey="date" hide />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip 
                contentStyle={{ 
                  background: 'var(--card-surface)', 
                  border: 'none', 
                  borderRadius: '16px', 
                  boxShadow: '4px 4px 10px var(--dark-shadow)' 
                }} 
              />
              <Line 
                type="monotone" 
                dataKey={metric} 
                stroke="var(--primary-lavender)" 
                strokeWidth={3} 
                dot={false} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="soft-raised" style={{ padding: '1.5rem' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Insight</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {metric === 'stress' 
              ? "Your stress levels show a consistent stabilization during the current cycle."
              : "Your HRV gap has narrowed, indicating better alignment between wearables and perception."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TrendsNeumorphic;
