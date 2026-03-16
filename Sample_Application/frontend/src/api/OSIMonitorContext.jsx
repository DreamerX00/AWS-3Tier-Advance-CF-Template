import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import api from './axiosClient';

export const OSIMonitorContext = createContext(null);

const SYSTEM_POLL_INTERVAL_MS = 15000;

function detectAlerts(event) {
    const alerts = [];
    if (event.latency > 1000) alerts.push({ type: 'CRITICAL', msg: `Extreme latency: ${event.latency}ms` });
    else if (event.latency > 500) alerts.push({ type: 'SLOW', msg: `Slow request: ${event.latency}ms for ${event.method} ${event.url}` });
    if (event.status >= 500) alerts.push({ type: 'ERROR_5XX', msg: `Server error ${event.status}: ${event.method} ${event.url}` });
    else if (event.status >= 400) alerts.push({ type: 'ERROR_4XX', msg: `Client error ${event.status}: ${event.method} ${event.url}` });
    if (event.layers?.L4?.retransmits > 0) alerts.push({ type: 'RETRANSMIT', msg: `TCP retransmissions detected (x${event.layers.L4.retransmits})` });
    return alerts;
}

function calcPercentiles(values) {
    if (!values.length) return { p50: 0, p95: 0, p99: 0 };
    const sorted = [...values].sort((a, b) => a - b);
    const p = (pct) => sorted[Math.min(Math.floor((sorted.length * pct) / 100), sorted.length - 1)];
    return { p50: p(50), p95: p(95), p99: p(99) };
}

function deriveTimeline(latency) {
    const dns = Math.round(2 + Math.random() * 18);
    const tcp = Math.round(10 + Math.random() * 30);
    const tls = Math.round(20 + Math.random() * 60);
    const overhead = dns + tcp + tls;
    const remaining = Math.max(latency - overhead, 5);
    const ttfb = Math.round(remaining * 0.75);
    const download = remaining - ttfb;
    return { dns, tcp, tls, ttfb, download, total: latency };
}

function inferPrimaryDependency(url = '') {
    const normalized = url.replace(/^\/api/, '');
    if (!normalized) return null;

    if (
        normalized.startsWith('/files')
        || normalized.startsWith('/storage')
        || normalized.startsWith('/uploads')
    ) {
        return 'storage';
    }

    if (
        normalized.startsWith('/health')
        || normalized.startsWith('/system')
        || normalized.startsWith('/dashboard')
        || normalized.startsWith('/activity')
    ) {
        return 'database';
    }

    return 'database';
}

function buildProbeFailureSummary(message) {
    const now = new Date().toISOString();
    return {
        status: 'DOWN',
        generatedAt: now,
        components: [
            { name: 'Backend API', status: 'DOWN', detail: `System summary probe failed: ${message}` },
            { name: 'PostgreSQL', status: 'UNKNOWN', detail: 'Database status unavailable because the backend did not answer.' },
            { name: 'Object Storage', status: 'UNKNOWN', detail: 'Storage status unavailable because the backend did not answer.' },
        ],
    };
}

function buildSystemAlerts(summary) {
    if (!summary?.components?.length) return [];

    return summary.components
        .filter((component) => component.status === 'DOWN' || component.status === 'DEGRADED')
        .map((component) => ({
            id: `system-${component.name}`,
            type: component.status === 'DOWN' ? 'SYSTEM_DOWN' : 'SYSTEM_DEGRADED',
            msg: `${component.name}: ${component.detail}`,
            timestamp: summary.generatedAt || new Date().toISOString(),
            source: 'system',
        }));
}

function componentStatusMap(summary) {
    const components = summary?.components || [];
    const statusFor = (name, fallback = 'UNKNOWN') =>
        components.find((component) => component.name === name)?.status || fallback;

    return {
        frontend: 'UP',
        proxy: 'UP',
        backend: statusFor('Backend API', summary?.status || 'UNKNOWN'),
        database: statusFor('PostgreSQL'),
        storage: statusFor('Object Storage'),
    };
}

function isMonitorProbe(config) {
    return Boolean(config?.__skipOSIMonitor || config?.headers?.['X-OSI-Probe']);
}

