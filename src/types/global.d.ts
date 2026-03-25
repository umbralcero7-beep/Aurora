// Polyfills for Web Serial API
declare interface SerialPort {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  writable: WritableStream<Uint8Array> | null;
  readable: ReadableStream<Uint8Array> | null;
}

declare interface Navigator {
  serial: {
    requestPort(options?: any): Promise<SerialPort>;
    getPorts(): Promise<SerialPort[]>;
  };
}
