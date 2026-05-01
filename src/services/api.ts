import axios from "axios";

const API_URL = "http://localhost:5001/api";

// Create axios instance with base configuration
const api = axios.create({
	baseURL: API_URL,
	headers: {
		"Content-Type": "application/json",
	},
});

// Add token to requests if available
api.interceptors.request.use((config) => {
	const token = localStorage.getItem("token");
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

// Export api instance for direct use
export { api };

// Auth Services
export const authService = {
	register: async (data: any) => {
		const response = await api.post("/auth/register", data);
		localStorage.setItem("token", response.data.token);
		return response.data;
	},

	login: async (data: any) => {
		const response = await api.post("/auth/login", data);
		localStorage.setItem("token", response.data.token);
		return response.data;
	},

	logout: () => {
		localStorage.removeItem("token");
	},
};

// Pilot Services
export const pilotService = {
	register: async (data: any) => {
		const response = await api.post("/pilots/register", data);
		return response.data;
	},
	// New method for pilot applications
	apply: async (data: any) => {
		const response = await api.post("/pilots/apply", data);
		return response.data;
	},
};

// Editor Services
export const editorService = {
	register: async (data: any) => {
		const response = await api.post("/editors/register", data);
		return response.data;
	},
};

// Referral Services
export const referralService = {
	register: async (data: any) => {
		const response = await api.post("/referrals/register", data);
		return response.data;
	},
};

// Booking Services
export const bookingService = {
	create: async (data: any) => {
		const response = await api.post("/bookings", data);
		return response.data;
	},

	getAll: async () => {
		const response = await api.get("/bookings");
		return response.data;
	},

	accept: async (bookingId: number) => {
		const response = await api.post(`/bookings/${bookingId}/accept`);
		return response.data;
	},

	uploadFootage: async (bookingId: number, rawVideoUrl: string) => {
		const response = await api.post(`/bookings/${bookingId}/upload-footage`, {
			rawVideoUrl,
		});
		return response.data;
	},

	assignEditor: async (bookingId: number, editor_id: number) => {
		const response = await api.post(`/bookings/${bookingId}/assign-editor`, {
			editor_id,
		});
		return response.data;
	},

	submitEdit: async (bookingId: number, url: string) => {
		const response = await api.post(`/bookings/${bookingId}/submit-edit`, {
			url,
		});
		return response.data;
	},

	approve: async (bookingId: number) => {
		const response = await api.post(`/bookings/${bookingId}/approve`);
		return response.data;
	},

	requestRevision: async (bookingId: number, reason: string) => {
		const response = await api.post(`/bookings/${bookingId}/revision`, {
			reason,
		});
		return response.data;
	},
};

// Message types
export interface Message {
	id: number;
	sender_id: number;
	sender_role: string;
	receiver_id: number;
	receiver_role: string;
	content: string;
	status: string;
	created_at: string;
	read_at?: string | null;
}

export interface MessageListResponse {
	messages: Message[];
	current_user: {
		id: number;
		role: string;
	};
}

// Message Services
export const messageService = {
	send: async (data: {
		receiver_id: number;
		receiver_role: string;
		content: string;
	}) => {
		const response = await api.post("/messages", data);
		return response.data as Message;
	},

	getAll: async (partnerId?: number) => {
		const query = partnerId ? `?with=${partnerId}` : "";
		const response = await api.get(`/messages${query}`);
		return response.data as MessageListResponse;
	},
};

// Admin Services
export const adminService = {
	getUsers: async () => {
		const response = await api.get("/admin/users");
		return response.data;
	},

	getPilots: async () => {
		const response = await api.get("/admin/pilots");
		return response.data;
	},

	getReferrals: async () => {
		const response = await api.get("/admin/referrals");
		return response.data;
	},
};

// Business Booking Services (Admin)
export const businessBookingService = {
	getAll: async (status?: string, search?: string) => {
		const params = new URLSearchParams();
		if (status) params.append("status", status);
		if (search) params.append("search", search);
		const response = await api.get(
			`/admin/business-bookings?${params.toString()}`,
		);
		return response.data;
	},

	// Routes through the main Orders endpoint so emails, earnings & assignment all fire
	updateOrder: async (
		bookingId: number,
		payload: {
			status: string;
			admin_comments?: string;
			pilot_id?: number | null;
			editor_id?: number | null;
			total_cost?: number | null;
		},
	) => {
		const response = await api.put(`/admin/orders/${bookingId}`, payload);
		return response.data;
	},
};

// Payment Services
export const paymentService = {
	initiatePayment: async (bookingId: number, amount: number) => {
		const response = await api.post("/payment/initiate", {
			booking_id: bookingId,
			amount: amount,
		});
		return response.data;
	},

	checkPaymentStatus: async (merchantTransactionId: string) => {
		const response = await api.get(`/payment/status/${merchantTransactionId}`);
		return response.data;
	},

	processRefund: async (
		merchantTransactionId: string,
		refundAmount: number,
		refundNote?: string,
	) => {
		const response = await api.post("/payment/refund", {
			merchant_transaction_id: merchantTransactionId,
			refund_amount: refundAmount,
			refund_note: refundNote,
		});
		return response.data;
	},
};
