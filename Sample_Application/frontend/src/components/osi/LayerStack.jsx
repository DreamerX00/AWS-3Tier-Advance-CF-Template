import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LAYER_META, METHOD_COLORS, statusColor, MonoBadge, PulsingDot } from './OsiAtoms';

export default function LayerStack({ latestEvent }) {
    const [expanded, setExpanded] = useState(null);
    const [activeLayer, setActiveLayer] = useState(null);
    const timerRef = useRef(null);

    useEffect(() => {
        if (!latestEvent) return;
        let i = 0;
        const activate = () => {
            setActiveLayer(LAYER_META[i]?.id);
            i++;
            if (i < LAYER_META.length) {
                timerRef.current = setTimeout(activate, 100);
            } else {
                timerRef.current = setTimeout(() => setActiveLayer(null), 300);
            }
        };
        activate();
        return () => clearTimeout(timerRef.current);
    }, [latestEvent?.id]);

    const layerData = latestEvent?.layers || {};

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {LAYER_META.map((layer) => {
                const isActive = activeLayer === layer.id;
                const isExpanded = expanded === layer.id;
                const data = layerData[layer.id] || {};

                return (
                    <div key={layer.id} style={{ position: 'relative' }}>
                        <div style={{
                            position: 'absolute', left: 18, top: '100%',
                            width: 2, height: 4,
                            background: `linear-gradient(to bottom, ${layer.color}88, transparent)`,
                            zIndex: 0,
                        }} />
                        <motion.div
                            animate={isActive ? { scale: [1, 1.015, 1], x: [0, 2, 0] } : {}}
                            transition={{ duration: 0.2 }}
                            onClick={() => setExpanded(isExpanded ? null : layer.id)}
                            style={{
                                background: isActive
                                    ? `linear-gradient(135deg, ${layer.color}33 0%, ${layer.color}15 100%)`
                                    : expanded === layer.id
                                        ? `linear-gradient(135deg, ${layer.color}22 0%, ${layer.color}08 100%)`
                                        : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${isActive ? layer.color + '88' : layer.color + '22'}`,
                                borderRadius: 8, padding: '7px 10px',
                                cursor: 'pointer', transition: 'all 0.2s ease', userSelect: 'none',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 14, flexShrink: 0 }}>{layer.icon}</span>
                                <div style={{
                                    width: 28, height: 16, borderRadius: 4,
                                    background: `${layer.color}22`, border: `1px solid ${layer.color}44`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                }}>
                                    <span style={{ fontSize: 8, fontWeight: 800, color: layer.color, fontFamily: 'monospace' }}>
                                        {layer.id}
                                    </span>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: '#F1F5F9' }}>{layer.label}</span>
                                        <PulsingDot color={layer.color} active={isActive} />
                                    </div>
                                    <div style={{ fontSize: 9, color: '#64748B' }}>{layer.sublabel}</div>
                                </div>
                                {latestEvent && Object.keys(data).length > 0 && (
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1.5 }}>
                                        {layer.id === 'L7' && data.status > 0 && <MonoBadge color={statusColor(data.status)}>{data.status}</MonoBadge>}
                                        {layer.id === 'L7' && data.method && <MonoBadge color={METHOD_COLORS[data.method] || '#94A3B8'}>{data.method}</MonoBadge>}
                                        {layer.id === 'L6' && data.tlsVersion && <MonoBadge color={layer.color}>{data.tlsVersion}</MonoBadge>}
                                        {layer.id === 'L4' && data.rtt && <MonoBadge color={layer.color}>{data.rtt}</MonoBadge>}
                                        {layer.id === 'L3' && data.hops > 0 && <MonoBadge color={layer.color}>{data.hops} hops</MonoBadge>}
                                        {layer.id === 'L1' && data.bandwidth && <MonoBadge color={layer.color}>{data.bandwidth}</MonoBadge>}
                                    </div>
                                )}
                                <span style={{ fontSize: 9, color: '#475569', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                            </div>

                            <AnimatePresence>
                                {isExpanded && Object.keys(data).length > 0 && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${layer.color}22`, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '6px 12px' }}>
                                            {Object.entries(data).map(([k, v]) => (
                                                <div key={k} title="Click to copy" style={{ cursor: 'copy' }} onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(String(v)); }}>
                                                    <div style={{ fontSize: 8, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.replace(/([A-Z])/g, ' $1').trim()}</div>
                                                    <div style={{ fontSize: 9.5, color: '#CBD5E1', fontFamily: '"JetBrains Mono", monospace', wordBreak: 'break-all' }}>{Array.isArray(v) ? v.join(', ') : String(v)}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </div>
                );
            })}
        </div>
    );
}
