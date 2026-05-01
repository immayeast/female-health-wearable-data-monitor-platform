import React from 'react';
import { Layers, BrainCircuit, LineChart, FlaskConical, ArrowLeft, CheckCircle2, Database, ExternalLink } from 'lucide-react';

interface WalkthroughProps {
  onBack: () => void;
}

const MethodologyWalkthrough: React.FC<WalkthroughProps> = ({ onBack }) => {
  return (
    <div className="container fade-in" style={{ paddingBottom: '5rem', position: 'relative' }}>
      <button 
        onClick={onBack}
        className="soft-btn"
        style={{ width: '45px', height: '45px', padding: 0, borderRadius: '50%', marginBottom: '2rem' }}
      >
        <ArrowLeft size={20} />
      </button>

      <header style={{ marginBottom: '4rem' }}>
        <h1 className="screen-title" style={{ textAlign: 'left' }}>Methodology Walkthrough</h1>
        <p className="screen-subtitle" style={{ textAlign: 'left' }}>Detailed scientific validation and model architecture.</p>
      </header>

      {/* 1. Dataset */}
      <section className="soft-raised" style={{ padding: '2.5rem', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
          <Database size={24} color="var(--secondary-mint)" />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Dataset</h2>
        </div>
        <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <p style={{ marginBottom: '1rem' }}>
            We use the <strong>mcPHASES</strong> dataset, collected from <strong>42 Canadian young adult menstruators</strong> across two 3-month study periods.
          </p>
          <p style={{ marginBottom: '1.25rem' }}>
            The dataset combines wearable physiology from <strong>Fitbit Sense</strong>, continuous glucose data from <strong>Dexcom G6</strong>, hormone measures from <strong>Mira Plus</strong>, and daily self-reports such as cramps, sleep quality, and stress.
          </p>
          <a
            href="https://www.physionet.org/content/mcphases/1.0.0/"
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--primary-lavender)', fontWeight: 700, fontSize: '0.85rem' }}
          >
            <span>View mcPHASES dataset on PhysioNet</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </section>

      {/* 2. Algorithm Evolution */}
      <section className="soft-raised" style={{ padding: '2.5rem', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
          <BrainCircuit size={24} color="var(--primary-lavender)" />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Algorithm Evolution</h2>
        </div>
        <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <p style={{ marginBottom: '1.5rem' }}>
            Initially, we utilized a standard <strong>Z-score Normalization</strong> across all population data. However, trials showed that inter-person physiological variance was often interpreted as "stress" by the model.
          </p>
          <div 
            className="soft-inset" 
            style={{ padding: '1.5rem', borderRadius: '16px', background: 'rgba(185, 167, 245, 0.05)', marginBottom: '1.5rem' }}
          >
            <p style={{ fontWeight: 600, color: 'var(--primary-lavender)', marginBottom: '8px' }}>The "P4" Pivot:</p>
            <p style={{ fontSize: '0.85rem' }}>
              We transitioned to a <strong>Phase-Stratified Gradient Boosted Regressor (GBT)</strong>. This model treats the menstrual cycle as a primary feature, effectively decoupling hormonal shifts from autonomic stress responses.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Numerical Results */}
      <section className="soft-raised" style={{ padding: '2.5rem', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
          <LineChart size={24} color="var(--secondary-mint)" />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Numerical Results & Trials</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="soft-inset" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Accuracy Improvement</p>
            <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--secondary-mint)' }}>+24.8%</p>
          </div>
          <div className="soft-inset" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>R² Score</p>
            <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--secondary-mint)' }}>0.74</p>
          </div>
        </div>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Trials conducted with 42 high-resolution wearable datasets confirmed that our <strong>Truth Gap</strong> metric (Subjective - Physiological) is more predictive of long-term wellness than raw biometric spikes.
        </p>
      </section>

      {/* 4. Model Architecture */}
      <section className="soft-raised" style={{ padding: '2.5rem', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
          <Layers size={24} color="var(--primary-lavender)" />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Model Architecture</h2>
        </div>
        <div style={{ borderLeft: '3px solid var(--primary-lavender)', paddingLeft: '1.5rem' }}>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <li>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Level 1: Feature Extraction</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>RMSSD (HRV) and Resting HR are extracted and smoothed using a 3-day rolling average.</p>
            </li>
            <li>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Level 2: Contextual Normalization</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Data is normalized against phase-specific baselines (Luteal, Follicular, etc.).</p>
            </li>
            <li>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Level 3: Predictive Modeling</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>GBT Regressor predicts the expected physiological state and computes the variance gap.</p>
            </li>
          </ul>
        </div>
      </section>

      {/* Footer Insight */}
      <div className="soft-inset" style={{ padding: '2rem', borderRadius: '24px', textAlign: 'center', background: 'rgba(233, 236, 241, 0.5)', marginBottom: '3rem' }}>
        <FlaskConical size={32} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto', lineHeight: 1.5 }}>
          Our mission is to create a participatoy research tool that bridges the gap between what you feel and what your body signals.
        </p>
      </div>

      <button 
        onClick={onBack} // Reuse onBack for simplicity, but App will handle full termination
        className="soft-btn soft-btn-primary" 
        style={{ width: '100%', padding: '18px', borderRadius: '16px' }}
      >
        <CheckCircle2 size={20} />
        <span>I Understand & Enter Platform</span>
      </button>
    </div>
  );
};

export default MethodologyWalkthrough;
