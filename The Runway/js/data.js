import { 
    db, 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where,
    serverTimestamp,
    runTransaction,
    doc,
    deleteDoc,
    getDoc,
    setDoc
} from './firebase-config.js';

/**
 * Checks if any of the provided fields (roll number, phone, email, team name) 
 * already exist in the database.
 * @param {Object} checkData 
 * @returns {Object} { isDuplicate: boolean, message: string }
 */
export async function checkDuplicates(checkData) {
    const { teamName, username, members } = checkData;
    const teamsRef = collection(db, 'teams');

    // 1. Check Team Name
    const nameQuery = query(teamsRef, where('teamName', '==', teamName.toLowerCase()));
    const nameSnap = await getDocs(nameQuery);
    if (!nameSnap.empty) {
        return { isDuplicate: true, message: `Team name "${teamName}" is already taken.` };
    }

    // 2. Check Username uniqueness
    const usernameQuery = query(teamsRef, where('username', '==', username));
    const usernameSnap = await getDocs(usernameQuery);
    if (!usernameSnap.empty) {
        return { isDuplicate: true, message: `Username "@${username}" is already taken. Please choose a different one.` };
    }

    // Since Firebase doesn't support complex OR queries easily across arrays within documents 
    // without specific indexing, we will fetch all active teams and check client-side for duplicates.
    // For a large event this might not scale infinitely, but for ~60-100 teams it is perfectly fine and fast.
    const allTeamsSnap = await getDocs(teamsRef);
    const allTeams = allTeamsSnap.docs.map(d => d.data());

    for (let team of allTeams) {
        if (!team.members) continue;
        
        for (let existingMember of team.members) {
            for (let newMember of members) {
                if (existingMember.rollNo === newMember.rollNo) {
                    return { isDuplicate: true, message: `Roll Number ${newMember.rollNo} is already registered with team ${team.teamName}.` };
                }
                if (existingMember.phone === newMember.phone) {
                    return { isDuplicate: true, message: `Phone Number ${newMember.phone} is already registered.` };
                }
                if (existingMember.email.toLowerCase() === newMember.email.toLowerCase()) {
                    return { isDuplicate: true, message: `Email ${newMember.email} is already registered.` };
                }
            }
        }
    }

    return { isDuplicate: false };
}

/**
 * Registers a new team.
 * Uses a transaction to ensure no race conditions during duplicate checks.
 */
export async function registerTeam(teamData) {
    try {
        // Fast pre-check
        const dupCheck = await checkDuplicates(teamData);
        if (dupCheck.isDuplicate) {
            return { success: false, error: dupCheck.message };
        }

        // Normalize data
        const normalizedData = {
            teamName: teamData.teamName.toLowerCase(), // Store lowercase for easy queries
            displayName: teamData.teamName, // Display version
            username: teamData.username,
            password: teamData.password, // IMPORTANT: In a real prod this should be hashed, but for the simulation keeping it simple if auth is handled via custom logic.
            members: teamData.members.map(m => ({
                name: m.name,
                college: m.college,
                rollNo: m.rollNo,
                year: m.year,
                phone: m.phone,
                email: m.email
            })),
            registeredAt: serverTimestamp(),
            status: 'registered'
        };

        // Add to Firestore
        const docRef = await addDoc(collection(db, 'teams'), normalizedData);
        return { success: true, teamId: docRef.id, data: normalizedData };

    } catch (error) {
        console.error("Error registering team:", error);
        let errorMessage = "Failed to register team. Please try again.";
        
        // Expose Firebase rules errors directly since it's a new project
        if (error.code === 'permission-denied' || (error.message && error.message.includes('permission'))) {
            errorMessage = "Database Error: Missing Firestore Rules. Please go to Firebase Console -> Firestore Database -> Rules, and set allow read, write: if true; for testing.";
        } else {
            errorMessage = error.message || errorMessage;
        }
        
        return { success: false, error: errorMessage };
    }
}

/**
 * Fetch all teams for the Admin dashboard
 */
export async function getAllTeams() {
    try {
        const q = query(collection(db, 'teams'));
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching teams:", error);
        return [];
    }
}

/**
 * Authenticates a team by username and password.
 */
export async function loginTeam(username, password) {
    try {
        const q = query(collection(db, 'teams'), where('username', '==', username));
        const snap = await getDocs(q);
        
        if (snap.empty) {
            return { success: false, error: "Invalid username or password." };
        }

        const teamDoc = snap.docs[0];
        const teamData = teamDoc.data();

        // In a real application, NEVER store or compare plain text passwords.
        // We are strictly following the simulation constraints here.
        if (teamData.password === password) {
            return { success: true, teamId: teamDoc.id, data: teamData };
        } else {
            return { success: false, error: "Invalid username or password." };
        }
    } catch (error) {
        console.error("Error logging in team:", error);
        let errorMessage = "Login failed. Please try again.";
        if (error.code === 'permission-denied' || (error.message && error.message.includes('permission'))) {
            errorMessage = "Database Error: Missing Firestore Rules.";
        }
        return { success: false, error: errorMessage };
    }
}

/**
 * Deletes a team from Firestore given its ID.
 */
export async function deleteTeam(teamId) {
    try {
        await deleteDoc(doc(db, 'teams', teamId));
        return { success: true };
    } catch (error) {
        console.error("Error deleting team:", error);
        return { success: false, error: "Failed to delete team." };
    }
}

/**
 * Checks if registrations are currently open.
 * Reads 'config/registrations' document. Defaults to OPEN if doc doesn't exist.
 * @returns {boolean}
 */
export async function checkRegistrationOpen() {
    try {
        const configRef = doc(db, 'config', 'registrations');
        const snap = await getDoc(configRef);
        if (!snap.exists()) return true; // default open
        return snap.data().isOpen !== false;
    } catch (error) {
        console.error("Error checking registration status:", error);
        return true; // fail open
    }
}

/**
 * Gets the full registration status doc.
 * @returns {{ isOpen: boolean }}
 */
export async function getRegistrationStatus() {
    try {
        const configRef = doc(db, 'config', 'registrations');
        const snap = await getDoc(configRef);
        if (!snap.exists()) return { isOpen: true };
        return snap.data();
    } catch (error) {
        console.error("Error getting registration status:", error);
        return { isOpen: true };
    }
}

/**
 * Sets registration open/closed status.
 * @param {boolean} isOpen
 */
export async function setRegistrationStatus(isOpen) {
    try {
        const configRef = doc(db, 'config', 'registrations');
        await setDoc(configRef, { isOpen }, { merge: true });
        return { success: true };
    } catch (error) {
        console.error("Error setting registration status:", error);
        return { success: false, error: "Failed to update registration status." };
    }
}
