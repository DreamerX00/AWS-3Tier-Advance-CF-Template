import { useState, useEffect, useCallback } from 'react';
import {
    Box, Card, Typography, Button, IconButton, Tooltip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TextField, Chip, CircularProgress, LinearProgress,
} from '@mui/material';
import {
    CloudUpload, Delete, Download, Refresh, InsertDriveFile,
    Image, PictureAsPdf, Description, Code, FolderZip,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../api/axiosClient';

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
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [description, setDescription] = useState('');

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const res = await api.get('/files');
            setFiles(res.data);
        } catch (err) {
            toast.error('Failed to load files');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchFiles(); }, []);

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
                fetchFiles();
            } catch (err) {
                toast.error(`Failed to upload ${file.name}`);
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
            fetchFiles();
        } catch (err) {
            toast.error('Delete failed');
        }
    };

    const handleDownload = (s3Key, fileName) => {
        const baseUrl = import.meta.env.VITE_API_URL || '';
        window.open(`${baseUrl}/api/files/download/${s3Key}`, '_blank');
    };

    const totalSize = files.reduce((acc, f) => acc + (f.fileSize || 0), 0);

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" sx={{
                    background: 'linear-gradient(135deg, #8B5CF6, #8B5CF699)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                    File Manager
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Upload & manage files — S3 bucket simulation for AWS practice
                </Typography>
            </Box>

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
                    <Chip label={`${files.length} files`} size="small" sx={{ bgcolor: 'rgba(139,92,246,0.15)', color: '#8B5CF6', fontWeight: 600 }} />
                    <Chip label={formatSize(totalSize)} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
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
                                    <TableCell>S3 Key</TableCell>
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
                                                {file.s3Key?.substring(0, 20)}...
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="Download">
                                                <IconButton size="small" onClick={() => handleDownload(file.s3Key, file.fileName)}
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
