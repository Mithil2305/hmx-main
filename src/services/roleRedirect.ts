export function navigateByRole(
	navigate: (path: string, opts?: any) => void,
	role?: string | null,
) {
	if (role === "admin") return navigate("/admin", { replace: true });
	if (role === "pilot") return navigate("/pilot", { replace: true });
	if (role === "referral") return navigate("/referral", { replace: true });
	if (role === "editor") return navigate("/editor", { replace: true });
	if (role === "business" || role === "client")
		return navigate("/client", { replace: true });
	if (role === "guest") return navigate("/guest-booking", { replace: true });
	// default to home
	return navigate("/home", { replace: true });
}
