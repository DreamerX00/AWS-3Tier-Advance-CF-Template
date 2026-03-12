import { useState, useEffect } from 'react';
import {
    Box, Card, Typography, Grid, Chip, CircularProgress,
    LinearProgress, IconButton, Tooltip,
} from '@mui/material';
import {
    People, School, StickyNote2, TaskAlt, Inventory2, Event,
    CloudUpload, Notifications, ShowChart, Refresh, CheckCircle,
    TrendingUp,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, PieChart, Pie, Tooltip as RechartsTooltip } from 'recharts';
import api from '../api/axiosClient';
import toast from 'react-hot-toast';

const MotionCard = motion.create(Card);

const entityConfig = [
    { key: 'users', label: 'Users', icon: <People />, color: '#6C63FF', gradient: 'linear-gradient(135deg, #6C63FF33, #6C63FF11)' },
    { key: 'marksheets', label: 'Marksheets', icon: <School />, color: '#F59E0B', gradient: 'linear-gradient(135deg, #F59E0B33, #F59E0B11)' },
    { key: 'notes', label: 'Notes', icon: <StickyNote2 />, color: '#10B981', gradient: 'linear-gradient(135deg, #10B98133, #10B98111)' },
    { key: 'tasks', label: 'Tasks', icon: <TaskAlt />, color: '#3B82F6', gradient: 'linear-gradient(135deg, #3B82F633, #3B82F611)' },
    { key: 'products', label: 'Products', icon: <Inventory2 />, color: '#EF4444', gradient: 'linear-gradient(135deg, #EF444433, #EF444411)' },
    { key: 'events', label: 'Events', icon: <Event />, color: '#FF6B9D', gradient: 'linear-gradient(135deg, #FF6B9D33, #FF6B9D11)' },
    { key: 'files', label: 'Files', icon: <CloudUpload />, color: '#8B5CF6', gradient: 'linear-gradient(135deg, #8B5CF633, #8B5CF611)' },
    { key: 'notifications', label: 'Notifications', icon: <Notifications />, color: '#EC4899', gradient: 'linear-gradient(135deg, #EC489933, #EC489911)' },
];

export default function DashboardPage() {
    const [stats, setStats] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);
    const [healthStatus, setHealthStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, auditRes, healthRes] = await Promise.allSettled([
                api.get('/dashboard/stats'),
                api.get('/audit'),
                api.get('/health'),
            ]);
            if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
            if (auditRes.status === 'fulfilled') setAuditLogs(auditRes.value.data.slice(0, 10));
            if (healthRes.status === 'fulfilled') setHealthStatus(healthRes.value.data);
        } catch (err) {
            toast.error('Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 10 }}>
                <CircularProgress sx={{ color: '#6C63FF' }} />
            </Box>
        );
    }

    const counts = stats?.counts || {};
    const chartData = entityConfig.map((e) => ({ name: e.label, count: counts[e.key] || 0, color: e.color }));
    const pieData = chartData.filter((d) => d.count > 0);
    const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);

    const actionColors = { CREATE: '#10B981', UPDATE: '#3B82F6', PATCH: '#F59E0B', DELETE: '#EF4444' };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h4" sx={{
                        background: 'linear-gradient(135deg, #6C63FF, #FF6B9D)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>
                        Dashboard
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        System overview & real-time metrics — CloudWatch ready
                    </Typography>
                </Box>
                <Tooltip title="Refresh">
                    <IconButton onClick={fetchData} sx={{ color: 'text.secondary' }}><Refresh /></IconButton>
                </Tooltip>
            </Box>

            {/* Health + Total Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <MotionCard initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
                        sx={{ p: 3, background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <CheckCircle sx={{ color: '#10B981', fontSize: 40 }} />
                            <Box>
                                <Typography variant="h5" sx={{ fontWeight: 700, color: '#10B981' }}>
                                    {healthStatus?.status || 'HEALTHY'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">System Status</Typography>
                            </Box>
                        </Box>
                    </MotionCard>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <MotionCard initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        sx={{ p: 3, background: 'linear-gradient(135deg, rgba(108,99,255,0.15), rgba(108,99,255,0.05))', border: '1px solid rgba(108,99,255,0.2)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <TrendingUp sx={{ color: '#6C63FF', fontSize: 40 }} />
                            <Box>
                                <Typography variant="h5" sx={{ fontWeight: 700, color: '#6C63FF' }}>
                                    {totalRecords}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">Total Records</Typography>
                            </Box>
                        </Box>
                    </MotionCard>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <MotionCard initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        sx={{ p: 3, background: 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(236,72,153,0.05))', border: '1px solid rgba(236,72,153,0.2)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Notifications sx={{ color: '#EC4899', fontSize: 40 }} />
                            <Box>
                                <Typography variant="h5" sx={{ fontWeight: 700, color: '#EC4899' }}>
                                    {stats?.unreadNotifications || 0}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">Unread Notifications</Typography>
                            </Box>
                        </Box>
                    </MotionCard>
                </Grid>
            </Grid>

            {/* Entity Count Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {entityConfig.map((entity, i) => (
                    <Grid size={{ xs: 6, sm: 3 }} key={entity.key}>
                        <MotionCard
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.05 * i }}
                            sx={{ p: 2, background: entity.gradient, border: `1px solid ${entity.color}22`, textAlign: 'center' }}
                        >
                            <Box sx={{ color: entity.color, mb: 1 }}>{entity.icon}</Box>
                            <Typography variant="h5" sx={{ fontWeight: 700, color: entity.color }}>
                                {counts[entity.key] || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">{entity.label}</Typography>
                        </MotionCard>
                    </Grid>
                ))}
            </Grid>

            {/* Charts Row */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 8 }}>
                    <Card sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Records by Entity</Typography>
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                                <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} />
                                <RechartsTooltip
                                    contentStyle={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                                    labelStyle={{ color: '#F1F5F9' }}
                                />
                                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                    {chartData.map((entry, i) => (
                                        <Cell key={i} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Distribution</Typography>
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        dataKey="count"
                                        nameKey="name"
                                        cx="50%" cy="50%"
                                        innerRadius={50} outerRadius={90}
                                        paddingAngle={3}
                                    >
                                        {pieData.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <Box sx={{ py: 8, textAlign: 'center' }}>
                                <Typography color="text.secondary" variant="body2">No data yet</Typography>
                            </Box>
                        )}
                    </Card>
                </Grid>
            </Grid>

            {/* Recent Activity */}
            <Card sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    <ShowChart sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
                    Recent Activity
                </Typography>
                {auditLogs.length === 0 ? (
                    <Typography color="text.secondary" variant="body2">
                        No activity yet — create some records to see the audit log here
                    </Typography>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {auditLogs.map((log, i) => (
                            <motion.div key={log.id || i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                                <Box sx={{
                                    display: 'flex', alignItems: 'center', gap: 2, p: 1.5,
                                    borderRadius: 2, bgcolor: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.04)',
                                }}>
                                    <Chip
                                        label={log.action}
                                        size="small"
                                        sx={{
                                            bgcolor: `${actionColors[log.action] || '#94A3B8'}22`,
                                            color: actionColors[log.action] || '#94A3B8',
                                            fontWeight: 600, fontSize: '0.7rem', minWidth: 70,
                                        }}
                                    />
                                    <Typography variant="body2" sx={{ flex: 1 }}>
                                        <strong>{log.entityType}</strong> {log.entityId ? `#${log.entityId}` : ''}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}
                                    </Typography>
                                </Box>
                            </motion.div>
                        ))}
                    </Box>
                )}
            </Card>
        </Box>
    );
}