function deriveLayerData(config, response, error, durationMs) {
    const url = config?.url || '';
    const method = (config?.method || 'GET').toUpperCase();
    const status = response?.status || error?.response?.status || 0;
    const responseData = response?.data || error?.response?.data || {};
    const responseSize = JSON.stringify(responseData).length;
    const requestSize = config?.__chunkSize !== undefined
        ? config.__chunkSize
        : (config?.data instanceof FormData
            ? Number(config?.headers?.['Content-Length'] || 2048)
            : JSON.stringify(config?.data || {}).length);
    const host = config?.baseURL || window.location.host;
    const port = host.includes(':') ? host.split(':').pop() : '80';

    const ttl = 58 + Math.floor(Math.random() * 6);
    const segment = Math.min(requestSize + 54, 1460);
    const frameSize = segment + 26;
    const signalDbm = -(40 + Math.floor(Math.random() * 30));
    const hops = 3 + Math.floor(Math.random() * 5);
    const sessionId = `s-${Math.random().toString(36).slice(2, 10)}`;
    const dependency = inferPrimaryDependency(url);

    const ciphers = ['TLS_AES_256_GCM_SHA384', 'TLS_CHACHA20_POLY1305_SHA256', 'TLS_AES_128_GCM_SHA256'];
    const cipher = ciphers[Math.floor(Math.random() * ciphers.length)];
    const contentType = response?.headers?.['content-type'] || 'application/json';
    const encoding = contentType.includes('json') ? 'JSON/UTF-8' : 'Binary/UTF-8';
    const retransmits = status >= 500 ? Math.floor(Math.random() * 3) : 0;

    const requestHeaders = {
        'Content-Type': config?.headers?.['Content-Type'] || 'application/json',
        Accept: 'application/json, */*',
        'X-Request-ID': Math.random().toString(36).slice(2, 10),
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    };
    const responseHeaders = {
        'Content-Type': contentType,
        'X-Response-Time': `${durationMs}ms`,
        'Transfer-Encoding': responseSize > 1024 ? 'chunked' : 'identity',
        Connection: 'keep-alive',
    };

    const hexBytes = Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
    ).join(' ');

    return {
        id: `pkt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date(),
        method,
        url,
        status,
        latency: durationMs,
        requestSize,
        responseSize,
        dependency,
        requestHeaders,
        responseHeaders,
        hexDump: hexBytes,
        timeline: deriveTimeline(durationMs),
        layers: {
            L7: {
                protocol: 'HTTP/1.1',
                method,
                url,
                status,
                contentType,
                host: host.split(':')[0],
                userAgent: navigator.userAgent.split(' ')[0],
                requestBodySize: `${requestSize}B`,
                responseBodySize: `${responseSize}B`,
            },
            L6: {
                encoding,
                compression: responseSize > 1024 ? 'gzip' : 'none',
                tlsCipher: cipher,
                tlsVersion: 'TLSv1.3',
                serialization: 'JSON',
                integrityCheck: 'SHA-256',
            },
            L5: {
                sessionId,
                keepalive: true,
                connectionDuration: `${(Math.random() * 30).toFixed(1)}s`,
                sessionState: status >= 200 && status < 400 ? 'ESTABLISHED' : 'CLOSING',
                multiplexed: true,
                dialogControl: 'Full-Duplex',
            },
            L4: {
                protocol: 'TCP',
                srcPort: 40000 + Math.floor(Math.random() * 10000),
                dstPort: parseInt(port, 10) || 80,
                segmentSize: segment,
                rtt: `${durationMs}ms`,
                windowSize: 65535,
                retransmits,
                tcpFlags: status < 400 ? ['SYN', 'ACK', 'PSH'] : ['RST', 'ACK'],
                mss: 1460,
            },
            L3: {
                protocol: 'IPv4',
                srcIP: `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
                dstIP: `172.16.${Math.floor(Math.random() * 16)}.${Math.floor(Math.random() * 255)}`,
                ttl,
                packetSize: frameSize - 14,
                fragmentation: "DF (Don't Fragment)",
                hops,
                dscp: 'CS0 (Best Effort)',
                ecn: 'Non-ECN',
            },
            L2: {
                protocol: 'Ethernet II',
                srcMAC: Array.from({ length: 6 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':'),
                dstMAC: 'ff:ff:ff:10:b2:9a',
                frameSize,
                mtu: 1500,
                vlan: 100,
                frameType: '0x0800 (IPv4)',
                crc: 'Valid',
            },
            L1: {
                medium: 'Fiber Optic',
                linkSpeed: '10 Gbps',
                signalStrength: `${signalDbm} dBm`,
                bandwidth: `${(responseSize / 1024 / (durationMs / 1000 || 0.001)).toFixed(2)} KB/s`,
                encoding: '64b/66b',
                bitErrors: 0,
                duplex: 'Full-Duplex',
                wavelength: '1310 nm',
            },
        },
        alerts: detectAlerts({ latency: durationMs, status, method, url, layers: { L4: { retransmits } } }),
        direction: 'request',
        tcpState: status < 400 ? 'ESTABLISHED' : 'CLOSE_WAIT',
    };
}

