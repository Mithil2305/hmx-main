/**
 * Firebase Demo Data Seeder
 * Seeds all demo accounts to Firebase Auth and Firestore
 * 
 * IMPORTANT: This requires Firebase to be configured with valid credentials.
 * If Firebase is not configured, this will fail.
 * 
 * Usage:
 * 1. Add Firebase config to .env file
 * 2. Import this file in main.tsx: import "./utils/seedFirebase";
 * 3. Or run in console: seedFirebase()
 */

import { auth, db } from "../services/firebase";
import {
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
} from "firebase/auth";
import {
	collection,
	doc,
	setDoc,
	getDocs,
	query,
	where,
} from "firebase/firestore";

interface DemoAccount {
	role: "admin" | "client" | "pilot" | "editor" | "referral";
	email: string;
	password: string;
	name: string;
	phone?: string;
	business_name?: string;
	experience_years?: number;
	expertise?: string[];
	specialization?: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
	{
		role: "admin",
		email: "admin@hmx.com",
		password: "admin123",
		name: "Admin User",
		phone: "+91 9876543210",
	},
	{
		role: "client",
		email: "client@hmx.com",
		password: "client123",
		name: "Demo Client",
		phone: "+91 9876543211",
		business_name: "Demo Business Pvt Ltd",
	},
	{
		role: "pilot",
		email: "pilot@hmx.com",
		password: "pilot123",
		name: "Demo Pilot",
		phone: "+91 9876543212",
		experience_years: 5,
		expertise: ["realestate", "events"],
	},
	{
		role: "editor",
		email: "editor@hmx.com",
		password: "editor123",
		name: "Demo Editor",
		phone: "+91 9876543213",
		specialization: "video",
	},
	{
		role: "referral",
		email: "referral@hmx.com",
		password: "referral123",
		name: "Demo Referral Partner",
		phone: "+91 9876543214",
		business_name: "Referral Agency",
	},
];

/**
 * Check if Firebase is properly configured
 */
const isFirebaseConfigured = (): boolean => {
	const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
	return !!(apiKey && apiKey !== "your_api_key_here" && auth && db);
};

/**
 * Create a user in Firebase Auth
 */
const createFirebaseUser = async (
	email: string,
	password: string
): Promise<string | null> => {
	try {
		const userCredential = await createUserWithEmailAndPassword(
			auth,
			email,
			password
		);
		console.log(`✅ Created Firebase Auth user:`, email);
		return userCredential.user.uid;
	} catch (error: any) {
		// User might already exist
		if (error.code === "auth/email-already-in-use") {
			console.log(`⚠️ User already exists:`, email);
			// Try to sign in to get UID
			try {
				const signInResult = await signInWithEmailAndPassword(
					auth,
					email,
					password
				);
				return signInResult.user.uid;
			} catch {
				return null;
			}
		}
		console.error(`❌ Failed to create Firebase user:`, email, error.message);
		return null;
	}
};

/**
 * Create user document in Firestore
 */
const createUserDocument = async (
	uid: string,
	account: DemoAccount
): Promise<boolean> => {
	try {
		const baseData = {
			uid,
			email: account.email,
			role: account.role,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			status: "approved",
			is_active: true,
		};

		let userData: any;

		switch (account.role) {
			case "admin":
			case "client":
				userData = {
					...baseData,
					contact_name: account.name,
					phone: account.phone,
					business_name: account.business_name || account.name,
				};
				await setDoc(doc(db, "users", uid), userData);
				break;

			case "pilot":
				userData = {
					...baseData,
					name: account.name,
					phone: account.phone,
					experience_years: account.experience_years || 0,
					expertise: account.expertise || [],
					location: "Mumbai, India",
					equipment: "DJI Mavic 3",
					availability: "full-time",
					bio: `Experienced drone pilot with ${account.experience_years} years of expertise.`,
				};
				await setDoc(doc(db, "pilots", uid), userData);
				break;

			case "editor":
				userData = {
					...baseData,
					name: account.name,
					phone: account.phone,
					specialization: account.specialization || "video",
					skills: ["Premiere Pro", "After Effects", "Color Grading"],
					experience_years: 3,
					portfolio_url: "https://portfolio.example.com",
					location: "Mumbai, India",
					availability: "full-time",
				};
				await setDoc(doc(db, "editors", uid), userData);
				break;

			case "referral":
				userData = {
					...baseData,
					contact_name: account.name,
					phone: account.phone,
					business_name: account.business_name || account.name,
					business_type: "agency",
					referral_code: `REF${Math.random()
						.toString(36)
						.substring(2, 8)
						.toUpperCase()}`,
					commission_rate: 10,
					location: "Mumbai, India",
					website: "https://example.com",
				};
				await setDoc(doc(db, "referrals", uid), userData);
				break;
		}

		console.log(`✅ Created Firestore document for ${account.role}:`, account.email);
		return true;
	} catch (error: any) {
		console.error(
			`❌ Failed to create Firestore document:`,
			account.email,
			error.message
		);
		return false;
	}
};

