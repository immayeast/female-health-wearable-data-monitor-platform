import React from 'react';
import { Moon, Info } from 'lucide-react';

interface CycleProps {
  phase: string;
  day: number;
  hasData?: boolean;
}

const CycleStateNeumorphic: React.FC<CycleProps> = ({ phase = "Luteal", day = 22, hasData = true }) => {
  return (
    <div className="container fade-in" style={{ justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 className="screen-title">Cycle State</h1>
        <p className="screen-subtitle">Inferred physiological phase.</p>
      </div>

      {!hasData ? (
        <div style={{ width: '100%', maxWidth: '360px', margin: '0 auto', marginTop: '8vh' }}>
          <div className="soft-raised" style={{ padding: '1.75rem', textAlign: 'center', borderRadius: '28px' }}>
            <p style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              Waiting for your data
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              Upload a CSV or run recalibration to infer your cycle phase.
            </p>
          </div>
        </div>
      ) : (
        <div className="soft-raised soft-circle" style={{ width: '280px', height: '280px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="soft-inset soft-circle" style={{ width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <Moon size={48} color="var(--primary-lavender)" fill="var(--primary-lavender)" opacity={0.6} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{phase}</h2>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>Day {day} of 28</span>
        </div>
      )}

      {hasData && (
        <div style={{ marginTop: '4rem', maxWidth: '300px', margin: '4rem auto 0' }}>
          <div className="soft-raised" style={{ padding: '1.5rem', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <Info size={18} color="var(--text-muted)" style={{ marginTop: '2px' }} />
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              In this phase, your body signal baseline is typically shifted. The model accounts for this in the stress prediction.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CycleStateNeumorphic;
