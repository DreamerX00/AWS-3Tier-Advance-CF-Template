import React from 'react';

export const LAYER_META = [
    { id: 'L7', label: 'Application',  sublabel: 'HTTP / REST',         color: '#6C63FF', icon: '🌐' },
    { id: 'L6', label: 'Presentation', sublabel: 'TLS / Encoding',      color: '#FF6B9D', icon: '🔐' },
    { id: 'L5', label: 'Session',      sublabel: 'Session Management',   color: '#F59E0B', icon: '🤝' },
    { id: 'L4', label: 'Transport',    sublabel: 'TCP / Segments',       color: '#10B981', icon: '📦' },
    { id: 'L3', label: 'Network',      sublabel: 'IP / Routing',         color: '#3B82F6', icon: '🛰️'  },
    { id: 'L2', label: 'Data Link',    sublabel: 'Ethernet / MAC',       color: '#8B5CF6', icon: '🔗' },
    { id: 'L1', label: 'Physical',     sublabel: 'Fiber / Signal',       color: '#06B6D4', icon: '⚡' },
];

export const METHOD_COLORS = {
    GET: '#10B981', POST: '#6C63FF', PUT: '#F59E0B', PATCH: '#FF6B9D',
    DELETE: '#EF4444', HEAD: '#94A3B8', OPTIONS: '#06B6D4',
};

export const STATUS_COLORS = {
    '2xx': '#10B981', '3xx': '#F59E0B', '4xx': '#FF6B9D', '5xx': '#EF4444',
};

export function statusColor(s) {
    if (s >= 200 && s < 300) return '#10B981';
    if (s >= 300 && s < 400) return '#F59E0B';
    if (s >= 400 && s < 500) return '#FF6B9D';
    if (s >= 500) return '#EF4444';
    return '#94A3B8';
}

export const MonoBadge = ({ children, color = '#6C63FF', style = {} }) => (
    <span style={{
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        fontSize: 10,
        padding: '1px 6px',
        borderRadius: 4,
        background: `${color}22`,
        color,
        border: `1px solid ${color}44`,
        letterSpacing: '0.03em',
        whiteSpace: 'nowrap',
        ...style,
    }}>
        {children}
    </span>
);

export const KpiCard = ({ label, value, sub, color }) => (
    <div style={{
        flex: 1,
        background: `linear-gradient(135deg, ${color}18 0%, ${color}08 100%)`,
        border: `1px solid ${color}33`,
        borderRadius: 10,
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        minWidth: 0,
    }}>
        <div style={{ fontSize: 9, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            {label}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {value}
        </div>
        {sub && <div style={{ fontSize: 9, color: '#64748B' }}>{sub}</div>}
    </div>
);

export const PulsingDot = ({ color, active = false }) => (
    <span style={{ position: 'relative', display: 'inline-block', width: 10, height: 10, flexShrink: 0 }}>
        <span style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: color, opacity: active ? 1 : 0.3,
        }} />
        {active && (
            <span style={{
                position: 'absolute', inset: -3, borderRadius: '50%',
                border: `2px solid ${color}`,
                animation: 'osiPing 1s ease-out infinite',
            }} />
        )}
    </span>
);
