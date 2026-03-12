import { useState, useEffect } from 'react';
import {
    Box, Card, Typography, Chip, CircularProgress, FormControl,
    InputLabel, Select, MenuItem, IconButton, Tooltip,
} from '@mui/material';
import { Refresh, History } from '@mui/icons-material';
import { motion } from 'framer-motion';
import api from '../api/axiosClient';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const actionColors = {
    CREATE: { bg: 'rgba(16,185,129,0.15)', color: '#10B981', icon: '➕' },
    UPDATE: { bg: 'rgba(59,130,246,0.15)', color: '#3B82F6', icon: '✏️' },
    PATCH: { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B', icon: '🔧' },
    DELETE: { bg: 'rgba(239,68,68,0.15)', color: '#EF4444', icon: '🗑️' },
};

const entityColors = {
    User: '#6C63FF', Marksheet: '#F59E0B', Note: '#10B981',
    Task: '#3B82F6', Product: '#EF4444', Event: '#FF6B9D',
    File: '#8B5CF6', Notification: '#EC4899',
};

export default function AuditLogPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [entityFilter, setEntityFilter] = useState('');
    const [actionFilter, setActionFilter] = useState('');

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = {};
            if (entityFilter) params.entityType = entityFilter;
            if (actionFilter) params.action = actionFilter;
            const res = await api.get('/audit', { params });
            setLogs(res.data);
        } catch (err) {
            toast.error('Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLogs(); }, [entityFilter, actionFilter]);

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" sx={{
                    background: 'linear-gradient(135deg, #F97316, #F9731699)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                    Audit Log
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Activity trail — CloudWatch Logs simulation for all CRUD operations
                </Typography>
            </Box>

            {/* Filters */}
            <Card sx={{ p: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Entity Type</InputLabel>
                        <Select value={entityFilter} label="Entity Type"
                            onChange={(e) => setEntityFilter(e.target.value)}>
                            <MenuItem value="">All Entities</MenuItem>
                            {Object.keys(entityColors).map((e) => (
                                <MenuItem key={e} value={e}>{e}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 130 }}>
                        <InputLabel>Action</InputLabel>
                        <Select value={actionFilter} label="Action"
                            onChange={(e) => setActionFilter(e.target.value)}>
                            <MenuItem value="">All Actions</MenuItem>
                            <MenuItem value="CREATE">Create</MenuItem>
                            <MenuItem value="UPDATE">Update</MenuItem>
                            <MenuItem value="PATCH">Patch</MenuItem>
                            <MenuItem value="DELETE">Delete</MenuItem>
                        </Select>
                    </FormControl>
                    <Box sx={{ flex: 1 }} />
                    <Chip label={`${logs.length} entries`} size="small"
                        sx={{ bgcolor: 'rgba(249,115,22,0.15)', color: '#F97316', fontWeight: 600 }} />
                    <Tooltip title="Refresh">
                        <IconButton onClick={fetchLogs} sx={{ color: 'text.secondary' }}>
                            <Refresh />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Card>

            {/* Activity Feed */}
            <Card sx={{ p: 0 }}>
                {loading ? (
                    <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
                        <CircularProgress sx={{ color: '#F97316' }} />
                    </Box>
                ) : logs.length === 0 ? (
                    <Box sx={{ py: 8, textAlign: 'center' }}>
                        <History sx={{ fontSize: 48, color: 'rgba(255,255,255,0.1)', mb: 1 }} />
                        <Typography color="text.secondary" variant="h6">No audit entries</Typography>
                        <Typography color="text.secondary" variant="body2">
                            Perform CRUD operations on any page to see activity here
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ position: 'relative', pl: 4 }}>
                        {/* Timeline line */}
                        <Box sx={{
                            position: 'absolute', left: 23, top: 0, bottom: 0, width: 2,
                            bgcolor: 'rgba(255,255,255,0.06)',
                        }} />

                        {logs.map((log, i) => {
                            const ac = actionColors[log.action] || actionColors.CREATE;
                            const ec = entityColors[log.entityType] || '#94A3B8';

                            return (
                                <motion.div
                                    key={log.id || i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                >
                                    <Box sx={{
                                        display: 'flex', gap: 2, p: 2, pl: 3,
                                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                                        position: 'relative',
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
                                    }}>
                                        {/* Timeline dot */}
                                        <Box sx={{
                                            position: 'absolute', left: -5.5, top: 24,
                                            width: 12, height: 12, borderRadius: '50%',
                                            bgcolor: ac.color, border: '2px solid #111827',
                                            boxShadow: `0 0 8px ${ac.color}`,
                                        }} />

                                        <Box sx={{ flex: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                <Typography variant="body2" sx={{ fontSize: '1rem' }}>{ac.icon}</Typography>
                                                <Chip label={log.action} size="small"
                                                    sx={{ bgcolor: ac.bg, color: ac.color, fontWeight: 600, fontSize: '0.7rem' }} />
                                                <Chip label={log.entityType} size="small" variant="outlined"
                                                    sx={{ borderColor: `${ec}44`, color: ec, fontSize: '0.7rem' }} />
                                                {log.entityId && (
                                                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                                                        #{log.entityId}
                                                    </Typography>
                                                )}
                                            </Box>
                                            {log.details && (
                                                <Typography variant="caption" color="text.secondary">{log.details}</Typography>
                                            )}
                                        </Box>

                                        <Box sx={{ textAlign: 'right', minWidth: 100 }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                                {log.timestamp ? dayjs(log.timestamp).fromNow() : ''}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                                                {log.timestamp ? dayjs(log.timestamp).format('HH:mm:ss') : ''}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </motion.div>
                            );
                        })}
                    </Box>
                )}
            </Card>
        </Box>
    );
}
