import { describe, it, expect } from "vitest";
import { blobToDataURL } from "./image.js";

describe("blobToDataURL", () => {
  it("konvertiert kleinen Blob in data:-URL mit korrektem MIME-Prefix", async () => {
    const blob = new Blob(["hello"], { type: "text/plain" });
    const url = await blobToDataURL(blob);
    expect(url).toMatch(/^data:text\/plain/);
  });

  it("encoded den Inhalt base64", async () => {
    const blob = new Blob(["hi"], { type: "text/plain" });
    const url = await blobToDataURL(blob);
    // 'hi' base64 = 'aGk='
    expect(url).toContain("aGk=");
  });

  it("akzeptiert leeren Blob", async () => {
    const blob = new Blob([], { type: "image/jpeg" });
    const url = await blobToDataURL(blob);
    expect(url).toBe("data:image/jpeg;base64,");
  });

  it("wirft bei null-Input", async () => {
    await expect(blobToDataURL(null)).rejects.toThrow(/Blob fehlt/);
  });

  it("wirft bei undefined-Input", async () => {
    await expect(blobToDataURL(undefined)).rejects.toThrow(/Blob fehlt/);
  });
});
