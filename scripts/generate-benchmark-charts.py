#!/usr/bin/env python3
"""
generate-benchmark-charts.py
Menghasilkan 3 visualisasi benchmark beresolusi tinggi untuk dokumen Poin 10 Proposal:
1. docs/validation/charts/01_skor_benchmark_vs_baseline.png
2. docs/validation/charts/02_stabilitas_3_run.png
3. docs/validation/charts/03_latensi_per_bidang.png
"""

import os
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

# Setup styling
plt.rcParams['font.sans-serif'] = 'DejaVu Sans'
plt.rcParams['axes.edgecolor'] = '#cbd5e1'
plt.rcParams['axes.linewidth'] = 1.0

os.makedirs('docs/validation/charts', exist_ok=True)

# ==============================================================================
# CHART 1: 01_skor_benchmark_vs_baseline.png
# Perbandingan Skor Konsensus AI vs Human Baseline vs Expected Target
# ==============================================================================
def generate_chart_1():
    fig, ax = plt.subplots(figsize=(13, 6.5), dpi=300)
    
    samples = ['INF-01', 'INF-02', 'INF-03', 'DKV-01', 'DKV-02', 'DKV-03', 'MKT-01', 'MKT-02', 'MKT-03']
    labels = [
        'INF-01\n(Weak)', 'INF-02\n(Medium)', 'INF-03\n(Strong)',
        'DKV-01\n(Weak)', 'DKV-02\n(Medium)', 'DKV-03\n(Strong)',
        'MKT-01\n(Weak)', 'MKT-02\n(Medium)', 'MKT-03\n(Strong)'
    ]
    
    # Expected, Human Baseline, AI Consensus
    # None represents insufficient evidence (null -> —/100)
    expected = [None, 50, 100, None, 50, 100, None, 61, 100]
    human =    [None, None, None, 11, 50, 81, None, 61, 100] # INF-02, INF-03 human was null due to no git log in file package
    ai_cons =  [None, 61, 81, None, 50, 75, None, 61, 100] # DKV-01 consensus is null (2/3 null)
    
    x = np.arange(len(samples))
    width = 0.26
    
    color_exp = '#64748b'  # Slate Gray
    color_hum = '#0ea5e9'  # Ocean Sky Blue
    color_ai  = '#6366f1'  # Indigo Violet
    color_null = '#f8fafc' # Off-white gray for null
    
    for i in range(len(samples)):
        # 1. Expected bar
        v_exp = expected[i]
        pos_exp = x[i] - width
        if v_exp is not None:
            rect = ax.bar(pos_exp, v_exp, width, color=color_exp, edgecolor='#334155', linewidth=0.8, alpha=0.9, zorder=3)
            ax.text(pos_exp, v_exp + 2, f'{v_exp}', ha='center', va='bottom', fontsize=9, fontweight='bold', color='#1e293b')
        else:
            ax.bar(pos_exp, 3, width, color=color_null, edgecolor='#94a3b8', linestyle='--', linewidth=1, hatch='//', zorder=3)
            ax.text(pos_exp, 5, 'null\n(—)', ha='center', va='bottom', fontsize=7.5, color='#64748b', fontstyle='italic')
            
        # 2. Human bar
        v_hum = human[i]
        pos_hum = x[i]
        if v_hum is not None:
            rect = ax.bar(pos_hum, v_hum, width, color=color_hum, edgecolor='#0369a1', linewidth=0.8, alpha=0.95, zorder=3)
            ax.text(pos_hum, v_hum + 2, f'{v_hum}', ha='center', va='bottom', fontsize=9, fontweight='bold', color='#0369a1')
        else:
            ax.bar(pos_hum, 3, width, color=color_null, edgecolor='#0ea5e9', linestyle='--', linewidth=1, hatch='\\\\', zorder=3)
            label_text = 'null*\n(—)' if i in [1, 2] else 'null\n(—)'
            ax.text(pos_hum, 5, label_text, ha='center', va='bottom', fontsize=7.5, color='#0284c7', fontstyle='italic')
            
        # 3. AI Consensus bar
        v_ai = ai_cons[i]
        pos_ai = x[i] + width
        if v_ai is not None:
            rect = ax.bar(pos_ai, v_ai, width, color=color_ai, edgecolor='#4338ca', linewidth=0.8, alpha=0.95, zorder=3)
            ax.text(pos_ai, v_ai + 2, f'{v_ai}', ha='center', va='bottom', fontsize=9, fontweight='bold', color='#4338ca')
        else:
            ax.bar(pos_ai, 3, width, color=color_null, edgecolor='#6366f1', linestyle='--', linewidth=1, hatch='xx', zorder=3)
            ax.text(pos_ai, 5, 'null\n(—)', ha='center', va='bottom', fontsize=7.5, color='#4f46e5', fontstyle='italic')

    # Visual field dividers
    ax.axvline(2.5, color='#cbd5e1', linestyle=':', linewidth=1.5, zorder=1)
    ax.axvline(5.5, color='#cbd5e1', linestyle=':', linewidth=1.5, zorder=1)
    
    # Field annotations at the top
    ax.text(1.0, 118, 'INFORMATIKA\n(Junior Web Developer)', ha='center', va='center', fontsize=10, fontweight='bold', color='#334155',
            bbox=dict(boxstyle='round,pad=0.3', facecolor='#f8fafc', edgecolor='#cbd5e1'))
    ax.text(4.0, 118, 'DESAIN KOMUNIKASI VISUAL\n(Junior Graphic Designer)', ha='center', va='center', fontsize=10, fontweight='bold', color='#334155',
            bbox=dict(boxstyle='round,pad=0.3', facecolor='#f8fafc', edgecolor='#cbd5e1'))
    ax.text(7.0, 118, 'BISNIS & PEMASARAN\n(Junior Digital Marketer)', ha='center', va='center', fontsize=10, fontweight='bold', color='#334155',
            bbox=dict(boxstyle='round,pad=0.3', facecolor='#f8fafc', edgecolor='#cbd5e1'))
    
    # Footnote about human null on INF
    ax.text(0.01, -0.16, '*Catatan: Penilai manusia memberi status insufficient pada riwayat kontribusi INF-02/03 karena arsip tidak memuat git log fisik;\nsistem evaluasi otomatis AI berhasil memvalidasi commit history repositori (INF-02: 4 commit -> 61/100, INF-03: 6 commit -> 81/100).',
            transform=ax.transAxes, fontsize=8, color='#475569', fontstyle='italic', va='top')

    ax.set_ylabel('Skor Kesiapan Kerja (0 – 100)', fontsize=11, fontweight='bold', labelpad=10, color='#1e293b')
    ax.set_title('Perbandingan Skor Benchmark: AI Consensus vs Human Baseline vs Target Expected', fontsize=13, fontweight='bold', pad=25, color='#0f172a')
    ax.set_xticks(x)
    ax.set_xticklabels(labels, fontsize=9.5, fontweight='bold', color='#334155')
    ax.set_ylim(0, 130)
    ax.set_yticks([0, 25, 50, 75, 100])
    ax.grid(axis='y', linestyle='--', alpha=0.5, zorder=0)
    
    # Custom legend
    p_exp = mpatches.Patch(facecolor=color_exp, edgecolor='#334155', label='Expected Design Target (fixtures/expected.json)')
    p_hum = mpatches.Patch(facecolor=color_hum, edgecolor='#0369a1', label='Human Baseline Adjudicated (HUMAN_RATINGS.csv)')
    p_ai  = mpatches.Patch(facecolor=color_ai,  edgecolor='#4338ca', label='AI Consensus (27-Run Benchmark Rubrik 1.1)')
    p_nul = mpatches.Patch(facecolor=color_null, edgecolor='#94a3b8', hatch='//', label='Insufficient Evidence (finalScore: null -> "—/100")')
    
    ax.legend(handles=[p_exp, p_hum, p_ai, p_nul], loc='upper right', bbox_to_anchor=(0.99, 0.96), fontsize=8.5, framealpha=0.95, facecolor='#ffffff')
    
    plt.tight_layout()
    output_path = 'docs/validation/charts/01_skor_benchmark_vs_baseline.png'
    plt.savefig(output_path, dpi=300)
    plt.close()
    print(f'Generated: {output_path}')


