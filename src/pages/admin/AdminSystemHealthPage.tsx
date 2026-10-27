import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api.js';
import { useTheme } from '../../context/ThemeContext.js';
import { 
  Activity, 
  Database, 
  HardDrive, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ShieldCheck, 
  Zap, 
  Server,
  SlidersHorizontal,
  BellRing,
  Check,
  AlertCircle,
  RotateCcw,
  X,
  Bell,
  Volume2,
  ExternalLink,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Filter,
  ArrowUpDown,
  Search,
  Info,
  ListFilter,
  Terminal,
  ChevronDown,
  ChevronUp,
  Copy,
  GitCompare,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Wrench,
  Trash2,
  Play,
  CheckCheck,
  Cpu,
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

interface AlertThresholds {
  latencyMs: number;
  storagePct: number;
}

export interface DiagnosticLog {
  id: string;
  timestamp: string;
  level: 'ERROR' | 'WARNING' | 'INFO';
  subsystem: 'Database' | 'IoT Gateway' | 'Security / Auth' | 'Storage' | 'API Gateway' | 'Network' | 'Worker';
  message: string;
  traceId: string;
  details?: string;
  metricContext?: string;
}

interface ToastNotification {
  id: string;
  type: 'WARNING' | 'CRITICAL' | 'SUCCESS';
  title: string;
  message: string;
  metric: string;
  currentValue: string;
  thresholdValue: string;
  timestamp: string;
}

const DEFAULT_THRESHOLDS: AlertThresholds = {
  latencyMs: 30, // 30ms threshold
  storagePct: 35 // 35% threshold
};

export const AdminSystemHealthPage: React.FC = () => {
  const { isLightMode } = useTheme();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Threshold Configuration State
  const [thresholds, setThresholds] = useState<AlertThresholds>(() => {
    try {
      const stored = localStorage.getItem('smartcampus_health_thresholds');
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return DEFAULT_THRESHOLDS;
  });

  const [formLatency, setFormLatency] = useState<number>(thresholds.latencyMs);
  const [formStorage, setFormStorage] = useState<number>(thresholds.storagePct);
  const [savedNotice, setSavedNotice] = useState(false);
  const [showConfig, setShowConfig] = useState(true);
  const [comparePrevWeek, setComparePrevWeek] = useState<boolean>(false);

  // Real-time Toast Notifications state
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const lastAlertedRef = useRef<{ latency: number; storage: number }>({ latency: 0, storage: 0 });
  const configSectionRef = useRef<HTMLDivElement>(null);

  // Diagnostic Logs Filter & Sort State
  const [logLevelFilter, setLogLevelFilter] = useState<'ALL' | 'ERROR' | 'WARNING' | 'INFO'>('ALL');
  const [logSortOrder, setLogSortOrder] = useState<
    'SEVERITY_DESC' | 'SEVERITY_ASC' | 'TIMESTAMP_DESC' | 'TIMESTAMP_ASC'
  >('SEVERITY_DESC');
  const [logSubsystemFilter, setLogSubsystemFilter] = useState<string>('ALL');
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedTraceId, setCopiedTraceId] = useState<string | null>(null);

  // Automated Database Maintenance & Cleanup Job State
  const [showMaintenanceModal, setShowMaintenanceModal] = useState<boolean>(false);
  const [maintenanceInProgress, setMaintenanceInProgress] = useState<boolean>(false);
  const [maintenanceOptions, setMaintenanceOptions] = useState({
    rebuildIndexes: true,
    vacuumAnalyze: true,
    purgeTempTelemetry: true,
    compressAuditLogs: true
  });
  const [maintenanceProgressStep, setMaintenanceProgressStep] = useState<number>(0);
  const [maintenanceResult, setMaintenanceResult] = useState<any>(null);
  const [maintenanceError, setMaintenanceError] = useState<string | null>(null);

  const handleRunMaintenance = async () => {
    setMaintenanceInProgress(true);
    setMaintenanceError(null);
    setMaintenanceResult(null);
    setMaintenanceProgressStep(1);

    const timer1 = setTimeout(() => setMaintenanceProgressStep(2), 320);
    const timer2 = setTimeout(() => setMaintenanceProgressStep(3), 680);
    const timer3 = setTimeout(() => setMaintenanceProgressStep(4), 1040);

    try {
      const res = await api.triggerDatabaseMaintenance(maintenanceOptions);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setMaintenanceProgressStep(5);

      if (res.success) {
        setMaintenanceResult(res);

        // Update live state with the reclaimed storage metrics and diagnostic audit entry
        setData((prev: any) => {
          if (!prev) return prev;
          const updatedLogs = res.maintenanceLog
            ? [res.maintenanceLog, ...(prev.system?.diagnosticLogs || [])]
            : prev.system?.diagnosticLogs;
          return {
            ...prev,
            system: {
              ...prev.system,
              storage: res.newStorage,
              diagnosticLogs: updatedLogs
            }
          };
        });

        // Trigger success feedback toast
        addToast({
          type: 'SUCCESS',
          title: 'Database Maintenance Completed',
          message: `Rebuilt B-Tree indexes, vacuumed dead tuples, and reclaimed ${res.reclaimedGB} GB (${res.reclaimedMB} MB) of disk space.`,
          metric: 'Disk Storage',
          currentValue: `${res.newStorage?.usagePercentage}%`,
          thresholdValue: `${thresholds.storagePct}%`
        });
      }
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setMaintenanceError(err.message || 'Database maintenance routine execution failed');
      addToast({
        type: 'CRITICAL',
        title: 'Maintenance Execution Failed',
        message: err.message || 'An error occurred during database indexing and cleanup routine.',
        metric: 'Database Maintenance',
        currentValue: 'ERROR',
        thresholdValue: 'NOMINAL'
      });
    } finally {
      setMaintenanceInProgress(false);
    }
  };

  const copyTraceId = (traceId: string) => {
    try {
      navigator.clipboard?.writeText(traceId);
      setCopiedTraceId(traceId);
      setTimeout(() => setCopiedTraceId(null), 2000);
    } catch {
      // fallback
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const addToast = (toast: Omit<ToastNotification, 'id' | 'timestamp'>) => {
    const newToast: ToastNotification = {
      ...toast,
      id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    setToasts(prev => {
      // Limit to max 3 concurrent visible toasts to keep UI clean
      const updated = [newToast, ...prev.slice(0, 2)];
      return updated;
    });

    // Auto-dismiss after 7 seconds
    setTimeout(() => {
      removeToast(newToast.id);
    }, 7000);
  };

  const checkThresholdsAndNotify = (sysData: any, currentThresh: AlertThresholds) => {
    if (!sysData) return;

    const latency = sysData.apiMetrics?.avgLatencyMs ?? 0;
    const storagePct = sysData.storage?.usagePercentage ?? 0;
    const now = Date.now();

    // Notify for latency breach (cooldown: 25s per identical breach type to avoid spamming)
    if (latency > currentThresh.latencyMs && now - lastAlertedRef.current.latency > 25000) {
      lastAlertedRef.current.latency = now;
      addToast({
        type: 'WARNING',
        title: 'API Latency Threshold Breached',
        message: `Global average response latency reached ${latency} ms, exceeding policy threshold of ${currentThresh.latencyMs} ms.`,
        metric: 'API Latency',
        currentValue: `${latency} ms`,
        thresholdValue: `${currentThresh.latencyMs} ms`
      });
    }

    // Notify for storage breach
    if (storagePct > currentThresh.storagePct && now - lastAlertedRef.current.storage > 25000) {
      lastAlertedRef.current.storage = now;
      addToast({
        type: 'WARNING',
        title: 'Storage Capacity Threshold Breached',
        message: `Campus disk consumption is at ${storagePct}% (${sysData.storage?.usedGB} GB), exceeding limit of ${currentThresh.storagePct}%.`,
        metric: 'Disk Storage',
        currentValue: `${storagePct}%`,
        thresholdValue: `${currentThresh.storagePct}%`
      });
    }
  };

  const fetchHealth = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await api.getSystemHealth();
      if (res.success && res.system) {
        setData(res);
        setLastRefreshed(new Date());
        checkThresholdsAndNotify(res.system, thresholds);
      }
    } catch (err: any) {
      // Safe fallback when telemetry service is updating or session expires
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  // Check whenever thresholds change
  useEffect(() => {
    if (data?.system) {
      checkThresholdsAndNotify(data.system, thresholds);
    }
  }, [thresholds]);

  // Auto-refresh interval (every 15 seconds)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchHealth();
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, thresholds]);

  const handleSaveThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      latencyMs: Number(formLatency),
      storagePct: Number(formStorage)
    };
    setThresholds(updated);
    try {
      localStorage.setItem('smartcampus_health_thresholds', JSON.stringify(updated));
    } catch {
      // fallback
    }
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);

    // Trigger immediate evaluation with the newly configured thresholds
    lastAlertedRef.current = { latency: 0, storage: 0 };
    if (data?.system) {
      checkThresholdsAndNotify(data.system, updated);
    }
  };

  const handleApplyPreset = (latency: number, storage: number) => {
    setFormLatency(latency);
    setFormStorage(storage);
    const updated = { latencyMs: latency, storagePct: storage };
    setThresholds(updated);
    localStorage.setItem('smartcampus_health_thresholds', JSON.stringify(updated));
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);

    // Reset cooldown to immediately test toast alerts
    lastAlertedRef.current = { latency: 0, storage: 0 };
    if (data?.system) {
      checkThresholdsAndNotify(data.system, updated);
    }
  };

  const handleResetDefaults = () => {
    setFormLatency(DEFAULT_THRESHOLDS.latencyMs);
    setFormStorage(DEFAULT_THRESHOLDS.storagePct);
    setThresholds(DEFAULT_THRESHOLDS);
    localStorage.removeItem('smartcampus_health_thresholds');
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleTriggerTestToast = () => {
    addToast({
      type: 'WARNING',
      title: 'Manual Threshold Probe Test',
      message: 'Simulated real-time alert toast triggered via admin diagnostic controls.',
      metric: 'API Latency & Storage',
      currentValue: `${data?.system?.apiMetrics?.avgLatencyMs ?? 23.4} ms`,
      thresholdValue: `${thresholds.latencyMs} ms`
    });
  };

  const scrollToConfig = () => {
    setShowConfig(true);
    configSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleExportCSV = () => {
    if (!data?.system) return;

    const sys = data.system;
    const db = sys.database;
    const storage = sys.storage;
    const apiMetrics = sys.apiMetrics;
    const uptimeHistory = sys.uptimeHistory || [];
    const services = sys.services || [];
    const nowIso = new Date().toISOString();

    const csvRows: string[] = [];

    // Header metadata
    csvRows.push('# SMART CAMPUS ENTERPRISE ERP - SYSTEM HEALTH AUDIT EXPORT');
    csvRows.push(`# Generated At: ${nowIso}`);
    csvRows.push(`# Cluster: Prod-Asia-01 (Region: asia-southeast1)`);
    csvRows.push(`# Node Runtime: ${sys.nodeVersion} (${sys.platform})`);
    csvRows.push(`# 30-Day Uptime SLA: ${sys.uptimePercentage}%`);
    csvRows.push(`# Global Health Status: ${data.overallHealth || 'HEALTHY'}`);
    csvRows.push('');

    // System & Database Metrics
    csvRows.push('CATEGORY,METRIC_NAME,RECORDED_VALUE,UNIT,STATUS_OR_POLICY');
    csvRows.push(`System,Process Uptime Seconds,${sys.uptimeSeconds},seconds,Operational`);
    csvRows.push(`System,Uptime SLA Percentage,${sys.uptimePercentage},%,Target: >=99.9%`);
    csvRows.push(`System,Memory RSS,${sys.memory?.rssMB},MB,Normal`);
    csvRows.push(`System,Memory Heap Used,${sys.memory?.heapUsedMB},MB,${sys.memory?.heapPercentage}% of heap`);
    csvRows.push(`Database,Connection Status,${db?.status || 'CONNECTED'},,Healthy`);
    csvRows.push(`Database,Connection Latency,${db?.connectionLatencyMs},ms,Target: <5.0ms`);
    csvRows.push(`Database,Active Connections,${db?.activeConnections},pool connections,Max Pool: ${db?.maxPoolSize}`);
    csvRows.push(`Database,Idle Connections,${db?.idleConnections},pool connections,`);
    csvRows.push(`Database,Query Throughput,${db?.queriesPerSec},queries/sec,Real-Time`);
    csvRows.push(`Database,Replication Lag,${db?.replicationLagMs},ms,Synchronous`);
    csvRows.push(`Database,SSL Encryption,${db?.sslActive ? 'TLS 1.3 Active' : 'Inactive'},,Encrypted`);
    csvRows.push(`Database,Enrolled Students,${db?.recordsCount?.students ?? 0},records,Table: students`);
    csvRows.push(`Database,Faculty Profiles,${db?.recordsCount?.faculty ?? 0},records,Table: faculty`);
    csvRows.push(`Database,Turnstile BLE Gate Nodes,${db?.recordsCount?.devices ?? 0},nodes,Table: devices`);
    csvRows.push(`Database,Attendance BLE Events,${db?.recordsCount?.bleEvents ?? 0},records,Table: ble_events`);
    csvRows.push(`Database,Attendance Day Logs,${db?.recordsCount?.attendanceRecords ?? 0},records,Table: attendance_records`);
    csvRows.push(`Database,Admission Applications,${db?.recordsCount?.applications ?? 0},records,Table: admission_applications`);
    csvRows.push(`Database,Audit Trail Entries,${db?.recordsCount?.auditLogs ?? 0},records,Table: audit_logs`);
    csvRows.push('');

    // Storage Breakdown
    csvRows.push('STORAGE_CATEGORY,ALLOCATED_OR_USED_GB,PERCENTAGE_OF_TOTAL,THRESHOLD_POLICY');
    csvRows.push(`Total Disk Volume,${storage?.totalGB},100%,Total Capacity`);
    csvRows.push(`Used Disk Space,${storage?.usedGB},${storage?.usagePercentage}%,Configured Limit: ${thresholds.storagePct}%`);
    csvRows.push(`Free Disk Space,${storage?.freeGB},${100 - (storage?.usagePercentage || 0)}%,Available`);
    if (storage?.breakdown) {
      for (const item of storage.breakdown) {
        csvRows.push(`"${item.name}",${item.sizeGB},${item.percentage}%,Subsystem Allocation`);
      }
    }
    csvRows.push('');

    // Database Maintenance History & Status
    const maint = storage?.maintenanceInfo;
    if (maint) {
      csvRows.push('# AUTOMATED DATABASE INDEXING & CLEANUP AUDIT');
      csvRows.push('MAINTENANCE_METRIC,VALUE,UNIT_OR_TARGET');
      csvRows.push(`Last Maintenance Run,"${maint.lastRunAt || 'Never'}",Timestamp ISO-8601`);
      csvRows.push(`Total Maintenance Executions,${maint.totalRuns || 0},Completed Jobs`);
      csvRows.push(`Total Storage Reclaimed,${maint.totalReclaimedGB || 0},GB Disk Space Reclaimed`);
      csvRows.push(`Last Execution Duration,${maint.lastDurationMs || 0},ms`);
      csvRows.push('');
    }

    // API Performance Metrics
    csvRows.push('API_METRIC_NAME,METRIC_VALUE,UNIT,POLICY_THRESHOLD');
    csvRows.push(`Global Average Latency,${apiMetrics?.avgLatencyMs},ms,Configured Limit: ${thresholds.latencyMs} ms`);
    csvRows.push(`P95 Latency Percentile,${apiMetrics?.p95LatencyMs},ms,Target SLA: <60 ms`);
    csvRows.push(`P99 Latency Percentile,${apiMetrics?.p99LatencyMs},ms,Target SLA: <100 ms`);
    csvRows.push(`Global Request Throughput,${apiMetrics?.throughputRps},requests/sec,Active`);
    csvRows.push(`Transaction Error Rate,${apiMetrics?.errorRatePercentage},%,Target: <0.05%`);
    csvRows.push('');

    // Endpoint Breakdown Matrix
    csvRows.push('ENDPOINT_PATH,REQUESTS_24H,AVG_LATENCY_MS,P95_MS,P99_MS,CONFIGURED_LIMIT_MS,COMPLIANCE_STATUS');
    if (apiMetrics?.endpointBreakdown) {
      for (const ep of apiMetrics.endpointBreakdown) {
        const exceeds = ep.avgLatency > thresholds.latencyMs;
        csvRows.push(`"${ep.endpoint}",${ep.reqCount},${ep.avgLatency},${ep.p95},${ep.p99},${thresholds.latencyMs},${exceeds ? 'EXCEEDS_THRESHOLD' : 'WITHIN_LIMIT'}`);
      }
    }
    csvRows.push('');

    // 7-Day Performance Benchmark Comparison Summary
    const comp = sys?.comparisonBaseline;
    if (comp) {
      csvRows.push('# 7-DAY BENCHMARK COMPARISON (LIVE VS. PREVIOUS WEEK SAME TIME PERIOD)');
      csvRows.push('BENCHMARK_METRIC,CURRENT_PERIOD,PREVIOUS_WEEK_PERIOD,ABSOLUTE_DELTA,PERCENTAGE_CHANGE,PERFORMANCE_STATUS');
      csvRows.push(`Average API Latency,${comp.currentAvgLatencyMs} ms,${comp.prevWeekAvgLatencyMs} ms,${comp.latencyDeltaMs} ms,${comp.latencyDeltaPct}%,${comp.latencyDeltaMs <= 0 ? 'FASTER_OPTIMIZED' : 'SLOWER_ELEVATED'}`);
      csvRows.push(`Average Uptime SLA,${comp.currentAvgUptime}%,${comp.prevWeekAvgUptime}%,${comp.uptimeDeltaPct}%,${comp.uptimeDeltaPct >= 0 ? 'INCREASED' : 'DECREASED'},${comp.currentAvgUptime >= 99.9 ? 'HEALTHY_SLA' : 'DEGRADED'}`);
      csvRows.push(`Average Traffic Throughput,${comp.currentAvgRequestsPerMin} req/min,${comp.prevWeekAvgRequestsPerMin} req/min,${comp.currentAvgRequestsPerMin - comp.prevWeekAvgRequestsPerMin} req/min,${comp.trafficGrowthPct}%,TRAFFIC_GROWTH`);
      csvRows.push('');
    }

    // 24-Hour Historical Uptime & Weekly Benchmark Log
    csvRows.push('HOURLY_WINDOW,CURRENT_UPTIME_PCT,CURRENT_LATENCY_MS,PREV_WEEK_LATENCY_MS,LATENCY_DELTA_MS,LATENCY_PCT_CHANGE,CURRENT_REQ_PER_MIN,PREV_WEEK_REQ_PER_MIN,ERROR_RATE_PCT');
    for (const h of uptimeHistory) {
      csvRows.push(`"${h.time}",${h.uptime},${h.latencyMs},${h.prevWeekLatencyMs ?? 'N/A'},${h.latencyDeltaMs ?? 'N/A'},${h.latencyDeltaPct !== undefined ? `${h.latencyDeltaPct}%` : 'N/A'},${h.requestsPerMin},${h.prevWeekRequestsPerMin ?? 'N/A'},${h.errorRate}`);
    }
    csvRows.push('');

    // Microservices Component Integrity Probe
    csvRows.push('MICROSERVICE_NAME,SERVICE_TYPE,PROBE_LATENCY_MS,OPERATIONAL_STATUS');
    for (const svc of services) {
      csvRows.push(`"${svc.name}","${svc.type}",${svc.latencyMs},${svc.status}`);
    }
    csvRows.push('');

    // System Diagnostic & Incident Logs
    csvRows.push('LOG_ID,TIMESTAMP,SEVERITY_LEVEL,SUBSYSTEM,MESSAGE,METRIC_CONTEXT,TRACE_ID,DEBUG_DETAILS');
    const logsForExport: DiagnosticLog[] = sys.diagnosticLogs || [];
    for (const log of logsForExport) {
      csvRows.push(`"${log.id}","${log.timestamp}","${log.level}","${log.subsystem}","${(log.message || '').replace(/"/g, '""')}","${(log.metricContext || '').replace(/"/g, '""')}","${log.traceId}","${(log.details || '').replace(/"/g, '""')}"`);
    }

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    const filenameDate = new Date().toISOString().replace(/[:.]/g, '-');
    downloadAnchor.href = url;
    downloadAnchor.download = `SmartCampus_SystemHealth_Audit_${filenameDate}.csv`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(url);

    // Notify via toast
    addToast({
      type: 'SUCCESS',
      title: 'Audit CSV Exported Successfully',
      message: `Complete system health snapshot with ${uptimeHistory.length}h uptime and diagnostic logs exported for audit inspection.`,
      metric: 'CSV Audit Log',
      currentValue: 'Exported',
      thresholdValue: 'RFC 4180'
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto animate-pulse">
        <div className="h-28 bg-[#141021] rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-24 bg-[#141021] rounded-xl" />
          <div className="h-24 bg-[#141021] rounded-xl" />
          <div className="h-24 bg-[#141021] rounded-xl" />
          <div className="h-24 bg-[#141021] rounded-xl" />
        </div>
        <div className="h-80 bg-[#141021] rounded-2xl" />
      </div>
    );
  }

  const sys = data?.system;
  const db = sys?.database;
  const storage = sys?.storage;
  const apiMetrics = sys?.apiMetrics;
  const uptimeHistory = sys?.uptimeHistory || [];
  const comparisonBaseline = sys?.comparisonBaseline;
  const services = sys?.services || [];
  const diagnosticLogs: DiagnosticLog[] = sys?.diagnosticLogs || [];

  // Filter logs by level, subsystem, and search query
  const filteredLogs = diagnosticLogs.filter(log => {
    if (logLevelFilter !== 'ALL' && log.level !== logLevelFilter) return false;
    if (logSubsystemFilter !== 'ALL' && log.subsystem !== logSubsystemFilter) return false;
    if (logSearchQuery.trim()) {
      const q = logSearchQuery.toLowerCase();
      const matchMsg = log.message.toLowerCase().includes(q);
      const matchDetails = log.details?.toLowerCase().includes(q) ?? false;
      const matchTrace = log.traceId.toLowerCase().includes(q);
      const matchSub = log.subsystem.toLowerCase().includes(q);
      const matchMetric = log.metricContext?.toLowerCase().includes(q) ?? false;
      if (!matchMsg && !matchDetails && !matchTrace && !matchSub && !matchMetric) return false;
    }
    return true;
  });

  const severityRank = (lvl: 'ERROR' | 'WARNING' | 'INFO') => {
    switch (lvl) {
      case 'ERROR': return 3;
      case 'WARNING': return 2;
      case 'INFO': return 1;
      default: return 0;
    }
  };

  const sortedLogs = [...filteredLogs].sort((a, b) => {
    if (logSortOrder === 'SEVERITY_DESC') {
      const diff = severityRank(b.level) - severityRank(a.level);
      if (diff !== 0) return diff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }
    if (logSortOrder === 'SEVERITY_ASC') {
      const diff = severityRank(a.level) - severityRank(b.level);
      if (diff !== 0) return diff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }
    if (logSortOrder === 'TIMESTAMP_DESC') {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }
    if (logSortOrder === 'TIMESTAMP_ASC') {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    }
    return 0;
  });

  const totalLogsCount = diagnosticLogs.length;
  const errorLogsCount = diagnosticLogs.filter(l => l.level === 'ERROR').length;
  const warningLogsCount = diagnosticLogs.filter(l => l.level === 'WARNING').length;
  const infoLogsCount = diagnosticLogs.filter(l => l.level === 'INFO').length;

  // Active Alert Evaluations based on Configured Thresholds
  const currentLatency = apiMetrics?.avgLatencyMs ?? 0;
  const currentStoragePct = storage?.usagePercentage ?? 0;

  const isLatencyBreached = currentLatency > thresholds.latencyMs;
  const isStorageBreached = currentStoragePct > thresholds.storagePct;
  const hasActiveBreach = isLatencyBreached || isStorageBreached;

  // Format uptime in human readable
  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  // Custom Chart Tooltip with Current vs Previous Week Comparison
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0]?.payload;
      const prevLatency = point?.prevWeekLatencyMs;
      const latencyDelta = point?.latencyDeltaMs;
      const latencyPct = point?.latencyDeltaPct;
      const curReq = point?.requestsPerMin;
      const prevReq = point?.prevWeekRequestsPerMin;

      return (
        <div className="bg-[#050505] border border-[#3B0A6B] p-3.5 rounded-xl shadow-2xl text-xs space-y-2 min-w-[220px]">
          <div className="flex items-center justify-between border-b border-[#2a1e45] pb-1.5">
            <span className="font-mono text-[#00E5FF] font-bold">{label}</span>
            {comparePrevWeek && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#3B0A6B]/50 text-purple-300 border border-[#5c14a3]">
                7d Overlay
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            {payload.map((entry: any, index: number) => (
              <div key={`item-${index}`} className="text-slate-200 flex items-center justify-between gap-4 font-mono text-[11px]">
                <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}:
                </span>
                <span className="font-bold text-white">{entry.value} {entry.unit || ''}</span>
              </div>
            ))}
          </div>

          {comparePrevWeek && prevLatency !== undefined && (
            <div className="pt-2 border-t border-[#2a1e45] space-y-1 font-mono text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Latency Delta:</span>
                <span className={`font-bold flex items-center gap-1 ${
                  latencyDelta <= 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {latencyDelta <= 0 ? (
                    <>
                      <TrendingDown size={11} />
                      {Math.abs(latencyDelta)} ms faster ({Math.abs(latencyPct)}%)
                    </>
                  ) : (
                    <>
                      <TrendingUp size={11} />
                      +{latencyDelta} ms slower (+{latencyPct}%)
                    </>
                  )}
                </span>
              </div>
              {prevReq !== undefined && (
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span>Traffic Delta:</span>
                  <span className="text-purple-300">
                    {curReq >= prevReq ? '+' : ''}{curReq - prevReq} req/min ({curReq >= prevReq ? '+' : ''}{Math.round(((curReq - prevReq) / prevReq) * 100)}%)
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-fade-in relative pb-16">
      {/* Real-time Notification Toast Stacking Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0">
        {toasts.map(toast => {
          const isSuccess = toast.type === 'SUCCESS';
          const isCritical = toast.type === 'CRITICAL';
          const borderColor = isSuccess 
            ? 'border-emerald-500/50 shadow-[0_10px_35px_rgba(16,185,129,0.25)]' 
            : isCritical 
              ? 'border-rose-500/50 shadow-[0_10px_35px_rgba(244,63,94,0.25)]' 
              : 'border-amber-500/50 shadow-[0_10px_35px_rgba(245,158,11,0.25)]';
          
          const iconBg = isSuccess 
            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
            : isCritical 
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' 
              : 'bg-amber-500/20 border-amber-500/40 text-amber-400';

          const gradientBar = isSuccess
            ? 'from-emerald-400 to-[#00E5FF]'
            : isCritical
              ? 'from-rose-500 to-amber-400'
              : 'from-amber-400 to-[#00E5FF]';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto bg-[#0a0712]/95 backdrop-blur-xl border rounded-2xl p-4 text-xs text-slate-100 flex flex-col gap-2.5 animate-slide-up relative overflow-hidden ${borderColor}`}
            >
              {/* Countdown animation line */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#141021]">
                <div className={`h-full bg-gradient-to-r ${gradientBar} animate-shrink-width`} />
              </div>

              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${iconBg}`}>
                    {isSuccess ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} className="animate-pulse" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-white tracking-tight leading-snug">{toast.title}</h4>
                    <span className="text-[10px] font-mono text-slate-400">{toast.timestamp}</span>
                  </div>
                </div>

                <button
                  onClick={() => removeToast(toast.id)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#141021] transition-colors"
                  title="Dismiss"
                >
                  <X size={15} />
                </button>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed font-sans pl-9">
                {toast.message}
              </p>

              <div className="pl-9 flex items-center justify-between text-[10px] font-mono pt-1 text-slate-400">
                <span className={`bg-[#141021] px-2 py-0.5 rounded border border-[#2a1e45] ${
                  isSuccess ? 'text-emerald-300' : isCritical ? 'text-rose-300' : 'text-amber-300'
                }`}>
                  {toast.metric}: <strong className="text-white">{toast.currentValue}</strong> (Limit: {toast.thresholdValue})
                </span>
                <button
                  onClick={scrollToConfig}
                  className="text-[#00E5FF] hover:underline flex items-center gap-1 font-semibold"
                >
                  Adjust Limit <ChevronRight size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Top Banner & Control Bar */}
      <div className="p-6 lg:p-8 rounded-2xl bg-gradient-to-r from-[#141021] via-[#1c162f] to-[#3B0A6B]/30 border border-[#2a1e45] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-[#00E5FF] animate-pulse" />
            <span className="text-[10px] font-mono uppercase text-[#00E5FF] tracking-widest block">
              Core Infrastructure Monitoring
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Institutional System Health &amp; Telemetry
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Cluster: Prod-Asia-01 &bull; Runtime: Node {sys?.nodeVersion} ({sys?.platform}) &bull; Uptime: {formatUptime(sys?.uptimeSeconds ?? 3600)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="py-2 px-3.5 rounded-xl text-xs font-semibold text-slate-200 bg-[#141021] hover:bg-[#1c162f] border border-[#2a1e45] hover:border-[#00E5FF]/50 hover:text-white transition-all flex items-center gap-2 group cursor-pointer shadow-sm active:scale-95"
            title="Export complete system health snapshot, latency, and storage logs as CSV"
          >
            <Download size={14} className="text-[#00E5FF] group-hover:scale-110 transition-transform" />
            <span>Export Audit CSV</span>
          </button>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`py-2 px-3.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-2 ${
              showConfig 
                ? 'bg-[#3B0A6B] text-white border-[#5c14a3]' 
                : 'bg-[#141021] text-slate-300 border-[#2a1e45] hover:bg-[#1c162f]'
            }`}
          >
            <SlidersHorizontal size={14} className={showConfig ? 'text-[#00E5FF]' : 'text-slate-400'} />
            <span>Threshold Policies</span>
          </button>

          <label className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-[#050505] px-3 py-1.5 rounded-xl border border-[#2a1e45] cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              className="accent-[#00E5FF] rounded"
            />
            <span>Auto-Poll (15s)</span>
          </label>

          <button
            onClick={() => fetchHealth(true)}
            disabled={refreshing}
            className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-[#3B0A6B] hover:bg-[#5c14a3] border border-[#5c14a3] transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Polling...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Prominent Active Threshold Breach Warning Banner */}
      {hasActiveBreach && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-200 text-xs shadow-[0_0_30px_rgba(245,158,11,0.15)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-shake">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400 mt-0.5">
              <AlertTriangle size={20} className="animate-pulse" />
            </div>
            <div className="space-y-1">
              <span className="font-bold text-sm text-amber-300 tracking-tight block">
                Infrastructure Alert: Threshold Breach Detected
              </span>
              <div className="space-y-0.5 text-slate-300 font-mono text-[11px]">
                {isLatencyBreached && (
                  <p className="flex items-center gap-1.5 text-amber-300">
                    &bull; <span>API Latency</span> is <strong className="text-white font-bold">{currentLatency} ms</strong>, exceeding your configured warning limit of <strong className="text-white">{thresholds.latencyMs} ms</strong>.
                  </p>
                )}
                {isStorageBreached && (
                  <p className="flex items-center gap-1.5 text-amber-300">
                    &bull; <span>Storage Capacity</span> is at <strong className="text-white font-bold">{currentStoragePct}%</strong> ({storage?.usedGB} GB used), exceeding your configured warning limit of <strong className="text-white">{thresholds.storagePct}%</strong>.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-end md:self-center shrink-0">
            {isStorageBreached && (
              <button
                onClick={() => setShowMaintenanceModal(true)}
                className="py-1.5 px-3 rounded-lg text-xs font-bold bg-[#00E5FF]/20 hover:bg-[#00E5FF]/30 text-[#00E5FF] border border-[#00E5FF]/50 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                title="Trigger automated database indexing and cleanup to reclaim storage"
              >
                <Sparkles size={13} className="text-[#00E5FF] animate-spin" />
                <span>Run DB Cleanup &amp; Indexing</span>
              </button>
            )}
            <button
              onClick={() => setShowConfig(true)}
              className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 transition-colors"
            >
              Adjust Alert Thresholds
            </button>
          </div>
        </div>
      )}

      {/* Threshold Configuration Panel */}
      {showConfig && (
        <div ref={configSectionRef} className="p-6 sm:p-8 rounded-2xl bg-[#141021] border border-[#3B0A6B] shadow-2xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-32 bg-[#3B0A6B]/20 blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-[#2a1e45]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#3B0A6B]/40 border border-[#3B0A6B] flex items-center justify-center text-[#00E5FF]">
                <BellRing size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">Custom Alert Thresholds &amp; Toast Configuration</h2>
                <p className="text-xs text-slate-400">Configure parameters that trigger real-time notification toasts and UI warnings</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleTriggerTestToast}
                className="py-1 px-2.5 rounded-lg text-[10px] font-mono font-semibold bg-[#3B0A6B]/60 text-white border border-[#5c14a3] hover:bg-[#5c14a3] transition-all flex items-center gap-1"
                title="Fire a test notification toast immediately"
              >
                <Bell size={11} className="text-[#00E5FF]" /> Test Alert Toast
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(15, 30)}
                className="py-1 px-2.5 rounded-lg text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-all"
                title="Sets low thresholds to immediately trigger warnings for testing"
              >
                Trigger Breach (Test)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(45, 75)}
                className="py-1 px-2.5 rounded-lg text-[10px] font-mono font-semibold bg-[#050505] text-[#00E5FF] border border-[#2a1e45] hover:bg-[#1c162f] transition-all"
              >
                Recommended
              </button>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="py-1 px-2 rounded-lg text-[10px] font-mono text-slate-400 hover:text-white transition-all flex items-center gap-1"
                title="Reset to default thresholds"
              >
                <RotateCcw size={10} /> Reset
              </button>
            </div>
          </div>

          {savedNotice && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 size={16} />
              Threshold policies saved. Real-time toast monitor re-evaluated against latest telemetry.
            </div>
          )}

          <form onSubmit={handleSaveThresholds} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Threshold 1: API Latency */}
              <div className="p-5 bg-[#050505] rounded-xl border border-[#2a1e45] space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#00E5FF] block">Metric 1</span>
                    <h3 className="text-xs font-bold text-white">API Response Latency Warning Threshold</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-bold font-mono text-[#00E5FF]">{formLatency} ms</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <input
                    type="range"
                    min="10"
                    max="150"
                    step="5"
                    value={formLatency}
                    onChange={e => setFormLatency(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#141021] rounded-lg appearance-none cursor-pointer accent-[#00E5FF]"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>10 ms (Ultra Strict)</span>
                    <span>Current: {currentLatency} ms</span>
                    <span>150 ms (Relaxed)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[#2a1e45]/50">
                  <span className="text-slate-400">Current Status:</span>
                  <span className={`font-mono font-bold flex items-center gap-1 ${
                    currentLatency > formLatency ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {currentLatency > formLatency ? (
                      <>
                        <AlertTriangle size={12} />
                        Exceeded (+{(currentLatency - formLatency).toFixed(1)} ms)
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={12} />
                        Healthy (-{(formLatency - currentLatency).toFixed(1)} ms margin)
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Threshold 2: Storage Usage */}
              <div className="p-5 bg-[#050505] rounded-xl border border-[#2a1e45] space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#00E5FF] block">Metric 2</span>
                    <h3 className="text-xs font-bold text-white">Disk Storage Capacity Warning Threshold</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-bold font-mono text-[#00E5FF]">{formStorage}%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <input
                    type="range"
                    min="20"
                    max="95"
                    step="5"
                    value={formStorage}
                    onChange={e => setFormStorage(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#141021] rounded-lg appearance-none cursor-pointer accent-[#00E5FF]"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>20% (Early Warning)</span>
                    <span>Current: {currentStoragePct}%</span>
                    <span>95% (Critical Only)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[#2a1e45]/50">
                  <span className="text-slate-400">Current Status:</span>
                  <span className={`font-mono font-bold flex items-center gap-1 ${
                    currentStoragePct > formStorage ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {currentStoragePct > formStorage ? (
                      <>
                        <AlertTriangle size={12} />
                        Exceeded (+{currentStoragePct - formStorage}%)
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={12} />
                        Healthy (-{formStorage - currentStoragePct}% margin)
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400">
                Breaches automatically trigger floating notification toasts with a 7s auto-dismiss timer.
              </span>
              <button
                type="submit"
                className="py-2.5 px-6 rounded-xl text-xs font-bold text-white bg-[#3B0A6B] hover:bg-[#5c14a3] border border-[#5c14a3] transition-all flex items-center gap-2 shadow-lg"
              >
                <Check size={14} />
                Save Active Threshold Policy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Primary 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Database Connection */}
        <div className="p-5 rounded-2xl bg-[#141021] border border-[#2a1e45] hover:border-[#3B0A6B] transition-all space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-medium">Database Connection</span>
            <div className="w-8 h-8 rounded-lg bg-[#3B0A6B]/30 border border-[#3B0A6B] flex items-center justify-center text-[#00E5FF]">
              <Database size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-emerald-400">{db?.status || 'CONNECTED'}</span>
            <span className="text-xs font-mono text-slate-400">({db?.connectionLatencyMs} ms)</span>
          </div>
          <div className="pt-2 border-t border-[#2a1e45] flex justify-between text-[11px] font-mono text-slate-400">
            <span>Pool: {db?.activeConnections}/{db?.maxPoolSize} active</span>
            <span className="text-[#00E5FF]">{db?.queriesPerSec} QPS</span>
          </div>
        </div>

        {/* Card 2: Storage Usage (with breach state) */}
        <div className={`p-5 rounded-2xl bg-[#141021] border transition-all space-y-3 ${
          isStorageBreached ? 'border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]' : 'border-[#2a1e45] hover:border-[#3B0A6B]'
        }`}>
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-medium">Storage Utilization</span>
            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
              isStorageBreached ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-[#3B0A6B]/30 border-[#3B0A6B] text-[#00E5FF]'
            }`}>
              <HardDrive size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-xl font-bold font-mono ${isStorageBreached ? 'text-amber-400' : 'text-white'}`}>
              {storage?.usedGB} GB
            </span>
            <span className="text-xs font-mono text-slate-400">/ {storage?.totalGB} GB ({storage?.usagePercentage}%)</span>
          </div>
          {/* Progress bar with threshold indicator */}
          <div className="w-full h-1.5 bg-[#050505] rounded-full overflow-hidden relative">
            <div
              className={`h-full rounded-full ${
                isStorageBreached ? 'bg-amber-400' : 'bg-gradient-to-r from-[#00E5FF] to-[#3B0A6B]'
              }`}
              style={{ width: `${storage?.usagePercentage}%` }}
            />
          </div>
          <div className="pt-2 border-t border-[#2a1e45] flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400">Free: {storage?.freeGB} GB</span>
            <button
              onClick={() => setShowMaintenanceModal(true)}
              className="text-[#00E5FF] hover:text-white flex items-center gap-1 font-semibold transition-colors cursor-pointer group"
              title="Launch database indexing and cleanup maintenance routine"
            >
              <Sparkles size={11} className="text-[#00E5FF] group-hover:rotate-12 transition-transform" />
              <span>Cleanup Job</span>
            </button>
          </div>
        </div>

        {/* Card 3: API Latency (with breach state) */}
        <div className={`p-5 rounded-2xl bg-[#141021] border transition-all space-y-3 ${
          isLatencyBreached ? 'border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]' : 'border-[#2a1e45] hover:border-[#3B0A6B]'
        }`}>
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-medium">Global API Latency</span>
            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
              isLatencyBreached ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-[#3B0A6B]/30 border-[#3B0A6B] text-[#00E5FF]'
            }`}>
              <Clock size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-xl font-bold font-mono ${isLatencyBreached ? 'text-amber-400' : 'text-[#00E5FF]'}`}>
              {apiMetrics?.avgLatencyMs} ms
            </span>
            <span className="text-xs font-mono text-slate-400">(avg)</span>
          </div>
          <div className="pt-2 border-t border-[#2a1e45] flex justify-between text-[11px] font-mono">
            <span className="text-slate-400">P95: {apiMetrics?.p95LatencyMs} ms</span>
            <span className={isLatencyBreached ? 'text-amber-400 font-bold' : 'text-slate-400'}>
              {isLatencyBreached ? `Warning (> ${thresholds.latencyMs}ms)` : `Limit: ${thresholds.latencyMs}ms`}
            </span>
          </div>
        </div>

        {/* Card 4: Services Availability */}
        <div className="p-5 rounded-2xl bg-[#141021] border border-[#2a1e45] hover:border-[#3B0A6B] transition-all space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-medium">Service Uptime SLA</span>
            <div className="w-8 h-8 rounded-lg bg-[#3B0A6B]/30 border border-[#3B0A6B] flex items-center justify-center text-emerald-400">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-emerald-400">{sys?.uptimePercentage}%</span>
            <span className="text-xs font-mono text-slate-400">30-day</span>
          </div>
          <div className="pt-2 border-t border-[#2a1e45] flex justify-between text-[11px] font-mono text-slate-400">
            <span>Active Microservices</span>
            <span className="text-[#00E5FF]">{services.length}/{services.length} Online</span>
          </div>
        </div>
      </div>

      {/* Main Charts: Uptime Trends & Storage Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Uptime & API Traffic Trend (Recharts AreaChart with 7-Day Comparison Overlay) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <span>24-Hour Uptime &amp; Latency Trajectory</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </h2>
              <p className="text-xs text-slate-400">Hourly system telemetry across gateway nodes and API handlers</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Compare with Previous Week Toggle Button */}
              <button
                type="button"
                onClick={() => setComparePrevWeek(!comparePrevWeek)}
                className={`py-1.5 px-3 rounded-xl text-xs font-mono font-medium transition-all flex items-center gap-2 border shadow-sm ${
                  comparePrevWeek
                    ? 'bg-[#00E5FF]/15 text-[#00E5FF] border-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                    : 'bg-[#050505] text-slate-300 border-[#2a1e45] hover:border-[#3B0A6B] hover:text-white'
                }`}
                title="Toggle 7-day historical benchmark overlay curve"
              >
                <GitCompare size={13} className={comparePrevWeek ? 'text-[#00E5FF]' : 'text-slate-400'} />
                <span>Compare Previous Week</span>
                <span className={`w-2 h-2 rounded-full transition-colors ${
                  comparePrevWeek ? 'bg-[#00E5FF] animate-pulse' : 'bg-slate-600'
                }`} />
              </button>

              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span className="flex items-center gap-1.5 text-[#00E5FF]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF]" /> Latency (ms)
                </span>
                {comparePrevWeek && (
                  <span className="flex items-center gap-1.5 text-[#c084fc]">
                    <span className="w-2.5 h-0.5 bg-[#c084fc] border-t border-dashed border-[#c084fc]" /> -7d Latency
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-[#9d4edd]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#9d4edd]" /> Req / Min
                </span>
                {comparePrevWeek && (
                  <span className="flex items-center gap-1.5 text-[#94a3b8]">
                    <span className="w-2.5 h-0.5 bg-[#94a3b8] border-t border-dotted border-[#94a3b8]" /> -7d Req
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 7-Day Performance Benchmark Comparison Banner */}
          {comparePrevWeek && (
            <div className="p-3.5 bg-[#050505] rounded-xl border border-[#3B0A6B]/70 flex flex-wrap items-center justify-between gap-3 text-xs font-mono animate-fade-in">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#3B0A6B]/50 border border-[#5c14a3] flex items-center justify-center text-[#00E5FF]">
                  <GitCompare size={14} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">7-Day Weekly Benchmark Overlay Active</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40 uppercase">
                      Same 24H Window (-7d)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Live telemetry curves overlaid against baseline metrics from exactly 7 days ago.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[11px]">
                <div className="bg-[#141021] px-3 py-1.5 rounded-lg border border-[#2a1e45]">
                  <span className="text-slate-400 block text-[9px] uppercase">Latency Benchmark</span>
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-white">{comparisonBaseline?.currentAvgLatencyMs ?? 22.4} ms</span>
                    <span className="text-slate-400 text-[10px]">vs {comparisonBaseline?.prevWeekAvgLatencyMs ?? 25.8} ms</span>
                    <span className={`px-1 py-0.2 rounded text-[10px] flex items-center gap-0.5 ${
                      (comparisonBaseline?.latencyDeltaMs ?? -3.4) <= 0
                        ? 'text-emerald-400 bg-emerald-500/10'
                        : 'text-amber-400 bg-amber-500/10'
                    }`}>
                      {(comparisonBaseline?.latencyDeltaMs ?? -3.4) <= 0 ? (
                        <>
                          <TrendingDown size={10} />
                          {Math.abs(comparisonBaseline?.latencyDeltaMs ?? 3.4)} ms ({comparisonBaseline?.latencyDeltaPct ?? -13.2}%)
                        </>
                      ) : (
                        <>
                          <TrendingUp size={10} />
                          +{comparisonBaseline?.latencyDeltaMs ?? 3.4} ms (+{comparisonBaseline?.latencyDeltaPct ?? 13.2}%)
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <div className="bg-[#141021] px-3 py-1.5 rounded-lg border border-[#2a1e45]">
                  <span className="text-slate-400 block text-[9px] uppercase">Throughput Growth</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <TrendingUp size={11} /> +{comparisonBaseline?.trafficGrowthPct ?? 11.2}% vs Last Week
                  </span>
                </div>

                <div className="bg-[#141021] px-3 py-1.5 rounded-lg border border-[#2a1e45]">
                  <span className="text-slate-400 block text-[9px] uppercase">Uptime Reliability</span>
                  <span className="text-white font-bold">
                    {comparisonBaseline?.currentAvgUptime ?? 99.99}% <span className="text-emerald-400 text-[10px]">(+0.03%)</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={uptimeHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isLightMode ? '#0284c7' : '#00E5FF'} stopOpacity={isLightMode ? 0.28 : 0.4} />
                    <stop offset="95%" stopColor={isLightMode ? '#0284c7' : '#00E5FF'} stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="reqGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isLightMode ? '#6d28d9' : '#3B0A6B'} stopOpacity={isLightMode ? 0.25 : 0.5} />
                    <stop offset="95%" stopColor={isLightMode ? '#6d28d9' : '#3B0A6B'} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isLightMode ? '#cbd5e1' : '#2a1e45'} opacity={isLightMode ? 0.9 : 0.6} />
                <XAxis 
                  dataKey="time" 
                  stroke={isLightMode ? '#475569' : '#64748b'} 
                  fontSize={10} 
                  tickLine={false} 
                  interval={3}
                />
                <YAxis 
                  stroke={isLightMode ? '#475569' : '#64748b'} 
                  fontSize={10} 
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="latencyMs"
                  name="Current Latency"
                  unit="ms"
                  stroke={isLightMode ? '#0284c7' : '#00E5FF'}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#latencyGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="requestsPerMin"
                  name="Current Traffic"
                  unit="req/min"
                  stroke={isLightMode ? '#6d28d9' : '#9d4edd'}
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill="url(#reqGradient)"
                />
                {comparePrevWeek && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="prevWeekLatencyMs"
                      name="Prev Week Latency"
                      unit="ms"
                      stroke={isLightMode ? '#7c3aed' : '#c084fc'}
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                      activeDot={{ r: 4, stroke: isLightMode ? '#7c3aed' : '#c084fc', strokeWidth: 2, fill: isLightMode ? '#ffffff' : '#050505' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="prevWeekRequestsPerMin"
                      name="Prev Week Traffic"
                      unit="req/min"
                      stroke="#94a3b8"
                      strokeWidth={1.5}
                      strokeDasharray="2 2"
                      dot={false}
                    />
                  </>
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Col: Storage Distribution Pie Chart */}
        <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] flex flex-col justify-between space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <HardDrive size={16} className={isStorageBreached ? 'text-amber-400' : 'text-[#00E5FF]'} />
                Storage Distribution
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Database, logs, and document assets</p>
            </div>
            {isStorageBreached && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1 font-bold">
                <AlertTriangle size={11} /> Threshold Exceeded
              </span>
            )}
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={storage?.breakdown || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="sizeGB"
                >
                  {storage?.breakdown?.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke={isLightMode ? '#ffffff' : '#141021'} strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-[#050505] border border-[#3B0A6B] p-2.5 rounded-xl text-xs font-mono">
                          <p className="font-bold text-white">{item.name}</p>
                          <p className="text-[#00E5FF]">{item.sizeGB} GB ({item.percentage}%)</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 border-t border-[#2a1e45] pt-3 text-xs">
            {storage?.breakdown?.map((item: any) => (
              <div key={item.name} className="flex items-center justify-between font-mono text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300">{item.name}</span>
                </div>
                <span className="text-slate-400">{item.sizeGB} GB</span>
              </div>
            ))}
          </div>

          {/* Database Indexing & Maintenance Action Box */}
          <div className="pt-3 border-t border-[#2a1e45] space-y-2.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>Last Cleanup: {storage?.maintenanceInfo?.lastRunAt ? new Date(storage.maintenanceInfo.lastRunAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}</span>
              <span className="text-emerald-400 font-semibold">
                Reclaimed: {storage?.maintenanceInfo?.totalReclaimedGB || 0} GB
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowMaintenanceModal(true)}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-[0.98] ${
                isStorageBreached
                  ? 'bg-gradient-to-r from-[#00E5FF] to-[#3B0A6B] text-white hover:brightness-110 shadow-[0_0_20px_rgba(0,229,255,0.3)] border border-[#00E5FF]/50'
                  : 'bg-[#050505] text-[#00E5FF] border border-[#3B0A6B] hover:bg-[#141021] hover:border-[#00E5FF]/60'
              }`}
              title="Run automated database indexing, VACUUM ANALYZE, and storage cleanup job"
            >
              <Database size={14} className={isStorageBreached ? 'text-white' : 'text-[#00E5FF]'} />
              <span>Run DB Indexing &amp; Cleanup Job</span>
              {isStorageBreached && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-400 text-black uppercase tracking-wider ml-1 animate-pulse">
                  Urgent
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Deep-Dive Grid: Database Pool Diagnostics & Services Availability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Database Connection & Table Diagnostics */}
        <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-2 pb-3 border-b border-[#2a1e45]">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-[#00E5FF]" />
              <h3 className="text-sm font-bold text-white">Database Pool &amp; Integrity Health</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMaintenanceModal(true)}
                className="py-1 px-2.5 rounded-lg text-[10px] font-mono font-semibold bg-[#3B0A6B]/50 text-[#00E5FF] border border-[#5c14a3] hover:bg-[#5c14a3] transition-all flex items-center gap-1 cursor-pointer"
                title="Defragment table B-tree indexes and purge dead tuples"
              >
                <Wrench size={11} /> Reindex &amp; Vacuum
              </button>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                SSL / TLS 1.3 Active
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 bg-[#050505] rounded-xl border border-[#2a1e45]">
              <span className="text-[10px] text-slate-400 uppercase block">Replication Lag</span>
              <span className="text-emerald-400 font-bold">{db?.replicationLagMs.toFixed(1)} ms</span>
            </div>
            <div className="p-3 bg-[#050505] rounded-xl border border-[#2a1e45]">
              <span className="text-[10px] text-slate-400 uppercase block">Active Conn Pool</span>
              <span className="text-[#00E5FF] font-bold">{db?.activeConnections} / {db?.maxPoolSize}</span>
            </div>
            <div className="p-3 bg-[#050505] rounded-xl border border-[#2a1e45]">
              <span className="text-[10px] text-slate-400 uppercase block">Throughput</span>
              <span className="text-white font-bold">{db?.queriesPerSec} queries/s</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-mono uppercase text-slate-400 mb-2">Relational Entities &amp; Table Size</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
              <div className="p-2.5 bg-[#050505] rounded-lg border border-[#2a1e45]/60">
                <span className="text-slate-400 block text-[10px]">Users</span>
                <span className="text-white font-bold">{db?.recordsCount?.users}</span>
              </div>
              <div className="p-2.5 bg-[#050505] rounded-lg border border-[#2a1e45]/60">
                <span className="text-slate-400 block text-[10px]">Students</span>
                <span className="text-white font-bold">{db?.recordsCount?.students}</span>
              </div>
              <div className="p-2.5 bg-[#050505] rounded-lg border border-[#2a1e45]/60">
                <span className="text-slate-400 block text-[10px]">BLE Events</span>
                <span className="text-[#00E5FF] font-bold">{db?.recordsCount?.bleEvents}</span>
              </div>
              <div className="p-2.5 bg-[#050505] rounded-lg border border-[#2a1e45]/60">
                <span className="text-slate-400 block text-[10px]">Audit Logs</span>
                <span className="text-white font-bold">{db?.recordsCount?.auditLogs}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Core Services Operational Matrix */}
        <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-[#2a1e45]">
            <div className="flex items-center gap-2">
              <Server size={16} className="text-[#00E5FF]" />
              <h3 className="text-sm font-bold text-white">Microservice Availability Matrix</h3>
            </div>
            <span className="text-xs font-mono text-emerald-400">All Nodes Healthy</span>
          </div>

          <div className="space-y-2.5">
            {services.map((svc: any) => (
              <div
                key={svc.name}
                className="p-3 bg-[#050505] rounded-xl border border-[#2a1e45] flex items-center justify-between text-xs hover:border-[#3B0A6B] transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{svc.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.2 rounded bg-[#141021]">
                      {svc.type}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                    Telemetry Probe: Response in {svc.latencyMs} ms
                  </span>
                </div>

                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-bold">
                  <CheckCircle2 size={11} />
                  {svc.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* API Endpoint Latency Breakdown Table (with threshold breach flags) */}
      <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Zap size={16} className={isLatencyBreached ? 'text-amber-400' : 'text-[#00E5FF]'} />
              Endpoint Latency &amp; SLA Compliance Table
            </h3>
            <p className="text-xs text-slate-400">
              Evaluated against your active latency threshold of <span className="text-[#00E5FF] font-mono font-bold">{thresholds.latencyMs} ms</span>
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Status: {isLatencyBreached ? <strong className="text-amber-400 font-bold">Breach Detected</strong> : <strong className="text-emerald-400">Compliant</strong>}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#2a1e45] text-slate-400 font-mono uppercase text-[10px]">
                <th className="pb-3 px-3">API Endpoint Path</th>
                <th className="pb-3 px-3">Calls (24h)</th>
                <th className="pb-3 px-3 text-center">Avg Response</th>
                <th className="pb-3 px-3 text-center">P95 Latency</th>
                <th className="pb-3 px-3 text-center">P99 Latency</th>
                <th className="pb-3 px-3 text-right">Threshold Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a1e45]/50 font-mono">
              {apiMetrics?.endpointBreakdown?.map((ep: any) => {
                const epExceeds = ep.avgLatency > thresholds.latencyMs;

                return (
                  <tr key={ep.endpoint} className={`transition-colors ${epExceeds ? 'bg-amber-500/5' : 'hover:bg-[#1c162f]/40'}`}>
                    <td className="py-3 px-3 font-semibold text-white">{ep.endpoint}</td>
                    <td className="py-3 px-3 text-slate-300">{ep.reqCount.toLocaleString()}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`font-bold ${epExceeds ? 'text-amber-400' : 'text-[#00E5FF]'}`}>
                        {ep.avgLatency} ms
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-300">{ep.p95} ms</td>
                    <td className="py-3 px-3 text-center text-slate-400">{ep.p99} ms</td>
                    <td className="py-3 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] inline-flex items-center gap-1 ${
                        epExceeds 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold' 
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {epExceeds ? <AlertTriangle size={11} /> : <CheckCircle2 size={11} />}
                        {epExceeds ? `Exceeds Threshold` : `Within Limit`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Diagnostic & Incident Logs Section */}
      <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] space-y-6 shadow-xl">
        {/* Header & Subtitle */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-[#2a1e45]">
          <div>
            <div className="flex items-center gap-2">
              <Terminal size={18} className="text-[#00E5FF]" />
              <h3 className="text-base font-bold text-white tracking-tight">
                System Diagnostic &amp; Incident Logs
              </h3>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-tiered telemetry event stream for infrastructure debugging, fault isolation, and SLA breach tracking
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 bg-[#050505] px-3 py-1.5 rounded-xl border border-[#2a1e45]">
              Showing <strong className="text-[#00E5FF]">{sortedLogs.length}</strong> of {totalLogsCount} events
            </span>
            <button
              onClick={() => fetchHealth(true)}
              className="p-1.5 rounded-lg bg-[#050505] hover:bg-[#1c162f] border border-[#2a1e45] text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Refresh Logs"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Filter and Sorting Controls Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#0a0712] p-4 rounded-xl border border-[#2a1e45]/80">
          {/* 1. Level Filter Dropdown */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-slate-300 flex items-center gap-1.5">
              <Filter size={13} className="text-[#00E5FF]" />
              <span className="font-semibold">Filter Level:</span>
            </label>
            <div className="relative">
              <select
                value={logLevelFilter}
                onChange={e => setLogLevelFilter(e.target.value as any)}
                className="w-full bg-[#050505] text-slate-200 text-xs rounded-xl px-3 py-2 border border-[#2a1e45] focus:border-[#00E5FF] focus:outline-none appearance-none cursor-pointer font-medium"
              >
                <option value="ALL">All Levels ({totalLogsCount})</option>
                <option value="ERROR">Error Level ({errorLogsCount})</option>
                <option value="WARNING">Warning Level ({warningLogsCount})</option>
                <option value="INFO">Info Level ({infoLogsCount})</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* 2. Sort Dropdown (Severity & Timestamp) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-slate-300 flex items-center gap-1.5">
              <ArrowUpDown size={13} className="text-[#00E5FF]" />
              <span className="font-semibold">Sort Logs By:</span>
            </label>
            <div className="relative">
              <select
                value={logSortOrder}
                onChange={e => setLogSortOrder(e.target.value as any)}
                className="w-full bg-[#050505] text-slate-200 text-xs rounded-xl px-3 py-2 border border-[#2a1e45] focus:border-[#00E5FF] focus:outline-none appearance-none cursor-pointer font-medium"
              >
                <option value="SEVERITY_DESC">Severity: Error → Warning → Info</option>
                <option value="SEVERITY_ASC">Severity: Info → Warning → Error</option>
                <option value="TIMESTAMP_DESC">Timestamp: Newest First</option>
                <option value="TIMESTAMP_ASC">Timestamp: Oldest First</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* 3. Subsystem Filter Dropdown */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-slate-300 flex items-center gap-1.5">
              <ListFilter size={13} className="text-[#00E5FF]" />
              <span className="font-semibold">Subsystem:</span>
            </label>
            <div className="relative">
              <select
                value={logSubsystemFilter}
                onChange={e => setLogSubsystemFilter(e.target.value)}
                className="w-full bg-[#050505] text-slate-200 text-xs rounded-xl px-3 py-2 border border-[#2a1e45] focus:border-[#00E5FF] focus:outline-none appearance-none cursor-pointer font-medium"
              >
                <option value="ALL">All Subsystems</option>
                <option value="Database">Database</option>
                <option value="IoT Gateway">IoT Gateway</option>
                <option value="Storage">Storage</option>
                <option value="API Gateway">API Gateway</option>
                <option value="Security / Auth">Security / Auth</option>
                <option value="Network">Network</option>
                <option value="Worker">Worker</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* 4. Search Filter Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-slate-300 flex items-center gap-1.5">
              <Search size={13} className="text-[#00E5FF]" />
              <span className="font-semibold">Search Event &amp; Trace:</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={logSearchQuery}
                onChange={e => setLogSearchQuery(e.target.value)}
                placeholder="Search message, trace, or metric..."
                className="w-full bg-[#050505] text-slate-200 text-xs rounded-xl pl-3 pr-8 py-2 border border-[#2a1e45] focus:border-[#00E5FF] focus:outline-none placeholder-slate-500 font-mono"
              />
              {logSearchQuery && (
                <button
                  onClick={() => setLogSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Level Filter Chips & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400 mr-1">Quick Filter:</span>
            <button
              onClick={() => setLogLevelFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 border cursor-pointer ${
                logLevelFilter === 'ALL'
                  ? 'bg-[#3B0A6B] text-white border-[#5c14a3] shadow-sm'
                  : 'bg-[#050505] text-slate-400 border-[#2a1e45] hover:text-white'
              }`}
            >
              <span>All</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40">{totalLogsCount}</span>
            </button>

            <button
              onClick={() => setLogLevelFilter('ERROR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 border cursor-pointer ${
                logLevelFilter === 'ERROR'
                  ? 'bg-red-500/20 text-red-300 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                  : 'bg-[#050505] text-red-400/80 border-[#2a1e45] hover:text-red-300 hover:border-red-500/30'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span>Error</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-950/60 font-bold">{errorLogsCount}</span>
            </button>

            <button
              onClick={() => setLogLevelFilter('WARNING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 border cursor-pointer ${
                logLevelFilter === 'WARNING'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : 'bg-[#050505] text-amber-400/80 border-[#2a1e45] hover:text-amber-300 hover:border-amber-500/30'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Warning</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/60 font-bold">{warningLogsCount}</span>
            </button>

            <button
              onClick={() => setLogLevelFilter('INFO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 border cursor-pointer ${
                logLevelFilter === 'INFO'
                  ? 'bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/50 shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                  : 'bg-[#050505] text-slate-400 border-[#2a1e45] hover:text-[#00E5FF] hover:border-[#00E5FF]/30'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#00E5FF]" />
              <span>Info</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950/60 font-bold">{infoLogsCount}</span>
            </button>
          </div>

          {(logLevelFilter !== 'ALL' || logSubsystemFilter !== 'ALL' || logSearchQuery || logSortOrder !== 'SEVERITY_DESC') && (
            <button
              onClick={() => {
                setLogLevelFilter('ALL');
                setLogSubsystemFilter('ALL');
                setLogSearchQuery('');
                setLogSortOrder('SEVERITY_DESC');
              }}
              className="text-xs font-mono text-[#00E5FF] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw size={12} />
              Reset Filters
            </button>
          )}
        </div>

        {/* Logs Stream List */}
        <div className="space-y-2.5">
          {sortedLogs.length === 0 ? (
            <div className="p-12 text-center bg-[#050505] rounded-xl border border-[#2a1e45] space-y-3">
              <AlertCircle size={28} className="mx-auto text-slate-500" />
              <p className="text-sm font-semibold text-slate-300">No logs found matching current criteria</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto font-mono">
                No events found for Level: <span className="text-[#00E5FF]">{logLevelFilter}</span>
                {logSubsystemFilter !== 'ALL' && <>, Subsystem: <span className="text-[#00E5FF]">{logSubsystemFilter}</span></>}
                {logSearchQuery && <>, Search: &quot;{logSearchQuery}&quot;</>}.
              </p>
              <button
                onClick={() => {
                  setLogLevelFilter('ALL');
                  setLogSubsystemFilter('ALL');
                  setLogSearchQuery('');
                  setLogSortOrder('SEVERITY_DESC');
                }}
                className="mt-2 py-1.5 px-4 rounded-xl text-xs font-semibold text-white bg-[#3B0A6B] hover:bg-[#5c14a3] transition-colors cursor-pointer"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            sortedLogs.map(log => {
              const isExpanded = expandedLogId === log.id;
              const dateObj = new Date(log.timestamp);
              const timeFormatted = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              const dateFormatted = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });

              return (
                <div
                  key={log.id}
                  className={`p-4 rounded-xl border transition-all ${
                    log.level === 'ERROR'
                      ? 'bg-red-500/5 hover:bg-red-500/10 border-red-500/30'
                      : log.level === 'WARNING'
                      ? 'bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/30'
                      : 'bg-[#050505] hover:bg-[#141021]/60 border-[#2a1e45]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Level Badge */}
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold flex items-center gap-1.5 border uppercase ${
                        log.level === 'ERROR'
                          ? 'bg-red-500/20 text-red-300 border-red-500/40'
                          : log.level === 'WARNING'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/30'
                      }`}>
                        {log.level === 'ERROR' && <AlertCircle size={12} />}
                        {log.level === 'WARNING' && <AlertTriangle size={12} />}
                        {log.level === 'INFO' && <Info size={12} />}
                        {log.level}
                      </span>

                      {/* Subsystem Tag */}
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#141021] text-slate-300 border border-[#2a1e45]">
                        {log.subsystem}
                      </span>

                      {/* Metric Context if present */}
                      {log.metricContext && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#3B0A6B]/40 text-[#00E5FF] border border-[#3B0A6B]">
                          {log.metricContext}
                        </span>
                      )}

                      {/* Timestamp */}
                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                        <Clock size={12} className="text-slate-500" />
                        {dateFormatted} &bull; {timeFormatted}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                      {/* Trace ID */}
                      <button
                        onClick={() => copyTraceId(log.traceId)}
                        className="text-[10px] font-mono text-slate-400 bg-[#0e0a19] hover:bg-[#1a142e] px-2 py-1 rounded border border-[#2a1e45] flex items-center gap-1 transition-colors cursor-pointer"
                        title="Click to copy trace ID"
                      >
                        <Copy size={11} className={copiedTraceId === log.traceId ? 'text-emerald-400' : 'text-slate-400'} />
                        <span>{copiedTraceId === log.traceId ? 'Copied' : log.traceId}</span>
                      </button>

                      {/* Expand / Collapse Details Button */}
                      {log.details && (
                        <button
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className="text-[11px] font-mono text-slate-300 hover:text-white flex items-center gap-1 px-2 py-1 rounded hover:bg-[#141021] transition-colors cursor-pointer"
                        >
                          <span>{isExpanded ? 'Collapse' : 'Details'}</span>
                          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Message */}
                  <p className="mt-2 text-xs text-slate-100 font-sans leading-relaxed font-medium">
                    {log.message}
                  </p>

                  {/* Expanded Technical Details Panel */}
                  {isExpanded && log.details && (
                    <div className="mt-3 p-3 bg-[#0a0712] rounded-xl border border-[#2a1e45] text-xs font-mono space-y-1.5 animate-fade-in">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1 border-b border-[#2a1e45]/60">
                        <span className="uppercase tracking-wider text-[#00E5FF]">Technical Diagnostic Context</span>
                        <span>Trace: {log.traceId}</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed pt-1">
                        {log.details}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Automated Database Maintenance & Cleanup Modal */}
      {showMaintenanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="max-w-2xl w-full bg-[#0a0712] border border-[#3B0A6B] rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-[#141021] via-[#1a122e] to-[#3B0A6B]/40 border-b border-[#2a1e45] flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/40 flex items-center justify-center text-[#00E5FF] shrink-0 mt-0.5">
                  <Database size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white tracking-tight">
                      Automated Database Indexing &amp; Storage Cleanup
                    </h3>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40 uppercase">
                      PostgreSQL Engine
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Execute B-Tree defragmentation, table VACUUM ANALYZE, and storage purge routines to reclaim disk space.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!maintenanceInProgress) {
                    setShowMaintenanceModal(false);
                    setMaintenanceResult(null);
                    setMaintenanceProgressStep(0);
                  }
                }}
                disabled={maintenanceInProgress}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#141021] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Close Modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-200">
              {/* Storage Condition Card */}
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                isStorageBreached 
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-200' 
                  : 'bg-[#141021] border-[#2a1e45] text-slate-300'
              }`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isStorageBreached ? 'bg-amber-500/20 text-amber-400' : 'bg-[#3B0A6B]/30 text-[#00E5FF]'
                }`}>
                  <HardDrive size={16} />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Current Storage Capacity</span>
                    <span className="font-mono font-bold">
                      {storage?.usedGB} GB / {storage?.totalGB} GB ({currentStoragePct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#050505] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${isStorageBreached ? 'bg-amber-400' : 'bg-[#00E5FF]'}`}
                      style={{ width: `${currentStoragePct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 pt-1 font-mono">
                    {isStorageBreached
                      ? `Warning: Current utilization (${currentStoragePct}%) exceeds policy threshold of ${thresholds.storagePct}%. Maintenance will reclaim bloated indexes and vacuum dead tuples.`
                      : `Storage utilization is within nominal policy threshold (${thresholds.storagePct}%). Running maintenance will maintain optimal index tree depths and query latency.`}
                  </p>
                </div>
              </div>

              {/* Maintenance Tasks Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Layers size={14} className="text-[#00E5FF]" />
                    Routine Tasks to Execute
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">All 4 routines enabled by default</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Option 1: B-Tree Rebuild */}
                  <label className={`p-3 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                    maintenanceOptions.rebuildIndexes 
                      ? 'bg-[#141021] border-[#00E5FF]/40 text-white' 
                      : 'bg-[#050505] border-[#2a1e45] text-slate-400 opacity-60'
                  }`}>
                    <input
                      type="checkbox"
                      checked={maintenanceOptions.rebuildIndexes}
                      disabled={maintenanceInProgress}
                      onChange={e => setMaintenanceOptions(prev => ({ ...prev, rebuildIndexes: e.target.checked }))}
                      className="mt-0.5 accent-[#00E5FF] rounded"
                    />
                    <div className="space-y-0.5">
                      <span className="font-bold text-[11px] block">Rebuild B-Tree Indexes</span>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        Defragments 14 relational indexes across <code className="text-[#00E5FF]">attendance_records</code>, <code className="text-[#00E5FF]">ble_events</code>, and <code className="text-[#00E5FF]">audit_logs</code>.
                      </p>
                    </div>
                  </label>

                  {/* Option 2: Vacuum Full */}
                  <label className={`p-3 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                    maintenanceOptions.vacuumAnalyze 
                      ? 'bg-[#141021] border-[#00E5FF]/40 text-white' 
                      : 'bg-[#050505] border-[#2a1e45] text-slate-400 opacity-60'
                  }`}>
                    <input
                      type="checkbox"
                      checked={maintenanceOptions.vacuumAnalyze}
                      disabled={maintenanceInProgress}
                      onChange={e => setMaintenanceOptions(prev => ({ ...prev, vacuumAnalyze: e.target.checked }))}
                      className="mt-0.5 accent-[#00E5FF] rounded"
                    />
                    <div className="space-y-0.5">
                      <span className="font-bold text-[11px] block">Postgres VACUUM ANALYZE</span>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        Reclaims unreferenced disk pages from dead tuple rows and recalibrates planner selectivity statistics.
                      </p>
                    </div>
                  </label>

                  {/* Option 3: BLE Buffer Flush */}
                  <label className={`p-3 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                    maintenanceOptions.purgeTempTelemetry 
                      ? 'bg-[#141021] border-[#00E5FF]/40 text-white' 
                      : 'bg-[#050505] border-[#2a1e45] text-slate-400 opacity-60'
                  }`}>
                    <input
                      type="checkbox"
                      checked={maintenanceOptions.purgeTempTelemetry}
                      disabled={maintenanceInProgress}
                      onChange={e => setMaintenanceOptions(prev => ({ ...prev, purgeTempTelemetry: e.target.checked }))}
                      className="mt-0.5 accent-[#00E5FF] rounded"
                    />
                    <div className="space-y-0.5">
                      <span className="font-bold text-[11px] block">Purge Ephemeral BLE Buffer</span>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        Flushes transient packet caches and stale ESP32 turnstile handshake advertisements older than 7 days.
                      </p>
                    </div>
                  </label>

                  {/* Option 4: Audit Logs Compaction */}
                  <label className={`p-3 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                    maintenanceOptions.compressAuditLogs 
                      ? 'bg-[#141021] border-[#00E5FF]/40 text-white' 
                      : 'bg-[#050505] border-[#2a1e45] text-slate-400 opacity-60'
                  }`}>
                    <input
                      type="checkbox"
                      checked={maintenanceOptions.compressAuditLogs}
                      disabled={maintenanceInProgress}
                      onChange={e => setMaintenanceOptions(prev => ({ ...prev, compressAuditLogs: e.target.checked }))}
                      className="mt-0.5 accent-[#00E5FF] rounded"
                    />
                    <div className="space-y-0.5">
                      <span className="font-bold text-[11px] block">Compress Stale Audit Logs</span>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        Archives older audit log segments with high-ratio Zstandard compression into cold storage.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Progress Terminal & Stepper Feedback */}
              {(maintenanceInProgress || maintenanceProgressStep > 0) && (
                <div className="p-4 bg-[#050505] rounded-xl border border-[#2a1e45] space-y-3 font-mono">
                  <div className="flex items-center justify-between text-[11px] pb-2 border-b border-[#2a1e45]">
                    <span className="text-[#00E5FF] flex items-center gap-1.5 font-bold">
                      <Terminal size={13} />
                      Maintenance Execution Stream
                    </span>
                    <span className="text-slate-400 text-[10px]">
                      {maintenanceInProgress ? 'In Progress...' : 'Completed'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    <div className={`flex items-center gap-2 ${maintenanceProgressStep >= 1 ? 'text-emerald-400' : 'text-slate-600'}`}>
                      {maintenanceProgressStep === 1 ? (
                        <RefreshCw size={12} className="animate-spin text-[#00E5FF]" />
                      ) : maintenanceProgressStep > 1 ? (
                        <Check size={12} className="text-emerald-400" />
                      ) : (
                        <span className="w-3 h-3 rounded-full border border-slate-700 inline-block" />
                      )}
                      <span>[1/4] Rebuilding B-Tree indexes on attendance_records &amp; ble_events...</span>
                    </div>

                    <div className={`flex items-center gap-2 ${maintenanceProgressStep >= 2 ? 'text-emerald-400' : 'text-slate-600'}`}>
                      {maintenanceProgressStep === 2 ? (
                        <RefreshCw size={12} className="animate-spin text-[#00E5FF]" />
                      ) : maintenanceProgressStep > 2 ? (
                        <Check size={12} className="text-emerald-400" />
                      ) : (
                        <span className="w-3 h-3 rounded-full border border-slate-700 inline-block" />
                      )}
                      <span>[2/4] Executing VACUUM FULL &amp; ANALYZE; scanning dead tuples...</span>
                    </div>

                    <div className={`flex items-center gap-2 ${maintenanceProgressStep >= 3 ? 'text-emerald-400' : 'text-slate-600'}`}>
                      {maintenanceProgressStep === 3 ? (
                        <RefreshCw size={12} className="animate-spin text-[#00E5FF]" />
                      ) : maintenanceProgressStep > 3 ? (
                        <Check size={12} className="text-emerald-400" />
                      ) : (
                        <span className="w-3 h-3 rounded-full border border-slate-700 inline-block" />
                      )}
                      <span>[3/4] Purging transient BLE advertisement packet buffer...</span>
                    </div>

                    <div className={`flex items-center gap-2 ${maintenanceProgressStep >= 4 ? 'text-emerald-400' : 'text-slate-600'}`}>
                      {maintenanceProgressStep === 4 ? (
                        <RefreshCw size={12} className="animate-spin text-[#00E5FF]" />
                      ) : maintenanceProgressStep >= 5 ? (
                        <Check size={12} className="text-emerald-400" />
                      ) : (
                        <span className="w-3 h-3 rounded-full border border-slate-700 inline-block" />
                      )}
                      <span>[4/4] Compacting archived audit log partitions into cold storage...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Maintenance Result Breakdown */}
              {maintenanceResult && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <CheckCircle2 size={16} />
                      <span>Database Maintenance Completed Successfully</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-300">
                      Executed in {maintenanceResult.executionTimeMs} ms
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-mono text-[11px]">
                    <div className="p-2.5 bg-[#050505] rounded-lg border border-[#2a1e45]">
                      <span className="text-slate-400 block text-[9px] uppercase">Storage Reclaimed</span>
                      <span className="text-emerald-400 font-bold text-sm">
                        +{maintenanceResult.reclaimedGB} GB
                      </span>
                      <span className="text-slate-500 text-[10px] block">({maintenanceResult.reclaimedMB} MB)</span>
                    </div>

                    <div className="p-2.5 bg-[#050505] rounded-lg border border-[#2a1e45]">
                      <span className="text-slate-400 block text-[9px] uppercase">New Usage Rate</span>
                      <span className="text-[#00E5FF] font-bold text-sm">
                        {maintenanceResult.newStorage?.usagePercentage}%
                      </span>
                      <span className="text-slate-500 text-[10px] block">
                        {maintenanceResult.newStorage?.usedGB} GB of {maintenanceResult.newStorage?.totalGB} GB
                      </span>
                    </div>

                    <div className="p-2.5 bg-[#050505] rounded-lg border border-[#2a1e45] col-span-2 sm:col-span-1">
                      <span className="text-slate-400 block text-[9px] uppercase">Audit &amp; Diag Status</span>
                      <span className="text-white font-bold text-[11px] block mt-0.5">
                        Logged
                      </span>
                      <span className="text-slate-500 text-[10px]">Audit trail entry created</span>
                    </div>
                  </div>

                  {/* Step Breakdown Table */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      Subsystem Reclamation Breakdown
                    </span>
                    <div className="space-y-1">
                      {maintenanceResult.routineSteps?.map((step: any) => (
                        <div
                          key={step.step}
                          className="p-2 bg-[#050505] rounded-lg border border-[#2a1e45] flex items-center justify-between text-[10px] font-mono"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#00E5FF] font-bold">Step {step.step}:</span>
                            <span className="text-slate-300 font-medium">{step.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-400">{step.durationMs} ms</span>
                            <span className="text-emerald-400 font-bold">+{step.reclaimedMB} MB</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Maintenance Error Alert */}
              {maintenanceError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs rounded-xl flex items-center gap-2 font-mono">
                  <AlertCircle size={16} className="text-rose-400 shrink-0" />
                  <span>{maintenanceError}</span>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-5 bg-[#0d0a17] border-t border-[#2a1e45] flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] font-mono text-slate-400">
                Safe non-blocking routine with lock escalation safeguards.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowMaintenanceModal(false);
                    setMaintenanceResult(null);
                    setMaintenanceProgressStep(0);
                  }}
                  disabled={maintenanceInProgress}
                  className="py-2 px-3.5 rounded-xl text-xs font-semibold text-slate-300 bg-[#141021] hover:bg-[#1c162f] border border-[#2a1e45] transition-all disabled:opacity-40"
                >
                  {maintenanceResult ? 'Done & Close' : 'Cancel'}
                </button>

                <button
                  type="button"
                  onClick={handleRunMaintenance}
                  disabled={maintenanceInProgress || (!maintenanceOptions.rebuildIndexes && !maintenanceOptions.vacuumAnalyze && !maintenanceOptions.purgeTempTelemetry && !maintenanceOptions.compressAuditLogs)}
                  className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#00E5FF] to-[#3B0A6B] hover:brightness-110 border border-[#00E5FF]/40 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                >
                  {maintenanceInProgress ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Executing Maintenance...</span>
                    </>
                  ) : maintenanceResult ? (
                    <>
                      <RefreshCw size={13} />
                      <span>Run Maintenance Again</span>
                    </>
                  ) : (
                    <>
                      <Play size={13} className="text-white fill-white" />
                      <span>Start Maintenance Routine</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSystemHealthPage;
