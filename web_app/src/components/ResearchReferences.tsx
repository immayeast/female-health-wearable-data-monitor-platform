import React from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, ExternalLink, HeartPulse, Thermometer } from 'lucide-react';

interface ResearchReferencesProps {
  onBack: () => void;
}

const references = [
  {
    icon: HeartPulse,
    color: 'var(--primary-lavender)',
    quote: 'HRV is higher early in the cycle and lower toward the luteal phase.',
    summary: 'Wearable HRV patterns vary systematically across the menstrual cycle. However, most stress detection models rely on static baselines and may misinterpret normal physiological variation as stress.',
    citation: 'Wearable-Derived Heart Rate Variability Across the Menstrual Cycle, Hormonal Contraceptive Use, and Reproductive Life Stages in Females: A Living Systematic Review',
    href: 'https://link.springer.com/article/10.1007/s40279-025-02388-y?utm_source=chatgpt.com',
  },
  {
    icon: Thermometer,
    color: 'var(--secondary-mint)',
    quote: 'Core body temperature changes across the ovulatory menstrual cycle, such that it is 0.3°C to 0.7°C higher in the post-ovulatory luteal phase when progesterone is high compared with the pre-ovulatory follicular phase.',
    summary: 'Body temperature follows predictable cycle-dependent shifts. Without accounting for menstrual phase, these normal changes can be incorrectly interpreted as abnormal signals.',
    citation: 'Baker, Siboza, and Fuller, Temperature regulation in women: Effects of the menstrual cycle',
    href: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7575238/',
  },
];

const ResearchReferences: React.FC<ResearchReferencesProps> = ({ onBack }) => {
  return (
    <div className="container fade-in" style={{ paddingBottom: '5rem', position: 'relative' }}>
      <button
        onClick={onBack}
        className="soft-btn"
        style={{ width: '45px', height: '45px', padding: 0, borderRadius: '50%', marginBottom: '2rem' }}
      >
        <ArrowLeft size={20} />
      </button>

      <header style={{ marginBottom: '3rem' }}>
        <h1 className="screen-title" style={{ textAlign: 'left' }}>Research References</h1>
        <p className="screen-subtitle" style={{ textAlign: 'left' }}>
          Published evidence for cycle-aware wearable interpretation.
        </p>
      </header>

      <section className="soft-raised" style={{ padding: '2.5rem', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
          <BookOpen size={24} color="var(--primary-lavender)" />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Cycle-Responsive Physiology</h2>
        </div>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '2rem' }}>
          These references support the core project assumption: wearable vital signs in females can fluctuate with menstrual physiology, so model interpretation should account for cycle phase instead of treating every deviation as stress.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {references.map((reference) => {
            const Icon = reference.icon;

            return (
              <article
                key={reference.href}
                className="soft-inset"
                style={{ padding: '1.75rem', borderRadius: '20px', background: 'rgba(233, 236, 241, 0.45)' }}
              >
                <div style={{ display: 'flex', gap: '14px', marginBottom: '1rem' }}>
                  <Icon size={22} color={reference.color} style={{ flexShrink: 0, marginTop: '4px' }} />
                  <p style={{ fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--text-primary)', fontStyle: 'italic' }}>
                    "{reference.quote}"
                  </p>
                </div>
                <p style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  {reference.summary}
                </p>
                <a
                  href={reference.href}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--primary-lavender)', fontSize: '0.78rem', fontWeight: 700, lineHeight: 1.5 }}
                >
                  <span>{reference.citation}</span>
                  <ExternalLink size={14} />
                </a>
              </article>
            );
          })}
        </div>
      </section>

      <button
        onClick={onBack}
        className="soft-btn soft-btn-primary"
        style={{ width: '100%', padding: '18px', borderRadius: '16px' }}
      >
        <CheckCircle2 size={20} />
        <span>I Understand & Enter Platform</span>
      </button>
    </div>
  );
};

export default ResearchReferences;
