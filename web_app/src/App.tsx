import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Home as HomeIcon, Compass, PlusCircle, FlaskConical, Moon, LogOut } from 'lucide-react';

import HomeNeumorphic from './components/HomeNeumorphic';
import AlignmentNeumorphic from './components/AlignmentNeumorphic';
import UploadFlow from './components/UploadFlow';
import ResearchNeumorphic from './components/ResearchNeumorphic';
import CycleStateNeumorphic from './components/CycleStateNeumorphic';
import RecalibrationNeumorphicReferenceNumericInput from './components/RecalibrationNeumorphicReferenceNumericInput';
import RitualNeumorphic from './components/RitualNeumorphic';
import LoginNeumorphic from './components/LoginNeumorphic';
import AIAssistant from './components/AIAssistant';
import Logo from './components/Logo';
import ResearchAcknowledgement from './components/ResearchAcknowledgement';
import MethodologyWalkthrough from './components/MethodologyWalkthrough';
import ResearchReferences from './components/ResearchReferences';
import ClinicalGlossary from './components/ClinicalGlossary';
import { calculateAlignment, predictPhase, predictPhaseGB, predictStressClassification, predictStressScore, predictGapGB, recalibrateStress } from './utils/modelEngine';

export type UserData = {
  sex: 'male' | 'female' | '';
  restingHR: number;
  hrv: number;
  sleep: number;
  steps: number;
  perceivedStress: number;
  phase?: string;
};

export type AppStep = 'login' | 'home' | 'cycle' | 'alignment' | 'log' | 'analysis' | 'recalibrate' | 'trends' | 'research' | 'drivers' | 'insight' | 'ritual' | 'methodology' | 'references';

