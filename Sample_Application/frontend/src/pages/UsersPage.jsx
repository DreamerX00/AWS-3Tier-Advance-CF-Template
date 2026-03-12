import { Chip } from '@mui/material';
import CrudPage from '../components/CrudPage';

const columns = [
    { field: 'firstName', header: 'First Name' },
    { field: 'lastName', header: 'Last Name' },
    { field: 'email', header: 'Email' },
    { field: 'phone', header: 'Phone' },
    {
        field: 'role', header: 'Role',
        render: (val) => val ? (
            <Chip label={val} size="small" sx={{
                bgcolor: val === 'ADMIN' ? 'rgba(239,68,68,0.15)' :
                    val === 'MANAGER' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)',
                color: val === 'ADMIN' ? '#EF4444' :
                    val === 'MANAGER' ? '#F59E0B' : '#3B82F6',
                fontWeight: 600, fontSize: '0.7rem',
            }} />
        ) : '—',
    },
    { field: 'city', header: 'City' },
    { field: 'department', header: 'Department' },
];

const formFields = [
    { name: 'firstName', label: 'First Name', required: true },
    { name: 'lastName', label: 'Last Name', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'phone', label: 'Phone' },
    {
        name: 'role', label: 'Role', type: 'select',
        options: [
            { value: 'USER', label: 'User' },
            { value: 'ADMIN', label: 'Admin' },
            { value: 'MANAGER', label: 'Manager' },
            { value: 'DEVELOPER', label: 'Developer' },
        ],
    },
    { name: 'city', label: 'City' },
    { name: 'department', label: 'Department' },
];

const filterConfig = [
    {
        param: 'role', label: 'Role',
        options: [
            { value: 'USER', label: 'User' },
            { value: 'ADMIN', label: 'Admin' },
            { value: 'MANAGER', label: 'Manager' },
            { value: 'DEVELOPER', label: 'Developer' },
        ],
    },
];

export default function UsersPage() {
    return (
        <CrudPage
            title="Users"
            subtitle="Manage user accounts with full CRUD operations"
            endpoint="users"
            columns={columns}
            formFields={formFields}
            filterConfig={filterConfig}
            accentColor="#6C63FF"
            emptyIcon="👤"
        />
    );
}
