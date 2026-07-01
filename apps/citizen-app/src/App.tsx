import React, { useState, useEffect } from 'react';
import { Camera, MapPin, Send, CheckCircle2, AlertCircle } from 'lucide-react';

type Category = 'POTHOLE' | 'GARBAGE' | 'WATER_LOGGING' | 'STREET_LIGHT_FAILURE' | 'OTHER';

const App: React.FC = () => {
  const [category, setCategory] = useState<Category>('POTHOLE');
  const [description, setDescription] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'SUBMITTING' | 'SUCCESS' | 'ERROR'>('IDLE');

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coords) {
      alert("Location access required to report city events.");
      return;
    }

    setStatus('SUBMITTING');
    try {
      const response = await fetch('http://localhost:3001/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: coords.lat,
          longitude: coords.lng,
          category,
          description,
          userId: 'citizen-web-alpha'
        })
      });

      if (response.ok) setStatus('SUCCESS');
      else setStatus('ERROR');
    } catch (err) {
      setStatus('ERROR');
    }
  };

  if (status === 'SUCCESS') {
    return (
      <div style={styles.container}>
        <div style={styles.successCard}>
          <CheckCircle2 size={64} color="#22c55e" />
          <h2 style={{ margin: '20px 0 10px' }}>Report Submitted!</h2>
          <p style={{ color: '#64748b', textAlign: 'center' }}>
            Your signal has been received and added to the City Intelligence Map.
          </p>
          <button onClick={() => setStatus('IDLE')} style={styles.button}>New Report</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>REPORT CITY ISSUE</h1>
        <p style={styles.subtitle}>Your report creates a public record</p>
      </header>

      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>Category</label>
        <div style={styles.categoryGrid}>
          {(['POTHOLE', 'GARBAGE', 'WATER_LOGGING', 'STREET_LIGHT_FAILURE', 'OTHER'] as Category[]).map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              style={{
                ...styles.categoryButton,
                borderColor: category === cat ? '#3b82f6' : '#e2e8f0',
                background: category === cat ? '#eff6ff' : '#fff'
              }}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>

        <label style={styles.label}>Evidence (Optional)</label>
        <div style={styles.mediaPlaceholder}>
          <Camera size={24} color="#94a3b8" />
          <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>Add Photo / Video</span>
        </div>

        <label style={styles.label}>Description</label>
        <textarea
          style={styles.textarea}
          placeholder="e.g., Large pothole near the bus stand..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div style={styles.locationBanner}>
          <MapPin size={16} color={coords ? "#22c55e" : "#f59e0b"} />
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            {coords ? `GPS Locked: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Acquiring GPS Signal..."}
          </span>
        </div>

        <button 
          type="submit" 
          disabled={status === 'SUBMITTING'}
          style={{
            ...styles.button,
            opacity: status === 'SUBMITTING' ? 0.7 : 1
          }}
        >
          {status === 'SUBMITTING' ? 'TRANSMITTING...' : 'SUBMIT REPORT'}
          <Send size={16} style={{ marginLeft: '8px' }} />
        </button>

        {status === 'ERROR' && (
          <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertCircle size={14} /> Submission failed. Please try again.
          </div>
        )}
      </form>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '500px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'system-ui, sans-serif',
    background: '#f8fafc',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column'
  },
  header: { marginBottom: '30px' },
  title: { fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0' },
  subtitle: { fontSize: '14px', color: '#64748b', margin: '4px 0 0' },
  form: { background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
  label: { display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px', marginTop: '20px' },
  categoryGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
  categoryButton: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s'
  },
  mediaPlaceholder: {
    height: '100px',
    border: '2px dashed #e2e8f0',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    background: '#f8fafc'
  },
  textarea: {
    width: '100%',
    height: '80px',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    boxSizing: 'border-box',
    fontSize: '14px'
  },
  locationBanner: {
    marginTop: '20px',
    padding: '12px',
    background: '#f8fafc',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  button: {
    marginTop: '25px',
    width: '100%',
    padding: '15px',
    borderRadius: '8px',
    background: '#0f172a',
    color: '#fff',
    border: 'none',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  successCard: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px'
  }
};

export default App;
