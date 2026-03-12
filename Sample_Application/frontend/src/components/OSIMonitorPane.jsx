import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOSIMonitor } from '../api/OSIMonitorContext';

// Import all refactored OSI components
import { KpiCard } from './osi/OsiAtoms';
import LayerStack from './osi/LayerStack';
import PacketFlowVisualizer from './osi/PacketFlowVisualizer';
import PacketFeed from './osi/PacketFeed';
import MetricsCharts from './osi/MetricsCharts';
import WaterfallView from './osi/WaterfallView';
import TopologyView from './osi/TopologyView';
import AlertsView from './osi/AlertsView';

export default function OSIMonitorPane() {
    const { events, metrics, isPaused, isOpen, setIsOpen, togglePause, clearLog, exportLog } = useOSIMonitor();
    const [activeTab, setActiveTab] = useState('layers');
    const [methodFilter, setMethodFilter] = useState('ALL');

    const latestEvent = events[0];

    const tabs = [
        { id: 'layers', label: 'Layers', icon: '📡' },
        { id: 'flow', label: 'Flow', icon: '🌊' },
        { id: 'waterfall', label: 'Timeline', icon: '⏱️' },
        { id: 'topology', label: 'Topology', icon: '🗺️' },
        { id: 'packets', label: 'Audit', icon: '📝' },
        { id: 'metrics', label: 'Metrics', icon: '📈' },
        { id: 'alerts', label: `Alerts ${metrics.alerts.length ? '🛑' : ''}`, icon: '🚨' },
    ];

    return (
        <>
            {/* The Floating Toggle Button */}
            <motion.button
                initial={false}
                animate={{ right: isOpen ? 420 : 20 }}
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'fixed', bottom: 20, zIndex: 9999,
                    width: 48, height: 48, borderRadius: 24,
                    background: metrics.alerts.length > 0 ? '#EF4444' : isOpen ? '#1E293B' : '#6C63FF',
                    color: 'white', border: '2px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, transition: 'background 0.3s'
                }}
            >
                {isOpen ? '✕' : metrics.alerts.length > 0 ? '🚨' : '📡'}
                {!isOpen && latestEvent && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: [1, 1.5, 0], opacity: [1, 0] }} transition={{ duration: 0.8 }}
                        style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: '2px solid #6C63FF' }} />
                )}
            </motion.button>

            {/* The Main Pane */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ x: 400, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 400, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        style={{
                            position: 'fixed', top: 0, right: 0, width: 400, height: '100vh',
                            background: 'rgba(5, 8, 16, 0.85)', backdropFilter: 'blur(20px)',
                            borderLeft: '1px solid rgba(255,255,255,0.08)', zIndex: 9998,
                            boxShadow: '-10px 0 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column',
                            color: '#F8FAFC', padding: 20, boxSizing: 'border-box'
                        }}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, background: 'linear-gradient(to right, #6C63FF, #06B6D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '0.05em' }}>
                                    NEXUS OSI CORE
                                </h2>
                                <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'monospace', marginTop: 2 }}>
                                    {isPaused ? '⏸ CAPTURE PAUSED' : '▶ LIVE CAPTURE ACTIVE'}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={togglePause} title="Pause/Resume Capture" style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: 'none', color: '#CBD5E1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {isPaused ? '▶' : '⏸'}
                                </button>
                                <button onClick={clearLog} title="Clear Data" style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: 'none', color: '#CBD5E1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🗑</button>
                                <button onClick={exportLog} title="Export JSON" style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: 'none', color: '#CBD5E1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⬇</button>
                            </div>
                        </div>

                        {/* KPIs */}
                        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                            <KpiCard label="Requests" value={metrics.totalRequests} sub={`${metrics.errorRate}% ERR`} color="#6C63FF" />
                            <KpiCard label="Avg Latency" value={`${metrics.avgLatency}ms`} sub={`P99 ${metrics.p99}ms`} color="#10B981" />
                            <KpiCard label="Bandwidth" value={`${(metrics.totalBytesIn / 1024).toFixed(1)}k`} sub="INBOUND KB" color="#F59E0B" />
                        </div>

                        {/* Tabs */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginBottom: 16 }}>
                            {tabs.slice(0, 4).map(tab => (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                                    padding: '6px 4px', borderRadius: 6, fontSize: 10, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                                    background: activeTab === tab.id ? 'rgba(108, 99, 255, 0.15)' : 'transparent',
                                    color: activeTab === tab.id ? '#6C63FF' : '#64748B', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
                                }}>
                                    <span style={{ fontSize: 14 }}>{tab.icon}</span>
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: 16 }}>
                            {tabs.slice(4).map(tab => (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                                    padding: '6px 4px', borderRadius: 6, fontSize: 10, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                                    background: activeTab === tab.id ? 'rgba(108, 99, 255, 0.15)' : 'transparent',
                                    color: activeTab === tab.id ? '#6C63FF' : '#64748B', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
                                }}>
                                    <span style={{ fontSize: 14 }}>{tab.icon}</span>
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Content Area */}
                        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', position: 'relative' }}>
                            <AnimatePresence mode="wait">
                                <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} style={{ paddingBottom: 20 }}>
                                    {activeTab === 'layers' && <LayerStack latestEvent={latestEvent} />}
                                    {activeTab === 'flow' && <PacketFlowVisualizer latestEvent={latestEvent} />}
                                    {activeTab === 'waterfall' && <WaterfallView events={events} />}
                                    {activeTab === 'topology' && <TopologyView latestEvent={latestEvent} />}
                                    {activeTab === 'packets' && <PacketFeed events={events} methodFilter={methodFilter} setMethodFilter={setMethodFilter} />}
                                    {activeTab === 'metrics' && <MetricsCharts metrics={metrics} />}
                                    {activeTab === 'alerts' && <AlertsView alerts={metrics.alerts} />}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
