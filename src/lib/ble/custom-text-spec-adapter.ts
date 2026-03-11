import type { DeviceAdapter, DeviceConnection, DeviceIdentity } from "@/lib/ble/types";

type CustomBluetoothSpec = {
  namePrefix?: string;
  serviceUuids: BluetoothServiceUUID[];
  optionalServiceUuids?: BluetoothServiceUUID[];
};

export class CustomTextSpecAdapter implements DeviceAdapter {
  private device: BluetoothDevice | null = null;

  constructor(private readonly spec: CustomBluetoothSpec | null = null) {}

  async scanAndConnect(): Promise<DeviceConnection> {
    if (!navigator.bluetooth) {
      throw new Error("Web Bluetooth is not available in this browser");
    }

    if (!this.spec) {
      throw new Error("Custom BLE spec has not been configured yet");
    }

    const device = await navigator.bluetooth.requestDevice({
      filters: [
        {
          namePrefix: this.spec.namePrefix,
          services: this.spec.serviceUuids,
        },
      ],
      optionalServices: this.spec.optionalServiceUuids,
    });

    this.device = device;

    return {
      id: device.id,
      name: device.name ?? "Custom health device",
    };
  }

  async startStreaming() {
    throw new Error("Custom BLE parsing will be added when the plaintext spec arrives");
  }

  async stopStreaming() {}

  async getDeviceMetadata(): Promise<DeviceIdentity> {
    return {
      deviceName: this.device?.name ?? "Custom health device",
      manufacturer: "Custom",
      model: "Pending spec",
      metadata: {
        adapter: "custom",
        bluetoothId: this.device?.id ?? null,
      },
    };
  }
}
