import {
  db,
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment
} from './firebase-config.js';

// ===== DATA LAYER (Firestore) =====
let localDB = {
  teams: [],
  users: [],
  rounds: [],
  currentRound: null,
  roundCount: 0,
  investments: [],
  settings: {
    tokensPerRound: 100,
    minPrice: 30,
    maxPrice: 100,
    maxInvestmentsPerRound: 3,
  },
  adminLog: [],
};

// Initialize listeners to keep localDB in sync
function initDataSync() {
  onSnapshot(collection(db, 'teams'), (snapshot) => {
    localDB.teams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    updateUI();
  }, (err) => console.error("Teams sync error:", err));

  onSnapshot(collection(db, 'users'), (snapshot) => {
    localDB.users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    updateUI();
  }, (err) => console.error("Users sync error:", err));

  onSnapshot(collection(db, 'rounds'), (snapshot) => {
    localDB.rounds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const active = localDB.rounds.find(r => r.status === 'live');
    localDB.currentRound = active || (localDB.rounds.length > 0 ? localDB.rounds[localDB.rounds.length - 1] : null);
    localDB.roundCount = localDB.rounds.length;
    updateUI();
  }, (err) => console.error("Rounds sync error:", err));

  onSnapshot(collection(db, 'investments'), (snapshot) => {
    localDB.investments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    updateUI();
  }, (err) => console.error("Investments sync error:", err));

  onSnapshot(doc(db, 'settings', 'global'), (doc) => {
    if (doc.exists()) {
      localDB.settings = doc.data();
    } else {
      setDoc(doc.ref, localDB.settings).catch(e => console.error("Error setting initial settings:", e));
    }
    updateUI();
  }, (err) => console.error("Settings sync error:", err));
}

function updateUI() {
  if (typeof window.updateLandingStats === 'function') {
    window.updateLandingStats();
  }

  // Real-time Dashboard Updates
  // If User is logged in, refresh their view
  if (typeof window.getAuthUser === 'function' && window.getAuthUser()) {
    if (typeof window.renderAudienceDashboard === 'function') {
      window.renderAudienceDashboard(window.getAuthUser());
    }
  }

  // If Team is logged in, refresh their view
  if (typeof window.getAuthTeam === 'function' && window.getAuthTeam()) {
    if (typeof window.renderTeamDashboard === 'function') {
      const team = localDB.teams.find(t => t.id === window.getAuthTeam().id);
      if (team) window.renderTeamDashboard(team);
    }
  }

  // If Admin is logged in, refresh their view
  if (typeof window.getIsAdmin === 'function' && window.getIsAdmin()) {
    if (typeof window.renderAdminDashboard === 'function') {
      window.renderAdminDashboard();
    }
  }
}


// Data Sync will be initialized at the bottom of the file after exports

function getDB() {
  return localDB;
}

// For compatibility with existing code
async function saveDB(data) {
  // In Firestore, we don't save the whole DB. 
  // We'll update the specific parts in the operation functions.
  console.log('saveDB called - refactoring to granular writes');
}

function resetDB() {
  // This would be destructive in Firestore, maybe skip for now or just clear collections
  console.warn('resetDB called - destructive operation skipped');
}

// ===== TEAM OPERATIONS =====
function getTeams() {
  return localDB.teams;
}

function getTeamById(id) {
  return localDB.teams.find(t => t.id === id);
}

async function createTeam(name, username, password, emoji = '🚀') {
  const team = {
    name,
    username,
    password,
    emoji,
    description: '',
    tagline: '',
    links: [],
    members: [],
    basePrice: 50,
    totalRevenue: 0,
    currentTokens: 0,
    investorCount: 0,
    uniqueInvestors: [],
    revenueHistory: [],
    createdAt: Date.now(),
    mergedWith: null,
    isActive: true,
  };
  const docRef = await addDoc(collection(db, 'teams'), team);
  return { id: docRef.id, ...team };
}

async function updateTeam(id, updates) {
  const teamRef = doc(db, 'teams', id);
  await updateDoc(teamRef, updates);
  return { id, ...updates };
}

async function deleteTeam(id) {
  await deleteDoc(doc(db, 'teams', id));
}

