import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { Cpu, Radio, Plus, CheckCircle, AlertTriangle, RefreshCw, X, Play } from 'lucide-react';

export const AdminDevicesPage: React.FC = () => {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showSimModal, setShowSimModal] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

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

  const fetchDevices = async () => {
    try {
      const res = await api.getDevices();
      if (res.success) setDevices(res.devices);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

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
        await fetchDevices();
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
      await fetchDevices();
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading ESP32 telemetry hardware grid...</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu size={18} className="text-[#00E5FF]" />
            <h1 className="text-xl font-bold text-white tracking-tight">ESP32 BLE Smart Attendance Node Fleet</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Physical edge gateways deployed at campus turnstiles running cryptographic detection firmware.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowSimModal(true)}
            className="py-2 px-3.5 rounded-xl text-xs font-semibold text-slate-200 bg-[#141021] hover:bg-[#1c162f] border border-[#2a1e45] transition-all flex items-center gap-1.5"
          >
            <Play size={13} className="text-[#00E5FF]" /> Test Beacon Scan
          </button>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-[#3B0A6B] hover:bg-[#5c14a3] border border-[#5c14a3] transition-all flex items-center gap-1.5"
          >
            <Plus size={14} /> Register Node
          </button>
        </div>
      </div>

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

      {/* Test Beacon Simulation Modal */}
      {showSimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141021] border border-[#2a1e45] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-[#2a1e45] pb-3">
              <h3 className="text-sm font-bold text-white">Simulate ESP32 Beacon Detection</h3>
              <button onClick={() => { setShowSimModal(false); setTestResult(null); }} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Triggers a live beacon detection payload through the ESP32 ingestion pipeline to verify deduplication, attendance marking, and real-time synchronization.
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">Student Phone BLE MAC</label>
                <input
                  type="text"
                  required
                  value={simMac}
                  onChange={e => setSimMac(e.target.value)}
                  className="w-full px-3 py-2 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-[#00E5FF] font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Default: AA:BB:CC:11:22:33 (Alex Rivers)
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
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowSimModal(false)}
                  className="py-2 px-4 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={simulating}
                  className="py-2 px-5 rounded-xl text-xs font-bold text-white bg-[#3B0A6B] hover:bg-[#5c14a3] border border-[#5c14a3]"
                >
                  {simulating ? 'Transmitting beacon...' : 'Trigger BLE Packet'}
                </button>
              </div>
            </form>
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
