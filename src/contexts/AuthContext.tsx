import React, { createContext, useContext, useState, useEffect } from "react";
import { localAuth, localDB } from "../services/localStorageService";

interface AuthContextType {
	isAuthenticated: boolean;
	user: any | null;
	login: (email: string, password: string, role?: string) => Promise<void>;
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
		try {
			const currentUser = localAuth.getCurrentUser();
			if (!currentUser) {
				setUser(null);
				setIsAuthenticated(false);
				setHasCompletedBBD(false);
				setIsLoading(false);
				return false;
			}

			// Refresh user data from localStorage
			let freshUser = null;
			if (currentUser.role === "pilot") {
				freshUser = localDB.pilots.getById(currentUser.id || currentUser.user_id);
			} else if (currentUser.role === "editor") {
				freshUser = localDB.editors.getById(currentUser.id || currentUser.user_id);
			} else if (currentUser.role === "referral") {
				freshUser = localDB.referrals.getById(currentUser.id || currentUser.user_id);
			} else {
				freshUser = localDB.users.getById(currentUser.id || currentUser.user_id);
			}

			if (!freshUser) {
				localAuth.logout();
				setUser(null);
				setIsAuthenticated(false);
				setHasCompletedBBD(false);
				setIsLoading(false);
				return false;
			}

			const userData = { ...freshUser, role: currentUser.role };
			setUser(userData);
			setHasCompletedBBD(Boolean(freshUser.has_completed_bbd));
			setIsAuthenticated(true);
			setIsLoading(false);
			return true;
		} catch (error) {
			console.error("Auth verification failed:", error);
			setUser(null);
			setIsAuthenticated(false);
			setHasCompletedBBD(false);
			setIsLoading(false);
			return false;
		}
	};

	const login = async (email: string, password: string, role?: string) => {
		setIsLoading(true);
		try {
			const response = localAuth.login(email, password, role);
			setUser(response.user || null);
			setIsAuthenticated(true);
			setHasCompletedBBD(Boolean(response.user?.has_completed_bbd));
			setIsLoading(false);
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
			await localAuth.register(data);
			await verifyToken();
		} catch (error) {
			console.error("Registration failed:", error);
			setIsLoading(false);
			throw error;
		}
	};

	const logout = () => {
		localAuth.logout();
		setIsAuthenticated(false);
		setUser(null);
		setHasCompletedBBD(false);
	};

	useEffect(() => {
		// Check for existing session on mount
		const checkSession = async () => {
			const currentUser = localAuth.getCurrentUser();
			if (currentUser) {
				await verifyToken();
			} else {
				setIsLoading(false);
			}
		};
		checkSession();
	}, []);

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
					if (user?.id || user?.user_id) {
						const userId = user.id || user.user_id;
						localDB.users.update(userId, {
							has_completed_bbd: completed,
						});
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
