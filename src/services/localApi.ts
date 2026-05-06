import axios, { AxiosAdapter, AxiosResponse } from "axios";
import {
	EmailAuthProvider,
	reauthenticateWithCredential,
	updatePassword,
} from "firebase/auth";
import { auth } from "./firebase";
import {
	adminService,
	authService,
	bookingService,
	editorService,
	messageService,
	otpService,
	paymentService,
	pilotService,
	referralService,
} from "./api";
import {
	addOrMergeDoc,
	createRecord,
	deleteRecord,
	getRecord,
	getRecords,
	getRecordsByField,
	getUserProfile,
	updateRecord,
} from "./firestoreService";

type DataRecord = Record<string, unknown>;
type ApiBody = DataRecord | undefined;
type ApiResponse = { status: number; body: unknown };
type UserProfile = DataRecord & {
	uid?: string;
	role?: string;
	hasCompletedBBD?: boolean;
};

const CITY_LIST = [
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

const BUSINESS_BASE_COSTS: Record<string, number> = {
	"retail-store": 12000,
	restaurant: 12000,
	"office-space": 10000,
	hotel: 18000,
	"real-estate": 20000,
	"shopping-mall": 20000,
	"adventure-park": 15000,
	"activity-zone": 12000,
};

const BUSINESS_SIZE_MULTIPLIERS: Record<string, number> = {
	small: 1.0,
	medium: 1.5,
	large: 2.0,
	"extra-large": 3.0,
	enterprise: 0,
};

const EARNINGS_PERCENTAGES: Record<string, number> = {
	pilot: 0.65,
	editor: 0.1,
	referral: 0.1,
	hmx: 0.15,
};

const statusAliases: Record<string, string> = {
	requested: "REQUESTED",
	pending: "REQUESTED",
	approved: "APPROVED",
	completed: "COMPLETED",
	editing: "EDITING",
	edit_submitted: "EDIT_SUBMITTED",
	revision_requested: "REVISION_REQUESTED",
	pilot_assigned: "PILOT_ASSIGNED",
	shoot_completed: "SHOOT_COMPLETED",
	payment_pending: "REQUESTED",
	payment_completed: "REQUESTED",
};

const normalizeStatus = (status?: string | null) => {
	if (!status) return "";
	const cleaned = String(status).trim().toLowerCase();
	return statusAliases[cleaned] || cleaned.toUpperCase();
};

const normalizePaymentStatus = (status?: string | null) => {
	if (!status) return "pending";
	const cleaned = String(status).trim().toLowerCase();
	if (cleaned === "escrow") return "paid";
	if (cleaned === "released") return "paid";
	if (cleaned === "success") return "paid";
	return cleaned;
};

const asString = (value: unknown, fallback = "") =>
	typeof value === "string" ? value : fallback;

const hasSeconds = (value: unknown): value is { seconds: number } => {
	if (!value || typeof value !== "object") return false;
	return (
		"seconds" in value &&
		typeof (value as Record<string, unknown>).seconds === "number"
	);
};

const toIsoString = (value: unknown) => {
	if (!value || typeof value !== "object") return undefined;
	if (
		"toDate" in value &&
		typeof (value as { toDate?: () => Date }).toDate === "function"
	) {
		return (value as { toDate: () => Date }).toDate().toISOString();
	}
	return undefined;
};

const nowIso = () => new Date().toISOString();

const buildResponse = (status: number, body: unknown): ApiResponse => ({
	status,
	body,
});

const safeJsonParse = (raw: unknown): ApiBody => {
	if (!raw) return undefined;
	if (typeof raw === "object") return raw as DataRecord;
	try {
		return JSON.parse(raw as string) as DataRecord;
	} catch {
		return undefined;
	}
};

const getCurrentUser = async (): Promise<UserProfile | null> => {
	const currentUser = auth.currentUser;
	if (!currentUser) return null;
	const profile = (await getUserProfile(currentUser.uid)) as UserProfile | null;
	return profile ? { ...profile, uid: currentUser.uid } : null;
};

const calculateBusinessCost = (category?: string, businessSize?: string) => {
	if (businessSize === "enterprise") return { cost: 0, error: null };
	const baseCost = BUSINESS_BASE_COSTS[category || ""] || 10000;
	const multiplier = BUSINESS_SIZE_MULTIPLIERS[businessSize || "medium"] || 1.0;
	const total = baseCost * multiplier;
	return { cost: Math.round(total), error: null };
};

const calculateEarnings = (totalAmount: number, userType: string) => {
	const percentage = EARNINGS_PERCENTAGES[userType] || 0;
	return Math.round(totalAmount * percentage * 100) / 100;
};

const filterBookingsByRole = async (
	bookings: DataRecord[],
	role?: string,
	uid?: string,
) => {
	if (!role || !uid) return bookings;
	if (role === "admin") return bookings;
	if (role === "pilot") return bookings.filter((b) => b.pilot_id === uid);
	if (role === "editor") return bookings.filter((b) => b.editor_id === uid);
	return bookings.filter((b) => b.user_id === uid || b.client_id === uid);
};

const getBookingById = async (
	bookingId: string,
): Promise<DataRecord | null> => {
	return (await getRecord("bookings", bookingId)) as DataRecord | null;
};

const handleAuthVerify = async () => {
	const user = await getCurrentUser();
	if (!user)
		return buildResponse(401, { success: false, error: "Unauthorized" });
	return buildResponse(200, { success: true, user });
};

const handleAuthChangePassword = async (body: ApiBody) => {
	const user = auth.currentUser;
	if (!user)
		return buildResponse(401, { success: false, error: "Unauthorized" });

	const currentPassword = asString(body?.current_password);
	const newPassword = asString(body?.new_password);
	if (!newPassword) {
		return buildResponse(400, {
			success: false,
			error: "New password is required",
		});
	}

	if (currentPassword && user.email) {
		try {
			const credential = EmailAuthProvider.credential(
				user.email,
				currentPassword,
			);
			await reauthenticateWithCredential(user, credential);
		} catch {
			return buildResponse(400, {
				success: false,
				error: "Invalid current password",
			});
		}
	}

	await updatePassword(user, newPassword);
	return buildResponse(200, { success: true });
};

const handleClientProfileUpdate = async (body: ApiBody) => {
	const user = await getCurrentUser();
	if (!user?.uid)
		return buildResponse(401, { success: false, error: "Unauthorized" });
	await updateRecord("users", user.uid, body || {});
	return buildResponse(200, { success: true });
};

const handleClientPasswordUpdate = async (body: ApiBody) => {
	return handleAuthChangePassword(body);
};

const handleClientAccountDelete = async () => {
	const user = auth.currentUser;
	if (!user)
		return buildResponse(401, { success: false, error: "Unauthorized" });
	await updateRecord("users", user.uid, { status: "deleted" });
	await auth.signOut();
	return buildResponse(200, { success: true });
};

const handleBookingsList = async () => {
	const user = await getCurrentUser();
	const bookings = (await getRecords("bookings")) as DataRecord[];
	const filtered = await filterBookingsByRole(bookings, user?.role, user?.uid);
	return buildResponse(200, filtered);
};

const handleClientBookings = async () => {
	const user = await getCurrentUser();
	if (!user?.uid) return buildResponse(200, []);
	const bookings = (await getRecords("bookings")) as DataRecord[];
	const filtered = bookings.filter(
		(b) => b.user_id === user.uid || b.client_id === user.uid,
	);
	return buildResponse(200, filtered);
};

const handleBookingCreate = async (body: ApiBody) => {
	const user = await getCurrentUser();
	const base = body || {};
	const payload = {
		...base,
		user_id: base.user_id || user?.uid || base.client_id || "guest",
		status: normalizeStatus(asString(base.status, "REQUESTED")),
		payment_status: normalizePaymentStatus(
			asString(base.payment_status, "pending"),
		),
		created_at: base.created_at || nowIso(),
		updated_at: base.updated_at || nowIso(),
	};
	const result = await bookingService.create(payload);
	return buildResponse(200, { success: true, id: result.id });
};

const handleBookingUpdate = async (bookingId: string, body: ApiBody) => {
	await updateRecord("bookings", bookingId, body || {});
	return buildResponse(200, { success: true });
};

const handleBookingDelete = async (bookingId: string) => {
	await deleteRecord("bookings", bookingId);
	return buildResponse(200, { success: true });
};

const handleBookingStatusUpdate = async (
	bookingId: string,
	updates: Record<string, unknown>,
) => {
	await updateRecord("bookings", bookingId, updates);
	return buildResponse(200, { success: true });
};

const handleBusinessCalculateCost = async (body: ApiBody) => {
	const category = body?.category as string | undefined;
	const businessSize = body?.business_size as string | undefined;
	const { cost, error } = calculateBusinessCost(category, businessSize);
	if (error) return buildResponse(400, { success: false, error });
	return buildResponse(200, {
		success: true,
		cost,
		advance_payment: cost / 2,
	});
};

const handleBusinessBookingCreate = async (body: ApiBody) => {
	const user = await getCurrentUser();
	const base = body || {};
	const bookingPayload = {
		...base,
		bookingType: "business",
		booking_category: "business",
		status: normalizeStatus(asString(base.status, "REQUESTED")),
		payment_status: normalizePaymentStatus(
			asString(base.payment_status, "pending"),
		),
		user_id: base.user_id || user?.uid || base.client_id || "guest",
	};
	const result = await bookingService.create(bookingPayload);
	if (user?.uid) {
		await updateRecord("users", user.uid, { hasCompletedBBD: true });
	}
	return buildResponse(200, {
		success: true,
		booking_id: result.id,
		cost: base.cost,
	});
};

const handleBusinessBookingsList = async (query: URLSearchParams) => {
	const status = query.get("status") || "";
	const search = query.get("search") || "";
	const bookings = (await getRecords("bookings")) as DataRecord[];
	const filtered = bookings
		.filter(
			(booking) =>
				booking.bookingType === "business" ||
				booking.booking_category === "business",
		)
		.filter((booking) =>
			status
				? String(booking.status || "").toLowerCase() === status.toLowerCase()
				: true,
		)
		.filter((booking) => {
			if (!search) return true;
			const haystack =
				`${booking.businessName || ""} ${booking.ownerName || ""} ${booking.email || ""}`.toLowerCase();
			return haystack.includes(search.toLowerCase());
		});
	return buildResponse(200, { success: true, bookings: filtered });
};

const handleBusinessBookingStatusUpdate = async (
	bookingId: string,
	body: ApiBody,
) => {
	const newStatus = body?.status
		? normalizeStatus(asString(body.status))
		: undefined;
	await updateRecord("bookings", bookingId, {
		...(newStatus ? { status: newStatus } : {}),
		admin_comments: body?.admin_comments,
	});
	return buildResponse(200, { success: true });
};

const handleBusinessBbdStatus = async () => {
	const user = await getCurrentUser();
	if (!user?.uid)
		return buildResponse(200, { success: false, error: "Unauthorized" });
	const bookings = (await getRecords("bookings")) as DataRecord[];
	const latest = bookings
		.filter(
			(b) =>
				b.user_id === user.uid &&
				(b.bookingType === "business" || b.booking_category === "business"),
		)
		.sort(
			(a, b) =>
				(hasSeconds(b.createdAt) ? b.createdAt.seconds : 0) -
				(hasSeconds(a.createdAt) ? a.createdAt.seconds : 0),
		)[0];
	return buildResponse(200, {
		success: true,
		hasCompletedBBD: Boolean(user.hasCompletedBBD),
		bbd_submitted: Boolean(user.hasCompletedBBD),
		booking: latest || null,
	});
};

const handleBusinessUpdateBbd = async (body: ApiBody) => {
	const user = await getCurrentUser();
	if (!user?.uid)
		return buildResponse(401, { success: false, error: "Unauthorized" });
	const completed = Boolean(body?.hasCompletedBBD);
	await updateRecord("users", user.uid, { hasCompletedBBD: completed });
	return buildResponse(200, { success: true, hasCompletedBBD: completed });
};

const handleAreaMismatchReport = async (body: ApiBody) => {
	const bookingId = String(body?.booking_id || "");
	const booking = await getBookingById(bookingId);
	if (!booking)
		return buildResponse(404, { success: false, error: "Booking not found" });
	const actualArea = Number(body?.actual_area || 0);
	const { cost: newCost } = calculateBusinessCost(
		(booking.property_type || booking.category) as string | undefined,
		(booking.business_size || booking.businessSize) as string | undefined,
	);
	const extraCost =
		newCost - Number(booking.total_cost || booking.totalCost || 0);
	await updateRecord("bookings", bookingId, {
		actual_area_size: actualArea,
		area_mismatch_status: "reported",
		extra_cost: extraCost,
	});
	return buildResponse(200, { success: true, extra_cost: extraCost });
};

const handleAreaMismatchResolve = async (body: ApiBody) => {
	const bookingId = String(body?.booking_id || "");
	const booking = await getBookingById(bookingId);
	if (!booking)
		return buildResponse(404, { success: false, error: "Booking not found" });
	const choice = body?.choice || "keep_original";
	if (choice === "pay_extra") {
		const newTotal =
			Number(booking.total_cost || 0) + Number(booking.extra_cost || 0);
		await updateRecord("bookings", bookingId, {
			total_cost: newTotal,
			area_mismatch_status: "resolved",
			area_mismatch_choice: "pay_extra",
			payment_status: "pending",
		});
	} else {
		await updateRecord("bookings", bookingId, {
			area_mismatch_status: "resolved",
			area_mismatch_choice: "keep_original",
		});
	}
	return buildResponse(200, { success: true });
};

const handleAdminUsersList = async () => {
	const users = (await adminService.getUsers()) as DataRecord[];
	const mapped = users.map((user) => ({
		...user,
		business_name:
			user.business_name ||
			user.businessName ||
			user.company_name ||
			user.brand_name ||
			user.name ||
			"Business",
		contact_name:
			user.contact_name || user.ownerName || user.username || user.name || "",
		approval_status: user.approval_status || "pending",
		created_at:
			toIsoString(user.createdAt) || (user.created_at as string) || nowIso(),
	}));
	return buildResponse(200, mapped);
};

const handleAdminUsersApproval = async (userId: string, body: ApiBody) => {
	await updateRecord("users", userId, {
		approval_status: body?.approval_status || "pending",
	});
	return buildResponse(200, { success: true });
};

const handleAdminPilotsList = async () => {
	const users = (await getRecordsByField(
		"users",
		"role",
		"pilot",
	)) as DataRecord[];
	return buildResponse(200, users);
};

const handleAdminEditorsList = async () => {
	const users = (await getRecordsByField(
		"users",
		"role",
		"editor",
	)) as DataRecord[];
	return buildResponse(200, users);
};

const handleAdminReferralsList = async () => {
	const referrals = (await getRecords("referrals")) as DataRecord[];
	return buildResponse(200, referrals);
};

const handleAdminClientsList = async () => {
	const users = (await getRecordsByField(
		"users",
		"role",
		"client",
	)) as DataRecord[];
	const mapped = users.map((user) => ({
		...user,
		business_name:
			user.business_name ||
			user.company_name ||
			user.businessName ||
			user.brand_name ||
			user.name ||
			"Client",
		contact_name:
			user.contact_name || user.ownerName || user.name || user.username || "",
		approval_status: user.approval_status || "approved",
		created_at:
			toIsoString(user.createdAt) || (user.created_at as string) || nowIso(),
	}));
	return buildResponse(200, mapped);
};

const handleAdminOrdersList = async (query: URLSearchParams) => {
	const statusFilter = query.get("status") || "";
	const guestReferral = query.get("guest_referral") === "1";
	const bookings = (await getRecords("bookings")) as DataRecord[];
	let filtered = bookings;
	if (statusFilter) {
		filtered = filtered.filter((booking) => {
			const status = normalizeStatus(asString(booking.status));
			return (
				status === normalizeStatus(statusFilter) ||
				String(booking.status || "").toLowerCase() ===
					statusFilter.toLowerCase()
			);
		});
	}
	if (guestReferral) {
		filtered = filtered.filter(
			(booking) => booking.referral_code || booking.referral_id,
		);
	}
	return buildResponse(200, filtered);
};

const handleAdminOrderUpdate = async (orderId: string, body: ApiBody) => {
	await updateRecord("bookings", orderId, body || {});
	return buildResponse(200, { success: true });
};

const handleAdminOrderDelete = async (orderId: string) => {
	await deleteRecord("bookings", orderId);
	return buildResponse(200, { success: true });
};

const handleAdminDashboardStats = async () => {
	const bookings = (await getRecords("bookings")) as DataRecord[];
	const pendingVideos = bookings.filter(
		(b) => normalizeStatus(asString(b.status)) === "EDIT_SUBMITTED",
	).length;
	const activeOrders = bookings.filter((b) => {
		const status = normalizeStatus(asString(b.status));
		return status && !["COMPLETED", "CANCELLED"].includes(status);
	}).length;
	const completedOrders = bookings.filter(
		(b) => normalizeStatus(asString(b.status)) === "COMPLETED",
	).length;
	const revenueMTD = bookings
		.filter(
			(b) => normalizePaymentStatus(asString(b.payment_status)) === "paid",
		)
		.reduce((sum: number, b) => sum + Number(b.total_cost || b.amount || 0), 0);
	return buildResponse(200, {
		pendingVideos,
		activeOrders,
		revenueMTD,
		completedOrders,
	});
};

const handleAdminDashboardActivities = async () => {
	const bookings = (await getRecords("bookings")) as DataRecord[];
	const activities = bookings.slice(0, 10).map((booking, index: number) => ({
		id: index + 1,
		type: "order",
		action: `Order ${normalizeStatus(asString(booking.status)) || "UPDATED"}`,
		timestamp: toIsoString(booking.updatedAt) || nowIso(),
		details: booking.location_address || booking.address || "",
	}));
	return buildResponse(200, activities);
};

const handleAdminSettingsGet = async () => {
	const settings = (await getRecords("settings")) as DataRecord[];
	return buildResponse(200, settings[0] || {});
};

const handleAdminSettingsUpdate = async (body: ApiBody) => {
	const settings = (await getRecords("settings")) as DataRecord[];
	const settingsId = asString(settings[0]?.id);
	if (settingsId) {
		await updateRecord("settings", settingsId, body || {});
	} else {
		await createRecord("settings", body || {});
	}
	return buildResponse(200, { success: true });
};

const handleAdminPayments = async () => {
	const payments = (await getRecords("payments")) as DataRecord[];
	const bookings = (await getRecords("bookings")) as DataRecord[];
	const users = (await getRecords("users")) as DataRecord[];
	const result = payments.map((payment) => {
		const booking = bookings.find(
			(b) => String(b.id) === String(payment.booking_id),
		);
		const user = users.find((u) => String(u.id) === String(booking?.user_id));
		return {
			...payment,
			transaction_id: payment.transaction_id || payment.id,
			client_name: user?.name || user?.username || user?.email || "Client",
			client_company: booking?.brand_name || booking?.businessName || "",
			client_email: user?.email || booking?.guest_email || "",
			client_phone: user?.phone || booking?.guest_phone || "",
			pilot_name: booking?.pilot_name || "",
			pilot_email: booking?.pilot_email || "",
			pilot_phone: booking?.pilot_phone || "",
			referral_name: booking?.referral_name || "",
			referral_email: booking?.referral_email || "",
			industry: booking?.property_type || booking?.category || "",
			location: booking?.location_address || booking?.address || "",
		};
	});
	return buildResponse(200, result);
};

const handleAdminCancellations = async (method: string, body: ApiBody) => {
	if (method === "POST") {
		const id = await createRecord("cancellations", {
			...body,
			status: body?.status || "pending",
		});
		return buildResponse(200, { success: true, id });
	}
	const cancellations = (await getRecords("cancellations")) as DataRecord[];
	return buildResponse(200, cancellations);
};

const handleAdminPreList = async (method: string, body: ApiBody) => {
	if (method === "POST") {
		const id = await createRecord("pre_list", body || {});
		return buildResponse(200, { success: true, id });
	}
	const items = (await getRecords("pre_list")) as DataRecord[];
	return buildResponse(200, items);
};

const handleAdminPreListUpdate = async (
	itemId: string,
	method: string,
	body: ApiBody,
) => {
	if (method === "PUT") {
		await updateRecord("pre_list", itemId, body || {});
		return buildResponse(200, { success: true });
	}
	if (method === "DELETE") {
		await deleteRecord("pre_list", itemId);
		return buildResponse(200, { success: true });
	}
	return buildResponse(405, { success: false });
};

const handleAdminVideoReviews = async (
	method: string,
	videoId?: string,
	body?: ApiBody,
) => {
	if (method === "GET") {
		const reviews = (await getRecords("video_reviews")) as DataRecord[];
		return buildResponse(200, reviews);
	}
	if (videoId) {
		await updateRecord("video_reviews", videoId, body || {});
		return buildResponse(200, { success: true });
	}
	return buildResponse(405, { success: false });
};

const handleAdminEmailTemplates = async (
	method: string,
	templateName?: string,
	body?: ApiBody,
) => {
	if (method === "GET") {
		if (templateName) {
			const tpl = await getRecord("email_templates", templateName);
			return buildResponse(200, tpl || {});
		}
		const templates = (await getRecords("email_templates")) as DataRecord[];
		return buildResponse(200, templates);
	}
	if (method === "POST") {
		const templateId = asString(body?.name);
		if (templateId) {
			await addOrMergeDoc("email_templates", templateId, body || {});
			return buildResponse(200, { success: true, id: templateId });
		}
		const id = await createRecord("email_templates", body || {});
		return buildResponse(200, { success: true, id });
	}
	if (method === "PUT" && templateName) {
		await addOrMergeDoc("email_templates", templateName, {
			name: templateName,
			...body,
		});
		return buildResponse(200, { success: true });
	}
	return buildResponse(405, { success: false });
};

const handleAdminApplications = async (
	method: string,
	applicationType?: string,
	applicationId?: string,
	body?: ApiBody,
) => {
	const collectionMap: Record<string, string> = {
		pilot: "pilotApplications",
		editor: "editorApplications",
		referral: "referralApplications",
		business: "business_client_applications",
		business_client: "business_client_applications",
	};
	const collection = applicationType
		? collectionMap[applicationType]
		: undefined;
	if (!collection)
		return buildResponse(400, {
			success: false,
			error: "Invalid application type",
		});
	if (method === "GET") {
		const apps = (await getRecords(collection)) as DataRecord[];
		return buildResponse(200, { applications: apps });
	}
	if (method === "POST" && applicationId) {
		const status = body?.status || body?.action || "approved";
		await updateRecord(collection, applicationId, {
			status,
			admin_comments: body?.comments || body?.admin_comments || "",
		});
		return buildResponse(200, { success: true });
	}
	return buildResponse(405, { success: false });
};

const handlePilotAssignedOrders = async () => {
	const user = await getCurrentUser();
	const bookings = (await getRecords("bookings")) as DataRecord[];
	const filtered = bookings.filter((b) => b.pilot_id === user?.uid);
	return buildResponse(200, filtered);
};

const handleEditorAssignedOrders = async () => {
	const user = await getCurrentUser();
	const bookings = (await getRecords("bookings")) as DataRecord[];
	const filtered = bookings.filter((b) => b.editor_id === user?.uid);
	return buildResponse(200, filtered);
};

const filterOrdersByStatus = (orders: DataRecord[], status: string) => {
	const normalized = normalizeStatus(status);
	return orders.filter(
		(order) => normalizeStatus(order.status as string | null) === normalized,
	);
};

const handleVideoSubmissions = async (
	method: string,
	role: "pilot" | "editor",
	body?: ApiBody,
) => {
	if (method === "POST") {
		const id = await createRecord("video_submissions", {
			...body,
			role,
			status: body?.status || "submitted",
		});
		return buildResponse(200, { success: true, id });
	}
	const submissions = (await getRecords("video_submissions")) as DataRecord[];
	const filtered = submissions.filter((s) => s.role === role);
	return buildResponse(200, filtered);
};

const handleSubmissionHistory = async (orderId: string) => {
	const submissions = (await getRecords("video_submissions")) as DataRecord[];
	const filtered = submissions.filter(
		(s) => String(s.order_id || s.booking_id) === String(orderId),
	);
	return buildResponse(200, filtered);
};

const handlePilotFinalReview = async () => {
	const bookings = (await getRecords("bookings")) as DataRecord[];
	const filtered = bookings.filter(
		(b) => normalizeStatus(b.status as string | null) === "EDIT_SUBMITTED",
	);
	return buildResponse(200, filtered);
};

const handlePilotEarnings = async () => {
	const user = await getCurrentUser();
	const bookings = (await getRecords("bookings")) as DataRecord[];
	const completed = bookings.filter(
		(b) =>
			b.pilot_id === user?.uid &&
			normalizeStatus(b.status as string | null) === "COMPLETED",
	);
	const total = completed.reduce(
		(sum: number, b) =>
			sum + calculateEarnings(Number(b.total_cost || b.amount || 0), "pilot"),
		0,
	);
	return buildResponse(200, { total_earnings: total });
};

const handleEditorEarnings = async () => {
	const user = await getCurrentUser();
	const bookings = (await getRecords("bookings")) as DataRecord[];
	const completed = bookings.filter(
		(b) =>
			b.editor_id === user?.uid &&
			normalizeStatus(b.status as string | null) === "COMPLETED",
	);
	const total = completed.reduce(
		(sum: number, b) =>
			sum + calculateEarnings(Number(b.total_cost || b.amount || 0), "editor"),
		0,
	);
	return buildResponse(200, { total_earnings: total });
};

const handleMessages = async (
	method: string,
	body?: ApiBody,
	query?: URLSearchParams,
) => {
	if (method === "POST") {
		if (!body)
			return buildResponse(400, {
				success: false,
				error: "Invalid message payload",
			});
		const message = await messageService.send(
			body as { receiver_id: number; receiver_role: string; content: string },
		);
		return buildResponse(200, message);
	}
	const partnerId = query?.get("partnerId");
	const result = await messageService.getAll(
		partnerId ? Number(partnerId) : undefined,
	);
	return buildResponse(200, result);
};

const handlePaymentInitiate = async (body: ApiBody) => {
	const rawId = body?.booking_id ?? body?.bookingId;
	const bookingId = typeof rawId === "number" ? rawId : asString(rawId);
	const amount = Number(body?.amount || 0);
	if (!bookingId)
		return buildResponse(400, {
			success: false,
			error: "Booking ID is required",
		});
	const result = await paymentService.initiatePayment(bookingId, amount);
	return buildResponse(200, result);
};

const handlePaymentStatus = async (transactionId: string) => {
	const result = await paymentService.checkPaymentStatus(transactionId);
	return buildResponse(200, result);
};

const handlePaymentRefund = async (body: ApiBody) => {
	const transactionId = asString(
		body?.merchantTransactionId || body?.merchant_transaction_id,
	);
	if (!transactionId)
		return buildResponse(400, {
			success: false,
			error: "Transaction ID is required",
		});
	const result = await paymentService.processRefund(
		transactionId,
		Number(body?.amount || body?.refund_amount || 0),
		body?.note || body?.refund_note,
	);
	return buildResponse(200, result);
};

const handleAdminCreateUser = async (role: string, body: ApiBody) => {
	const id = await createRecord("users", {
		...body,
		role,
		status: body?.status || "active",
		approval_status: body?.approval_status || "approved",
	});
	return buildResponse(200, { success: true, id });
};

const handleAdminUserDetails = async (userId: string) => {
	const user = await getRecord("users", userId);
	return buildResponse(200, user || {});
};

const handleAdminReferralDetails = async (referralId: string) => {
	const referral = await getRecord("referrals", referralId);
	if (referral) return buildResponse(200, referral);
	return handleAdminUserDetails(referralId);
};

const handleInquiries = async (
	method: string,
	inquiryId?: string,
	body?: ApiBody,
) => {
	if (method === "GET") {
		const inquiries = await getRecords("inquiries");
		return buildResponse(200, inquiries);
	}
	if (method === "PUT" && inquiryId) {
		await updateRecord("inquiries", inquiryId, body || {});
		return buildResponse(200, { success: true });
	}
	if (method === "POST" && inquiryId) {
		await updateRecord("inquiries", inquiryId, {
			status: "replied",
			reply: body?.message || "",
		});
		return buildResponse(200, { success: true });
	}
	return buildResponse(405, { success: false });
};

const handleTestEmail = async () =>
	buildResponse(200, { success: true, message: "Email queued (demo)" });

const handleRequest = async (
	method: string,
	path: string,
	query: URLSearchParams,
	body: ApiBody,
) => {
	if (path === "/api/health") return buildResponse(200, { status: "ok" });

	if (path === "/api/auth/register" && method === "POST")
		return buildResponse(200, await authService.register(body));
	if (path === "/api/auth/login" && method === "POST")
		return buildResponse(200, await authService.login(body));
	if (path === "/api/auth/verify" && method === "GET")
		return handleAuthVerify();
	if (path === "/api/auth/change-password" && method === "POST")
		return handleAuthChangePassword(body);
	if (path === "/api/auth/reset-password" && method === "POST") {
		const email = asString(body?.email);
		if (!email)
			return buildResponse(400, { success: false, error: "Email is required" });
		await authService.resetPassword(email);
		return buildResponse(200, { success: true });
	}
	if (path === "/api/auth/request-otp" && method === "POST") {
		const email = asString(body?.email);
		if (!email)
			return buildResponse(400, { success: false, error: "Email is required" });
		return buildResponse(200, await otpService.requestOtp({ email }));
	}
	if (path === "/api/auth/verify-otp" && method === "POST") {
		const email = asString(body?.email);
		const otp = asString(body?.otp);
		if (!email || !otp)
			return buildResponse(400, {
				success: false,
				error: "Email and OTP are required",
			});
		return buildResponse(200, await otpService.verifyOtp({ email, otp }));
	}
	if (path === "/api/auth/otp-login" && method === "POST")
		return buildResponse(200, { success: true });

	if (path === "/api/clients/profile" && method === "PUT")
		return handleClientProfileUpdate(body);
	if (path === "/api/clients/password" && method === "PUT")
		return handleClientPasswordUpdate(body);
	if (path === "/api/clients/account" && method === "DELETE")
		return handleClientAccountDelete();
	if (path === "/api/clients/bookings" && method === "GET")
		return handleClientBookings();

	if (path === "/api/bookings" && method === "GET") return handleBookingsList();
	if (path === "/api/bookings" && method === "POST")
		return handleBookingCreate(body);

	if (path === "/api/business/calculate-cost" && method === "POST")
		return handleBusinessCalculateCost(body);
	if (
		(path === "/api/business/bookings" || path === "/api/bookings/business") &&
		method === "POST"
	)
		return handleBusinessBookingCreate(body);
	if (path === "/api/admin/business-bookings" && method === "GET")
		return handleBusinessBookingsList(query);
	if (
		path.startsWith("/api/admin/business-bookings/") &&
		path.endsWith("/status") &&
		method === "PUT"
	) {
		const bookingId = path.split("/")[4];
		return handleBusinessBookingStatusUpdate(bookingId, body);
	}
	if (path === "/api/business/booking-status" && method === "GET")
		return handleBusinessBbdStatus();
	if (path === "/api/business/update-bbd-status" && method === "POST")
		return handleBusinessUpdateBbd(body);
	if (path === "/api/business/report-mismatch" && method === "POST")
		return handleAreaMismatchReport(body);
	if (path === "/api/business/resolve-mismatch" && method === "POST")
		return handleAreaMismatchResolve(body);

	if (path === "/api/guest/bookings" && method === "POST")
		return handleBookingCreate(body);

	if (path.startsWith("/api/bookings/") && method === "PUT") {
		const bookingId = path.split("/")[3];
		return handleBookingUpdate(bookingId, body);
	}
	if (path.startsWith("/api/bookings/") && method === "DELETE") {
		const bookingId = path.split("/")[3];
		return handleBookingDelete(bookingId);
	}
	if (path.endsWith("/accept") && method === "POST") {
		const bookingId = path.split("/")[3];
		return handleBookingStatusUpdate(bookingId, { status: "PILOT_ASSIGNED" });
	}
	if (path.endsWith("/claim") && method === "POST") {
		const bookingId = path.split("/")[3];
		return handleBookingStatusUpdate(bookingId, { status: "PILOT_ASSIGNED" });
	}
	if (path.endsWith("/pilot-cancel") && method === "POST") {
		const bookingId = path.split("/")[3];
		return handleBookingStatusUpdate(bookingId, { status: "CANCELLED" });
	}
	if (path.endsWith("/upload-footage") && method === "POST") {
		const bookingId = path.split("/")[3];
		return handleBookingStatusUpdate(bookingId, {
			raw_video_url: body?.raw_video_url || body?.rawVideoUrl,
			status: "SHOOT_COMPLETED",
		});
	}
	if (path.endsWith("/assign-editor") && method === "POST") {
		const bookingId = path.split("/")[3];
		return handleBookingStatusUpdate(bookingId, {
			editor_id: body?.editor_id,
			status: "EDITING",
		});
	}
	if (path.endsWith("/submit-edit") && method === "POST") {
		const bookingId = path.split("/")[3];
		return handleBookingStatusUpdate(bookingId, {
			editedVideoUrl: body?.url || body?.editedVideoUrl,
			status: "EDIT_SUBMITTED",
		});
	}
	if (path.endsWith("/approve") && method === "POST") {
		const bookingId = path.split("/")[3];
		return handleBookingStatusUpdate(bookingId, { status: "APPROVED" });
	}
	if (path.endsWith("/revision") && method === "POST") {
		const bookingId = path.split("/")[3];
		return handleBookingStatusUpdate(bookingId, {
			status: "REVISION_REQUESTED",
			revisionReason: body?.reason,
		});
	}
	if (path.endsWith("/start-revision") && method === "POST") {
		const bookingId = path.split("/")[3];
		return handleBookingStatusUpdate(bookingId, { status: "EDITING" });
	}
	if (path.endsWith("/complete") && method === "POST") {
		const bookingId = path.split("/")[3];
		return handleBookingStatusUpdate(bookingId, {
			status: "COMPLETED",
			completed_date: nowIso(),
		});
	}
	if (path.endsWith("/start") && method === "POST") {
		const bookingId = path.split("/")[3];
		return handleBookingStatusUpdate(bookingId, { status: "PILOT_ASSIGNED" });
	}
	if (path.endsWith("/payment") && method === "POST") {
		const bookingId = path.split("/")[3];
		return handleBookingStatusUpdate(bookingId, { payment_status: "paid" });
	}

	if (path === "/api/messages" && (method === "GET" || method === "POST"))
		return handleMessages(method, body, query);

	if (path === "/api/admin/users" && method === "GET")
		return handleAdminUsersList();
	if (
		path.startsWith("/api/admin/users/") &&
		path.endsWith("/approval") &&
		method === "PUT"
	) {
		const userId = path.split("/")[4];
		return handleAdminUsersApproval(userId, body);
	}

	if (path === "/api/admin/pilots" && method === "GET")
		return handleAdminPilotsList();
	if (path === "/api/admin/editors" && method === "GET")
		return handleAdminEditorsList();
	if (path === "/api/admin/referrals" && method === "GET")
		return handleAdminReferralsList();
	if (path === "/api/admin/clients" && method === "GET")
		return handleAdminClientsList();
	if (path === "/api/admin/bookings" && method === "POST")
		return handleBookingCreate(body);

	if (path === "/api/admin/pilots/create" && method === "POST")
		return handleAdminCreateUser("pilot", body);
	if (path === "/api/admin/editors/create" && method === "POST")
		return handleAdminCreateUser("editor", body);
	if (path === "/api/admin/referrals/create" && method === "POST")
		return handleAdminCreateUser("referral", body);

	if (path.startsWith("/api/admin/pilots/") && method === "GET") {
		const pilotId = path.split("/")[4];
		return handleAdminUserDetails(pilotId);
	}
	if (path.startsWith("/api/admin/pilots/") && method === "PUT") {
		const pilotId = path.split("/")[4];
		await updateRecord("users", pilotId, body || {});
		return buildResponse(200, { success: true });
	}
	if (path.startsWith("/api/admin/pilots/") && method === "DELETE") {
		const pilotId = path.split("/")[4];
		await deleteRecord("users", pilotId);
		return buildResponse(200, { success: true });
	}
	if (path.startsWith("/api/admin/editors/") && method === "GET") {
		const editorId = path.split("/")[4];
		return handleAdminUserDetails(editorId);
	}
	if (path.startsWith("/api/admin/editors/") && method === "PUT") {
		const editorId = path.split("/")[4];
		await updateRecord("users", editorId, body || {});
		return buildResponse(200, { success: true });
	}
	if (path.startsWith("/api/admin/editors/") && method === "DELETE") {
		const editorId = path.split("/")[4];
		await deleteRecord("users", editorId);
		return buildResponse(200, { success: true });
	}
	if (path.startsWith("/api/admin/referrals/") && method === "GET") {
		const referralId = path.split("/")[4];
		return handleAdminReferralDetails(referralId);
	}
	if (path.startsWith("/api/admin/referrals/") && method === "PUT") {
		const referralId = path.split("/")[4];
		await updateRecord("referrals", referralId, body || {});
		return buildResponse(200, { success: true });
	}
	if (path.startsWith("/api/admin/referrals/") && method === "DELETE") {
		const referralId = path.split("/")[4];
		await deleteRecord("referrals", referralId);
		return buildResponse(200, { success: true });
	}

	if (path === "/api/admin/orders" && method === "GET")
		return handleAdminOrdersList(query);
	if (path.startsWith("/api/admin/orders/") && method === "PUT") {
		const orderId = path.split("/")[4];
		return handleAdminOrderUpdate(orderId, body);
	}
	if (path.startsWith("/api/admin/orders/") && method === "DELETE") {
		const orderId = path.split("/")[4];
		return handleAdminOrderDelete(orderId);
	}

	if (path === "/api/admin/dashboard/stats" && method === "GET")
		return handleAdminDashboardStats();
	if (path === "/api/admin/dashboard/activities" && method === "GET")
		return handleAdminDashboardActivities();

	if (path === "/api/admin/settings" && method === "GET")
		return handleAdminSettingsGet();
	if (path === "/api/admin/settings" && method === "PUT")
		return handleAdminSettingsUpdate(body);

	if (path === "/api/admin/payments" && method === "GET")
		return handleAdminPayments();
	if (
		path === "/api/admin/cancellations" &&
		(method === "GET" || method === "POST")
	)
		return handleAdminCancellations(method, body);
	if (path.startsWith("/api/admin/cancellations/") && method === "PUT") {
		const cancelId = path.split("/")[4];
		await updateRecord("cancellations", cancelId, body || {});
		return buildResponse(200, { success: true });
	}

	if (path === "/api/admin/pre-list" && (method === "GET" || method === "POST"))
		return handleAdminPreList(method, body);
	if (
		path.startsWith("/api/admin/pre-list/") &&
		(method === "PUT" || method === "DELETE")
	) {
		const itemId = path.split("/")[4];
		return handleAdminPreListUpdate(itemId, method, body);
	}

	if (
		path.startsWith("/api/admin/video-reviews") &&
		(method === "GET" || method === "PUT")
	) {
		const videoId = path.split("/")[4];
		return handleAdminVideoReviews(method, videoId, body);
	}

	if (path.startsWith("/api/admin/email-templates")) {
		const parts = path.split("/");
		const templateName = parts.length > 4 ? parts[4] : undefined;
		return handleAdminEmailTemplates(method, templateName, body);
	}

	if (path.startsWith("/api/admin/applications/")) {
		const parts = path.split("/");
		const applicationType = parts[4];
		const applicationId = parts[5];
		const action = parts[6];
		if (action === "approve") {
			return handleAdminApplications("POST", applicationType, applicationId, {
				action: "approved",
				comments: body?.comments,
			});
		}
		if (action === "reject") {
			return handleAdminApplications("POST", applicationType, applicationId, {
				action: "rejected",
				comments: body?.comments,
			});
		}
		return handleAdminApplications(
			method,
			applicationType,
			applicationId,
			body,
		);
	}

	if (path.startsWith("/api/admin/clients/") && method === "GET") {
		const clientId = path.split("/")[4];
		return handleAdminUserDetails(clientId);
	}

	if (path === "/api/admin/inquiries" && method === "GET")
		return handleInquiries("GET");
	if (path.startsWith("/api/admin/inquiries/") && method === "PUT") {
		const inquiryId = path.split("/")[4];
		return handleInquiries("PUT", inquiryId, body);
	}
	if (
		path.endsWith("/reply") &&
		method === "POST" &&
		path.startsWith("/api/admin/inquiries/")
	) {
		const inquiryId = path.split("/")[4];
		return handleInquiries("POST", inquiryId, body);
	}

	if (path === "/api/admin/test-email" && method === "POST")
		return handleTestEmail();

	if (path === "/api/pilots/register" && method === "POST")
		return buildResponse(200, await pilotService.register(body));
	if (path === "/api/editors/register" && method === "POST")
		return buildResponse(200, await editorService.register(body));
	if (path === "/api/referrals/register" && method === "POST")
		return buildResponse(200, await referralService.register(body));

	if (path === "/api/pilot/assigned-orders" && method === "GET")
		return handlePilotAssignedOrders();
	if (path === "/api/editor/assigned-orders" && method === "GET")
		return handleEditorAssignedOrders();
	if (path === "/api/editor/ongoing-orders" && method === "GET") {
		const orders = (await handleEditorAssignedOrders()).body as DataRecord[];
		const filtered = orders.filter(
			(o) => normalizeStatus(o.status) !== "COMPLETED",
		);
		return buildResponse(200, filtered);
	}
	if (path === "/api/editor/completed-orders" && method === "GET") {
		const orders = (await handleEditorAssignedOrders()).body as DataRecord[];
		return buildResponse(200, filterOrdersByStatus(orders, "COMPLETED"));
	}
	if (path === "/api/editor/cancelled-orders" && method === "GET") {
		const orders = (await handleEditorAssignedOrders()).body as DataRecord[];
		return buildResponse(200, filterOrdersByStatus(orders, "CANCELLED"));
	}
	if (path === "/api/pilot/all-orders" && method === "GET")
		return handlePilotAssignedOrders();
	if (path === "/api/pilot/completed-orders" && method === "GET") {
		const orders = (await handlePilotAssignedOrders()).body as DataRecord[];
		return buildResponse(200, filterOrdersByStatus(orders, "COMPLETED"));
	}
	if (path === "/api/pilot/cancelled-orders" && method === "GET") {
		const orders = (await handlePilotAssignedOrders()).body as DataRecord[];
		return buildResponse(200, filterOrdersByStatus(orders, "CANCELLED"));
	}
	if (path === "/api/pilot/final-review" && method === "GET")
		return handlePilotFinalReview();
	if (path === "/api/pilot/earnings" && method === "GET")
		return handlePilotEarnings();
	if (path === "/api/editor/earnings" && method === "GET")
		return handleEditorEarnings();
	if (path === "/api/pilot/test-simple" && method === "GET")
		return buildResponse(200, { success: true });

	if (
		path === "/api/pilot/video-submissions" &&
		(method === "GET" || method === "POST")
	) {
		return handleVideoSubmissions(method, "pilot", body);
	}
	if (
		path === "/api/editor/video-submissions" &&
		(method === "GET" || method === "POST")
	) {
		return handleVideoSubmissions(method, "editor", body);
	}
	if (path.startsWith("/api/pilot/submission-history/") && method === "GET") {
		const orderId = path.split("/")[4];
		return handleSubmissionHistory(orderId);
	}
	if (path.startsWith("/api/editor/submission-history/") && method === "GET") {
		const orderId = path.split("/")[4];
		return handleSubmissionHistory(orderId);
	}

	if (path === "/api/payment/initiate" && method === "POST")
		return handlePaymentInitiate(body);
	if (path.startsWith("/api/payment/status/") && method === "GET") {
		const transactionId = path.split("/")[4];
		return handlePaymentStatus(transactionId);
	}
	if (path === "/api/payment/refund" && method === "POST")
		return handlePaymentRefund(body);

	if (path === "/api/cities" && method === "GET")
		return buildResponse(200, CITY_LIST);

	return buildResponse(404, { success: false, error: "Not found" });
};

const buildUrl = (inputUrl?: string, baseURL?: string) => {
	const base = baseURL || window.location.origin;
	return new URL(inputUrl || "", base);
};

export const setupLocalApi = () => {
	const originalFetch = window.fetch.bind(window);
	const originalAdapter = axios.defaults.adapter as AxiosAdapter | undefined;

	window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = typeof input === "string" ? input : input.toString();
		const urlObj = buildUrl(url);
		if (!urlObj.pathname.startsWith("/api/")) {
			return originalFetch(input, init);
		}
		const method = String(
			init?.method ||
				(typeof input === "object" && "method" in input
					? (input as Request).method
					: "GET"),
		).toUpperCase();
		const body = safeJsonParse(init?.body);
		const response = await handleRequest(
			method,
			urlObj.pathname,
			urlObj.searchParams,
			body,
		);
		return new Response(JSON.stringify(response.body), {
			status: response.status,
			headers: { "Content-Type": "application/json" },
		});
	};

	const localAdapter: AxiosAdapter = async (config) => {
		const urlObj = buildUrl(config.url, config.baseURL);
		if (!urlObj.pathname.startsWith("/api/")) {
			if (!originalAdapter) throw new Error("No axios adapter available");
			return originalAdapter(config);
		}
		const method = String(config.method || "get").toUpperCase();
		const body = safeJsonParse(config.data);
		const response = await handleRequest(
			method,
			urlObj.pathname,
			urlObj.searchParams,
			body,
		);
		const axiosResponse: AxiosResponse = {
			data: response.body,
			status: response.status,
			statusText: response.status >= 400 ? "error" : "ok",
			headers: { "Content-Type": "application/json" },
			config,
			request: null,
		};
		return axiosResponse;
	};

	axios.defaults.adapter = localAdapter;
};
