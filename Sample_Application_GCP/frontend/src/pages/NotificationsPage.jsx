import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
    Box,
    Button,
    Card,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    Grid,
    IconButton,
    InputAdornment,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    Add,
    Drafts,
    MarkEmailRead,
    MarkEmailUnread,
    Refresh,
    Search,
    Send,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import api, { getApiErrorMessages } from '../api/axiosClient';

const statusMeta = {
    PENDING: { color: '#94A3B8', bg: 'rgba(148,163,184,0.14)', label: 'Pending' },
    SENT: { color: '#10B981', bg: 'rgba(16,185,129,0.14)', label: 'Sent' },
    FAILED: { color: '#EF4444', bg: 'rgba(239,68,68,0.14)', label: 'Failed' },
    DELIVERED: { color: '#38BDF8', bg: 'rgba(56,189,248,0.14)', label: 'Delivered' },
};

const typeMeta = {
    EMAIL: { color: '#38BDF8', bg: 'rgba(56,189,248,0.14)' },
    SMS: { color: '#10B981', bg: 'rgba(16,185,129,0.14)' },
    PUSH: { color: '#F59E0B', bg: 'rgba(245,158,11,0.14)' },
    WEBHOOK: { color: '#A855F7', bg: 'rgba(168,85,247,0.14)' },
};

