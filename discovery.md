# Incomplete behaviours

1. API default url is configured incorrectly in frontend/src/services/api.ts
2. Buttons are clickable without any data in frontend/src/pages/JoinRoomPage.tsx
3. No validations on the params that are in the route path in frontend/src/services/api.ts
4. Default player name is `Player`. Create duplicate names when multiple submissions happens without name in backend/src/services/roomStore.ts
5. There no way to identify who is host in frontend/src/pages/LobbyPage.tsx


# Assumptions

1. AGENTS.md is titled for Copilot but applies to any Spec Kit assistant
2. Only results are shown when the game ends, restart is a later step from scenario 4 in README.md
3. Host and first player is same