export function OSIMonitorProvider({ children }) {
    const [events, setEvents] = useState([]);
    const [isPaused, setIsPaused] = useState(false);
    const [isOpen, setIsOpen] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth >= 1280;
    });
    const [systemSummary, setSystemSummary] = useState(null);
    const [systemAlerts, setSystemAlerts] = useState([]);
    const isPausedRef = useRef(false);
    const pendingRef = useRef({});
    const latencyBufferRef = useRef([]);

    const [metrics, setMetrics] = useState({
        totalRequests: 0,
        successRate: 100,
        avgLatency: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        activeConnections: 0,
        totalBytesIn: 0,
        totalBytesOut: 0,
        latencyHistory: [],
        bandwidthHistory: [],
        statusBreakdown: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 },
        layerStats: {
            L7: { count: 0, bytes: 0 },
            L6: { count: 0, bytes: 0 },
            L5: { count: 0, bytes: 0 },
            L4: { count: 0, bytes: 0 },
            L3: { count: 0, bytes: 0 },
            L2: { count: 0, bytes: 0 },
            L1: { count: 0, bytes: 0 },
        },
        alerts: [],
        errorRate: 0,
    });

    const addEvent = useCallback((event) => {
        if (isPausedRef.current) return;

        setEvents((prev) => [event, ...prev].slice(0, 200));

        latencyBufferRef.current = [...latencyBufferRef.current, event.latency].slice(-100);
        const percentiles = calcPercentiles(latencyBufferRef.current);

        setMetrics((prev) => {
            const total = prev.totalRequests + 1;
            const latencies = [...prev.latencyHistory, { t: Date.now(), v: event.latency }].slice(-50);
            const bwHistory = [...prev.bandwidthHistory, {
                t: Date.now(),
                bwIn: Number((event.responseSize / 1024).toFixed(2)),
                bwOut: Number((event.requestSize / 1024).toFixed(2)),
            }].slice(-50);
            const avgLat = Math.round(latencies.reduce((sum, item) => sum + item.v, 0) / latencies.length);
            const breakdown = { ...prev.statusBreakdown };

            if (event.status >= 200 && event.status < 300) breakdown['2xx']++;
            else if (event.status >= 300 && event.status < 400) breakdown['3xx']++;
            else if (event.status >= 400 && event.status < 500) breakdown['4xx']++;
            else if (event.status >= 500) breakdown['5xx']++;

            const successRate = Math.round(((breakdown['2xx'] + breakdown['3xx']) / total) * 100);
            const errorRate = Math.round(((breakdown['4xx'] + breakdown['5xx']) / total) * 100);

            const layerStats = { ...prev.layerStats };
            const totalBytes = event.requestSize + event.responseSize;
            Object.keys(layerStats).forEach((layer) => {
                layerStats[layer] = {
                    count: (layerStats[layer]?.count || 0) + 1,
                    bytes: (layerStats[layer]?.bytes || 0) + totalBytes,
                };
            });

            const newAlerts = (event.alerts || []).map((alert) => ({
                ...alert,
                id: event.id,
                timestamp: event.timestamp,
                url: event.url,
                source: 'request',
            }));

            return {
                totalRequests: total,
                successRate,
                avgLatency: avgLat,
                ...percentiles,
                activeConnections: Math.max(0, prev.activeConnections),
                totalBytesIn: prev.totalBytesIn + event.responseSize,
                totalBytesOut: prev.totalBytesOut + event.requestSize,
                latencyHistory: latencies,
                bandwidthHistory: bwHistory,
                statusBreakdown: breakdown,
                layerStats,
                alerts: [...newAlerts, ...prev.alerts].slice(0, 50),
                errorRate,
            };
        });
    }, []);

    useEffect(() => {
        const reqId = api.interceptors.request.use((config) => {
            if (isMonitorProbe(config)) {
                return config;
            }

            const key = `${config.method}-${config.url}-${Date.now()}`;
            config.__osiKey = key;
            pendingRef.current[key] = Date.now();
            setMetrics((prev) => ({ ...prev, activeConnections: prev.activeConnections + 1 }));

            if (config.data instanceof FormData || config.headers?.['Content-Type']?.toString().includes('multipart')) {
                const originalOnUploadProgress = config.onUploadProgress;
                let lastLoaded = 0;
                let lastTime = Date.now();

                config.onUploadProgress = (progressEvent) => {
                    if (originalOnUploadProgress) originalOnUploadProgress(progressEvent);

                    const now = Date.now();
                    const chunkLoaded = progressEvent.loaded - lastLoaded;

                    if (chunkLoaded > 0 && now - lastTime > 250) {
                        const duration = now - lastTime;
                        const fakeConfig = { ...config, __chunkSize: chunkLoaded };
                        const genericEvent = deriveLayerData(fakeConfig, { status: 102, data: {} }, null, duration);
                        genericEvent.method = 'UPLOAD';
                        genericEvent.status = 102;
                        genericEvent.alerts = [];
                        addEvent(genericEvent);
                        lastLoaded = progressEvent.loaded;
                        lastTime = now;
                    }
                };
            }

            return config;
        });

        const resId = api.interceptors.response.use(
            (response) => {
                if (isMonitorProbe(response.config)) {
                    return response;
                }

                const key = response.config.__osiKey;
                const start = pendingRef.current[key] || Date.now();
                const duration = Date.now() - start;
                delete pendingRef.current[key];
                setMetrics((prev) => ({ ...prev, activeConnections: Math.max(0, prev.activeConnections - 1) }));
                addEvent(deriveLayerData(response.config, response, null, duration));
                return response;
            },
            (error) => {
                if (isMonitorProbe(error.config)) {
                    return Promise.reject(error);
                }

                const key = error.config?.__osiKey;
                const start = pendingRef.current[key] || Date.now();
                const duration = Date.now() - start;
                if (key) delete pendingRef.current[key];
                setMetrics((prev) => ({ ...prev, activeConnections: Math.max(0, prev.activeConnections - 1) }));
                addEvent(deriveLayerData(error.config, null, error, duration));
                return Promise.reject(error);
            }
        );

        return () => {
            api.interceptors.request.eject(reqId);
            api.interceptors.response.eject(resId);
        };
    }, [addEvent]);

    useEffect(() => {
        let cancelled = false;

        const loadSystemSummary = async () => {
            try {
                const response = await api.get('/system/summary', {
                    __skipOSIMonitor: true,
                    headers: { 'X-OSI-Probe': 'system-summary' },
                });

                if (cancelled) return;
                setSystemSummary(response.data);
                setSystemAlerts(buildSystemAlerts(response.data));
            } catch (error) {
                if (cancelled) return;
                const fallbackSummary = buildProbeFailureSummary(error?.message || 'Network request failed');
                setSystemSummary(fallbackSummary);
                setSystemAlerts(buildSystemAlerts(fallbackSummary));
            }
        };

        loadSystemSummary();
        const intervalId = window.setInterval(loadSystemSummary, SYSTEM_POLL_INTERVAL_MS);

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
        };
    }, []);

    const togglePause = useCallback(() => {
        setIsPaused((paused) => {
            isPausedRef.current = !paused;
            return !paused;
        });
    }, []);

    const clearLog = useCallback(() => {
        setEvents([]);
        latencyBufferRef.current = [];
        setMetrics({
            totalRequests: 0,
            successRate: 100,
            avgLatency: 0,
            p50: 0,
            p95: 0,
            p99: 0,
            activeConnections: 0,
            totalBytesIn: 0,
            totalBytesOut: 0,
            latencyHistory: [],
            bandwidthHistory: [],
            statusBreakdown: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 },
            layerStats: {
                L7: { count: 0, bytes: 0 },
                L6: { count: 0, bytes: 0 },
                L5: { count: 0, bytes: 0 },
                L4: { count: 0, bytes: 0 },
                L3: { count: 0, bytes: 0 },
                L2: { count: 0, bytes: 0 },
                L1: { count: 0, bytes: 0 },
            },
            alerts: [],
            errorRate: 0,
        });
    }, []);

    const exportLog = useCallback(() => {
        const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `osi-monitor-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }, [events]);

    return (
        <OSIMonitorContext.Provider
            value={{
                events,
                metrics,
                isPaused,
                isOpen,
                setIsOpen,
                togglePause,
                clearLog,
                exportLog,
                systemSummary,
                systemAlerts,
                componentStatuses: componentStatusMap(systemSummary),
            }}
        >
            {children}
        </OSIMonitorContext.Provider>
    );
}

export function useOSIMonitor() {
    const ctx = useContext(OSIMonitorContext);
    if (!ctx) throw new Error('useOSIMonitor must be used within OSIMonitorProvider');
    return ctx;
}
