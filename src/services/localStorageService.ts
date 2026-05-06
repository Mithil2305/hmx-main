// Client-side only storage service - replaces backend API
// All data is stored in localStorage and processed in the frontend

import { auth } from "./firebase";

// ==================== DATA KEYS ====================
const STORAGE_KEYS = {
	USERS: "hmx_users",
	PILOTS: "hmx_pilots",
	EDITORS: "hmx_editors",
	REFERRALS: "hmx_referrals",
	BOOKINGS: "hmx_bookings",
	BUSINESS_BOOKINGS: "hmx_business_bookings",
	MESSAGES: "hmx_messages",
	PAYMENTS: "hmx_payments",
	REFUNDS: "hmx_refunds",
	CURRENT_USER: "hmx_current_user",
	COUNTERS: "hmx_counters",
	OTP_VERIFIED: "hmx_otp_verified",
} as const;

// ==================== HELPER FUNCTIONS ====================

const getStorageItem = <T>(key: string, defaultValue: T): T => {
	try {
		const item = localStorage.getItem(key);
		return item ? JSON.parse(item) : defaultValue;
	} catch {
		return defaultValue;
	}
};

const setStorageItem = (key: string, value: any): void => {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch (e) {
		console.error(`Error saving to localStorage: ${key}`, e);
	}
};

