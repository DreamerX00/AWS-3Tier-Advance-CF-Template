import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
    AppBar, Toolbar, Typography, IconButton, useMediaQuery, useTheme as useMuiTheme,
} from '@mui/material';
import {
    People as PeopleIcon,
    School as SchoolIcon,
    StickyNote2 as NotesIcon,
    TaskAlt as TaskIcon,
    Inventory2 as ProductIcon,
    Event as EventIcon,
    Menu as MenuIcon,
    Bolt as BoltIcon,
    Dashboard as DashboardIcon,
    FolderOpen as FileIcon,
    Notifications as NotifIcon,
    ManageSearch as AuditIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { OSIMonitorProvider, useOSIMonitor } from '../api/OSIMonitorContext';
import OSIMonitorPane from './OSIMonitorPane';

const DRAWER_WIDTH = 260;

const navItems = [
    { path: '/',               label: 'Dashboard',     icon: <DashboardIcon />, color: '#06B6D4' },
    { path: '/users',          label: 'Users',          icon: <PeopleIcon />,   color: '#6C63FF' },
    { path: '/marksheet',      label: 'Marksheet',      icon: <SchoolIcon />,   color: '#F59E0B' },
    { path: '/notes',          label: 'Notes',          icon: <NotesIcon />,    color: '#10B981' },
    { path: '/tasks',          label: 'Tasks',          icon: <TaskIcon />,     color: '#3B82F6' },
    { path: '/products',       label: 'Products',       icon: <ProductIcon />,  color: '#EF4444' },
    { path: '/events',         label: 'Events',         icon: <EventIcon />,    color: '#FF6B9D' },
    { path: '/files',          label: 'Files',          icon: <FileIcon />,     color: '#8B5CF6' },
    { path: '/notifications',  label: 'Notifications',  icon: <NotifIcon />,    color: '#F97316' },
    { path: '/audit',          label: 'Audit Log',      icon: <AuditIcon />,    color: '#94A3B8' },
];

function DrawerContent({ navItems, location, navigate, setMobileOpen, isMobile }) {
    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Logo */}
            <Box sx={{
                p: 3, display: 'flex', alignItems: 'center', gap: 1.5,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
                <Box sx={{
                    width: 40, height: 40, borderRadius: '12px',
                    background: 'linear-gradient(135deg, #6C63FF 0%, #FF6B9D 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 14px rgba(108,99,255,0.4)',
                }}>
                    <BoltIcon sx={{ color: '#fff', fontSize: 24 }} />
                </Box>
                <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
                        AWS Practice
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                        Full-Stack Hub
                    </Typography>
                </Box>
            </Box>

            {/* Navigation */}
            <List sx={{ flex: 1, px: 1.5, py: 2, overflowY: 'auto' }}>
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                            <ListItemButton
                                onClick={() => {
                                    navigate(item.path);
                                    if (isMobile) setMobileOpen(false);
                                }}
                                sx={{
                                    borderRadius: '10px',
                                    py: 1.1,
                                    px: 2,
                                    transition: 'all 0.2s ease',
                                    background: isActive
                                        ? `linear-gradient(135deg, ${item.color}22, ${item.color}11)`
                                        : 'transparent',
                                    border: isActive ? `1px solid ${item.color}33` : '1px solid transparent',
                                    '&:hover': {
                                        background: `${item.color}15`,
                                        transform: 'translateX(4px)',
                                    },
                                }}
                            >
                                <ListItemIcon sx={{
                                    minWidth: 38,
                                    color: isActive ? item.color : 'text.secondary',
                                    transition: 'color 0.2s',
                                }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.label}
                                    primaryTypographyProps={{
                                        fontSize: '0.875rem',
                                        fontWeight: isActive ? 600 : 400,
                                        color: isActive ? item.color : 'text.secondary',
                                    }}
                                />
                                {isActive && (
                                    <Box sx={{
                                        width: 6, height: 6, borderRadius: '50%',
                                        backgroundColor: item.color,
                                        boxShadow: `0 0 8px ${item.color}`,
                                    }} />
                                )}
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>

            {/* Footer */}
            <Box sx={{
                p: 2, borderTop: '1px solid rgba(255,255,255,0.06)',
                textAlign: 'center',
            }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
                    Built for AWS Practice 🚀
                </Typography>
            </Box>
        </Box>
    );
}

function LayoutContent({ children }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const muiTheme = useMuiTheme();
    const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
    const { isOpen } = useOSIMonitor();

    const currentPage = navItems.find((item) => item.path === location.pathname) || navItems[0];

    const drawerContent = (
        <DrawerContent
            navItems={navItems}
            location={location}
            navigate={navigate}
            setMobileOpen={setMobileOpen}
            isMobile={isMobile}
        />
    );

    return (
        <>
            <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
                {/* Mobile Drawer */}
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={() => setMobileOpen(false)}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: 'block', md: 'none' },
                        '& .MuiDrawer-paper': {
                            width: DRAWER_WIDTH,
                            bgcolor: 'background.paper',
                            borderRight: '1px solid rgba(255,255,255,0.06)',
                        },
                    }}
                >
                    {drawerContent}
                </Drawer>

                {/* Desktop Drawer */}
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', md: 'block' },
                        width: DRAWER_WIDTH,
                        flexShrink: 0,
                        '& .MuiDrawer-paper': {
                            width: DRAWER_WIDTH,
                            boxSizing: 'border-box',
                            bgcolor: 'background.paper',
                            borderRight: '1px solid rgba(255,255,255,0.06)',
                        },
                    }}
                >
                    {drawerContent}
                </Drawer>

                {/* Main Content Area Container */}
                <Box sx={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    minWidth: 0,
                    transition: 'margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    marginRight: isOpen ? { xs: 0, xl: '400px' } : 0
                }}>
                    <AppBar
                        position="sticky"
                        elevation={0}
                        sx={{
                            bgcolor: 'rgba(10,14,26,0.85)',
                            backdropFilter: 'blur(20px)',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                        }}
                    >
                        <Toolbar>
                            <IconButton
                                edge="start"
                                onClick={() => setMobileOpen(true)}
                                sx={{ mr: 2, display: { md: 'none' }, color: 'text.primary' }}
                            >
                                <MenuIcon />
                            </IconButton>
                            <Box sx={{
                                width: 8, height: 8, borderRadius: '50%',
                                bgcolor: currentPage.color,
                                boxShadow: `0 0 12px ${currentPage.color}`,
                                mr: 1.5,
                            }} />
                            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                                {currentPage.label}
                            </Typography>
                        </Toolbar>
                    </AppBar>

                    <Box
                        component="main"
                        sx={{
                            flex: 1,
                            p: { xs: 2, sm: 3 },
                            maxWidth: 1400,
                            width: '100%',
                            mx: 'auto',
                        }}
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={location.pathname}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3, ease: 'easeOut' }}
                            >
                                {children}
                            </motion.div>
                        </AnimatePresence>
                    </Box>
                </Box>
            </Box>

            {/* OSI Monitor Pane */}
            <OSIMonitorPane />
        </>
    );
}

export default function Layout({ children }) {
    return (
        <OSIMonitorProvider>
            <LayoutContent>{children}</LayoutContent>
        </OSIMonitorProvider>
    );
}
