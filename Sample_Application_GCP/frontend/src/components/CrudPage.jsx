import { useState, useEffect, useCallback } from 'react';
import {
    Box, Card, Typography, Button, TextField, IconButton, Tooltip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Dialog, DialogTitle, DialogContent, DialogActions, Chip, InputAdornment,
    CircularProgress, Fade, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import {
    Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
    Search as SearchIcon, Close as CloseIcon, Refresh as RefreshIcon,
    Save as SaveIcon, FilterList as FilterIcon,
    FileDownload as DownloadIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api, { getApiErrorMessages } from '../api/axiosClient';

const MotionRow = motion.create(TableRow);

export default function CrudPage({
    title,
    subtitle,
    endpoint,
    columns,
    formFields,
    filterConfig,
    accentColor = '#6C63FF',
    emptyIcon,
}) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [deletingItem, setDeletingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [activeFilters, setActiveFilters] = useState({});

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = { ...activeFilters };
            const res = await api.get(`/${endpoint}`, { params });
            setData(res.data);
        } catch (err) {
            toast.error(getApiErrorMessages(err)[0]);
        } finally {
            setLoading(false);
        }
    }, [endpoint, activeFilters]);

    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim()) {
            fetchData();
            return;
        }
        setLoading(true);
        try {
            const res = await api.get(`/${endpoint}/search`, { params: { q: searchQuery } });
            setData(res.data);
        } catch (err) {
            toast.error(getApiErrorMessages(err)[0]);
        } finally {
            setLoading(false);
        }
    }, [endpoint, searchQuery, fetchData]);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery) handleSearch();
            else fetchData();
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const openCreate = () => {
        setEditingItem(null);
        const defaults = {};
        formFields.forEach((f) => { defaults[f.name] = f.defaultValue ?? ''; });
        setFormData(defaults);
        setDialogOpen(true);
    };

    const openEdit = (item) => {
        setEditingItem(item);
        const values = {};
        formFields.forEach((f) => { values[f.name] = item[f.name] ?? ''; });
        setFormData(values);
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        try {
            if (editingItem) {
                await api.put(`/${endpoint}/${editingItem.id}`, formData);
                toast.success('Updated successfully! ✨');
            } else {
                await api.post(`/${endpoint}`, formData);
                toast.success('Created successfully! 🎉');
            }
            setDialogOpen(false);
            fetchData();
        } catch (err) {
            const errors = err.response?.data?.errors;
            if (errors) {
                Object.values(errors).forEach((msg) => toast.error(msg));
            } else {
                toast.error(getApiErrorMessages(err)[0]);
            }
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/${endpoint}/${deletingItem.id}`);
            toast.success('Deleted successfully! 🗑️');
            setDeleteDialogOpen(false);
            fetchData();
        } catch (err) {
            toast.error(getApiErrorMessages(err)[0]);
        }
    };

    const handlePatch = async (id, field, value) => {
        try {
            await api.patch(`/${endpoint}/${id}`, { [field]: value });
            toast.success('Updated!');
            fetchData();
        } catch (err) {
            toast.error(getApiErrorMessages(err)[0]);
        }
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" sx={{
                    background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}99 100%)`,
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    mb: 0.5,
                }}>
                    {title}
                </Typography>
                <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
            </Box>

            {/* Controls Bar */}
            <Card sx={{ p: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <TextField
                        size="small"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        sx={{ minWidth: 250 }}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />

                    {filterConfig?.map((filter) => (
                        <FormControl size="small" key={filter.param} sx={{ minWidth: 140 }}>
                            <InputLabel>{filter.label}</InputLabel>
                            <Select
                                value={activeFilters[filter.param] || ''}
                                label={filter.label}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setActiveFilters((prev) => {
                                        const next = { ...prev };
                                        if (val) next[filter.param] = val;
                                        else delete next[filter.param];
                                        return next;
                                    });
                                }}
                            >
                                <MenuItem value="">All</MenuItem>
                                {filter.options.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    ))}

                    <Box sx={{ flex: 1 }} />

                    <Tooltip title="Refresh">
                        <IconButton onClick={fetchData} sx={{ color: 'text.secondary' }}>
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Export CSV">
                        <IconButton
                            onClick={() => {
                                const base = import.meta.env.VITE_API_URL || '';
                                window.open(`${base}/api/export/${endpoint}`, '_blank');
                            }}
                            sx={{ color: '#10B981' }}
                        >
                            <DownloadIcon />
                        </IconButton>
                    </Tooltip>

                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={openCreate}
                        sx={{
                            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}CC)`,
                            '&:hover': { background: `linear-gradient(135deg, ${accentColor}DD, ${accentColor})` },
                        }}
                    >
                        Add New
                    </Button>
                </Box>

                <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                        label={`${data.length} records`}
                        size="small"
                        sx={{ bgcolor: `${accentColor}22`, color: accentColor, fontWeight: 600 }}
                    />
                    {Object.keys(activeFilters).length > 0 && (
                        <Chip
                            icon={<FilterIcon />}
                            label="Filtered"
                            size="small"
                            onDelete={() => setActiveFilters({})}
                            sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}
                        />
                    )}
                </Box>
            </Card>

            {/* Data Table */}
            <Card>
                {loading ? (
                    <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
                        <CircularProgress sx={{ color: accentColor }} />
                    </Box>
                ) : data.length === 0 ? (
                    <Fade in>
                        <Box sx={{ py: 8, textAlign: 'center' }}>
                            {emptyIcon && <Box sx={{ fontSize: 48, mb: 2, opacity: 0.3 }}>{emptyIcon}</Box>}
                            <Typography color="text.secondary" variant="h6">No records found</Typography>
                            <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                                Click "Add New" to create your first entry
                            </Typography>
                        </Box>
                    </Fade>
                ) : (
                    <TableContainer sx={{ maxHeight: 600 }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ width: 60 }}>#</TableCell>
                                    {columns.map((col) => (
                                        <TableCell key={col.field}>{col.header}</TableCell>
                                    ))}
                                    <TableCell align="right" sx={{ width: 120 }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.map((row, index) => (
                                    <MotionRow
                                        key={row.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.03, duration: 0.3 }}
                                        sx={{
                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                                            {index + 1}
                                        </TableCell>
                                        {columns.map((col) => (
                                            <TableCell key={col.field}>
                                                {col.render
                                                    ? col.render(row[col.field], row, handlePatch)
                                                    : (
                                                        <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                                                            {row[col.field] ?? '—'}
                                                        </Typography>
                                                    )}
                                            </TableCell>
                                        ))}
                                        <TableCell align="right">
                                            <Tooltip title="Edit">
                                                <IconButton size="small" onClick={() => openEdit(row)}
                                                    sx={{ color: '#3B82F6', '&:hover': { bgcolor: 'rgba(59,130,246,0.1)' } }}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete">
                                                <IconButton size="small"
                                                    onClick={() => { setDeletingItem(row); setDeleteDialogOpen(true); }}
                                                    sx={{ color: '#EF4444', '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' } }}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </MotionRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {editingItem ? 'Edit Record' : 'Create New Record'}
                    </Typography>
                    <IconButton onClick={() => setDialogOpen(false)} size="small">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ pt: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        {formFields.map((field) => {
                            if (field.type === 'select') {
                                return (
                                    <FormControl key={field.name} fullWidth>
                                        <InputLabel>{field.label}</InputLabel>
                                        <Select
                                            value={formData[field.name] || ''}
                                            label={field.label}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, [field.name]: e.target.value }))}
                                        >
                                            {field.options?.map((opt) => (
                                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                );
                            }
                            if (field.type === 'boolean') {
                                return (
                                    <FormControl key={field.name} fullWidth>
                                        <InputLabel>{field.label}</InputLabel>
                                        <Select
                                            value={formData[field.name] === true || formData[field.name] === 'true' ? 'true' : 'false'}
                                            label={field.label}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, [field.name]: e.target.value === 'true' }))}
                                        >
                                            <MenuItem value="true">Yes</MenuItem>
                                            <MenuItem value="false">No</MenuItem>
                                        </Select>
                                    </FormControl>
                                );
                            }
                            return (
                                <TextField
                                    key={field.name}
                                    label={field.label}
                                    type={field.type || 'text'}
                                    required={field.required}
                                    multiline={field.multiline}
                                    rows={field.multiline ? 3 : undefined}
                                    value={formData[field.name] ?? ''}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, [field.name]: e.target.value }))}
                                    fullWidth
                                    slotProps={{
                                        inputLabel: { shrink: true },
                                    }}
                                />
                            );
                        })}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button onClick={() => setDialogOpen(false)} sx={{ color: 'text.secondary' }}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={handleSubmit}
                        sx={{
                            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}CC)`,
                            '&:hover': { background: `linear-gradient(135deg, ${accentColor}DD, ${accentColor})` },
                        }}
                    >
                        {editingItem ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#EF4444' }}>
                        ⚠️ Confirm Delete
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary">
                        Are you sure you want to delete this record? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: 'text.secondary' }}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDelete}
                        startIcon={<DeleteIcon />}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
