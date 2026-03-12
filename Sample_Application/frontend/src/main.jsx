import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import theme from './theme';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 3000,
                        style: {
                            background: '#1E293B',
                            color: '#F1F5F9',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '10px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                            fontFamily: '"Inter", sans-serif',
                        },
                        success: {
                            iconTheme: { primary: '#10B981', secondary: '#0A0E1A' },
                        },
                        error: {
                            iconTheme: { primary: '#EF4444', secondary: '#0A0E1A' },
                        },
                    }}
                />
                <App />
            </ThemeProvider>
        </BrowserRouter>
    </React.StrictMode>
);
