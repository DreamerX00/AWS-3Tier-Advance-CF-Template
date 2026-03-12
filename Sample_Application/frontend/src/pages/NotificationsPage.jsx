import { Chip, IconButton, Tooltip } from '@mui/material';
import { MarkEmailRead, MarkEmailUnread } from '@mui/icons-material';
import CrudPage from '../components/CrudPage';
import dayjs from 'dayjs';

const typeColors = {
    EMAIL: { bg: 'rgba(59,130,246,0.15)', color: '#3B82F6' },
    SMS: { bg: 'rgba(16,185,129,0.15)', color: '#10B981' },
    PUSH: { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
    WEBHOOK: { bg: 'rgba(139,92,246,0.15)', color: '#8B5CF6' },
};

const statusColors = {
    PENDING: { bg: 'rgba(148,163,184,0.15)', color: '#94A3B8' },
    SENT: { bg: 'rgba(16,185,129,0.15)', color: '#10B981' },
    FAILED: { bg: 'rgba(239,68,68,0.15)', color: '#EF4444' },
    DELIVERED: { bg: 'rgba(59,130,246,0.15)', color: '#3B82F6' },
};

const columns = [
    { field: 'title', header: 'Title' },
    {
        field: 'message', header: 'Message',
        render: (val) => val ? val.substring(0, 50) + (val.length > 50 ? '...' : '') : '—',
    },
    {
        field: 'type', header: 'Type',
        render: (val) => {
            const t = typeColors[val] || typeColors.EMAIL;
            return <Chip label={val} size="small" sx={{ bgcolor: t.bg, color: t.color, fontWeight: 600, fontSize: '0.7rem' }} />;
        },
    },
    { field: 'recipient', header: 'Recipient' },
    {
        field: 'status', header: 'Status',
        render: (val) => {
            const s = statusColors[val] || statusColors.PENDING;
            return <Chip label={val} size="small" sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600, fontSize: '0.7rem' }} />;
        },
    },
    {
        field: 'priority', header: 'Priority',
        render: (val) => {
            const color = val === 'URGENT' ? '#EF4444' : val === 'HIGH' ? '#F59E0B' : '#94A3B8';
            return <Chip label={val} size="small" sx={{ bgcolor: `${color}22`, color, fontWeight: 600, fontSize: '0.7rem' }} />;
        },
    },
    {
        field: 'isRead', header: 'Read',
        render: (val, row, handlePatch) => (
            <Tooltip title={val ? 'Mark as unread' : 'Mark as read'}>
                <IconButton size="small" onClick={() => handlePatch(row.id, 'isRead', !val)}
                    sx={{ color: val ? '#10B981' : '#94A3B8' }}>
                    {val ? <MarkEmailRead fontSize="small" /> : <MarkEmailUnread fontSize="small" />}
                </IconButton>
            </Tooltip>
        ),
    },
    {
        field: 'createdAt', header: 'Created',
        render: (val) => val ? dayjs(val).format('MMM D, HH:mm') : '—',
    },
];

const formFields = [
    { name: 'title', label: 'Title', required: true },
    { name: 'message', label: 'Message', required: true, multiline: true },
    {
        name: 'type', label: 'Type', type: 'select', defaultValue: 'EMAIL',
        options: [
            { value: 'EMAIL', label: 'Email (SES)' },
            { value: 'SMS', label: 'SMS (SNS)' },
            { value: 'PUSH', label: 'Push (SNS)' },
            { value: 'WEBHOOK', label: 'Webhook (Lambda)' },
        ],
    },
    { name: 'recipient', label: 'Recipient', required: true },
    {
        name: 'priority', label: 'Priority', type: 'select', defaultValue: 'NORMAL',
        options: [
            { value: 'LOW', label: 'Low' },
            { value: 'NORMAL', label: 'Normal' },
            { value: 'HIGH', label: 'High' },
            { value: 'URGENT', label: 'Urgent' },
        ],
    },
    { name: 'channel', label: 'Channel / Queue Name' },
];

const filterConfig = [
    {
        param: 'type', label: 'Type',
        options: [
            { value: 'EMAIL', label: 'Email' },
            { value: 'SMS', label: 'SMS' },
            { value: 'PUSH', label: 'Push' },
            { value: 'WEBHOOK', label: 'Webhook' },
        ],
    },
    {
        param: 'status', label: 'Status',
        options: [
            { value: 'PENDING', label: 'Pending' },
            { value: 'SENT', label: 'Sent' },
            { value: 'FAILED', label: 'Failed' },
            { value: 'DELIVERED', label: 'Delivered' },
        ],
    },
];

export default function NotificationsPage() {
    return (
        <CrudPage
            title="Notifications"
            subtitle="Message queue simulation — SQS/SNS/SES practice"
            endpoint="notifications"
            columns={columns}
            formFields={formFields}
            filterConfig={filterConfig}
            accentColor="#EC4899"
            emptyIcon="🔔"
        />
    );
}
