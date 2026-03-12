import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AlertsView({ alerts }) {
    if (!alerts.length) return (
        <div style={{ padding: '40px 16px', textAlign: 'center', color: '#334155', fontSize: 11 }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>🎉</div>
            No anomalies detected. Network health is optimal.
        </div>
    );

    const typeColor = {
        CRITICAL: '#EF4444',
        SLOW: '#F59E0B',
        ERROR_5XX: '#EF4444',
        ERROR_4XX: '#FF6B9D',
        RETRANSMIT: '#8B5CF6',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto', paddingRight: 4, scrollbarWidth: 'thin', scrollbarColor: '#1E293B transparent' }}>
            <AnimatePresence>
                {alerts.map((a, i) => (
                    <motion.div key={`${a.id}-${i}`} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} layout
                        style={{ background: `linear-gradient(90deg, ${(typeColor[a.type] || '#475569')}22 0%, transparent 100%)`, borderLeft: `2px solid ${typeColor[a.type] || '#475569'}`, borderRadius: '0 6px 6px 0', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: typeColor[a.type] || '#F1F5F9', letterSpacing: '0.05em' }}>{a.type}</span>
                            <span style={{ fontSize: 8, color: '#475569', fontFamily: '"JetBrains Mono", monospace' }}>
                                {new Date(a.timestamp).toLocaleTimeString()}
                            </span>
                        </div>
                        <div style={{ fontSize: 10, color: '#CBD5E1' }}>{a.msg}</div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
