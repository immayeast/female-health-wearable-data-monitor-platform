"""
Reference Design Doc — Numeric Input + Slider Synchronization
=============================================================

Goal
----
Improve the Recalibration UI so each marker can be adjusted in two equivalent ways:
1) Drag the existing slider (range input).
2) Type a precise number into a numeric input field.

Constraints
-----------
- Keep the progress bar / slider visualization (the "window pane" trench).
- Default values and the visual style should remain unchanged.
- Do not modify the original component implementation.
- Implement as a new component and swap usage in the app routing.

Implementation Summary
----------------------
We create a new React component:
    web_app/src/components/RecalibrationNeumorphicNumericInput.tsx

The component:
- Keeps a single source of truth in React state (e.g. `data.hrv`, `data.rhr`, ...).
- Renders BOTH:
  - <input type="range" ... value={value} onChange={...} />
  - <input type="number" ... value={value} onChange={...} />
- Both inputs write to the same state field, so they stay synchronized.

Synchronization Logic
---------------------
For each slider field we define a specification:
    min, max, step, unit, label, icon, color

When the numeric input changes:
    - Parse the typed value.
    - Clamp it to [min, max].
    - Save it into state.

When the slider changes:
    - Parse the slider value (already within bounds).
    - Save it into state.

The progress bar position is computed from the same `value`:
    percentage = (value - min) / (max - min) * 100

So after typing "85", the bar and slider thumb immediately jump to the 85-position.

App Integration
---------------
In web_app/src/App.tsx we swap the rendered component on the "recalibrate" step:
    RecalibrationNeumorphic -> RecalibrationNeumorphicNumericInput

This preserves the existing onComplete() callback contract and downstream behavior.
"""

