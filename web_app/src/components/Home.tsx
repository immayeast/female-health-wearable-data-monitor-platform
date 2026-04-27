import React from 'react';
import { Activity, Beaker, BrainCircuit, HeartPulse } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface HomeProps {
  onNext: () => void;
}

const mockHrvData = [
  { day: 'Mon', hrv: 65, baseline: 60 },
  { day: 'Tue', hrv: 62, baseline: 60 },
  { day: 'Wed', hrv: 68, baseline: 60 },
  { day: 'Thu', hrv: 55, baseline: 60 },
  { day: 'Fri', hrv: 48, baseline: 60 },
  { day: 'Sat', hrv: 45, baseline: 60 },
  { day: 'Sun', hrv: 42, baseline: 60 },
];

const mockPhaseData = [
  { phase: 'Follicular', value: 80 },
  { phase: 'Ovulatory', value: 95 },
  { phase: 'Mid-Luteal', value: 45 },
  { phase: 'Late-Luteal', value: 50 },
];

const Home: React.FC<HomeProps> = ({ onNext }) => {
  return (
    <div className="container" style={{ margin: 'auto', paddingTop: '2rem', paddingBottom: '4rem', maxWidth: '1400px' }}>
      
      {/* Dashboard Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
        <div>
          <h1 className="title" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
            Welcome to <span className="text-gradient">mcPHASES</span>
          </h1>
          <p className="subtitle" style={{ margin: 0 }}>
            Bridging the Physiological Gap in Female Wearables
          </p>
        </div>
        <button className="btn btn-primary" onClick={onNext} style={{ fontSize: '1.1rem', padding: '14px 32px' }}>
          Enter Pipeline <Activity size={20} />
        </button>
      </div>

      {/* Main Dashboard Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        
        {/* Large Chart Panel */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '400px' }}>
          <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <HeartPulse size={24} color="var(--primary-accent)" />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Heart Rate Variability (HRV) Trends</h3>
          </div>
          <div style={{ flexGrow: 1, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockHrvData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--glass-border)" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} dx={-10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', border: '1px solid var(--glass-border)', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Line type="monotone" dataKey="hrv" stroke="var(--primary-accent)" strokeWidth={4} dot={{ r: 6, fill: 'var(--primary-accent)', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} name="Actual HRV" />
                <Line type="monotone" dataKey="baseline" stroke="var(--secondary-accent)" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Algorithm Baseline" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Small Bar Chart Panel */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '400px' }}>
          <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Beaker size={24} color="var(--secondary-accent)" />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Phase Impact</h3>
          </div>
          <div style={{ flexGrow: 1, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockPhaseData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--glass-border)" />
                <XAxis dataKey="phase" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} dy={10} interval={0} angle={-30} textAnchor="end" height={60} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(168, 155, 220, 0.1)' }}
                  contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', border: '1px solid var(--glass-border)', borderRadius: '12px' }}
                />
                <Bar dataKey="value" fill="var(--primary-accent)" radius={[6, 6, 0, 0]} fillOpacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Info Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>HRV Misclassification</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
            High levels of Progesterone (P4) are intrinsically associated with lower HRV. Algorithms judging female HRV against standard curves evaluate them as "stressed" when they are simply in the luteal phase.
          </p>
        </div>
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Endogenous Shift</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Within-person fluctuations in P4 directly modulate baselines. The mcPHASES project uses Gradient Boosting to recalibrate user streams based on true female physiological cycles.
          </p>
        </div>
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>AI Alignment</h3>
            <BrainCircuit size={24} color="var(--success)" />
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Are you Aligned, Over-estimating, or Under-estimating your stress? Upload your data to find out how your subjective perception maps to the clinical UMAP manifold.
          </p>
        </div>
      </div>

    </div>
  );
};

export default Home;
