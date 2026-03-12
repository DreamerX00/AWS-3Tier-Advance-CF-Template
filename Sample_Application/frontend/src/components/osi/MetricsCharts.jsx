import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

export default function MetricsCharts({ metrics }) {
    const latData = useMemo(() => {
        if (!metrics?.latencyHistory?.length) return [{ time: '0s', latency: 0 }];
        const now = Date.now();
        return metrics.latencyHistory.map(d => ({
            time: `-${Math.round((now - d.t) / 1000)}s`,
            latency: d.v,
        }));
    }, [metrics.latencyHistory]);

    const bwData = useMemo(() => {
        if (!metrics?.bandwidthHistory?.length) return [{ time: '0s', in: 0, out: 0 }];
        const now = Date.now();
        return metrics.bandwidthHistory.map(d => ({
            time: `-${Math.round((now - d.t) / 1000)}s`,
            in: Number(d.bwIn),
            out: Number(d.bwOut),
        }));
    }, [metrics.bandwidthHistory]);

    const statusData = [
        { name: '2xx', value: metrics.statusBreakdown['2xx'], color: '#10B981' },
        { name: '3xx', value: metrics.statusBreakdown['3xx'], color: '#3B82F6' },
        { name: '4xx', value: metrics.statusBreakdown['4xx'], color: '#F59E0B' },
        { name: '5xx', value: metrics.statusBreakdown['5xx'], color: '#EF4444' }
    ].filter(d => d.value > 0);

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 10px', borderRadius: 6, fontSize: 10, fontFamily: 'monospace' }}>
                    {payload.map(p => (
                        <div key={p.dataKey} style={{ color: p.color, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                            <span>{p.name}:</span>
                            <span style={{ fontWeight: 700 }}>{p.value}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Percentiles Row */}
            <div style={{ display: 'flex', gap: 8, background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#64748B', fontWeight: 600 }}>p50 (Median)</div>
                    <div style={{ fontSize: 14, color: '#10B981', fontWeight: 700, fontFamily: 'monospace' }}>{metrics.p50}ms</div>
                </div>
                <div style={{ width: 1, background: 'rgba(255,255,255,0.05)' }} />
                <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#64748B', fontWeight: 600 }}>p95</div>
                    <div style={{ fontSize: 14, color: '#F59E0B', fontWeight: 700, fontFamily: 'monospace' }}>{metrics.p95}ms</div>
                </div>
                <div style={{ width: 1, background: 'rgba(255,255,255,0.05)' }} />
                <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#64748B', fontWeight: 600 }}>p99</div>
                    <div style={{ fontSize: 14, color: '#EF4444', fontWeight: 700, fontFamily: 'monospace' }}>{metrics.p99}ms</div>
                </div>
            </div>

            {/* Latency History */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 9, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 8 }}>Round Trip Latency</div>
                <div style={{ height: 100, width: '100%', marginLeft: -10 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={latData}>
                            <defs>
                                <linearGradient id="colorLat" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#6C63FF" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="time" hide />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="latency" name="Latency (ms)" stroke="#6C63FF" strokeWidth={2} fillOpacity={1} fill="url(#colorLat)" isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Bandwidth History */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 9, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 8 }}>Throughput (KB/s)</div>
                <div style={{ height: 100, width: '100%', marginLeft: -10 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={bwData}>
                            <defs>
                                <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="time" hide />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="in" name="In (KB)" stroke="#10B981" strokeWidth={1.5} fillOpacity={1} fill="url(#colorIn)" isAnimationActive={false} />
                            <Area type="monotone" dataKey="out" name="Out (KB)" stroke="#F59E0B" strokeWidth={1.5} fillOpacity={1} fill="url(#colorOut)" isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Status Distribution */}
            {statusData.length > 0 && (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: 9, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 8 }}>Status Topology</div>
                    <div style={{ height: 40, width: '100%', display: 'flex' }}>
                        {statusData.map((d, i) => (
                            <div key={d.name} title={`${d.name}: ${d.value}`} style={{
                                width: `${(d.value / metrics.totalRequests) * 100}%`,
                                background: d.color, height: '100%',
                                opacity: 0.8, transition: 'width 0.3s',
                                borderRight: i < statusData.length - 1 ? '2px solid #050810' : 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: i === 0 ? '4px 0 0 4px' : i === statusData.length - 1 ? '0 4px 4px 0' : 0
                            }}>
                                {(d.value / metrics.totalRequests) * 100 > 15 && (
                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>
                                        {d.name} ({Math.round(d.value / metrics.totalRequests * 100)}%)
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
