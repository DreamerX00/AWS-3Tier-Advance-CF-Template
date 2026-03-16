import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Button, Card, Typography, Grid, Chip, CircularProgress,
    IconButton, Stack, Tooltip,
} from '@mui/material';
import {
    People, School, StickyNote2, TaskAlt, Inventory2, Event,
    CloudUpload, Notifications, ShowChart, Refresh, CheckCircle,
    TrendingUp, ArrowOutward, WarningAmber,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, PieChart, Pie, Tooltip as RechartsTooltip } from 'recharts';
import api, { getApiErrorMessages } from '../api/axiosClient';
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
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await api.get('/dashboard/summary');
            setSummary(response.data);
        } catch (err) {
            toast.error(getApiErrorMessages(err)[0]);
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

    const counts = summary?.counts || {};
    const chartData = entityConfig.map((e) => ({ name: e.label, count: counts[e.key] || 0, color: e.color }));
    const pieData = chartData.filter((d) => d.count > 0);
    const totalRecords = summary?.totalRecords || 0;
    const activityItems = summary?.activity?.items || [];
    const attentionItems = [
        summary?.unreadNotifications
            ? { label: 'Unread notifications need review', value: summary.unreadNotifications, path: '/operations/notifications', color: '#EC4899' }
            : null,
        summary?.storage?.totalFiles
            ? { label: 'Storage objects currently tracked', value: summary.storage.totalFiles, path: '/storage/files', color: '#A855F7' }
            : null,
        summary?.activity?.actionBreakdown?.DELETE
            ? { label: 'Recent delete operations detected', value: summary.activity.actionBreakdown.DELETE, path: '/activity/audit', color: '#EF4444' }
            : null,
    ].filter(Boolean);
    const quickActions = [
        { label: 'Review tasks', path: '/operations/tasks', helper: 'Move work forward', color: '#3B82F6' },
        { label: 'Open storage', path: '/storage/files', helper: 'Inspect uploads and metadata', color: '#A855F7' },
        { label: 'Audit activity', path: '/activity/audit', helper: 'Trace recent system changes', color: '#F59E0B' },
        { label: 'System health', path: '/system/health', helper: 'Check stack readiness', color: '#22C55E' },
    ];

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
                        Overview
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Decision-first summary for operations, storage, activity, and system state
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
                                    {summary?.status || 'UP'}
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
                                    {summary?.unreadNotifications || 0}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">Unread Notifications</Typography>
                            </Box>
                        </Box>
                    </MotionCard>
                </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, lg: 7 }}>
                    <Card sx={{ p: 3, height: '100%' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                    Quick Actions
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Jump directly into the most important operational workspaces.
                                </Typography>
                            </Box>
                        </Stack>
                        <Grid container spacing={1.5}>
                            {quickActions.map((action) => (
                                <Grid key={action.path} size={{ xs: 12, sm: 6 }}>
                                    <Card
                                        sx={{
                                            p: 2,
                                            cursor: 'pointer',
                                            border: `1px solid ${action.color}33`,
                                            background: `linear-gradient(135deg, ${action.color}1A, rgba(15,23,42,0.72))`,
                                        }}
                                        onClick={() => navigate(action.path)}
                                    >
                                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                                            <Box>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                                    {action.label}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {action.helper}
                                                </Typography>
                                            </Box>
                                            <ArrowOutward sx={{ color: action.color }} />
                                        </Stack>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, lg: 5 }}>
                    <Card sx={{ p: 3, height: '100%' }}>
                        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2 }}>
                            <WarningAmber sx={{ color: '#F59E0B' }} />
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                    Attention Queue
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Signals worth checking before they turn into issues.
                                </Typography>
                            </Box>
                        </Stack>
                        {attentionItems.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                                No immediate attention signals from the current summary window.
                            </Typography>
                        ) : (
                            <Stack spacing={1.25}>
                                {attentionItems.map((item) => (
                                    <Box
                                        key={item.label}
                                        onClick={() => navigate(item.path)}
                                        sx={{
                                            p: 1.5,
                                            borderRadius: 2,
                                            cursor: 'pointer',
                                            border: `1px solid ${item.color}33`,
                                            bgcolor: `${item.color}12`,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: 2,
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {item.label}
                                        </Typography>
                                        <Chip label={item.value} size="small" sx={{ bgcolor: `${item.color}22`, color: item.color }} />
                                    </Box>
                                ))}
                            </Stack>
                        )}
                    </Card>
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
                {activityItems.length === 0 ? (
                    <Typography color="text.secondary" variant="body2">
                        No activity yet — create some records to see the audit log here
                    </Typography>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {activityItems.map((log, i) => (
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
