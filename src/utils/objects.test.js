import { describe, it, expect } from "vitest";
import { stripUndefined } from "./objects.js";

describe("stripUndefined", () => {
  it("entfernt undefined-Keys", () => {
    expect(stripUndefined({ a: 1, b: undefined })).toEqual({ a: 1 });
  });
  it("erhält null (intentional, nicht undefined)", () => {
    expect(stripUndefined({ a: null })).toEqual({ a: null });
  });
  it("erhält leeren String", () => {
    expect(stripUndefined({ a: "" })).toEqual({ a: "" });
  });
  it("erhält 0", () => {
    expect(stripUndefined({ a: 0 })).toEqual({ a: 0 });
  });
  it("erhält false", () => {
    expect(stripUndefined({ a: false })).toEqual({ a: false });
  });
  it("leeres Objekt → leeres Objekt", () => {
    expect(stripUndefined({})).toEqual({});
  });
  it("null → {} (defensiv, kein Crash)", () => {
    expect(stripUndefined(null)).toEqual({});
  });
  it("undefined → {} (defensiv, kein Crash)", () => {
    expect(stripUndefined(undefined)).toEqual({});
  });
});
