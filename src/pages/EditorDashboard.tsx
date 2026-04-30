import React, { useState, useEffect } from "react";
import {
	Routes,
	Route,
	Link,
	useNavigate,
	useLocation,
	useParams,
} from "react-router-dom";
import {
	Calendar,
	Settings,
	LogOut,
	BarChart3,
	MessageSquare,
	Award,
	MapPin,
	Menu,
	X,
	ChevronRight,
	Video,
	Play,
	Eye,
} from "lucide-react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import VideoSubmissions from "../components/editor/VideoSubmissions";
import BookingDetailsModal from "../components/common/BookingDetailsModal";

const normalizeStatus = (status?: string) => (status || "").toUpperCase();

const EditorDashboard: React.FC = () => {
	const [isSidebarOpen, setIsSidebarOpen] = useState(true);
	const navigate = useNavigate();
	const location = useLocation();
	const [userData, setUserData] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [stats, setStats] = useState({
		ongoingOrders: 0,
		completedOrders: 0,
		cancelledOrders: 0,
		totalEarnings: 0,
	});

	useEffect(() => {
		const fetchUserData = async () => {
			try {
				setIsLoading(true);
				const token = localStorage.getItem("token");
				const response = await axios.get("/api/auth/verify", {
					headers: { Authorization: `Bearer ${token}` },
				});
				console.log("User data received:", response.data);
				const fetchedUser = response.data;
				// Ensure only editors can access this dashboard
				if (fetchedUser.role !== "editor") {
					const roleRoutes: Record<string, string> = {
						admin: "/admin",
						client: "/client",
						business: "/client",
						pilot: "/pilot",
						referral: "/referral",
						guest: "/guest-booking",
					};
					navigate(roleRoutes[fetchedUser.role] || "/login", { replace: true });
					return;
				}
				setUserData(fetchedUser);
				await fetchStats();
			} catch (err) {
				console.error("Failed to fetch user data:", err);
				navigate("/login");
			} finally {
				setIsLoading(false);
			}
		};

		fetchUserData();
	}, [navigate]);

	const fetchStats = async () => {
		try {
			const token = localStorage.getItem("token");
			console.log("Fetching editor stats...");

			// Use the modified assigned-orders endpoint that now returns all orders
			const response = await axios.get("/api/editor/assigned-orders", {
				headers: { Authorization: `Bearer ${token}` },
			});

			console.log("Editor orders response:", response.data);
			const allOrders = response.data || [];
			const ongoingOrders = allOrders.filter(
				(b: any) => normalizeStatus(b.status) !== "COMPLETED",
			);
			const completedOrders = allOrders.filter(
				(b: any) => normalizeStatus(b.status) === "COMPLETED",
			);
			const cancelledOrders = allOrders.filter((b: any) =>
				["CANCELLED", "REJECTED"].includes(normalizeStatus(b.status)),
			);

			const stats = {
				ongoingOrders: ongoingOrders.length,
				completedOrders: completedOrders.length,
				cancelledOrders: cancelledOrders.length,
				totalEarnings: completedOrders
					.filter((b: any) => b.payment_status === "paid")
					.reduce((sum: number, b: any) => sum + (b.payment_amount || 0), 0),
			};
			console.log("Editor stats calculated:", stats);
			setStats(stats);
		} catch (err) {
			console.error("Failed to fetch editor stats:", err);
			// Set default stats on error
			setStats({
				ongoingOrders: 0,
				completedOrders: 0,
				cancelledOrders: 0,
				totalEarnings: 0,
			});
		}
	};

	const menuItems = [
		{
			path: "/editor",
			icon: <BarChart3 size={20} />,
			label: "Dashboard",
			component: <DashboardContent stats={stats} />,
		},
		{
			path: "/editor/ongoing-orders",
			icon: <Video size={20} />,
			label: "Ongoing Orders",
			component: <OngoingOrdersContent />,
		},
		{
			path: "/editor/completed-orders",
			icon: <Award size={20} />,
			label: "Completed Orders",
			component: <CompletedOrdersContent />,
		},
		{
			path: "/editor/cancelled-orders",
			icon: <X size={20} />,
			label: "Cancelled Orders",
			component: <CancelledOrdersContent />,
		},
		{
			path: "/editor/video-submissions",
			icon: <Play size={20} />,
			label: "Video Submissions",
			component: <VideoSubmissions />,
		},
		{
			path: "/editor/settings",
			icon: <Settings size={20} />,
			label: "Settings",
			component: <SettingsContent />,
		},
	];

	const { logout } = useAuth();

	const handleLogout = () => {
		logout();
		navigate("/login", { replace: true });
	};

	if (isLoading || !userData) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-gray-50">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
			</div>
		);
	}

	// Add a safety check for userData.name
	const userInitial = userData.name
		? userData.name.charAt(0).toUpperCase()
		: "?";

	return (
		<div className="flex h-screen bg-background-light">
			{/* Sidebar */}
			<aside
				className={`bg-sidebar-bg flex flex-col shadow-2xl z-20 transition-all duration-300 ${isSidebarOpen ? "w-72" : "w-24"}`}
			>
				<div className="p-8 flex flex-col items-start overflow-hidden">
					<div className="flex items-center space-x-2 mb-8 whitespace-nowrap">
						<div className="w-10 h-10 bg-hmx-gradient rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-hmx-lg flex-shrink-0">
							E
						</div>
						{isSidebarOpen && (
							<h1 className="text-2xl font-heading font-black tracking-tighter text-white">
								HMX Editor
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
									{userData.name || "Editor"}
								</p>
								<p className="text-[10px] text-zinc-400 truncate">
									{userData.email}
								</p>
							</div>
						)}
					</div>
				</div>

				<nav className="flex-1 px-4 space-y-1 overflow-y-auto pb-4 custom-scrollbar">
					<p
						className={`px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 transition-opacity ${isSidebarOpen ? "opacity-100" : "opacity-0"}`}
					>
						Editor Menu
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
							<span className="text-sm font-bold text-zinc-900">Editing</span>
							<span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">
								In Progress
							</span>
						</div>
						<div className="w-10 h-10 rounded-xl bg-blue-500 p-0.5 shadow-sm">
							<div className="w-full h-full rounded-xl bg-white flex items-center justify-center overflow-hidden">
								<img
									src={`https://ui-avatars.com/api/?name=${userData.name}&background=3b82f6&color=fff`}
									alt="Editor"
								/>
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
									path={item.path.replace("/editor", "")}
									element={item.component}
								/>
							))}
							<Route
								path="/submission-history/:orderId"
								element={<SubmissionHistoryPage />}
							/>
						</Routes>
					</div>
				</div>
			</div>
		</div>
	);
};

