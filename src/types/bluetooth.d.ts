declare global {
  type BluetoothServiceUUID = string | number;

  interface BluetoothRequestDeviceFilter {
    services?: BluetoothServiceUUID[];
    name?: string;
    namePrefix?: string;
  }

  interface RequestDeviceOptions {
    filters?: BluetoothRequestDeviceFilter[];
    optionalServices?: BluetoothServiceUUID[];
    acceptAllDevices?: boolean;
  }

  interface Bluetooth {
    requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice>;
    getAvailability?: () => Promise<boolean>;
  }

  interface BluetoothRemoteGATTServer {
    connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
  }

  interface BluetoothDevice extends EventTarget {
    id: string;
    name?: string;
    gatt?: BluetoothRemoteGATTServer;
  }

  interface Navigator {
    bluetooth?: Bluetooth;
  }
}

export {};
