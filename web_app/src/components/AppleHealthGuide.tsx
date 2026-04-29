import React from 'react';
import { motion } from 'framer-motion';
import { Apple, Download, Share2, FileText, X } from 'lucide-react';

interface GuideProps {
  onClose: () => void;
}

const AppleHealthGuide: React.FC<GuideProps> = ({ onClose }) => {
  const steps = [
    {
      icon: <Apple size={20} />,
      text: "Open the Health app on your iPhone."
    },
    {
      icon: <Download size={20} />,
      text: "Tap your profile icon (top right) and select 'Export All Health Data'."
    },
    {
      icon: <Share2 size={20} />,
      text: "Once the export is ready, share the ZIP file to your computer or iCloud."
    },
    {
      icon: <FileText size={20} />,
      text: "Upload the 'export.xml' or converted CSV to mcPHASES Research page."
    }
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(244, 245, 247, 0.9)', backdropFilter: 'blur(10px)'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="soft-raised"
        style={{ width: '90%', maxWidth: '500px', padding: '2.5rem', position: 'relative' }}
      >
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={24} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <Apple size={48} color="#000" style={{ marginBottom: '1rem' }} />
          <h2 className="screen-title">Apple Health Export</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Sync your high-resolution vitals.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {steps.map((step, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div className="soft-raised" style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {step.icon}
              </div>
              <div style={{ flex: 1, paddingTop: '8px' }}>
                <p style={{ fontSize: '0.95rem', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                  <span style={{ fontWeight: 700, color: 'var(--primary-lavender)', marginRight: '8px' }}>Step {idx + 1}:</span>
                  {step.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={onClose}
          className="soft-btn soft-btn-primary" 
          style={{ width: '100%', marginTop: '3rem', padding: '18px' }}
        >
          Got it
        </button>
      </motion.div>
    </div>
  );
};

export default AppleHealthGuide;