# ==============================================================================
# CHART 2: 02_stabilitas_3_run.png
# Diagram Konsistensi dan Stabilitas 3 Run Independen per Sampel Fixture
# ==============================================================================
def generate_chart_2():
    fig, ax = plt.subplots(figsize=(13, 6.5), dpi=300)
    
    samples = ['INF-01', 'INF-02', 'INF-03', 'DKV-01', 'DKV-02', 'DKV-03', 'MKT-01', 'MKT-02', 'MKT-03']
    labels = [
        'INF-01\n(Weak)', 'INF-02\n(Medium)', 'INF-03\n(Strong)',
        'DKV-01\n(Weak)', 'DKV-02\n(Medium)', 'DKV-03\n(Strong)',
        'MKT-01\n(Weak)', 'MKT-02\n(Medium)', 'MKT-03\n(Strong)'
    ]
    
    # Data 3 runs: [Run 1, Run 2, Run 3]
    raw_runs = {
        'INF-01': [None, None, None],
        'INF-02': [61, 61, 61],
        'INF-03': [81, 81, 81],
        'DKV-01': [11, None, None],
        'DKV-02': [50, 58, 50],
        'DKV-03': [75, 81, 75],
        'MKT-01': [None, None, None],
        'MKT-02': [61, 55, 61],
        'MKT-03': [100, 100, 100]
    }
    
    stats = {
        'INF-01': {'std': 0.00, 'var': 0.00, 'desc': '100% Identik (null)'},
        'INF-02': {'std': 0.00, 'var': 0.00, 'desc': '100% Identik (61)'},
        'INF-03': {'std': 0.00, 'var': 0.00, 'desc': '100% Identik (81)'},
        'DKV-01': {'std': 0.00, 'var': 0.00, 'desc': '2/3 null, 1/3 11'},
        'DKV-02': {'std': 4.62, 'var': 21.33, 'desc': 'SD = 4.62 (50, 58, 50)'},
        'DKV-03': {'std': 3.46, 'var': 12.00, 'desc': 'SD = 3.46 (75, 81, 75)'},
        'MKT-01': {'std': 0.00, 'var': 0.00, 'desc': '100% Identik (null)'},
        'MKT-02': {'std': 3.46, 'var': 12.00, 'desc': 'SD = 3.46 (61, 55, 61)'},
        'MKT-03': {'std': 0.00, 'var': 0.00, 'desc': '100% Identik (100)'}
    }
    
    x = np.arange(len(samples))
    
    # Dedicated Insufficient Evidence Band (-16 to -4)
    ax.axhspan(-16, -4, facecolor='#fee2e2', alpha=0.4, zorder=0)
    ax.axhline(-4, color='#fca5a5', linestyle='-', linewidth=0.8, zorder=1)
    ax.text(8.4, -10, 'Zona Insufficient\nEvidence (null)', ha='right', va='center', fontsize=8, fontweight='bold', color='#b91c1c')

    # Color & markers for 3 runs
    colors = ['#3b82f6', '#f59e0b', '#10b981'] # Blue (R1), Amber (R2), Emerald (R3)
    markers = ['o', '^', 's']
    offsets = [-0.15, 0.0, 0.15]
    
    for idx, sid in enumerate(samples):
        vals = raw_runs[sid]
        plot_vals = [-10 if v is None else v for v in vals]
        
        # Draw min-max vertical bar if values differ
        valid_nums = [v for v in vals if v is not None]
        if len(valid_nums) > 1 and max(valid_nums) != min(valid_nums):
            ax.plot([x[idx], x[idx]], [min(valid_nums), max(valid_nums)], color='#94a3b8', linewidth=2.5, zorder=2)
            
        # Draw scatter points for each run
        for r in range(3):
            x_pos = x[idx] + offsets[r]
            y_pos = plot_vals[r]
            ax.scatter(x_pos, y_pos, color=colors[r], marker=markers[r], s=75, edgecolor='#1e293b', linewidth=0.8, zorder=4,
                       label=f'Run {r+1}' if idx == 0 else "")
            
            # Point annotation
            lbl = f'{vals[r]}' if vals[r] is not None else 'null'
            y_offset = 3.5 if (vals[r] is not None and vals[r] > 0) else 2.5
            ax.text(x_pos, y_pos + y_offset, lbl, ha='center', va='bottom', fontsize=7.5, color='#334155', fontweight='bold')
            
        # Variance / Stability Badge at the top
        st = stats[sid]
        badge_color = '#ecfdf5' if st['std'] == 0 else '#fffbeb'
        badge_edge = '#10b981' if st['std'] == 0 else '#f59e0b'
        ax.text(x[idx], 108, f"SD: {st['std']:.2f}\nVar: {st['var']:.2f}", ha='center', va='bottom', fontsize=8,
                bbox=dict(boxstyle='round,pad=0.25', facecolor=badge_color, edgecolor=badge_edge, linewidth=0.8), color='#1e293b')

    # Dividers
    ax.axvline(2.5, color='#cbd5e1', linestyle=':', linewidth=1.5, zorder=1)
    ax.axvline(5.5, color='#cbd5e1', linestyle=':', linewidth=1.5, zorder=1)
    
    # Field headers
    ax.text(1.0, 126, 'INFORMATIKA (100% Deterministik)', ha='center', va='center', fontsize=9.5, fontweight='bold', color='#1e3a8a',
            bbox=dict(boxstyle='square,pad=0.3', facecolor='#eff6ff', edgecolor='#bfdbfe'))
    ax.text(4.0, 126, 'DKV (Multimodal Observasi)', ha='center', va='center', fontsize=9.5, fontweight='bold', color='#7c2d12',
            bbox=dict(boxstyle='square,pad=0.3', facecolor='#fff7ed', edgecolor='#fed7aa'))
    ax.text(7.0, 126, 'PEMASARAN (Isolasi Ekstraksi)', ha='center', va='center', fontsize=9.5, fontweight='bold', color='#065f46',
            bbox=dict(boxstyle='square,pad=0.3', facecolor='#ecfdf5', edgecolor='#a7f3d0'))

    ax.set_ylabel('Skor Penilaian Akhir', fontsize=11, fontweight='bold', labelpad=10, color='#1e293b')
    ax.set_title('Uji Stabilitas Model: Konsistensi Hasil Penilaian pada 3 Run Pengulangan', fontsize=13, fontweight='bold', pad=25, color='#0f172a')
    ax.set_xticks(x)
    ax.set_xticklabels(labels, fontsize=9.5, fontweight='bold', color='#334155')
    ax.set_ylim(-18, 135)
    ax.set_yticks([-10, 0, 25, 50, 75, 100])
    ax.set_yticklabels(['null (—)', '0', '25', '50', '75', '100'])
    ax.grid(axis='y', linestyle='--', alpha=0.5, zorder=0)
    
    # Legend
    ax.legend(loc='upper right', bbox_to_anchor=(0.99, 0.94), fontsize=9, framealpha=0.95, facecolor='#ffffff')
    
    plt.tight_layout()
    output_path = 'docs/validation/charts/02_stabilitas_3_run.png'
    plt.savefig(output_path, dpi=300)
    plt.close()
    print(f'Generated: {output_path}')


