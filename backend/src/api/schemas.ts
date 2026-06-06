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

export const endRoundSchema = z.object({
  participantId: z.string().uuid()
});

export const restartGameSchema = z.object({
  participantId: z.string().uuid()
});

export const roomCodeParamsSchema = z.object({
  code: roomCodeSchema
});

export const roomViewerQuerySchema = z.object({
  participantId: z.string().uuid().optional()
});

export const pointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1)
});

export const strokeInputSchema = z.object({
  points: z.array(pointSchema).min(2, "Invalid stroke"),
  color: z.string().optional().default("#000000"),
  lineWidth: z.number().positive().optional().default(4)
});

export const appendStrokeSchema = z.object({
  participantId: z.string().uuid(),
  stroke: strokeInputSchema
});

export const clearCanvasSchema = z.object({
  participantId: z.string().uuid()
});

export const submitGuessSchema = z.object({
  participantId: z.string().uuid(),
  text: z.string()
});

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}
