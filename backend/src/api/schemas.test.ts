import { describe, expect, it } from "vitest";
import {
  createRoomSchema,
  joinRoomSchema,
  leaveRoomSchema,
  roomCodeParamsSchema,
  startRoomSchema
} from "./schemas.js";

describe("schemas", () => {
  it("createRoomSchema accepts a valid body with playerName", () => {
    const result = createRoomSchema.parse({ playerName: "Alice" });

    expect(result.playerName).toBe("Alice");
  });

  it("createRoomSchema accepts missing playerName as empty string", () => {
    expect(createRoomSchema.parse({})).toEqual({ playerName: "" });
  });

  it("createRoomSchema preserves whitespace in playerName as-is", () => {
    expect(createRoomSchema.parse({ playerName: "   " })).toEqual({ playerName: "   " });
    expect(createRoomSchema.parse({ playerName: "  Ali  " })).toEqual({ playerName: "  Ali  " });
  });

  it("createRoomSchema rejects names over 50 characters", () => {
    expect(() => createRoomSchema.parse({ playerName: "a".repeat(51) })).toThrow(/too long/);
  });

  it("roomCodeParamsSchema rejects missing code", () => {
    expect(() => roomCodeParamsSchema.parse({})).toThrow();
  });

  it("roomCodeParamsSchema accepts 4-6 uppercase alphanumeric codes", () => {
    expect(roomCodeParamsSchema.parse({ code: "abcd" }).code).toBe("ABCD");
    expect(roomCodeParamsSchema.parse({ code: "AB12CD" }).code).toBe("AB12CD");
  });

  it("roomCodeParamsSchema rejects malformed codes", () => {
    expect(() => roomCodeParamsSchema.parse({ code: "abc" })).toThrow(/Room code must be/);
    expect(() => roomCodeParamsSchema.parse({ code: "ABCDEFG" })).toThrow(/Room code must be/);
    expect(() => roomCodeParamsSchema.parse({ code: "AB-CD" })).toThrow(/Room code must be/);
  });

  it("joinRoomSchema allows optional playerName", () => {
    expect(joinRoomSchema.parse({})).toEqual({ playerName: "" });
    expect(joinRoomSchema.parse({ playerName: "Bob" }).playerName).toBe("Bob");
  });

  it("leaveRoomSchema and startRoomSchema require uuid participantId", () => {
    expect(() => leaveRoomSchema.parse({ participantId: "not-a-uuid" })).toThrow();
    expect(() => startRoomSchema.parse({ participantId: "not-a-uuid" })).toThrow();
  });
});
