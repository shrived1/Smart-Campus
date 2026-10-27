import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { Cpu, Radio, Plus, CheckCircle, AlertTriangle, RefreshCw, X, Play, Trash2, Terminal, Wifi, Shield, BookOpen, Key, Activity, LogIn } from 'lucide-react';

export const AdminDevicesPage: React.FC = () => {
  const { user, login } = useAuth();
  const [devices, setDevices] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showSimModal, setShowSimModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [clearingLogs, setClearingLogs] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Filter state for logs
  const [logFilterLevel, setLogFilterLevel] = useState<string>('ALL');
  const [logFilterNode, setLogFilterNode] = useState<string>('ALL');

  // Register Form
  const [nodeId, setNodeId] = useState('ESP32-GATE-WEST-03');
  const [nodeName, setNodeName] = useState('West Campus Gate BLE Node');
  const [nodeType, setNodeType] = useState<'ENTRY' | 'EXIT'>('ENTRY');
  const [location, setLocation] = useState('West Campus Gate - Turnstile 3');
  const [registering, setRegistering] = useState(false);

  // Simulation test form
  const [simNode, setSimNode] = useState('ESP32-GATE-MAIN-01');
  const [simMac, setSimMac] = useState('AA:BB:CC:11:22:33'); // Alex Rivers
  const [simRssi, setSimRssi] = useState(-55);
  const [simulating, setSimulating] = useState(false);
  const [heartbeating, setHeartbeating] = useState(false);

  const fetchDevices = async () => {
    try {
      const res = await api.getDevices();
      if (res && res.success) {
        setDevices(res.devices || []);
        setAuthError(null);
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to fetch devices';
      if (msg.includes('Session expired') || msg.includes('Authentication required') || msg.includes('401')) {
        setAuthError('Your administrative session has expired or is invalid. Please re-authenticate.');
      } else {
        setStatusMessage(`Telemetry sync notice: ${msg}`);
      }
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await api.getDeviceLogs({ limit: 40 });
      if (res && res.success) {
        setLogs(res.logs || []);
        setAuthError(null);
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to fetch device logs';
      if (msg.includes('Session expired') || msg.includes('Authentication required') || msg.includes('401')) {
        setAuthError('Your administrative session has expired or is invalid. Please re-authenticate.');
      }
    } finally {
      setLogsLoading(false);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchDevices(), fetchLogs()]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdminLogin = async () => {
    try {
      await login('admin@smartcampus.edu', 'Admin@2026!');
      setAuthError(null);
      setStatusMessage('Successfully re-authenticated as System Administrator.');
      await loadAll();
    } catch {
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    loadAll();
    const interval = setInterval(() => {
      // Avoid spamming requests if session is expired
      if (!authError) {
        fetchDevices();
        fetchLogs();
      }
    }, 12000); // Poll telemetry every 12s
    return () => clearInterval(interval);
  }, [authError]);

  const handleClearLogs = async () => {
    if (!window.confirm('Clear all ESP32 connection, heartbeat, and hardware error logs?')) return;
    setClearingLogs(true);
    try {
      const res = await api.clearDeviceLogs();
      if (res.success) {
        setStatusMessage(res.message);
        setLogs(res.remainingLogs || []);
        setTimeout(() => setStatusMessage(null), 4000);
      }
    } catch (err: any) {
      alert(`Failed to clear logs: ${err.message}`);
    } finally {
      setClearingLogs(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);
    try {
      const res = await api.registerDevice({
        nodeId,
        nodeName,
        nodeType,
        location,
        macAddress: '24:6F:28:FE:ED:05',
        ipAddress: '192.168.10.45'
      });
      if (res.success) {
        setShowRegisterModal(false);
        await Promise.all([fetchDevices(), fetchLogs()]);
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    setTestResult(null);
    try {
      const res = await api.recordBleEvent({
        nodeId: simNode,
        bleMac: simMac,
        rssi: Number(simRssi)
      });
      setTestResult(res);
      await Promise.all([fetchDevices(), fetchLogs()]);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setSimulating(false);
    }
  };

  const handleTriggerHeartbeat = async () => {
    setHeartbeating(true);
    setTestResult(null);
    try {
      const res = await api.sendDeviceHeartbeat({
        nodeId: simNode,
        firmwareVersion: 'v2.4.1-BLE-PROD',
        ipAddress: '192.168.1.188',
        signalRssi: -58,
        batteryLevel: 99
      });
      setTestResult(res);
      await Promise.all([fetchDevices(), fetchLogs()]);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setHeartbeating(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (logFilterLevel !== 'ALL' && log.level !== logFilterLevel) return false;
    if (logFilterNode !== 'ALL' && log.nodeId !== logFilterNode) return false;
    return true;
  });

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading ESP32 telemetry hardware grid...</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu size={18} className="text-[#00E5FF]" />
            <h1 className="text-xl font-bold text-white tracking-tight">ESP32 BLE Smart Attendance Fleet</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Physical edge gateways running HM-10 Bluetooth sniffers connected via authenticated HTTPS API.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowGuideModal(true)}
            className="py-2 px-3.5 rounded-xl text-xs font-semibold text-slate-200 bg-[#141021] hover:bg-[#1c162f] border border-[#2a1e45] transition-all flex items-center gap-1.5"
          >
            <BookOpen size={13} className="text-[#00E5FF]" /> Wiring & Code
          </button>
          <button
            onClick={() => setShowSimModal(true)}
            className="py-2 px-3.5 rounded-xl text-xs font-semibold text-slate-200 bg-[#141021] hover:bg-[#1c162f] border border-[#2a1e45] transition-all flex items-center gap-1.5"
          >
            <Play size={13} className="text-[#00E5FF]" /> Test Telemetry
          </button>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-[#3B0A6B] hover:bg-[#5c14a3] border border-[#5c14a3] transition-all flex items-center gap-1.5"
          >
            <Plus size={14} /> Register Node
          </button>
        </div>
      </div>

      {authError && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-300 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="text-amber-400 shrink-0" />
            <span className="text-xs font-medium">{authError}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleQuickAdminLogin}
              className="py-1.5 px-3 rounded-lg text-xs font-bold bg-[#3B0A6B] hover:bg-[#5c14a3] text-white border border-[#5c14a3] transition-all flex items-center gap-1.5 shadow"
            >
              <LogIn size={13} /> Re-login as Admin
            </button>
            <a
              href="/login"
              className="py-1.5 px-3 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-all underline"
            >
              Go to Login
            </a>
          </div>
        </div>
      )}

      {statusMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2 animate-fade-in">
          <CheckCircle size={15} />
          {statusMessage}
        </div>
      )}

      {/* Grid of Devices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {devices.map(dev => (
          <div
            key={dev.nodeId}
            className="p-5 rounded-2xl bg-[#141021] border border-[#2a1e45] hover:border-[#3B0A6B] transition-all space-y-4"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono text-[#00E5FF] uppercase block">{dev.nodeId}</span>
                <h3 className="text-sm font-bold text-white">{dev.nodeName}</h3>
                <span className="text-[11px] text-slate-400 block mt-0.5">{dev.location}</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
                dev.status === 'ONLINE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dev.status === 'ONLINE' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                {dev.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 p-3 bg-[#050505] rounded-xl border border-[#2a1e45] text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Type</span>
                <span className="text-white font-bold">{dev.nodeType}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Signal Strength</span>
                <span className="text-[#00E5FF]">{dev.signalStrengthRssi} dBm</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">IP Address</span>
                <span className="text-slate-300">{dev.ipAddress}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Scans Today</span>
                <span className="text-emerald-400 font-bold">{dev.detectionsToday}</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 pt-1">
              <span>Firmware: {dev.firmwareVersion}</span>
              <span>Last Heartbeat: {new Date(dev.lastSeen).toLocaleTimeString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Live ESP32 Hardware Telemetry & Connection Logs Feed */}
      <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#2a1e45] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Terminal size={17} className="text-[#00E5FF]" />
              <h2 className="text-base font-bold text-white tracking-tight">ESP32 Telemetry & Connection Logs</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Live Ingestion
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Real-time audit log of hardware heartbeats, beacon detections, device authentication attempts, and network errors.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={logsLoading}
              className="py-1.5 px-3 rounded-xl text-xs font-medium text-slate-300 bg-[#050505] hover:bg-[#1c162f] border border-[#2a1e45] flex items-center gap-1.5 transition-all"
            >
              <RefreshCw size={12} className={logsLoading ? 'animate-spin text-[#00E5FF]' : ''} /> Refresh
            </button>
            <button
              onClick={handleClearLogs}
              disabled={clearingLogs || logs.length === 0}
              className="py-1.5 px-3 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Trash2 size={12} /> Clear Logs
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Severity:</span>
            <div className="flex rounded-lg bg-[#050505] p-0.5 border border-[#2a1e45]">
              {['ALL', 'INFO', 'WARNING', 'ERROR'].map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setLogFilterLevel(lvl)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all ${
                    logFilterLevel === lvl
                      ? 'bg-[#3B0A6B] text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Node:</span>
            <select
              value={logFilterNode}
              onChange={e => setLogFilterNode(e.target.value)}
              className="px-2.5 py-1 bg-[#050505] border border-[#2a1e45] rounded-lg text-xs text-slate-200 font-mono"
            >
              <option value="ALL">All Nodes</option>
              {devices.map(d => (
                <option key={d.nodeId} value={d.nodeId}>{d.nodeId}</option>
              ))}
            </select>
          </div>

          <span className="text-slate-500 font-mono text-[11px] ml-auto">
            Showing {filteredLogs.length} of {logs.length} entries
          </span>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto max-h-96 rounded-xl border border-[#2a1e45] bg-[#050505]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#141021] sticky top-0 text-[10px] text-slate-400 uppercase border-b border-[#2a1e45]">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Node ID</th>
                <th className="py-2.5 px-3">Level</th>
                <th className="py-2.5 px-3">Event Type</th>
                <th className="py-2.5 px-3">Telemetry / Message</th>
                <th className="py-2.5 px-3 text-right">Signal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a1e45]/40">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    No log records matching active filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-[#141021]/60 transition-colors">
                    <td className="py-2 px-3 text-slate-400 whitespace-nowrap text-[11px]">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-2 px-3 text-[#00E5FF] font-semibold whitespace-nowrap">
                      {log.nodeId}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        log.level === 'ERROR' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                        log.level === 'WARNING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-300 font-bold whitespace-nowrap">
                      {log.eventType}
                    </td>
                    <td className="py-2 px-3 text-slate-200">
                      <div>{log.message}</div>
                      {log.details && (
                        <div className="text-[10px] text-slate-500 mt-0.5">{log.details}</div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-400 whitespace-nowrap">
                      {log.signalRssi ? `${log.signalRssi} dBm` : '--'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Beacon Simulation & Heartbeat Modal */}
      {showSimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141021] border border-[#2a1e45] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-[#2a1e45] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Play size={15} className="text-[#00E5FF]" /> Simulate ESP32 Telemetry
              </h3>
              <button onClick={() => { setShowSimModal(false); setTestResult(null); }} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Triggers a live beacon detection payload or node heartbeat through the ESP32 ingestion pipeline to verify deduplication, attendance marking, and hardware logs.
            </p>

            <form onSubmit={handleRunSimulation} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Select Scanning Node</label>
                <select
                  value={simNode}
                  onChange={e => setSimNode(e.target.value)}
                  className="w-full px-3 py-2 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white"
                >
                  {devices.map(d => (
                    <option key={d.nodeId} value={d.nodeId}>{d.nodeName} ({d.nodeType})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Student Phone / BLE Beacon MAC</label>
                <input
                  type="text"
                  required
                  value={simMac}
                  onChange={e => setSimMac(e.target.value)}
                  className="w-full px-3 py-2 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-[#00E5FF] font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Enrolled Beacons: AA:BB:CC:11:22:33 (Alex Rivers), BB:CC:DD:22:33:44 (Liam Chen)
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Proximity RSSI (dBm)</label>
                <input
                  type="number"
                  value={simRssi}
                  onChange={e => setSimRssi(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white font-mono"
                />
              </div>

              {testResult && (
                <div className={`p-3 rounded-xl border text-xs font-mono space-y-1 ${
                  testResult.success ? 'bg-[#050505] border-[#3B0A6B] text-slate-200' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                  <p className="font-bold text-[#00E5FF]">{testResult.message || 'Processed'}</p>
                  {testResult.deduplicated && (
                    <p className="text-amber-400 text-[11px]">&bull; Deduplication protected: Ignored duplicate scan within detection window.</p>
                  )}
                  {testResult.event && (
                    <p className="text-slate-400 text-[10px]">Event ID: {testResult.event.id}</p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={handleTriggerHeartbeat}
                  disabled={heartbeating}
                  className="py-2 px-3.5 rounded-xl text-xs font-semibold text-slate-200 bg-[#050505] hover:bg-[#1c162f] border border-[#2a1e45] flex items-center gap-1.5"
                >
                  <Activity size={12} className="text-emerald-400" />
                  {heartbeating ? 'Pinging...' : 'Send Heartbeat'}
                </button>
                <button
                  type="submit"
                  disabled={simulating}
                  className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-[#3B0A6B] hover:bg-[#5c14a3] border border-[#5c14a3]"
                >
                  {simulating ? 'Transmitting...' : 'Trigger BLE Packet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hardware Wiring & Code Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141021] border border-[#2a1e45] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#2a1e45] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BookOpen size={16} className="text-[#00E5FF]" /> Physical ESP32 + HM-10 Connection Guide
              </h3>
              <button onClick={() => setShowGuideModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Wiring Pinout Table */}
              <div className="p-4 bg-[#050505] rounded-xl border border-[#2a1e45] space-y-2">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <Wifi size={14} className="text-[#00E5FF]" /> 1. Hardware Pinout Wiring Diagram
                </h4>
                <div className="grid grid-cols-3 gap-2 font-mono text-[11px] pt-1">
                  <div className="p-2 rounded bg-[#141021] border border-[#2a1e45]">
                    <span className="text-slate-400 block text-[9px]">HM-10 PIN</span>
                    <span className="text-[#00E5FF] font-bold">TXD</span>
                  </div>
                  <div className="p-2 rounded bg-[#141021] border border-[#2a1e45]">
                    <span className="text-slate-400 block text-[9px]">CONNECTION</span>
                    <span className="text-slate-300">&rarr; Serial2 RX</span>
                  </div>
                  <div className="p-2 rounded bg-[#141021] border border-[#2a1e45]">
                    <span className="text-slate-400 block text-[9px]">ESP32 GPIO</span>
                    <span className="text-emerald-400 font-bold">GPIO 16 (RX2)</span>
                  </div>

                  <div className="p-2 rounded bg-[#141021] border border-[#2a1e45]">
                    <span className="text-slate-400 block text-[9px]">HM-10 PIN</span>
                    <span className="text-[#00E5FF] font-bold">RXD</span>
                  </div>
                  <div className="p-2 rounded bg-[#141021] border border-[#2a1e45]">
                    <span className="text-slate-400 block text-[9px]">CONNECTION</span>
                    <span className="text-slate-300">&rarr; Serial2 TX</span>
                  </div>
                  <div className="p-2 rounded bg-[#141021] border border-[#2a1e45]">
                    <span className="text-slate-400 block text-[9px]">ESP32 GPIO</span>
                    <span className="text-emerald-400 font-bold">GPIO 17 (TX2)</span>
                  </div>

                  <div className="p-2 rounded bg-[#141021] border border-[#2a1e45]">
                    <span className="text-slate-400 block text-[9px]">HM-10 PIN</span>
                    <span className="text-[#00E5FF] font-bold">VCC</span>
                  </div>
                  <div className="p-2 rounded bg-[#141021] border border-[#2a1e45]">
                    <span className="text-slate-400 block text-[9px]">CONNECTION</span>
                    <span className="text-slate-300">&rarr; Power</span>
                  </div>
                  <div className="p-2 rounded bg-[#141021] border border-[#2a1e45]">
                    <span className="text-slate-400 block text-[9px]">ESP32 PIN</span>
                    <span className="text-amber-400 font-bold">5V (VIN) or 3.3V</span>
                  </div>

                  <div className="p-2 rounded bg-[#141021] border border-[#2a1e45]">
                    <span className="text-slate-400 block text-[9px]">HM-10 PIN</span>
                    <span className="text-[#00E5FF] font-bold">GND</span>
                  </div>
                  <div className="p-2 rounded bg-[#141021] border border-[#2a1e45]">
                    <span className="text-slate-400 block text-[9px]">CONNECTION</span>
                    <span className="text-slate-300">&rarr; Common Ground</span>
                  </div>
                  <div className="p-2 rounded bg-[#141021] border border-[#2a1e45]">
                    <span className="text-slate-400 block text-[9px]">ESP32 PIN</span>
                    <span className="text-slate-300 font-bold">GND</span>
                  </div>
                </div>
              </div>

              {/* API Endpoints & Auth */}
              <div className="p-4 bg-[#050505] rounded-xl border border-[#2a1e45] space-y-2 font-mono text-[11px]">
                <h4 className="font-bold text-white flex items-center gap-1.5 font-sans text-xs">
                  <Shield size={14} className="text-[#00E5FF]" /> 2. Device Authentication & Endpoints
                </h4>
                <div className="space-y-1 pt-1">
                  <p><span className="text-slate-400">Header:</span> <span className="text-emerald-400 font-bold">x-device-key: sc_esp32_secret_token_2026</span></p>
                  <p><span className="text-slate-400">Heartbeat POST:</span> <span className="text-[#00E5FF]">/api/attendance/heartbeat</span> (Every 30s)</p>
                  <p><span className="text-slate-400">BLE Ingestion POST:</span> <span className="text-[#00E5FF]">/api/attendance/ble-event</span> (On scan)</p>
                  <p><span className="text-slate-400">Error Report POST:</span> <span className="text-[#00E5FF]">/api/attendance/device-log</span></p>
                </div>
              </div>

              {/* Enrolled Students Reference */}
              <div className="p-4 bg-[#050505] rounded-xl border border-[#2a1e45] space-y-2">
                <h4 className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <Key size={14} className="text-[#00E5FF]" /> 3. Enrolled Student BLE MAC Beacons for Testing
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                  <div className="p-2 bg-[#141021] rounded border border-[#2a1e45]">
                    <span className="text-white font-bold block">Alex Rivers</span>
                    <span className="text-[#00E5FF]">AA:BB:CC:11:22:33</span>
                    <span className="text-[9px] text-slate-500 block">Roll: CS2023-042</span>
                  </div>
                  <div className="p-2 bg-[#141021] rounded border border-[#2a1e45]">
                    <span className="text-white font-bold block">Liam Chen</span>
                    <span className="text-[#00E5FF]">BB:CC:DD:22:33:44</span>
                    <span className="text-[9px] text-slate-500 block">Roll: CS2023-088</span>
                  </div>
                  <div className="p-2 bg-[#141021] rounded border border-[#2a1e45]">
                    <span className="text-white font-bold block">Sophia Martinez</span>
                    <span className="text-[#00E5FF]">CC:DD:EE:33:44:55</span>
                    <span className="text-[9px] text-slate-500 block">Roll: CS2023-104</span>
                  </div>
                </div>
              </div>

              {/* Source sketch file path notification */}
              <div className="p-3 bg-[#3B0A6B]/20 border border-[#3B0A6B] rounded-xl text-slate-300 text-xs">
                Complete, fully annotated Arduino/C++ source sketch is saved in the repository at <span className="font-mono text-[#00E5FF]">firmware/esp32_hm10_smart_attendance.ino</span>. Open with Arduino IDE, update your Wi-Fi SSID/password, and flash to ESP32 Dev Module.
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="py-2 px-5 rounded-xl text-xs font-bold text-white bg-[#3B0A6B] hover:bg-[#5c14a3]"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register Node Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141021] border border-[#2a1e45] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-[#2a1e45] pb-3">
              <h3 className="text-sm font-bold text-white">Register Hardware Node</h3>
              <button onClick={() => setShowRegisterModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Unique Node ID</label>
                <input
                  type="text"
                  required
                  value={nodeId}
                  onChange={e => setNodeId(e.target.value.toUpperCase())}
                  placeholder="ESP32-GATE-SOUTH-04"
                  className="w-full px-3 py-2 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Node Label</label>
                <input
                  type="text"
                  required
                  value={nodeName}
                  onChange={e => setNodeName(e.target.value)}
                  placeholder="South Turnstile Node"
                  className="w-full px-3 py-2 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Node Type</label>
                  <select
                    value={nodeType}
                    onChange={e => setNodeType(e.target.value as 'ENTRY' | 'EXIT')}
                    className="w-full px-3 py-2 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white"
                  >
                    <option value="ENTRY">ENTRY Scanner</option>
                    <option value="EXIT">EXIT Scanner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Turnstile Location</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Turnstile Gate 4"
                    className="w-full px-3 py-2 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="py-2 px-4 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="py-2 px-5 rounded-xl text-xs font-bold text-white bg-[#3B0A6B] hover:bg-[#5c14a3] border border-[#5c14a3]"
                >
                  {registering ? 'Binding node...' : 'Certify & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDevicesPage;
