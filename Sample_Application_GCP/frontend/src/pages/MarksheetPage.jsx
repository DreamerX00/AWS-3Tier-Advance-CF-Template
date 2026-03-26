import { Chip, LinearProgress, Box, Typography } from '@mui/material';
import CrudPage from '../components/CrudPage';

const columns = [
    { field: 'studentName', header: 'Student Name' },
    { field: 'rollNumber', header: 'Roll No.' },
    { field: 'subject', header: 'Subject' },
    {
        field: 'marks', header: 'Marks',
        render: (val) => (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
                <LinearProgress
                    variant="determinate"
                    value={val || 0}
                    sx={{
                        flex: 1, height: 6, borderRadius: 3,
                        bgcolor: 'rgba(255,255,255,0.06)',
                        '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                            bgcolor: val >= 80 ? '#10B981' : val >= 50 ? '#F59E0B' : '#EF4444',
                        },
                    }}
                />
                <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 28 }}>{val}</Typography>
            </Box>
        ),
    },
    {
        field: 'grade', header: 'Grade',
        render: (val) => val ? (
            <Chip label={val} size="small" sx={{
                fontWeight: 700, fontSize: '0.75rem',
                bgcolor: val === 'A+' || val === 'A' ? 'rgba(16,185,129,0.15)' :
                    val === 'B+' || val === 'B' ? 'rgba(59,130,246,0.15)' :
                        val === 'C' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                color: val === 'A+' || val === 'A' ? '#10B981' :
                    val === 'B+' || val === 'B' ? '#3B82F6' :
                        val === 'C' ? '#F59E0B' : '#EF4444',
            }} />
        ) : '—',
    },
    { field: 'semester', header: 'Sem' },
    { field: 'year', header: 'Year' },
    { field: 'remarks', header: 'Remarks' },
];

const formFields = [
    { name: 'studentName', label: 'Student Name', required: true },
    { name: 'rollNumber', label: 'Roll Number', required: true },
    { name: 'subject', label: 'Subject', required: true },
    { name: 'marks', label: 'Marks (0-100)', type: 'number', required: true },
    {
        name: 'grade', label: 'Grade', type: 'select',
        options: [
            { value: 'A+', label: 'A+' }, { value: 'A', label: 'A' },
            { value: 'B+', label: 'B+' }, { value: 'B', label: 'B' },
            { value: 'C', label: 'C' }, { value: 'D', label: 'D' }, { value: 'F', label: 'F' },
        ],
    },
    {
        name: 'semester', label: 'Semester', type: 'select',
        options: Array.from({ length: 8 }, (_, i) => ({ value: i + 1, label: `Semester ${i + 1}` })),
    },
    { name: 'year', label: 'Year', type: 'number', required: true },
    { name: 'remarks', label: 'Remarks' },
];

const filterConfig = [
    {
        param: 'semester', label: 'Semester',
        options: Array.from({ length: 8 }, (_, i) => ({ value: i + 1, label: `Sem ${i + 1}` })),
    },
    {
        param: 'year', label: 'Year',
        options: [2024, 2025, 2026].map((y) => ({ value: y, label: String(y) })),
    },
];

export default function MarksheetPage() {
    return (
        <CrudPage
            title="Marksheet"
            subtitle="Student scorecard management with grade tracking"
            endpoint="marksheets"
            columns={columns}
            formFields={formFields}
            filterConfig={filterConfig}
            accentColor="#F59E0B"
            emptyIcon="📋"
        />
    );
}
