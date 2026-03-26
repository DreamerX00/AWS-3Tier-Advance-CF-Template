import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { METHOD_COLORS, statusColor, MonoBadge } from './OsiAtoms';

export default function PacketFeed({ events, methodFilter, setMethodFilter }) {
    const scrollRef = useRef(null);
    const [expandedEventId, setExpandedEventId] = useState(null);

    useEffect(() => {
        if (scrollRef.current && !expandedEventId) scrollRef.current.scrollTop = 0;
    }, [events.length, expandedEventId]);

    const filtered = methodFilter === 'ALL' ? events : events.filter(e => e.method === methodFilter);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {['ALL', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => (
                    <button key={m} onClick={() => setMethodFilter(m)} style={{
                        padding: '2px 8px', borderRadius: 5, border: `1px solid ${m === 'ALL' ? '#475569' : (METHOD_COLORS[m] || '#475569') + '66'}`,
                        background: methodFilter === m ? `${m === 'ALL' ? '#475569' : METHOD_COLORS[m] || '#475569'}33` : 'transparent',
                        color: methodFilter === m ? (m === 'ALL' ? '#94A3B8' : METHOD_COLORS[m]) : '#475569',
                        fontSize: 9, fontWeight: 600, cursor: 'pointer', fontFamily: 'monospace', transition: 'all 0.1s'
                    }}>{m}</button>
                ))}
            </div>

            <div ref={scrollRef} style={{ height: 260, overflowY: 'auto', background: '#050810', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', padding: '6px 0', scrollbarWidth: 'thin', scrollbarColor: '#1E293B transparent' }}>
                {filtered.length === 0 ? (
                    <div style={{ padding: '40px 16px', textAlign: 'center', color: '#334155', fontSize: 11 }}>No packets captured yet.</div>
                ) : (
                    <AnimatePresence initial={false}>
                        {filtered.map((ev) => {
                            const isExpanded = expandedEventId === ev.id;
                            return (
                                <motion.div key={ev.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
                                    <div onClick={() => setExpandedEventId(isExpanded ? null : ev.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontFamily: '"JetBrains Mono", monospace', fontSize: 9, cursor: 'pointer', background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent', borderLeft: isExpanded ? `2px solid ${METHOD_COLORS[ev.method] || '#64748B'}` : '2px solid transparent' }}>
                                        <span style={{ color: '#334155', flexShrink: 0 }}>{new Date(ev.timestamp).toLocaleTimeString('en-GB', { hour12: false })}</span>
                                        <MonoBadge color={METHOD_COLORS[ev.method] || '#94A3B8'}>{ev.method}</MonoBadge>
                                        <span style={{ color: '#64748B', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.url}</span>
                                        <MonoBadge color={statusColor(ev.status)}>{ev.status || 'ERR'}</MonoBadge>
                                        <span style={{ color: '#475569', flexShrink: 0, width: 35, textAlign: 'right' }}>{ev.latency}ms</span>
                                    </div>

                                    {isExpanded && (
                                        <div style={{ padding: '8px 12px', background: '#0F172A', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: 9, fontFamily: '"JetBrains Mono", monospace' }}>
                                            <div style={{ color: '#F1F5F9', marginBottom: 4 }}>HEADERS</div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                                                <div>
                                                    <div style={{ color: '#64748B', marginBottom: 2 }}>Request</div>
                                                    {Object.entries(ev.requestHeaders).map(([k,v]) => <div key={k}><span style={{color: '#94A3B8'}}>{k}:</span> <span style={{color: '#6C63FF'}}>{v}</span></div>)}
                                                </div>
                                                <div>
                                                    <div style={{ color: '#64748B', marginBottom: 2 }}>Response</div>
                                                    {Object.entries(ev.responseHeaders).map(([k,v]) => <div key={k}><span style={{color: '#94A3B8'}}>{k}:</span> <span style={{color: '#10B981'}}>{v}</span></div>)}
                                                </div>
                                            </div>
                                            <div style={{ color: '#F1F5F9', marginBottom: 4 }}>HEX DUMP PREVIEW</div>
                                            <div style={{ color: '#475569', wordBreak: 'break-all', lineHeight: 1.4 }}>{ev.hexDump}</div>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