# ==============================================================================
# CHART 3: 03_latensi_per_bidang.png
# Grafik Perbandingan Latensi Evaluasi per Bidang (Informatika, DKV, Pemasaran)
# ==============================================================================
def generate_chart_3():
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6.5), dpi=300, gridspec_kw={'width_ratios': [1.3, 1]})
    
    lat_data = {
        'Informatika': [3.359, 4.997, 6.516],
        'DKV (Multimodal)': [9.217, 21.456, 21.578, 23.940, 34.712],
        'Pemasaran': [4.864, 5.517, 5.599, 7.061, 7.651, 8.886, 18.124, 19.736]
    }
    
    fields = list(lat_data.keys())
    
    # --- SUBPLOT 1: Grouped Metrics (Min, Median, Mean, P95, Max) ---
    metrics = ['Min', 'Median', 'Mean', 'P95', 'Max']
    x = np.arange(len(fields))
    bar_w = 0.15
    
    palette = ['#0284c7', '#2563eb', '#6366f1', '#a855f7', '#ec4899']
    
    for m_idx, m_name in enumerate(metrics):
        m_vals = []
        for f in fields:
            arr = lat_data[f]
            if m_name == 'Min': val = np.min(arr)
            elif m_name == 'Median': val = np.median(arr)
            elif m_name == 'Mean': val = np.mean(arr)
            elif m_name == 'P95': val = np.percentile(arr, 95)
            elif m_name == 'Max': val = np.max(arr)
            m_vals.append(val)
            
        pos = x + (m_idx - 2) * bar_w
        rects = ax1.bar(pos, m_vals, bar_w, label=m_name, color=palette[m_idx], edgecolor='#1e293b', linewidth=0.6, alpha=0.9, zorder=3)
        
        # Add labels on top of bars
        for r_idx, rect in enumerate(rects):
            h = rect.get_height()
            ax1.text(rect.get_x() + rect.get_width()/2., h + 0.5, f'{h:.1f}s', ha='center', va='bottom', fontsize=7.5, fontweight='bold', color='#1e293b')

    ax1.set_ylabel('Latensi End-to-End (Detik)', fontsize=10.5, fontweight='bold', color='#1e293b')
    ax1.set_title('(A) Ringkasan Metrik Latensi Inferensi per Bidang', fontsize=11.5, fontweight='bold', color='#0f172a', pad=12)
    ax1.set_xticks(x)
    ax1.set_xticklabels(fields, fontsize=9.5, fontweight='bold', color='#334155')
    ax1.set_ylim(0, 40)
    ax1.grid(axis='y', linestyle='--', alpha=0.5, zorder=0)
    ax1.legend(loc='upper left', fontsize=8.5, framealpha=0.9)
    
    # --- SUBPLOT 2: Distribution Scatter & Pipeline Architecture Breakdown ---
    ax2.set_title('(B) Karakteristik Pipeline Inferensi AI', fontsize=11.5, fontweight='bold', color='#0f172a', pad=12)
    
    field_colors = {'Informatika': '#0284c7', 'DKV (Multimodal)': '#e11d48', 'Pemasaran': '#059669'}
    
    # Strip plot with jitter
    np.random.seed(42)
    for f_idx, f in enumerate(fields):
        pts = lat_data[f]
        jitter = np.random.normal(0, 0.04, size=len(pts))
        ax2.scatter(np.repeat(f_idx, len(pts)) + jitter, pts, color=field_colors[f], s=65, edgecolor='#0f172a', linewidth=0.8, alpha=0.85, zorder=3)
        # Median line
        med = np.median(pts)
        ax2.hlines(med, f_idx - 0.22, f_idx + 0.22, colors='#0f172a', linestyles='-', linewidth=2.5, zorder=4)
        ax2.text(f_idx + 0.25, med, f'Med:\n{med:.2f}s', va='center', fontsize=8, fontweight='bold', color='#0f172a')

    ax2.set_xticks(range(len(fields)))
    ax2.set_xticklabels(['Informatika', 'DKV\n(Multimodal)', 'Pemasaran'], fontsize=9, fontweight='bold', color='#334155')
    ax2.set_ylabel('Sebaran Waktu Eksekusi (Detik)', fontsize=10.5, fontweight='bold', color='#1e293b')
    ax2.set_ylim(0, 40)
    ax2.grid(axis='y', linestyle='--', alpha=0.5, zorder=0)
    
    # Pipeline info box below Subplot 2
    info_text = (
        "Penjelasan Arsitektur Latensi:\n"
        "• Informatika (Med: 5.00s): Single-call Groq (openai/gpt-oss-20b) + AST repo parse.\n"
        "• DKV (Med: 21.58s): Sequential 2-Stage Pipeline (1. Vision Qwen 3.6-27B observasi\n"
        "  elemen visual + 2. Evaluator GPT-OSS-20B penilaian rubrik).\n"
        "• Pemasaran (Med: 7.36s): Single-call Groq + parser PDF text-layer berbasis blok."
    )
    ax2.text(0.02, 0.96, info_text, transform=ax2.transAxes, fontsize=8, va='top', ha='left',
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#f8fafc', edgecolor='#cbd5e1', alpha=0.95), color='#334155')

    fig.suptitle('Analisis Kinerja Latensi End-to-End Sistem Skillbridge AI pada Lingkungan Produksi', fontsize=13, fontweight='bold', y=0.98, color='#0f172a')
    
    plt.tight_layout()
    output_path = 'docs/validation/charts/03_latensi_per_bidang.png'
    plt.savefig(output_path, dpi=300)
    plt.close()
    print(f'Generated: {output_path}')


if __name__ == '__main__':
    generate_chart_1()
    generate_chart_2()
    generate_chart_3()
    print('All benchmark charts successfully generated.')
