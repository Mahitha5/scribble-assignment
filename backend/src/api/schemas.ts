import { z } from "zod";

export const roomCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9]{4}$/, "Invalid room code format");

export const createRoomSchema = z.object({
  playerName: z.string().optional()
});

export const joinRoomSchema = z.object({
  playerName: z.string().optional()
});

export const startGameSchema = z.object({
  participantId: z.string().uuid()
});

export const roomCodeParamsSchema = z.object({
  code: roomCodeSchema
});

export const roomViewerQuerySchema = z.object({
  participantId: z.string().uuid().optional()
});

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}
