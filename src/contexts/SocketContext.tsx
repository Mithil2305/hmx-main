import React, { createContext, useContext, useMemo } from "react";

// SocketContext disabled for frontend-only build
// Real-time features require a backend server which is not available in this build

type SocketContextValue = {
	socket: null;
	isConnected: boolean;
	sendMessage: (_receiverId: string, _content: string) => Promise<boolean>;
	isFeatureAvailable: boolean;
};

const SocketContext = createContext<SocketContextValue>({
	socket: null,
	isConnected: false,
	sendMessage: async () => false,
	isFeatureAvailable: false,
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	// Socket functionality disabled for frontend-only build
	const sendMessage = async (): Promise<boolean> => {
		console.warn("Socket messaging is not available in frontend-only mode");
		return false;
	};

	const value = useMemo(
		() => ({
			socket: null,
			isConnected: false,
			sendMessage,
			isFeatureAvailable: false,
		}),
		[]
	);

	return (
		<SocketContext.Provider value={value}>{children}</SocketContext.Provider>
	);
};

export const useSocket = () => useContext(SocketContext);
