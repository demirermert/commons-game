import React, { useState, useEffect } from 'react';

export function StudentView({
  sessionCode,
  currentRound,
  totalRounds,
  roundActive,
  timer,
  maxCatch,
  remainingFish,
  onSubmitFish,
  latestResult,
  history,
  hasSubmitted,
  countdown,
  pondId,
  pondPlayers,
  initialFish,
  gameComplete,
  pondPlayersResults
}) {
  const [fishCount, setFishCount] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setFishCount('');
    setError('');
  }, [currentRound]);

  const handleSubmit = event => {
    event.preventDefault();
    const numeric = Number(fishCount);
    if (!Number.isInteger(numeric) || numeric < 0) {
      setError('Enter a valid non-negative integer');
      return;
    }
    if (numeric > maxCatch) {
      setError(`You can catch at most ${maxCatch} fish`);
      return;
    }
    setError('');
    onSubmitFish(numeric);
  };

  // Calculate fish health for visual (based on 40 fish maximum - the cap)
  const maxFish = 40;
  const fishHealth = Math.min(100, Math.max(0, (remainingFish / maxFish) * 100));
  const bgColor = fishHealth > 66 ? '#d1fae5' : fishHealth > 33 ? '#fed7aa' : '#fecaca';
  const borderColor = fishHealth > 66 ? '#10b981' : fishHealth > 33 ? '#f59e0b' : '#ef4444';
  const textColor = fishHealth > 66 ? '#065f46' : fishHealth > 33 ? '#9a3412' : '#991b1b';

  return (
    <div className="card student-game-card">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ margin: '0 0 0.5rem 0', fontSize: 'clamp(1.25rem, 4vw, 1.5rem)' }}>Session {sessionCode}</h2>
          {currentRound > 0 && (
            <p style={{ margin: '0.25rem 0', fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>Round {currentRound} of {totalRounds}</p>
          )}
        </div>
      </header>

      {/* Pond Visualization */}
      {pondId && (
        <div className="student-pond-card" style={{ 
          padding: '1.5rem', 
          backgroundColor: bgColor,
          borderRadius: '16px',
          border: `3px solid ${borderColor}`,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          marginBottom: '1.5rem',
          transition: 'all 0.3s ease'
        }}>
          {/* Timer Display */}
          <div style={{
            textAlign: 'center',
            marginBottom: '1rem',
            padding: countdown ? '1rem' : '0.75rem',
            backgroundColor: countdown ? '#fef3c7' : gameComplete ? '#d1fae5' : 'rgba(255, 255, 255, 0.7)',
            borderRadius: '12px',
            border: countdown ? '2px solid #f59e0b' : gameComplete ? '2px solid #10b981' : '2px solid rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              fontSize: '1.75rem',
              fontWeight: 'bold',
              color: countdown ? '#f59e0b' : gameComplete ? '#059669' : '#1f2937'
            }}>
              {countdown 
                ? `Next Round: ${countdown.timeRemaining}s`
                : gameComplete
                  ? '🎉 Game Complete!'
                  : roundActive 
                    ? `${timer}s` 
                    : 'Calculating results...'}
            </div>
          </div>

          {/* Large Fish Count Display */}
          <div style={{ 
            textAlign: 'center', 
            padding: '1.5rem',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            borderRadius: '12px',
            marginBottom: '1rem'
          }}>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: textColor, lineHeight: 1 }}>
              {remainingFish}
            </div>
            <div style={{ fontSize: '0.875rem', color: textColor, marginTop: '0.25rem' }}>
              fish remaining
            </div>
          </div>
          
          {/* Visual Fish Health Bar */}
          <div style={{ marginBottom: '0' }}>
            <div style={{ 
              width: '100%', 
              height: '32px', 
              backgroundColor: 'rgba(255, 255, 255, 0.5)', 
              borderRadius: '12px', 
              overflow: 'hidden',
              border: '2px solid rgba(0, 0, 0, 0.1)',
              position: 'relative'
            }}>
              <div 
                style={{ 
                  width: `${fishHealth}%`, 
                  height: '100%', 
                  backgroundColor: borderColor,
                  transition: 'width 0.5s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  fontWeight: 'bold',
                  color: 'white'
                }}
              >
                {fishHealth > 0 && `${Math.round(fishHealth)}%`}
              </div>
            </div>
          </div>
        </div>
      )}

      {gameComplete && pondPlayersResults && pondPlayersResults.length > 0 && (
        <div style={{ 
          backgroundColor: '#dbeafe', 
          border: '3px solid #3b82f6', 
          borderRadius: '16px', 
          padding: '2rem', 
          marginBottom: '1.5rem',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#1e40af', fontSize: '2rem', margin: '0 0 1rem 0' }}>
            🎉 Game Ended!
          </h2>
          <h3 style={{ color: '#1e40af', fontSize: '1.25rem', marginBottom: '1rem' }}>
            Final Results - Your Pond
          </h3>
          <div style={{ 
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '1rem',
            marginTop: '1rem'
          }}>
            {pondPlayersResults.map((player, index) => (
              <div 
                key={index}
                style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem',
                  backgroundColor: index % 2 === 0 ? '#f9fafb' : 'white',
                  borderRadius: '8px',
                  marginBottom: index < pondPlayersResults.length - 1 ? '0.5rem' : 0,
                  fontWeight: index === 0 ? 'bold' : 'normal',
                  fontSize: index === 0 ? '1.1rem' : '1rem'
                }}
              >
                <span style={{ color: '#1f2937' }}>
                  {index === 0 ? '🥇 ' : index === 1 ? '🥈 ' : index === 2 ? '🥉 ' : ''}
                  {player.name}
                </span>
                <span style={{ color: '#059669', fontWeight: 'bold' }}>
                  {player.totalFish} fish
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentRound === 0 && !gameComplete ? (
        <div style={{ 
          backgroundColor: '#f0f9ff', 
          border: '2px solid #3b82f6', 
          borderRadius: '12px', 
          padding: '2rem',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ color: '#1e40af', fontSize: '1.75rem', marginTop: 0, textAlign: 'center' }}>
            🎮 How to Play: Tragedy of the Commons
          </h2>
          <div style={{ color: '#1f2937', fontSize: '1rem', lineHeight: '1.8' }}>
            <p><strong>Objective:</strong> Catch as many fish as possible from your shared pond.</p>
            
            <p><strong>The Rules:</strong></p>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>Each round, you can choose to catch 0 to {maxCatch} fish from your pond</li>
              <li>You share this pond with other players in your group</li>
              <li><strong>Fish allocation:</strong> If the total requested by all players is less than available fish, each player gets their requested amount proportionally. If total requested exceeds available fish, players get fish on a first-come basis until the pond is empty</li>
              <li>After everyone makes their decision, the remaining fish in the pond will <strong>double</strong> (up to a maximum of {initialFish + 20})</li>
              <li>If all the fish are caught, the pond is empty and cannot recover</li>
              <li><strong>At the end of the game</strong>, any remaining fish in the pond will be <strong>split equally</strong> among all players in that pond</li>
            </ul>
            
            <p><strong>Strategy:</strong></p>
            <p>Catching more fish now gives you immediate rewards, but leaving fish in the pond helps everyone in future rounds. The final split means leftover fish aren't wasted! Will you cooperate or compete?</p>
            
            <p style={{ 
              textAlign: 'center', 
              marginTop: '1.5rem',
              padding: '1rem',
              backgroundColor: '#dbeafe',
              borderRadius: '8px',
              fontWeight: 600,
              color: '#1e40af'
            }}>
              Waiting for instructor to start the game...
            </p>
          </div>
        </div>
      ) : !gameComplete ? (
        <>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ textAlign: 'center' }}>
              <label htmlFor="fish-input" style={{ fontSize: '1.5rem', fontWeight: 600, display: 'block', marginBottom: '1rem' }}>
                How many fish to catch?
              </label>
              <input
                id="fish-input"
                type="number"
                step="1"
                min="0"
                max={maxCatch}
                value={fishCount}
                onChange={event => setFishCount(event.target.value)}
                disabled={!roundActive || hasSubmitted}
                placeholder={`0 to ${maxCatch}`}
                style={{ 
                  width: '150px',
                  padding: '0.75rem',
                  fontSize: '1.25rem',
                  textAlign: 'center'
                }}
              />
              {error && <div style={{ color: '#dc2626', marginTop: '0.5rem' }}>{error}</div>}
            </div>
            <button className="primary" type="submit" disabled={!roundActive || hasSubmitted}>
              {hasSubmitted ? 'Submitted - Waiting for others...' : 'Submit decision'}
            </button>
          </form>

          {hasSubmitted && roundActive && (
            <div style={{ 
              backgroundColor: '#d1fae5', 
              border: '2px solid #059669', 
              borderRadius: '8px', 
              padding: '1rem', 
              marginTop: '1rem',
              textAlign: 'center'
            }}>
              <p style={{ color: '#059669', fontWeight: 600, fontSize: '1.1rem', margin: 0 }}>
                ✓ Your decision has been submitted!
              </p>
              <p style={{ color: '#047857', margin: '0.5rem 0 0 0' }}>
                Waiting for other players to submit their decisions...
              </p>
            </div>
          )}
        </>
      ) : null}

      {latestResult && latestResult.fishBeforeDoubling !== undefined && latestResult.fishAfterDoubling !== undefined && (
        <div style={{
          backgroundColor: '#dbeafe',
          border: '2px solid #3b82f6',
          borderRadius: '12px',
          padding: '1.5rem',
          marginTop: '1.5rem',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '1.1rem', color: '#1e40af', margin: '0 0 0.5rem 0', fontWeight: 600 }}>
            You caught: <strong>{latestResult.caught}</strong> fish
          </p>
          <p style={{ fontSize: '1.1rem', color: '#1e40af', margin: '0 0 0.5rem 0', fontWeight: 600 }}>
            🐟 Pond caught <strong>{latestResult.pondTotalCaught}</strong> fish total
          </p>
          <p style={{ fontSize: '1.1rem', color: '#1e40af', margin: '0 0 0.5rem 0', fontWeight: 600 }}>
            Remaining <strong>{latestResult.fishBeforeDoubling}</strong> fish doubled to <strong>{latestResult.fishAfterDoubling}</strong> fish!
          </p>
          <p style={{ fontSize: '1.1rem', color: '#1e40af', margin: 0, fontWeight: 600 }}>
            Your total fish: <strong>{latestResult.totalFish}</strong>
          </p>
        </div>
      )}

      {history && history.length > 0 && (
        <div style={{ marginTop: '1.5rem', marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
          <h3 style={{ textAlign: 'center', marginTop: 0, marginBottom: '1.5rem' }}>Round history</h3>
          <div className="history-list">
            <div className="history-item" style={{ fontWeight: 600 }}>
              <span>Round</span>
              <span>You Caught</span>
              <span>Total Caught</span>
              <span>Remaining</span>
            </div>
            {history.map(item => (
              <div className="history-item" key={item.round}>
                <span>{item.round}</span>
                <span>{item.caught}</span>
                <span>{item.pondTotalCaught !== undefined ? item.pondTotalCaught : '-'}</span>
                <span>{item.remainingFish !== undefined ? item.remainingFish : '-'}</span>
              </div>
            ))}
            <div className="history-item" style={{ 
              fontWeight: 700, 
              backgroundColor: '#e5e7eb', 
              borderTop: '3px solid #9ca3af',
              fontSize: '1.1rem',
              padding: '1rem 0.5rem'
            }}>
              <span>Total</span>
              <span>{history.reduce((sum, item) => sum + item.caught, 0)}</span>
              <span>{history.reduce((sum, item) => sum + (item.pondTotalCaught || 0), 0)}</span>
              <span style={{ fontStyle: 'italic', color: '#6b7280' }}>
                {history.length > 0 && history[history.length - 1].remainingFish !== undefined 
                  ? history[history.length - 1].remainingFish 
                  : '-'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