/**
 * Create sample bookings in Firestore
 */
const createSampleBookings = async (clientUid: string, pilotUid?: string, editorUid?: string): Promise<void> => {
	try {
		const bookingsRef = collection(db, "bookings");

		const sampleBookings = [
			{
				client_id: clientUid,
				client_name: "Demo Client",
				client_email: "client@hmx.com",
				property_type: "luxury",
				property_size: "medium",
				location_address: "123 Marine Drive, Mumbai",
				preferred_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
					.toISOString()
					.split("T")[0],
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
				preferred_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
					.toISOString()
					.split("T")[0],
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
				preferred_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
					.toISOString()
					.split("T")[0],
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
			const bookingRef = doc(bookingsRef);
			await setDoc(bookingRef, {
				...booking,
				id: bookingRef.id,
			});
			console.log(`✅ Created booking:`, bookingRef.id);
		}

		console.log(`✅ Created ${sampleBookings.length} sample bookings`);
	} catch (error: any) {
		console.error(`❌ Failed to create sample bookings:`, error.message);
	}
};

/**
 * Seed all demo data to Firebase
 */
export const seedFirebase = async (): Promise<{
	success: boolean;
	message: string;
	details: string[];
}> => {
	const details: string[] = [];

	console.log("============================================");
	console.log("🔥 Firebase Demo Data Seeder");
	console.log("============================================");

	// Check Firebase configuration
	if (!isFirebaseConfigured()) {
		const error = "❌ Firebase is not configured. Add Firebase credentials to .env file.";
		console.error(error);
		return {
			success: false,
			message: error,
			details: ["Missing VITE_FIREBASE_API_KEY or Firebase not initialized"],
		};
	}

	console.log("✅ Firebase is configured");

	const userUids: Record<string, string> = {};

	// Create users
	console.log("\n📦 Creating Demo Accounts...");
	for (const account of DEMO_ACCOUNTS) {
		console.log(`\nProcessing ${account.role}: ${account.email}...`);

		// Create Firebase Auth user
		const uid = await createFirebaseUser(account.email, account.password);
		if (!uid) {
			details.push(`❌ Failed to create ${account.role}: ${account.email}`);
			continue;
		}

		userUids[account.role] = uid;

		// Create Firestore document
		const docCreated = await createUserDocument(uid, account);
		if (docCreated) {
			details.push(`✅ Created ${account.role}: ${account.email}`);
		} else {
			details.push(`⚠️ Auth created but Firestore failed for ${account.role}`);
		}
	}

	// Create sample bookings
	console.log("\n📦 Creating Sample Bookings...");
	if (userUids["client"]) {
		await createSampleBookings(
			userUids["client"],
			userUids["pilot"],
			userUids["editor"]
		);
	}

	console.log("\n============================================");
	console.log("✅ Firebase Seeding Complete!");
	console.log("============================================");
	console.log("\nDemo Credentials:");
	console.table(
		DEMO_ACCOUNTS.map((a) => ({
			role: a.role,
			email: a.email,
			password: a.password,
		}))
	);

	return {
		success: true,
		message: "Demo data seeded to Firebase successfully",
		details,
	};
};

/**
 * Check Firebase connection status
 */
export const checkFirebaseStatus = async (): Promise<{
	configured: boolean;
	connected: boolean;
	message: string;
}> => {
	const configured = isFirebaseConfigured();

	if (!configured) {
		return {
			configured: false,
			connected: false,
			message: "Firebase not configured - add VITE_FIREBASE_API_KEY to .env",
		};
	}

	try {
		// Try to read from Firestore to verify connection
		const testQuery = query(collection(db, "users"), where("role", "==", "admin"));
		await getDocs(testQuery);

		return {
			configured: true,
			connected: true,
			message: "Firebase is connected and working",
		};
	} catch (error: any) {
		return {
			configured: true,
			connected: false,
			message: `Firebase configured but connection failed: ${error.message}`,
		};
	}
};

// Export for browser console usage
declare global {
	interface Window {
		seedFirebase: typeof seedFirebase;
		checkFirebaseStatus: typeof checkFirebaseStatus;
	}
}

if (typeof window !== "undefined") {
	window.seedFirebase = seedFirebase;
	window.checkFirebaseStatus = checkFirebaseStatus;
}
