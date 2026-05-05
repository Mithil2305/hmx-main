import {
	createUserWithEmailAndPassword,
	sendPasswordResetEmail,
	signInWithEmailAndPassword,
	signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import {
	createRecord,
	ensureUserProfile,
	getRecords,
	getRecordsByField,
	getUserProfile,
	updateRecord,
} from "./firestoreService";

export const authService = {
	register: async (data: any) => {
		const { email, password, role = "client", ...profile } = data;
		const credential = await createUserWithEmailAndPassword(
			auth,
			email,
			password,
		);
		await ensureUserProfile(credential.user.uid, {
			...profile,
			email,
			role,
			status: profile.status || "active",
		});
		return { user: credential.user };
	},

	login: async (data: any) => {
		const credential = await signInWithEmailAndPassword(
			auth,
			data.email,
			data.password,
		);
		const profile = await getUserProfile(credential.user.uid);
		return { user: { ...profile, uid: credential.user.uid } };
	},

	resetPassword: async (email: string) => {
		await sendPasswordResetEmail(auth, email);
	},

	logout: async () => {
		await signOut(auth);
	},
};

export const otpService = {
	requestOtp: async (data: { email: string }) => {
		if (!data.email) throw new Error("Email is required");
		localStorage.setItem(`otp_verified_${data.email}`, "false");
		return { success: true, message: "OTP sent (demo)" };
	},
	verifyOtp: async (data: { email: string; otp: string }) => {
		if (!data.otp || !/^\d{6}$/.test(data.otp)) {
			return { success: false, error: "Invalid OTP" };
		}
		localStorage.setItem(`otp_verified_${data.email}`, "true");
		return { success: true };
	},
};

export const pilotService = {
	register: async (data: any) => {
		const id = await createRecord("pilotApplications", {
			...data,
			status: data.status || "pending",
		});
		return { id };
	},
	apply: async (data: any) => {
		const id = await createRecord("pilotApplications", {
			...data,
			status: data.status || "pending",
		});
		return { id };
	},
};

export const editorService = {
	register: async (data: any) => {
		const id = await createRecord("editorApplications", {
			...data,
			status: data.status || "pending",
		});
		return { id };
	},
};

export const referralService = {
	register: async (data: any) => {
		const id = await createRecord("referrals", {
			...data,
			status: data.status || "pending",
		});
		const referralLink = `${window.location.origin}/guest-signup?ref=${id}`;
		await updateRecord("referrals", id, { referral_link: referralLink });
		return { referral_link: referralLink, id };
	},
};

export const bookingService = {
	create: async (data: any) => {
		const id = await createRecord("bookings", data);
		return { id };
	},

	getAll: async () => {
		return getRecords("bookings");
	},

	accept: async (bookingId: string) => {
		await updateRecord("bookings", bookingId, { status: "accepted" });
		return { success: true };
	},

	uploadFootage: async (bookingId: string, rawVideoUrl: string) => {
		await updateRecord("bookings", bookingId, {
			rawVideoUrl,
			status: "footage_uploaded",
		});
		return { success: true };
	},

	assignEditor: async (bookingId: string, editor_id: string) => {
		await updateRecord("bookings", bookingId, {
			editor_id,
			status: "editor_assigned",
		});
		return { success: true };
	},

	submitEdit: async (bookingId: string, url: string) => {
		await updateRecord("bookings", bookingId, {
			editedVideoUrl: url,
			status: "edit_submitted",
		});
		return { success: true };
	},

	approve: async (bookingId: string) => {
		await updateRecord("bookings", bookingId, { status: "approved" });
		return { success: true };
	},

	requestRevision: async (bookingId: string, reason: string) => {
		await updateRecord("bookings", bookingId, {
			status: "revision_requested",
			revisionReason: reason,
		});
		return { success: true };
	},
};

export interface Message {
	id: number | string;
	sender_id: number | string;
	sender_role: string;
	receiver_id: number | string;
	receiver_role: string;
	content: string;
	status: string;
	created_at: string;
	read_at?: string | null;
}

export interface MessageListResponse {
	messages: Message[];
	current_user: {
		id: number | string;
		role: string;
	};
}

export const messageService = {
	send: async (data: {
		receiver_id: number;
		receiver_role: string;
		content: string;
	}) => {
		const currentUser = auth.currentUser;
		const senderProfile = currentUser
			? await getUserProfile(currentUser.uid)
			: null;
		const id = await createRecord("messages", {
			...data,
			sender_id: currentUser?.uid || "anonymous",
			sender_role: senderProfile?.role || "guest",
			status: "sent",
		});
		return {
			id,
			sender_id: currentUser?.uid || "anonymous",
			sender_role: senderProfile?.role || "guest",
			receiver_id: data.receiver_id,
			receiver_role: data.receiver_role,
			content: data.content,
			status: "sent",
			created_at: new Date().toISOString(),
		};
	},

	getAll: async (partnerId?: number) => {
		const currentUser = auth.currentUser;
		const senderProfile = currentUser
			? await getUserProfile(currentUser.uid)
			: null;
		const messages = await getRecords("messages");
		const filtered = messages.filter((message: any) => {
			if (!partnerId) return true;
			return (
				message.sender_id === partnerId || message.receiver_id === partnerId
			);
		});
		return {
			messages: filtered as Message[],
			current_user: {
				id: currentUser?.uid || "anonymous",
				role: senderProfile?.role || "guest",
			},
		};
	},
};

export const adminService = {
	getUsers: async () => {
		return getRecords("users");
	},

	getPilots: async () => {
		return getRecordsByField("users", "role", "pilot");
	},

	getReferrals: async () => {
		return getRecordsByField("users", "role", "referral");
	},
};

export const businessBookingService = {
	getAll: async (status?: string, search?: string) => {
		const bookings = await getRecords("bookings");
		return bookings
			.filter((booking: any) => booking.bookingType === "business")
			.filter((booking: any) => (status ? booking.status === status : true))
			.filter((booking: any) => {
				if (!search) return true;
				const haystack = `${booking.businessName || ""} ${booking.ownerName || ""} ${booking.email || ""}`.toLowerCase();
				return haystack.includes(search.toLowerCase());
			});
	},

	updateOrder: async (
		bookingId: string,
		payload: {
			status: string;
			admin_comments?: string;
			pilot_id?: string | null;
			editor_id?: string | null;
			total_cost?: number | null;
		},
	) => {
		await updateRecord("bookings", bookingId, payload);
		return { success: true };
	},
};

export const paymentService = {
	initiatePayment: async (bookingId: number | string, amount: number) => {
		const paymentId = await createRecord("payments", {
			booking_id: bookingId,
			amount,
			status: "success",
		});
		await updateRecord("bookings", String(bookingId), {
			payment_status: "paid",
			status: "payment_completed",
		});
		return {
			success: true,
			status: "success",
			payment_url: `/payment-callback?merchantTransactionId=${paymentId}`,
		};
	},

	checkPaymentStatus: async (merchantTransactionId: string) => {
		const snapshot = await getDoc(doc(db, "payments", merchantTransactionId));
		const status = snapshot.exists() ? snapshot.data().status : "success";
		return { success: true, status };
	},

	processRefund: async (
		merchantTransactionId: string,
		refundAmount: number,
		refundNote?: string,
	) => {
		await createRecord("refunds", {
			merchant_transaction_id: merchantTransactionId,
			refund_amount: refundAmount,
			refund_note: refundNote,
			status: "success",
		});
		return { success: true };
	},
};
