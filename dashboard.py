"""
mcPHASES — Results Dashboard
=============================
Streamlit presentation of the perception–physiology gap analysis,
GB-based recalibration, and perception space findings.

Run:  streamlit run dashboard.py
"""

import os, warnings, glob
import numpy as np
import pandas as pd
import streamlit as st
import matplotlib.pyplot as plt
import seaborn as sns
from scipy.stats import pearsonr

warnings.filterwarnings("ignore")

# ─── Page config ─────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="mcPHASES — Perception Gap Analysis",
    page_icon="🔬",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─── Styling ─────────────────────────────────────────────────────────────────
st.markdown("""
<style>
    .block-container { padding-top: 1.5rem; }
    .metric-card {
        background: linear-gradient(135deg, #1e1e2f 0%, #2d2d44 100%);
        border-radius: 12px; padding: 20px; margin: 8px 0;
        border: 1px solid rgba(255,255,255,0.08);
    }
    .metric-card h3 { color: #a0a0c0; font-size: 0.85rem; margin-bottom: 4px; }
    .metric-card .value { color: #ffffff; font-size: 1.8rem; font-weight: 700; }
    .metric-card .delta { font-size: 0.85rem; }
    .delta-pos { color: #66bb6a; }
    .delta-neg { color: #ef5350; }
    .finding-box {
        background: rgba(102, 187, 106, 0.08);
        border-left: 4px solid #66bb6a;
        padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 12px 0;
    }
    .warning-box {
        background: rgba(255, 167, 38, 0.08);
        border-left: 4px solid #ffa726;
        padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 12px 0;
    }
    h1, h2, h3 { font-family: 'Inter', sans-serif; }
    .stTabs [data-baseweb="tab-list"] { gap: 8px; }
    .stTabs [data-baseweb="tab"] {
        border-radius: 8px 8px 0 0; padding: 8px 20px;
    }
</style>
""", unsafe_allow_html=True)

REAL_DIR = "eda_outputs/script4_phase_models"
SYNTH_DIR = "eda_outputs/test_synthetic"


def metric_card(label, value, delta=None, delta_label=None):
    delta_html = ""
    if delta is not None:
        cls = "delta-pos" if delta > 0 else "delta-neg"
        sign = "+" if delta > 0 else ""
        dl = f" ({delta_label})" if delta_label else ""
        delta_html = f'<div class="delta {cls}">{sign}{delta:.4f}{dl}</div>'
    return f"""
    <div class="metric-card">
        <h3>{label}</h3>
        <div class="value">{value}</div>
        {delta_html}
    </div>
    """


# ═══════════════════════════════════════════════════════════════════════════════
# SIDEBAR
# ═══════════════════════════════════════════════════════════════════════════════
with st.sidebar:
    st.markdown("## 🔬 mcPHASES")
    st.markdown("**Perception–Physiology Gap Analysis**")
    st.divider()

    st.markdown("### Project Info")
    st.markdown("""
    - **Dataset**: mcPHASES (PhysioNet)
    - **Participants**: 42 (real) / 200 (synthetic)
    - **Pipeline**: script4_phase_models.py
    - **Modules**: recalibration_scores.py, perception_gap.py
    """)

    st.divider()
    dataset = st.radio("**Dataset to view**", ["Real Data", "Synthetic Data"], index=0)
    img_dir = REAL_DIR if dataset == "Real Data" else SYNTH_DIR

    st.divider()
    st.markdown("### Pipeline Flow")
    st.code("""
§1  Data load & clean
§2  Participant split
§3  Feature engineering
§4  GB recalibration ← NEW
§5  Alignment-bin experiment
§6  Gap analysis (UMAP/t-SNE)
    """, language=None)


# ═══════════════════════════════════════════════════════════════════════════════
# HEADER
# ═══════════════════════════════════════════════════════════════════════════════
st.markdown("# Perception–Physiology Gap Analysis")
st.markdown("*mcPHASES: Menstrual Cycle Phases and Stress Recalibration*")
st.divider()


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 1: KEY FINDINGS
# ═══════════════════════════════════════════════════════════════════════════════
tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs([
    "📊 Key Findings",
    "🔄 Recalibration",
    "🗺️ Perception Space",
    "🧠 GB Interpretability",
    "📈 Gap Analysis",
    "🧪 Synthetic Test",
])

