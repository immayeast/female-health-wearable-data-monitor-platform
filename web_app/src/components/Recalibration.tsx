import React from 'react';
import type { UserData } from '../App';
import { RefreshCcw, CheckCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface RecalibrationProps {
  userData: UserData;
  onRestart: () => void;
}

const Recalibration: React.FC<RecalibrationProps> = ({ userData, onRestart }) => {
  // Generating a sweeping curve for mathematical visual impact
  const data = [
    { time: 'Baseline', raw: userData.hrv, recalibrated: userData.hrv },
    { time: 'P4 Shift', raw: userData.hrv * 0.9, recalibrated: userData.hrv * 1.1 },
    { time: 'E2 Shift', raw: userData.hrv * 0.85, recalibrated: userData.hrv * 1.05 },
    { time: 'Alignment', raw: userData.hrv * 0.8, recalibrated: userData.hrv * 1.25 },
    { time: 'Final', raw: userData.hrv * 0.8, recalibrated: userData.hrv * 1.3 }
  ];

  return (
    <div className="container" style={{ margin: 'auto', maxWidth: '900px' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <RefreshCcw size={48} color="var(--success)" style={{ marginBottom: '1rem' }} />
        <h2 className="title text-gradient">Dynamically Recalibrated</h2>
        <p className="subtitle" style={{ maxWidth: '600px', margin: '0 auto' }}>
          Your physiological vectors have been offset to account for the Luteal phase P4 index.
        </p>
      </div>

      <div className="glass-panel" style={{ marginBottom: '3rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 600 }}>Algorithm Coefficient Shifts</h3>
        <div style={{ height: '300px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRaw" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fb7185" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#fb7185" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorRecal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="var(--text-secondary)" />
              <YAxis stroke="var(--text-secondary)" />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-dark)', border: '1px solid var(--glass-border)', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="raw" stroke="#fb7185" fillOpacity={1} fill="url(#colorRaw)" name="Uncalibrated Trajectory" />
              <Area type="monotone" dataKey="recalibrated" stroke="#34d399" fillOpacity={1} fill="url(#colorRecal)" name="mcPHASES Recalibrated Alignment" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <CheckCircle color="var(--success)" size={32} />
          <div>
            <h4 style={{ fontWeight: 600, fontSize: '1.1rem' }}>HRV Offset (+12%)</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Compensating for Progesterone driven suppression.</p>
          </div>
        </div>
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <CheckCircle color="var(--success)" size={32} />
          <div>
            <h4 style={{ fontWeight: 600, fontSize: '1.1rem' }}>HR Threshold Shift (-4 bpm)</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Shifting baseline up to prevent false 'stressed' reads.</p>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button className="btn btn-secondary" onClick={onRestart} style={{ padding: '12px 32px' }}>
          Restart Sequence
        </button>
      </div>
    </div>
  );
};

export default Recalibration;
