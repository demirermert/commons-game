import React, { useEffect, useState } from 'react';
import { socket } from '../socket.js';
import { StudentView } from '../components/StudentView.jsx';

const RANDOM_NAMES = [
  'Fisher', 'Captain', 'Sailor', 'Navigator', 'Angler', 'Skipper',
  'Mariner', 'Voyager', 'Explorer', 'Hunter', 'Seeker', 'Tracker',
  'Ranger', 'Scout', 'Pathfinder', 'Pioneer', 'Adventurer', 'Wanderer'
];

function generateRandomName() {
  const name = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
  const number = Math.floor(Math.random() * 100);
  return `${name}${number}`;
}

export function StudentPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [sessionCodeInput, setSessionCodeInput] = useState('');
  const [session, setSession] = useState(null);
  const [joinInfo, setJoinInfo] = useState(null);
  const [roundInfo, setRoundInfo] = useState(null);
  const [timer, setTimer] = useState(0);
  const [roundActive, setRoundActive] = useState(false);
  const [latestResult, setLatestResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(null);
  const [gameComplete, setGameComplete] = useState(false);

  // Handle URL parameters for student persistence
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const playerName = params.get('name');
    
    if (code) {
      setSessionCodeInput(code);
      
      // Auto-join the session
      socket.emit('joinSession', {
        sessionCode: code,
        playerName: playerName || generateRandomName(),
        role: 'student'
      });
    }
  }, []);

  useEffect(() => {
    const handleJoinedSession = payload => {
      setJoinInfo(payload);
      setRoundInfo(null);
      setHistory([]);
      setLatestResult(null);
      setErrorMessage('');
    };
    const handleSessionUpdate = payload => {
      setSession(payload);
    };
    const handleRoundStarted = payload => {
      setRoundInfo(payload);
      setRoundActive(true);
      setHasSubmitted(false);
      setTimer(payload.roundTime);
      setCountdown(null); // Clear countdown when round starts
    };
    const handleRoundResults = payload => {
      setLatestResult(payload);
      setHistory(payload.history || []);
      setHasSubmitted(true);
      setRoundActive(false);
    };
    const handleRoundCountdown = payload => {
      setCountdown(payload);
    };
    const handleSessionComplete = payload => {
      setRoundActive(false);
      setCountdown(null); // Clear countdown when session ends
      setGameComplete(true);
    };
    const handleError = message => {
      setErrorMessage(message);
    };

    socket.on('joinedSession', handleJoinedSession);
    socket.on('sessionUpdate', handleSessionUpdate);
    socket.on('roundStarted', handleRoundStarted);
    socket.on('roundResults', handleRoundResults);
    socket.on('roundCountdown', handleRoundCountdown);
    socket.on('sessionComplete', handleSessionComplete);
    socket.on('errorMessage', handleError);

    return () => {
      socket.off('joinedSession', handleJoinedSession);
      socket.off('sessionUpdate', handleSessionUpdate);
      socket.off('roundStarted', handleRoundStarted);
      socket.off('roundResults', handleRoundResults);
      socket.off('roundCountdown', handleRoundCountdown);
      socket.off('sessionComplete', handleSessionComplete);
      socket.off('errorMessage', handleError);
    };
  }, []);

  useEffect(() => {
    if (!roundActive) return;
    const interval = setInterval(() => {
      setTimer(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [roundActive, roundInfo?.round]);

  const handleJoinSession = event => {
    event.preventDefault();
    setErrorMessage('');
    if (!sessionCodeInput) {
      setErrorMessage('Enter a code');
      return;
    }
    // If names are not provided, generate a random name
    let playerName;
    if (!firstName.trim() || !lastName.trim()) {
      playerName = generateRandomName();
    } else {
      playerName = `${firstName.trim()} ${lastName.trim()}`;
    }
    
    // Update URL for students to persist their session on refresh
    const url = new URL(window.location.href);
    url.searchParams.set('code', sessionCodeInput);
    url.searchParams.set('name', playerName);
    window.history.replaceState({}, '', url.toString());
    
    socket.emit('joinSession', {
      sessionCode: sessionCodeInput,
      playerName: playerName,
      role: 'student'
    });
  };

  const handleSubmitFish = fishCount => {
    if (!session?.code) return;
    socket.emit('submitFish', { sessionCode: session.code, fishCount });
    setHasSubmitted(true); // Immediately show feedback
  };

  if (!joinInfo) {
    return (
      <div className="app-shell">
        <div className="card" style={{ position: 'relative' }}>
          {/* Left Logo - Top Left Corner */}
          <img 
            src="/course-logo.png" 
            alt="Course Logo"
            style={{ 
              position: 'absolute',
              top: '0.5rem',
              left: '0.5rem',
              width: '140px',
              height: 'auto',
              opacity: 0.9
            }}
          />
          
          {/* MIT Sloan Logo - Top Right Corner */}
          <img 
            src="/sloan-logo.png" 
            alt="MIT Sloan School of Management"
            style={{ 
              position: 'absolute',
              top: '1.5rem',
              right: '0.5rem',
              width: '140px',
              height: 'auto',
              opacity: 0.9
            }}
          />

          {/* Header */}
          <div style={{ 
            textAlign: 'center',
            marginTop: '4rem',
            marginBottom: '2rem',
            paddingBottom: '1.5rem',
            borderBottom: '2px solid #e5e7eb'
          }}>
            <h1 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 700,
              color: '#1f2937',
              marginBottom: '0.5rem',
              marginTop: 0
            }}>
              Welcome to 15.010 Commons Game
            </h1>
            <p style={{ 
              fontSize: '1rem',
              color: '#6b7280',
              margin: 0
            }}>
              Economic Analysis of Business Decisions
            </p>
          </div>

          <form onSubmit={handleJoinSession} style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div className="input-row">
                <label htmlFor="first-name">First name</label>
                <input
                  id="first-name"
                  type="text"
                  value={firstName}
                  onChange={event => setFirstName(event.target.value)}
                />
              </div>
              <div className="input-row">
                <label htmlFor="last-name">Last name</label>
                <input
                  id="last-name"
                  type="text"
                  value={lastName}
                  onChange={event => setLastName(event.target.value)}
                />
              </div>
            </div>
            <div className="input-row">
              <label htmlFor="session-code">Session code</label>
              <input
                id="session-code"
                type="text"
                value={sessionCodeInput}
                onChange={event => setSessionCodeInput(event.target.value.toUpperCase())}
                required
              />
            </div>
            <button type="submit" className="primary">
              Join session
            </button>
          </form>
          {errorMessage && <p style={{ color: '#dc2626' }}>{errorMessage}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <StudentView
        sessionCode={session?.code || joinInfo.code}
        currentRound={roundInfo?.round || session?.currentRound || 0}
        totalRounds={session?.config?.rounds || 5}
        roundActive={roundActive}
        timer={timer}
        maxCatch={session?.config?.maxCatchPerRound || 5}
        remainingFish={(() => {
          // Get the current pond for this player
          const myPondId = roundInfo?.pondId || latestResult?.pondId;
          const myPond = session?.ponds?.find(p => p.id === myPondId);
          // Use pond's current remainingFish from session (which is always up-to-date)
          return myPond?.remainingFish || roundInfo?.remainingFish || 0;
        })()}
        onSubmitFish={handleSubmitFish}
        latestResult={latestResult}
        history={history}
        hasSubmitted={hasSubmitted}
        countdown={countdown}
        pondId={roundInfo?.pondId || latestResult?.pondId}
        pondPlayers={
          roundInfo?.pondId || latestResult?.pondId
            ? session?.ponds?.find(p => p.id === (roundInfo?.pondId || latestResult?.pondId))?.players
                ?.map(playerId => session?.players?.find(player => player.socketId === playerId)?.name || playerId)
            : []
        }
        initialFish={session?.config?.initialFish || 20}
        gameComplete={gameComplete}
        pondPlayersResults={
          gameComplete && (roundInfo?.pondId || latestResult?.pondId)
            ? session?.ponds?.find(p => p.id === (roundInfo?.pondId || latestResult?.pondId))?.players
                ?.map(playerId => {
                  const player = session?.players?.find(player => player.socketId === playerId);
                  return {
                    name: player?.name || playerId,
                    totalFish: player?.totalFish || 0
                  };
                })
                ?.sort((a, b) => b.totalFish - a.totalFish)
            : []
        }
      />
    </div>
  );
}


