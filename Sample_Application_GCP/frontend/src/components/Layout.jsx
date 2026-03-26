import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    AppBar,
    Box,
    Button,
    Chip,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme as useMuiTheme,
} from '@mui/material';
import {
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    CloudUpload as CloudUploadIcon,
    Dashboard as DashboardIcon,
    Event as EventIcon,
    FolderOpen as FolderIcon,
    HealthAndSafety as HealthIcon,
    Hub as HubIcon,
    Inventory2 as ProductIcon,
    IosShare as ExportIcon,
    ManageSearch as AuditIcon,
    Menu as MenuIcon,
    Notifications as NotificationIcon,
    People as PeopleIcon,
    School as SchoolIcon,
    Search as SearchIcon,
    Shield as ShieldIcon,
    StickyNote2 as NoteIcon,
    TaskAlt as TaskIcon,
    Terminal as MonitorIcon,
    Timeline as ActivityIcon,
} from '@mui/icons-material';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../api/axiosClient';
import { OSIMonitorProvider, useOSIMonitor } from '../api/OSIMonitorContext';
import OSIMonitorPane from './OSIMonitorPane';

const DRAWER_WIDTH = 292;
const DRAWER_COLLAPSED_WIDTH = 72;

const navigationGroups = [
    {
        section: 'Overview',
        items: [
            {
                path: '/',
                label: 'Overview',
                description: 'Mission control for the platform',
                icon: <DashboardIcon />,
                color: '#38BDF8',
                quickAction: { label: 'Open Storage', path: '/storage/files' },
            },
        ],
    },
    {
        section: 'Operations',
        items: [
            {
                path: '/operations/tasks',
                label: 'Tasks',
                description: 'Workload, ownership, and delivery state',
                icon: <TaskIcon />,
                color: '#3B82F6',
                quickAction: { label: 'View Activity', path: '/activity/audit' },
            },
            {
                path: '/operations/events',
                label: 'Events',
                description: 'Schedules, venues, and activations',
                icon: <EventIcon />,
                color: '#F97316',
                quickAction: { label: 'Open System', path: '/system/health' },
            },
            {
                path: '/operations/notifications',
                label: 'Notifications',
                description: 'Delivery status and queue visibility',
                icon: <NotificationIcon />,
                color: '#EC4899',
                quickAction: { label: 'Review Audit', path: '/activity/audit' },
            },
        ],
    },
    {
        section: 'Data',
        items: [
            {
                path: '/data/users',
                label: 'Users',
                description: 'Identity records and team ownership',
                icon: <PeopleIcon />,
                color: '#8B5CF6',
                quickAction: { label: 'Open Exports', path: '/activity/exports' },
            },
            {
                path: '/data/marksheets',
                label: 'Marksheets',
                description: 'Academic records and grading state',
                icon: <SchoolIcon />,
                color: '#F59E0B',
                quickAction: { label: 'Go to Overview', path: '/' },
            },
            {
                path: '/data/notes',
                label: 'Notes',
                description: 'Knowledge capture and internal references',
                icon: <NoteIcon />,
                color: '#10B981',
                quickAction: { label: 'Open Exports', path: '/activity/exports' },
            },
            {
                path: '/data/products',
                label: 'Products',
                description: 'Inventory, stock, and catalog data',
                icon: <ProductIcon />,
                color: '#EF4444',
                quickAction: { label: 'Open Storage', path: '/storage/files' },
            },
        ],
    },
    {
        section: 'Storage',
        items: [
            {
                path: '/storage/files',
                label: 'Files',
                description: 'Object storage, uploads, and metadata',
                icon: <FolderIcon />,
                color: '#A855F7',
                quickAction: { label: 'Open Monitor', path: '/system/monitor' },
            },
        ],
    },
    {
        section: 'Activity',
        items: [
            {
                path: '/activity/audit',
                label: 'Audit',
                description: 'Traceability for all system changes',
                icon: <AuditIcon />,
                color: '#F59E0B',
                quickAction: { label: 'Open Exports', path: '/activity/exports' },
            },
            {
                path: '/activity/exports',
                label: 'Exports',
                description: 'Portable data extracts by domain',
                icon: <ExportIcon />,
                color: '#14B8A6',
                quickAction: { label: 'Review Audit', path: '/activity/audit' },
            },
        ],
    },
    {
        section: 'System',
        items: [
            {
                path: '/system/health',
                label: 'Health',
                description: 'Service readiness and environment state',
                icon: <HealthIcon />,
                color: '#22C55E',
                quickAction: { label: 'Open Monitor', path: '/system/monitor' },
            },
            {
                path: '/system/monitor',
                label: 'Monitor',
                description: 'Traffic, topology, and live telemetry',
                icon: <MonitorIcon />,
                color: '#38BDF8',
                quickAction: { label: 'Open Health', path: '/system/health' },
            },
        ],
    },
];

