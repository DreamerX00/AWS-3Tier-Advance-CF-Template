import { useEffect, useState } from 'react';
import {
    Box,
    Card,
    Chip,
    CircularProgress,
    Grid,
    Stack,
    Typography,
} from '@mui/material';
import {
    CloudQueue,
    FolderOpen,
    HealthAndSafety,
    Hub,
    Storage,
} from '@mui/icons-material';
import api from '../api/axiosClient';

export default function SystemHealthPage() {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;

    const load = async () => {
        try {
            const response = await api.get('/system/summary');
            if (alive) setSummary(response.data);
        } finally {
            if (alive) setLoading(false);
        }
        };

        load();

        return () => {
            alive = false;
        };
    }, []);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 10 }}>
                <CircularProgress />
            </Box>
        );
    }

    const counts = summary?.counts || {};
    const totalRecords = summary?.totalRecords || 0;
    const storageTotal = summary?.storage?.totalFiles || 0;
    const recentActivityTotal = summary?.activity?.total || 0;
    const serviceIcons = {
        'Backend API': <Hub />,
        PostgreSQL: <Storage />,
        'Object Storage': <FolderOpen />,
        'Audit Trail': <CloudQueue />,
    };

    return (
        <Box>
            <Box sx={{ mb: 3.5 }}>
                <Typography variant="h4" sx={{ mb: 0.75 }}>
                    System Health
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Operational readiness for the local 3-tier stack, including API health and current dataset footprint.
                </Typography>
            </Box>

            <Grid container spacing={2.5} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 6, xl: 3 }}>
                    <Card sx={{ p: 3, height: '100%' }}>
                        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                            <HealthAndSafety sx={{ color: '#22C55E' }} />
                            <Typography variant="h6">Application Status</Typography>
                        </Stack>
                        <Chip
                            label={summary?.status || 'UNKNOWN'}
                            sx={{
                                bgcolor: 'rgba(34,197,94,0.14)',
                                color: '#86EFAC',
                                mb: 1.5,
                            }}
                        />
                        <Typography variant="body2" color="text.secondary">
                            Service: {summary?.service || 'AWS Practice Backend'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Last reported: {summary?.generatedAt || 'n/a'}
                        </Typography>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 6, xl: 3 }}>
                    <Card sx={{ p: 3, height: '100%' }}>
                        <Typography variant="overline" color="text.secondary">
                            Dataset
                        </Typography>
                        <Typography variant="h3" sx={{ mt: 1, mb: 1, fontWeight: 800 }}>
                            {totalRecords}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Total persisted records across operational domains.
                        </Typography>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 6, xl: 3 }}>
                    <Card sx={{ p: 3, height: '100%' }}>
                        <Typography variant="overline" color="text.secondary">
                            Storage Objects
                        </Typography>
                        <Typography variant="h3" sx={{ mt: 1, mb: 1, fontWeight: 800 }}>
                            {storageTotal}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Files currently tracked by the storage summary endpoint.
                        </Typography>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 6, xl: 3 }}>
                    <Card sx={{ p: 3, height: '100%' }}>
                        <Typography variant="overline" color="text.secondary">
                            Recent Activity
                        </Typography>
                        <Typography variant="h3" sx={{ mt: 1, mb: 1, fontWeight: 800 }}>
                            {recentActivityTotal}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Recent activity items available for the system workspace.
                        </Typography>
                    </Card>
                </Grid>
            </Grid>

            <Grid container spacing={2.5}>
                {(summary?.components || []).map((service) => (
                    <Grid key={service.name} size={{ xs: 12, md: 6 }}>
                        <Card sx={{ p: 3 }}>
                            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                                <Box
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: '12px',
                                        display: 'grid',
                                        placeItems: 'center',
                                        bgcolor: 'rgba(56,189,248,0.12)',
                                        color: '#7DD3FC',
                                    }}
                                >
                                    {serviceIcons[service.name] || <CloudQueue />}
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                        {service.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {service.detail}
                                    </Typography>
                                </Box>
                                <Chip
                                    label={service.status}
                                    size="small"
                                    sx={{
                                        bgcolor: 'rgba(56,189,248,0.14)',
                                        color: '#7DD3FC',
                                    }}
                                />
                            </Stack>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
}
