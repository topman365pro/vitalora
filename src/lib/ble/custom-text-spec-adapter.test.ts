import { describe, expect, it, vi } from "vitest";

import { CustomTextSpecAdapter } from "@/lib/ble/custom-text-spec-adapter";

describe("CustomTextSpecAdapter", () => {
  it("requests a browser bluetooth device with the provided spec", async () => {
    const requestDevice = vi.fn().mockResolvedValue({
      id: "custom-1",
      name: "Custom Watch",
    });

    Object.defineProperty(navigator, "bluetooth", {
      value: { requestDevice },
      configurable: true,
    });

    const adapter = new CustomTextSpecAdapter({
      namePrefix: "Custom",
      serviceUuids: ["heart_rate"],
      optionalServiceUuids: ["battery_service"],
    });

    await adapter.scanAndConnect();

    expect(requestDevice).toHaveBeenCalledWith({
      filters: [
        {
          namePrefix: "Custom",
          services: ["heart_rate"],
        },
      ],
      optionalServices: ["battery_service"],
    });
  });

  it("throws when the custom spec is missing", async () => {
    Object.defineProperty(navigator, "bluetooth", {
      value: { requestDevice: vi.fn() },
      configurable: true,
    });

    const adapter = new CustomTextSpecAdapter();
    await expect(adapter.scanAndConnect()).rejects.toThrow("Custom BLE spec");
  });
});
