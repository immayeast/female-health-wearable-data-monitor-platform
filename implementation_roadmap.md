# Implementation Roadmap: mcPHASES Phase 2

This document records the pending architectural and feature changes requested for the next phase of development. **Note: These changes are pending backend stabilization and are not yet implemented.**

## 1. Landing Page (Home.tsx) Refactor
*   **Goal**: Simplify the landing experience to focus on the scientific foundation and user entry.
*   **Requirements**:
    *   **Introduction**: Clear value proposition of mcPHASES.
    *   **Research Paper Integration**: Direct reference/link to the PMC7141121 documentation.
    *   **Entrance**: Clear CTA (Call to Action) to start the assessment pipeline.

## 2. Dynamic Input & Model Fidelity (InfoInput.tsx)
*   **Goal**: Replace mock logic with high-fidelity physiological modeling.
*   **Requirements**:
    *   **Truthful Implementation**: Ensure the relationship between HRV, Heart Rate, and Menstrual Phase matches the GB (Gradient Boosting) model logic described in the research.
    *   **Zero Hard-Coding**: All metrics (HRV offsets, Phase classification) should be derived from the user's input vectors rather than static mock datasets.

## 3. Advanced Agentic AI Workflow (AIAssistant.tsx)
*   **Goal**: Transition from a basic chat interface to a data-aware assistant.
*   **Requirements**:
    *   **Agent Introduction**: Clarify the agent's role in the diagnostic process.
    *   **Dynamic Response System**: Agent answers should reflect the specific classification results.
    *   **Agent Choice**: Allow the user to decide between different "Agent Personas" or analytical paths.
    *   **CSV Integration**: Enable the agent to trigger or accept CSV file uploads for raw data analysis (HRV streams).

---
*Created on 2026-04-27*