const App = () => {
  const [step, setStep] = useState<AppStep>('login');
  const [isWatchPromptOpen, setIsWatchPromptOpen] = useState(false);
  const [modelResults, setModelResults] = useState<any>(null);
  const [hasAcceptedResearch, setHasAcceptedResearch] = useState(false);
  const [gbModel, setGbModel] = useState<any>(null);
  const [cycleLength, setCycleLength] = useState(28);
  const [showGlossary, setShowGlossary] = useState(false);

  useEffect(() => {
    // 1. Load GB model metadata
    fetch('/model_metadata_gb.json')
      .then(res => res.json())
      .then(data => setGbModel(data))
      .catch(() => console.warn('High-fidelity GB model not found, using fallbacks.'));

    // 2. Hydrate session from localStorage (with robust validation)
    const savedSession = localStorage.getItem('truth_gap_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed && parsed.data && typeof parsed.data === 'object' && parsed.data.score !== undefined) {
          setModelResults({ ...parsed.data, fileName: parsed.fileName || 'recovered_session.csv' });
          setStep('alignment');
        } else {
          console.warn("Invalid session data detected, clearing storage.");
          localStorage.removeItem('truth_gap_session');
        }
      } catch (e) {
        console.error("Failed to hydrate session", e);
        localStorage.removeItem('truth_gap_session');
      }
    }
  }, []);

  const navItems = [
    { id: 'home', label: 'Home', icon: HomeIcon },
    { id: 'cycle', label: 'Cycle', icon: Moon },
    { id: 'alignment', label: 'Gap', icon: Compass },
    { id: 'log', label: 'Log', icon: PlusCircle },
    { id: 'analysis', label: 'Research', icon: FlaskConical },
  ];

  const handleWatchTrigger = (type: string) => {
    console.log(`Triggering watch: ${type}`);
    setIsWatchPromptOpen(true);
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification("mcPHASES Watch Action", {
        body: "Time to log your physiological state. Tap to open the Recalibration tool.",
        icon: "/favicon.svg"
      });
    }
  };

  const handleUploadComplete = (results: any) => {
    setModelResults(results);
    setStep('alignment');
  };

  const handleRecalibrationComplete = (data: any) => {
    const fallbackMetadata = {
      means: { resting_hr: 67.06, rmssd: 58.78, lh: 7.82, estrogen: 108.39, pdg: 6.01 },
      stds: { resting_hr: 19.07, rmssd: 31.73, lh: 7.85, estrogen: 74.97, pdg: 7.11 },
      weights: { resting_hr: 8.5, rmssd: -5.0, lh: 4.0, estrogen: 1.0, pdg: 3.0 },
      intercept: 64.96,
      feature_names: ["resting_hr", "rmssd", "lh", "estrogen", "pdg"]
    };

    const cycleDay = Math.max(1, Math.min(28, data?.cycle_day ?? 14));

    const state = {
      resting_hr: data?.rhr ?? 65,
      rmssd: data?.hrv ?? 50,
      lh: data?.lh ?? 0,
      estrogen: data?.estrogen ?? 0,
      pdg: data?.pdg ?? 0,
      day_in_cycle: cycleDay,
      subjectiveStress: data?.subjective_stress ?? 5,
      steps: data?.steps,
      temperature_diff_from_baseline: data?.temp_diff ?? 0.2,
    };

    let score, phase, predictedGap = 0;
    const baseline = {
      resting_hr: 67,
      rmssd: 58,
      temperature_diff_from_baseline: 0,
      lh: 8,
      estrogen: 108,
      pdg: 6
    };

    if (gbModel) {
      predictedGap = predictGapGB(state, baseline, gbModel);
      phase = predictPhaseGB(state, baseline, gbModel);
      const rawWearableGuess = 65; 
      score = recalibrateStress(rawWearableGuess, predictedGap);
    } else {
      score = predictStressScore(state, fallbackMetadata as any);
      phase = predictPhase(state.day_in_cycle);
    }

    const classification = predictStressClassification(score);
    const alignment = calculateAlignment(score, state.subjectiveStress);

    setModelResults({
      state,
      score,
      predictedGap,
      classification,
      phase,
      alignment,
      timestamp: new Date().toISOString(),
      source: 'recalibration',
    });
    setStep('alignment');
  };

  const [selectedTerm, setSelectedTerm] = useState<any>(undefined);

  const handleShowGlossary = (term?: any) => {
    setSelectedTerm(term);
    setShowGlossary(true);
  };

  return (
    <div style={{ paddingBottom: '90px', position: 'relative' }}>
      <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 1000, display: 'flex', gap: '10px' }}>
        {step !== 'login' && (
          <button 
            onClick={() => {
              setHasAcceptedResearch(false);
              setStep('login');
              setModelResults(null);
              localStorage.removeItem('truth_gap_session');
            }}
            className="soft-raised"
            title="Log Out"
            style={{ 
              width: '44px',
              height: '44px',
              borderRadius: '50%', 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
              background: 'var(--bg-color)',
              color: 'var(--text-secondary)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
              <LogOut size={18} strokeWidth={2.5} />
            </div>
          </button>
        )}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          {step === 'login' && (
            <LoginNeumorphic 
              onLogin={(email, consent) => {
                console.log(`Research login for ${email} (Consent: ${consent})`);
                setHasAcceptedResearch(consent);
                setStep('home');
              }} 
            />
          )}
          {step === 'home' && (
            <HomeNeumorphic 
              onAction={(s) => setStep(s as AppStep)} 
              onWatchTrigger={handleWatchTrigger} 
              onLogout={() => {
                setHasAcceptedResearch(false);
                setStep('login');
              }} 
              status={modelResults ? modelResults.classification.group : "Elevated"} 
              cycleLength={cycleLength}
              onCycleLengthChange={setCycleLength}
            />
          )}
          {step === 'cycle' && (
            <CycleStateNeumorphic 
              day={modelResults ? (modelResults.state?.day_in_cycle ?? modelResults.state?.cycleDay ?? 14) : 14} 
              phase={modelResults ? modelResults.phase : "Fertility"} 
              hasData={!!modelResults}
              cycleLength={cycleLength}
            />
          )}
          {step === 'alignment' && (
            <AlignmentNeumorphic 
              value={modelResults?.alignment ?? 40} 
              label={modelResults ? modelResults.classification.group : "Slight Gap"} 
              sublabel={modelResults ? `Stress is ${modelResults.classification.level}.` : "Your perception is slightly higher than physiology."} 
              classification={modelResults?.classification}
              phase={modelResults?.phase}
              recalibratedValue={modelResults ? modelResults.score : undefined}
              predictedGap={modelResults?.predictedGap}
              onShowGlossary={handleShowGlossary}
            />
          )}
          {step === 'log' && (
            <UploadFlow 
              onComplete={handleUploadComplete} 
              activeFile={modelResults?.fileName}
              onClear={() => setModelResults(null)}
            />
          )}
          {step === 'analysis' && (
            <ResearchNeumorphic />
          )}
          {step === 'recalibrate' && (
            <RecalibrationNeumorphicReferenceNumericInput 
              onComplete={handleRecalibrationComplete} 
            />
          )}
          {step === 'ritual' && (
            <RitualNeumorphic 
              onComplete={() => {
                setModelResults((prev: any) => ({
                  ...prev,
                  classification: { ...prev?.classification, group: "Baseline" }
                }));
                setStep('home');
              }}
              onBack={() => setStep('home')}
            />
          )}
          {step === 'methodology' && (
            <MethodologyWalkthrough onBack={() => {
              setHasAcceptedResearch(false);
              setStep('home');
            }} />
          )}
          {step === 'references' && (
            <ResearchReferences onBack={() => {
              setHasAcceptedResearch(false);
              setStep('home');
            }} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Research Acknowledgement Overlay */}
      {step !== 'login' && !hasAcceptedResearch && step !== 'methodology' && step !== 'references' && (
        <ResearchAcknowledgement 
          onReadMore={() => setStep('methodology')}
          onReadReferences={() => setStep('references')}
          onUnderstood={() => setHasAcceptedResearch(true)}
        />
      )}

      {/* Recalibrate Shortcut on Home */}
      {step === 'home' && (
        <div style={{ position: 'fixed', bottom: '110px', left: '2rem', zIndex: 100 }}>
          <button 
            onClick={() => setStep('recalibrate')}
            className="soft-btn"
            style={{ padding: '12px 20px', fontSize: '0.8rem' }}
          >
            <FlaskConical size={16} />
            <span>Recalibrate Model</span>
          </button>
        </div>
      )}

      {/* Global AI Assistant */}
      <AIAssistant />

      {/* Navigation */}
      {step !== 'login' && (
        <nav className="bottom-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setStep(item.id as AppStep)}
              className={`nav-item ${step === item.id ? 'active' : ''}`}
            >
              <item.icon size={22} />
              <span>{item.label}</span>
            </button>
          ))}
          <button className="nav-item" onClick={() => setShowGlossary(true)}>
            <Compass size={22} />
            <span>Info</span>
          </button>
        </nav>
      )}

      <ClinicalGlossary 
        isOpen={showGlossary} 
        onClose={() => setShowGlossary(false)} 
        term={selectedTerm}
      />

      {/* Watch Simulation Modal */}
      <AnimatePresence>
        {isWatchPromptOpen && (
          <div 
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.1)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
            onClick={() => setIsWatchPromptOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="soft-raised"
              style={{ padding: '2rem', maxWidth: '400px', textAlign: 'center' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="soft-inset soft-circle" style={{ width: '80px', height: '80px', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <Logo size={54} />
              </div>
              <h2 style={{ marginBottom: '1rem' }}>Watch Trigger Sent</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                A notification has been pushed to your Apple Watch. Please check your wrist to provide your immediate interoceptive log.
              </p>
              <button 
                className="soft-btn soft-btn-primary" 
                style={{ width: '100%' }}
                onClick={() => {
                  setIsWatchPromptOpen(false);
                  setStep('recalibrate');
                }}
              >
                Open Recalibration on Web
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
