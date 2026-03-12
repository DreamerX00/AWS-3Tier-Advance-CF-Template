import { Chip, Typography } from '@mui/material';
import CrudPage from '../components/CrudPage';

const columns = [
    { field: 'name', header: 'Product Name' },
    {
        field: 'description', header: 'Description',
        render: (val) => val ? val.substring(0, 50) + (val.length > 50 ? '...' : '') : '—',
    },
    {
        field: 'price', header: 'Price',
        render: (val) => (
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#10B981', fontSize: '0.85rem' }}>
                ${Number(val || 0).toFixed(2)}
            </Typography>
        ),
    },
    {
        field: 'category', header: 'Category',
        render: (val) => val ? (
            <Chip label={val} size="small" variant="outlined" sx={{
                borderColor: 'rgba(239,68,68,0.3)', color: '#EF4444', fontSize: '0.7rem',
            }} />
        ) : '—',
    },
    {
        field: 'stock', header: 'Stock',
        render: (val) => (
            <Chip
                label={val <= 5 ? `⚠️ ${val}` : val}
                size="small"
                sx={{
                    bgcolor: val <= 5 ? 'rgba(239,68,68,0.15)' : val <= 20 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                    color: val <= 5 ? '#EF4444' : val <= 20 ? '#F59E0B' : '#10B981',
                    fontWeight: 600, fontSize: '0.75rem',
                }}
            />
        ),
    },
    { field: 'sku', header: 'SKU' },
    { field: 'brand', header: 'Brand' },
];

const formFields = [
    { name: 'name', label: 'Product Name', required: true },
    { name: 'description', label: 'Description', multiline: true },
    { name: 'price', label: 'Price ($)', type: 'number', required: true },
    {
        name: 'category', label: 'Category', type: 'select',
        options: [
            { value: 'Electronics', label: 'Electronics' },
            { value: 'Clothing', label: 'Clothing' },
            { value: 'Books', label: 'Books' },
            { value: 'Food', label: 'Food' },
            { value: 'Software', label: 'Software' },
            { value: 'Hardware', label: 'Hardware' },
        ],
    },
    { name: 'stock', label: 'Stock Quantity', type: 'number', required: true, defaultValue: 0 },
    { name: 'sku', label: 'SKU Code' },
    { name: 'imageUrl', label: 'Image URL' },
    { name: 'brand', label: 'Brand' },
];

const filterConfig = [
    {
        param: 'category', label: 'Category',
        options: [
            { value: 'Electronics', label: 'Electronics' },
            { value: 'Clothing', label: 'Clothing' },
            { value: 'Books', label: 'Books' },
            { value: 'Food', label: 'Food' },
            { value: 'Software', label: 'Software' },
            { value: 'Hardware', label: 'Hardware' },
        ],
    },
];

export default function ProductsPage() {
    return (
        <CrudPage
            title="Product Catalog"
            subtitle="Manage inventory with price and stock tracking"
            endpoint="products"
            columns={columns}
            formFields={formFields}
            filterConfig={filterConfig}
            accentColor="#EF4444"
            emptyIcon="📦"
        />
    );
}
