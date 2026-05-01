import React, {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";

type SocketContextValue = {
	socket: Socket | null;
	isConnected: boolean;
};

const SocketContext = createContext<SocketContextValue>({
	socket: null,
	isConnected: false,
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const { isAuthenticated } = useAuth();
	const [socket, setSocket] = useState<Socket | null>(null);
	const [isConnected, setIsConnected] = useState(false);

	useEffect(() => {
		const token = localStorage.getItem("token");

		if (!isAuthenticated || !token) {
			if (socket) {
				socket.disconnect();
			}
			setSocket(null);
			setIsConnected(false);
			return;
		}

		const nextSocket = io("http://localhost:5001", {
			transports: ["websocket"],
			auth: { token },
		});

		const handleConnect = () => setIsConnected(true);
		const handleDisconnect = () => setIsConnected(false);

		nextSocket.on("connect", handleConnect);
		nextSocket.on("disconnect", handleDisconnect);

		setSocket(nextSocket);

		return () => {
			nextSocket.off("connect", handleConnect);
			nextSocket.off("disconnect", handleDisconnect);
			nextSocket.disconnect();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isAuthenticated]);

	const value = useMemo(() => ({ socket, isConnected }), [socket, isConnected]);

	return (
		<SocketContext.Provider value={value}>{children}</SocketContext.Provider>
	);
};

export const useSocket = () => useContext(SocketContext);
