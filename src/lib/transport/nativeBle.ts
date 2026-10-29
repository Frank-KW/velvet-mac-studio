import type { RpcTransport } from "@zmkfirmware/zmk-studio-ts-client/transport/index";
import { UserCancelledError } from "@zmkfirmware/zmk-studio-ts-client/transport/errors";

// Provided by the Electron preload on macOS. It talks to a CoreBluetooth
// helper, so it can reach a keyboard that is already connected to this Mac
// (which Web Bluetooth cannot see because the keyboard stops advertising).
interface NativeBle {
  connect(): Promise<{ label: string } | null>;
  write(data: string): Promise<void>;
  disconnect(): Promise<void>;
  onData(callback: (data: string) => void): () => void;
  onClosed(callback: () => void): () => void;
}

declare global {
  interface Window {
    nativeBle?: NativeBle;
  }
}

export function isNativeBleAvailable() {
  return typeof window !== "undefined" && !!window.nativeBle;
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(text: string) {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function connect(): Promise<RpcTransport> {
  const api = window.nativeBle;
  if (!api) {
    throw new Error("Native Bluetooth is not available");
  }

  let stopData: (() => void) | undefined;
  let stopClosed: (() => void) | undefined;
  const cleanup = () => {
    stopData?.();
    stopClosed?.();
  };

  // Subscribe before connecting so the first notification is not missed.
  const readable = new ReadableStream<Uint8Array>({
    start(controller) {
      stopData = api.onData((data) => controller.enqueue(fromBase64(data)));
      stopClosed = api.onClosed(() => {
        cleanup();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  let result: { label: string } | null;
  try {
    result = await api.connect();
  } catch (error) {
    cleanup();
    throw error;
  }
  if (!result) {
    cleanup();
    throw new UserCancelledError("User cancelled the connection attempt", {});
  }

  const writable = new WritableStream<Uint8Array>({
    write: (chunk) => api.write(toBase64(chunk)),
  });

  const abortController = new AbortController();
  abortController.signal.addEventListener("abort", () => {
    cleanup();
    void api.disconnect();
  });

  return { label: result.label, abortController, readable, writable };
}
