import { localDB, localAuth, costCalculator, statsCalculator } from "./localStorageService";

// Auth Service - uses localStorage
export const authService = {
	register: async (data: any) => {
		return localAuth.register(data);
	},

	login: async (data: any) => {
		return localAuth.login(data.email, data.password, data.role);
	},

	resetPassword: async (email: string) => {
		// In a real app, this would send an email. For demo, we just update the password
		const newPassword = prompt("Enter new password:");
		if (newPassword) {
			localAuth.updatePassword(email, newPassword);
		}
	},

	logout: async () => {
		localAuth.logout();
	},
};

export const otpService = {
	requestOtp: async (data: { email: string }) => {
		if (!data.email) throw new Error("Email is required");
		localStorage.setItem(`otp_verified_${data.email}`, "false");
		return { success: true, message: "OTP sent to your email (demo: use 123456)", demo_otp: "123456" };
	},
	verifyOtp: async (data: { email: string; otp: string }) => {
		if (!data.otp || !/^\d{6}$/.test(data.otp)) {
			return { success: false, error: "Invalid OTP" };
		}
		localStorage.setItem(`otp_verified_${data.email}`, "true");
		return { success: true };
	},
	isOtpVerified: (email: string) => {
		return localStorage.getItem(`otp_verified_${email}`) === "true";
	},
	clearOtp: (email: string) => {
		localStorage.removeItem(`otp_verified_${email}`);
	},
};

export const pilotService = {
	register: async (data: any) => {
		const id = localDB.pilots.create({
			...data,
			role: "pilot",
			is_approved: true,
			is_available: true,
			current_bookings: 0,
			rating: 0,
			total_reviews: 0,
			earnings: 0,
		});
		return { id };
	},
	apply: async (data: any) => {
		const id = localDB.pilots.create({
			...data,
			role: "pilot",
			is_approved: true,
			is_available: true,
			current_bookings: 0,
			rating: 0,
			total_reviews: 0,
			earnings: 0,
		});
		return { id };
	},
	getAll: async () => {
		return localDB.pilots.getAll();
	},
	getById: async (id: string) => {
		return localDB.pilots.getById(id);
	},
	update: async (id: string, data: any) => {
		localDB.pilots.update(id, data);
		return { success: true };
	},
};

export const editorService = {
	register: async (data: any) => {
		const id = localDB.editors.create({
			...data,
			role: "editor",
			is_approved: true,
			is_available: true,
			current_projects: 0,
			completed_projects: 0,
			rating: 0,
			earnings: 0,
		});
		return { id };
	},
	getAll: async () => {
		return localDB.editors.getAll();
	},
	getById: async (id: string) => {
		return localDB.editors.getById(id);
	},
	update: async (id: string, data: any) => {
		localDB.editors.update(id, data);
		return { success: true };
	},
};

