import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

const statusColors = {
    UP: '#10B981',
    DEGRADED: '#F59E0B',
    DOWN: '#EF4444',
    UNKNOWN: '#64748B',
};

function nodeTone(status) {
    const color = statusColors[status] || statusColors.UNKNOWN;
    return {
        color,
        background: `${color}1A`,
        border: `${color}66`,
    };
}

function inferPrimaryDependency(latestEvent) {
    const url = latestEvent?.url?.replace(/^\/api/, '') || '';
    if (!url) return null;

    if (url.startsWith('/files') || url.startsWith('/storage') || url.startsWith('/uploads')) {
        return 'storage';
    }

    return 'database';
}

function statusDetail(status) {
    if (status === 'UP') return 'Healthy';
    if (status === 'DEGRADED') return 'Partial';
    if (status === 'DOWN') return 'Offline';
    return 'Unknown';
}

function NodeCard({ node, active }) {
    const tone = nodeTone(node.status);

    return (
        <motion.div
            animate={active ? { scale: 1.08, y: -4 } : { scale: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
        >
            <div
                style={{
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    background: active ? tone.background : '#0F172A',
                    border: `2px solid ${active ? tone.color : tone.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    boxShadow: active ? `0 0 18px ${tone.color}55` : 'none',
                    transition: 'all 0.2s',
                }}
            >
                {node.icon}
            </div>
            <div style={{ fontSize: 9, color: '#E2E8F0', fontWeight: 700, whiteSpace: 'nowrap' }}>
                {node.label}
            </div>
            <div
                style={{
                    fontSize: 8,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: tone.color,
                    fontWeight: 700,
                }}
            >
                {statusDetail(node.status)}
            </div>
        </motion.div>
    );
}

function LinkBar({ active, failed, color = '#38BDF8' }) {
    return (
        <div
            style={{
                position: 'relative',
                width: 52,
                height: 2,
                background: failed ? 'rgba(239,68,68,0.28)' : '#1E293B',
                overflow: 'hidden',
            }}
        >
            {(active || failed) && (
                <motion.div
                    initial={{ width: 0, opacity: 0.6 }}
                    animate={{ width: '100%', opacity: 1 }}
                    transition={{ duration: 0.25 }}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: failed ? '#EF4444' : color,
                        boxShadow: `0 0 12px ${failed ? '#EF4444' : color}`,
                    }}
                />
            )}
        </div>
    );
}

function BranchBar({ active, failed, color = '#38BDF8' }) {
    return (
        <div
            style={{
                position: 'relative',
                width: 2,
                height: 34,
                background: failed ? 'rgba(239,68,68,0.28)' : '#1E293B',
                overflow: 'hidden',
            }}
        >
            {(active || failed) && (
                <motion.div
                    initial={{ height: 0, opacity: 0.6 }}
                    animate={{ height: '100%', opacity: 1 }}
                    transition={{ duration: 0.25 }}
                    style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 0,
                        background: failed ? '#EF4444' : color,
                        boxShadow: `0 0 12px ${failed ? '#EF4444' : color}`,
                    }}
                />
            )}
        </div>
    );
}

export default function TopologyView({ latestEvent, systemSummary, componentStatuses }) {
    const [activeNodes, setActiveNodes] = useState([]);
    const dependency = inferPrimaryDependency(latestEvent);
    const backendStatus = componentStatuses?.backend || 'UNKNOWN';
    const databaseStatus = componentStatuses?.database || 'UNKNOWN';
    const storageStatus = componentStatuses?.storage || 'UNKNOWN';

    const targetStatus = dependency === 'storage' ? storageStatus : databaseStatus;
    const dependencyReachable = dependency && targetStatus === 'UP';
    const dependencyFailed = dependency && !dependencyReachable && targetStatus !== 'UNKNOWN';

    useEffect(() => {
        if (!latestEvent) {
            setActiveNodes([]);
            return;
        }

        const sequence = dependencyReachable
            ? ['frontend', 'proxy', 'backend', dependency, 'backend', 'proxy', 'frontend']
            : ['frontend', 'proxy', 'backend'];

        let index = 0;
        const intervalId = window.setInterval(() => {
            setActiveNodes(sequence.slice(0, index + 1));
            index += 1;

            if (index >= sequence.length) {
                window.clearInterval(intervalId);
                window.setTimeout(() => setActiveNodes([]), 350);
            }
        }, 150);

        return () => window.clearInterval(intervalId);
    }, [latestEvent?.id, dependency, dependencyReachable]);

    const requestLabel = useMemo(() => {
        if (!latestEvent) return 'Waiting for live API traffic.';
        const path = latestEvent.url || 'unknown endpoint';
        if (!dependency) return `Observed ${latestEvent.method} ${path}.`;
        if (dependencyReachable) {
            return `Observed ${latestEvent.method} ${path} and confirmed ${dependency} path as reachable.`;
        }
        if (dependencyFailed) {
            return `Observed ${latestEvent.method} ${path}; backend stayed online but the ${dependency} dependency is currently unavailable.`;
        }
        return `Observed ${latestEvent.method} ${path}; dependency reachability is not yet known.`;
    }, [dependency, dependencyFailed, dependencyReachable, latestEvent]);

    const nodes = {
        frontend: { id: 'frontend', label: 'Browser', icon: '💻', status: 'UP' },
        proxy: { id: 'proxy', label: 'Nginx', icon: '🔄', status: 'UP' },
        backend: { id: 'backend', label: 'Spring API', icon: '☕', status: backendStatus },
        database: { id: 'database', label: 'PostgreSQL', icon: '🗄️', status: databaseStatus },
        storage: { id: 'storage', label: 'Object Store', icon: '🪣', status: storageStatus },
    };

    const active = (nodeId) => activeNodes.includes(nodeId);

    return (
        <div
            style={{
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 10,
                padding: '18px 18px 16px',
                border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
            }}
        >
            <div style={{ fontSize: 9, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                Live Topology
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <NodeCard node={nodes.frontend} active={active('frontend')} />
                <LinkBar active={active('frontend') && active('proxy')} color="#38BDF8" />
                <NodeCard node={nodes.proxy} active={active('proxy')} />
                <LinkBar active={active('proxy') && active('backend')} color="#22C55E" />
                <NodeCard node={nodes.backend} active={active('backend')} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 112 }}>
                <BranchBar
                    active={dependency === 'database' && dependencyReachable && active('backend') && active('database')}
                    failed={dependency === 'database' && dependencyFailed}
                    color="#3B82F6"
                />
                <BranchBar
                    active={dependency === 'storage' && dependencyReachable && active('backend') && active('storage')}
                    failed={dependency === 'storage' && dependencyFailed}
                    color="#F59E0B"
                />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 54 }}>
                <NodeCard node={nodes.database} active={active('database')} />
                <NodeCard node={nodes.storage} active={active('storage')} />
            </div>

            <div style={{ color: '#94A3B8', fontSize: 10, lineHeight: 1.55 }}>
                {requestLabel}
                <div style={{ marginTop: 8, color: '#64748B' }}>
                    Dependency state is polled from the backend health summary. Protocol timings below this layer remain browser-observed or inferred.
                </div>
                {systemSummary?.generatedAt && (
                    <div style={{ marginTop: 6, color: '#475569', fontSize: 9 }}>
                        Last system probe: {new Date(systemSummary.generatedAt).toLocaleTimeString()}
                    </div>
                )}
            </div>
        </div>
    );
}
