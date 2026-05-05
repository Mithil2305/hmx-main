import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { authService } from "../services/api";
import { auth } from "../services/firebase";
import { getUserProfile, updateRecord } from "../services/firestoreService";

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
		const currentUser = auth.currentUser;
		if (!currentUser) {
			setIsLoading(false);
			return false;
		}

		try {
			const userData = await getUserProfile(currentUser.uid);
			if (!userData) {
				setUser(null);
				setIsAuthenticated(false);
				setHasCompletedBBD(false);
				setIsLoading(false);
				return false;
			}
			setUser({ ...userData, uid: currentUser.uid });
			setHasCompletedBBD(Boolean(userData.hasCompletedBBD));
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

	const login = async (email: string, password: string) => {
		setIsLoading(true);
		try {
			const response = await authService.login({ email, password });
			setUser(response.user || null);
			setIsAuthenticated(true);
			setHasCompletedBBD(Boolean(response.user?.hasCompletedBBD));
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
			await authService.register(data);
			await verifyToken();
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

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
			if (!currentUser) {
				setUser(null);
				setIsAuthenticated(false);
				setHasCompletedBBD(false);
				setIsLoading(false);
				return;
			}
			const profile = await getUserProfile(currentUser.uid);
			setUser(profile ? { ...profile, uid: currentUser.uid } : null);
			setIsAuthenticated(Boolean(profile));
			setHasCompletedBBD(Boolean(profile?.hasCompletedBBD));
			setIsLoading(false);
		});
		return () => unsubscribe();
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
					if (user?.uid) {
						updateRecord("users", user.uid, {
							hasCompletedBBD: completed,
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
