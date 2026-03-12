import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function TopologyView({ latestEvent }) {
    const [activeNode, setActiveNode] = useState(null);

    useEffect(() => {
        if (!latestEvent) return;
        const seq = [1, 2, 3, 4, 3, 2, 1];
        let i = 0;
        const animate = setInterval(() => {
            setActiveNode(seq[i]);
            i++;
            if (i >= seq.length) {
                clearInterval(animate);
                setTimeout(() => setActiveNode(null), 300);
            }
        }, 150);
        return () => clearInterval(animate);
    }, [latestEvent?.id]);

    const nodes = [
        { id: 1, label: 'Client browser', icon: '💻', color: '#10B981' },
        { id: 2, label: 'Nginx proxy', icon: '🔄', color: '#06B6D4' },
        { id: 3, label: 'Spring Boot', icon: '☕', color: '#6C63FF' },
        { id: 4, label: 'PostgreSQL DB', icon: '🗄️', color: '#3B82F6' }
    ];

    return (
        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '20px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 15 }}>
            <div style={{ fontSize: 9, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, alignSelf: 'flex-start' }}>Network Topology</div>
            
            <div style={{ display: 'flex', alignItems: 'center' }}>
                {nodes.map((node, i) => (
                    <React.Fragment key={node.id}>
                        <motion.div animate={activeNode === node.id ? { scale: 1.15, y: -5 } : { scale: 1, y: 0 }} style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 2
                        }}>
                            <div style={{
                                width: 42, height: 42, borderRadius: 12,
                                background: activeNode === node.id ? `${node.color}33` : '#0F172A',
                                border: `2px solid ${activeNode === node.id ? node.color : '#1E293B'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                                boxShadow: activeNode === node.id ? `0 0 15px ${node.color}66` : 'none',
                                transition: 'all 0.2s',
                            }}>
                                {node.icon}
                            </div>
                            <div style={{ fontSize: 8, color: activeNode === node.id ? '#F1F5F9' : '#64748B', fontWeight: activeNode === node.id ? 700 : 400, whiteSpace: 'nowrap' }}>
                                {node.label}
                            </div>
                        </motion.div>

                        {i < nodes.length - 1 && (
                            <div style={{ width: 40, height: 2, background: '#1E293B', position: 'relative', marginTop: -15, zIndex: 1 }}>
                                {(activeNode === node.id || activeNode === nodes[i+1].id) && (
                                    <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: '100%', opacity: 1 }} exit={{ opacity: 0 }} style={{
                                        position: 'absolute', height: '100%', background: activeNode === node.id ? node.color : nodes[i+1].color,
                                        transformOrigin: activeNode === node.id ? 'left' : 'right',
                                        boxShadow: `0 0 8px ${activeNode === node.id ? node.color : nodes[i+1].color}`
                                    }} />
                                )}
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>
            
            <div style={{ color: '#475569', fontSize: 9, textAlign: 'center', marginTop: 10, maxWidth: 280, lineHeight: 1.5 }}>
                Real-time traffic propagation mapped across the containerized stack. {latestEvent ? `Last hop: ${latestEvent.latency}ms RTT.` : 'Waiting for traffic...'}
            </div>
        </div>
    );
}
