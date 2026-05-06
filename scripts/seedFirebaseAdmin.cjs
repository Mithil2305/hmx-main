/**
 * Firebase Admin SDK Bulk Account Seeder
 * Uses service account credentials from .env to create accounts in bulk
 * 
 * Usage:
 *   node scripts/seedFirebaseAdmin.cjs
 * 
 * Requirements:
 *   npm install firebase-admin dotenv
 */

require('dotenv').config();
const admin = require('firebase-admin');

// Demo accounts to create (excluding admin since user is already logged in)
const DEMO_ACCOUNTS = [
	{
		role: "client",
		email: "client@hmx.com",
		password: "client123",
		displayName: "Demo Client",
		phone: "+91 9876543211",
		business_name: "Demo Business Pvt Ltd",
	},
	{
		role: "pilot",
		email: "pilot@hmx.com",
		password: "pilot123",
		displayName: "Demo Pilot",
		phone: "+91 9876543212",
		experience_years: 5,
		expertise: ["realestate", "events"],
	},
	{
		role: "editor",
		email: "editor@hmx.com",
		password: "editor123",
		displayName: "Demo Editor",
		phone: "+91 9876543213",
		specialization: "video",
	},
	{
		role: "referral",
		email: "referral@hmx.com",
		password: "referral123",
		displayName: "Demo Referral Partner",
		phone: "+91 9876543214",
		business_name: "Referral Agency",
	},
];

/**
 * Initialize Firebase Admin SDK with service account
 * Supports both VITE_ prefixed and non-prefixed env variables
 */
