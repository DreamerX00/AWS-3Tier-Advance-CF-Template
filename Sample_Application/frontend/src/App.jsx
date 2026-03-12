import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import MarksheetPage from './pages/MarksheetPage';
import NotesPage from './pages/NotesPage';
import TasksPage from './pages/TasksPage';
import ProductsPage from './pages/ProductsPage';
import EventsPage from './pages/EventsPage';
import FileManagerPage from './pages/FileManagerPage';
import NotificationsPage from './pages/NotificationsPage';
import AuditLogPage from './pages/AuditLogPage';

function App() {
    return (
        <Layout>
            <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/marksheet" element={<MarksheetPage />} />
                <Route path="/notes" element={<NotesPage />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/files" element={<FileManagerPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/audit" element={<AuditLogPage />} />
            </Routes>
        </Layout>
    );
}

export default App;