export const referralService = {
	register: async (data: any) => {
		const referralCode = `REF${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
		const id = localDB.referrals.create({
			...data,
			role: "referral",
			referral_code: referralCode,
			referral_type: data.referralType || "individual",
			is_approved: true,
			total_referrals: 0,
			successful_referrals: 0,
			pending_referrals: 0,
			total_earnings: 0,
			paid_earnings: 0,
			pending_earnings: 0,
		});
		const referralLink = `${window.location.origin}/guest-signup?ref=${id}`;
		localDB.referrals.update(id, { referral_link: referralLink });
		return { referral_link: referralLink, id, referral_code: referralCode };
	},
	getAll: async () => {
		return localDB.referrals.getAll();
	},
	getById: async (id: string) => {
		return localDB.referrals.getById(id);
	},
};

export const bookingService = {
	create: async (data: any) => {
		const id = localDB.bookings.create(data);
		return { id };
	},

	getAll: async () => {
		return localDB.bookings.getAll();
	},

	getByClientId: async (clientId: string) => {
		return localDB.bookings.getByClientId(clientId);
	},

	getByPilotId: async (pilotId: string) => {
		return localDB.bookings.getByPilotId(pilotId);
	},

	getByEditorId: async (editorId: string) => {
		return localDB.bookings.getByEditorId(editorId);
	},

	accept: async (bookingId: string, pilotId: string) => {
		localDB.bookings.update(bookingId, { 
			status: "assigned", 
			pilot_id: pilotId,
			accepted_at: new Date().toISOString() 
		});
		return { success: true };
	},

	start: async (bookingId: string) => {
		localDB.bookings.update(bookingId, { 
			status: "in_progress",
			started_at: new Date().toISOString()
		});
		return { success: true };
	},

	uploadFootage: async (bookingId: string, rawVideoUrl: string) => {
		localDB.bookings.update(bookingId, {
			raw_video_url: rawVideoUrl,
			status: "footage_uploaded",
			completed_at: new Date().toISOString()
		});
		return { success: true };
	},

	assignEditor: async (bookingId: string, editor_id: string) => {
		localDB.bookings.update(bookingId, {
			editor_id,
			status: "editing",
		});
		return { success: true };
	},

	submitEdit: async (bookingId: string, url: string) => {
		localDB.bookings.update(bookingId, {
			edited_video_url: url,
			status: "review",
		});
		return { success: true };
	},

	approve: async (bookingId: string) => {
		localDB.bookings.update(bookingId, { 
			status: "completed",
			approved_at: new Date().toISOString()
		});
		return { success: true };
	},

	requestRevision: async (bookingId: string, reason: string) => {
		localDB.bookings.update(bookingId, {
			status: "revision_requested",
			revision_reason: reason,
		});
		return { success: true };
	},

	update: async (bookingId: string, data: any) => {
		localDB.bookings.update(bookingId, data);
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
		receiver_id: string;
		receiver_role: string;
		content: string;
	}, senderId: string, senderRole: string) => {
		const id = localDB.messages.create({
			...data,
			sender_id: senderId,
			sender_role: senderRole,
			status: "sent",
		});
		return {
			id,
			sender_id: senderId,
			sender_role: senderRole,
			receiver_id: data.receiver_id,
			receiver_role: data.receiver_role,
			content: data.content,
			status: "sent",
			created_at: new Date().toISOString(),
		};
	},

	getAll: async (userId: string, userRole: string, partnerId?: string) => {
		const messages = localDB.messages.getByUserId(userId);
		const filtered = partnerId
			? messages.filter((m: any) => 
					m.sender_id === partnerId || m.receiver_id === partnerId
				)
			: messages;
		return {
			messages: filtered as Message[],
			current_user: {
				id: userId,
				role: userRole,
			},
		};
	},
};

export const adminService = {
	getUsers: async () => {
		return localDB.users.getAll();
	},

	getPilots: async () => {
		return localDB.pilots.getAll();
	},

	getEditors: async () => {
		return localDB.editors.getAll();
	},

	getReferrals: async () => {
		return localDB.referrals.getAll();
	},

	getAllBookings: async () => {
		return localDB.bookings.getAll();
	},

	getBusinessBookings: async () => {
		return localDB.businessBookings.getAll();
	},

	getDashboardStats: async () => {
		return statsCalculator.getAdminStats();
	},

	updateUserApproval: async (id: string, isApproved: boolean, role: string) => {
		if (role === "pilot") {
			localDB.pilots.update(id, { is_approved: isApproved });
		} else if (role === "editor") {
			localDB.editors.update(id, { is_approved: isApproved });
		} else if (role === "referral") {
			localDB.referrals.update(id, { is_approved: isApproved });
		}
		return { success: true };
	},
};

export const businessBookingService = {
	create: async (data: any, userId: string) => {
		const cost = costCalculator.calculateBusinessBookingCost(data.businessSize || "small");
		const id = localDB.businessBookings.create({
			...data,
			user_id: userId,
			cost,
			status: "pending_approval",
			payment_status: "pending",
			otp_verified: true,
		});
		// Mark BBD as completed for user
		localDB.users.update(userId, { has_completed_bbd: true });
		return { id, cost };
	},

	getAll: async (status?: string, search?: string) => {
		const bookings = localDB.businessBookings.getAll();
		return bookings
			.filter((booking: any) => (status ? booking.status === status : true))
			.filter((booking: any) => {
				if (!search) return true;
				const haystack = `${booking.business_name || ""} ${booking.owner_name || ""} ${booking.email || ""}`.toLowerCase();
				return haystack.includes(search.toLowerCase());
			});
	},

	getByUserId: async (userId: string) => {
		return localDB.businessBookings.getByUserId(userId);
	},

	getById: async (id: string) => {
		return localDB.businessBookings.getById(id);
	},

	updateOrder: async (
		bookingId: string,
		payload: {
			status?: string;
			admin_comments?: string;
			pilot_id?: string | null;
			editor_id?: string | null;
			total_cost?: number | null;
			payment_status?: string;
		},
	) => {
		localDB.businessBookings.update(bookingId, payload);
		return { success: true };
	},

	checkBBDStatus: async (userId: string) => {
		const user = localDB.users.getById(userId);
		return { hasCompletedBBD: Boolean(user?.has_completed_bbd) };
	},
};

export const paymentService = {
	initiatePayment: async (bookingId: number | string, amount: number, bookingType: "booking" | "business_booking" = "booking") => {
		const paymentId = `TXN${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
		localDB.payments.create({
			id: paymentId,
			booking_id: bookingId,
			amount,
			status: "success",
		});
		// Update booking payment status
		if (bookingType === "business_booking") {
			localDB.businessBookings.update(String(bookingId), {
				payment_status: "paid",
				status: "payment_completed",
			});
		} else {
			localDB.bookings.update(String(bookingId), {
				payment_status: "paid",
				status: "payment_completed",
			});
		}
		return {
			success: true,
			status: "success",
			transaction_id: paymentId,
			payment_url: `/payment/callback?transactionId=${paymentId}&status=SUCCESS`,
		};
	},

	checkPaymentStatus: async (transactionId: string) => {
		return { success: true, status: "SUCCESS", transaction_id: transactionId };
	},

	processRefund: async (
		transactionId: string,
		refundAmount: number,
		refundNote?: string,
	) => {
		const refundId = `REF${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
		localDB.payments.create({
			id: refundId,
			merchant_transaction_id: transactionId,
			refund_amount: refundAmount,
			refund_note: refundNote,
			status: "success",
			type: "refund",
		});
		return { success: true, refund_id: refundId };
	},
};

// Client profile service
export const clientService = {
	updateProfile: async (userId: string, data: any) => {
		localDB.users.update(userId, data);
		return { success: true };
	},

	updatePassword: async (email: string, currentPassword: string, newPassword: string) => {
		// Verify current password
		try {
			localAuth.login(email, currentPassword);
			localAuth.updatePassword(email, newPassword);
			return { success: true };
		} catch {
			return { success: false, error: "Current password is incorrect" };
		}
	},

	getBookings: async (userId: string) => {
		const bookings = localDB.businessBookings.getByUserId(userId);
		const stats = statsCalculator.getClientStats(userId);
		return { success: true, bookings, stats };
	},
};

// Export localDB and utilities for direct access
export { localDB, localAuth, statsCalculator, costCalculator, CITY_LIST } from "./localStorageService";