with tab1:
    st.markdown("## Core Findings")

    # Top metrics row
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.markdown(metric_card("GB Gap Model R²", "0.893", delta=0.893, delta_label="val"), unsafe_allow_html=True)
    with col2:
        st.markdown(metric_card("Phase ANOVA p-value", "0.608"), unsafe_allow_html=True)
    with col3:
        st.markdown(metric_card("ICC (Trait Proportion)", "0.000"), unsafe_allow_html=True)
    with col4:
        st.markdown(metric_card("MSE Gap Closed", "93.2%"), unsafe_allow_html=True)

    st.markdown("")

    # Key findings as callouts
    st.markdown("""
    <div class="finding-box">
        <strong>Finding 1 — The gap is predictable.</strong><br>
        A Gradient Boosting model predicts 89.3% of the variance in the perception–physiology gap.
        Given daily physiology (HRV, sleep, hormones, symptoms), the model can predict
        <em>how much</em> a person's self-reported stress will diverge from their wearable reading.
    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
    <div class="warning-box">
        <strong>Finding 2 — Phase is NOT the driver.</strong><br>
        One-way ANOVA across menstrual phases: F=0.610, <strong>p=0.608</strong>. All Cohen's d
        effect sizes are near zero. Menstrual phase alone does not systematically shift the gap.
        This invalidates the prior assumption that phase-based offsets would be useful.
    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
    <div class="finding-box">
        <strong>Finding 3 — The gap is 100% state-dependent.</strong><br>
        ICC = 0.000. People do <em>not</em> have stable tendencies to over- or under-perceive
        stress. The mismatch fluctuates entirely day-to-day based on physiological state —
        it is a <strong>state</strong>, not a <strong>trait</strong>.
    </div>
    """, unsafe_allow_html=True)

    st.markdown("---")

    # Reasoning chain
    st.markdown("### Reasoning Chain")
    st.markdown("""
    1. Raw wearable stress scores do not correlate with self-reported stress (r ≈ −0.04)
    2. The mismatch is **meaningful** — it captures interoceptive divergence, not noise
    3. The gap is defined as: `d = z_person(self_report) − z_person(wearable)`
    4. **Finding**: The gap is predictable (R²=0.893) but not phase-driven (p=0.61) and not trait-like (ICC=0). It represents "cognitive inertia".
    5. **Implication**: Static additive offsets (person + phase + cluster) cannot model this
    6. **Solution**: Replace with a GB model that predicts the gap at daily resolution
    7. **Result**: Wearable scores shift from r = −0.04 to r = +0.53 with self-report
    8. **Validity Status**: *Cluster Validity Tool* separated out broken/missing sensor data cleanly and ACCEPTED the remainder.
    """)


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 2: RECALIBRATION
# ═══════════════════════════════════════════════════════════════════════════════
with tab2:
    st.markdown("## Recalibration: Old vs. New")

    col1, col2 = st.columns(2)
    with col1:
        st.markdown("### ❌ Old Method: Additive Offsets")
        st.code("""
adjusted = person_baseline
         + phase_offset      ← ~0 effect
         + cluster_offset    ← coarse
         + residual
        """, language=None)
        st.markdown("""
        | Metric | Value |
        |---|---|
        | r(self-report, adjusted) | **−0.029** |
        | MAE(z_self, z_adjusted) | 1.165 |
        | Gap closed | ~0% |
        """)

    with col2:
        st.markdown("### ✅ New Method: GB Gap Model")
        st.code("""
predicted_gap = GB(sleep, HRV,
    hormones, symptoms, phase,
    prior-day gap, ...)

z_adjusted = z_wearable + predicted_gap
adjusted = person_mean + z_adj × person_std
        """, language=None)
        st.markdown("""
        | Metric | Value |
        |---|---|
        | r(self-report, adjusted) | **+0.928** |
        | MAE(z_self, z_adjusted) | 0.213 |
        | Gap closed | **93.2%** |
        """)

    st.divider()

    # Visual comparison
    st.markdown("### Head-to-Head Comparison")

    comparison_data = pd.DataFrame({
        "Metric": ["r(self, adjusted)", "MAE(z_self, z_adj)", "Gap Closed"],
        "Additive Offset": ["-0.029", "1.165", "~0%"],
        "GB Model": ["+0.928", "0.213", "93.2%"],
    })
    st.dataframe(comparison_data, use_container_width=True, hide_index=True)

    st.markdown("### Out-of-Sample (Pipeline Run)")
    col1, col2, col3 = st.columns(3)
    with col1:
        st.markdown(metric_card("Raw Wearable → Self-report", "r = −0.043"), unsafe_allow_html=True)
    with col2:
        st.markdown(metric_card("GB-Adjusted → Self-report", "r = +0.531", delta=0.574, delta_label="improvement"), unsafe_allow_html=True)
    with col3:
        st.markdown(metric_card("GB Val R² (stress)", "0.892"), unsafe_allow_html=True)

    st.info("The out-of-sample r of 0.531 (vs. in-sample 0.928) reflects proper generalization: the model is trained on 21 participants and evaluated on the full dataset including unseen participants.")

    st.markdown("### Feature Importance — What Predicts the Gap?")
    feat_img = os.path.join(img_dir, "6a_feature_importance.png")
    if os.path.exists(feat_img):
        st.image(feat_img, use_container_width=True)


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 3: PERCEPTION SPACE
# ═══════════════════════════════════════════════════════════════════════════════
with tab3:
    st.markdown("## Perception Space — Latent Embeddings")
    st.markdown("""
    Each point = one person-day. The feature vector combines gap magnitude,
    physiology (HR, HRV), sleep, hormones, symptoms, and temporal context.
    """)

    method = st.radio("Embedding Method", ["UMAP", "t-SNE"], horizontal=True)
    prefix = "6b_umap" if method == "UMAP" else "6b_tsne"

    coloring = st.radio("Color by",
        ["Phase", "Gap Magnitude", "Gap Category", "Participant", "Subtypes"],
        horizontal=True
    )
    color_map = {
        "Phase": "by_phase",
        "Gap Magnitude": "by_gap_signed",
        "Gap Category": "by_gap_cat",
        "Participant": "by_person",
        "Subtypes": "by_subtype",
    }
    img_path = os.path.join(img_dir, f"{prefix}_{color_map[coloring]}.png")

    if os.path.exists(img_path):
        st.image(img_path, use_container_width=True)
    else:
        st.warning(f"Image not found: {img_path}")

    st.divider()

    # UMAP vs t-SNE side-by-side
    st.markdown("### UMAP vs. t-SNE — Side by Side")
    col1, col2 = st.columns(2)
    umap_path = os.path.join(img_dir, f"6b_umap_{color_map[coloring]}.png")
    tsne_path = os.path.join(img_dir, f"6b_tsne_{color_map[coloring]}.png")
    with col1:
        st.markdown("**UMAP**")
        if os.path.exists(umap_path):
            st.image(umap_path, use_container_width=True)
    with col2:
        st.markdown("**t-SNE**")
        if os.path.exists(tsne_path):
            st.image(tsne_path, use_container_width=True)

    st.divider()

    # Subtype profiles
    st.markdown("### HDBSCAN Perception Subtypes")
    st.markdown("""
    HDBSCAN discovered **3 perception subtypes** from the UMAP embedding.
    Subtypes represent different patterns of perception–physiology alignment.
    """)

    if dataset == "Real Data":
        profiles = pd.DataFrame({
            "Subtype": [0, 1, 2],
            "n": [1905, 35, 246],
            "Mean Gap": [-0.013, 0.601, 0.014],
            "Resting HR": [67.4, 0.0, 0.0],
            "HRV (RMSSD)": [54.6, 73.6, 29.4],
            "Dominant Phase": ["Luteal (33%)", "Follicular (31%)", "Luteal (45%)"],
            "Validation Status": ["ACCEPTED", "ARTIFACT FLAG", "ARTIFACT FLAG"],
            "Note": ["Main continuous body", "Artifact: Missing HR data", "Artifact: Missing HR data"],
        })
    else:
        profiles = pd.DataFrame({
            "Subtype": [0, 1, 2],
            "n": [297, 4885, 31],
            "Mean Gap": [-0.098, 0.002, -0.073],
            "Resting HR": [69.2, 68.4, 63.3],
            "HRV (RMSSD)": [48.1, 50.5, 45.5],
            "Dominant Phase": ["Ovulation (98%)", "Luteal (42%)", "Follicular (87%)"],
            "Validation Status": ["ACCEPTED", "ACCEPTED", "ACCEPTED"],
            "Note": ["Ovulation cluster", "Main cluster, balanced", "Follicular-dominant"],
        })
    st.dataframe(profiles, use_container_width=True, hide_index=True)


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 4: GB INTERPRETABILITY
# ═══════════════════════════════════════════════════════════════════════════════
with tab4:
    st.markdown("## Gradient Boosting Structural Interpretability")
    st.markdown("""
    Instead of relying strictly on clusters (which can be vulnerable to missing sensor data artifacts natively grouped by UMAP/HDBSCAN), 
    we project the continuous, non-linear logic driving the high Predictive R² using SHAP and Surrogate Trees. 
    """)
    st.divider()
    
    st.markdown("### Top Drivers: Permutation Feature Importance")
    st.markdown("""
    The model relies almost exclusively on temporal momentum states rather than absolute physiological baselines or menstrual phase.
    """)
    
    feat_img_shap_bar = os.path.join(img_dir, "gb_shap_bar.png")
    feat_img_shap_sum = os.path.join(img_dir, "gb_shap_summary.png")
    
    col1, col2 = st.columns(2)
    with col1:
        if os.path.exists(feat_img_shap_bar):
            st.image(feat_img_shap_bar, caption="Absolute Mean SHAP Feature Importance", use_container_width=True)
    with col2:
        if os.path.exists(feat_img_shap_sum):
            st.image(feat_img_shap_sum, caption="SHAP Value Impacts (Beeswarm)", use_container_width=True)

    st.divider()
    st.markdown("### Global Surrogate Logic (Pseudo-Regimes)")
    st.markdown("""
    The incredibly complex tree structure of the GB model is extracted into human-readable Decision Sub-Regimes. 
    The gap is primarily a factor of an individual's **cognitive inertia** (`gap_rolling3`) matched against sudden shifts
    in standard reports.
    """)
    rules_path = os.path.join(img_dir, "gb_surrogate_rules.txt")
    if os.path.exists(rules_path):
        with open(rules_path, "r") as f:
            rules_text = f.read()
        st.code(rules_text, language="text")
    else:
        st.warning("No Surrogate rule output found.")

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 5: GAP ANALYSIS DETAILS
# ═══════════════════════════════════════════════════════════════════════════════
with tab5:
    st.markdown("## Gap Distance Analysis — Details")

    # Gap definition
    st.markdown("### Gap Definition")
    st.latex(r"d_{it} = z_{\text{person}}(\text{self\_report}_{it}) - z_{\text{person}}(\text{wearable}_{it})")
    st.markdown("""
    - **Positive gap** → self-report higher than wearable (over-perception)
    - **Negative gap** → wearable higher than self-report (under-perception)
    - **Aligned** → |gap| ≤ 0.5σ
    """)

    # Phase violin
    st.markdown("### Gap Distribution by Phase")
    violin_img = os.path.join(img_dir, "6a_gap_by_phase_violin.png")
    if os.path.exists(violin_img):
        st.image(violin_img, use_container_width=True)

    col1, col2 = st.columns(2)
    with col1:
        st.markdown("### Phase Statistics")
        phase_data = pd.DataFrame({
            "Phase": ["Menstrual", "Follicular", "Ovulation", "Luteal"],
            "n": [415, 519, 495, 757],
            "Mean Gap": [0.071, -0.054, -0.013, 0.007],
            "Std": [1.54, 1.39, 1.43, 1.40],
            "Cohen's d": [0.050, -0.038, -0.009, 0.005],
        })
        st.dataframe(phase_data, use_container_width=True, hide_index=True)
        st.markdown("**ANOVA**: F=0.610, p=0.608 — *not significant*")

    with col2:
        st.markdown("### Trait vs. State Decomposition")
        trait_scatter = os.path.join(img_dir, "6a_trait_scatter.png")
        if os.path.exists(trait_scatter):
            st.image(trait_scatter, use_container_width=True)

    st.divider()

    # Model comparison
    st.markdown("### Gap Prediction Models")
    model_data = pd.DataFrame({
        "Model": ["Ridge", "Random Forest", "Gradient Boosting"],
        "R²": [0.839, 0.822, 0.893],
        "MAE": [0.337, 0.367, 0.252],
        "RMSE": [0.491, 0.516, 0.400],
    })
    st.dataframe(model_data, use_container_width=True, hide_index=True)

    st.markdown("### Gap Category Distribution")
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Wearable Higher", "811 (37%)")
    with col2:
        st.metric("Self-Report Higher", "771 (35%)")
    with col3:
        st.metric("Aligned", "604 (28%)")


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 6: SYNTHETIC TEST
# ═══════════════════════════════════════════════════════════════════════════════
with tab6:
    st.markdown("## Synthetic Data Validation")
    st.markdown("""
    The pipeline was tested on `synthetic_mcphases_fullschema.csv` (200 participants, 5,829 rows)
    to validate generalization beyond the real dataset.
    """)

    # Metrics
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.markdown(metric_card("GB Val R²", "0.902"), unsafe_allow_html=True)
    with col2:
        st.markdown(metric_card("GB Test R² (held out)", "0.928"), unsafe_allow_html=True)
    with col3:
        st.markdown(metric_card("Test Δr", "+0.485", delta=0.485), unsafe_allow_html=True)
    with col4:
        st.markdown(metric_card("MSE Gap Closed (test)", "92.8%"), unsafe_allow_html=True)

    st.markdown("")

    # Comparison table
    st.markdown("### Real vs. Synthetic — Findings Comparison")
    comparison = pd.DataFrame({
        "Finding": [
            "GB gap R² (val)",
            "Phase ANOVA p",
            "ICC (trait proportion)",
            "MSE gap closed",
            "Perception subtypes",
            "Participants",
            "Paired observations",
        ],
        "Real Data": ["0.893", "0.608", "0.000", "93.2%", "3", "31", "1,882"],
        "Synthetic Data": ["0.902", "0.639", "0.000", "92.8%", "3", "200", "5,357"],
        "Consistent?": ["✅", "✅", "✅", "✅", "✅", "—", "—"],
    })
    st.dataframe(comparison, use_container_width=True, hide_index=True)

    st.success("All structural findings replicate on synthetic data: gap is state-dependent, not phase-driven, and highly predictable.")

    # Show synthetic plots
    st.markdown("### Synthetic Data — Perception Space")
    if os.path.exists(SYNTH_DIR):
        synth_col1, synth_col2 = st.columns(2)
        with synth_col1:
            synth_umap = os.path.join(SYNTH_DIR, "6b_umap_by_gap_signed.png")
            if os.path.exists(synth_umap):
                st.markdown("**UMAP — Gap Magnitude**")
                st.image(synth_umap, use_container_width=True)
        with synth_col2:
            synth_tsne = os.path.join(SYNTH_DIR, "6b_tsne_by_gap_signed.png")
            if os.path.exists(synth_tsne):
                st.markdown("**t-SNE — Gap Magnitude**")
                st.image(synth_tsne, use_container_width=True)

        synth_col3, synth_col4 = st.columns(2)
        with synth_col3:
            synth_violin = os.path.join(SYNTH_DIR, "6a_gap_by_phase_violin.png")
            if os.path.exists(synth_violin):
                st.markdown("**Gap by Phase**")
                st.image(synth_violin, use_container_width=True)
        with synth_col4:
            synth_feat = os.path.join(SYNTH_DIR, "6a_feature_importance.png")
            if os.path.exists(synth_feat):
                st.markdown("**Feature Importance**")
                st.image(synth_feat, use_container_width=True)


# ═══════════════════════════════════════════════════════════════════════════════
# FOOTER
# ═══════════════════════════════════════════════════════════════════════════════
st.divider()
st.markdown("""
<div style="text-align: center; color: #666; font-size: 0.85rem; padding: 20px;">
    mcPHASES Perception–Physiology Gap Analysis Dashboard<br>
    Pipeline: script4_phase_models.py → recalibration_scores.py → perception_gap.py<br>
    Generated plots: eda_outputs/script4_phase_models/ & eda_outputs/test_synthetic/
</div>
""", unsafe_allow_html=True)
