import React, { useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Info, FlaskConical, Database, GitMerge, Apple, ChevronRight, Download, Trash2 } from 'lucide-react';
import AppleHealthGuide from './AppleHealthGuide';

interface ResearchProps {
  trajectory: any[];
  population: any[];
}

const ResearchNeumorphic: React.FC<ResearchProps> = ({ trajectory, population }) => {
  const [showGuide, setShowGuide] = useState(false);

  const handleDownload = () => {
    const events = localStorage.getItem('mcphases_events');
    if (!events) return alert("No events to download.");
    
    const blob = new Blob([events], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcphases_research_logs_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (window.confirm("Are you sure you want to delete all captured events? This cannot be undone.")) {
      localStorage.removeItem('mcphases_events');
      window.location.reload();
    }
  };
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

        {/* Data Management Card */}
        <div className="soft-raised" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
            <Database size={28} color="var(--primary-lavender)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Research Data</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Export your captured stress events and vitals for offline analysis.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={handleDownload}
              className="soft-btn" 
              style={{ flex: 1, padding: '12px', fontSize: '0.8rem', background: 'var(--card-surface)' }}
            >
              <Download size={16} />
              <span>Export JSON</span>
            </button>
            <button 
              onClick={handleClear}
              className="soft-btn" 
              style={{ padding: '12px', background: 'var(--card-surface)' }}
            >
              <Trash2 size={16} color="var(--error)" />
            </button>
          </div>
        </div>

        {/* Scientific Context Section */}
        <div className="soft-raised" style={{ gridColumn: 'span 2', padding: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Info size={20} color="var(--primary-lavender)" /> Scientific Framework
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>Manifold Mapping</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                The projection above uses UMAP dimensionality reduction to map your 24-hour physiological state into a population-wide "latent space." 
                The lavender dots represent your trajectory through the menstrual cycle.
              </p>
            </div>
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>Recalibration Logic</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Our model utilizes a Gradient Boosted Regressor to predict "expected" stress levels. The <strong>Truth Gap</strong> is the variance between this baseline and your subjective report.
              </p>
            </div>
          </div>
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--dark-shadow)', opacity: 0.7 }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Reference: "Wearable Physiological Signals for Menstrual Phase Prediction and Stress Alignment" (2024 Research Draft)
            </p>
          </div>
        </div>

      </div>

      {showGuide && <AppleHealthGuide onClose={() => setShowGuide(false)} />}
    </div>
  );
};

export default ResearchNeumorphic;
