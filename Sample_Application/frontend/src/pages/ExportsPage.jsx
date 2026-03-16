import {
    Box,
    Button,
    Card,
    Chip,
    Grid,
    Stack,
    Typography,
} from '@mui/material';
import {
    Download,
    IosShare,
    TableChart,
} from '@mui/icons-material';

const exportTargets = [
    { key: 'users', label: 'Users', description: 'Identity records, roles, and contact metadata.' },
    { key: 'marksheets', label: 'Marksheets', description: 'Academic records, grades, and semester summaries.' },
    { key: 'notes', label: 'Notes', description: 'Knowledge entries, categories, and internal references.' },
    { key: 'tasks', label: 'Tasks', description: 'Workload assignments, priorities, and due-state exports.' },
    { key: 'products', label: 'Products', description: 'Catalog, price, SKU, and inventory data.' },
    { key: 'events', label: 'Events', description: 'Venues, schedules, organizers, and activation state.' },
];

export default function ExportsPage() {
    const baseUrl = import.meta.env.VITE_API_URL || '';

    return (
        <Box>
            <Box sx={{ mb: 3.5 }}>
                <Typography variant="h4" sx={{ mb: 0.75 }}>
                    Export Center
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Download portable CSV snapshots for each domain without leaving the activity workspace.
                </Typography>
            </Box>

            <Card sx={{ p: 3, mb: 3 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }}>
                    <Chip
                        icon={<IosShare />}
                        label="Activity Workspace"
                        sx={{ bgcolor: 'rgba(20,184,166,0.14)', color: '#5EEAD4' }}
                    />
                    <Typography variant="body2" color="text.secondary">
                        Exports are generated server-side from the current database state. Files open in a new tab and download as CSV.
                    </Typography>
                </Stack>
            </Card>

            <Grid container spacing={2.5}>
                {exportTargets.map((target) => (
                    <Grid key={target.key} size={{ xs: 12, md: 6, xl: 4 }}>
                        <Card sx={{ p: 3, height: '100%' }}>
                            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                                <Box
                                    sx={{
                                        width: 42,
                                        height: 42,
                                        borderRadius: '12px',
                                        display: 'grid',
                                        placeItems: 'center',
                                        bgcolor: 'rgba(20,184,166,0.12)',
                                        color: '#2DD4BF',
                                    }}
                                >
                                    <TableChart />
                                </Box>
                                <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                        {target.label}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {`/api/export/${target.key}`}
                                    </Typography>
                                </Box>
                            </Stack>

                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                {target.description}
                            </Typography>

                            <Button
                                fullWidth
                                variant="contained"
                                startIcon={<Download />}
                                onClick={() => window.open(`${baseUrl}/api/export/${target.key}`, '_blank')}
                                sx={{
                                    background: 'linear-gradient(135deg, #0F766E 0%, #0EA5E9 100%)',
                                }}
                            >
                                Download CSV
                            </Button>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
}
