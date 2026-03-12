import { Chip, IconButton, Tooltip } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import CrudPage from '../components/CrudPage';
import dayjs from 'dayjs';

const columns = [
    { field: 'title', header: 'Title' },
    {
        field: 'content', header: 'Content',
        render: (val) => val ? val.substring(0, 60) + (val.length > 60 ? '...' : '') : '—',
    },
    {
        field: 'category', header: 'Category',
        render: (val) => val ? (
            <Chip label={val} size="small" variant="outlined" sx={{
                borderColor: 'rgba(16,185,129,0.3)', color: '#10B981', fontSize: '0.7rem',
            }} />
        ) : '—',
    },
    { field: 'author', header: 'Author' },
    {
        field: 'isPublic', header: 'Visibility',
        render: (val, row, handlePatch) => (
            <Tooltip title={val ? 'Public — click to make private' : 'Private — click to make public'}>
                <IconButton
                    size="small"
                    onClick={() => handlePatch(row.id, 'isPublic', !val)}
                    sx={{ color: val ? '#10B981' : '#94A3B8' }}
                >
                    {val ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
                </IconButton>
            </Tooltip>
        ),
    },
    { field: 'tags', header: 'Tags' },
    {
        field: 'createdAt', header: 'Created',
        render: (val) => val ? dayjs(val).format('MMM D, YYYY') : '—',
    },
];

const formFields = [
    { name: 'title', label: 'Title', required: true },
    { name: 'content', label: 'Content', required: true, multiline: true },
    {
        name: 'category', label: 'Category', type: 'select',
        options: [
            { value: 'Programming', label: 'Programming' },
            { value: 'DevOps', label: 'DevOps' },
            { value: 'Cloud', label: 'Cloud' },
            { value: 'Database', label: 'Database' },
            { value: 'General', label: 'General' },
        ],
    },
    { name: 'author', label: 'Author', required: true },
    { name: 'isPublic', label: 'Make Public', type: 'boolean', defaultValue: false },
    { name: 'tags', label: 'Tags (comma-separated)' },
];

const filterConfig = [
    {
        param: 'category', label: 'Category',
        options: [
            { value: 'Programming', label: 'Programming' },
            { value: 'DevOps', label: 'DevOps' },
            { value: 'Cloud', label: 'Cloud' },
            { value: 'Database', label: 'Database' },
            { value: 'General', label: 'General' },
        ],
    },
];

export default function NotesPage() {
    return (
        <CrudPage
            title="Notes"
            subtitle="Share and manage notes with public/private visibility"
            endpoint="notes"
            columns={columns}
            formFields={formFields}
            filterConfig={filterConfig}
            accentColor="#10B981"
            emptyIcon="📝"
        />
    );
}