function initializeAdmin() {
	// Helper to get env var with or without VITE_ prefix
	const getEnv = (key) => process.env[key] || process.env[`VITE_${key}`];

	const serviceAccount = {
		type: getEnv('FIREBASE_TYPE'),
		project_id: getEnv('FIREBASE_PROJECT_ID'),
		private_key_id: getEnv('FIREBASE_PRIVATE_KEY_ID'),
		private_key: getEnv('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
		client_email: getEnv('FIREBASE_CLIENT_EMAIL'),
		client_id: getEnv('FIREBASE_CLIENT_ID'),
		auth_uri: getEnv('FIREBASE_AUTH_URI'),
		token_uri: getEnv('FIREBASE_TOKEN_URI'),
		auth_provider_x509_cert_url: getEnv('FIREBASE_AUTH_PROVIDER_CERT_URL'),
		client_x509_cert_url: getEnv('FIREBASE_CLIENT_CERT_URL'),
	};

	// Check if credentials are valid
	if (!serviceAccount.project_id || !serviceAccount.private_key) {
		console.error('❌ Firebase service account credentials not found in .env');
		console.error('Make sure FIREBASE_PROJECT_ID (or VITE_FIREBASE_PROJECT_ID) and FIREBASE_PRIVATE_KEY are set');
		process.exit(1);
	}

	admin.initializeApp({
		credential: admin.credential.cert(serviceAccount),
	});

	console.log('✅ Firebase Admin SDK initialized');
	console.log(`   Project: ${serviceAccount.project_id}`);
	return admin;
}

/**
 * Create Firebase Auth user
 */
async function createAuthUser(account) {
	try {
		// Check if user already exists
		try {
			const existingUser = await admin.auth().getUserByEmail(account.email);
			console.log(`⚠️  User already exists: ${account.email} (UID: ${existingUser.uid})`);
			return existingUser.uid;
		} catch (error) {
			// User doesn't exist, continue to create
		}

		const userRecord = await admin.auth().createUser({
			email: account.email,
			password: account.password,
			displayName: account.displayName,
			emailVerified: true,
			disabled: false,
		});

		console.log(`✅ Created Auth user: ${account.email} (UID: ${userRecord.uid})`);
		return userRecord.uid;
	} catch (error) {
		console.error(`❌ Failed to create Auth user ${account.email}:`, error.message);
		return null;
	}
}

/**
 * Create Firestore document for user
 */
async function createUserDocument(uid, account) {
	const db = admin.firestore();
	
	const baseData = {
		uid: uid,
		email: account.email,
		role: account.role,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		status: "approved",
		is_active: true,
	};

	let collectionName;
	let userData;

	switch (account.role) {
		case "client":
			collectionName = "users";
			userData = {
				...baseData,
				contact_name: account.displayName,
				phone: account.phone,
				business_name: account.business_name || account.displayName,
			};
			break;

		case "pilot":
			collectionName = "pilots";
			userData = {
				...baseData,
				name: account.displayName,
				phone: account.phone,
				experience_years: account.experience_years || 0,
				expertise: account.expertise || [],
				location: "Mumbai, India",
				equipment: "DJI Mavic 3",
				availability: "full-time",
				bio: `Experienced drone pilot with ${account.experience_years} years of expertise.`,
			};
			break;

		case "editor":
			collectionName = "editors";
			userData = {
				...baseData,
				name: account.displayName,
				phone: account.phone,
				specialization: account.specialization || "video",
				skills: ["Premiere Pro", "After Effects", "Color Grading"],
				experience_years: 3,
				portfolio_url: "https://portfolio.example.com",
				location: "Mumbai, India",
				availability: "full-time",
			};
			break;

		case "referral":
			collectionName = "referrals";
			userData = {
				...baseData,
				contact_name: account.displayName,
				phone: account.phone,
				business_name: account.business_name || account.displayName,
				business_type: "agency",
				referral_code: `REF${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
				commission_rate: 10,
				location: "Mumbai, India",
				website: "https://example.com",
			};
			break;
	}

	try {
		await db.collection(collectionName).doc(uid).set(userData);
		console.log(`✅ Created Firestore doc: ${collectionName}/${uid}`);
		return true;
	} catch (error) {
		console.error(`❌ Failed to create Firestore doc for ${account.email}:`, error.message);
		return false;
	}
}

/**
 * Create sample bookings
 */
async function createSampleBookings(userUids) {
	const db = admin.firestore();
	const clientUid = userUids["client"];
	const pilotUid = userUids["pilot"];
	const editorUid = userUids["editor"];

	if (!clientUid) {
		console.log("⚠️  Cannot create bookings - client not created");
		return;
	}

	const sampleBookings = [
		{
			client_id: clientUid,
			client_name: "Demo Client",
			client_email: "client@hmx.com",
			property_type: "luxury",
			property_size: "medium",
			location_address: "123 Marine Drive, Mumbai",
			preferred_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
			total_cost: 10000,
			status: "PILOT_ASSIGNED",
			pilot_id: pilotUid || null,
			editor_id: null,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		},
		{
			client_id: clientUid,
			client_name: "Demo Client",
			client_email: "client@hmx.com",
			property_type: "commercial",
			property_size: "large",
			location_address: "456 Bandra West, Mumbai",
			preferred_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
			total_cost: 20000,
			status: "EDITING",
			pilot_id: pilotUid || null,
			editor_id: editorUid || null,
			created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
			updated_at: new Date().toISOString(),
		},
		{
			client_id: clientUid,
			client_name: "Demo Client",
			client_email: "client@hmx.com",
			property_type: "standard",
			property_size: "small",
			location_address: "789 Andheri East, Mumbai",
			preferred_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
			total_cost: 5000,
			status: "COMPLETED",
			pilot_id: pilotUid || null,
			editor_id: editorUid || null,
			payment_status: "paid",
			created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
			updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
		},
	];

	for (const booking of sampleBookings) {
		try {
			const bookingRef = db.collection("bookings").doc();
			await bookingRef.set({ ...booking, id: bookingRef.id });
			console.log(`✅ Created booking: ${bookingRef.id}`);
		} catch (error) {
			console.error(`❌ Failed to create booking:`, error.message);
		}
	}

	console.log(`✅ Created ${sampleBookings.length} sample bookings`);
}

/**
 * Main function to seed all data
 */
async function seedAllData() {
	console.log("============================================");
	console.log("🔥 Firebase Admin SDK - Bulk Account Seeder");
	console.log("============================================\n");

	// Initialize Admin SDK
	initializeAdmin();

	const userUids = {};
	const results = [];

	// Create all accounts
	console.log("📦 Creating Demo Accounts...\n");
	for (const account of DEMO_ACCOUNTS) {
		const uid = await createAuthUser(account);
		if (uid) {
			userUids[account.role] = uid;
			const docCreated = await createUserDocument(uid, account);
			results.push({
				role: account.role,
				email: account.email,
				password: account.password,
				uid: uid,
				status: docCreated ? "✅ Success" : "⚠️ Auth only",
			});
		} else {
			results.push({
				role: account.role,
				email: account.email,
				password: account.password,
				uid: null,
				status: "❌ Failed",
			});
		}
	}

	// Create sample bookings
	console.log("\n📦 Creating Sample Bookings...\n");
	await createSampleBookings(userUids);

	// Summary
	console.log("\n============================================");
	console.log("✅ Seeding Complete!");
	console.log("============================================");
	console.log("\nSummary:");
	console.table(results);

	console.log("\nDemo Credentials:");
	console.table(DEMO_ACCOUNTS.map(a => ({
		role: a.role,
		email: a.email,
		password: a.password,
	})));

	// Exit
	process.exit(0);
}

// Run the seeder
seedAllData().catch(error => {
	console.error("❌ Fatal error:", error);
	process.exit(1);
});
