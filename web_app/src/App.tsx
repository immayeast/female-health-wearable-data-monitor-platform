import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Home as HomeIcon, Compass, PlusCircle, FlaskConical, Moon, Activity } from 'lucide-react';

import HomeNeumorphic from './components/HomeNeumorphic';
import AlignmentNeumorphic from './components/AlignmentNeumorphic';
import UploadFlow from './components/UploadFlow';
import ResearchNeumorphic from './components/ResearchNeumorphic';
import CycleStateNeumorphic from './components/CycleStateNeumorphic';
import RecalibrationNeumorphic from './components/RecalibrationNeumorphic';
import AIAssistant from './components/AIAssistant';

export type UserData = {
  sex: 'male' | 'female' | '';
  restingHR: number;
  hrv: number;
  sleep: number;
  steps: number;
  perceivedStress: number;
  phase?: string;
};

export type AppStep = 'home' | 'cycle' | 'alignment' | 'log' | 'analysis' | 'recalibrate' | 'trends' | 'research' | 'drivers' | 'insight' | 'ritual';

const App = () => {
  const [step, setStep] = useState<AppStep>('home');
  const [isWatchPromptOpen, setIsWatchPromptOpen] = useState(false);
  const [modelResults, setModelResults] = useState<any>(null);

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
        icon: "/vite.svg"
      });
    }
  };

  const handleUploadComplete = (results: any) => {
    setModelResults(results);
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
          {step === 'home' && (
            <HomeNeumorphic 
              onAction={(s) => setStep(s as AppStep)} 
              onWatchTrigger={handleWatchTrigger} 
              onLogout={() => console.log('logout')}
              status={modelResults ? modelResults.classification.group : "Elevated"} 
            />
          )}
          {step === 'cycle' && (
            <CycleStateNeumorphic 
              day={modelResults ? modelResults.state.cycleDay : 14} 
              phase={modelResults ? modelResults.phase : "Fertility"} 
            />
          )}
          {step === 'alignment' && (
            <AlignmentNeumorphic 
              value={40} 
              label={modelResults ? modelResults.classification.group : "Slight Gap"} 
              sublabel={modelResults ? `Stress is ${modelResults.classification.level}.` : "Your perception is slightly higher than physiology."} 
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
            <RecalibrationNeumorphic 
              onComplete={() => setStep('alignment')} 
            />
          )}
        </motion.div>
      </AnimatePresence>

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
              <div className="soft-inset soft-circle" style={{ width: '80px', height: '80px', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={40} color="var(--primary-lavender)" />
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
