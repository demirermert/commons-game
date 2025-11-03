import React, { useEffect, useState } from 'react';
import { socket } from '../socket.js';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function ResultsPage() {
  const [session, setSession] = useState(null);
  const [sessionCode, setSessionCode] = useState('');
  const [sessionCodeInput, setSessionCodeInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleJoinedSession = payload => {
      console.log('✅ Joined session as observer:', payload);
      setSessionCode(payload.code);
      setIsLoading(true); // Wait for sessionUpdate to arrive
    };

    const handleSessionUpdate = payload => {
      console.log('📊 Session update received:', payload);
      setSession(payload);
      setIsLoading(false);
    };

    const handleError = message => {
      setErrorMessage(message);
    };

    socket.on('joinedSession', handleJoinedSession);
    socket.on('sessionUpdate', handleSessionUpdate);
    socket.on('errorMessage', handleError);

    return () => {
      socket.off('joinedSession', handleJoinedSession);
      socket.off('sessionUpdate', handleSessionUpdate);
      socket.off('errorMessage', handleError);
    };
  }, []);

  const handleJoinSession = event => {
    event.preventDefault();
    setErrorMessage('');
    if (!sessionCodeInput.trim()) {
      setErrorMessage('Please enter a session code');
      return;
    }
    
    // Check if socket is connected
    if (!socket.connected) {
      setErrorMessage('Not connected to server. Please refresh the page and try again.');
      console.error('❌ Cannot join: Socket not connected');
      return;
    }

    console.log('🔌 Emitting joinSession as observer:', sessionCodeInput.toUpperCase());
    socket.emit('joinSession', {
      sessionCode: sessionCodeInput.toUpperCase(),
      playerName: 'Results Viewer',
      role: 'observer'
    });
  };

  if (isLoading) {
    return (
      <div className="app-shell">
        <div className="card">
          <h1 style={{ textAlign: 'center' }}>📊 Loading Results...</h1>
          <p style={{ textAlign: 'center', color: '#6b7280' }}>
            Connecting to session {sessionCode}...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="app-shell">
        <div className="card">
          <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>
            📊 Commons Game - Results Display
          </h1>
          <form onSubmit={handleJoinSession} style={{ display: 'grid', gap: '1rem' }}>
            <div className="input-row">
              <label htmlFor="session-code">Session Code</label>
              <input
                id="session-code"
                type="text"
                value={sessionCodeInput}
                onChange={event => setSessionCodeInput(event.target.value.toUpperCase())}
                placeholder="Enter session code"
                required
              />
            </div>
            <button type="submit" className="primary">
              View Results
            </button>
          </form>
          {errorMessage && (
            <div style={{ 
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#fee2e2',
              border: '2px solid #dc2626',
              borderRadius: '8px',
              color: '#991b1b'
            }}>
              {errorMessage}
            </div>
          )}
        </div>
      </div>
    );
  }

  const students = session.players?.filter(p => p.role === 'student') || [];
  const ponds = session.ponds || [];

  // Prepare leaderboard data
  const leaderboard = students
    .map(student => ({
      name: student.name,
      totalFish: student.totalFish || 0
    }))
    .sort((a, b) => b.totalFish - a.totalFish);

  return (
    <div className="app-shell">
      <div className="card">
        <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1>📊 Commons Game Results</h1>
          <p style={{ fontSize: '1.2rem', color: '#6b7280' }}>
            Session: <strong>{sessionCode}</strong>
          </p>
          <div style={{ marginTop: '1rem' }}>
            <span className="status-tag">{session.status?.toUpperCase() || 'LOBBY'}</span>
            {session.status === 'running' && (
              <span style={{ marginLeft: '1rem', color: '#059669', fontWeight: 600 }}>
                Round {session.currentRound} of {session.config?.rounds || 0}
              </span>
            )}
          </div>
        </header>

        {/* Ponds Section */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>🐟 Ponds</h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.5rem'
          }}>
            {ponds.map((pond, index) => {
              const fishHealth = Math.min(100, Math.max(0, (pond.remainingFish / 40) * 100));
              const bgColor = fishHealth > 66 ? '#d1fae5' : fishHealth > 33 ? '#fed7aa' : '#fecaca';
              const borderColor = fishHealth > 66 ? '#10b981' : fishHealth > 33 ? '#f59e0b' : '#ef4444';
              const textColor = fishHealth > 66 ? '#065f46' : fishHealth > 33 ? '#9a3412' : '#991b1b';

              return (
                <div
                  key={pond.id}
                  style={{
                    padding: '1.5rem',
                    backgroundColor: bgColor,
                    border: `3px solid ${borderColor}`,
                    borderRadius: '12px',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: textColor, marginBottom: '0.5rem' }}>
                    Pond {index + 1}
                  </div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: textColor }}>
                    {pond.remainingFish}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: textColor }}>
                    fish remaining
                  </div>
                  <div style={{ fontSize: '0.875rem', color: textColor, marginTop: '0.5rem' }}>
                    {pond.players?.length || 0} players
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Leaderboard Section */}
        <section>
          <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>🏆 Leaderboard</h2>
          {leaderboard.length > 0 ? (
            <div style={{ marginBottom: '2rem' }}>
              <ResponsiveContainer width="100%" height={Math.max(300, leaderboard.length * 40)}>
                <BarChart data={leaderboard} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="totalFish" fill="#10b981" name="Total Fish" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: '#6b7280' }}>
              No players yet. Waiting for game to start...
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

