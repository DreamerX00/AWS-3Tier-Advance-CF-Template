import React from 'react';
import { METHOD_COLORS, statusColor, MonoBadge } from './OsiAtoms';

export default function WaterfallView({ events }) {
    if (!events.length) return <div style={{ padding: '40px 16px', textAlign: 'center', color: '#334155', fontSize: 11 }}>No traffic yet.</div>;

    const maxTotal = Math.max(...events.slice(0, 15).map(e => e.timeline?.total || 1));
    const recentEvents = events.slice(0, 15);

    return (
        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto' }}>
            <div style={{ display: 'flex', gap: 15, marginBottom: 12, fontSize: 8, fontWeight: 700, textTransform: 'uppercase' }}>
                <span style={{ color: '#F59E0B' }}>■ DNS</span>
                <span style={{ color: '#3B82F6' }}>■ TCP</span>
                <span style={{ color: '#FF6B9D' }}>■ TLS</span>
                <span style={{ color: '#10B981' }}>■ TTFB</span>
                <span style={{ color: '#6C63FF' }}>■ Download</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 350 }}>
                {recentEvents.map(ev => {
                    const t = ev.timeline;
                    if (!t) return null;
                    const scale = (val) => Math.max(1, (val / maxTotal) * 100);
                    
                    return (
                        <div key={ev.id} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 40px', alignItems: 'center', gap: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ color: '#CBD5E1', fontSize: 9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.url.split('/').pop() || '/'}</span>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <span style={{ color: METHOD_COLORS[ev.method] || '#94A3B8', fontSize: 8, fontWeight: 700 }}>{ev.method}</span>
                                    <span style={{ color: statusColor(ev.status), fontSize: 8 }}>{ev.status}</span>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', height: 10, background: '#0F172A', borderRadius: 2, overflow: 'hidden' }}>
                                <div title={`DNS: ${t.dns}ms`} style={{ width: `${scale(t.dns)}%`, background: '#F59E0B' }} />
                                <div title={`TCP: ${t.tcp}ms`} style={{ width: `${scale(t.tcp)}%`, background: '#3B82F6' }} />
                                {ev.url.includes('https') || t.tls > 0 ? <div title={`TLS: ${t.tls}ms`} style={{ width: `${scale(t.tls)}%`, background: '#FF6B9D' }} /> : null}
                                <div title={`TTFB: ${t.ttfb}ms`} style={{ width: `${scale(t.ttfb)}%`, background: '#10B981' }} />
                                <div title={`DL: ${t.download}ms`} style={{ width: `${scale(t.download)}%`, background: '#6C63FF' }} />
                            </div>

                            <div style={{ color: '#94A3B8', fontSize: 9, textAlign: 'right', fontFamily: 'monospace' }}>
                                {t.total}ms
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
