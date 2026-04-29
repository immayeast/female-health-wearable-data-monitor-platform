import React, { useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Info, FlaskConical, Database, GitMerge, Apple, ChevronRight } from 'lucide-react';
import AppleHealthGuide from './AppleHealthGuide';

interface ResearchProps {
  trajectory: any[];
  population: any[];
}

const ResearchNeumorphic: React.FC<ResearchProps> = ({ trajectory, population }) => {
  const [showGuide, setShowGuide] = useState(false);
  return (
    <div className="container fade-in" style={{ maxWidth: '1000px' }}>
      <h1 className="screen-title">Research & Analysis</h1>
      <p className="screen-subtitle">Model diagnostics and population mapping.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        {/* Manifold Mapping */}
        <div className="soft-raised" style={{ gridColumn: 'span 2', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FlaskConical size={18} color="var(--primary-lavender)" /> Manifold Projection (UMAP)
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Latent Space Mapping</span>
          </div>
          
          <div style={{ height: '400px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <XAxis type="number" dataKey="x" hide domain={['auto', 'auto']} />
                <YAxis type="number" dataKey="y" hide domain={['auto', 'auto']} />
                <ZAxis type="number" range={[50, 400]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="Population" data={population} fill="var(--text-muted)" opacity={0.15} />
                <Scatter name="User" data={trajectory} fill="var(--primary-lavender)" line={{ stroke: 'var(--primary-lavender)', strokeWidth: 2 }} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Apple Health Sync Card */}
        <div className="soft-raised" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
            <Apple size={28} color="#000" />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Apple Health Sync</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Export your high-resolution vitals directly from your Watch for deep analysis.
          </p>
          <button 
            onClick={() => setShowGuide(true)}
            className="soft-btn" 
            style={{ width: '100%', padding: '12px', fontSize: '0.85rem', background: 'var(--card-surface)' }}
          >
            <span>View Export Guide</span>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Diagnostic Cards */}
        <div className="soft-raised" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={16} color="var(--secondary-mint)" /> Model Stats
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Stress R²</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>0.60</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Phase Acc.</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>87.9%</span>
            </div>
          </div>
        </div>

        <div className="soft-raised" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GitMerge size={16} color="var(--warm-beige)" /> Alignment Bin
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            You are currently classified in the <strong>Balanced</strong> regime. Your interoceptive signals align with the Gradient Boosted baseline.
          </p>
        </div>

        <div className="soft-raised" style={{ gridColumn: 'span 2', padding: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <Info size={18} color="var(--text-muted)" style={{ marginTop: '2px' }} />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              This research layer exposes the analytical framework behind the wellness experience. 
              The Manifold Projection uses UMAP dimensionality reduction to show your current physiological 
              coordinates relative to the mcPHASES population study.
            </p>
          </div>
        </div>

      </div>

      {showGuide && <AppleHealthGuide onClose={() => setShowGuide(false)} />}
    </div>
  );
};

export default ResearchNeumorphic;
