import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Home as HomeIcon, Compass, PlusCircle, FlaskConical, Moon } from 'lucide-react';

import HomeNeumorphic from './components/HomeNeumorphic';
import AlignmentNeumorphic from './components/AlignmentNeumorphic';
import UploadFlow from './components/UploadFlow';
import ResearchNeumorphic from './components/ResearchNeumorphic';
import CycleStateNeumorphic from './components/CycleStateNeumorphic';
import RecalibrationNeumorphicReferenceNumericInput from './components/RecalibrationNeumorphicReferenceNumericInput';
import LoginNeumorphic from './components/LoginNeumorphic';
import AIAssistant from './components/AIAssistant';
import Logo from './components/Logo';
import ResearchAcknowledgement from './components/ResearchAcknowledgement';
import MethodologyWalkthrough from './components/MethodologyWalkthrough';
import { calculateAlignment, predictPhase, predictStressClassification, predictStressScore } from './utils/modelEngine';

export type UserData = {
  sex: 'male' | 'female' | '';
  restingHR: number;
  hrv: number;
  sleep: number;
  steps: number;
  perceivedStress: number;
  phase?: string;
};

export type AppStep = 'login' | 'home' | 'cycle' | 'alignment' | 'log' | 'analysis' | 'recalibrate' | 'trends' | 'research' | 'drivers' | 'insight' | 'ritual' | 'methodology';

const App = () => {
  const [step, setStep] = useState<AppStep>('login');
  const [isWatchPromptOpen, setIsWatchPromptOpen] = useState(false);
  const [modelResults, setModelResults] = useState<any>(null);
  const [hasAcceptedResearch, setHasAcceptedResearch] = useState(false);

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
        body: "Time to log your physiological state. Tap to open the P4 Recalibration tool.",
        icon: "/favicon.svg"
      });
    }
  };

  const handleUploadComplete = (results: any) => {
    setModelResults(results);
    setStep('alignment');
  };

  const handleRecalibrationComplete = (data: any) => {
    // Mirror UploadFlow's output shape so downstream UI updates.
    const fallbackMetadata = {
      means: { resting_hr: 67.06, rmssd: 58.78, lh: 7.82, estrogen: 108.39, pdg: 6.01 },
      stds: { resting_hr: 19.07, rmssd: 31.73, lh: 7.85, estrogen: 74.97, pdg: 7.11 },
      weights: { resting_hr: 3.44, rmssd: -1.16, lh: 2.11, estrogen: 0.44, pdg: 1.58 },
      intercept: 64.96,
      feature_names: ["resting_hr", "rmssd", "lh", "estrogen", "pdg"]
    };

    const state = {
      resting_hr: data?.rhr ?? 65,
      rmssd: data?.hrv ?? 50,
      lh: 0,
      estrogen: 0,
      pdg: 0,
      day_in_cycle: data?.cycle_day ?? 14,
      subjectiveStress: data?.subjective_stress ?? 5,
      steps: data?.steps,
      temp_diff: data?.temp_diff,
    };

    const score = predictStressScore(state, fallbackMetadata as any);
    const classification = predictStressClassification(score);
    const phase = predictPhase(state.day_in_cycle);
    const alignment = calculateAlignment(score, state.subjectiveStress);

    setModelResults({
      state,
      score,
      classification,
      phase,
      alignment,
      timestamp: new Date().toISOString(),
      source: 'recalibration',
    });
    setStep('alignment');
  };

  return (
    <div style={{ paddingBottom: '90px', position: 'relative' }}>
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
              onLogin={() => setStep('home')} 
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
            />
          )}
          {step === 'cycle' && (
            <CycleStateNeumorphic 
              day={modelResults ? (modelResults.state?.day_in_cycle ?? modelResults.state?.cycleDay ?? 14) : 14} 
              phase={modelResults ? modelResults.phase : "Fertility"} 
              hasData={!!modelResults}
            />
          )}
          {step === 'alignment' && (
            <AlignmentNeumorphic 
              value={modelResults?.alignment ?? 40} 
              label={modelResults ? modelResults.classification.group : "Slight Gap"} 
              sublabel={modelResults ? `Stress is ${modelResults.classification.level}.` : "Your perception is slightly higher than physiology."} 
              state={modelResults?.state}
              classification={modelResults?.classification}
              phase={modelResults?.phase}
              recalibratedValue={modelResults ? modelResults.score : undefined}
            />
          )}
          {step === 'log' && (
            <UploadFlow 
              onComplete={handleUploadComplete} 
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
          {step === 'methodology' && (
            <MethodologyWalkthrough onBack={() => {
              setHasAcceptedResearch(true);
              setStep('home');
            }} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Research Acknowledgement Overlay */}
      {step !== 'login' && !hasAcceptedResearch && step !== 'methodology' && (
        <ResearchAcknowledgement 
          onReadMore={() => setStep('methodology')}
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
        </nav>
      )}

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