// Dashboard Components
const DashboardContent: React.FC<{ stats: any }> = ({ stats }) => (
	<div className="space-y-6">
		{/* Stats Grid */}
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
			{[
				{
					label: "Ongoing Orders",
					value: stats.ongoingOrders,
					icon: <Video className="text-blue-500" />,
				},
				{
					label: "Completed Orders",
					value: stats.completedOrders,
					icon: <Award className="text-green-500" />,
				},
				{
					label: "Cancelled Orders",
					value: stats.cancelledOrders,
					icon: <X className="text-red-500" />,
				},
				{
					label: "Total Earnings",
					value: `₹${stats.totalEarnings.toLocaleString("en-IN")}`,
					icon: <BarChart3 className="text-purple-500" />,
				},
			].map((stat, index) => (
				<div key={index} className="bg-white rounded-lg shadow p-6">
					<div className="flex items-center justify-between">
						<div className="p-3 rounded-lg bg-gray-50">{stat.icon}</div>
					</div>
					<h3 className="mt-4 text-gray-500 text-sm font-medium">
						{stat.label}
					</h3>
					<p className="mt-2 text-2xl font-semibold text-gray-900">
						{stat.value}
					</p>
				</div>
			))}
		</div>

		{/* Recent Activity */}
		<div className="bg-white rounded-lg shadow p-6">
			<h2 className="text-lg font-semibold text-gray-900 mb-4">
				Recent Orders
			</h2>
			<div className="space-y-4">
				<p className="text-gray-500 text-center py-4">
					No recent orders to show
				</p>
			</div>
		</div>
	</div>
);

