import React, { useState, useEffect } from 'react';
import { Shield, Clock, CheckCircle, AlertTriangle, MapPin, Search, ChevronRight } from 'lucide-react';

interface CityEvent {
  id: string;
  category: string;
  status: string;
  confidence_score: number;
  created_at: string;
  description?: string;
}

const App: React.FC = () => {
  const [events, setEvents] = useState<CityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      const response = await fetch('http://localhost:3001/events');
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (err) {
      console.error('Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    // Poll for new events every 10 seconds for authority portal
    const interval = setInterval(fetchEvents, 10000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (eventId: string, status: string) => {
    try {
      const response = await fetch(`http://localhost:3001/events/${eventId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (response.ok) fetchEvents();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  return (
    <div style={styles.dashboard}>
      <aside style={styles.sidebar}>
        <div style={styles.logoContainer}>
          <Shield size={24} color="#3b82f6" />
          <span style={styles.logoText}>AUTHORITY PORTAL</span>
        </div>
        <nav style={styles.nav}>
          <div style={{ ...styles.navItem, background: '#1e293b', color: '#fff' }}>
            Active Triage
          </div>
          <div style={styles.navItem}>Resolved Archive</div>
          <div style={styles.navItem}>Response Teams</div>
          <div style={styles.navItem}>City Analytics</div>
        </nav>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <div style={styles.searchBar}>
            <Search size={18} color="#64748b" />
            <input type="text" placeholder="Search events, wards, or categories..." style={styles.searchInput} />
          </div>
          <div style={styles.userInfo}>
            <div style={styles.avatar}>BBMP</div>
            <span>BBMP Admin - South Zone</span>
          </div>
        </header>

        <section style={styles.content}>
          <div style={styles.summaryGrid}>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>Pending Triage</span>
              <span style={styles.statValue}>{events.filter(e => e.status === 'REPORTED').length}</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>In Progress</span>
              <span style={styles.statValue}>{events.filter(e => e.status === 'IN_PROGRESS').length}</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>Avg Resolution</span>
              <span style={styles.statValue}>4.2h</span>
            </div>
          </div>

          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.th}>EVENT ID</th>
                  <th style={styles.th}>CATEGORY</th>
                  <th style={styles.th}>CONFIDENCE</th>
                  <th style={styles.th}>STATUS</th>
                  <th style={styles.th}>REPORTED AT</th>
                  <th style={styles.th}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>Loading City Events...</td></tr>
                ) : events.map(event => (
                  <tr key={event.id} style={styles.tr}>
                    <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: '11px' }}>{event.id.slice(0, 8)}</td>
                    <td style={styles.td}>
                      <div style={styles.categoryBadge}>
                        {event.category.replace('_', ' ')}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ 
                        display: 'flex', alignItems: 'center', gap: '8px',
                        color: event.confidence_score > 70 ? '#ef4444' : '#f59e0b'
                      }}>
                        <div style={{ width: '40px', height: '4px', background: '#e2e8f0', borderRadius: '2px' }}>
                          <div style={{ width: `${event.confidence_score}%`, height: '100%', background: 'currentColor', borderRadius: '2px' }} />
                        </div>
                        {event.confidence_score}%
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.statusBadge,
                        background: event.status === 'REPORTED' ? '#fff7ed' : '#f0fdf4',
                        color: event.status === 'REPORTED' ? '#c2410c' : '#15803d'
                      }}>
                        {event.status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b' }}>
                        <Clock size={12} /> {new Date(event.created_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {event.status === 'REPORTED' && (
                          <button onClick={() => updateStatus(event.id, 'IN_PROGRESS')} style={styles.actionBtn}>Mark In Progress</button>
                        )}
                        {event.status === 'IN_PROGRESS' && (
                          <button onClick={() => updateStatus(event.id, 'RESOLVED')} style={{ ...styles.actionBtn, background: '#22c55e', color: '#fff' }}>Mark Resolved</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  dashboard: { display: 'flex', minHeight: '100vh', background: '#f8fafc', color: '#1e293b', fontFamily: 'Inter, sans-serif' },
  sidebar: { width: '260px', background: '#0f172a', color: '#94a3b8', padding: '24px' },
  logoContainer: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' },
  logoText: { color: '#fff', fontSize: '16px', fontWeight: 800, letterSpacing: '1px' },
  nav: { display: 'flex', flexDirection: 'column', gap: '4px' },
  navItem: { padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 500, transition: 'all 0.2s' },
  main: { flex: 1, display: 'flex', flexDirection: 'column' },
  header: { height: '70px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px' },
  searchBar: { display: 'flex', alignItems: 'center', gap: '12px', background: '#f1f5f9', padding: '8px 16px', borderRadius: '8px', width: '400px' },
  searchInput: { background: 'none', border: 'none', fontSize: '14px', outline: 'none', width: '100%' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: 600 },
  avatar: { width: '32px', height: '32px', background: '#3b82f6', borderRadius: '8px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' },
  content: { padding: '32px', flex: 1, overflowY: 'auto' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' },
  statCard: { background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' },
  statLabel: { fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' },
  statValue: { fontSize: '32px', fontWeight: 800, color: '#0f172a' },
  tableContainer: { background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  tableHeaderRow: { background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  th: { padding: '16px 24px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' },
  td: { padding: '16px 24px', fontSize: '14px' },
  categoryBadge: { padding: '4px 8px', background: '#f1f5f9', borderRadius: '4px', fontSize: '11px', fontWeight: 600, color: '#475569' },
  statusBadge: { padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' },
  actionBtn: { padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }
};

export default App;
