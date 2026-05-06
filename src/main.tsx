import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { SocketProvider } from "./contexts/SocketContext";
import { setupLocalApi } from "./services/localApi";
import "./utils/seedDemoData";
import App from "./App.tsx";
import "./index.css";
import "./utils/seedFirebase";

setupLocalApi();

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<BrowserRouter>
			<AuthProvider>
				<SocketProvider>
					<App />
				</SocketProvider>
			</AuthProvider>
		</BrowserRouter>
	</StrictMode>,
);
