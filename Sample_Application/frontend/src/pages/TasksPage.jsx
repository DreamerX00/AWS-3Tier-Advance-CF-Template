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
    Delete,
    Edit,
    Refresh,
    Search,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import api, { getApiErrorMessages } from '../api/axiosClient';

const STATUS_ORDER = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'];
const PRIORITY_ORDER = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const statusMeta = {
    TODO: { label: 'To Do', color: '#94A3B8', bg: 'rgba(148,163,184,0.14)' },
    IN_PROGRESS: { label: 'In Progress', color: '#38BDF8', bg: 'rgba(56,189,248,0.14)' },
    IN_REVIEW: { label: 'In Review', color: '#F59E0B', bg: 'rgba(245,158,11,0.14)' },
    DONE: { label: 'Done', color: '#22C55E', bg: 'rgba(34,197,94,0.14)' },
    BLOCKED: { label: 'Blocked', color: '#EF4444', bg: 'rgba(239,68,68,0.14)' },
};

const priorityMeta = {
    LOW: { color: '#94A3B8', bg: 'rgba(148,163,184,0.14)' },
    MEDIUM: { color: '#38BDF8', bg: 'rgba(56,189,248,0.14)' },
    HIGH: { color: '#F59E0B', bg: 'rgba(245,158,11,0.14)' },
    CRITICAL: { color: '#EF4444', bg: 'rgba(239,68,68,0.14)' },
};

const emptyTask = {
    title: '',
    description: '',
    status: 'TODO',
    priority: 'MEDIUM',
    assignee: '',
    dueDate: '',
    tags: '',
};

function sortTasks(tasks) {
    return [...tasks].sort((left, right) => {
        const leftPriority = PRIORITY_ORDER.indexOf(left.priority);
        const rightPriority = PRIORITY_ORDER.indexOf(right.priority);
        if (leftPriority !== rightPriority) return rightPriority - leftPriority;

        const leftDueDate = left.dueDate ? dayjs(left.dueDate).valueOf() : Number.MAX_SAFE_INTEGER;
        const rightDueDate = right.dueDate ? dayjs(right.dueDate).valueOf() : Number.MAX_SAFE_INTEGER;
        return leftDueDate - rightDueDate;
    });
}

