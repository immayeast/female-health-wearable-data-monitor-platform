import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, Compass, PlusCircle, TrendingUp, FlaskConical } from 'lucide-react';
import HomeNeumorphic from './components/HomeNeumorphic';
import AlignmentNeumorphic from './components/AlignmentNeumorphic';
import LogMomentNeumorphic from './components/LogMomentNeumorphic';
import TrendsNeumorphic from './components/TrendsNeumorphic';
import ResearchNeumorphic from './components/ResearchNeumorphic';
import LoadingScreen from './components/LoadingScreen';
import LoginNeumorphic from './components/LoginNeumorphic';
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

export type AppStep = 'home' | 'alignment' | 'log' | 'trends' | 'research';

function App() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);
  const [step, setStep] = useState<AppStep>('home');
  const [trajectoryData, setTrajectoryData] = useState<any>(null);
  const [userData, setUserData] = useState<UserData>({
    sex: 'female',
    restingHR: 60,
    hrv: 45,
    sleep: 7.5,
    steps: 8000,
    perceivedStress: 5
  });

  useEffect(() => {
    // Check local storage for session/consent
    const savedAuth = localStorage.getItem('mcphases_auth');
    const savedConsent = localStorage.getItem('mcphases_consent');
    if (savedAuth === 'true' && savedConsent === 'true') {
      setIsAuthenticated(true);
      setHasConsented(true);
    }

    fetch('/user_trajectory.json')
      .then(res => {
        if (!res.ok) return null;
        return res.json();
      })
      .then(json => {
        if (json && json.user_trajectory && json.user_trajectory.length > 0) {
          setTrajectoryData(json);
          const latest = json.user_trajectory[json.user_trajectory.length - 1];
          setUserData(prev => ({
            ...prev,
            hrv: latest.rmssd || prev.hrv,
            perceivedStress: Math.round(latest.stress),
            phase: latest.phase
          }));
        }
      })
      .catch(err => console.error("Trajectory load error:", err))
      .finally(() => {
        setTimeout(() => setLoading(false), 1200);
      });
  }, []);

  const handleLogin = (email: string, consented: boolean) => {
    console.log("Logged in as:", email);
    setIsAuthenticated(true);
    setHasConsented(consented);
    localStorage.setItem('mcphases_auth', 'true');
    localStorage.setItem('mcphases_consent', 'true');
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'alignment', label: 'Alignment', icon: Compass },
    { id: 'log', label: 'Log', icon: PlusCircle },
    { id: 'trends', label: 'Trends', icon: TrendingUp },
    { id: 'research', label: 'Research', icon: FlaskConical },
  ];

  return (
    <div className="app-container">
      <AnimatePresence>
        {loading && <LoadingScreen />}
      </AnimatePresence>

      <AnimatePresence>
        {(!isAuthenticated || !hasConsented) && !loading && (
          <motion.div 
            key="login" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'var(--bg-main)' }}
          >
            <LoginNeumorphic onLogin={handleLogin} />
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ paddingBottom: '100px' }}> {/* Container for pages */}
        <AnimatePresence mode="wait">
          {step === 'home' && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <HomeNeumorphic 
                status={userData.perceivedStress > 3 ? "Elevated" : "Balanced"}
                onAction={(target) => setStep(target as AppStep)} 
              />
            </motion.div>
          )}

          {step === 'alignment' && (
            <motion.div key="alignment" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AlignmentNeumorphic 
                value={Math.round((1 - Math.abs(userData.perceivedStress - 2)/5) * 100)} 
                label={userData.perceivedStress > 3 ? "Slight Gap" : "Mostly Aligned"}
                sublabel={userData.perceivedStress > 3 ? "Your perception is slightly higher than physiology." : "Your signals are within the expected range."}
              />
            </motion.div>
          )}

          {step === 'log' && (
            <motion.div key="log" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LogMomentNeumorphic onSave={(s, n) => {
                console.log("Saving log:", s, n);
                setStep('home');
              }} />
            </motion.div>
          )}

          {step === 'trends' && (
            <motion.div key="trends" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <TrendsNeumorphic data={trajectoryData?.user_trajectory || []} />
            </motion.div>
          )}

          {step === 'research' && (
            <motion.div key="research" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ResearchNeumorphic 
                trajectory={trajectoryData?.user_trajectory || []} 
                population={trajectoryData?.population_background || []} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        {navItems.map(item => (
          <button 
            key={item.id} 
            className={`nav-item ${step === item.id ? 'active' : ''}`}
            onClick={() => setStep(item.id as AppStep)}
          >
            <item.icon size={24} strokeWidth={step === item.id ? 2.5 : 2} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <AIAssistant />
    </div>
  );
}

export default App;
