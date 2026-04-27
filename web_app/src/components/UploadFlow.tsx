import React from 'react';
import { UploadCloud, ChevronRight, Activity, Moon, Footprints, Heart, User } from 'lucide-react';
import type { UserData } from '../App';

interface UploadFlowProps {
  userData: UserData;
  setUserData: React.Dispatch<React.SetStateAction<UserData>>;
  onNext: () => void;
}

const UploadFlow: React.FC<UploadFlowProps> = ({ userData, setUserData, onNext }) => {
  const handleChange = (field: keyof UserData, value: string | number) => {
    setUserData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = userData.sex !== '' && userData.restingHR > 0 && userData.hrv > 0 && userData.sleep > 0 && userData.steps > 0;

  return (
    <div className="container" style={{ margin: 'auto', maxWidth: '800px' }}>
      <div className="glass-panel">
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <UploadCloud size={48} color="var(--primary-accent)" style={{ marginBottom: '1rem' }} />
          <h2 className="title" style={{ fontSize: '2.5rem' }}>Pipeline Ingestion</h2>
          <p className="subtitle">Upload your wearable physiological signatures to reconstruct your state alignment.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '3rem' }}>
          {/* Sex Select */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              <User size={18} /> Biological Sex
            </label>
            <select 
              value={userData.sex} 
              onChange={e => handleChange('sex', e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="" disabled>Select Sex</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Resting HR */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                <Activity size={18} /> Resting Heart Rate (bpm)
              </label>
              <input 
                type="number" 
                value={userData.restingHR} 
                onChange={e => handleChange('restingHR', Number(e.target.value))}
              />
            </div>

            {/* HRV */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                <Heart size={18} /> HRV (SDNN/RMSSD) ms
              </label>
              <input 
                type="number" 
                value={userData.hrv} 
                onChange={e => handleChange('hrv', Number(e.target.value))}
              />
            </div>

            {/* Sleep */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                <Moon size={18} /> Sleep Duration (hrs)
              </label>
              <input 
                type="number" 
                step="0.1"
                value={userData.sleep} 
                onChange={e => handleChange('sleep', Number(e.target.value))}
              />
            </div>

            {/* Steps */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                <Footprints size={18} /> Daily Steps
              </label>
              <input 
                type="number" 
                value={userData.steps} 
                onChange={e => handleChange('steps', Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            className="btn btn-primary" 
            onClick={onNext} 
            disabled={!isFormValid}
            style={{ opacity: isFormValid ? 1 : 0.5, cursor: isFormValid ? 'pointer' : 'not-allowed' }}
          >
            Compute Mapping <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadFlow;