export default function TasksPage() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [formData, setFormData] = useState(emptyTask);
    const [saving, setSaving] = useState(false);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const response = await api.get('/tasks');
            setTasks(response.data);
        } catch (error) {
            toast.error(getApiErrorMessages(error)[0]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const filteredTasks = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return tasks.filter((task) => {
            const matchesPriority = priorityFilter ? task.priority === priorityFilter : true;
            const haystack = [
                task.title,
                task.description,
                task.assignee,
                task.tags,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            const matchesQuery = normalizedQuery ? haystack.includes(normalizedQuery) : true;
            return matchesPriority && matchesQuery;
        });
    }, [tasks, query, priorityFilter]);

    const groupedTasks = useMemo(() => {
        return STATUS_ORDER.reduce((accumulator, status) => {
            accumulator[status] = sortTasks(filteredTasks.filter((task) => task.status === status));
            return accumulator;
        }, {});
    }, [filteredTasks]);

    const summary = useMemo(() => {
        const overdue = filteredTasks.filter((task) => task.dueDate && dayjs(task.dueDate).isBefore(dayjs(), 'day') && task.status !== 'DONE').length;
        const inFlight = filteredTasks.filter((task) => ['IN_PROGRESS', 'IN_REVIEW', 'BLOCKED'].includes(task.status)).length;
        const critical = filteredTasks.filter((task) => task.priority === 'CRITICAL').length;
        return {
            total: filteredTasks.length,
            overdue,
            inFlight,
            critical,
        };
    }, [filteredTasks]);

    const openCreate = () => {
        setEditingTask(null);
        setFormData(emptyTask);
        setDialogOpen(true);
    };

    const openEdit = (task) => {
        setEditingTask(task);
        setFormData({
            title: task.title ?? '',
            description: task.description ?? '',
            status: task.status ?? 'TODO',
            priority: task.priority ?? 'MEDIUM',
            assignee: task.assignee ?? '',
            dueDate: task.dueDate ?? '',
            tags: task.tags ?? '',
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.title.trim()) {
            toast.error('Title is required');
            return;
        }

        setSaving(true);
        try {
            if (editingTask) {
                await api.put(`/tasks/${editingTask.id}`, formData);
                toast.success('Task updated');
            } else {
                await api.post('/tasks', formData);
                toast.success('Task created');
            }
            setDialogOpen(false);
            await fetchTasks();
        } catch (error) {
            toast.error(getApiErrorMessages(error)[0]);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (taskId) => {
        try {
            await api.delete(`/tasks/${taskId}`);
            toast.success('Task deleted');
            await fetchTasks();
        } catch (error) {
            toast.error(getApiErrorMessages(error)[0]);
        }
    };

    const handleStatusChange = async (taskId, nextStatus) => {
        try {
            await api.patch(`/tasks/${taskId}`, { status: nextStatus });
            setTasks((current) =>
                current.map((task) => (task.id === taskId ? { ...task, status: nextStatus } : task))
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
                        Operations Board
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Track delivery state, overdue work, and assignment load in a board optimized for fast operational decisions.
                    </Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <Button variant="outlined" startIcon={<Refresh />} onClick={fetchTasks}>
                        Refresh
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={openCreate}
                        sx={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #0F766E 100%)' }}
                    >
                        New Task
                    </Button>
                </Stack>
            </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <Card sx={{ p: 2.5 }}>
                        <Typography variant="overline" color="text.secondary">Visible Tasks</Typography>
                        <Typography variant="h4" sx={{ mt: 0.75, fontWeight: 800 }}>{summary.total}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Tasks in the current filtered operations view.
                        </Typography>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <Card sx={{ p: 2.5 }}>
                        <Typography variant="overline" color="text.secondary">In Flight</Typography>
                        <Typography variant="h4" sx={{ mt: 0.75, fontWeight: 800 }}>{summary.inFlight}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Work currently moving, under review, or blocked.
                        </Typography>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <Card sx={{ p: 2.5 }}>
                        <Typography variant="overline" color="text.secondary">Overdue</Typography>
                        <Typography variant="h4" sx={{ mt: 0.75, fontWeight: 800, color: summary.overdue ? '#F59E0B' : 'inherit' }}>
                            {summary.overdue}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Tasks whose due date has passed and are not yet done.
                        </Typography>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <Card sx={{ p: 2.5 }}>
                        <Typography variant="overline" color="text.secondary">Critical</Typography>
                        <Typography variant="h4" sx={{ mt: 0.75, fontWeight: 800, color: summary.critical ? '#EF4444' : 'inherit' }}>
                            {summary.critical}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Highest-priority items needing immediate attention.
                        </Typography>
                    </Card>
                </Grid>
            </Grid>

            <Card sx={{ p: 2.5, mb: 3 }}>
                <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Search title, description, assignee, or tags"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        slotProps={{
                            input: {
                                startAdornment: <Search sx={{ color: 'text.secondary', mr: 1 }} />,
                            },
                        }}
                    />
                    <FormControl size="small" sx={{ minWidth: { xs: '100%', lg: 180 } }}>
                        <InputLabel>Priority</InputLabel>
                        <Select
                            value={priorityFilter}
                            label="Priority"
                            onChange={(event) => setPriorityFilter(event.target.value)}
                        >
                            <MenuItem value="">All Priorities</MenuItem>
                            {PRIORITY_ORDER.map((priority) => (
                                <MenuItem key={priority} value={priority}>{priority}</MenuItem>
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
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', xl: 'repeat(5, minmax(0, 1fr))' },
                        gap: 2,
                        alignItems: 'start',
                    }}
                >
                    {STATUS_ORDER.map((status) => {
                        const meta = statusMeta[status];
                        const tasksInColumn = groupedTasks[status] || [];

                        return (
                            <Card key={status} sx={{ p: 2, minHeight: 420 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                    <Box>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                            {meta.label}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {tasksInColumn.length} items
                                        </Typography>
                                    </Box>
                                    <Chip
                                        label={tasksInColumn.length}
                                        size="small"
                                        sx={{ bgcolor: meta.bg, color: meta.color, fontWeight: 700 }}
                                    />
                                </Stack>

                                <Stack spacing={1.5}>
                                    {tasksInColumn.length === 0 ? (
                                        <Box
                                            sx={{
                                                border: '1px dashed rgba(148,163,184,0.18)',
                                                borderRadius: '14px',
                                                px: 2,
                                                py: 4,
                                                textAlign: 'center',
                                            }}
                                        >
                                            <Typography variant="body2" color="text.secondary">
                                                No tasks in {meta.label.toLowerCase()}.
                                            </Typography>
                                        </Box>
                                    ) : (
                                        tasksInColumn.map((task) => {
                                            const overdue = task.dueDate && dayjs(task.dueDate).isBefore(dayjs(), 'day') && task.status !== 'DONE';
                                            const priority = priorityMeta[task.priority] || priorityMeta.MEDIUM;
                                            const tags = task.tags?.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 3) || [];

                                            return (
                                                <Card
                                                    key={task.id}
                                                    sx={{
                                                        p: 2,
                                                        border: `1px solid ${overdue ? 'rgba(245,158,11,0.35)' : 'rgba(148,163,184,0.12)'}`,
                                                        background: 'linear-gradient(180deg, rgba(10,15,28,0.9) 0%, rgba(8,12,22,0.9) 100%)',
                                                    }}
                                                >
                                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                                            {task.title}
                                                        </Typography>
                                                        <Stack direction="row" spacing={0.5}>
                                                            <Tooltip title="Edit">
                                                                <IconButton size="small" onClick={() => openEdit(task)}>
                                                                    <Edit fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Delete">
                                                                <IconButton size="small" onClick={() => handleDelete(task.id)}>
                                                                    <Delete fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Stack>
                                                    </Stack>

                                                    {task.description && (
                                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                                            {task.description}
                                                        </Typography>
                                                    )}

                                                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1.5 }}>
                                                        <Chip
                                                            label={task.priority}
                                                            size="small"
                                                            sx={{ bgcolor: priority.bg, color: priority.color, fontWeight: 700 }}
                                                        />
                                                        {task.assignee && (
                                                            <Chip
                                                                label={task.assignee}
                                                                size="small"
                                                                sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: '#CBD5E1' }}
                                                            />
                                                        )}
                                                        {task.dueDate && (
                                                            <Chip
                                                                label={dayjs(task.dueDate).format('MMM D')}
                                                                size="small"
                                                                sx={{
                                                                    bgcolor: overdue ? 'rgba(245,158,11,0.14)' : 'rgba(255,255,255,0.05)',
                                                                    color: overdue ? '#FBBF24' : '#CBD5E1',
                                                                }}
                                                            />
                                                        )}
                                                    </Stack>

                                                    {tags.length > 0 && (
                                                        <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ mt: 1.5 }}>
                                                            {tags.map((tag) => (
                                                                <Chip
                                                                    key={`${task.id}-${tag}`}
                                                                    label={tag}
                                                                    size="small"
                                                                    variant="outlined"
                                                                    sx={{ borderColor: 'rgba(56,189,248,0.24)', color: '#7DD3FC' }}
                                                                />
                                                            ))}
                                                        </Stack>
                                                    )}

                                                    <FormControl fullWidth size="small" sx={{ mt: 1.75 }}>
                                                        <InputLabel>Status</InputLabel>
                                                        <Select
                                                            value={task.status}
                                                            label="Status"
                                                            onChange={(event) => handleStatusChange(task.id, event.target.value)}
                                                        >
                                                            {STATUS_ORDER.map((value) => (
                                                                <MenuItem key={value} value={value}>
                                                                    {statusMeta[value].label}
                                                                </MenuItem>
                                                            ))}
                                                        </Select>
                                                    </FormControl>
                                                </Card>
                                            );
                                        })
                                    )}
                                </Stack>
                            </Card>
                        );
                    })}
                </Box>
            )}

            <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>{editingTask ? 'Edit Task' : 'Create Task'}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Title"
                            value={formData.title}
                            onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
                            required
                        />
                        <TextField
                            label="Description"
                            value={formData.description}
                            onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                            multiline
                            minRows={3}
                        />
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Status</InputLabel>
                                    <Select
                                        value={formData.status}
                                        label="Status"
                                        onChange={(event) => setFormData((current) => ({ ...current, status: event.target.value }))}
                                    >
                                        {STATUS_ORDER.map((status) => (
                                            <MenuItem key={status} value={status}>
                                                {statusMeta[status].label}
                                            </MenuItem>
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
                                        {PRIORITY_ORDER.map((priority) => (
                                            <MenuItem key={priority} value={priority}>
                                                {priority}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    label="Assignee"
                                    fullWidth
                                    value={formData.assignee}
                                    onChange={(event) => setFormData((current) => ({ ...current, assignee: event.target.value }))}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    label="Due Date"
                                    type="date"
                                    fullWidth
                                    value={formData.dueDate}
                                    onChange={(event) => setFormData((current) => ({ ...current, dueDate: event.target.value }))}
                                    slotProps={{ inputLabel: { shrink: true } }}
                                />
                            </Grid>
                        </Grid>
                        <TextField
                            label="Tags"
                            value={formData.tags}
                            onChange={(event) => setFormData((current) => ({ ...current, tags: event.target.value }))}
                            placeholder="comma,separated,tags"
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained" disabled={saving}>
                        {editingTask ? 'Save Changes' : 'Create Task'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
