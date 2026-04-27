import warnings
import numpy as np
import pandas as pd
from typing import Tuple, Dict, Any, List

from sklearn.metrics import silhouette_score, davies_bouldin_score, calinski_harabasz_score, adjusted_rand_score
from sklearn.utils import resample

warnings.filterwarnings("ignore")

def internal_metrics(X: np.ndarray, labels: np.ndarray) -> Dict[str, float]:
    """Compute standard internal cluster validity metrics on non-noise points."""
    mask = labels != -1
    n_clusters = len(np.unique(labels[mask]))
    
    if mask.sum() < 20 or n_clusters < 2:
        return {
            "silhouette": np.nan,
            "davies_bouldin": np.nan,
            "calinski_harabasz": np.nan,
            "n_clusters": n_clusters,
            "noise_rate": float((labels == -1).mean())
        }
        
    return {
        "silhouette": float(silhouette_score(X[mask], labels[mask])),
        "davies_bouldin": float(davies_bouldin_score(X[mask], labels[mask])),
        "calinski_harabasz": float(calinski_harabasz_score(X[mask], labels[mask])),
        "n_clusters": n_clusters,
        "noise_rate": float((labels == -1).mean())
    }

def bootstrap_stability(
    X: np.ndarray, 
    n_components: int = 2,
    n_neighbors: int = 15,
    min_dist: float = 0.1,
    min_cluster_size: int = 30,
    min_samples: int = 5,
    B: int = 30,
    random_state: int = 42
) -> Tuple[float, float]:
    """Bootstrap Adjusted Rand Index (ARI) to measure cluster stability."""
    import umap
    import hdbscan
    
    np.random.seed(random_state)
    
    # Base clustering
    try:
        base_emb = umap.UMAP(
            n_neighbors=n_neighbors, min_dist=min_dist, n_components=n_components, 
            metric="euclidean", random_state=random_state
        ).fit_transform(X)
        
        base_labels = hdbscan.HDBSCAN(
            min_cluster_size=min_cluster_size, min_samples=min_samples, metric="euclidean"
        ).fit_predict(base_emb)
    except Exception as e:
        print(f"      [Warning] Base clustering failed in bootstrap: {e}")
        return np.nan, np.nan
        
    if len(np.unique(base_labels)) < 2:
        return np.nan, np.nan

    aris = []
    for _ in range(B):
        # We need to map bootstrapped indices back to compare labels
        indices = np.random.choice(len(X), size=len(X), replace=True)
        Xb = X[indices]
        
        try:
            emb_b = umap.UMAP(
                n_neighbors=n_neighbors, min_dist=min_dist, n_components=n_components, 
                metric="euclidean"
            ).fit_transform(Xb)
            
            labels_b = hdbscan.HDBSCAN(
                min_cluster_size=min_cluster_size, min_samples=min_samples, metric="euclidean"
            ).fit_predict(emb_b)
            
            # Compute ARI against base labels for the chosen indices
            m = min(len(base_labels), len(labels_b))
            ari = adjusted_rand_score(base_labels[indices][:m], labels_b[:m])
            aris.append(ari)
        except Exception:
            aris.append(np.nan)
            
    valid_aris = [a for a in aris if not np.isnan(a)]
    if len(valid_aris) == 0:
        return np.nan, np.nan
        
    return float(np.mean(valid_aris)), float(np.std(valid_aris))

def permutation_test(
    X: np.ndarray, 
    n_components: int = 2,
    n_neighbors: int = 15,
    min_dist: float = 0.1,
    min_cluster_size: int = 30,
    min_samples: int = 5,
    random_state: int = 42
) -> Dict[str, float]:
    """Test clustering against a feature-permuted null distribution.
    If the permuted data achieves similar silhouette/clusters, the original structure is likely artifactual.
    """
    import umap
    import hdbscan

    np.random.seed(random_state)
    X_perm = np.copy(X)
    for col_idx in range(X_perm.shape[1]):
        np.random.shuffle(X_perm[:, col_idx])
        
    try:
        emb_null = umap.UMAP(
            n_neighbors=n_neighbors, min_dist=min_dist, n_components=n_components, 
            metric="euclidean", random_state=random_state
        ).fit_transform(X_perm)
        
        labels_null = hdbscan.HDBSCAN(
            min_cluster_size=min_cluster_size, min_samples=min_samples, metric="euclidean"
        ).fit_predict(emb_null)
        
        metrics_null = internal_metrics(emb_null, labels_null)  # Evaluate in embedding space to compare apples-to-apples
        return metrics_null
    except Exception as e:
        print(f"      [Warning] Permutation test clustering failed: {e}")
        return {"silhouette": np.nan, "noise_rate": 1.0, "n_clusters": 0}

def evaluate_cluster_validity(
    X_clean: np.ndarray, 
    embedding: np.ndarray, 
    labels: np.ndarray, 
    df: pd.DataFrame, 
    features_used: List[str]
) -> Dict[str, Any]:
    """
    Comprehensive cluster validity suite to determine if HDBSCAN clusters represent real structure
    vs noise/data artifacts.
    """
    metrics = {"status": "REJECTED"}
    
    # 1. Internal Metrics (in embedding space, because HDBSCAN operated there)
    internal = internal_metrics(embedding, labels)
    metrics["internal"] = internal
    
    # 2. Bootstrap Stability (ARI)
    # Using small B to keep runtime reasonable
    ari_mean, ari_std = bootstrap_stability(X_clean, B=15)
    metrics["ari_mean"] = ari_mean
    metrics["ari_std"] = ari_std
    
    # 3. Permutation Null Test
    null_metrics = permutation_test(X_clean)
    metrics["null_internal"] = null_metrics
    
    # 4. Artifact Missingness Audit 
    # Determine if missing data is the actual differentiator.
    artifacts = []
    if "resting_hr" in features_used and "overall_score" in features_used:
        # Reconstruct missingness masks
        valid = df.dropna(subset=["gap_signed"])
        hr_missing = valid["resting_hr"].fillna(0) == 0
        sleep_missing = valid["overall_score"].fillna(0) == 0
        
        for cluster_id in np.unique(labels):
            if cluster_id == -1:
                continue
            mask = labels == cluster_id
            if mask.sum() > 0:
                pct_hr_missing = hr_missing[mask].mean()
                pct_sleep_missing = sleep_missing[mask].mean()
                if pct_hr_missing > 0.8 or pct_sleep_missing > 0.8:
                    artifacts.append({
                        "cluster": cluster_id, 
                        "hr_missing_rate": pct_hr_missing, 
                        "sleep_missing_rate": pct_sleep_missing
                    })
    
    metrics["missingness_artifacts"] = artifacts

    # 5. Decision Rules
    # Valid if: Silhouette >= ~0.2, ARI >= ~0.3 (stable against permutations), not purely artifact-driven
    sil = internal.get("silhouette", np.nan)
    n_c = internal.get("n_clusters", 0)
    
    is_stable = (not np.isnan(ari_mean)) and (ari_mean >= 0.25)
    has_structure = (not np.isnan(sil)) and (sil > 0.15)
    has_multiple = n_c >= 2
    too_much_noise = internal.get("noise_rate", 1.0) > 0.8
    
    # If all clusters are just missingness artifacts, reject
    all_artifact = (len(artifacts) == n_c) if n_c > 0 else False
    
    if has_multiple and has_structure and is_stable and not too_much_noise and not all_artifact:
        metrics["status"] = "ACCEPTED"
    
    return metrics
