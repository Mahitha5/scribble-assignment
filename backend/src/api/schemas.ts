import { z } from "zod";

export const ROOM_CODE_REGEX = /^[A-Z0-9]{4,6}$/;

const playerNameSchema = z.preprocess(
  (value) => (typeof value === "string" ? value : ""),
  z.string().max(50, "Player name is too long")
);

export const createRoomSchema = z.object({
  playerName: playerNameSchema.optional().default("")
});

export const joinRoomSchema = z.object({
  playerName: playerNameSchema.optional().default(""),
  participantId: z.string().uuid().optional()
});

export const roomCodeParamsSchema = z.object({
  code: z
    .string()
    .transform((value) => value.toUpperCase())
    .refine((value) => ROOM_CODE_REGEX.test(value), {
      message: "Room code must be 4-6 uppercase letters and numbers"
    })
});

export const roomViewerQuerySchema = z.object({
  participantId: z.string().uuid().optional()
});

export const leaveRoomSchema = z.object({
  participantId: z.string().uuid("Invalid participant ID format")
});

export const startRoomSchema = z.object({
  participantId: z.string().uuid("Invalid participant ID format")
});

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}
