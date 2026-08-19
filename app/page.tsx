'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Types
interface Driver {
  id: number;
  name: string;
  truck: string;
  dispatch: string;
  company: string;
  total_points: number;
  categoryPoints: Record<string, number>;
}

interface SafetyEvent {
  id: string;
  event_type: string;
  driver_id: number;
  driver: string;
  truck: string;
  dispatch: string;
  company: string;
  event_date: string;
  category: string | null;
  severity: string | null;
  description: string;
  points: number;
  is_inspection: boolean;
  corrections: any[];
}

const FMCSA_CATEGORIES = [
  'Unsafe Driving',
  'Driver Fitness',
  'Controlled Substance',
  'Vehicle Maintenance',
  'Hours of Service',
  'Crash Indicator',
];

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [events, setEvents] = useState<SafetyEvent[]>([]);
  const [currentTab, setCurrentTab] = useState(0);
  const [currentSubTab, setCurrentSubTab] = useState(0);

  // Modal states
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [showViolation, setShowViolation] = useState(false);
  const [showAccident, setShowAccident] = useState(false);
  const [showSamsara, setShowSamsara] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  const [showEditEvent, setShowEditEvent] = useState(false);

  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<SafetyEvent | null>(null);

  // Form states
  const [newDriver, setNewDriver] = useState({ name: '', truck: '', dispatch: '', company: 'MNM Freight' });
  const [violationForm, setViolationForm] = useState({
    driver_id: '',
    truck: '',
    dispatch: '',
    company: 'MNM Freight',
    event_date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    points: 10,
    is_inspection: false,
  });
  const [accidentForm, setAccidentForm] = useState({
    driver_id: '',
    truck: '',
    dispatch: '',
    company: 'MNM Freight',
    event_date: new Date().toISOString().split('T')[0],
    severity: 'Moderate',
    description: '',
    points: 25,
  });
  const [samsaraForm, setSamsaraForm] = useState({
    driver_id: '',
    truck: '',
    dispatch: '',
    company: 'MNM Freight',
    event_date: new Date().toISOString().split('T')[0],
    category: 'Harsh Braking',
    description: '',
    points: 5,
  });
  const [correctionForm, setCorrectionForm] = useState({
    correction_type: 'Warning',
    points_reduced: 5,
    notes: '',
  });
  const [editEventForm, setEditEventForm] = useState({
    event_date: '',
    description: '',
    points: 0,
    category: '',
  });

  const [leaderSearch, setLeaderSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Auth check + load data
  const loadData = useCallback(async () => {
    try {
      const me = await fetch('/api/auth/me');
      if (!me.ok) {
        router.push('/login');
        return;
      }

      const [driversRes, eventsRes] = await Promise.all([
        fetch('/api/drivers'),
        fetch('/api/events'),
      ]);

      if (driversRes.ok) setDrivers(await driversRes.json());
      if (eventsRes.ok) setEvents(await eventsRes.json());
    } catch (err) {
      console.error(err);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Helpers
  const getTotalPoints = (d: Driver) => d.total_points || 0;

  const filteredEvents = () => {
    if (currentSubTab === 0) return events;
    if (currentSubTab === 1) return events.filter((e) => e.event_type === 'Violation');
    if (currentSubTab === 2) return events.filter((e) => e.event_type === 'Inspection');
    if (currentSubTab === 3) return events.filter((e) => e.event_type === 'Accident');
    if (currentSubTab === 4) return events.filter((e) => e.event_type === 'Samsara Event');
    return events;
  };

  const leaderboardDrivers = () => {
    let list = [...drivers];
    if (leaderSearch) {
      list = list.filter((d) => d.name.toLowerCase().includes(leaderSearch.toLowerCase()));
    }
    if (categoryFilter !== 'all') {
      list = list.filter((d) => d.categoryPoints?.[categoryFilter]);
    }
    return list.sort((a, b) => getTotalPoints(b) - getTotalPoints(a));
  };

  const grandTotalPoints = drivers.reduce((sum, d) => sum + getTotalPoints(d), 0);
  const totalViolations = events.filter((e) => e.event_type === 'Violation' || e.event_type === 'Inspection').length;
  const totalAccidents = events.filter((e) => e.event_type === 'Accident').length;

  // Actions
  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  async function addDriver() {
    if (!newDriver.name.trim()) return alert('Driver name is required');
    const res = await fetch('/api/drivers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDriver),
    });
    if (res.ok) {
      setShowAddDriver(false);
      setNewDriver({ name: '', truck: '', dispatch: '', company: 'MNM Freight' });
      loadData();
      alert('Driver added successfully!');
    }
  }

  async function submitViolation() {
    if (!violationForm.driver_id || !violationForm.category) {
      return alert('Please select driver and category');
    }
    const finalPoints = violationForm.is_inspection ? violationForm.points * 3 : violationForm.points;
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...violationForm,
        event_type: violationForm.is_inspection ? 'Inspection' : 'Violation',
        points: finalPoints,
        is_inspection: violationForm.is_inspection,
      }),
    });
    if (res.ok) {
      setShowViolation(false);
      loadData();
      alert('Violation recorded!');
    }
  }

  async function submitAccident() {
    if (!accidentForm.driver_id) return alert('Please select a driver');
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...accidentForm,
        event_type: 'Accident',
        category: 'Crash Indicator',
      }),
    });
    if (res.ok) {
      setShowAccident(false);
      loadData();
      alert('Accident recorded!');
    }
  }

  async function submitSamsara() {
    if (!samsaraForm.driver_id) return alert('Please select a driver');
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...samsaraForm,
        event_type: 'Samsara Event',
      }),
    });
    if (res.ok) {
      setShowSamsara(false);
      loadData();
      alert('Samsara event recorded!');
    }
  }

  async function applyCorrection() {
    if (!selectedEvent || correctionForm.points_reduced <= 0) return;
    const res = await fetch('/api/corrections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: selectedEvent.id,
        ...correctionForm,
      }),
    });
    if (res.ok) {
      setShowCorrection(false);
      setShowDetail(false);
      loadData();
      alert('Correction applied!');
    }
  }

  async function deleteEvent(id: string) {
    if (!confirm('Delete this event?')) return;
    const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadData();
    }
  }

  async function saveEventEdit() {
    if (!selectedEvent) return;
    const res = await fetch(`/api/events/${selectedEvent.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editEventForm),
    });
    if (res.ok) {
      setShowEditEvent(false);
      setShowDetail(false);
      loadData();
      alert('Event updated!');
    }
  }

  function openProfile(driver: Driver) {
    setSelectedDriver(driver);
    setShowProfile(true);
  }

  function openEventDetail(event: SafetyEvent) {
    setSelectedEvent(event);
    setShowDetail(true);
  }

  function openCorrection() {
    setShowDetail(false);
    setShowCorrection(true);
  }

  function openEditEvent() {
    if (!selectedEvent) return;
    setEditEventForm({
      event_date: selectedEvent.event_date,
      description: selectedEvent.description,
      points: selectedEvent.points,
      category: selectedEvent.category || selectedEvent.severity || '',
    });
    setShowDetail(false);
    setShowEditEvent(true);
  }

  // When selecting driver in forms
  function selectDriverForForm(driver: Driver, type: 'violation' | 'accident' | 'samsara') {
    if (type === 'violation') {
      setViolationForm((f) => ({
        ...f,
        driver_id: String(driver.id),
        truck: driver.truck,
        dispatch: driver.dispatch,
        company: driver.company,
      }));
    } else if (type === 'accident') {
      setAccidentForm((f) => ({
        ...f,
        driver_id: String(driver.id),
        truck: driver.truck,
        dispatch: driver.dispatch,
        company: driver.company,
      }));
    } else {
      setSamsaraForm((f) => ({
        ...f,
        driver_id: String(driver.id),
        truck: driver.truck,
        dispatch: driver.dispatch,
        company: driver.company,
      }));
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <nav className="bg-white shadow sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-700">Safety KPI</h1>
          <div className="flex gap-8 text-sm items-center">
            <button onClick={() => setCurrentTab(0)} className={`px-4 py-2 ${currentTab === 0 ? 'tab-active' : ''}`}>
              Dashboard
            </button>
            <button onClick={() => setCurrentTab(1)} className={`px-4 py-2 ${currentTab === 1 ? 'tab-active' : ''}`}>
              Violations
            </button>
            <button onClick={() => setCurrentTab(2)} className={`px-4 py-2 ${currentTab === 2 ? 'tab-active' : ''}`}>
              Drivers
            </button>
            <button onClick={() => setCurrentTab(3)} className={`px-4 py-2 ${currentTab === 3 ? 'tab-active' : ''}`}>
              Dispatches
            </button>
            <button onClick={handleLogout} className="text-red-600 hover:text-red-800 ml-4">
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* ===================== DASHBOARD ===================== */}
      {currentTab === 0 && (
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h2 className="text-3xl font-bold mb-8">Dashboard</h2>

          <div className="bg-white p-8 rounded-3xl shadow mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-3xl font-semibold">MNM Freight</h3>
                <p className="text-gray-500">
                  Total Drivers: {drivers.length} | Active Dispatches: 12 | Total Violations: {totalViolations} | Total Accidents: {totalAccidents}
                </p>
              </div>
              <div className="text-right">
                <p className="text-5xl font-bold text-red-600">{grandTotalPoints}</p>
                <p className="text-gray-500">Total Violation + Accident Points</p>
              </div>
            </div>
          </div>

          {/* Category cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
            {FMCSA_CATEGORIES.map((cat) => {
              const total = events
                .filter((e) => e.category === cat || (cat === 'Crash Indicator' && e.event_type === 'Accident'))
                .reduce((s, e) => s + e.points, 0);
              return (
                <div key={cat} className="bg-white p-4 rounded-3xl shadow text-center">
                  <h4 className="font-medium mb-2 text-sm text-gray-700">{cat}</h4>
                  <div className="text-2xl font-bold mt-4">{total} pts</div>
                </div>
              );
            })}
          </div>

          {/* Leaderboard */}
          <div className="bg-white rounded-3xl shadow">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-semibold">Drivers with Highest Points</h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Search driver..."
                  value={leaderSearch}
                  onChange={(e) => setLeaderSearch(e.target.value)}
                  className="border rounded-xl px-4 py-2 w-64"
                />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="border rounded-xl px-4 py-2"
                >
                  <option value="all">All Categories</option>
                  {FMCSA_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-5 text-left w-20">Rank</th>
                  <th className="p-5 text-left">Driver</th>
                  <th className="p-5 text-left">Truck</th>
                  <th className="p-5 text-left">Company</th>
                  <th className="p-5 text-left">Total Points</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {leaderboardDrivers().map((d, i) => (
                  <tr key={d.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openProfile(d)}>
                    <td className="p-5 font-bold text-blue-600">#{i + 1}</td>
                    <td className="p-5">{d.name}</td>
                    <td className="p-5">{d.truck}</td>
                    <td className="p-5">{d.company}</td>
                    <td className={`p-5 font-bold ${getTotalPoints(d) > 40 ? 'text-red-600' : 'text-amber-600'}`}>
                      {getTotalPoints(d)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== VIOLATIONS / EVENTS ===================== */}
      {currentTab === 1 && (
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">Safety Events Management</h2>
            <div className="flex gap-4">
              <button onClick={() => setShowViolation(true)} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2">
                <i className="fas fa-plus"></i> Record Violation
              </button>
              <button onClick={() => setShowAccident(true)} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2">
                <i className="fas fa-car-crash"></i> Record Accident
              </button>
              <button onClick={() => setShowSamsara(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2">
                <i className="fas fa-bell"></i> Add Samsara Event
              </button>
            </div>
          </div>

          <div className="flex border-b mb-6 bg-white rounded-t-3xl">
            {['All Events', 'Violations', 'Inspections', 'Accidents', 'Samsara Events'].map((label, i) => (
              <button
                key={i}
                onClick={() => setCurrentSubTab(i)}
                className={`px-8 py-4 text-sm ${currentSubTab === i ? 'subtab-active' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-3xl shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-5 text-left">ID</th>
                  <th className="p-5 text-left">Date</th>
                  <th className="p-5 text-left">Driver</th>
                  <th className="p-5 text-left">Truck</th>
                  <th className="p-5 text-left">Type</th>
                  <th className="p-5 text-left">Points</th>
                  <th className="p-5 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredEvents().map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openEventDetail(e)}>
                    <td className="p-5 font-mono">{e.id}</td>
                    <td className="p-5">{e.event_date}</td>
                    <td className="p-5">{e.driver}</td>
                    <td className="p-5">{e.truck}</td>
                    <td className="p-5">{e.event_type === 'Accident' ? e.severity : e.category || e.event_type}</td>
                    <td className={`p-5 font-bold ${e.event_type === 'Accident' ? 'text-orange-600' : 'text-red-600'}`}>
                      {e.points}
                    </td>
                    <td className="p-5">
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          deleteEvent(e.id);
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== DRIVERS ===================== */}
      {currentTab === 2 && (
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">Drivers List</h2>
            <button onClick={() => setShowAddDriver(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2">
              <i className="fas fa-plus"></i> Add New Driver
            </button>
          </div>
          <div className="bg-white rounded-3xl shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-5 text-left">Driver</th>
                  <th className="p-5 text-left">Truck</th>
                  <th className="p-5 text-left">Dispatch</th>
                  <th className="p-5 text-left">Company</th>
                  <th className="p-5 text-left font-bold">TOTAL POINTS</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {drivers.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openProfile(d)}>
                    <td className="p-5 font-medium">{d.name}</td>
                    <td className="p-5">{d.truck}</td>
                    <td className="p-5">{d.dispatch}</td>
                    <td className="p-5">{d.company}</td>
                    <td className="p-5 font-bold">{getTotalPoints(d)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== DISPATCHES ===================== */}
      {currentTab === 3 && (
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h2 className="text-3xl font-bold mb-8">Dispatches List</h2>
          <div className="bg-white p-20 rounded-3xl shadow text-center text-gray-500">
            Dispatches List - Coming Soon
          </div>
        </div>
      )}

      {/* ===================== MODALS ===================== */}

      {/* Add Driver */}
      {showAddDriver && (
        <div className="modal show">
          <div className="modal-content bg-white rounded-3xl p-8 shadow-xl">
            <h3 className="text-2xl font-bold mb-6">Add New Driver</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Driver Name</label>
                <input className="w-full border rounded-xl px-4 py-3" value={newDriver.name} onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Truck Number</label>
                  <input className="w-full border rounded-xl px-4 py-3" value={newDriver.truck} onChange={(e) => setNewDriver({ ...newDriver, truck: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Dispatch</label>
                  <input className="w-full border rounded-xl px-4 py-3" value={newDriver.dispatch} onChange={(e) => setNewDriver({ ...newDriver, dispatch: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Company</label>
                <input className="w-full border rounded-xl px-4 py-3" value={newDriver.company} onChange={(e) => setNewDriver({ ...newDriver, company: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={addDriver} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-medium">Add Driver</button>
              <button onClick={() => setShowAddDriver(false)} className="flex-1 bg-gray-200 py-4 rounded-2xl font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Record Violation */}
      {showViolation && (
        <div className="modal show">
          <div className="modal-content bg-white rounded-3xl p-8 shadow-xl">
            <h3 className="text-2xl font-bold mb-6">Record New Violation</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Select Driver *</label>
                <select
                  className="w-full border rounded-xl px-4 py-3"
                  value={violationForm.driver_id}
                  onChange={(e) => {
                    const d = drivers.find((x) => String(x.id) === e.target.value);
                    if (d) selectDriverForForm(d, 'violation');
                  }}
                >
                  <option value="">-- Select Driver --</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Truck</label>
                  <input className="w-full border rounded-xl px-4 py-3" value={violationForm.truck} onChange={(e) => setViolationForm({ ...violationForm, truck: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Dispatch</label>
                  <input className="w-full border rounded-xl px-4 py-3" value={violationForm.dispatch} onChange={(e) => setViolationForm({ ...violationForm, dispatch: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <input type="date" className="w-full border rounded-xl px-4 py-3" value={violationForm.event_date} onChange={(e) => setViolationForm({ ...violationForm, event_date: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Category *</label>
                <select className="w-full border rounded-xl px-4 py-3" value={violationForm.category} onChange={(e) => setViolationForm({ ...violationForm, category: e.target.value })}>
                  <option value="">-- Select --</option>
                  <option>Unsafe Driving</option>
                  <option>Driver Fitness</option>
                  <option>Controlled Substance</option>
                  <option>Vehicle Maintenance</option>
                  <option>Hours of Service</option>
                  <option>Cargo Related</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea className="w-full border rounded-xl px-4 py-3" rows={3} value={violationForm.description} onChange={(e) => setViolationForm({ ...violationForm, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Base Points</label>
                  <input type="number" className="w-full border rounded-xl px-4 py-3" value={violationForm.points} onChange={(e) => setViolationForm({ ...violationForm, points: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Inspection?</label>
                  <select className="w-full border rounded-xl px-4 py-3" value={violationForm.is_inspection ? 'yes' : 'no'} onChange={(e) => setViolationForm({ ...violationForm, is_inspection: e.target.value === 'yes' })}>
                    <option value="no">No</option>
                    <option value="yes">Yes (×3)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Final Points</label>
                  <input className="w-full border rounded-xl px-4 py-3 bg-gray-50 font-bold" readOnly value={violationForm.is_inspection ? violationForm.points * 3 : violationForm.points} />
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={submitViolation} className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-medium">Record Violation</button>
              <button onClick={() => setShowViolation(false)} className="flex-1 bg-gray-200 py-4 rounded-2xl font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Record Accident */}
      {showAccident && (
        <div className="modal show">
          <div className="modal-content bg-white rounded-3xl p-8 shadow-xl">
            <h3 className="text-2xl font-bold mb-6">Record New Accident</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Select Driver *</label>
                <select
                  className="w-full border rounded-xl px-4 py-3"
                  value={accidentForm.driver_id}
                  onChange={(e) => {
                    const d = drivers.find((x) => String(x.id) === e.target.value);
                    if (d) selectDriverForForm(d, 'accident');
                  }}
                >
                  <option value="">-- Select Driver --</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Truck</label>
                  <input className="w-full border rounded-xl px-4 py-3" value={accidentForm.truck} onChange={(e) => setAccidentForm({ ...accidentForm, truck: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Dispatch</label>
                  <input className="w-full border rounded-xl px-4 py-3" value={accidentForm.dispatch} onChange={(e) => setAccidentForm({ ...accidentForm, dispatch: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <input type="date" className="w-full border rounded-xl px-4 py-3" value={accidentForm.event_date} onChange={(e) => setAccidentForm({ ...accidentForm, event_date: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Severity *</label>
                <select className="w-full border rounded-xl px-4 py-3" value={accidentForm.severity} onChange={(e) => {
                  const pts = e.target.value === 'Minor' ? 10 : e.target.value === 'Moderate' ? 25 : e.target.value === 'Major' ? 50 : 75;
                  setAccidentForm({ ...accidentForm, severity: e.target.value, points: pts });
                }}>
                  <option value="Minor">Minor (10 pts)</option>
                  <option value="Moderate">Moderate (25 pts)</option>
                  <option value="Major">Major (50 pts)</option>
                  <option value="Severe">Severe (75 pts)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea className="w-full border rounded-xl px-4 py-3" rows={3} value={accidentForm.description} onChange={(e) => setAccidentForm({ ...accidentForm, description: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Points</label>
                <input type="number" className="w-full border rounded-xl px-4 py-3" value={accidentForm.points} onChange={(e) => setAccidentForm({ ...accidentForm, points: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={submitAccident} className="flex-1 bg-orange-600 text-white py-4 rounded-2xl font-medium">Record Accident</button>
              <button onClick={() => setShowAccident(false)} className="flex-1 bg-gray-200 py-4 rounded-2xl font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Record Samsara */}
      {showSamsara && (
        <div className="modal show">
          <div className="modal-content bg-white rounded-3xl p-8 shadow-xl">
            <h3 className="text-2xl font-bold mb-6">Add Samsara Event</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Select Driver *</label>
                <select
                  className="w-full border rounded-xl px-4 py-3"
                  value={samsaraForm.driver_id}
                  onChange={(e) => {
                    const d = drivers.find((x) => String(x.id) === e.target.value);
                    if (d) selectDriverForForm(d, 'samsara');
                  }}
                >
                  <option value="">-- Select Driver --</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Truck</label>
                  <input className="w-full border rounded-xl px-4 py-3" value={samsaraForm.truck} onChange={(e) => setSamsaraForm({ ...samsaraForm, truck: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Dispatch</label>
                  <input className="w-full border rounded-xl px-4 py-3" value={samsaraForm.dispatch} onChange={(e) => setSamsaraForm({ ...samsaraForm, dispatch: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <input type="date" className="w-full border rounded-xl px-4 py-3" value={samsaraForm.event_date} onChange={(e) => setSamsaraForm({ ...samsaraForm, event_date: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Event Type</label>
                <select className="w-full border rounded-xl px-4 py-3" value={samsaraForm.category} onChange={(e) => setSamsaraForm({ ...samsaraForm, category: e.target.value })}>
                  <option>Harsh Braking</option>
                  <option>Speeding</option>
                  <option>Route Deviation</option>
                  <option>Idle Time</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea className="w-full border rounded-xl px-4 py-3" rows={3} value={samsaraForm.description} onChange={(e) => setSamsaraForm({ ...samsaraForm, description: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Points</label>
                <input type="number" className="w-full border rounded-xl px-4 py-3" value={samsaraForm.points} onChange={(e) => setSamsaraForm({ ...samsaraForm, points: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={submitSamsara} className="flex-1 bg-purple-600 text-white py-4 rounded-2xl font-medium">Record Samsara Event</button>
              <button onClick={() => setShowSamsara(false)} className="flex-1 bg-gray-200 py-4 rounded-2xl font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Profile */}
      {showProfile && selectedDriver && (
        <div className="modal show">
          <div className="modal-content bg-white rounded-3xl p-8 shadow-xl max-w-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">{selectedDriver.name}</h3>
              <button onClick={() => setShowProfile(false)} className="text-3xl text-gray-400">×</button>
            </div>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div><p className="text-sm text-gray-500">Truck</p><p className="font-medium text-lg">{selectedDriver.truck}</p></div>
              <div><p className="text-sm text-gray-500">Dispatch</p><p className="font-medium text-lg">{selectedDriver.dispatch}</p></div>
              <div><p className="text-sm text-gray-500">Company</p><p className="font-medium">{selectedDriver.company}</p></div>
              <div>
                <p className="text-sm text-gray-500">Total Points</p>
                <span className={`inline-block px-5 py-1 rounded-full text-white font-semibold ${getTotalPoints(selectedDriver) > 40 ? 'bg-red-500' : getTotalPoints(selectedDriver) > 20 ? 'bg-amber-500' : 'bg-green-500'}`}>
                  {getTotalPoints(selectedDriver)} pts
                </span>
              </div>
            </div>

            <h4 className="font-semibold mb-3">Points by Category</h4>
            <div className="space-y-3 mb-8">
              {Object.entries(selectedDriver.categoryPoints || {}).map(([cat, pts]) => (
                <div key={cat} className="bg-gray-100 p-4 rounded-2xl flex justify-between">
                  <span>{cat}</span>
                  <span className="font-bold">{pts} pts</span>
                </div>
              ))}
              {Object.keys(selectedDriver.categoryPoints || {}).length === 0 && (
                <p className="text-gray-500 text-center py-4">No points yet</p>
              )}
            </div>

            <button onClick={() => setShowProfile(false)} className="w-full bg-gray-200 py-4 rounded-2xl font-medium">Close</button>
          </div>
        </div>
      )}

      {/* Event Detail */}
      {showDetail && selectedEvent && (
        <div className="modal show">
          <div className="modal-content bg-white rounded-3xl p-8 shadow-xl max-w-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">{selectedEvent.id}</h3>
              <button onClick={() => setShowDetail(false)} className="text-3xl text-gray-400">×</button>
            </div>
            <div className="bg-gray-50 p-5 rounded-2xl space-y-2 text-sm">
              <div><strong>Date:</strong> {selectedEvent.event_date}</div>
              <div><strong>Driver:</strong> {selectedEvent.driver}</div>
              <div><strong>Truck:</strong> {selectedEvent.truck}</div>
              <div><strong>Type:</strong> {selectedEvent.event_type}</div>
              <div><strong>Points:</strong> <span className="font-bold text-red-600">{selectedEvent.points}</span></div>
              <div className="mt-3"><strong>Description:</strong><p className="mt-1">{selectedEvent.description}</p></div>
            </div>

            {selectedEvent.corrections?.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold mb-3">Correction History</h4>
                {selectedEvent.corrections.map((c: any, i: number) => (
                  <div key={i} className="bg-green-50 border border-green-200 p-4 rounded-2xl mb-3">
                    <div className="flex justify-between text-sm">
                      <div><strong>{c.correction_type}</strong> - {c.correction_date}</div>
                      <div className="font-medium text-green-700">- {c.points_reduced} pts</div>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{c.notes}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-4 mt-10">
              <button onClick={openEditEvent} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-medium">Edit Event</button>
              <button onClick={openCorrection} className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-medium">Apply Correction</button>
              <button onClick={() => setShowDetail(false)} className="flex-1 bg-gray-200 py-4 rounded-2xl font-medium">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Correction Modal */}
      {showCorrection && selectedEvent && (
        <div className="modal show">
          <div className="modal-content bg-white rounded-3xl p-8 shadow-xl">
            <h3 className="text-2xl font-bold mb-6">Apply Correction</h3>
            <div className="bg-gray-50 p-4 rounded-2xl mb-6 text-sm">
              <div><strong>ID:</strong> {selectedEvent.id}</div>
              <div><strong>Driver:</strong> {selectedEvent.driver}</div>
              <div><strong>Current Points:</strong> {selectedEvent.points}</div>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Correction Type</label>
                <select className="w-full border rounded-xl px-4 py-3" value={correctionForm.correction_type} onChange={(e) => setCorrectionForm({ ...correctionForm, correction_type: e.target.value })}>
                  <option>Warning</option>
                  <option>Verbal Counseling</option>
                  <option>Written Warning</option>
                  <option>Retraining</option>
                  <option>Suspension</option>
                  <option>Termination</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Points to Reduce</label>
                <input type="number" className="w-full border rounded-xl px-4 py-3" value={correctionForm.points_reduced} onChange={(e) => setCorrectionForm({ ...correctionForm, points_reduced: Number(e.target.value) })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Notes</label>
                <textarea className="w-full border rounded-xl px-4 py-3" rows={3} value={correctionForm.notes} onChange={(e) => setCorrectionForm({ ...correctionForm, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={applyCorrection} className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-medium">Apply Correction</button>
              <button onClick={() => setShowCorrection(false)} className="flex-1 bg-gray-200 py-4 rounded-2xl font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event */}
      {showEditEvent && selectedEvent && (
        <div className="modal show">
          <div className="modal-content bg-white rounded-3xl p-8 shadow-xl">
            <h3 className="text-2xl font-bold mb-6">Edit Event</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <input type="date" className="w-full border rounded-xl px-4 py-3" value={editEventForm.event_date} onChange={(e) => setEditEventForm({ ...editEventForm, event_date: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea className="w-full border rounded-xl px-4 py-3" rows={4} value={editEventForm.description} onChange={(e) => setEditEventForm({ ...editEventForm, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Points</label>
                  <input type="number" className="w-full border rounded-xl px-4 py-3" value={editEventForm.points} onChange={(e) => setEditEventForm({ ...editEventForm, points: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Category / Type</label>
                  <input className="w-full border rounded-xl px-4 py-3" value={editEventForm.category} onChange={(e) => setEditEventForm({ ...editEventForm, category: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={saveEventEdit} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-medium">Save Changes</button>
              <button onClick={() => setShowEditEvent(false)} className="flex-1 bg-gray-200 py-4 rounded-2xl font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}