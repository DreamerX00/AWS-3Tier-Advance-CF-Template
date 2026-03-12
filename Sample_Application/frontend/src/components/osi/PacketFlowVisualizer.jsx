import React, { useState, useRef, useEffect } from 'react';
import { LAYER_META, MonoBadge } from './OsiAtoms';

export default function PacketFlowVisualizer({ latestEvent }) {
    const [flowStep, setFlowStep] = useState(-1);
    const [flowDir, setFlowDir] = useState('down');

    useEffect(() => {
        if (!latestEvent) return;
        setFlowDir('down');
        setFlowStep(0);
        let step = 0;
        const goDown = setInterval(() => {
            step++;
            setFlowStep(step);
            if (step >= LAYER_META.length - 1) {
                clearInterval(goDown);
                setTimeout(() => {
                    setFlowDir('up');
                    setFlowStep(LAYER_META.length - 1);
                    let upStep = LAYER_META.length - 1;
                    const goUp = setInterval(() => {
                        upStep--;
                        setFlowStep(upStep);
                        if (upStep <= 0) {
                            clearInterval(goUp);
                            setTimeout(() => setFlowStep(-1), 400);
                        }
                    }, 80);
                }, Math.max(0, latestEvent.timeline?.ttfb || 200)); 
            }
        }, 80);
        return () => clearInterval(goDown);
    }, [latestEvent?.id]);

    const nodeH = 22;
    const gap = 8;
    const svgH = LAYER_META.length * (nodeH + gap) + 10;

    return (
        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 9, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Packet Flow</div>
                {flowStep >= 0 && (
                    <MonoBadge color={flowDir === 'down' ? '#6C63FF' : '#10B981'}>
                        {flowDir === 'down' ? `↓ REQ ${latestEvent?.requestSize}B` : `↑ RES ${latestEvent?.responseSize}B`}
                    </MonoBadge>
                )}
            </div>
            
            <svg width="100%" height={svgH} viewBox={`0 0 240 ${svgH}`} style={{ display: 'block' }}>
                {LAYER_META.map((layer, i) => {
                    const y = i * (nodeH + gap) + 5;
                    const isActive = flowStep === i;
                    const isPassed = flowDir === 'down' ? flowStep > i : flowStep < i;

                    return (
                        <g key={layer.id}>
                            {i < LAYER_META.length - 1 && (
                                <line x1={120} y1={y + nodeH} x2={120} y2={y + nodeH + gap} stroke={isPassed || isActive ? layer.color : '#1E293B'} strokeWidth={2} style={{ transition: 'stroke 0.15s' }} />
                            )}
                            {isActive && flowStep < LAYER_META.length - 1 && (
                                <circle cx={120} cy={y + nodeH + gap / 2} r={4} fill={flowDir === 'down' ? '#6C63FF' : '#10B981'}>
                                    <animate attributeName="cy" from={y + nodeH} to={y + nodeH + gap} dur="0.08s" fill="freeze" />
                                </circle>
                            )}
                            <rect x={40} y={y} width={160} height={nodeH} rx={4} fill={isActive ? `${layer.color}33` : isPassed ? `${layer.color}12` : '#0F172A'} stroke={isActive ? layer.color : isPassed ? `${layer.color}44` : '#1E293B'} strokeWidth={isActive ? 1.5 : 1} style={{ transition: 'all 0.15s' }} />
                            <text x={60} y={y + 14} fontSize={9} fill={isActive ? layer.color : '#475569'} style={{ transition: 'fill 0.15s' }}>{layer.id}</text>
                            <text x={80} y={y + 14} fontSize={9} fill={isActive ? '#F1F5F9' : '#64748B'} fontWeight={isActive ? 600 : 400} style={{ transition: 'fill 0.15s' }}>{layer.label}</text>
                            {isActive && <circle cx={184} cy={y + nodeH / 2} r={3} fill={flowDir === 'down' ? '#6C63FF' : '#10B981'} />}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}