const generateId = (): string => {
	return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const getCounter = (type: string): number => {
	const counters = getStorageItem(STORAGE_KEYS.COUNTERS, {});
	const current = (counters[type] || 0) + 1;
	counters[type] = current;
	setStorageItem(STORAGE_KEYS.COUNTERS, counters);
	return current;
};

const getTimestamp = (): string => {
	return new Date().toISOString();
};

// ==================== PASSWORD HASHING (Simple for demo) ====================
const hashPassword = (password: string): string => {
	// In a real app, use bcrypt. For frontend-only demo, we use a simple hash
	let hash = 0;
	for (let i = 0; i < password.length; i++) {
		const char = password.charCodeAt(i);
		hash = ((hash << 5) - hash + char) | 0;
	}
	return `hash_${hash}_${password.length}`;
};

const verifyPassword = (password: string, hashedPassword: string): boolean => {
	return hashPassword(password) === hashedPassword;
};

// ==================== CITY LIST ====================
export const CITY_LIST = [
	"Mumbai",
	"Pune",
	"Delhi",
	"Bangalore",
	"Hyderabad",
	"Chennai",
	"Kolkata",
	"Ahmedabad",
	"Jaipur",
	"Chandigarh",
	"Lucknow",
];

// ==================== INITIALIZE DEMO DATA ====================
export const initializeDemoData = (): void => {
	// Only initialize if no data exists
	if (localStorage.getItem(STORAGE_KEYS.USERS)) return;

	// Create admin user
	const adminUser = {
		id: "admin_1",
		email: "admin@hmx.com",
		password: hashPassword("admin123"),
		full_name: "Admin User",
		business_name: "HMX Admin",
		role: "admin",
		is_approved: true,
		has_completed_bbd: true,
		created_at: getTimestamp(),
		updated_at: getTimestamp(),
	};

	// Create sample pilot
	const pilotUser = {
		id: "pilot_1",
		email: "pilot@hmx.com",
		password: hashPassword("pilot123"),
		full_name: "Test Pilot",
		phone: "+91-9876543210",
		cities: ["Mumbai", "Delhi"],
		experience: "5 years",
		role: "pilot",
		is_approved: true,
		is_available: true,
		current_bookings: 0,
		rating: 0,
		total_reviews: 0,
		earnings: 0,
		created_at: getTimestamp(),
		updated_at: getTimestamp(),
	};

	// Create sample editor
	const editorUser = {
		id: "editor_1",
		email: "editor@hmx.com",
		password: hashPassword("editor123"),
		full_name: "Test Editor",
		phone: "+91-9876543211",
		role: "editor",
		is_approved: true,
		is_available: true,
		current_projects: 0,
		completed_projects: 0,
		rating: 0,
		hourly_rate: 500,
		skills: ["Video Editing", "Color Grading"],
		earnings: 0,
		created_at: getTimestamp(),
		updated_at: getTimestamp(),
	};

	// Create sample referral
	const referralUser = {
		id: "referral_1",
		email: "referral@hmx.com",
		password: hashPassword("referral123"),
		full_name: "Test Referral",
		phone: "+91-9876543212",
		role: "referral",
		referral_code: "REF001",
		referral_type: "individual",
		is_approved: true,
		total_referrals: 0,
		successful_referrals: 0,
		pending_referrals: 0,
		total_earnings: 0,
		paid_earnings: 0,
		pending_earnings: 0,
		created_at: getTimestamp(),
		updated_at: getTimestamp(),
	};

	// Create sample client
	const clientUser = {
		id: "client_1",
		email: "client@hmx.com",
		password: hashPassword("client123"),
		business_name: "Test Business",
		contact_name: "Test Client",
		phone: "+91-9876543213",
		role: "client",
		is_approved: true,
		has_completed_bbd: false,
		created_at: getTimestamp(),
		updated_at: getTimestamp(),
	};

	// Save to localStorage
	setStorageItem(STORAGE_KEYS.USERS, {
		[adminUser.id]: adminUser,
		[clientUser.id]: clientUser,
	});
	setStorageItem(STORAGE_KEYS.PILOTS, { [pilotUser.id]: pilotUser });
	setStorageItem(STORAGE_KEYS.EDITORS, { [editorUser.id]: editorUser });
	setStorageItem(STORAGE_KEYS.REFERRALS, { [referralUser.id]: referralUser });
	setStorageItem(STORAGE_KEYS.BOOKINGS, {});
	setStorageItem(STORAGE_KEYS.BUSINESS_BOOKINGS, {});
	setStorageItem(STORAGE_KEYS.MESSAGES, {});
	setStorageItem(STORAGE_KEYS.PAYMENTS, {});
	setStorageItem(STORAGE_KEYS.REFUNDS, {});
	setStorageItem(STORAGE_KEYS.COUNTERS, {
		users: 2,
		pilots: 1,
		editors: 1,
		referrals: 1,
		bookings: 0,
		business_bookings: 0,
		messages: 0,
	});
};

// ==================== CRUD OPERATIONS ====================

export const localDB = {
	// Users
	users: {
		getAll: () => Object.values(getStorageItem<Record<string, any>>(STORAGE_KEYS.USERS, {})),
		getById: (id: string) => getStorageItem<Record<string, any>>(STORAGE_KEYS.USERS, {})[id],
		getByEmail: (email: string) => {
			const users = getStorageItem<Record<string, any>>(STORAGE_KEYS.USERS, {});
			return Object.values(users).find((u) => u.email === email);
		},
		create: (data: any) => {
			const users = getStorageItem<Record<string, any>>(STORAGE_KEYS.USERS, {});
			const id = data.id || generateId();
			users[id] = { ...data, id, created_at: getTimestamp(), updated_at: getTimestamp() };
			setStorageItem(STORAGE_KEYS.USERS, users);
			return id;
		},
		update: (id: string, data: any) => {
			const users = getStorageItem<Record<string, any>>(STORAGE_KEYS.USERS, {});
			if (users[id]) {
				users[id] = { ...users[id], ...data, updated_at: getTimestamp() };
				setStorageItem(STORAGE_KEYS.USERS, users);
				return true;
			}
			return false;
		},
		delete: (id: string) => {
			const users = getStorageItem<Record<string, any>>(STORAGE_KEYS.USERS, {});
			delete users[id];
			setStorageItem(STORAGE_KEYS.USERS, users);
		},
	},

	// Pilots
	pilots: {
		getAll: () => Object.values(getStorageItem<Record<string, any>>(STORAGE_KEYS.PILOTS, {})),
		getById: (id: string) => getStorageItem<Record<string, any>>(STORAGE_KEYS.PILOTS, {})[id],
		getByEmail: (email: string) => {
			const pilots = getStorageItem<Record<string, any>>(STORAGE_KEYS.PILOTS, {});
			return Object.values(pilots).find((p) => p.email === email);
		},
		create: (data: any) => {
			const pilots = getStorageItem<Record<string, any>>(STORAGE_KEYS.PILOTS, {});
			const id = data.id || generateId();
			pilots[id] = { ...data, id, created_at: getTimestamp(), updated_at: getTimestamp() };
			setStorageItem(STORAGE_KEYS.PILOTS, pilots);
			return id;
		},
		update: (id: string, data: any) => {
			const pilots = getStorageItem<Record<string, any>>(STORAGE_KEYS.PILOTS, {});
			if (pilots[id]) {
				pilots[id] = { ...pilots[id], ...data, updated_at: getTimestamp() };
				setStorageItem(STORAGE_KEYS.PILOTS, pilots);
				return true;
			}
			return false;
		},
		delete: (id: string) => {
			const pilots = getStorageItem<Record<string, any>>(STORAGE_KEYS.PILOTS, {});
			delete pilots[id];
			setStorageItem(STORAGE_KEYS.PILOTS, pilots);
		},
	},

	// Editors
	editors: {
		getAll: () => Object.values(getStorageItem<Record<string, any>>(STORAGE_KEYS.EDITORS, {})),
		getById: (id: string) => getStorageItem<Record<string, any>>(STORAGE_KEYS.EDITORS, {})[id],
		getByEmail: (email: string) => {
			const editors = getStorageItem<Record<string, any>>(STORAGE_KEYS.EDITORS, {});
			return Object.values(editors).find((e) => e.email === email);
		},
		create: (data: any) => {
			const editors = getStorageItem<Record<string, any>>(STORAGE_KEYS.EDITORS, {});
			const id = data.id || generateId();
			editors[id] = { ...data, id, created_at: getTimestamp(), updated_at: getTimestamp() };
			setStorageItem(STORAGE_KEYS.EDITORS, editors);
			return id;
		},
		update: (id: string, data: any) => {
			const editors = getStorageItem<Record<string, any>>(STORAGE_KEYS.EDITORS, {});
			if (editors[id]) {
				editors[id] = { ...editors[id], ...data, updated_at: getTimestamp() };
				setStorageItem(STORAGE_KEYS.EDITORS, editors);
				return true;
			}
			return false;
		},
		delete: (id: string) => {
			const editors = getStorageItem<Record<string, any>>(STORAGE_KEYS.EDITORS, {});
			delete editors[id];
			setStorageItem(STORAGE_KEYS.EDITORS, editors);
		},
	},

	// Referrals
	referrals: {
		getAll: () => Object.values(getStorageItem<Record<string, any>>(STORAGE_KEYS.REFERRALS, {})),
		getById: (id: string) => getStorageItem<Record<string, any>>(STORAGE_KEYS.REFERRALS, {})[id],
		getByEmail: (email: string) => {
			const referrals = getStorageItem<Record<string, any>>(STORAGE_KEYS.REFERRALS, {});
			return Object.values(referrals).find((r) => r.email === email);
		},
		create: (data: any) => {
			const referrals = getStorageItem<Record<string, any>>(STORAGE_KEYS.REFERRALS, {});
			const id = data.id || generateId();
			referrals[id] = { ...data, id, created_at: getTimestamp(), updated_at: getTimestamp() };
			setStorageItem(STORAGE_KEYS.REFERRALS, referrals);
			return id;
		},
		update: (id: string, data: any) => {
			const referrals = getStorageItem<Record<string, any>>(STORAGE_KEYS.REFERRALS, {});
			if (referrals[id]) {
				referrals[id] = { ...referrals[id], ...data, updated_at: getTimestamp() };
				setStorageItem(STORAGE_KEYS.REFERRALS, referrals);
				return true;
			}
			return false;
		},
		delete: (id: string) => {
			const referrals = getStorageItem<Record<string, any>>(STORAGE_KEYS.REFERRALS, {});
			delete referrals[id];
			setStorageItem(STORAGE_KEYS.REFERRALS, referrals);
		},
	},

	// Bookings
	bookings: {
		getAll: () => Object.values(getStorageItem<Record<string, any>>(STORAGE_KEYS.BOOKINGS, {})),
		getById: (id: string) => getStorageItem<Record<string, any>>(STORAGE_KEYS.BOOKINGS, {})[id],
		getByClientId: (clientId: string) => {
			const bookings = getStorageItem<Record<string, any>>(STORAGE_KEYS.BOOKINGS, {});
			return Object.values(bookings).filter((b) => b.client_id === clientId);
		},
		getByPilotId: (pilotId: string) => {
			const bookings = getStorageItem<Record<string, any>>(STORAGE_KEYS.BOOKINGS, {});
			return Object.values(bookings).filter((b) => b.pilot_id === pilotId);
		},
		getByEditorId: (editorId: string) => {
			const bookings = getStorageItem<Record<string, any>>(STORAGE_KEYS.BOOKINGS, {});
			return Object.values(bookings).filter((b) => b.editor_id === editorId);
		},
		create: (data: any) => {
			const bookings = getStorageItem<Record<string, any>>(STORAGE_KEYS.BOOKINGS, {});
			const id = data.id || generateId();
			bookings[id] = { ...data, id, created_at: getTimestamp(), updated_at: getTimestamp() };
			setStorageItem(STORAGE_KEYS.BOOKINGS, bookings);
			return id;
		},
		update: (id: string, data: any) => {
			const bookings = getStorageItem<Record<string, any>>(STORAGE_KEYS.BOOKINGS, {});
			if (bookings[id]) {
				bookings[id] = { ...bookings[id], ...data, updated_at: getTimestamp() };
				setStorageItem(STORAGE_KEYS.BOOKINGS, bookings);
				return true;
			}
			return false;
		},
		delete: (id: string) => {
			const bookings = getStorageItem<Record<string, any>>(STORAGE_KEYS.BOOKINGS, {});
			delete bookings[id];
			setStorageItem(STORAGE_KEYS.BOOKINGS, bookings);
		},
	},

	// Business Bookings
	businessBookings: {
		getAll: () => Object.values(getStorageItem<Record<string, any>>(STORAGE_KEYS.BUSINESS_BOOKINGS, {})),
		getById: (id: string) => getStorageItem<Record<string, any>>(STORAGE_KEYS.BUSINESS_BOOKINGS, {})[id],
		getByUserId: (userId: string) => {
			const bookings = getStorageItem<Record<string, any>>(STORAGE_KEYS.BUSINESS_BOOKINGS, {});
			return Object.values(bookings).filter((b) => b.user_id === userId);
		},
		create: (data: any) => {
			const bookings = getStorageItem<Record<string, any>>(STORAGE_KEYS.BUSINESS_BOOKINGS, {});
			const id = data.id || generateId();
			bookings[id] = { ...data, id, created_at: getTimestamp(), updated_at: getTimestamp() };
			setStorageItem(STORAGE_KEYS.BUSINESS_BOOKINGS, bookings);
			return id;
		},
		update: (id: string, data: any) => {
			const bookings = getStorageItem<Record<string, any>>(STORAGE_KEYS.BUSINESS_BOOKINGS, {});
			if (bookings[id]) {
				bookings[id] = { ...bookings[id], ...data, updated_at: getTimestamp() };
				setStorageItem(STORAGE_KEYS.BUSINESS_BOOKINGS, bookings);
				return true;
			}
			return false;
		},
		delete: (id: string) => {
			const bookings = getStorageItem<Record<string, any>>(STORAGE_KEYS.BUSINESS_BOOKINGS, {});
			delete bookings[id];
			setStorageItem(STORAGE_KEYS.BUSINESS_BOOKINGS, bookings);
		},
	},

	// Messages
	messages: {
		getAll: () => Object.values(getStorageItem<Record<string, any>>(STORAGE_KEYS.MESSAGES, {})),
		getByUserId: (userId: string) => {
			const messages = getStorageItem<Record<string, any>>(STORAGE_KEYS.MESSAGES, {});
			return Object.values(messages).filter(
				(m) => m.sender_id === userId || m.receiver_id === userId
			);
		},
		create: (data: any) => {
			const messages = getStorageItem<Record<string, any>>(STORAGE_KEYS.MESSAGES, {});
			const id = data.id || generateId();
			messages[id] = { ...data, id, created_at: getTimestamp(), updated_at: getTimestamp() };
			setStorageItem(STORAGE_KEYS.MESSAGES, messages);
			return id;
		},
		update: (id: string, data: any) => {
			const messages = getStorageItem<Record<string, any>>(STORAGE_KEYS.MESSAGES, {});
			if (messages[id]) {
				messages[id] = { ...messages[id], ...data, updated_at: getTimestamp() };
				setStorageItem(STORAGE_KEYS.MESSAGES, messages);
				return true;
			}
			return false;
		},
	},

	// Payments
	payments: {
		getAll: () => Object.values(getStorageItem<Record<string, any>>(STORAGE_KEYS.PAYMENTS, {})),
		create: (data: any) => {
			const payments = getStorageItem<Record<string, any>>(STORAGE_KEYS.PAYMENTS, {});
			const id = data.id || generateId();
			payments[id] = { ...data, id, created_at: getTimestamp() };
			setStorageItem(STORAGE_KEYS.PAYMENTS, payments);
			return id;
		},
	},

	// Current User Session
	currentUser: {
		get: () => getStorageItem<any>(STORAGE_KEYS.CURRENT_USER, null),
		set: (user: any) => setStorageItem(STORAGE_KEYS.CURRENT_USER, user),
		clear: () => localStorage.removeItem(STORAGE_KEYS.CURRENT_USER),
	},
};

// ==================== AUTH SERVICES ====================

export const localAuth = {
	login: (email: string, password: string, role?: string) => {
		const emailLower = email.toLowerCase().trim();

		// Check all collections for the user
		let user = localDB.users.getByEmail(emailLower);
		let foundRole = user?.role || "client";

		if (!user) {
			user = localDB.pilots.getByEmail(emailLower);
			foundRole = "pilot";
		}
		if (!user) {
			user = localDB.editors.getByEmail(emailLower);
			foundRole = "editor";
		}
		if (!user) {
			user = localDB.referrals.getByEmail(emailLower);
			foundRole = "referral";
		}

		if (!user) {
			throw new Error("Invalid email or password");
		}

		if (!verifyPassword(password, user.password)) {
			throw new Error("Invalid email or password");
		}

		// Remove password from returned user
		const { password: _, ...userWithoutPassword } = user;
		const finalRole = role && role !== "any" ? role : foundRole;

		const sessionUser = {
			...userWithoutPassword,
			role: finalRole,
			user_id: user.id,
		};

		localDB.currentUser.set(sessionUser);
		return { user: sessionUser };
	},

	register: (data: any) => {
		const { email, password, role = "client", ...profile } = data;
		const emailLower = email.toLowerCase().trim();

		// Check if email already exists
		if (
			localDB.users.getByEmail(emailLower) ||
			localDB.pilots.getByEmail(emailLower) ||
			localDB.editors.getByEmail(emailLower) ||
			localDB.referrals.getByEmail(emailLower)
		) {
			throw new Error("Email already registered");
		}

		const userData = {
			email: emailLower,
			password: hashPassword(password),
			role,
			...profile,
			is_approved: true,
			has_completed_bbd: false,
		};

		let id;
		if (role === "pilot") {
			id = localDB.pilots.create(userData);
		} else if (role === "editor") {
			id = localDB.editors.create(userData);
		} else if (role === "referral") {
			id = localDB.referrals.create(userData);
		} else {
			id = localDB.users.create(userData);
		}

		const user = { id, email: emailLower, role, ...profile };
		localDB.currentUser.set(user);
		return { user };
	},

	logout: () => {
		localDB.currentUser.clear();
	},

	getCurrentUser: () => {
		return localDB.currentUser.get();
	},

	updatePassword: (email: string, newPassword: string) => {
		const emailLower = email.toLowerCase().trim();
		let updated = false;

		// Check all collections
		const user = localDB.users.getByEmail(emailLower);
		if (user) {
			localDB.users.update(user.id, { password: hashPassword(newPassword) });
			updated = true;
		}

		const pilot = localDB.pilots.getByEmail(emailLower);
		if (pilot) {
			localDB.pilots.update(pilot.id, { password: hashPassword(newPassword) });
			updated = true;
		}

		const editor = localDB.editors.getByEmail(emailLower);
		if (editor) {
			localDB.editors.update(editor.id, { password: hashPassword(newPassword) });
			updated = true;
		}

		const referral = localDB.referrals.getByEmail(emailLower);
		if (referral) {
			localDB.referrals.update(referral.id, { password: hashPassword(newPassword) });
			updated = true;
		}

		return updated;
	},
};

// ==================== COST CALCULATION ====================

export const costCalculator = {
	calculateBusinessBookingCost: (businessSize: string): number => {
		const sizeCosts: Record<string, number> = {
			small: 5000,
			medium: 10000,
			large: 20000,
			"extra-large": 40000,
			enterprise: 0, // Custom quote
		};
		return sizeCosts[businessSize] || 5000;
	},
};

// ==================== STATS CALCULATOR ====================

export const statsCalculator = {
	getAdminStats: () => {
		const users = localDB.users.getAll();
		const pilots = localDB.pilots.getAll();
		const editors = localDB.editors.getAll();
		const referrals = localDB.referrals.getAll();
		const bookings = localDB.bookings.getAll();
		const businessBookings = localDB.businessBookings.getAll();

		return {
			total_users: users.length,
			total_pilots: pilots.length,
			total_editors: editors.length,
			total_referrals: referrals.length,
			total_bookings: bookings.length,
			total_business_bookings: businessBookings.length,
			pending_approvals: pilots.filter((p) => !p.is_approved).length +
				editors.filter((e) => !e.is_approved).length +
				referrals.filter((r) => !r.is_approved).length,
			pending_bookings: businessBookings.filter((b) => b.status === "pending_approval").length,
		};
	},

	getClientStats: (clientId: string) => {
		const bookings = localDB.businessBookings.getByUserId(clientId);
		return {
			activeProjects: bookings.filter((b) => ["pending_approval", "assigned", "in_progress", "editing", "review"].includes(b.status)).length,
			completedProjects: bookings.filter((b) => b.status === "completed").length,
			pendingPayments: bookings.filter((b) => b.payment_status === "pending").length,
			totalSpent: bookings
				.filter((b) => b.payment_status === "paid")
				.reduce((sum, b) => sum + (b.cost || 0), 0),
		};
	},

	getPilotStats: (pilotId: string) => {
		const bookings = localDB.bookings.getByPilotId(pilotId);
		return {
			activeJobs: bookings.filter((b) => ["assigned", "in_progress"].includes(b.status)).length,
			completedJobs: bookings.filter((b) => b.status === "completed").length,
			totalEarnings: bookings
				.filter((b) => b.status === "completed")
				.reduce((sum, b) => sum + (b.pilot_earnings || 0), 0),
		};
	},

	getEditorStats: (editorId: string) => {
		const bookings = localDB.bookings.getByEditorId(editorId);
		return {
			activeProjects: bookings.filter((b) => b.status === "editing").length,
			completedProjects: bookings.filter((b) => b.status === "completed").length,
			totalEarnings: bookings
				.filter((b) => b.status === "completed")
				.reduce((sum, b) => sum + (b.editor_earnings || 0), 0),
		};
	},
};

// Initialize demo data on module load
initializeDemoData();
