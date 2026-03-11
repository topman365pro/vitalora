import { CustomTextSpecAdapter } from "@/lib/ble/custom-text-spec-adapter";
import { MockDeviceAdapter } from "@/lib/ble/mock-device-adapter";
import type { DeviceAdapter } from "@/lib/ble/types";

export function createDeviceAdapter(kind = process.env.NEXT_PUBLIC_DEFAULT_ADAPTER ?? "mock"): DeviceAdapter {
  if (kind === "custom") {
    return new CustomTextSpecAdapter();
  }

  return new MockDeviceAdapter();
}

export * from "@/lib/ble/types";
