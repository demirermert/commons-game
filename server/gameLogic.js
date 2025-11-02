const DEFAULT_CONFIG = {
  rounds: 3,
  roundTime: 15,
  resultRevealTime: 5,
  countdownTime: 10, // Countdown between rounds
  initialFish: 20,
  maxFish: 40, // Maximum fish population (cap after doubling)
  maxCatchPerRound: 5,
  playersPerPond: 4  // Changed from playersPerGame to playersPerPond
};

const SESSION_CODE_LENGTH = 4;
const STATUS = {
  LOBBY: 'lobby',
  RUNNING: 'running',
  COMPLETE: 'complete'
};

function randomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < SESSION_CODE_LENGTH; i += 1) {
    result += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return result;
}

function deepMerge(target, source) {
  const output = { ...target };
  Object.keys(source || {}).forEach(key => {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      output[key] = deepMerge(target[key] || {}, source[key]);
    } else if (source[key] !== undefined) {
      output[key] = source[key];
    }
  });
  return output;
}

export function createGameManager(io) {
  const sessions = new Map();

  function createSession(instructorName, configOverrides) {
    if (!instructorName) {
      throw new Error('Instructor name required');
    }

    let code;
    do {
      code = randomCode();
    } while (sessions.has(code));

    const config = deepMerge(DEFAULT_CONFIG, configOverrides);
    const session = {
      code,
      config,
      instructorSocket: null,
      status: STATUS.LOBBY,
      currentRound: 0,
      players: new Map(),
      ponds: new Map(), // Each pond has its own fish population
      roundResults: [],
      submissions: new Map(),
      timers: {
        round: null,
        reveal: null,
        countdown: null
      }
    };

    sessions.set(code, session);
    console.log(`Session ${code} created by ${instructorName}`);
    return { code, config };
  }

  function broadcastSession(session) {
    const payload = {
      code: session.code,
      status: session.status,
      currentRound: session.currentRound,
      config: session.config,
      players: Array.from(session.players.values()).map(player => ({
        socketId: player.socketId,
        name: player.name,
        role: player.role,
        connected: player.connected,
        totalFish: player.totalFish,
        pondId: player.pondId || null,
        history: player.history || [] // Include history for instructor dashboard
      })),
      ponds: Array.from(session.ponds.entries()).map(([pondId, pond]) => ({
        id: pondId,
        remainingFish: pond.remainingFish,
        players: pond.playerIds
      })),
      roundResults: session.roundResults // Add round results for aggregate statistics
    };
    io.to(session.code).emit('sessionUpdate', payload);
  }

  function ensureSession(code) {
    const session = sessions.get(code);
    if (!session) throw new Error('Session not found');
    return session;
  }

  function ensureInstructor(socket, session) {
    if (session.instructorSocket !== socket.id) {
      throw new Error('Only instructor can perform this action');
    }
  }

  function registerPlayer(session, socket, { playerName, role }) {
    if (!playerName) {
      throw new Error('Name is required');
    }
    const player = {
      socketId: socket.id,
      sessionCode: session.code,
      name: playerName,
      role: role === 'instructor' ? 'instructor' : 'student',
      connected: true,
      totalFish: 0,
      history: [],
      pondId: null // Will be assigned when game starts
    };
    session.players.set(socket.id, player);
    socket.join(session.code);
    socket.data.sessionCode = session.code;
    socket.data.role = player.role;
    if (player.role === 'instructor') {
      session.instructorSocket = socket.id;
    }
  }

  function handleJoin(socket, { sessionCode, playerName, role }) {
    try {
      const code = sessionCode?.trim().toUpperCase();
      const session = ensureSession(code);
      registerPlayer(session, socket, { playerName, role });
      socket.emit('joinedSession', {
        code,
        role: socket.data.role,
        status: session.status,
        config: session.config,
        currentRound: session.currentRound
      });
      broadcastSession(session);
      console.log(`${playerName} joined session ${code}`);
    } catch (err) {
      socket.emit('errorMessage', err.message);
    }
  }

  function createPonds(session) {
    const students = Array.from(session.players.values()).filter(p => p.role === 'student' && !p.isAI);
    const playersPerPond = session.config.playersPerPond;
    
    // Calculate how many ponds we need
    const totalPlayers = students.length;
    const remainder = totalPlayers % playersPerPond;
    const neededAI = remainder === 0 ? 0 : (playersPerPond - remainder);
    
    // Add AI players if needed
    if (neededAI > 0) {
      for (let i = 1; i <= neededAI; i++) {
        const aiId = `ai-${Date.now()}-${i}`;
        const aiPlayer = {
          socketId: aiId,
          sessionCode: session.code,
          name: `AI Player ${i}`,
          role: 'student',
          connected: true,
          totalFish: 0,
          history: [],
          isAI: true,
          pondId: null
        };
        session.players.set(aiId, aiPlayer);
        students.push(aiPlayer);
      }
      console.log(`Added ${neededAI} AI player(s) to session ${session.code}`);
    }
    
    // Shuffle students for random pond assignment
    const shuffled = [...students].sort(() => Math.random() - 0.5);
    
    // Create ponds and assign players
    const numPonds = Math.ceil(shuffled.length / playersPerPond);
    session.ponds.clear();
    
    for (let i = 0; i < numPonds; i++) {
      const pondId = `Pond ${i + 1}`;
      const pondPlayers = shuffled.slice(i * playersPerPond, (i + 1) * playersPerPond);
      
      session.ponds.set(pondId, {
        id: pondId,
        remainingFish: session.config.initialFish,
        playerIds: pondPlayers.map(p => p.socketId)
      });
      
      // Assign pond to players
      pondPlayers.forEach(player => {
        player.pondId = pondId;
      });
      
      console.log(`${pondId} created with ${pondPlayers.length} players: ${pondPlayers.map(p => p.name).join(', ')}`);
    }
  }

  function handleStartSession(socket, sessionCode) {
    try {
      const session = ensureSession(sessionCode);
      ensureInstructor(socket, session);
      if (session.status !== STATUS.LOBBY) {
        throw new Error('Session already started');
      }
      const students = Array.from(session.players.values()).filter(p => p.role === 'student');
      
      if (students.length === 0) {
        throw new Error('Need at least 1 student to start');
      }
      
      // Create ponds and assign players
      createPonds(session);
      
      session.status = STATUS.RUNNING;
      session.currentRound = 0;
      broadcastSession(session);
      startNextRound(session);
    } catch (err) {
      socket.emit('errorMessage', err.message);
    }
  }

  function startNextRound(session) {
    clearTimers(session);
    
    // Reset the finalization flag for the new round
    session.isFinalizingRound = false;
    
    if (session.currentRound >= session.config.rounds) {
      finalizeSession(session);
      return;
    }
    session.currentRound += 1;
    session.submissions.clear();
    
    // Broadcast round start to all players with their pond info
    session.players.forEach(player => {
      if (player.role === 'student') {
        const pond = session.ponds.get(player.pondId);
        io.to(player.socketId).emit('roundStarted', {
          round: session.currentRound,
          roundTime: session.config.roundTime,
          remainingFish: pond?.remainingFish || 0,
          pondId: player.pondId
        });
      }
    });
    
    broadcastSession(session);
    
    // Submit decisions for AI players after a short delay
    const students = Array.from(session.players.values()).filter(p => p.role === 'student');
    students.forEach(student => {
      if (student.isAI) {
        const delay = Math.random() * 2000 + 1000;
        setTimeout(() => {
          if (session.currentRound > 0 && !session.submissions.has(student.socketId)) {
            const randomFish = Math.floor(Math.random() * (session.config.maxCatchPerRound + 1));
            recordSubmission(session, student.socketId, randomFish, false);
            console.log(`AI ${student.name} (${student.pondId}) submitted ${randomFish} fish`);
            concludeRoundIfReady(session);
          }
        }, delay);
      }
    });
    
    session.timers.round = setTimeout(() => {
      forceSubmitMissing(session);
    }, session.config.roundTime * 1000);
  }

  function forceSubmitMissing(session) {
    const students = Array.from(session.players.values()).filter(p => p.role === 'student');
    students.forEach(student => {
      if (!session.submissions.has(student.socketId)) {
        recordSubmission(session, student.socketId, 0, true);
      }
    });
    // Timer expired, finalize the round
    finalizeRound(session);
  }

  function handleFishSubmission(socket, { sessionCode, fishCount }) {
    try {
      const session = ensureSession(sessionCode);
      if (session.status !== STATUS.RUNNING) {
        throw new Error('Session not running');
      }
      const player = session.players.get(socket.id);
      if (!player || player.role !== 'student') {
        throw new Error('Only active students can submit');
      }
      const numericFish = Number(fishCount);
      if (!Number.isInteger(numericFish) || numericFish < 0) {
        throw new Error('Fish count must be a non-negative integer');
      }
      if (numericFish > session.config.maxCatchPerRound) {
        throw new Error(`Cannot catch more than ${session.config.maxCatchPerRound} fish`);
      }
      recordSubmission(session, socket.id, numericFish, false);
      concludeRoundIfReady(session);
    } catch (err) {
      socket.emit('errorMessage', err.message);
    }
  }

  function recordSubmission(session, socketId, fishCount, forced) {
    const player = session.players.get(socketId);
    if (!player) return;
    session.submissions.set(socketId, { fishCount, forced });
  }

  function concludeRoundIfReady(session) {
    const students = Array.from(session.players.values()).filter(p => p.role === 'student');
    const allSubmitted = students.every(student => session.submissions.has(student.socketId));
    if (!allSubmitted) return;
    // All submitted, but don't clear timer - wait for full time to expire
    console.log(`All students submitted for round ${session.currentRound}, waiting for timer to expire...`);
  }

  function finalizeRound(session) {
    // Guard against multiple calls
    if (session.isFinalizingRound) {
      console.log(`⚠️  Already finalizing round ${session.currentRound}, skipping duplicate call`);
      return;
    }
    session.isFinalizingRound = true;
    
    const roundNumber = session.currentRound;
    const roundResults = [];
    
    // Process each pond separately
    session.ponds.forEach((pond, pondId) => {
      const pondPlayers = pond.playerIds.map(id => session.players.get(id)).filter(p => p);
      
      // Calculate total requested
      let totalRequested = 0;
      pondPlayers.forEach(player => {
        const submission = session.submissions.get(player.socketId);
        if (submission) {
          totalRequested += submission.fishCount;
        }
      });

      // Calculate total caught and individual allocations
      let totalCaught = 0;
      const allocations = [];
      
      if (totalRequested <= pond.remainingFish) {
        // If total requested is less than or equal to available, allocate proportionally
        pondPlayers.forEach(player => {
          const submission = session.submissions.get(player.socketId);
          const requested = submission ? submission.fishCount : 0;
          // Proportional allocation: (requested / totalRequested) * availableFish
          const proportionalCatch = totalRequested > 0 
            ? Math.round((requested / totalRequested) * Math.min(totalRequested, pond.remainingFish))
            : 0;
          allocations.push({ player, requested, caught: proportionalCatch });
          totalCaught += proportionalCatch;
        });
      } else {
        // If total requested exceeds available, allocate sequentially (original logic)
        let caughtSoFar = 0;
        pondPlayers.forEach(player => {
          const submission = session.submissions.get(player.socketId);
          const requested = submission ? submission.fishCount : 0;
          const actualCatch = Math.min(requested, Math.max(0, pond.remainingFish - caughtSoFar));
          allocations.push({ player, requested, caught: actualCatch });
          caughtSoFar += actualCatch;
        });
        totalCaught = caughtSoFar;
      }

      // Update each player's results in this pond
      allocations.forEach(({ player, requested, caught }) => {
        player.totalFish += caught;
        
        const playerResult = {
          round: roundNumber,
          requested: requested,
          caught: caught,
          totalFish: player.totalFish,
          name: player.name,
          pondId: pondId,
          pondTotalCaught: totalCaught
        };
        
        player.history.push(playerResult);
        roundResults.push({
          socketId: player.socketId,
          ...playerResult
        });

        // Send individual result to student
        io.to(player.socketId).emit('roundResults', {
          round: roundNumber,
          requested: requested,
          caught: caught,
          totalFish: player.totalFish,
          history: player.history,
          pondId: pondId,
          pondTotalCaught: totalCaught
        });
      });

      // Update pond's remaining fish and double them (capped at maxFish)
      pond.remainingFish = Math.max(0, pond.remainingFish - totalCaught);
      const fishBeforeDoubling = pond.remainingFish;
      const maxFish = session.config.maxFish || 40; // Fallback to 40 if not set
      pond.remainingFish = Math.min(pond.remainingFish * 2, maxFish);
      const fishAfterDoubling = pond.remainingFish;
      
      // Update history with remaining fish after doubling AND send updated results to students
      pondPlayers.forEach(player => {
        if (player.history.length > 0) {
          player.history[player.history.length - 1].remainingFish = fishAfterDoubling;
          player.history[player.history.length - 1].fishBeforeDoubling = fishBeforeDoubling;
          player.history[player.history.length - 1].fishAfterDoubling = fishAfterDoubling;
          
          // Re-emit roundResults with the doubling information
          io.to(player.socketId).emit('roundResults', {
            round: roundNumber,
            requested: player.history[player.history.length - 1].requested,
            caught: player.history[player.history.length - 1].caught,
            totalFish: player.totalFish,
            history: player.history,
            pondId: pondId,
            pondTotalCaught: totalCaught,
            fishBeforeDoubling: fishBeforeDoubling,
            fishAfterDoubling: fishAfterDoubling
          });
        }
      });
      
      console.log(`${pondId} Round ${roundNumber}: Caught ${totalCaught}, Before doubling: ${fishBeforeDoubling}, After: ${fishAfterDoubling} (capped at ${maxFish})`);
    });

    session.roundResults.push({ 
      round: roundNumber, 
      results: roundResults
    });

    // Broadcast round summary
    io.to(session.code).emit('roundSummary', {
      round: roundNumber,
      results: roundResults
    });

    broadcastSession(session);
    
    // Check if this was the last round
    if (session.currentRound >= session.config.rounds) {
      // Show results for resultRevealTime, then finalize immediately (no countdown)
      session.timers.reveal = setTimeout(() => {
        finalizeSession(session);
      }, session.config.resultRevealTime * 1000);
    } else {
      // Show results for resultRevealTime, then start countdown to next round
      session.timers.reveal = setTimeout(() => {
        startCountdown(session);
      }, session.config.resultRevealTime * 1000);
    }
  }

  function startCountdown(session) {
    const countdownTime = session.config.countdownTime;
    let timeRemaining = countdownTime;
    
    // Clear any existing countdown interval
    if (session.timers.countdownInterval) {
      clearInterval(session.timers.countdownInterval);
    }
    
    // Emit initial countdown
    io.to(session.code).emit('roundCountdown', {
      timeRemaining,
      nextRound: session.currentRound + 1
    });
    
    // Update countdown every second
    session.timers.countdownInterval = setInterval(() => {
      timeRemaining -= 1;
      
      if (timeRemaining > 0) {
        io.to(session.code).emit('roundCountdown', {
          timeRemaining,
          nextRound: session.currentRound + 1
        });
      } else {
        clearInterval(session.timers.countdownInterval);
        session.timers.countdownInterval = null;
      }
    }, 1000);
    
    // Start next round after countdown completes
    session.timers.countdown = setTimeout(() => {
      if (session.timers.countdownInterval) {
        clearInterval(session.timers.countdownInterval);
        session.timers.countdownInterval = null;
      }
      startNextRound(session);
    }, countdownTime * 1000);
  }

  function finalizeSession(session) {
    clearTimers(session);
    session.status = STATUS.COMPLETE;
    
    // Split remaining fish among players in each pond (but keep pond.remainingFish for display)
    session.ponds.forEach((pond, pondId) => {
      const pondPlayers = pond.playerIds.map(id => session.players.get(id)).filter(p => p && p.role === 'student');
      
      if (pondPlayers.length > 0 && pond.remainingFish > 0) {
        const fishPerPlayer = pond.remainingFish / pondPlayers.length;
        const fishToDistribute = pond.remainingFish; // Store for logging
        
        pondPlayers.forEach(player => {
          player.totalFish += fishPerPlayer;
          console.log(`${pondId} - Final split: ${player.name} receives ${fishPerPlayer.toFixed(2)} fish (${fishToDistribute} fish ÷ ${pondPlayers.length} players)`);
        });
        
        console.log(`${pondId} - Remaining ${fishToDistribute} fish split among ${pondPlayers.length} players`);
        // Note: We keep pond.remainingFish unchanged for display purposes on the dashboard
      }
    });
    
    io.to(session.code).emit('sessionComplete', {
      rounds: session.roundResults
    });
    broadcastSession(session);
  }

  function clearTimers(session) {
    if (session.timers.round) {
      clearTimeout(session.timers.round);
    }
    if (session.timers.reveal) {
      clearTimeout(session.timers.reveal);
    }
    if (session.timers.countdown) {
      clearTimeout(session.timers.countdown);
    }
    if (session.timers.countdownInterval) {
      clearInterval(session.timers.countdownInterval);
    }
    session.timers.round = null;
    session.timers.reveal = null;
    session.timers.countdown = null;
    session.timers.countdownInterval = null;
  }

  function handleDisconnect(socketId) {
    sessions.forEach(session => {
      const player = session.players.get(socketId);
      if (!player) return;
      player.connected = false;
      broadcastSession(session);
      if (session.instructorSocket === socketId) {
        console.log(`Instructor disconnected from session ${session.code}`);
      }
    });
  }

  return {
    createSession,
    handleJoin,
    handleStartSession,
    handleFishSubmission,
    handleDisconnect
  };
}
