// ===== DATA LAYER =====
// All data is stored in localStorage under 'pitchitup_data'

const DB_KEY = 'pitchitup_data';

const DEFAULT_DATA = {
  teams: [],
  users: [],
  rounds: [],
  currentRound: null, // { number, status: 'live'|'ended', startedAt }
  roundCount: 0,
  investments: [], // { userId, teamId, amount, round, timestamp }
  settings: {
    tokensPerRound: 100,
    minPrice: 30,
    maxPrice: 100,
    maxInvestmentsPerRound: 3,
  },
  adminLog: [],
};

function getDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_DATA));
    const data = JSON.parse(raw);
    // Merge with defaults to handle new fields
    return { ...JSON.parse(JSON.stringify(DEFAULT_DATA)), ...data };
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
}

function saveDB(data) {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
}

function resetDB() {
  localStorage.removeItem(DB_KEY);
  return getDB();
}

// ===== TEAM OPERATIONS =====
function getTeams() {
  return getDB().teams;
}

function getTeamById(id) {
  return getDB().teams.find(t => t.id === id);
}

function createTeam(name, username, password, emoji = '🚀') {
  const db = getDB();
  const id = 'team_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  const team = {
    id,
    name,
    username,
    password,
    emoji,
    description: '',
    tagline: '',
    links: [],
    members: [],
    basePrice: 50,
    totalRevenue: 0,    // all-time tokens earned
    currentTokens: 0,   // current spendable tokens
    investorCount: 0,
    uniqueInvestors: [],
    revenueHistory: [],  // [{ round, amount }]
    createdAt: Date.now(),
    mergedWith: null,    // team id if merged
    isActive: true,
  };
  db.teams.push(team);
  saveDB(db);
  return team;
}

function updateTeam(id, updates) {
  const db = getDB();
  const idx = db.teams.findIndex(t => t.id === id);
  if (idx === -1) return null;
  db.teams[idx] = { ...db.teams[idx], ...updates };
  saveDB(db);
  return db.teams[idx];
}

function deleteTeam(id) {
  const db = getDB();
  db.teams = db.teams.filter(t => t.id !== id);
  saveDB(db);
}

function mergeTeams(teamId1, teamId2) {
  const db = getDB();
  const t1 = db.teams.find(t => t.id === teamId1);
  const t2 = db.teams.find(t => t.id === teamId2);
  if (!t1 || !t2) return null;

  // Merge tokens and investors
  t1.currentTokens += t2.currentTokens;
  t1.totalRevenue += t2.totalRevenue;
  t1.uniqueInvestors = [...new Set([...t1.uniqueInvestors, ...t2.uniqueInvestors])];
  t1.investorCount = t1.uniqueInvestors.length;
  t1.mergedWith = t2.id;
  t1.name = t1.name + ' × ' + t2.name;

  // Mark t2 as merged
  t2.isActive = false;
  t2.mergedWith = t1.id;

  saveDB(db);
  return t1;
}

function adjustTeamTokens(teamId, amount, type = 'add') {
  const db = getDB();
  const team = db.teams.find(t => t.id === teamId);
  if (!team) return null;
  if (type === 'add') {
    team.currentTokens += amount;
    team.totalRevenue += amount;
  } else {
    team.currentTokens = Math.max(0, team.currentTokens - amount);
  }
  saveDB(db);
  return team;
}

// ===== USER OPERATIONS =====
function getUsers() {
  return getDB().users;
}

function getUserById(id) {
  return getDB().users.find(u => u.id === id);
}

function getUserByHallTicket(hallTicket) {
  return getDB().users.find(u => u.hallTicket === hallTicket);
}

function createUser(hallTicket, password, name, college, section) {
  const db = getDB();
  if (db.users.find(u => u.hallTicket === hallTicket)) {
    return { error: 'Hall ticket already registered' };
  }
  const id = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  const user = {
    id,
    hallTicket,
    password,
    name,
    college,
    section,
    tokens: 0,
    totalTokensReceived: 0,
    investments: [],  // [{ teamId, amount, round }]
    roundsParticipated: [],
    createdAt: Date.now(),
    isActive: true,
  };
  db.users.push(user);
  saveDB(db);
  return user;
}

function updateUser(id, updates) {
  const db = getDB();
  const idx = db.users.findIndex(u => u.id === id);
  if (idx === -1) return null;
  db.users[idx] = { ...db.users[idx], ...updates };
  saveDB(db);
  return db.users[idx];
}