async function mergeTeams(teamId1, teamId2) {
  const t1 = getTeamById(teamId1);
  const t2 = getTeamById(teamId2);
  if (!t1 || !t2) return null;

  await updateDoc(doc(db, 'teams', teamId1), {
    currentTokens: increment(t2.currentTokens),
    totalRevenue: increment(t2.totalRevenue),
    uniqueInvestors: [...new Set([...t1.uniqueInvestors, ...t2.uniqueInvestors])],
    investorCount: [...new Set([...t1.uniqueInvestors, ...t2.uniqueInvestors])].length,
    name: t1.name + ' × ' + t2.name
  });

  await updateDoc(doc(db, 'teams', teamId2), {
    isActive: false,
    mergedWith: teamId1
  });

  return getTeamById(teamId1);
}

async function adjustTeamTokens(teamId, amount, type = 'add') {
  const teamRef = doc(db, 'teams', teamId);
  if (type === 'add') {
    await updateDoc(teamRef, {
      currentTokens: increment(amount),
      totalRevenue: increment(amount)
    });
  } else {
    // Note: increment with negative value. Max(0) needs to be handled carefully if needed.
    await updateDoc(teamRef, {
      currentTokens: increment(-amount)
    });
  }
}

// ===== USER OPERATIONS =====
function getUsers() {
  return localDB.users;
}

function getUserById(id) {
  return localDB.users.find(u => u.id === id);
}

function getUserByHallTicket(hallTicket) {
  return localDB.users.find(u => u.hallTicket === hallTicket);
}

async function createUser(hallTicket, password, name, college, section) {
  if (localDB.users.find(u => u.hallTicket === hallTicket)) {
    return { error: 'Hall ticket already registered' };
  }
  const user = {
    hallTicket,
    password,
    name,
    college,
    section,
    tokens: 0,
    totalTokensReceived: 0,
    investments: [],
    roundsParticipated: [],
    createdAt: Date.now(),
    isActive: true,
  };
  const docRef = await addDoc(collection(db, 'users'), user);
  return { id: docRef.id, ...user };
}

async function updateUser(id, updates) {
  const userRef = doc(db, 'users', id);
  await updateDoc(userRef, updates);
}

// ===== ROUND OPERATIONS =====
function getCurrentRound() {
  return localDB.currentRound;
}

async function startRound() {
  const number = localDB.roundCount + 1;
  const round = {
    number,
    status: 'live',
    startedAt: Date.now(),
    endedAt: null,
  };

  const docRef = await addDoc(collection(db, 'rounds'), round);

  // Give tokens to all users for this round
  // Batch updates would be better here, but for now simple loop
  const userPromises = localDB.users.map(user =>
    updateDoc(doc(db, 'users', user.id), {
      tokens: increment(localDB.settings.tokensPerRound),
      totalTokensReceived: increment(localDB.settings.tokensPerRound)
    })
  );
  await Promise.all(userPromises);

  return { id: docRef.id, ...round };
}

async function endRound() {
  if (!localDB.currentRound || localDB.currentRound.status !== 'live') return null;
  const roundId = localDB.currentRound.id;
  await updateDoc(doc(db, 'rounds', roundId), {
    status: 'ended',
    endedAt: Date.now()
  });
  return { ...localDB.currentRound, status: 'ended', endedAt: Date.now() };
}

// ===== INVESTMENT OPERATIONS =====
function getInvestments() {
  return localDB.investments;
}

function getUserInvestmentsThisRound(userId) {
  if (!localDB.currentRound) return [];
  return localDB.investments.filter(
    inv => inv.userId === userId && inv.round === localDB.currentRound.number
  );
}