const OngoingOrdersContent: React.FC = () => {
	const [orders, setOrders] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
	const [showBookingDetails, setShowBookingDetails] = useState(false);
	const [selectedBooking, setSelectedBooking] = useState<any>(null);

	useEffect(() => {
		fetchOngoingOrders();
	}, []);

	const getStatusColor = (status: string) => {
		switch (normalizeStatus(status)) {
			case "COMPLETED":
				return "bg-green-100 text-green-800";
			case "SHOOT_COMPLETED":
				return "bg-blue-100 text-blue-800";
			case "EDITING":
				return "bg-purple-100 text-purple-800";
			case "PILOT_ASSIGNED":
				return "bg-yellow-100 text-yellow-800";
			case "CANCELLED":
				return "bg-red-100 text-red-800";
			case "REJECTED":
				return "bg-red-100 text-red-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	const handleViewHistory = (orderId: number) => {
		// Navigate to submission history page
		window.location.href = `/editor/submission-history/${orderId}`;
	};

	const fetchOngoingOrders = async () => {
		try {
			const token = localStorage.getItem("token");
			console.log("Fetching ongoing orders for editor...");

			const response = await axios.get("/api/editor/assigned-orders", {
				headers: { Authorization: `Bearer ${token}` },
			});

			console.log("Editor assigned orders response:", response.data);
			const allOrders = response.data || [];

			// Filter for ongoing orders only
			const ongoingOrders = allOrders.filter(
				(order: any) => normalizeStatus(order.status) !== "COMPLETED",
			);

			console.log("Filtered ongoing orders:", ongoingOrders);
			setOrders(ongoingOrders);
			setLoading(false);
		} catch (err) {
			console.error("Error fetching ongoing orders:", err);
			setError("Failed to fetch ongoing orders");
			setLoading(false);
		}
	};

	if (loading) return <div>Loading...</div>;
	if (error) return <div className="text-red-500">{error}</div>;

	return (
		<div>
			<div className="bg-white rounded-lg shadow overflow-hidden">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
								Expand
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
								Order ID
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
								Client ID
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
								Pilot ID
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
								Status
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
								Actions
							</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{orders.length === 0 ? (
							<tr>
								<td colSpan={6} className="px-6 py-8 text-center text-gray-500">
									No ongoing orders found.
								</td>
							</tr>
						) : (
							orders.map((order) => (
								<tr key={order.id}>
									<td className="px-6 py-4 whitespace-nowrap">
										<button
											onClick={() =>
												setExpandedOrder(
													expandedOrder === order.id ? null : order.id,
												)
											}
											className="text-gray-400 hover:text-gray-600"
										>
											<ChevronRight
												size={16}
												className={`transform transition-transform ${expandedOrder === order.id ? "rotate-90" : ""}`}
											/>
										</button>
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
										HMX{order.id.toString().padStart(4, "0")}
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
										{order.client_id || "N/A"}
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
										{order.pilot_id || "N/A"}
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<span
											className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}
										>
											{order.status
												.split("_")
												.map(
													(word: string) =>
														word.charAt(0).toUpperCase() + word.slice(1),
												)
												.join(" ")}
										</span>
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
										<div className="flex space-x-2">
											<button
												onClick={() => handleViewHistory(order.id)}
												className="text-blue-600 hover:text-blue-900 font-medium"
											>
												View
											</button>
											<button
												onClick={() => {
													setSelectedBooking(order);
													setShowBookingDetails(true);
												}}
												className="text-green-600 hover:text-green-900 font-medium flex items-center"
											>
												<Eye size={14} className="mr-1" />
												Details
											</button>
										</div>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			{/* Booking Details Modal */}
			<BookingDetailsModal
				isOpen={showBookingDetails}
				onClose={() => setShowBookingDetails(false)}
				booking={selectedBooking}
				userRole="editor"
			/>
		</div>
	);
};

const CompletedOrdersContent: React.FC = () => {
	const [orders, setOrders] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [showBookingDetails, setShowBookingDetails] = useState(false);
	const [selectedBooking, setSelectedBooking] = useState<any>(null);

	useEffect(() => {
		fetchCompletedOrders();
	}, []);

	const fetchCompletedOrders = async () => {
		try {
			const token = localStorage.getItem("token");
			const response = await axios.get("/api/editor/assigned-orders", {
				headers: { Authorization: `Bearer ${token}` },
			});

			const allOrders = response.data || [];
			// Filter for completed orders only
			const completedOrders = allOrders.filter(
				(order: any) => normalizeStatus(order.status) === "COMPLETED",
			);
			setOrders(completedOrders);
			setLoading(false);
		} catch (err) {
			console.error("Error fetching completed orders:", err);
			setError("Failed to fetch completed orders");
			setLoading(false);
		}
	};

	if (loading) return <div>Loading...</div>;
	if (error) return <div className="text-red-500">{error}</div>;

	return (
		<div className="bg-white rounded-lg shadow overflow-hidden">
			<div className="px-6 py-4 border-b border-gray-200">
				<h2 className="text-lg font-semibold text-gray-900">
					Completed Orders
				</h2>
			</div>

			{orders.length === 0 ? (
				<div className="px-6 py-8 text-center text-gray-500">
					No completed orders found.
				</div>
			) : (
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
									Order ID
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
									Client
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
									Location
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
									Completed Date
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
									Payment
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
									Final Video
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{orders.map((order) => (
								<tr key={order.id}>
									<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
										HMX{order.id.toString().padStart(4, "0")}
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<div className="text-sm font-medium text-gray-900">
											{order.client_name || "Unknown"}
										</div>
										<div className="text-sm text-gray-500">
											{order.client_email || ""}
										</div>
									</td>
									<td className="px-6 py-4 text-sm text-gray-500">
										{order.location_address || "N/A"}
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
										{order.updated_at
											? new Date(order.updated_at).toLocaleDateString()
											: "N/A"}
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<span
											className={`px-2 py-1 text-xs font-semibold rounded-full ${
												order.payment_status === "paid"
													? "bg-green-100 text-green-800"
													: "bg-yellow-100 text-yellow-800"
											}`}
										>
											{order.payment_status || "pending"}
										</span>
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm">
										{order.delivery_video_link ? (
											<a
												href={order.delivery_video_link}
												target="_blank"
												rel="noopener noreferrer"
												className="text-blue-600 hover:text-blue-900 font-medium"
											>
												<Play size={16} className="inline mr-1" />
												Watch Video
											</a>
										) : (
											<span className="text-gray-400">Not available</span>
										)}
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
										<button
											onClick={() => {
												setSelectedBooking(order);
												setShowBookingDetails(true);
											}}
											className="text-green-600 hover:text-green-900 font-medium flex items-center"
										>
											<Eye size={14} className="mr-1" />
											Details
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Booking Details Modal */}
			<BookingDetailsModal
				isOpen={showBookingDetails}
				onClose={() => setShowBookingDetails(false)}
				booking={selectedBooking}
				userRole="editor"
			/>
		</div>
	);
};

const CancelledOrdersContent: React.FC = () => {
	const [orders, setOrders] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		fetchCancelledOrders();
	}, []);

	const fetchCancelledOrders = async () => {
		try {
			const token = localStorage.getItem("token");
			const response = await axios.get("/api/editor/assigned-orders", {
				headers: { Authorization: `Bearer ${token}` },
			});

			const allOrders = response.data || [];
			// Filter for cancelled/rejected orders only
			const cancelledOrders = allOrders.filter((order: any) =>
				["CANCELLED", "REJECTED"].includes(normalizeStatus(order.status)),
			);
			setOrders(cancelledOrders);
			setLoading(false);
		} catch (err) {
			console.error("Error fetching cancelled orders:", err);
			setError("Failed to fetch cancelled orders");
			setLoading(false);
		}
	};

	if (loading) return <div>Loading...</div>;
	if (error) return <div className="text-red-500">{error}</div>;

	return (
		<div className="bg-white rounded-lg shadow p-6">
			<h2 className="text-lg font-semibold text-gray-900 mb-4">
				Cancelled Orders
			</h2>
			{orders.length === 0 ? (
				<p className="text-gray-500 text-center py-8">
					No cancelled orders found.
				</p>
			) : (
				<div className="space-y-4">
					{orders.map((order) => (
						<div key={order.id} className="border rounded-lg p-4">
							<div className="flex justify-between items-center">
								<div>
									<h3 className="font-medium">
										Order HMX{order.id.toString().padStart(4, "0")}
									</h3>
									<p className="text-sm text-gray-500">
										Client: {order.client_name}
									</p>
									<p className="text-sm text-gray-500">
										Status: {order.status}
									</p>
								</div>
								<span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
									{order.status.charAt(0).toUpperCase() + order.status.slice(1)}
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

const SettingsContent: React.FC = () => (
	<div className="bg-white rounded-lg shadow p-6">
		<h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>
		<div className="space-y-4">
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Email Notifications
				</label>
				<div className="flex items-center">
					<input
						type="checkbox"
						className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
					/>
					<span className="ml-2 text-sm text-gray-600">
						Receive email notifications for new video assignments
					</span>
				</div>
			</div>

			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Preferred Video Format
				</label>
				<select className="w-full p-3 border border-gray-300 rounded-lg">
					<option>MP4 (H.264)</option>
					<option>MOV (ProRes)</option>
					<option>AVI</option>
				</select>
			</div>

			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Quality Preference
				</label>
				<select className="w-full p-3 border border-gray-300 rounded-lg">
					<option>4K</option>
					<option>1080p</option>
					<option>720p</option>
				</select>
			</div>
		</div>
	</div>
);

const SubmissionHistoryPage: React.FC = () => {
	const { orderId } = useParams<{ orderId: string }>();
	const [submissions, setSubmissions] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [newVideoLink, setNewVideoLink] = useState("");
	const [newComments, setNewComments] = useState("");
	const [showSubmitModal, setShowSubmitModal] = useState(false);
	const navigate = useNavigate();

	useEffect(() => {
		if (orderId) {
			fetchSubmissionHistory();
		}
	}, [orderId]);

	const fetchSubmissionHistory = async () => {
		try {
			const token = localStorage.getItem("token");
			const response = await axios.get(
				`/api/editor/submission-history/${orderId}`,
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);
			setSubmissions(response.data);
			setLoading(false);
		} catch (err) {
			setError("Failed to fetch submission history");
			setLoading(false);
		}
	};

	const handleSubmitVideo = async () => {
		if (!newVideoLink.trim()) {
			alert("Please enter a video link");
			return;
		}

		try {
			const token = localStorage.getItem("token");
			await axios.post(
				`/api/editor/video-submissions`,
				{
					order_id: orderId,
					drive_link: newVideoLink,
					editor_comments: newComments,
				},
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);

			setShowSubmitModal(false);
			setNewVideoLink("");
			setNewComments("");
			fetchSubmissionHistory();
		} catch (err: any) {
			setError(err.response?.data?.message || "Failed to submit video");
		}
	};

	if (loading) return <div>Loading...</div>;
	if (error) return <div className="text-red-500">{error}</div>;

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<div>
					<button
						onClick={() => navigate("/editor/ongoing-orders")}
						className="text-blue-600 hover:text-blue-900 mb-2"
					>
						← Back to Ongoing Orders
					</button>
					<h1 className="text-2xl font-bold">
						Submission History - Order HMX{orderId?.padStart(4, "0")}
					</h1>
				</div>
				<button
					onClick={() => setShowSubmitModal(true)}
					className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
				>
					Submit New Video
				</button>
			</div>

			<div className="bg-white rounded-lg shadow overflow-hidden">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
								Date
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
								Video Link
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
								Editor Comments
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
								Admin Comments
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
								Status
							</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{submissions.length === 0 ? (
							<tr>
								<td colSpan={5} className="px-6 py-8 text-center text-gray-500">
									No submissions found for this order.
								</td>
							</tr>
						) : (
							submissions.map((submission, index) => (
								<tr key={index}>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
										{new Date(submission.submitted_date).toLocaleDateString()}
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm">
										<a
											href={submission.drive_link}
											target="_blank"
											rel="noopener noreferrer"
											className="text-blue-600 hover:text-blue-900"
										>
											View Video
										</a>
									</td>
									<td className="px-6 py-4 text-sm text-gray-500">
										{submission.editor_comments || "No comments"}
									</td>
									<td className="px-6 py-4 text-sm text-gray-500">
										{submission.admin_comments || "No comments"}
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<span
											className={`px-2 py-1 text-xs font-semibold rounded-full ${
												submission.status === "approved"
													? "bg-green-100 text-green-800"
													: submission.status === "rejected"
														? "bg-red-100 text-red-800"
														: "bg-yellow-100 text-yellow-800"
											}`}
										>
											{submission.status}
										</span>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			{/* Submit Video Modal */}
			{showSubmitModal && (
				<div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
					<div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
						<h3 className="text-lg font-medium text-gray-900 mb-4">
							Submit New Video
						</h3>
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700">
									Video Link
								</label>
								<input
									type="url"
									value={newVideoLink}
									onChange={(e) => setNewVideoLink(e.target.value)}
									className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
									placeholder="Enter Google Drive link"
									required
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700">
									Comments
								</label>
								<textarea
									value={newComments}
									onChange={(e) => setNewComments(e.target.value)}
									className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
									rows={3}
									placeholder="Add any comments..."
								/>
							</div>
							<div className="flex justify-end space-x-3">
								<button
									onClick={() => setShowSubmitModal(false)}
									className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
								>
									Cancel
								</button>
								<button
									onClick={handleSubmitVideo}
									className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
								>
									Submit
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default EditorDashboard;
