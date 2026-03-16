import { Suspense, lazy } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const MarksheetPage = lazy(() => import('./pages/MarksheetPage'));
const NotesPage = lazy(() => import('./pages/NotesPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const EventsPage = lazy(() => import('./pages/EventsPage'));
const FileManagerPage = lazy(() => import('./pages/FileManagerPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'));
const SystemHealthPage = lazy(() => import('./pages/SystemHealthPage'));
const SystemMonitorPage = lazy(() => import('./pages/SystemMonitorPage'));
const ExportsPage = lazy(() => import('./pages/ExportsPage'));

function RouteFallback() {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
            <CircularProgress />
        </Box>
    );
}

function App() {
    return (
        <Layout>
            <Suspense fallback={<RouteFallback />}>
                <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/operations/tasks" element={<TasksPage />} />
                    <Route path="/operations/events" element={<EventsPage />} />
                    <Route path="/operations/notifications" element={<NotificationsPage />} />
                    <Route path="/data/users" element={<UsersPage />} />
                    <Route path="/data/marksheets" element={<MarksheetPage />} />
                    <Route path="/data/notes" element={<NotesPage />} />
                    <Route path="/data/products" element={<ProductsPage />} />
                    <Route path="/storage/files" element={<FileManagerPage />} />
                    <Route path="/activity/audit" element={<AuditLogPage />} />
                    <Route path="/activity/exports" element={<ExportsPage />} />
                    <Route path="/system/health" element={<SystemHealthPage />} />
                    <Route path="/system/monitor" element={<SystemMonitorPage />} />

                    <Route path="/users" element={<Navigate to="/data/users" replace />} />
                    <Route path="/marksheet" element={<Navigate to="/data/marksheets" replace />} />
                    <Route path="/notes" element={<Navigate to="/data/notes" replace />} />
                    <Route path="/tasks" element={<Navigate to="/operations/tasks" replace />} />
                    <Route path="/products" element={<Navigate to="/data/products" replace />} />
                    <Route path="/events" element={<Navigate to="/operations/events" replace />} />
                    <Route path="/files" element={<Navigate to="/storage/files" replace />} />
                    <Route path="/notifications" element={<Navigate to="/operations/notifications" replace />} />
                    <Route path="/audit" element={<Navigate to="/activity/audit" replace />} />

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
        </Layout>
    );
}

export default App;
