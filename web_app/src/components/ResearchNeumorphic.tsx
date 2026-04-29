import React from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, Download, Trash2, Info, ScatterChart, BarChart3 } from 'lucide-react';

const ResearchNeumorphic: React.FC = () => {
  // Mock Data for UMAP (simulated from model)
  const umapPoints = Array.from({ length: 40 }, (_) => ({
    x: Math.random() * 200 + 20,
    y: Math.random() * 200 + 20,
    phase: ["menstrual", "follicular", "fertility", "luteal"][Math.floor(Math.random() * 4)]
  }));

  const phaseColors: any = {
    menstrual: "var(--error)",
    follicular: "var(--primary-lavender)",
    fertility: "var(--secondary-mint)",
    luteal: "var(--warm-beige)"
  };

  const gapHistory = [2, 5, 8, 4, 3, 7, 10, 8, 5, 3];

  return (
    <div className="container fade-in" style={{ paddingBottom: '100px' }}>
      <h1 className="screen-title">Research Dashboard</h1>
      <p className="screen-subtitle">Analyzing population Z-scores and Truth Gaps.</p>

      {/* Model Stats */}
      <div className="soft-raised" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
          <FlaskConical size={20} color="var(--primary-lavender)" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Active Model: GBT v3.4</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="soft-inset" style={{ padding: '1rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Stress R²</p>
            <p style={{ fontSize: '1.2rem', fontWeight: 800 }}>0.62</p>
          </div>
          <div className="soft-inset" style={{ padding: '1rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Phase Acc.</p>
            <p style={{ fontSize: '1.2rem', fontWeight: 800 }}>88.4%</p>
          </div>
        </div>
      </div>

      {/* UMAP Projection Visualization */}
      <div className="soft-raised" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ScatterChart size={18} color="var(--primary-lavender)" />
            <span style={{ fontWeight: 600 }}>UMAP Latent Space</span>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>42 Participants</span>
        </div>
        
        <div className="soft-inset" style={{ width: '100%', height: '240px', position: 'relative', borderRadius: '24px', overflow: 'hidden', padding: '20px' }}>
          <svg width="100%" height="100%" viewBox="0 0 240 240">
            {umapPoints.map((p, i) => (
              <motion.circle 
                key={i}
                cx={p.x} cy={p.y} r="4"
                fill={phaseColors[p.phase]}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 0.6, scale: 1 }}
                transition={{ delay: i * 0.02 }}
              />
            ))}
            {/* User Point */}
            <motion.circle 
              cx={120} cy={120} r="8"
              fill="var(--primary-lavender)"
              stroke="#fff"
              strokeWidth="2"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          </svg>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '1rem' }}>
          {Object.entries(phaseColors).map(([name, color]: any) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
              <span style={{ fontSize: '0.65rem', textTransform: 'capitalize' }}>{name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Truth Gap Histogram */}
      <div className="soft-raised" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
          <BarChart3 size={18} color="var(--primary-lavender)" />
          <span style={{ fontWeight: 600 }}>Truth Gap Distribution</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '120px', padding: '0 10px' }}>
          {gapHistory.map((h, i) => (
            <motion.div 
              key={i}
              className="soft-btn-primary"
              initial={{ height: 0 }}
              animate={{ height: `${h * 10}%` }}
              style={{ width: '20px', borderRadius: '4px 4px 0 0', opacity: 0.5 + (h / 20) }}
            />
          ))}
        </div>
        <div style={{ borderTop: '1px solid var(--dark-shadow)', marginTop: '8px', paddingTop: '8px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Historical variance in Z-score alignment.</p>
        </div>
      </div>

      {/* Scientific Framework Section */}
      <div className="soft-raised" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={18} color="var(--primary-lavender)" />
          Scientific Framework
        </h3>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <p style={{ marginBottom: '1rem' }}>
            Our model utilizes a <strong>Gradient Boosted Regressor</strong> to predict "expected" stress levels. The <strong>Truth Gap</strong> is the variance between your subjective log and this prediction.
          </p>
          <div style={{ padding: '1rem', borderLeft: '3px solid var(--primary-lavender)', background: 'rgba(185, 167, 245, 0.05)', borderRadius: '0 12px 12px 0' }}>
            <p style={{ fontStyle: 'italic', fontSize: '0.8rem' }}>
              "Phase-stratified Z-scores allow us to decouple between-person variance from cycle-dependent physiological shifts."
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button className="soft-btn" style={{ flex: 1, padding: '15px' }}>
          <Download size={18} />
          <span>Export Logs</span>
        </button>
        <button className="soft-btn" style={{ width: '60px', color: 'var(--error)' }}>
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};

export default ResearchNeumorphic;
