import { Chip } from '@mui/material';
import CrudPage from '../components/CrudPage';
import dayjs from 'dayjs';

const statusColors = {
    TODO: { bg: 'rgba(148,163,184,0.15)', color: '#94A3B8' },
    IN_PROGRESS: { bg: 'rgba(59,130,246,0.15)', color: '#3B82F6' },
    IN_REVIEW: { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
    DONE: { bg: 'rgba(16,185,129,0.15)', color: '#10B981' },
    BLOCKED: { bg: 'rgba(239,68,68,0.15)', color: '#EF4444' },
};

const priorityColors = {
    LOW: { bg: 'rgba(148,163,184,0.15)', color: '#94A3B8' },
    MEDIUM: { bg: 'rgba(59,130,246,0.15)', color: '#3B82F6' },
    HIGH: { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
    CRITICAL: { bg: 'rgba(239,68,68,0.15)', color: '#EF4444' },
};

const columns = [
    { field: 'title', header: 'Title' },
    {
        field: 'description', header: 'Description',
        render: (val) => val ? val.substring(0, 50) + (val.length > 50 ? '...' : '') : '—',
    },
    {
        field: 'status', header: 'Status',
        render: (val) => {
            const s = statusColors[val] || statusColors.TODO;
            return <Chip label={val?.replace('_', ' ')} size="small" sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600, fontSize: '0.7rem' }} />;
        },
    },
    {
        field: 'priority', header: 'Priority',
        render: (val) => {
            const p = priorityColors[val] || priorityColors.MEDIUM;
            return <Chip label={val} size="small" sx={{ bgcolor: p.bg, color: p.color, fontWeight: 600, fontSize: '0.7rem' }} />;
        },
    },
    { field: 'assignee', header: 'Assignee' },
    {
        field: 'dueDate', header: 'Due Date',
        render: (val) => val ? dayjs(val).format('MMM D, YYYY') : '—',
    },
    { field: 'tags', header: 'Tags' },
];

const formFields = [
    { name: 'title', label: 'Title', required: true },
    { name: 'description', label: 'Description', multiline: true },
    {
        name: 'status', label: 'Status', type: 'select', defaultValue: 'TODO',
        options: [
            { value: 'TODO', label: 'To Do' },
            { value: 'IN_PROGRESS', label: 'In Progress' },
            { value: 'IN_REVIEW', label: 'In Review' },
            { value: 'DONE', label: 'Done' },
            { value: 'BLOCKED', label: 'Blocked' },
        ],
    },
    {
        name: 'priority', label: 'Priority', type: 'select', defaultValue: 'MEDIUM',
        options: [
            { value: 'LOW', label: 'Low' },
            { value: 'MEDIUM', label: 'Medium' },
            { value: 'HIGH', label: 'High' },
            { value: 'CRITICAL', label: 'Critical' },
        ],
    },
    { name: 'assignee', label: 'Assignee' },
    { name: 'dueDate', label: 'Due Date', type: 'date' },
    { name: 'tags', label: 'Tags (comma-separated)' },
];

const filterConfig = [
    {
        param: 'status', label: 'Status',
        options: [
            { value: 'TODO', label: 'To Do' },
            { value: 'IN_PROGRESS', label: 'In Progress' },
            { value: 'IN_REVIEW', label: 'In Review' },
            { value: 'DONE', label: 'Done' },
            { value: 'BLOCKED', label: 'Blocked' },
        ],
    },
    {
        param: 'priority', label: 'Priority',
        options: [
            { value: 'LOW', label: 'Low' },
            { value: 'MEDIUM', label: 'Medium' },
            { value: 'HIGH', label: 'High' },
            { value: 'CRITICAL', label: 'Critical' },
        ],
    },
];

export default function TasksPage() {
    return (
        <CrudPage
            title="Task Board"
            subtitle="Track tasks with status, priority, and assignee management"
            endpoint="tasks"
            columns={columns}
            formFields={formFields}
            filterConfig={filterConfig}
            accentColor="#3B82F6"
            emptyIcon="✅"
        />
    );
}
