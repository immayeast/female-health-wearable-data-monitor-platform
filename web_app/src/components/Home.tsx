import React from 'react';
import { Activity, Beaker, BrainCircuit, HeartPulse } from 'lucide-react';

interface HomeProps {
  onNext: () => void;
}

const Home: React.FC<HomeProps> = ({ onNext }) => {
  return (
    <div className="container" style={{ margin: 'auto', paddingTop: '4rem', paddingBottom: '4rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 className="title">
          The <span className="text-gradient">Physiological Gap</span> in Female Wearables
        </h1>
        <p className="subtitle" style={{ maxWidth: '800px', margin: '0 auto' }}>
          According to PMC7141121, cardiac vagal activity (HRV) decreases significantly from the follicular to luteal phase. 
          When wearables fail to account for the mid-luteal Progesterone surge, they inevitably misclassify female health baselines, 
          leading to the "Estimation Gap".
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '4rem' }}>
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <HeartPulse size={36} color="var(--primary-accent)" />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>HRV Misclassification</h3>
          <p style={{ color: 'var(--text-muted)' }}>
            High levels of Progesterone (P4) are intrinsically associated with lower HRV. Algorithms judging female HRV against standard curves evaluate them as "stressed" when they are simply in the luteal phase.
          </p>
        </div>

        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Beaker size={36} color="var(--secondary-accent)" />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Endogenous Shift</h3>
          <p style={{ color: 'var(--text-muted)' }}>
            Within-person fluctuations in P4 directly modulate baselines. The mcPHASES project uses Gradient Boosting to recalibrate user streams based on true female physiological cycles.
          </p>
        </div>

        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <BrainCircuit size={36} color="var(--success)" />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>AI Alignment</h3>
          <p style={{ color: 'var(--text-muted)' }}>
            Are you Aligned, Over-estimating, or Under-estimating your stress? Upload your data to find out how your subjective perception maps to the clinical UMAP manifold.
          </p>
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button className="btn btn-primary" onClick={onNext} style={{ fontSize: '1.25rem', padding: '16px 48px' }}>
          Enter Pipeline <Activity size={20} />
        </button>
      </div>
    </div>
  );
};

export default Home;
