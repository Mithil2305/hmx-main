import React, { useState, useEffect } from "react";
import {
	Routes,
	Route,
	Link,
	useNavigate,
	useLocation,
} from "react-router-dom";
import {
	Calendar,
	Settings,
	LogOut,
	BarChart3,
	MessageSquare,
	Award,
	ChevronRight,
	Send,
	Loader2,
	DollarSign,
	Building,
	MapPin,
	Clock,
	Briefcase,
} from "lucide-react";
import axios from "axios";
import { messageService, Message } from "../services/api";
import { useSocket } from "../contexts/SocketContext";

const normalizeStatus = (status?: string) => (status || "").toUpperCase();

const ClientDashboard: React.FC = () => {
	const [isSidebarOpen, setIsSidebarOpen] = useState(true);
	const navigate = useNavigate();
	const location = useLocation();
	const [userData, setUserData] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [bookings, setBookings] = useState<any[]>([]);
	const [stats, setStats] = useState({
		activeProjects: 0,
		completedProjects: 0,
		pendingPayments: 0,
		totalSpent: 0,
	});

	useEffect(() => {
		const fetchUserData = async () => {
			try {
				setIsLoading(true);
				const token = localStorage.getItem("token");
				const [verifyRes, bookingsRes] = await Promise.all([
					axios.get("/api/auth/verify", {
						headers: { Authorization: `Bearer ${token}` },
					}),
					axios.get("/api/clients/bookings", {
						headers: { Authorization: `Bearer ${token}` },
					}),
				]);
				setUserData(verifyRes.data);
				if (bookingsRes.data.success) {
					setBookings(bookingsRes.data.bookings || []);
					setStats(bookingsRes.data.stats);
				}
			} catch (err) {
				console.error("Failed to fetch user data:", err);
				navigate("/login");
			} finally {
				setIsLoading(false);
			}
		};

		fetchUserData();
	}, [navigate]);

	const menuItems = [
		{
			path: "/client",
			icon: <BarChart3 size={20} />,
			label: "Dashboard",
			component: <DashboardContent stats={stats} bookings={bookings} />,
		},
		{
			path: "/client/projects",
			icon: <Calendar size={20} />,
			label: "Projects",
			component: <ProjectsContent bookings={bookings} />,
		},
		{
			path: "/client/messages",
			icon: <MessageSquare size={20} />,
			label: "Messages",
			component: <MessagesContent userId={userData?.id} />,
		},
		{
			path: "/client/settings",
			icon: <Settings size={20} />,
			label: "Settings",
			component: <SettingsContent />,
		},
	];

	const handleLogout = () => {
		localStorage.removeItem("token");
		navigate("/login", { replace: true });
	};

	if (isLoading || !userData) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-background-light">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
			</div>
		);
	}

	const userInitial = userData.contact_name
		? userData.contact_name.charAt(0).toUpperCase()
		: userData.business_name
			? userData.business_name.charAt(0).toUpperCase()
			: "C";

	return (
		<div className="flex h-screen bg-background-light">
			{/* Sidebar */}
			<aside
				className={`bg-sidebar-bg flex flex-col shadow-2xl z-20 transition-all duration-300 ${isSidebarOpen ? "w-72" : "w-24"}`}
			>
				<div className="p-8 flex flex-col items-start overflow-hidden">
					<div className="flex items-center space-x-2 mb-8 whitespace-nowrap">
						<div className="w-10 h-10 bg-hmx-gradient rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-hmx-lg flex-shrink-0">
							C
						</div>
						{isSidebarOpen && (
							<h1 className="text-2xl font-heading font-black tracking-tighter text-white">
								HMX Client
							</h1>
						)}
					</div>

					<div className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl w-full border border-white/10 overflow-hidden">
						<div className="w-10 h-10 rounded-full bg-hmx-gradient p-0.5 flex-shrink-0">
							<div className="w-full h-full rounded-full bg-sidebar-bg flex items-center justify-center text-white text-xs font-bold">
								{userInitial}
							</div>
						</div>
						{isSidebarOpen && (
							<div className="overflow-hidden">
								<p className="text-sm font-semibold text-white truncate">
									{userData.business_name || "Business"}
								</p>
								<p className="text-[10px] text-zinc-400 truncate">
									{userData.contact_name}
								</p>
							</div>
						)}
					</div>
				</div>

				<nav className="flex-1 px-4 space-y-1 overflow-y-auto pb-4 custom-scrollbar">
					<p
						className={`px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 transition-opacity ${isSidebarOpen ? "opacity-100" : "opacity-0"}`}
					>
						Main Menu
					</p>
					{menuItems.map((item) => {
						const isActive = location.pathname === item.path;
						return (
							<Link
								key={item.path}
								to={item.path}
								className={`flex items-center rounded-xl py-3.5 transition-all duration-300 group overflow-hidden ${
									isSidebarOpen ? "px-4" : "justify-center"
								} ${
									isActive
										? "bg-hmx-gradient text-white shadow-hmx-lg"
										: "text-zinc-400 hover:bg-white/5 hover:text-white"
								}`}
							>
								<span
									className={`${isActive ? "text-white" : "text-zinc-400 group-hover:text-primary-400"} transition-colors flex-shrink-0`}
								>
									{React.cloneElement(item.icon as React.ReactElement, {
										size: 20,
									})}
								</span>
								{isSidebarOpen && (
									<span className="ml-3 font-medium text-sm whitespace-nowrap">
										{item.label}
									</span>
								)}
							</Link>
						);
					})}
				</nav>

				<div className="p-4 border-t border-white/5 bg-black/20 overflow-hidden">
					<button
						onClick={handleLogout}
						className={`flex items-center text-zinc-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all duration-300 group ${
							isSidebarOpen
								? "w-full px-4 py-3 text-sm"
								: "justify-center w-full py-3"
						}`}
					>
						<LogOut
							size={20}
							className="group-hover:translate-x-1 transition-transform flex-shrink-0"
						/>
						{isSidebarOpen && <span className="ml-3 font-medium">Logout</span>}
					</button>
				</div>
			</aside>

			{/* Main Content Area */}
			<div className="flex-1 flex flex-col overflow-hidden">
				{/* Header */}
				<header className="h-20 bg-white border-b border-zinc-100 flex items-center justify-between px-8 flex-shrink-0">
					<div className="flex items-center">
						<button
							onClick={() => setIsSidebarOpen(!isSidebarOpen)}
							className="p-2 mr-4 text-zinc-400 hover:text-primary-600 transition-colors bg-zinc-50 rounded-lg"
						>
							<ChevronRight
								size={20}
								className={`transform transition-transform ${isSidebarOpen ? "rotate-180" : ""}`}
							/>
						</button>
						<h1 className="text-xl font-bold text-zinc-900 tracking-tight">
							{menuItems.find((item) => item.path === location.pathname)
								?.label || "Dashboard"}
						</h1>
					</div>

					<div className="flex items-center space-x-4">
						<div className="hidden sm:flex flex-col text-right">
							<span className="text-sm font-bold text-zinc-900">
								{userData.business_name}
							</span>
							<span className="text-[10px] text-primary-500 font-bold uppercase tracking-widest">
								Premium Client
							</span>
						</div>
						<div className="w-10 h-10 rounded-xl bg-primary-500 p-0.5 shadow-sm">
							<div className="w-full h-full rounded-xl bg-white flex items-center justify-center overflow-hidden font-bold text-primary-600">
								{userInitial}
							</div>
						</div>
					</div>
				</header>

				{/* Dynamic Content */}
				<div className="flex-1 overflow-auto bg-background-light custom-scrollbar">
					<div className="p-8 max-w-7xl mx-auto">
						<Routes>
							{menuItems.map((item) => (
								<Route
									key={item.path}
									path={item.path.replace("/client", "")}
									element={item.component}
								/>
							))}
						</Routes>
					</div>
				</div>
			</div>
		</div>
	);
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
	REQUESTED: { label: "Requested", color: "bg-amber-100 text-amber-800" },
	PILOT_ASSIGNED: { label: "Pilot Assigned", color: "bg-sky-100 text-sky-800" },
	SHOOT_COMPLETED: {
		label: "Shoot Completed",
		color: "bg-cyan-100 text-cyan-800",
	},
	EDITING: { label: "Editing", color: "bg-indigo-100 text-indigo-800" },
	EDIT_SUBMITTED: {
		label: "Edit Submitted",
		color: "bg-violet-100 text-violet-800",
	},
	REVISION_REQUESTED: {
		label: "Revision Requested",
		color: "bg-rose-100 text-rose-800",
	},
	APPROVED: { label: "Approved", color: "bg-emerald-100 text-emerald-800" },
	COMPLETED: { label: "Completed", color: "bg-green-100 text-green-800" },
};