const emptyNotification = {
    title: '',
    message: '',
    type: 'EMAIL',
    recipient: '',
    priority: 'NORMAL',
    channel: '',
};

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingNotification, setEditingNotification] = useState(null);
    const [formData, setFormData] = useState(emptyNotification);
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const response = await api.get('/notifications');
            setNotifications(response.data);
        } catch (error) {
            toast.error(getApiErrorMessages(error)[0]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const filteredNotifications = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return notifications.filter((notification) => {
            const matchesStatus = statusFilter ? notification.status === statusFilter : true;
            const matchesType = typeFilter ? notification.type === typeFilter : true;
            const haystack = [
                notification.title,
                notification.message,
                notification.recipient,
                notification.channel,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            const matchesQuery = normalizedQuery ? haystack.includes(normalizedQuery) : true;
            return matchesStatus && matchesType && matchesQuery;
        });
    }, [notifications, query, statusFilter, typeFilter]);

    const summary = useMemo(() => {
        return {
            total: filteredNotifications.length,
            unread: filteredNotifications.filter((item) => !item.isRead).length,
            failed: filteredNotifications.filter((item) => item.status === 'FAILED').length,
            urgent: filteredNotifications.filter((item) => item.priority === 'URGENT').length,
        };
    }, [filteredNotifications]);

    const openCompose = () => {
        setEditingNotification(null);
        setFormData(emptyNotification);
        setDialogOpen(true);
    };

    const openEdit = (notification) => {
        setEditingNotification(notification);
        setFormData({
            title: notification.title ?? '',
            message: notification.message ?? '',
            type: notification.type ?? 'EMAIL',
            recipient: notification.recipient ?? '',
            priority: notification.priority ?? 'NORMAL',
            channel: notification.channel ?? '',
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        try {
            if (editingNotification) {
                await api.put(`/notifications/${editingNotification.id}`, {
                    ...editingNotification,
                    ...formData,
                });
                toast.success('Notification updated');
            } else {
                await api.post('/notifications/send', formData);
                toast.success('Notification queued and sent');
            }
            setDialogOpen(false);
            await fetchNotifications();
        } catch (error) {
            toast.error(getApiErrorMessages(error)[0]);
        }
    };

    const toggleRead = async (notification) => {
        try {
            const endpoint = notification.isRead
                ? `/notifications/${notification.id}/unread`
                : `/notifications/${notification.id}/read`;
            await api.patch(endpoint);
            setNotifications((current) =>
                current.map((item) =>
                    item.id === notification.id
                        ? { ...item, isRead: !notification.isRead }
                        : item
                )
            );
        } catch (error) {
            toast.error(getApiErrorMessages(error)[0]);
        }
    };

    return (
        <Box>
            <Box sx={{ mb: 3.5, display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                <Box>
                    <Typography variant="h4" sx={{ mb: 0.75 }}>
                        Delivery Workspace
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Monitor message flow, unread backlog, and high-priority delivery events across communication channels.
                    </Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <Button variant="outlined" startIcon={<Refresh />} onClick={fetchNotifications}>
                        Refresh
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<Send />}
                        onClick={openCompose}
                        sx={{ background: 'linear-gradient(135deg, #EC4899 0%, #F97316 100%)' }}
                    >
                        Compose
                    </Button>
                </Stack>
            </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <Card sx={{ p: 2.5 }}>
                        <Typography variant="overline" color="text.secondary">Visible Messages</Typography>
                        <Typography variant="h4" sx={{ mt: 0.75, fontWeight: 800 }}>{summary.total}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Notifications in the current delivery view.
                        </Typography>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <Card sx={{ p: 2.5 }}>
                        <Typography variant="overline" color="text.secondary">Unread</Typography>
                        <Typography variant="h4" sx={{ mt: 0.75, fontWeight: 800 }}>{summary.unread}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Messages still awaiting review or acknowledgment.
                        </Typography>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <Card sx={{ p: 2.5 }}>
                        <Typography variant="overline" color="text.secondary">Failed</Typography>
                        <Typography variant="h4" sx={{ mt: 0.75, fontWeight: 800, color: summary.failed ? '#EF4444' : 'inherit' }}>
                            {summary.failed}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Deliveries requiring retry or operational intervention.
                        </Typography>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <Card sx={{ p: 2.5 }}>
                        <Typography variant="overline" color="text.secondary">Urgent</Typography>
                        <Typography variant="h4" sx={{ mt: 0.75, fontWeight: 800, color: summary.urgent ? '#F97316' : 'inherit' }}>
                            {summary.urgent}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Highest-priority notifications in the current queue.
                        </Typography>
                    </Card>
                </Grid>
            </Grid>

            <Card sx={{ p: 2.5, mb: 3 }}>
                <Stack direction={{ xs: 'column', xl: 'row' }} spacing={2}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Search title, message, recipient, or channel"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search sx={{ color: 'text.secondary' }} />
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />
                    <FormControl size="small" sx={{ minWidth: { xs: '100%', xl: 180 } }}>
                        <InputLabel>Status</InputLabel>
                        <Select value={statusFilter} label="Status" onChange={(event) => setStatusFilter(event.target.value)}>
                            <MenuItem value="">All Statuses</MenuItem>
                            {Object.keys(statusMeta).map((status) => (
                                <MenuItem key={status} value={status}>{statusMeta[status].label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: { xs: '100%', xl: 180 } }}>
                        <InputLabel>Channel Type</InputLabel>
                        <Select value={typeFilter} label="Channel Type" onChange={(event) => setTypeFilter(event.target.value)}>
                            <MenuItem value="">All Types</MenuItem>
                            {Object.keys(typeMeta).map((type) => (
                                <MenuItem key={type} value={type}>{type}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Stack>
            </Card>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Grid container spacing={2}>
                    {filteredNotifications.map((notification) => {
                        const status = statusMeta[notification.status] || statusMeta.PENDING;
                        const type = typeMeta[notification.type] || typeMeta.EMAIL;
                        const priorityColor =
                            notification.priority === 'URGENT'
                                ? '#EF4444'
                                : notification.priority === 'HIGH'
                                    ? '#F59E0B'
                                    : '#94A3B8';

                        return (
                            <Grid key={notification.id} size={{ xs: 12, lg: 6, xl: 4 }}>
                                <Card sx={{ p: 2.5, height: '100%' }}>
                                    <Stack direction="row" justifyContent="space-between" spacing={1}>
                                        <Box>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                                {notification.title}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {notification.recipient}
                                            </Typography>
                                        </Box>
                                        <Stack direction="row" spacing={0.5}>
                                            <Tooltip title={notification.isRead ? 'Mark unread' : 'Mark read'}>
                                                <IconButton size="small" onClick={() => toggleRead(notification)}>
                                                    {notification.isRead ? <MarkEmailRead fontSize="small" /> : <MarkEmailUnread fontSize="small" />}
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Edit">
                                                <IconButton size="small" onClick={() => openEdit(notification)}>
                                                    <Drafts fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </Stack>

                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                                        {notification.message}
                                    </Typography>

                                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1.75 }}>
                                        <Chip label={notification.type} size="small" sx={{ bgcolor: type.bg, color: type.color, fontWeight: 700 }} />
                                        <Chip label={status.label} size="small" sx={{ bgcolor: status.bg, color: status.color, fontWeight: 700 }} />
                                        <Chip
                                            label={notification.priority}
                                            size="small"
                                            sx={{ bgcolor: `${priorityColor}22`, color: priorityColor, fontWeight: 700 }}
                                        />
                                    </Stack>

                                    <Stack spacing={0.75} sx={{ mt: 1.75 }}>
                                        {notification.channel && (
                                            <Typography variant="caption" color="text.secondary">
                                                Channel: {notification.channel}
                                            </Typography>
                                        )}
                                        <Typography variant="caption" color="text.secondary">
                                            Created: {notification.createdAt ? dayjs(notification.createdAt).format('MMM D, YYYY HH:mm') : 'n/a'}
                                        </Typography>
                                        {notification.sentAt && (
                                            <Typography variant="caption" color="text.secondary">
                                                Sent: {dayjs(notification.sentAt).format('MMM D, YYYY HH:mm')}
                                            </Typography>
                                        )}
                                    </Stack>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>
            )}

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>{editingNotification ? 'Edit Notification' : 'Compose Notification'}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Title"
                            value={formData.title}
                            onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
                            required
                        />
                        <TextField
                            label="Message"
                            multiline
                            minRows={4}
                            value={formData.message}
                            onChange={(event) => setFormData((current) => ({ ...current, message: event.target.value }))}
                            required
                        />
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Type</InputLabel>
                                    <Select
                                        value={formData.type}
                                        label="Type"
                                        onChange={(event) => setFormData((current) => ({ ...current, type: event.target.value }))}
                                    >
                                        {Object.keys(typeMeta).map((type) => (
                                            <MenuItem key={type} value={type}>{type}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Priority</InputLabel>
                                    <Select
                                        value={formData.priority}
                                        label="Priority"
                                        onChange={(event) => setFormData((current) => ({ ...current, priority: event.target.value }))}
                                    >
                                        <MenuItem value="LOW">LOW</MenuItem>
                                        <MenuItem value="NORMAL">NORMAL</MenuItem>
                                        <MenuItem value="HIGH">HIGH</MenuItem>
                                        <MenuItem value="URGENT">URGENT</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    label="Recipient"
                                    fullWidth
                                    value={formData.recipient}
                                    onChange={(event) => setFormData((current) => ({ ...current, recipient: event.target.value }))}
                                    required
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    label="Channel"
                                    fullWidth
                                    value={formData.channel}
                                    onChange={(event) => setFormData((current) => ({ ...current, channel: event.target.value }))}
                                />
                            </Grid>
                        </Grid>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained">
                        {editingNotification ? 'Save Changes' : 'Queue & Send'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
