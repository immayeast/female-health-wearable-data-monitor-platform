import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Transition } from 'framer-motion';
import Home from './components/Home';
import UploadFlow from './components/UploadFlow';
import PhasePrediction from './components/PhasePrediction';
import ClassifierUmap from './components/ClassifierUmap';
import Recalibration from './components/Recalibration';
import AIAssistant from './components/AIAssistant';

export type UserData = {
  sex: 'male' | 'female' | '';
  restingHR: number;
  hrv: number;
  sleep: number;
  steps: number;
};

export type AppStep = 'home' | 'upload' | 'sorry' | 'phase' | 'umap' | 'recalibration';

function App() {
  const [step, setStep] = useState<AppStep>('home');
  const [userData, setUserData] = useState<UserData>({
    sex: '',
    restingHR: 60,
    hrv: 45,
    sleep: 7.5,
    steps: 8000
  });

  const nextStep = (s: AppStep) => setStep(s);

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 }
  };

  const pageTransition: Transition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.5
  };

  return (
    <div className="app-container" style={{ position: 'relative', width: '100vw', minHeight: '100vh', overflowX: 'hidden' }}>
      
      {/* Dynamic Background Elements */}
      <div 
        className="animate-pulse-slow" 
        style={{ position: 'fixed', top: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(129, 140, 248, 0.15) 0%, rgba(0,0,0,0) 70%)', zIndex: 0, pointerEvents: 'none' }} 
      />
      <div 
        className="animate-pulse-slow" 
        style={{ position: 'fixed', bottom: '-20%', right: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(192, 132, 252, 0.1) 0%, rgba(0,0,0,0) 70%)', zIndex: 0, pointerEvents: 'none', animationDelay: '2s' }} 
      />

      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence mode="wait">
          {step === 'home' && (
            <motion.div key="home" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ flexGrow: 1, display: 'flex' }}>
              <Home onNext={() => nextStep('upload')} />
            </motion.div>
          )}

          {step === 'upload' && (
            <motion.div key="upload" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ flexGrow: 1, display: 'flex' }}>
              <UploadFlow 
                userData={userData} 
                setUserData={setUserData} 
                onNext={() => nextStep(userData.sex === 'male' ? 'sorry' : 'phase')}
              />
            </motion.div>
          )}

          {step === 'sorry' && (
            <motion.div key="sorry" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="container" style={{ textAlign: 'center' }}>
                <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
                  <h1 className="title text-gradient">Sorry Man</h1>
                  <p className="subtitle">
                    The mcPHASES pipeline requires naturally-cycling female physiological context to calculate the Progesterone gap. 
                    Your dataset belongs in the standard master alignment models.
                  </p>
                  <button className="btn btn-secondary" onClick={() => nextStep('upload')}>Go Back</button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'phase' && (
            <motion.div key="phase" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ flexGrow: 1, display: 'flex' }}>
              <PhasePrediction userData={userData} onNext={() => nextStep('umap')} />
            </motion.div>
          )}

          {step === 'umap' && (
            <motion.div key="umap" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ flexGrow: 1, display: 'flex' }}>
              <ClassifierUmap userData={userData} onNext={() => nextStep('recalibration')} />
            </motion.div>
          )}

          {step === 'recalibration' && (
            <motion.div key="recalibration" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ flexGrow: 1, display: 'flex' }}>
              <Recalibration userData={userData} onRestart={() => nextStep('home')} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AIAssistant />
    </div>
  );
}

export default App;
