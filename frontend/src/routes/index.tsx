import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ActiveGameRedirect } from "../components/ActiveGameRedirect";
import { AppShell } from "../components/AppShell";
import { CreateRoomPage } from "../pages/CreateRoomPage";
import { GamePage } from "../pages/GamePage";
import { JoinRoomPage } from "../pages/JoinRoomPage";
import { LobbyPage } from "../pages/LobbyPage";
import { StartPage } from "../pages/StartPage";

export function AppRoutes() {
  return (
    <BrowserRouter>
      <AppShell>
        <ActiveGameRedirect />
        <Routes>
          <Route path="/" element={<StartPage />} />
          <Route path="/create-room" element={<CreateRoomPage />} />
          <Route path="/join-room" element={<JoinRoomPage />} />
          <Route path="/lobby" element={<LobbyPage />} />
          <Route path="/game" element={<GamePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