// ===== ROUND OPERATIONS =====
function getCurrentRound() {
  return getDB().currentRound;
}

function startRound() {
  const db = getDB();
  db.roundCount += 1;
  db.currentRound = {
    number: db.roundCount,
    status: 'live',
    startedAt: Date.now(),
    endedAt: null,
  };

  // Give tokens to all users for this round
  db.users.forEach(user => {
    user.tokens += db.settings.tokensPerRound;
    user.totalTokensReceived += db.settings.tokensPerRound;
  });

  saveDB(db);
  return db.currentRound;
}

function endRound() {
  const db = getDB();
  if (!db.currentRound) return null;
  db.currentRound.status = 'ended';
  db.currentRound.endedAt = Date.now();
  db.rounds.push({ ...db.currentRound });
  saveDB(db);
  return db.currentRound;
}

// ===== INVESTMENT OPERATIONS =====
function getInvestments() {
  return getDB().investments;
}

function getUserInvestmentsThisRound(userId) {
  const db = getDB();
  if (!db.currentRound) return [];
  return db.investments.filter(
    inv => inv.userId === userId && inv.round === db.currentRound.number
  );
}

function invest(userId, teamId, amount) {
  const db = getDB();

  if (!db.currentRound || db.currentRound.status !== 'live') {
    return { error: 'No active round' };
  }

  const user = db.users.find(u => u.id === userId);
  const team = db.teams.find(t => t.id === teamId);

  if (!user) return { error: 'User not found' };
  if (!team) return { error: 'Team not found' };
  if (!team.isActive) return { error: 'Team is not active' };

  // Check investment limit
  const thisRoundInvestments = db.investments.filter(
    inv => inv.userId === userId && inv.round === db.currentRound.number
  );
  if (thisRoundInvestments.length >= db.settings.maxInvestmentsPerRound) {
    return { error: `You can only invest in ${db.settings.maxInvestmentsPerRound} teams per round` };
  }

  // Check if already invested in this team this round
  if (thisRoundInvestments.find(inv => inv.teamId === teamId)) {
    return { error: 'Already invested in this team this round' };
  }

  // Check tokens
  if (user.tokens < amount) {
    return { error: 'Insufficient tokens' };
  }

  // Minimum investment = team base price
  if (amount < team.basePrice) {
    return { error: `Minimum investment is ${team.basePrice} tokens` };
  }

  // Deduct from user
  user.tokens -= amount;

  // Add to team
  team.currentTokens += amount;
  team.totalRevenue += amount;
  team.investorCount += 1;
  if (!team.uniqueInvestors.includes(userId)) {
    team.uniqueInvestors.push(userId);
  }

  // Update revenue history
  const existingHistory = team.revenueHistory.find(h => h.round === db.currentRound.number);
  if (existingHistory) {
    existingHistory.amount += amount;
  } else {
    team.revenueHistory.push({ round: db.currentRound.number, amount });
  }

  // Record investment
  const investment = {
    id: 'inv_' + Date.now(),
    userId,
    teamId,
    amount,
    round: db.currentRound.number,
    timestamp: Date.now(),
  };
  db.investments.push(investment);

  // Add to user investments
  user.investments.push({ teamId, amount, round: db.currentRound.number });
  if (!user.roundsParticipated.includes(db.currentRound.number)) {
    user.roundsParticipated.push(db.currentRound.number);
  }

  saveDB(db);
  return { success: true, investment };
}

// ===== STATS =====
function getGlobalStats() {
  const db = getDB();
  const totalTokens = db.teams.reduce((s, t) => s + t.currentTokens, 0) +
    db.users.reduce((s, u) => s + u.tokens, 0);
  return {
    teamCount: db.teams.filter(t => t.isActive).length,
    investorCount: db.users.length,
    totalTokens,
    currentRound: db.currentRound,
  };
}

// ===== SEED DEMO DATA =====
function seedDemoData() {
  const db = getDB();
  if (db.teams.length > 0) return; // already seeded

  // Create sample teams
  const teams = [
    { name: 'EcoVenture', username: 'ecoventure', password: 'eco123', emoji: '🌱' },
    { name: 'TechNova', username: 'technova', password: 'tech123', emoji: '💡' },
    { name: 'HealthBridge', username: 'healthbridge', password: 'health123', emoji: '🏥' },
  ];

  teams.forEach(t => createTeam(t.name, t.username, t.password, t.emoji));
  saveDB(getDB());
}