const DashboardContent: React.FC<{ stats: any; bookings: any[] }> = ({
	stats,
	bookings,
}) => (
	<div className="space-y-8 animate-fade-in">
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
			{[
				{
					label: "Active Projects",
					value: stats.activeProjects,
					icon: <Calendar />,
					color: "from-blue-500 to-indigo-500",
				},
				{
					label: "Completed",
					value: stats.completedProjects,
					icon: <Award />,
					color: "from-emerald-500 to-teal-500",
				},
				{
					label: "Pending Payments",
					value: stats.pendingPayments,
					icon: <DollarSign />,
					color: "from-orange-500 to-red-500",
				},
				{
					label: "Total Invested",
					value: `₹${(stats.totalSpent || 0).toLocaleString()}`,
					icon: <BarChart3 />,
					color: "from-purple-500 to-pink-500",
				},
			].map((stat, i) => (
				<div
					key={i}
					className="bg-white rounded-3xl p-6 shadow-hmx border border-white hover:border-primary-100 transition-all duration-300"
				>
					<div className="flex items-center space-x-4">
						<div
							className={`p-3 rounded-2xl bg-gradient-to-br ${stat.color} text-white shadow-lg`}
						>
							{React.cloneElement(stat.icon as React.ReactElement, {
								size: 24,
							})}
						</div>
						<div>
							<p className="text-sm font-semibold text-zinc-400">
								{stat.label}
							</p>
							<p className="text-2xl font-black text-zinc-900 tracking-tight">
								{stat.value}
							</p>
						</div>
					</div>
				</div>
			))}
		</div>

		<div className="bg-white rounded-[32px] p-8 shadow-hmx border border-zinc-100">
			<h2 className="text-xl font-black text-zinc-900 mb-6 flex items-center">
				<span className="w-1.5 h-6 bg-primary-500 rounded-full mr-3"></span>
				Recent Bookings
			</h2>
			{bookings.length === 0 ? (
				<div className="text-center py-12">
					<div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
						<Briefcase className="text-zinc-300" size={32} />
					</div>
					<p className="text-zinc-500 font-medium">No bookings yet.</p>
					<p className="text-zinc-400 text-sm mt-1">
						Submit the BBD form to get started.
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{bookings.slice(0, 5).map((b) => {
						const s = STATUS_LABELS[b.status] || {
							label: b.status,
							color: "bg-gray-100 text-gray-700",
						};
						return (
							<div
								key={b.id}
								className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 hover:bg-zinc-100 transition-colors"
							>
								<div className="flex items-center gap-4">
									<div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
										<Building size={18} className="text-primary-500" />
									</div>
									<div>
										<p className="font-bold text-zinc-900 text-sm">
											{b.brand_name || b.guest_name || "—"}
										</p>
										<p className="text-xs text-zinc-400 capitalize">
											{(b.property_type || "").replace(/-/g, " ")} ·{" "}
											{b.preferred_date}
										</p>
									</div>
								</div>
								<div className="flex items-center gap-3">
									<p className="text-sm font-bold text-zinc-700">
										₹{(b.total_cost || 0).toLocaleString()}
									</p>
									<span
										className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${s.color}`}
									>
										{s.label}
									</span>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	</div>
);

const ProjectsContent: React.FC<{ bookings: any[] }> = ({ bookings }) => {
	const navigate = useNavigate();

	const handleReviewAction = async (
		bookingId: number,
		action: "approve" | "revision",
	) => {
		try {
			const token = localStorage.getItem("token");
			if (action === "approve") {
				await axios.post(
					`/api/bookings/${bookingId}/approve`,
					{},
					{ headers: { Authorization: `Bearer ${token}` } },
				);
			} else {
				const reason =
					window.prompt("Enter revision reason") || "Please refine this edit.";
				await axios.post(
					`/api/bookings/${bookingId}/revision`,
					{ reason },
					{ headers: { Authorization: `Bearer ${token}` } },
				);
			}
			window.location.reload();
		} catch (error) {
			console.error("Failed to update review state", error);
		}
	};

	return (
		<div className="bg-white rounded-[32px] p-8 shadow-hmx border border-zinc-100">
			<div className="flex items-center justify-between mb-8">
				<h2 className="text-xl font-black text-zinc-900 flex items-center">
					<span className="w-1.5 h-6 bg-primary-500 rounded-full mr-3"></span>
					Your Bookings
				</h2>
				<button
					onClick={() => navigate("/standalone-bbd")}
					className="px-6 py-2.5 bg-hmx-gradient text-white rounded-xl font-bold shadow-hmx-lg hover:scale-[1.02] active:scale-95 transition-all text-sm"
				>
					New Booking
				</button>
			</div>

			{bookings.length === 0 ? (
				<div className="text-center py-16">
					<div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
						<Briefcase className="text-zinc-300" size={32} />
					</div>
					<p className="text-zinc-500 font-medium">No bookings yet</p>
					<p className="text-zinc-400 text-sm mt-1">
						Click "New Booking" to get started.
					</p>
				</div>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full text-left">
						<thead>
							<tr className="border-b border-zinc-100">
								<th className="pb-4 font-bold text-zinc-400 text-xs uppercase tracking-wider">
									Brand / Category
								</th>
								<th className="pb-4 font-bold text-zinc-400 text-xs uppercase tracking-wider">
									Location
								</th>
								<th className="pb-4 font-bold text-zinc-400 text-xs uppercase tracking-wider">
									Shoot Date
								</th>
								<th className="pb-4 font-bold text-zinc-400 text-xs uppercase tracking-wider">
									Cost
								</th>
								<th className="pb-4 font-bold text-zinc-400 text-xs uppercase tracking-wider">
									Status
								</th>
								<th className="pb-4 font-bold text-zinc-400 text-xs uppercase tracking-wider">
									Payment
								</th>
								<th className="pb-4 font-bold text-zinc-400 text-xs uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody>
							{bookings.map((b) => {
								const s = STATUS_LABELS[b.status] || {
									label: b.status,
									color: "bg-gray-100 text-gray-700",
								};
								const payColor =
									b.payment_status === "paid"
										? "bg-green-100 text-green-700"
										: b.payment_status === "partial"
											? "bg-yellow-100 text-yellow-700"
											: "bg-gray-100 text-gray-600";
								return (
									<tr
										key={b.id}
										className="border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors"
									>
										<td className="py-5">
											<p className="font-bold text-zinc-900">
												{b.brand_name || b.guest_name || "—"}
											</p>
											<p className="text-xs text-zinc-400 capitalize">
												{(b.property_type || "").replace(/-/g, " ")} ·{" "}
												{b.business_size}
											</p>
										</td>
										<td className="py-5">
											<div className="flex items-center gap-1.5 text-sm text-zinc-600">
												<MapPin size={13} className="text-zinc-400" />
												<span className="truncate max-w-[160px]">
													{b.location_address || "—"}
												</span>
											</div>
										</td>
										<td className="py-5">
											<div className="flex items-center gap-1.5 text-sm text-zinc-600">
												<Clock size={13} className="text-zinc-400" />
												{b.preferred_date || "—"}
											</div>
										</td>
										<td className="py-5 font-bold text-zinc-900 text-sm">
											{b.total_cost ? `₹${b.total_cost.toLocaleString()}` : "—"}
										</td>
										<td className="py-5">
											<span
												className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${s.color}`}
											>
												{s.label}
											</span>
										</td>
										<td className="py-5">
											<span
												className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${payColor}`}
											>
												{b.payment_status || "pending"}
											</span>
										</td>
										<td className="py-5">
											{normalizeStatus(b.status) === "EDIT_SUBMITTED" ? (
												<div className="flex items-center gap-2">
													<button
														onClick={() => handleReviewAction(b.id, "approve")}
														className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-500 text-white"
													>
														Approve
													</button>
													<button
														onClick={() => handleReviewAction(b.id, "revision")}
														className="px-3 py-1.5 text-xs font-bold rounded-lg bg-orange-500 text-white"
													>
														Request Revision
													</button>
												</div>
											) : (
												<span className="text-xs text-zinc-400">No action</span>
											)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
};

const SUPPORT_CONTACT = {
	receiver_id: 1,
	receiver_role: "admin",
	label: "HMX Support Team",
};

const MessagesContent: React.FC<{ userId?: number }> = ({ userId }) => {
	const { socket, isConnected } = useSocket();
	const [messages, setMessages] = useState<Message[]>([]);
	const [newMessage, setNewMessage] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [sending, setSending] = useState(false);

	const fetchMessages = async () => {
		if (!userId) return;
		setLoading(true);
		setError("");
		try {
			const response = await messageService.getAll(SUPPORT_CONTACT.receiver_id);
			setMessages(response.messages || []);
		} catch (err) {
			console.error(err);
			setError("Failed to load messages. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchMessages();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [userId]);

	useEffect(() => {
		if (!socket || !userId) return;

		socket.emit("join:conversation", {
			role: SUPPORT_CONTACT.receiver_role,
			id: SUPPORT_CONTACT.receiver_id,
		});

		const handleIncoming = (message: Message) => {
			if (message.receiver_id === userId || message.sender_id === userId) {
				setMessages((prev) => {
					const exists = prev.some((m) => m.id === message.id);
					if (exists) return prev;
					return [...prev, message].sort(
						(a, b) =>
							new Date(a.created_at).getTime() -
							new Date(b.created_at).getTime(),
					);
				});
			}
		};

		socket.on("message:new", handleIncoming);
		socket.on("message:sent", handleIncoming);
		return () => {
			socket.off("message:new", handleIncoming);
			socket.off("message:sent", handleIncoming);
		};
	}, [socket, userId]);

	const handleSend = async () => {
		const trimmed = newMessage.trim();
		if (!trimmed || !userId) return;
		setSending(true);
		try {
			const message = await messageService.send({
				receiver_id: SUPPORT_CONTACT.receiver_id,
				receiver_role: SUPPORT_CONTACT.receiver_role,
				content: trimmed,
			});
			setMessages((prev) => [...prev, message]);
			setNewMessage("");
		} catch (err) {
			console.error(err);
			setError("Failed to send message. Please try again.");
		} finally {
			setSending(false);
		}
	};

	const renderStatus = () => {
		if (!socket) return "Offline";
		return isConnected ? "Live" : "Connecting…";
	};

	return (
		<div className="bg-white rounded-lg shadow flex flex-col h-[calc(100vh-160px)]">
			<div className="p-6 border-b border-gray-100 flex items-center justify-between">
				<div>
					<h2 className="text-lg font-semibold text-gray-900">Messages</h2>
					<p className="text-sm text-gray-500">
						Chat directly with {SUPPORT_CONTACT.label}
					</p>
				</div>
				<div
					className={`text-sm font-medium ${isConnected ? "text-green-600" : "text-yellow-600"}`}
				>
					{renderStatus()}
				</div>
			</div>

			<div className="flex-1 overflow-hidden flex flex-col">
				{loading ? (
					<div className="flex-1 flex items-center justify-center text-gray-500">
						<Loader2 className="animate-spin mr-2" size={18} /> Loading
						conversation…
					</div>
				) : (
					<div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
						{messages.length === 0 && !error && (
							<div className="text-center text-gray-500 py-8">
								Say hello! This thread is empty.
							</div>
						)}
						{messages.map((message) => {
							const isOwn = message.sender_id === userId;
							return (
								<div
									key={message.id}
									className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
								>
									<div
										className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm shadow ${
											isOwn
												? "bg-primary-600 text-white rounded-br-none"
												: "bg-white text-gray-800 rounded-bl-none"
										}`}
									>
										<p className="whitespace-pre-line break-words">
											{message.content}
										</p>
										<span
											className={`block mt-2 text-xs ${isOwn ? "text-primary-100" : "text-gray-400"}`}
										>
											{new Date(message.created_at).toLocaleString()}
										</span>
									</div>
								</div>
							);
						})}
						{error && (
							<div className="text-center text-red-500 text-sm">{error}</div>
						)}
					</div>
				)}

				<div className="p-4 border-t border-gray-100 bg-white">
					<div className="flex items-center space-x-3">
						<textarea
							value={newMessage}
							onChange={(e) => setNewMessage(e.target.value)}
							rows={2}
							placeholder="Type your message…"
							className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2 focus:border-primary-500 focus:ring-primary-500"
							disabled={!userId}
						/>
						<button
							onClick={handleSend}
							disabled={!newMessage.trim() || sending || !userId}
							className={`flex items-center justify-center rounded-xl px-4 py-3 text-white transition-colors ${
								!newMessage.trim() || sending || !userId
									? "bg-gray-300 cursor-not-allowed"
									: "bg-primary-600 hover:bg-primary-700"
							}`}
						>
							{sending ? (
								<Loader2 className="animate-spin" size={18} />
							) : (
								<Send size={18} />
							)}
						</button>
					</div>
					<p className="mt-2 text-xs text-gray-400">
						Messages are sent directly to {SUPPORT_CONTACT.label}. We typically
						reply within a few minutes.
					</p>
				</div>
			</div>
		</div>
	);
};

