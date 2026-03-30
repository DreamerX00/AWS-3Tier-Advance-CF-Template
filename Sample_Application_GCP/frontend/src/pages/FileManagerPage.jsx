import { useState, useEffect, useCallback } from 'react';
import {
    Box, Card, Typography, Button, IconButton, Tooltip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TextField, Chip, CircularProgress, Grid, LinearProgress,
} from '@mui/material';
import {
    CloudUpload, Delete, Download, Refresh, InsertDriveFile,
    Image, PictureAsPdf, Description, Code, FolderZip,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api, { getApiErrorMessages } from '../api/axiosClient';

const MotionRow = motion.create(TableRow);

const fileIcons = {
    'image': <Image sx={{ color: '#10B981' }} />,
    'application/pdf': <PictureAsPdf sx={{ color: '#EF4444' }} />,
    'text': <Description sx={{ color: '#3B82F6' }} />,
    'application/json': <Code sx={{ color: '#F59E0B' }} />,
    'application/zip': <FolderZip sx={{ color: '#8B5CF6' }} />,
};

function getFileIcon(type) {
    if (!type) return <InsertDriveFile sx={{ color: '#94A3B8' }} />;
    for (const [key, icon] of Object.entries(fileIcons)) {
        if (type.startsWith(key)) return icon;
    }
    return <InsertDriveFile sx={{ color: '#94A3B8' }} />;
}

function formatSize(bytes) {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

export default function FileManagerPage() {
    const [files, setFiles] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [description, setDescription] = useState('');

    const fetchWorkspace = async () => {
        setLoading(true);
        try {
            const [filesResponse, summaryResponse] = await Promise.all([
                api.get('/files'),
                api.get('/storage/summary'),
            ]);
            setFiles(filesResponse.data);
            setSummary(summaryResponse.data);
        } catch (err) {
            toast.error(getApiErrorMessages(err)[0]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchWorkspace(); }, []);

    const onDrop = useCallback(async (acceptedFiles) => {
        for (const file of acceptedFiles) {
            setUploading(true);
            setUploadProgress(0);
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('uploadedBy', 'admin');
                if (description) formData.append('description', description);

                await api.post('/files', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (e) => {
                        setUploadProgress(Math.round((e.loaded * 100) / e.total));
                    },
                });
                toast.success(`${file.name} uploaded! ☁️`);
                setDescription('');
                fetchWorkspace();
            } catch (err) {
                toast.error(getApiErrorMessages(err)[0] || `Failed to upload ${file.name}`);
            } finally {
                setUploading(false);
                setUploadProgress(0);
            }
        }
    }, [description]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    const handleDelete = async (id, name) => {
        try {
            await api.delete(`/files/${id}`);
            toast.success(`${name} deleted! 🗑️`);
            fetchWorkspace();
        } catch (err) {
            toast.error(getApiErrorMessages(err)[0]);
        }
    };

    const handleDownload = (gcsObjectName, fileName) => {
        const baseUrl = import.meta.env.VITE_API_URL || '';
        window.open(`${baseUrl}/api/files/download/${gcsObjectName}`, '_blank');
    };

    const totalSize = summary?.totalBytes ?? files.reduce((acc, file) => acc + (file.fileSize || 0), 0);
    const totalFiles = summary?.totalFiles ?? files.length;
    const recentUploads = summary?.recentUploads?.length ?? 0;
    const primaryStorage = Object.entries(summary?.storageTypeBreakdown || {})[0]?.[0] || 'GCS';

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" sx={{
                    background: 'linear-gradient(135deg, #8B5CF6, #8B5CF699)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                    Storage Workspace
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Object storage operations, upload telemetry, and file metadata in one workspace
                </Typography>
            </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ p: 2.5 }}>
                        <Typography variant="overline" color="text.secondary">Tracked Objects</Typography>
                        <Typography variant="h4" sx={{ mt: 0.75, fontWeight: 800 }}>{totalFiles}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Files currently indexed by the storage summary endpoint.
                        </Typography>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ p: 2.5 }}>
                        <Typography variant="overline" color="text.secondary">Total Footprint</Typography>
                        <Typography variant="h4" sx={{ mt: 0.75, fontWeight: 800 }}>{formatSize(totalSize)}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Current logical storage volume across uploaded objects.
                        </Typography>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ p: 2.5 }}>
                        <Typography variant="overline" color="text.secondary">Primary Storage</Typography>
                        <Typography variant="h4" sx={{ mt: 0.75, fontWeight: 800 }}>{primaryStorage}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {recentUploads} recent uploads are included in the current storage summary.
                        </Typography>
                    </Card>
                </Grid>
            </Grid>

            {/* Upload Zone */}
            <Card sx={{ p: 3, mb: 3 }}>
                <Box
                    {...getRootProps()}
                    sx={{
                        border: '2px dashed',
                        borderColor: isDragActive ? '#8B5CF6' : 'rgba(255,255,255,0.1)',
                        borderRadius: 3,
                        p: 4,
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        background: isDragActive ? 'rgba(139,92,246,0.08)' : 'transparent',
                        '&:hover': {
                            borderColor: '#8B5CF6',
                            background: 'rgba(139,92,246,0.05)',
                        },
                    }}
                >
                    <input {...getInputProps()} />
                    <CloudUpload sx={{ fontSize: 48, color: isDragActive ? '#8B5CF6' : '#94A3B8', mb: 1 }} />
                    <Typography variant="h6" color={isDragActive ? '#8B5CF6' : 'text.secondary'}>
                        {isDragActive ? 'Drop files here...' : 'Drag & drop files here'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        or click to browse — Max 10MB per file
                    </Typography>
                </Box>

                {uploading && (
                    <Box sx={{ mt: 2 }}>
                        <LinearProgress
                            variant="determinate"
                            value={uploadProgress}
                            sx={{
                                height: 8, borderRadius: 4,
                                bgcolor: 'rgba(255,255,255,0.06)',
                                '& .MuiLinearProgress-bar': { bgcolor: '#8B5CF6', borderRadius: 4 },
                            }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            Uploading... {uploadProgress}%
                        </Typography>
                    </Box>
                )}

                <TextField
                    size="small"
                    placeholder="File description (optional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    sx={{ mt: 2, width: '100%', maxWidth: 400 }}
                />

                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Chip label={`${totalFiles} files`} size="small" sx={{ bgcolor: 'rgba(139,92,246,0.15)', color: '#8B5CF6', fontWeight: 600 }} />
                    <Chip label={formatSize(totalSize)} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
                    <Chip label={`${recentUploads} recent uploads`} size="small" sx={{ bgcolor: 'rgba(56,189,248,0.12)', color: '#7DD3FC' }} />
                </Box>
            </Card>

            {/* File List */}
            <Card>
                {loading ? (
                    <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
                        <CircularProgress sx={{ color: '#8B5CF6' }} />
                    </Box>
                ) : files.length === 0 ? (
                    <Box sx={{ py: 8, textAlign: 'center' }}>
                        <Typography sx={{ fontSize: 48, mb: 1, opacity: 0.3 }}>📂</Typography>
                        <Typography color="text.secondary" variant="h6">No files uploaded</Typography>
                        <Typography color="text.secondary" variant="body2">
                            Drag & drop files above to start uploading
                        </Typography>
                    </Box>
                ) : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ width: 40 }}></TableCell>
                                    <TableCell>File Name</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Size</TableCell>
                                    <TableCell>Uploaded By</TableCell>
                                    <TableCell>Storage</TableCell>
                                    <TableCell>GCS Object</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {files.map((file, i) => (
                                    <MotionRow
                                        key={file.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}
                                    >
                                        <TableCell>{getFileIcon(file.fileType)}</TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.85rem' }}>
                                                {file.fileName}
                                            </Typography>
                                            {file.description && (
                                                <Typography variant="caption" color="text.secondary">{file.description}</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={file.fileType?.split('/')[1] || 'unknown'} size="small"
                                                sx={{ fontSize: '0.65rem', bgcolor: 'rgba(255,255,255,0.05)' }} />
                                        </TableCell>
                                        <TableCell><Typography variant="body2">{formatSize(file.fileSize)}</Typography></TableCell>
                                        <TableCell><Typography variant="body2">{file.uploadedBy || '—'}</Typography></TableCell>
                                        <TableCell>
                                            <Chip label={file.storageType} size="small"
                                                sx={{ bgcolor: 'rgba(139,92,246,0.15)', color: '#8B5CF6', fontSize: '0.65rem', fontWeight: 600 }} />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}>
                                                {file.gcsObjectName?.substring(0, 20)}...
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="Download">
                                                <IconButton size="small" onClick={() => handleDownload(file.gcsObjectName, file.fileName)}
                                                    sx={{ color: '#3B82F6' }}>
                                                    <Download fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete">
                                                <IconButton size="small" onClick={() => handleDelete(file.id, file.fileName)}
                                                    sx={{ color: '#EF4444' }}>
                                                    <Delete fontSize="small" />
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
        </Box>
    );
}
