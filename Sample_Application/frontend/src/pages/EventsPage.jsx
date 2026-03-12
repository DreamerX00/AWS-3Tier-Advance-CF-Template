import { Chip, IconButton, Tooltip } from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';
import CrudPage from '../components/CrudPage';
import dayjs from 'dayjs';

const columns = [
    { field: 'name', header: 'Event Name' },
    {
        field: 'description', header: 'Description',
        render: (val) => val ? val.substring(0, 50) + (val.length > 50 ? '...' : '') : '—',
    },
    { field: 'venue', header: 'Venue' },
    {
        field: 'date', header: 'Date',
        render: (val) => val ? dayjs(val).format('MMM D, YYYY') : '—',
    },
    { field: 'organizer', header: 'Organizer' },
    { field: 'capacity', header: 'Capacity' },
    {
        field: 'isActive', header: 'Active',
        render: (val, row, handlePatch) => (
            <Tooltip title={val ? 'Active — click to deactivate' : 'Inactive — click to activate'}>
                <IconButton
                    size="small"
                    onClick={() => handlePatch(row.id, 'isActive', !val)}
                    sx={{ color: val ? '#10B981' : '#EF4444' }}
                >
                    {val ? <CheckCircle fontSize="small" /> : <Cancel fontSize="small" />}
                </IconButton>
            </Tooltip>
        ),
    },
    {
        field: 'category', header: 'Category',
        render: (val) => val ? (
            <Chip label={val} size="small" variant="outlined" sx={{
                borderColor: 'rgba(255,107,157,0.3)', color: '#FF6B9D', fontSize: '0.7rem',
            }} />
        ) : '—',
    },
];

const formFields = [
    { name: 'name', label: 'Event Name', required: true },
    { name: 'description', label: 'Description', multiline: true },
    { name: 'venue', label: 'Venue', required: true },
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'time', label: 'Time', type: 'time' },
    { name: 'organizer', label: 'Organizer', required: true },
    { name: 'capacity', label: 'Capacity', type: 'number' },
    { name: 'isActive', label: 'Active', type: 'boolean', defaultValue: true },
    {
        name: 'category', label: 'Category', type: 'select',
        options: [
            { value: 'Conference', label: 'Conference' },
            { value: 'Workshop', label: 'Workshop' },
            { value: 'Meetup', label: 'Meetup' },
            { value: 'Hackathon', label: 'Hackathon' },
            { value: 'Webinar', label: 'Webinar' },
        ],
    },
    { name: 'registrationLink', label: 'Registration Link' },
];

const filterConfig = [
    {
        param: 'category', label: 'Category',
        options: [
            { value: 'Conference', label: 'Conference' },
            { value: 'Workshop', label: 'Workshop' },
            { value: 'Meetup', label: 'Meetup' },
            { value: 'Hackathon', label: 'Hackathon' },
            { value: 'Webinar', label: 'Webinar' },
        ],
    },
];

export default function EventsPage() {
    return (
        <CrudPage
            title="Events"
            subtitle="Manage events with date, venue, and activation controls"
            endpoint="events"
            columns={columns}
            formFields={formFields}
            filterConfig={filterConfig}
            accentColor="#FF6B9D"
            emptyIcon="🎉"
        />
    );
}
