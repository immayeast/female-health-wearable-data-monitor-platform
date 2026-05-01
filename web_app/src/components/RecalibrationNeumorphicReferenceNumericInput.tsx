import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Thermometer, Heart, Calendar, Send, Info } from 'lucide-react';

interface RecalibrationProps {
  onComplete: (data: any) => void;
}

type SliderField = 'hrv' | 'rhr' | 'temp_diff' | 'cycle_day' | 'subjective_stress';

type SliderSpec = {
  label: string;
  icon: React.ReactNode;
  unit: string;
  field: SliderField;
  min: number;
  max: number;
  step: number;
  color: string;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

type TextState = Record<SliderField, string>;

type WindowPaneSliderProps = {
  spec: SliderSpec;
  rawText: string;
  setText: (updater: (prev: TextState) => TextState) => void;
  commitValue: (field: SliderField, next: number) => void;
};

/**
 * IMPORTANT: this component MUST be file-level (not declared inside the parent),
 * otherwise React treats it as a new component type on each render, which will
 * remount the subtree and cause the input to lose focus after every keystroke.
 */
const WindowPaneSlider: React.FC<WindowPaneSliderProps> = ({ spec, rawText, setText, commitValue }) => {
  const parsed =
    rawText.trim() === '' ||
    rawText === '-' ||
    rawText === '.' ||
    rawText === '-.' ||
    rawText.endsWith('.')
      ? null
      : Number(rawText);

  // While typing, do NOT clamp to spec.min/spec.max so the bar can respond immediately.
  const liveValue = Number.isFinite(parsed as number) ? (parsed as number) : null;
  const committedValue = liveValue === null ? null : clamp(liveValue, spec.min, spec.max);
  const maxValidationMessage =
    spec.field === 'cycle_day' && liveValue !== null && liveValue > spec.max
      ? `Maximum cycle day is ${spec.max}.`
      : '';

  const percentage =
    liveValue === null
      ? 0
      : spec.min > 0
        ? (Math.max(0, Math.min(liveValue, spec.max)) / spec.max) * 100
        : ((Math.max(spec.min, Math.min(liveValue, spec.max)) - spec.min) / (spec.max - spec.min)) * 100;

  return (
    <div className="soft-raised" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="soft-inset" style={{ padding: '8px', borderRadius: '12px' }}>
            {spec.icon}
          </div>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{spec.label}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            aria-label={`${spec.label} value`}
            value={rawText}
            onChange={(e) => {
              // Normalize common decimal punctuation:
              const nextTextRaw = e.target.value;
              const nextText = nextTextRaw.replace(/。/g, '.').replace(/,/g, '.');

              // Allow only digits, optional leading '-', and a single '.'
              const valid = /^-?\d*(\.\d*)?$/.test(nextText);
              if (!valid) return;

              setText((prev) => ({ ...prev, [spec.field]: nextText }));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            onBlur={() => {
              if (committedValue === null) return;
              commitValue(spec.field, committedValue);
            }}
            className="numeric-input-no-spinner"
            style={{
              width: '64px',
              padding: '6px 8px',
              borderRadius: '12px',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              outline: 'none',
              fontWeight: 700,
              color: spec.color,
              background: '#ffffff',
              textAlign: 'center',
              boxShadow: 'none',
              caretColor: '#111827',
            }}
          />
          <span style={{ fontWeight: 700, color: spec.color }}>{spec.unit}</span>
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', height: '48px' }}>
        <div
          className="soft-inset"
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '4px',
            position: 'relative',
            overflow: 'hidden',
            background: 'var(--bg-main)',
            boxShadow: 'inset 6px 6px 12px var(--dark-shadow), inset -6px -6px 12px var(--light-shadow)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${percentage}%`,
              background: spec.color,
              opacity: 1,
              transition: 'width 0.1s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          />
        </div>

        <input
          type="range"
          min={spec.min}
          max={spec.max}
          step={spec.step}
          value={committedValue ?? spec.min}
          onChange={(e) => commitValue(spec.field, parseFloat(e.target.value))}
          className="pane-slider-input"
          style={{ height: '48px' }}
        />

        <div
          style={{
            position: 'absolute',
            left: `calc(${percentage}% - 1px)`,
            top: 0,
            bottom: 0,
            width: '2px',
            background: 'rgba(255, 255, 255, 0.4)',
            pointerEvents: 'none',
            zIndex: 10,
            transition: 'left 0.1s cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        />
      </div>
      {maxValidationMessage && (
        <p style={{ marginTop: '0.75rem', color: 'var(--error)', fontSize: '0.8rem', fontWeight: 600 }}>
          {maxValidationMessage}
        </p>
      )}
    </div>
  );
};

/**
 * Reference implementation:
 * - Keeps the original slider UI.
 * - Adds a numeric input on the right (editable).
 * - Input and slider are fully synchronized.
 */
const RecalibrationNeumorphicNumericInput: React.FC<RecalibrationProps> = ({ onComplete }) => {
  const [data, setData] = useState({
    hrv: 65,
    rhr: 70,
    temp_diff: 0.2,
    steps: 8000,
    cycle_day: 14,
    subjective_stress: 5,
  });

  // Keep a separate text state so the numeric input can be temporarily empty ("")
  // without being forced to min/max.
  const [text, setText] = useState<TextState>({
    hrv: '65',
    rhr: '70',
    temp_diff: '0.2',
    cycle_day: '14',
    subjective_stress: '5',
  });

  const [isProcessing, setIsProcessing] = useState(false);

  const specs: SliderSpec[] = useMemo(
    () => [
      {
        label: 'HRV (RMSSD)',
        icon: <Heart size={18} color="#B9A7F5" />,
        unit: 'ms',
        field: 'hrv',
        min: 20,
        max: 120,
        step: 1,
        color: '#B9A7F5',
      },
      {
        label: 'Resting Heart Rate',
        icon: <Activity size={18} color="#BFD8C8" />,
        unit: 'bpm',
        field: 'rhr',
        min: 40,
        max: 100,
        step: 1,
        color: '#BFD8C8',
      },
      {
        label: 'Body Temp Diff',
        icon: <Thermometer size={18} color="#E4CFB0" />,
        unit: '°C',
        field: 'temp_diff',
        min: -1,
        max: 1,
        step: 0.1,
        // Slightly stronger beige for better contrast (still soft)
        color: '#E4CFB0',
      },
      {
        label: 'Cycle Day',
        icon: <Calendar size={18} color="#A7BED3" />,
        unit: '',
        field: 'cycle_day',
        min: 1,
        max: 28,
        step: 1,
        color: '#A7BED3',
      },
      {
        label: 'Perceived Stress (Likert)',
        icon: <Info size={18} color="#A6B0A0" />,
        unit: '/5',
        field: 'subjective_stress',
        min: 1,
        max: 5,
        step: 1,
        color: '#A6B0A0',
      },
    ],
    []
  );

  const getLikertLabel = (val: number) => {
    const labels: Record<number, string> = {
      1: "Not at all / Very Low",
      2: "Low",
      3: "Moderate",
      4: "High",
      5: "Very High"
    };
    return labels[val] || "";
  };

  const handleSubmit = () => {
    setIsProcessing(true);
    setTimeout(() => {
      onComplete(data);
      setIsProcessing(false);
    }, 800);
  };

  const commitValue = (field: SliderField, next: number) => {
    const spec = specs.find((s) => s.field === field);
    if (!spec) return;
    const v = clamp(next, spec.min, spec.max);
    setData((prev) => ({ ...prev, [field]: v }));
    setText((prev) => ({ ...prev, [field]: String(v) }));
  };

  return (
    <div className="container fade-in" style={{ paddingBottom: '120px' }}>
      <style>
        {`
          /* Remove number input spinners (Chrome/Safari/Edge) for this component */
          .numeric-input-no-spinner::-webkit-outer-spin-button,
          .numeric-input-no-spinner::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
        `}
      </style>
      <h1 className="screen-title">Personalized Recalibration</h1>
      <p className="screen-subtitle">Adjust the sharp window panes to align your physiological truth.</p>

      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.2rem', color: 'var(--text-muted)' }}>Physiological Markers</h3>
        <WindowPaneSlider spec={specs[0]} rawText={text.hrv} setText={setText} commitValue={commitValue} />
        <WindowPaneSlider spec={specs[1]} rawText={text.rhr} setText={setText} commitValue={commitValue} />
        <WindowPaneSlider spec={specs[2]} rawText={text.temp_diff} setText={setText} commitValue={commitValue} />
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.2rem', color: 'var(--text-muted)' }}>Menstrual Context</h3>
        <WindowPaneSlider spec={specs[3]} rawText={text.cycle_day} setText={setText} commitValue={commitValue} />

        <div style={{ marginTop: '2.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.2rem', color: 'var(--text-muted)' }}>Subjective Log</h3>
          <WindowPaneSlider spec={specs[4]} rawText={text.subjective_stress} setText={setText} commitValue={commitValue} />
          <p style={{ marginTop: '-1rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>
            {getLikertLabel(data.subjective_stress)}
          </p>
        </div>
      </div>

      <button
        className="soft-btn soft-btn-primary"
        onClick={handleSubmit}
        disabled={isProcessing}
        style={{
          width: '100%',
          padding: '20px',
          marginTop: '3rem',
          height: '72px',
          borderRadius: '36px',
          fontSize: '1rem',
          fontWeight: 700,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '10px 10px 20px var(--dark-shadow), -10px -10px 20px var(--light-shadow)',
        }}
      >
        {isProcessing ? (
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
            <Activity size={24} />
          </motion.div>
        ) : (
          <>
            <Send size={20} />
            <span>Verify Model Calibration</span>
          </>
        )}
      </button>

      <div className="soft-raised" style={{ marginTop: '2.5rem', padding: '1.2rem', display: 'flex', gap: '12px', alignItems: 'center', borderRadius: '24px' }}>
        <Info size={20} color="var(--primary-lavender)" />
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Applying these changes recalibrates your population Z-score distribution.
        </p>
      </div>
    </div>
  );
};

export default RecalibrationNeumorphicNumericInput;

