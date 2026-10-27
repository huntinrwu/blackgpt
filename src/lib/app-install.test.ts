import { describe, expect, it } from "vitest";
import { detectInstallEnvironment } from "./app-install";

describe("app installation device detection", () => {
  it("detects iPhone Safari", () => {
    expect(detectInstallEnvironment("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile Safari/604.1", "iPhone", 5)).toEqual({ device: "iphone", browser: "safari" });
  });
  it("recognizes an iPad requesting the desktop site", () => {
    expect(detectInstallEnvironment("Mozilla/5.0 (Macintosh; Intel Mac OS X) Version/18.0 Safari/605.1", "MacIntel", 5)).toEqual({ device: "ipad", browser: "safari" });
  });
  it("detects Android Chrome", () => {
    expect(detectInstallEnvironment("Mozilla/5.0 (Linux; Android 15) Chrome/130.0 Mobile Safari/537.36", "Linux armv8l", 5)).toEqual({ device: "android", browser: "chrome" });
  });
  it("detects a Mac without confusing it with an iPad", () => {
    expect(detectInstallEnvironment("Mozilla/5.0 (Macintosh) Version/18.0 Safari/605.1", "MacIntel", 0)).toEqual({ device: "mac", browser: "safari" });
  });
  it("detects Windows Edge rather than Chrome", () => {
    expect(detectInstallEnvironment("Mozilla/5.0 (Windows NT 10.0) Chrome/130.0 Safari/537.36 Edg/130.0", "Win32", 0)).toEqual({ device: "windows", browser: "edge" });
  });
  it("offers a fallback on unknown computers", () => {
    expect(detectInstallEnvironment("Firefox/132.0", "Linux x86_64", 0)).toEqual({ device: "other", browser: "other" });
  });
});