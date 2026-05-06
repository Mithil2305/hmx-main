import React, { useState } from "react";
import { seedDemoData, checkFirebaseStatus } from "../../utils/seedDemoData";
import { Database, CheckCircle, AlertCircle, Loader2, Activity } from "lucide-react";

const DemoDataSeeder: React.FC = () => {
	const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
	const [message, setMessage] = useState("");
	const [seededAccounts, setSeededAccounts] = useState<string[]>([]);

	const handleSeed = async () => {
		setStatus("loading");
		setMessage("Creating Firebase Auth users and Firestore documents...");
		setSeededAccounts([]);

		try {
			const result = await seedDemoData();
			setStatus(result.success ? "success" : "error");
			setMessage(result.message);
			setSeededAccounts(result.details.filter(d => d.includes("✅")).map(d => d.replace("✅ Created ", "").split(":")[0]));
		} catch {
			setStatus("error");
			setMessage("Failed to seed data. Check browser console for errors.");
		}

		setTimeout(() => setStatus("idle"), 8000);
	};

	const handleCheckStatus = async () => {
		setStatus("loading");
		const result = await checkFirebaseStatus();
		setStatus(result.configured ? "success" : "error");
		setMessage(result.message);
		setTimeout(() => setStatus("idle"), 3000);
	};

	return (
		<div className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto">
			<div className="flex items-center gap-3 mb-6">
				<div className="p-3 bg-blue-100 rounded-lg">
					<Database className="w-6 h-6 text-blue-600" />
				</div>
				<div>
					<h2 className="text-xl font-bold text-gray-900">Demo Data Manager</h2>
					<p className="text-sm text-gray-500">
						Manage demo accounts and sample data for testing
					</p>
				</div>
			</div>

			{status !== "idle" && (
				<div
					className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
						status === "success"
							? "bg-green-50 text-green-800 border border-green-200"
							: status === "loading"
							? "bg-blue-50 text-blue-800 border border-blue-200"
							: "bg-red-50 text-red-800 border border-red-200"
					}`}
				>
					{status === "success" ? (
						<CheckCircle className="w-5 h-5" />
					) : status === "loading" ? (
						<Loader2 className="w-5 h-5 animate-spin" />
					) : (
						<AlertCircle className="w-5 h-5" />
					)}
					<span className="font-medium">{message}</span>
				</div>
			)}

			{seededAccounts.length > 0 && (
				<div className="mb-4 p-3 bg-green-50 rounded-lg">
					<p className="text-sm text-green-800 font-medium mb-2">Created accounts:</p>
					<div className="flex flex-wrap gap-2">
						{seededAccounts.map((role) => (
							<span key={role} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
								{role}
							</span>
						))}
					</div>
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
				<button
					onClick={handleSeed}
					disabled={status === "loading"}
					className="flex flex-col items-center gap-2 p-4 bg-blue-50 hover:bg-blue-100 disabled:bg-gray-100 disabled:cursor-not-allowed rounded-lg transition-colors border-2 border-blue-200"
				>
					{status === "loading" ? (
						<Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
					) : (
						<Database className="w-8 h-8 text-blue-600" />
					)}
					<span className="font-semibold text-blue-900">
						{status === "loading" ? "Seeding..." : "Seed Firebase Data"}
					</span>
					<span className="text-xs text-blue-600 text-center">
						Create 5 demo accounts + 3 sample bookings
					</span>
				</button>

				<button
					onClick={handleCheckStatus}
					disabled={status === "loading"}
					className="flex flex-col items-center gap-2 p-4 bg-gray-50 hover:bg-gray-100 disabled:bg-gray-100 disabled:cursor-not-allowed rounded-lg transition-colors border-2 border-gray-200"
				>
					<Activity className="w-8 h-8 text-gray-600" />
					<span className="font-semibold text-gray-900">Check Firebase Status</span>
					<span className="text-xs text-gray-600 text-center">
						Verify Firebase is configured
					</span>
				</button>
			</div>

			<div className="bg-gray-50 rounded-lg p-4">
				<h3 className="font-semibold text-gray-900 mb-3">Demo Accounts</h3>
				<table className="w-full text-sm">
					<thead>
						<tr className="text-left border-b border-gray-200">
							<th className="pb-2 font-medium text-gray-600">Role</th>
							<th className="pb-2 font-medium text-gray-600">Email</th>
							<th className="pb-2 font-medium text-gray-600">Password</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100">
						<tr>
							<td className="py-2">
								<span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
									Client
								</span>
							</td>
							<td className="py-2 text-gray-700">client@hmx.com</td>
							<td className="py-2 text-gray-500 font-mono text-xs">client123</td>
						</tr>
						<tr>
							<td className="py-2">
								<span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
									Pilot
								</span>
							</td>
							<td className="py-2 text-gray-700">pilot@hmx.com</td>
							<td className="py-2 text-gray-500 font-mono text-xs">pilot123</td>
						</tr>
						<tr>
							<td className="py-2">
								<span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium">
									Editor
								</span>
							</td>
							<td className="py-2 text-gray-700">editor@hmx.com</td>
							<td className="py-2 text-gray-500 font-mono text-xs">editor123</td>
						</tr>
						<tr>
							<td className="py-2">
								<span className="px-2 py-1 bg-pink-100 text-pink-800 rounded text-xs font-medium">
									Referral
								</span>
							</td>
							<td className="py-2 text-gray-700">referral@hmx.com</td>
							<td className="py-2 text-gray-500 font-mono text-xs">referral123</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div className="mt-4 text-xs text-gray-500 space-y-1">
				<p>
					<strong>Firebase:</strong> Creates Auth users + Firestore documents in collections: users, pilots, editors, referrals, bookings
				</p>
				<p>
					<strong>Duplicate handling:</strong> Skips accounts that already exist. Check browser console for detailed logs.
				</p>
			</div>
		</div>
	);
};

export default DemoDataSeeder;