async function invest(userId, teamId, amount) {
  if (!localDB.currentRound || localDB.currentRound.status !== 'live') {
    return { error: 'No active round' };
  }

  const user = getUserById(userId);
  const team = getTeamById(teamId);

  if (!user) return { error: 'User not found' };
  if (!team) return { error: 'Team not found' };
  if (!team.isActive) return { error: 'Team is not active' };

  const thisRoundInvestments = getUserInvestmentsThisRound(userId);
  if (thisRoundInvestments.length >= localDB.settings.maxInvestmentsPerRound) {
    return { error: `You can only invest in ${localDB.settings.maxInvestmentsPerRound} teams per round` };
  }

  if (thisRoundInvestments.find(inv => inv.teamId === teamId)) {
    return { error: 'Already invested in this team this round' };
  }

  if (user.tokens < amount) {
    return { error: 'Insufficient tokens' };
  }

  if (amount < team.basePrice) {
    return { error: `Minimum investment is ${team.basePrice} tokens` };
  }

  // Record investment
  const investment = {
    userId,
    teamId,
    amount,
    round: localDB.currentRound.number,
    timestamp: Date.now(),
  };

  await addDoc(collection(db, 'investments'), investment);

  // Update user
  await updateDoc(doc(db, 'users', userId), {
    tokens: increment(-amount),
    investments: [...user.investments, { teamId, amount, round: localDB.currentRound.number }],
    roundsParticipated: Array.from(new Set([...user.roundsParticipated, localDB.currentRound.number]))
  });

  // Update team
  const newRevenueHistory = [...(team.revenueHistory || [])];
  const historyIdx = newRevenueHistory.findIndex(h => h.round === localDB.currentRound.number);
  if (historyIdx > -1) {
    newRevenueHistory[historyIdx].amount += amount;
  } else {
    newRevenueHistory.push({ round: localDB.currentRound.number, amount });
  }

  await updateDoc(doc(db, 'teams', teamId), {
    currentTokens: increment(amount),
    totalRevenue: increment(amount),
    investorCount: increment(1),
    uniqueInvestors: Array.from(new Set([...(team.uniqueInvestors || []), userId])),
    revenueHistory: newRevenueHistory
  });

  return { success: true };
}


// ===== STATS =====
function getGlobalStats() {
  const totalTokens = localDB.teams.reduce((s, t) => s + (t.currentTokens || 0), 0) +
    localDB.users.reduce((s, u) => s + (u.tokens || 0), 0);
  return {
    teamCount: localDB.teams.filter(t => t.isActive).length,
    investorCount: localDB.users.length,
    totalTokens,
    currentRound: localDB.currentRound,
  };
}

// ===== SEED DEMO DATA =====
async function seedDemoData() {
  if (localDB.teams.length > 0) return;

  const teams = [
    { name: 'EcoVenture', username: 'ecoventure', password: 'eco123', emoji: '🌱' },
    { name: 'TechNova', username: 'technova', password: 'tech123', emoji: '💡' },
    { name: 'HealthBridge', username: 'healthbridge', password: 'health123', emoji: '🏥' },
  ];

  for (const t of teams) {
    await createTeam(t.name, t.username, t.password, t.emoji);
  }
}

// Attach functions to window for onclick handlers
window.getDB = getDB;
window.saveDB = saveDB;
window.resetDB = resetDB;
window.getTeams = getTeams;
window.getTeamById = getTeamById;
window.createTeam = createTeam;
window.updateTeam = updateTeam;
window.deleteTeam = deleteTeam;
window.mergeTeams = mergeTeams;
window.adjustTeamTokens = adjustTeamTokens;
window.getUsers = getUsers;
window.getUserById = getUserById;
window.getUserByHallTicket = getUserByHallTicket;
window.createUser = createUser;
window.updateUser = updateUser;
window.getCurrentRound = getCurrentRound;
window.startRound = startRound;
window.endRound = endRound;
window.getInvestments = getInvestments;
window.getUserInvestmentsThisRound = getUserInvestmentsThisRound;
window.invest = invest;
window.getGlobalStats = getGlobalStats;
window.seedDemoData = seedDemoData;

// Kick off sync with error handling
try {
  initDataSync();
} catch (error) {
  console.error("Failed to initialize Firebase sync. Check your configuration and internet connection.", error);
}

export {
  getDB, saveDB, resetDB,
  getTeams, getTeamById, createTeam, updateTeam, deleteTeam, mergeTeams, adjustTeamTokens,
  getUsers, getUserById, getUserByHallTicket, createUser, updateUser,
  getCurrentRound, startRound, endRound,
  getInvestments, getUserInvestmentsThisRound, invest,
  getGlobalStats, seedDemoData
};


