import { useState, useCallback } from "react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer
} from "recharts";

const DEFAULTS = {
    population: 5000,
    initialWealth: 10000,
    years: 50,
    volatility: 5,
    taxRate: 2.5,
    nisab: 7395,
    costOfLiving: 1500,
    tradesPerYear: 5000,
};

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(99, 102, 241, 0.2)",
            borderRadius: 12,
            padding: "10px 14px",
            fontSize: "0.75rem",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}>
            <div style={{ color: "#94a3b8", marginBottom: 6, fontWeight: 700 }}>
                Percentile: {label}%
            </div>
            {payload.map((p) => (
                <div key={p.dataKey} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
                    <span style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: p.dataKey === "withTax" ? "#6366f1" : "#64748b",
                        display: "inline-block",
                    }} />
                    <span style={{ color: "#cbd5e1", fontWeight: 600 }}>
                        {p.dataKey === "withTax" ? "With Zakat" : "No Tax"}:
                    </span>
                    <span style={{ color: "#f1f5f9", fontWeight: 800 }}>
                        ${Number(p.value).toLocaleString()}
                    </span>
                </div>
            ))}
        </div>
    );
}

export default function App() {
    const [params, setParams] = useState(DEFAULTS);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const update = useCallback((key, val) => {
        setParams((p) => ({ ...p, [key]: val }));
    }, []);

    const runSimulation = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/simulate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(params),
            });
            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            const data = await res.json();
            setResult(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [params]);

    const s = result?.withTax;
    const ns = result?.noTax;

    return (
        <div className="app">
            {/* Header */}
            <div className="header">
                <div>
                    <h1>Zakat Economy Simulator</h1>
                    <p>Multiplicative dynamics · Trade-based model · With vs Without wealth tax</p>
                </div>
                <button className="btn-run" onClick={runSimulation} disabled={loading}>
                    {loading ? <span className="spinner" /> : "⚡"}
                    {loading ? "Simulating…" : "Run Simulation"}
                </button>
            </div>

            {/* Controls */}
            <div className="controls">
                <div className="control-card">
                    <div className="control-label">
                        <span>Population</span>
                        <span className="control-value indigo">{params.population.toLocaleString()}</span>
                    </div>
                    <input type="range" min={100} max={10000} step={100} value={params.population}
                        onChange={(e) => update("population", +e.target.value)} />
                </div>
                <div className="control-card">
                    <div className="control-label">
                        <span>Simulation Years</span>
                        <span className="control-value indigo">{params.years}</span>
                    </div>
                    <input type="range" min={10} max={100} step={5} value={params.years}
                        onChange={(e) => update("years", +e.target.value)} />
                </div>
                <div className="control-card">
                    <div className="control-label">
                        <span>Trade Volatility</span>
                        <span className="control-value indigo">{params.volatility}%</span>
                    </div>
                    <input type="range" min={1} max={20} step={1} value={params.volatility}
                        onChange={(e) => update("volatility", +e.target.value)} />
                    <div className="control-hint">Stake per trade as % of poorer trader's wealth</div>
                </div>
                <div className="control-card">
                    <div className="control-label">
                        <span>Zakat Rate</span>
                        <span className="control-value emerald">{params.taxRate}%</span>
                    </div>
                    <input type="range" className="emerald-range" min={0} max={10} step={0.5} value={params.taxRate}
                        onChange={(e) => update("taxRate", +e.target.value)} />
                    <div className="control-hint">Levied annually on wealth ≥ nisab (${params.nisab.toLocaleString()})</div>
                </div>
                <div className="control-card">
                    <div className="control-label">
                        <span>Cost of Living</span>
                        <span className="control-value indigo">${params.costOfLiving.toLocaleString()}</span>
                    </div>
                    <input type="range" min={0} max={5000} step={100} value={params.costOfLiving}
                        onChange={(e) => update("costOfLiving", +e.target.value)} />
                </div>
                <div className="control-card">
                    <div className="control-label">
                        <span>Trades / Year</span>
                        <span className="control-value indigo">{params.tradesPerYear.toLocaleString()}</span>
                    </div>
                    <input type="range" min={500} max={20000} step={500} value={params.tradesPerYear}
                        onChange={(e) => update("tradesPerYear", +e.target.value)} />
                </div>
            </div>

            {error && (
                <div style={{
                    background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: 12, padding: "1rem", color: "#fca5a5", fontSize: "0.85rem", marginBottom: "1.5rem",
                }}>
                    ⚠ {error}
                </div>
            )}

            {!result && !loading && (
                <div className="empty-state">
                    <div className="icon">📊</div>
                    <h2>Ready to simulate</h2>
                    <p>Adjust the parameters above and hit "Run Simulation" to see the results.</p>
                </div>
            )}

            {result && (
                <div className="fade-in">
                    {/* Chart */}
                    <div className="chart-card fade-in fade-in-delay-1">
                        <div className="chart-header">
                            <h3>Wealth by Population Percentile</h3>
                            <div className="legend">
                                <span><span className="legend-dot indigo" /> With Zakat</span>
                                <span><span className="legend-dot grey" /> No Tax</span>
                            </div>
                        </div>
                        <div style={{ height: 320 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={result.chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gTax" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gNo" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#64748b" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                                    <XAxis dataKey="pct" tick={{ fontSize: 10, fontWeight: 600, fill: "#64748b" }}
                                        axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} interval={19} />
                                    <YAxis tick={{ fontSize: 10, fontWeight: 600, fill: "#64748b" }}
                                        axisLine={false} tickLine={false} domain={[0, "auto"]}
                                        tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="noTax" stroke="#64748b" strokeWidth={2}
                                        strokeDasharray="5 5" fill="url(#gNo)" name="No Tax" isAnimationActive={false} />
                                    <Area type="monotone" dataKey="withTax" stroke="#6366f1" strokeWidth={3}
                                        fill="url(#gTax)" name="With Zakat" isAnimationActive={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Stats row */}
                    <div className="stats-grid fade-in fade-in-delay-2">
                        <div className="stat-card">
                            <div className="stat-label">Gini (Zakat)</div>
                            <div className="stat-value">{s.gini.toFixed(3)}</div>
                            <div className="stat-sub">{s.gini < 0.35 ? "✓ Balanced" : s.gini < 0.5 ? "⚠ Moderate" : "🔴 Critical"}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Gini (No Tax)</div>
                            <div className="stat-value">{ns.gini.toFixed(3)}</div>
                            <div className="stat-sub">{ns.gini < 0.35 ? "✓ Balanced" : ns.gini < 0.5 ? "⚠ Moderate" : "🔴 Critical"}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Mean Wealth</div>
                            <div className="stat-value">${s.mean.toLocaleString()}</div>
                            <div className="stat-sub">with zakat</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Median Wealth</div>
                            <div className="stat-value">${s.median.toLocaleString()}</div>
                            <div className="stat-sub">with zakat</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Top 1% Share</div>
                            <div className="stat-value">{s.top1Pct.toFixed(1)}%</div>
                            <div className="stat-sub">with zakat</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Top 1% (No Tax)</div>
                            <div className="stat-value">{ns.top1Pct.toFixed(1)}%</div>
                            <div className="stat-sub">no tax</div>
                        </div>
                    </div>

                    {/* Comparison */}
                    <div className="comparison-row fade-in fade-in-delay-3">
                        <div className="comparison-card tax">
                            <h4>🕌 With Zakat</h4>
                            <div className="comparison-stat">
                                <span className="label">Bottom 50% share</span>
                                <span className="value">{s.bot50Pct.toFixed(1)}%</span>
                            </div>
                            <div className="comparison-stat">
                                <span className="label">Half wealth held by</span>
                                <span className="value">{s.halfHeldByPct.toFixed(1)}% richest</span>
                            </div>
                            <div className="comparison-stat">
                                <span className="label">Poor agents</span>
                                <span className="value">{s.poor.toLocaleString()}</span>
                            </div>
                            <div className="comparison-stat">
                                <span className="label">Super Rich agents</span>
                                <span className="value">{s.superRich.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="comparison-vs">VS</div>
                        <div className="comparison-card notax">
                            <h4>🏦 Without Tax</h4>
                            <div className="comparison-stat">
                                <span className="label">Bottom 50% share</span>
                                <span className="value">{ns.bot50Pct.toFixed(1)}%</span>
                            </div>
                            <div className="comparison-stat">
                                <span className="label">Half wealth held by</span>
                                <span className="value">{ns.halfHeldByPct.toFixed(1)}% richest</span>
                            </div>
                            <div className="comparison-stat">
                                <span className="label">Poor agents</span>
                                <span className="value">{ns.poor.toLocaleString()}</span>
                            </div>
                            <div className="comparison-stat">
                                <span className="label">Super Rich agents</span>
                                <span className="value">{ns.superRich.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom cards */}
                    <div className="bottom-grid fade-in fade-in-delay-4">
                        <div className="concentration-card">
                            <h4>Wealth Concentration</h4>
                            <p>
                                With Zakat, half of all wealth is held by the richest{" "}
                                <span className="big-number">{s.halfHeldByPct.toFixed(1)}%</span> of the population.
                                Without tax, it's the richest <strong>{ns.halfHeldByPct.toFixed(1)}%</strong>.
                            </p>
                        </div>
                        <div className="class-card">
                            <h4>Class Breakdown (With Zakat)</h4>
                            <div className="bar-row">
                                <div className="bar-labels">
                                    <span className="name">Poor</span>
                                    <span className="pct">{((s.poor / params.population) * 100).toFixed(1)}%</span>
                                </div>
                                <div className="bar-track">
                                    <div className="bar-fill red" style={{ width: `${Math.min((s.poor / params.population) * 100, 100)}%` }} />
                                </div>
                            </div>
                            <div className="bar-row">
                                <div className="bar-labels">
                                    <span className="name">Middle</span>
                                    <span className="pct">{((s.middle / params.population) * 100).toFixed(1)}%</span>
                                </div>
                                <div className="bar-track">
                                    <div className="bar-fill indigo" style={{ width: `${Math.min((s.middle / params.population) * 100, 100)}%` }} />
                                </div>
                            </div>
                            <div className="bar-row">
                                <div className="bar-labels">
                                    <span className="name">Rich</span>
                                    <span className="pct">{((s.rich / params.population) * 100).toFixed(1)}%</span>
                                </div>
                                <div className="bar-track">
                                    <div className="bar-fill emerald" style={{ width: `${Math.min((s.rich / params.population) * 100, 100)}%` }} />
                                </div>
                            </div>
                            <div className="bar-row">
                                <div className="bar-labels">
                                    <span className="name">Super Rich</span>
                                    <span className="pct">{((s.superRich / params.population) * 100).toFixed(1)}%</span>
                                </div>
                                <div className="bar-track">
                                    <div className="bar-fill amber" style={{ width: `${Math.min((s.superRich / params.population) * 100, 100)}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Explainer */}
                    <details className="explainer">
                        <summary>How does the simulation work?</summary>
                        <p>
                            <strong>{params.population.toLocaleString()}</strong> agents each start with <strong>${params.initialWealth.toLocaleString()}</strong>.
                            Each year: (1) everyone pays <strong>${params.costOfLiving.toLocaleString()}</strong> in living costs,
                            (2) <strong>{params.tradesPerYear.toLocaleString()}</strong> random pairwise trades occur where each party risks{" "}
                            <strong>{params.volatility}%</strong> of the poorer trader's wealth on a fair coin flip,
                            (3) anyone with wealth above the nisab (<strong>${params.nisab.toLocaleString()}</strong>) pays{" "}
                            <strong>{params.taxRate}%</strong> zakat, which is redistributed to those below the nisab.
                            <br /><br />
                            This <strong>multiplicative random walk</strong> naturally produces Pareto-like inequality — even with fair trades,
                            wealth concentrates over time (the Matthew Effect). Zakat acts as a <strong>negative feedback loop</strong>,
                            dampening extreme concentration. The Gini coefficient measures overall inequality (0 = perfect equality,
                            1 = one person owns everything).
                        </p>
                    </details>
                </div>
            )}
        </div>
    );
}
