import { Router } from "express";
import type { NextFunction } from "express";
import {
  appendStrokeSchema,
  clearCanvasSchema,
  createRoomSchema,
  endRoundSchema,
  HttpError,
  joinRoomSchema,
  restartGameSchema,
  roomCodeParamsSchema,
  roomViewerQuerySchema,
  startGameSchema,
  submitGuessSchema
} from "./schemas.js";
import {
  appendStroke,
  clearCanvas,
  createRoom,
  endRound,
  getRoomSnapshot,
  joinRoom,
  restartGame,
  RoomStoreError,
  startGame,
  submitGuess
} from "../services/roomStore.js";

function mapRoomStoreError(error: RoomStoreError) {
  switch (error.code) {
    case "INVALID_CODE":
    case "INVALID_STROKE":
    case "EMPTY_GUESS":
    case "INSUFFICIENT_PLAYERS":
    case "INVALID_PLAYER_NAMES":
    case "DUPLICATE_PLAYER_NAMES":
      return new HttpError(400, error.message);
    case "ROOM_NOT_FOUND":
      return new HttpError(404, error.message);
    case "DUPLICATE_NAME":
    case "NOT_PLAYING":
    case "NOT_IN_RESULT":
      return new HttpError(409, error.message);
    case "NOT_HOST":
    case "NOT_DRAWER":
    case "DRAWER_CANNOT_GUESS":
      return new HttpError(403, error.message);
    case "GAME_IN_PROGRESS":
      return new HttpError(409, error.message);
    default:
      return new HttpError(500, "Unexpected room error");
  }
}

function handleRoomRouteError(error: unknown, next: NextFunction) {
  if (error instanceof RoomStoreError) {
    next(mapRoomStoreError(error));
    return;
  }

  next(error);
}

export function createRoomsRouter() {
  const router = Router();

  router.post("/", (request, response, next) => {
    try {
      const { playerName } = createRoomSchema.parse(request.body);
      const result = createRoom(playerName);

      response.status(201).json({
        participantId: result.participantId,
        room: getRoomSnapshot(result.room.code, result.participantId)
      });
    } catch (error) {
      handleRoomRouteError(error, next);
    }
  });

  router.post("/:code/join", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { playerName } = joinRoomSchema.parse(request.body);
      const result = joinRoom(code, playerName);

      response.json({
        participantId: result.participantId,
        room: getRoomSnapshot(result.room.code, result.participantId)
      });
    } catch (error) {
      handleRoomRouteError(error, next);
    }
  });

  router.get("/:code", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId } = roomViewerQuerySchema.parse(request.query);
      const room = getRoomSnapshot(code, participantId);

      response.json({ room });
    } catch (error) {
      handleRoomRouteError(error, next);
    }
  });

  router.post("/:code/start", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId } = startGameSchema.parse(request.body);
      const room = startGame(code, participantId);

      response.json({ room });
    } catch (error) {
      handleRoomRouteError(error, next);
    }
  });

  router.post("/:code/strokes", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId, stroke } = appendStrokeSchema.parse(request.body);
      const room = appendStroke(code, participantId, stroke);

      response.json({ room });
    } catch (error) {
      handleRoomRouteError(error, next);
    }
  });

  router.post("/:code/canvas/clear", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId } = clearCanvasSchema.parse(request.body);
      const room = clearCanvas(code, participantId);

      response.json({ room });
    } catch (error) {
      handleRoomRouteError(error, next);
    }
  });

  router.post("/:code/guesses", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId, text } = submitGuessSchema.parse(request.body);
      const room = submitGuess(code, participantId, text);

      response.json({ room });
    } catch (error) {
      handleRoomRouteError(error, next);
    }
  });

  router.post("/:code/end", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId } = endRoundSchema.parse(request.body);
      const room = endRound(code, participantId);

      response.json({ room });
    } catch (error) {
      handleRoomRouteError(error, next);
    }
  });

  router.post("/:code/restart", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId } = restartGameSchema.parse(request.body);
      const room = restartGame(code, participantId);

      response.json({ room });
    } catch (error) {
      handleRoomRouteError(error, next);
    }
  });

  return router;
}