const SettingsContent: React.FC = () => {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [deleteLoading, setDeleteLoading] = useState(false);
	const navigate = useNavigate();
	const [settings, setSettings] = useState({
		business_name: "",
		contact_name: "",
		email: "",
		phone: "",
		current_password: "",
		new_password: "",
		confirm_password: "",
	});

	useEffect(() => {
		const fetchUserDataSettings = async () => {
			try {
				const token = localStorage.getItem("token");
				const response = await axios.get("/api/auth/verify", {
					headers: { Authorization: `Bearer ${token}` },
				});
				const userData = response.data;
				setSettings({
					...settings,
					business_name: userData.business_name || "",
					contact_name: userData.contact_name || "",
					email: userData.email || "",
					phone: userData.phone || "",
					current_password: "",
					new_password: "",
					confirm_password: "",
				});
			} catch (err) {
				setError("Failed to fetch user data");
			}
		};
		fetchUserDataSettings();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setSettings((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handleProfileUpdate = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");
		setSuccess("");

		try {
			const token = localStorage.getItem("token");
			await axios.put(
				"/api/clients/profile",
				{
					business_name: settings.business_name,
					contact_name: settings.contact_name,
					phone: settings.phone,
				},
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);
			setSuccess("Profile updated successfully");
		} catch (err: any) {
			setError(err.response?.data?.message || "Failed to update profile");
		} finally {
			setLoading(false);
		}
	};

	const handlePasswordUpdate = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");
		setSuccess("");

		if (settings.new_password !== settings.confirm_password) {
			setError("New passwords do not match");
			setLoading(false);
			return;
		}

		try {
			const token = localStorage.getItem("token");
			await axios.put(
				"/api/clients/password",
				{
					current_password: settings.current_password,
					new_password: settings.new_password,
				},
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);
			setSuccess("Password updated successfully");
			setSettings((prev) => ({
				...prev,
				current_password: "",
				new_password: "",
				confirm_password: "",
			}));
		} catch (err: any) {
			setError(err.response?.data?.message || "Failed to update password");
		} finally {
			setLoading(false);
		}
	};

	const handleDeleteAccount = async () => {
		if (
			!window.confirm(
				"Are you sure you want to delete your account? This action cannot be undone.",
			)
		) {
			return;
		}

		setDeleteLoading(true);
		setError("");
		setSuccess("");

		try {
			const token = localStorage.getItem("token");
			await axios.delete("/api/clients/account", {
				headers: { Authorization: `Bearer ${token}` },
			});

			localStorage.removeItem("token");
			navigate("/login", { replace: true });
		} catch (err: any) {
			setError(err.response?.data?.message || "Failed to delete account");
			setDeleteLoading(false);
		}
	};

	return (
		<div className="space-y-6">
			{/* Profile Settings */}
			<div className="bg-white rounded-lg shadow p-6">
				<h2 className="text-xl font-semibold text-gray-900 mb-6">
					Profile Settings
				</h2>
				{error && (
					<div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg">
						{error}
					</div>
				)}
				{success && (
					<div className="mb-4 p-4 text-sm text-green-700 bg-green-100 rounded-lg">
						{success}
					</div>
				)}
				<form onSubmit={handleProfileUpdate} className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Business Name
							</label>
							<input
								type="text"
								name="business_name"
								value={settings.business_name}
								onChange={handleInputChange}
								className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
								required
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Contact Name
							</label>
							<input
								type="text"
								name="contact_name"
								value={settings.contact_name}
								onChange={handleInputChange}
								className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
								required
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Email
							</label>
							<input
								type="email"
								name="email"
								value={settings.email}
								disabled
								className="block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm"
							/>
							<p className="mt-1 text-sm text-gray-500">
								Email cannot be changed
							</p>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Phone Number
							</label>
							<input
								type="tel"
								name="phone"
								value={settings.phone}
								onChange={handleInputChange}
								className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
								required
							/>
						</div>
					</div>
					<div className="flex justify-end">
						<button
							type="submit"
							disabled={loading}
							className={`px-6 py-2.5 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
								loading
									? "bg-gray-400 cursor-not-allowed"
									: "bg-primary-600 hover:bg-primary-700"
							}`}
						>
							{loading ? "Saving..." : "Save Changes"}
						</button>
					</div>
				</form>
			</div>

			{/* Password Settings */}
			<div className="bg-white rounded-lg shadow p-6">
				<h2 className="text-xl font-semibold text-gray-900 mb-6">
					Change Password
				</h2>
				<form onSubmit={handlePasswordUpdate} className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Current Password
							</label>
							<input
								type="password"
								name="current_password"
								value={settings.current_password}
								onChange={handleInputChange}
								className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
								required
							/>
						</div>
						<div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									New Password
								</label>
								<input
									type="password"
									name="new_password"
									value={settings.new_password}
									onChange={handleInputChange}
									className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
									required
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Confirm New Password
								</label>
								<input
									type="password"
									name="confirm_password"
									value={settings.confirm_password}
									onChange={handleInputChange}
									className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
									required
								/>
							</div>
						</div>
					</div>
					<div className="flex justify-end">
						<button
							type="submit"
							disabled={loading}
							className={`px-6 py-2.5 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
								loading
									? "bg-gray-400 cursor-not-allowed"
									: "bg-primary-600 hover:bg-primary-700"
							}`}
						>
							{loading ? "Updating..." : "Update Password"}
						</button>
					</div>
				</form>
			</div>

			{/* Account Settings */}
			<div className="bg-white rounded-lg shadow p-6">
				<h2 className="text-xl font-semibold text-gray-900 mb-6">
					Account Settings
				</h2>
				<div className="space-y-4">
					<div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
						<div>
							<h3 className="text-lg font-medium text-red-800">
								Delete Account
							</h3>
							<p className="mt-1 text-sm text-red-600">
								Once you delete your account, there is no going back. Please be
								certain.
							</p>
						</div>
						<button
							onClick={handleDeleteAccount}
							disabled={deleteLoading}
							className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
								deleteLoading
									? "bg-red-400 cursor-not-allowed"
									: "bg-red-600 hover:bg-red-700"
							}`}
						>
							{deleteLoading ? "Deleting..." : "Delete Account"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ClientDashboard;
