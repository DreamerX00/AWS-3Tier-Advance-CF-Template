import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#6C63FF',
            light: '#918AFF',
            dark: '#4B45B2',
        },
        secondary: {
            main: '#FF6B9D',
            light: '#FF8FB4',
            dark: '#CC5580',
        },
        background: {
            default: '#0A0E1A',
            paper: '#111827',
        },
        success: {
            main: '#10B981',
        },
        warning: {
            main: '#F59E0B',
        },
        error: {
            main: '#EF4444',
        },
        info: {
            main: '#3B82F6',
        },
        text: {
            primary: '#F1F5F9',
            secondary: '#94A3B8',
        },
    },
    typography: {
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
        h4: { fontWeight: 700, letterSpacing: '-0.02em' },
        h5: { fontWeight: 600, letterSpacing: '-0.01em' },
        h6: { fontWeight: 600 },
        subtitle1: { fontWeight: 500 },
        button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: {
        borderRadius: 12,
    },
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    background: 'linear-gradient(135deg, rgba(17,24,39,0.95) 0%, rgba(30,41,59,0.9) 100%)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    padding: '8px 20px',
                    fontSize: '0.875rem',
                },
                contained: {
                    boxShadow: '0 4px 14px rgba(108,99,255,0.4)',
                    '&:hover': {
                        boxShadow: '0 6px 20px rgba(108,99,255,0.6)',
                    },
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 10,
                        '& fieldset': {
                            borderColor: 'rgba(255,255,255,0.1)',
                        },
                        '&:hover fieldset': {
                            borderColor: 'rgba(108,99,255,0.5)',
                        },
                    },
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                head: {
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#94A3B8',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                },
                body: {
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    background: 'linear-gradient(135deg, #111827 0%, #1E293B 100%)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    fontWeight: 500,
                    borderRadius: 8,
                },
            },
        },
    },
});

export default theme;