const routeItems = navigationGroups.flatMap((group) =>
    group.items.map((item) => ({ ...item, section: group.section }))
);

function isRouteMatch(routePath, pathname) {
    if (routePath === '/') return pathname === '/';
    return pathname === routePath || pathname.startsWith(`${routePath}/`);
}

function getCurrentRoute(pathname) {
    const sorted = [...routeItems].sort((a, b) => b.path.length - a.path.length);
    return sorted.find((item) => isRouteMatch(item.path, pathname)) || routeItems[0];
}

function DrawerContent({ pathname, navigate, setMobileOpen, isMobile, isCollapsed, toggleCollapse }) {
    return (
        <Box
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: 'linear-gradient(180deg, rgba(10,17,32,0.98) 0%, rgba(7,11,22,0.98) 100%)',
                position: 'relative',
            }}
        >
            {!isMobile && (
                <IconButton
                    onClick={toggleCollapse}
                    size="small"
                    sx={{
                        position: 'absolute',
                        top: 14,
                        right: 12,
                        zIndex: 2,
                        color: 'text.secondary',
                        bgcolor: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(148,163,184,0.16)',
                        '&:hover': {
                            bgcolor: 'rgba(255,255,255,0.08)',
                        },
                    }}
                >
                    {isCollapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
                </IconButton>
            )}
            <Box
                sx={{
                    p: isCollapsed ? 1.5 : 3,
                    borderBottom: '1px solid rgba(148,163,184,0.16)',
                    background: 'radial-gradient(circle at top left, rgba(56,189,248,0.16), transparent 45%)',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: isCollapsed ? 0 : 1.5, justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
                    <Box
                        sx={{
                            width: 46,
                            height: 46,
                            borderRadius: '14px',
                            display: 'grid',
                            placeItems: 'center',
                            color: '#E0F2FE',
                            background: 'linear-gradient(135deg, #0F766E 0%, #0284C7 100%)',
                            boxShadow: '0 14px 32px rgba(2,132,199,0.28)',
                        }}
                    >
                        <HubIcon />
                    </Box>
                    {!isCollapsed && (
                        <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, letterSpacing: '0.02em' }}>
                                Ops Control Center
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                3-tier cloud practice workspace
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Box>

            <List
                sx={{
                    flex: 1,
                    px: isCollapsed ? 1 : 1.5,
                    py: 2,
                    overflowY: 'auto',
                    scrollbarWidth: 'none',
                    '&::-webkit-scrollbar': {
                        display: 'none',
                    },
                }}
            >
                {navigationGroups.map((group) => (
                    <Box key={group.section} sx={{ mb: 2 }}>
                        {!isCollapsed && (
                            <Typography
                                variant="caption"
                                sx={{
                                    px: 1.5,
                                    mb: 1,
                                    display: 'block',
                                    color: 'text.secondary',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.16em',
                                }}
                            >
                                {group.section}
                            </Typography>
                        )}
                        {group.items.map((item) => {
                            const active = isRouteMatch(item.path, pathname);
                            const content = (
                                <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton
                                        onClick={() => {
                                            navigate(item.path);
                                            if (isMobile) setMobileOpen(false);
                                        }}
                                        sx={{
                                            alignItems: isCollapsed ? 'center' : 'flex-start',
                                            justifyContent: isCollapsed ? 'center' : 'flex-start',
                                            borderRadius: '14px',
                                            px: isCollapsed ? 0.75 : 1.5,
                                            py: 1.2,
                                            border: `1px solid ${active ? `${item.color}55` : 'transparent'}`,
                                            background: active
                                                ? `linear-gradient(135deg, ${item.color}2B, rgba(15,23,42,0.82))`
                                                : 'transparent',
                                            '&:hover': {
                                                background: `linear-gradient(135deg, ${item.color}1E, rgba(15,23,42,0.62))`,
                                            },
                                        }}
                                    >
                                        <ListItemIcon
                                            sx={{
                                                minWidth: isCollapsed ? 0 : 42,
                                                color: active ? item.color : 'text.secondary',
                                                mt: isCollapsed ? 0 : 0.2,
                                            }}
                                        >
                                            {item.icon}
                                        </ListItemIcon>
                                        {!isCollapsed && (
                                            <ListItemText
                                                primary={item.label}
                                                secondary={item.description}
                                                primaryTypographyProps={{
                                                    fontSize: '0.92rem',
                                                    fontWeight: active ? 700 : 600,
                                                    color: active ? 'text.primary' : 'text.primary',
                                                }}
                                                secondaryTypographyProps={{
                                                    fontSize: '0.74rem',
                                                    color: 'text.secondary',
                                                    sx: { mt: 0.25, lineHeight: 1.4 },
                                                }}
                                            />
                                        )}
                                    </ListItemButton>
                                </ListItem>
                            );
                            if (!isCollapsed) return content;
                            return (
                                <Tooltip key={item.path} title={item.label} placement="right">
                                    <Box>{content}</Box>
                                </Tooltip>
                            );
                        })}
                    </Box>
                ))}
            </List>

            <Box sx={{ p: 2.5, borderTop: '1px solid rgba(148,163,184,0.16)' }}>
                <Chip
                    icon={<ShieldIcon />}
                    label={isCollapsed ? 'Ready' : 'Local Stack Ready'}
                    size="small"
                    sx={{
                        width: '100%',
                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                        bgcolor: 'rgba(34,197,94,0.12)',
                        color: '#86EFAC',
                        '& .MuiChip-label': {
                            px: isCollapsed ? 0.75 : 1.5,
                        },
                    }}
                />
            </Box>
        </Box>
    );
}

function LayoutContent({ children }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [healthStatus, setHealthStatus] = useState('Checking');
    const [isNavCollapsed, setIsNavCollapsed] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.localStorage.getItem('ops-nav-collapsed') === 'true';
    });
    const navigate = useNavigate();
    const location = useLocation();
    const muiTheme = useMuiTheme();
    const isMobile = useMediaQuery(muiTheme.breakpoints.down('lg'));
    const { isOpen } = useOSIMonitor();

    const currentRoute = useMemo(() => getCurrentRoute(location.pathname), [location.pathname]);
    const environmentLabel = `${import.meta.env.MODE === 'production' ? 'Production' : 'Local'} Stack`;

    useEffect(() => {
        let alive = true;

        const fetchHealth = async () => {
            try {
                const response = await api.get('/health');
                if (alive) setHealthStatus(response.data?.status || 'UP');
            } catch (error) {
                if (alive) setHealthStatus('Down');
            }
        };

        fetchHealth();
        const intervalId = window.setInterval(fetchHealth, 30000);

        return () => {
            alive = false;
            window.clearInterval(intervalId);
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem('ops-nav-collapsed', String(isNavCollapsed));
    }, [isNavCollapsed]);

    const drawerContent = (
        <DrawerContent
            pathname={location.pathname}
            navigate={navigate}
            setMobileOpen={setMobileOpen}
            isMobile={isMobile}
            isCollapsed={isNavCollapsed && !isMobile}
            toggleCollapse={() => setIsNavCollapsed((current) => !current)}
        />
    );

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                bgcolor: 'background.default',
                backgroundImage: 'radial-gradient(circle at top, rgba(56,189,248,0.12), transparent 25%), linear-gradient(180deg, #07111D 0%, #050A14 100%)',
            }}
        >
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: 'block', lg: 'none' },
                    '& .MuiDrawer-paper': {
                        width: DRAWER_WIDTH,
                        bgcolor: 'transparent',
                        borderRight: '1px solid rgba(148,163,184,0.16)',
                    },
                }}
            >
                {drawerContent}
            </Drawer>

            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', lg: 'block' },
                    width: isNavCollapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH,
                    flexShrink: 0,
                    transition: 'width 0.22s ease',
                    '& .MuiDrawer-paper': {
                        width: isNavCollapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH,
                        boxSizing: 'border-box',
                        bgcolor: 'transparent',
                        borderRight: '1px solid rgba(148,163,184,0.16)',
                        overflowX: 'hidden',
                        transition: 'width 0.22s ease',
                    },
                }}
            >
                {drawerContent}
            </Drawer>

            <Box
                sx={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'margin-right 0.28s ease',
                    marginRight: isOpen ? { xs: 0, xl: '400px' } : 0,
                }}
            >
                <AppBar
                    position="sticky"
                    elevation={0}
                    sx={{
                        bgcolor: 'rgba(5,10,20,0.72)',
                        backdropFilter: 'blur(18px)',
                        borderBottom: '1px solid rgba(148,163,184,0.16)',
                    }}
                >
                    <Toolbar sx={{ gap: 1.5, minHeight: 76 }}>
                        <IconButton
                            edge="start"
                            onClick={() => setMobileOpen(true)}
                            sx={{ display: { lg: 'none' }, color: 'text.primary' }}
                        >
                            <MenuIcon />
                        </IconButton>

                        <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.16em' }}
                            >
                                {currentRoute.section}
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                {currentRoute.label}
                            </Typography>
                        </Box>

                        <Button
                            variant="outlined"
                            startIcon={<SearchIcon />}
                            onClick={() => toast('Global search enters the next implementation slice.')}
                            sx={{
                                display: { xs: 'none', md: 'inline-flex' },
                                borderColor: 'rgba(148,163,184,0.24)',
                                color: 'text.secondary',
                            }}
                        >
                            Search
                        </Button>

                        <Button
                            variant="contained"
                            startIcon={currentRoute.quickAction.path.includes('/storage/') ? <CloudUploadIcon /> : currentRoute.quickAction.path.includes('/system/') ? <MonitorIcon /> : <ActivityIcon />}
                            onClick={() => navigate(currentRoute.quickAction.path)}
                            sx={{
                                display: { xs: 'none', sm: 'inline-flex' },
                                background: 'linear-gradient(135deg, #0EA5E9 0%, #0F766E 100%)',
                                boxShadow: '0 12px 28px rgba(14,165,233,0.22)',
                            }}
                        >
                            {currentRoute.quickAction.label}
                        </Button>

                        <Chip
                            label={`Health: ${healthStatus}`}
                            size="small"
                            sx={{
                                bgcolor: healthStatus === 'UP' ? 'rgba(34,197,94,0.14)' : 'rgba(239,68,68,0.14)',
                                color: healthStatus === 'UP' ? '#86EFAC' : '#FCA5A5',
                            }}
                        />
                        <Chip
                            label={environmentLabel}
                            size="small"
                            sx={{ bgcolor: 'rgba(56,189,248,0.14)', color: '#7DD3FC' }}
                        />
                    </Toolbar>
                </AppBar>

                <Box
                    component="main"
                    sx={{
                        flex: 1,
                        px: { xs: 2, sm: 3, lg: 4 },
                        py: { xs: 2.5, sm: 3.5 },
                        width: '100%',
                        maxWidth: 1600,
                        mx: 'auto',
                    }}
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.22, ease: 'easeOut' }}
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </Box>
            </Box>

            <OSIMonitorPane />
        </Box>
    );
}

export default function Layout({ children }) {
    return (
        <OSIMonitorProvider>
            <LayoutContent>{children}</LayoutContent>
        </OSIMonitorProvider>
    );
}
