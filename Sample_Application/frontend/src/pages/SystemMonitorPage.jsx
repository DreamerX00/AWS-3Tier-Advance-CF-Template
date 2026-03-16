import { useState } from 'react';
import { Box, Button, Card, Chip, Stack, Typography } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Download,
    PauseCircle,
    PlayCircle,
    RestartAlt,
} from '@mui/icons-material';
import { useOSIMonitor } from '../api/OSIMonitorContext';
import { KpiCard } from '../components/osi/OsiAtoms';
import AlertsView from '../components/osi/AlertsView';
import LayerStack from '../components/osi/LayerStack';
import MetricsCharts from '../components/osi/MetricsCharts';
import PacketFeed from '../components/osi/PacketFeed';
import PacketFlowVisualizer from '../components/osi/PacketFlowVisualizer';
import TopologyView from '../components/osi/TopologyView';
import WaterfallView from '../components/osi/WaterfallView';

const tabs = [
    { id: 'layers', label: 'Layers' },
    { id: 'flow', label: 'Flow' },
    { id: 'waterfall', label: 'Timeline' },
    { id: 'topology', label: 'Topology' },
    { id: 'packets', label: 'Audit Feed' },
    { id: 'metrics', label: 'Metrics' },
    { id: 'alerts', label: 'Alerts' },
];

export default function SystemMonitorPage() {
    const {
        events,
        metrics,
        isPaused,
        togglePause,
        clearLog,
        exportLog,
        systemSummary,
        systemAlerts,
        componentStatuses,
    } = useOSIMonitor();
    const [activeTab, setActiveTab] = useState('layers');
    const [methodFilter, setMethodFilter] = useState('ALL');

    const latestEvent = events[0];
    const allAlerts = [...systemAlerts, ...metrics.alerts];
    const unhealthyCount = Object.values(componentStatuses || {}).filter((status) => status === 'DOWN' || status === 'DEGRADED').length;

    return (
        <Box>
            <Box sx={{ mb: 3.5 }}>
                <Typography variant="h4" sx={{ mb: 0.75 }}>
                    System Monitor
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Dedicated observability workspace for live request telemetry, polled dependency health, inferred protocol timing, and alert inspection.
                </Typography>
            </Box>

            <Card sx={{ p: 3, mb: 3 }}>
                <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} justifyContent="space-between">
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                        <Chip
                            label={isPaused ? 'Capture Paused' : 'Live Capture Active'}
                            sx={{
                                bgcolor: isPaused ? 'rgba(245,158,11,0.14)' : 'rgba(34,197,94,0.14)',
                                color: isPaused ? '#FCD34D' : '#86EFAC',
                            }}
                        />
                        <Chip
                            label={`${allAlerts.length} active alerts`}
                            sx={{
                                bgcolor: allAlerts.length ? 'rgba(239,68,68,0.14)' : 'rgba(56,189,248,0.14)',
                                color: allAlerts.length ? '#FCA5A5' : '#7DD3FC',
                            }}
                        />
                        <Chip
                            label={`Dependencies: ${systemSummary?.status || 'UNKNOWN'}`}
                            sx={{
                                bgcolor: unhealthyCount ? 'rgba(245,158,11,0.14)' : 'rgba(34,197,94,0.14)',
                                color: unhealthyCount ? '#FCD34D' : '#86EFAC',
                            }}
                        />
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                        <Button startIcon={isPaused ? <PlayCircle /> : <PauseCircle />} variant="outlined" onClick={togglePause}>
                            {isPaused ? 'Resume' : 'Pause'}
                        </Button>
                        <Button startIcon={<RestartAlt />} variant="outlined" onClick={clearLog}>
                            Clear
                        </Button>
                        <Button startIcon={<Download />} variant="contained" onClick={exportLog}>
                            Export JSON
                        </Button>
                    </Stack>
                </Stack>
            </Card>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
                    gap: 2,
                    mb: 3,
                }}
            >
                <KpiCard label="Requests" value={metrics.totalRequests} sub={`${metrics.errorRate}% ERR`} color="#38BDF8" />
                <KpiCard label="Latency" value={`${metrics.avgLatency}ms`} sub={`P99 ${metrics.p99}ms`} color="#22C55E" />
                <KpiCard label="Dependencies" value={systemSummary?.status || 'UNKNOWN'} sub={`${unhealthyCount} unhealthy`} color="#F59E0B" />
            </Box>

            <Card sx={{ p: 1.5, mb: 3 }}>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                    {tabs.map((tab) => (
                        <Button
                            key={tab.id}
                            variant={activeTab === tab.id ? 'contained' : 'text'}
                            onClick={() => setActiveTab(tab.id)}
                            sx={{
                                minWidth: 120,
                                background: activeTab === tab.id ? 'linear-gradient(135deg, #0EA5E9 0%, #0F766E 100%)' : 'transparent',
                            }}
                        >
                            {tab.label}
                        </Button>
                    ))}
                </Stack>
            </Card>

            <Card sx={{ p: { xs: 2, md: 3 }, minHeight: 540 }}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.18 }}
                    >
                        {activeTab === 'layers' && <LayerStack latestEvent={latestEvent} />}
                        {activeTab === 'flow' && <PacketFlowVisualizer latestEvent={latestEvent} />}
                        {activeTab === 'waterfall' && <WaterfallView events={events} />}
                        {activeTab === 'topology' && (
                            <TopologyView
                                latestEvent={latestEvent}
                                systemSummary={systemSummary}
                                componentStatuses={componentStatuses}
                            />
                        )}
                        {activeTab === 'packets' && (
                            <PacketFeed
                                events={events}
                                methodFilter={methodFilter}
                                setMethodFilter={setMethodFilter}
                            />
                        )}
                        {activeTab === 'metrics' && <MetricsCharts metrics={metrics} />}
                        {activeTab === 'alerts' && <AlertsView alerts={allAlerts} />}
                    </motion.div>
                </AnimatePresence>
            </Card>
        </Box>
    );
}
