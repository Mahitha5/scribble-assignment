import { Router } from "express";
import {
  createRoomSchema,
  HttpError,
  joinRoomSchema,
  leaveRoomSchema,
  roomCodeParamsSchema,
  roomViewerQuerySchema,
  startRoomSchema
} from "./schemas.js";
import {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  startGame,
  toRoomSnapshot
} from "../services/roomStore.js";

export function createRoomsRouter() {
  const router = Router();

  router.post("/", (request, response, next) => {
    try {
      const { playerName } = createRoomSchema.parse(request.body);
      const result = createRoom(playerName);

      response.status(201).json({
        participantId: result.participantId,
        room: toRoomSnapshot(result.room, result.participantId)
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/join", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { playerName, participantId } = joinRoomSchema.parse(request.body);
      const result = joinRoom(code, playerName, participantId);

      if (!result.ok) {
        if (result.reason === "not_found") {
          throw new HttpError(404, "Room not found");
        }
        throw new HttpError(400, "You are already in this room");
      }

      response.json({
        participantId: result.participantId,
        room: toRoomSnapshot(result.room, result.participantId)
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/leave", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId } = leaveRoomSchema.parse(request.body);
      const result = leaveRoom(code, participantId);

      if (!result.ok) {
        if (result.reason === "not_found") {
          throw new HttpError(404, "Room not found");
        }
        throw new HttpError(404, "Participant not found in room");
      }

      response.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/start", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId } = startRoomSchema.parse(request.body);
      const result = startGame(code, participantId);

      if (!result.ok) {
        if (result.reason === "not_found") {
          throw new HttpError(404, "Room not found");
        }
        if (result.reason === "not_host") {
          throw new HttpError(403, "Only the host can start the game");
        }
        if (result.reason === "not_enough_players") {
          throw new HttpError(400, "At least 2 players are required to start");
        }
        throw new HttpError(400, "Game has already started");
      }

      response.json({
        room: toRoomSnapshot(result.room, participantId)
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:code", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId } = roomViewerQuerySchema.parse(request.query);
      const room = getRoom(code, participantId);

      if (!room) {
        throw new HttpError(404, "Room not found");
      }

      response.json({
        room: toRoomSnapshot(room, participantId)
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
