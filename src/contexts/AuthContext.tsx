import React, { createContext, useContext, useState, useEffect } from "react";
import { authService } from "../services/api";

interface AuthContextType {
	isAuthenticated: boolean;
	user: any | null;
	login: (email: string, password: string) => Promise<void>;
	register: (data: any) => Promise<void>;
	logout: () => void;
	verifyToken: () => Promise<boolean>;
	isLoading: boolean;
	hasCompletedBBD: boolean;
	setHasCompletedBBD: (completed: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
	const [user, setUser] = useState<any | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [hasCompletedBBD, setHasCompletedBBD] = useState<boolean>(false);

	const verifyToken = async (): Promise<boolean> => {
		const token = localStorage.getItem("token");
		if (!token) {
			setIsLoading(false);
			return false;
		}

		try {
			const response = await fetch("/api/auth/verify", {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			if (response.ok) {
				const userData = await response.json();
				setUser(userData);
				setIsAuthenticated(true);
				setIsLoading(false);

				// Only business/client users need BBD status checks.
				if (userData?.role === "business" || userData?.role === "client") {
					checkBBDStatus().then(setHasCompletedBBD);
				} else {
					setHasCompletedBBD(false);
				}

				return true;
			} else {
				// Token is invalid, clear it
				localStorage.removeItem("token");
				setUser(null);
				setIsAuthenticated(false);
				setHasCompletedBBD(false);
				setIsLoading(false);
				return false;
			}
		} catch (error) {
			console.error("Token verification failed:", error);
			localStorage.removeItem("token");
			setUser(null);
			setIsAuthenticated(false);
			setHasCompletedBBD(false);
			setIsLoading(false);
			return false;
		}
	};

	const checkBBDStatus = async (): Promise<boolean> => {
		try {
			const response = await fetch("/api/business/booking-status", {
				headers: {
					Authorization: `Bearer ${localStorage.getItem("token")}`,
				},
			});

			if (response.ok) {
				const data = await response.json();
				return data.hasCompletedBBD || false;
			}
			return false;
		} catch (error) {
			console.error("Error checking BBD status:", error);
			return false;
		}
	};

	const updateBBDStatus = async (completed: boolean): Promise<void> => {
		try {
			await fetch("/api/business/update-bbd-status", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${localStorage.getItem("token")}`,
				},
				body: JSON.stringify({ hasCompletedBBD: completed }),
			});
			setHasCompletedBBD(completed);
		} catch (error) {
			console.error("Error updating BBD status:", error);
			throw error;
		}
	};

	const login = async (email: string, password: string) => {
		setIsLoading(true);
		try {
			const response = await authService.login({ email, password });
			if (response.token) {
				localStorage.setItem("token", response.token);
			}
			// verifyToken sets user, isAuthenticated, and isLoading(false) internally
			const verified = await verifyToken();
			setIsAuthenticated(verified);
		} catch (error) {
			setIsAuthenticated(false);
			setUser(null);
			setIsLoading(false);
			throw error;
		}
	};

	const register = async (data: any) => {
		setIsLoading(true);
		try {
			await authService.register(data);
			// verifyToken sets user, isAuthenticated, and isLoading(false) internally
			const verified = await verifyToken();
			setIsAuthenticated(verified);
		} catch (error) {
			console.error("Registration failed:", error);
			setIsLoading(false);
			throw error;
		}
	};

	const logout = () => {
		authService.logout();
		setIsAuthenticated(false);
		setUser(null);
		setHasCompletedBBD(false);
	};

	// Verify token on initial app load
	useEffect(() => {
		verifyToken();
	}, []);

	// Check if user has completed BBD form on initial load
	useEffect(() => {
		if (user?.id) {
			const bbdCompleted =
				localStorage.getItem(`bbd_completed_${user.id}`) === "true";
			setHasCompletedBBD(bbdCompleted);
		}
	}, [user]);

	return (
		<AuthContext.Provider
			value={{
				isAuthenticated,
				user,
				login,
				register,
				logout,
				verifyToken,
				isLoading,
				hasCompletedBBD,
				setHasCompletedBBD: (completed: boolean) => {
					setHasCompletedBBD(completed);
					if (user?.id) {
						localStorage.setItem(`bbd_completed_${user.id}`, String(completed));
					}
				},
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};
