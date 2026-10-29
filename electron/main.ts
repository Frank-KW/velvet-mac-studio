import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { spawn } from "child_process";
import type { ChildProcessWithoutNullStreams } from "child_process";
import fs from "fs";
import type { BluetoothDevice, SerialPort, Session } from "electron";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let pendingBluetoothCallback: ((deviceId: string) => void) | null = null;
let pendingBluetoothWindow: BrowserWindow | null = null;
let bluetoothPromptTimer: NodeJS.Timeout | null = null;
const bluetoothDevices = new Map<string, BluetoothDevice>();
const BLUETOOTH_DISCOVERY_TIMEOUT_MS = 6000;
const BLUETOOTH_DISCOVERY_SETTLE_MS = 800;

function cancelPendingBluetoothSelection() {
  if (bluetoothPromptTimer) {
    clearTimeout(bluetoothPromptTimer);
    bluetoothPromptTimer = null;
  }

  pendingBluetoothCallback?.("");
  pendingBluetoothCallback = null;
  pendingBluetoothWindow = null;
  bluetoothDevices.clear();
}

function formatSerialPortLabel(port: SerialPort) {
  return [
    port.displayName,
    port.portName,
    port.vendorId && port.productId
      ? `VID:${port.vendorId} PID:${port.productId}`
      : undefined,
  ]
    .filter(Boolean)
    .join(" - ");
}

function formatBluetoothDeviceLabel(device: BluetoothDevice) {
  return device.deviceName || device.deviceId;
}

async function promptForSerialPort(
  window: BrowserWindow,
  ports: SerialPort[],
): Promise<string> {
  if (ports.length === 0) {
    await dialog.showMessageBox(window, {
      type: "warning",
      title: "No Serial Ports Found",
      message: "No serial ports are currently available.",
      detail:
        "Reconnect the keyboard, unlock ZMK Studio if needed, then try Connect via USB again.",
      buttons: ["OK"],
      defaultId: 0,
    });
    return "";
  }

  const buttons = [...ports.map(formatSerialPortLabel), "Cancel"];
  const { response } = await dialog.showMessageBox(window, {
    type: "question",
    title: "Select USB Serial Port",
    message: "Choose the keyboard serial port to connect.",
    detail:
      "If multiple ports are listed, pick the one that belongs to your DYA keyboard.",
    buttons,
    cancelId: ports.length,
    defaultId: 0,
    noLink: true,
  });

  return response < ports.length ? ports[response].portId : "";
}

async function promptForBluetoothDevice(
  window: BrowserWindow,
  devices: BluetoothDevice[],
): Promise<string> {
  if (devices.length === 0) {
    await dialog.showMessageBox(window, {
      type: "warning",
      title: "No Bluetooth Devices Found",
      message: "No compatible Bluetooth devices are currently discoverable.",
      detail:
        "Put the keyboard into discoverable mode, press the studio unlock key if required, then try Connect via Bluetooth again.",
      buttons: ["OK"],
      defaultId: 0,
    });
    return "";
  }

  const buttons = [...devices.map(formatBluetoothDeviceLabel), "Cancel"];
  const { response } = await dialog.showMessageBox(window, {
    type: "question",
    title: "Select Bluetooth Device",
    message: "Choose the keyboard Bluetooth device to connect.",
    detail:
      "If multiple devices are listed, pick the one that belongs to your DYA keyboard.",
    buttons,
    cancelId: devices.length,
    defaultId: 0,
    noLink: true,
  });

  return response < devices.length ? devices[response].deviceId : "";
}

function registerSerialHandlers(session: Session, window: BrowserWindow) {
  session.setPermissionCheckHandler((_webContents, permission) => {
    if (permission === "serial") {
      return true;
    }

    return false;
  });

  session.on(
    "select-serial-port",
    async (event, portList, contents, callback) => {
      if (contents !== window.webContents) {
        return;
      }

      event.preventDefault();
      cancelPendingBluetoothSelection();

      let portId = "";

      try {
        portId = await promptForSerialPort(window, portList);
      } catch (error) {
        console.error("Failed to choose serial port:", error);
      }

      callback(portId);
    },
  );
}

function registerBluetoothHandlers(window: BrowserWindow) {
  window.webContents.on(
    "select-bluetooth-device",
    async (event, devices, callback) => {
      event.preventDefault();

      pendingBluetoothCallback = callback;

      pendingBluetoothWindow = window;

      for (const device of devices) {
        bluetoothDevices.set(device.deviceId, device);
      }

      if (bluetoothPromptTimer) {
        clearTimeout(bluetoothPromptTimer);
      }

      const promptDelay =
        bluetoothDevices.size > 0
          ? BLUETOOTH_DISCOVERY_SETTLE_MS
          : BLUETOOTH_DISCOVERY_TIMEOUT_MS;

      bluetoothPromptTimer = setTimeout(async () => {
        const dialogWindow = pendingBluetoothWindow;
        const selectBluetoothDevice = pendingBluetoothCallback;
        const discoveredDevices = Array.from(bluetoothDevices.values());

        bluetoothPromptTimer = null;
        pendingBluetoothWindow = null;
        pendingBluetoothCallback = null;
        bluetoothDevices.clear();

        if (!dialogWindow || !selectBluetoothDevice) {
          return;
        }

        let deviceId = "";

        try {
          deviceId = await promptForBluetoothDevice(
            dialogWindow,
            discoveredDevices,
          );
        } catch (error) {
          console.error("Failed to choose Bluetooth device:", error);
        }

        selectBluetoothDevice(deviceId);
      }, promptDelay);
    },
  );
}

// --- Native Bluetooth bridge -------------------------------------------------
// Web Bluetooth only sees advertising keyboards. A keyboard already connected
// to this Mac does not advertise, so a Swift CoreBluetooth helper picks it up
// from the system instead. See electron/native/ble-bridge.swift.

type BridgeEvent = {
  event: string;
  [key: string]: unknown;
};

type BridgeDevice = { id: string; name: string; connected: boolean };

let bridgeProcess: ChildProcessWithoutNullStreams | null = null;
let bridgeBuffer = "";
const bridgeWaiters = new Set<(event: BridgeEvent) => void>();

function bridgePath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "dya-ble-bridge")
    : path.join(__dirname, "../build-native/dya-ble-bridge");
}

// The helper can outlive the window (quit, close); sending to a destroyed
// window throws "Object has been destroyed" in the main process.
function sendToWindow(channel: string, ...args: unknown[]) {
  if (
    mainWindow &&
    !mainWindow.isDestroyed() &&
    !mainWindow.webContents.isDestroyed()
  ) {
    mainWindow.webContents.send(channel, ...args);
  }
}

function handleBridgeEvent(event: BridgeEvent) {
  if (event.event === "data") {
    sendToWindow("native-ble:data", event.data);
  } else if (event.event === "disconnected") {
    sendToWindow("native-ble:closed");
  }
  for (const waiter of [...bridgeWaiters]) {
    waiter(event);
  }
}

function startBridge(): ChildProcessWithoutNullStreams {
  if (bridgeProcess) {
    return bridgeProcess;
  }

  const binary = bridgePath();
  if (!fs.existsSync(binary)) {
    throw new Error(`Bluetooth helper not found at ${binary}`);
  }

  const child = spawn(binary, [], { stdio: ["pipe", "pipe", "pipe"] });
  bridgeProcess = child;
  bridgeBuffer = "";

  child.stdout.on("data", (chunk: Buffer) => {
    bridgeBuffer += chunk.toString("utf8");
    let newline = bridgeBuffer.indexOf("\n");
    while (newline >= 0) {
      const line = bridgeBuffer.slice(0, newline);
      bridgeBuffer = bridgeBuffer.slice(newline + 1);
      newline = bridgeBuffer.indexOf("\n");
      try {
        handleBridgeEvent(JSON.parse(line) as BridgeEvent);
      } catch (error) {
        console.error("Bad bridge output:", line, error);
      }
    }
  });
  child.stderr.on("data", (chunk: Buffer) => {
    console.error("[ble-bridge]", chunk.toString("utf8"));
  });
  child.on("exit", (code, signal) => {
    if (bridgeProcess !== child) {
      return; // stopped on purpose while quitting
    }
    bridgeProcess = null;
    handleBridgeEvent({
      event: "error",
      message: `Bluetooth helper stopped (code ${code}, signal ${signal}).`,
    });
    sendToWindow("native-ble:closed");
  });

  return child;
}

function sendToBridge(command: Record<string, unknown>) {
  startBridge().stdin.write(`${JSON.stringify(command)}\n`);
}

function waitForBridge<T extends BridgeEvent>(
  wanted: string,
  timeoutMs: number,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      bridgeWaiters.delete(waiter);
      reject(new Error(`Timed out waiting for Bluetooth (${wanted}).`));
    }, timeoutMs);
    const waiter = (event: BridgeEvent) => {
      if (event.event === "error") {
        clearTimeout(timer);
        bridgeWaiters.delete(waiter);
        reject(new Error(String(event.message)));
      } else if (event.event === wanted) {
        clearTimeout(timer);
        bridgeWaiters.delete(waiter);
        resolve(event as T);
      }
    };
    bridgeWaiters.add(waiter);
  });
}

async function chooseNativeDevice(
  window: BrowserWindow,
  devices: BridgeDevice[],
): Promise<BridgeDevice | null> {
  if (devices.length === 0) {
    await dialog.showMessageBox(window, {
      type: "warning",
      title: "No Bluetooth Keyboards Found",
      message: "No keyboard with the ZMK Studio service was found.",
      detail:
        "Make sure the keyboard is on and connected to this Mac, and that its firmware has ZMK Studio enabled.",
      buttons: ["OK"],
      defaultId: 0,
    });
    return null;
  }

  if (devices.length === 1) {
    return devices[0];
  }

  const buttons = [
    ...devices.map(
      (d) => `${d.name}${d.connected ? " (connected to this Mac)" : ""}`,
    ),
    "Cancel",
  ];
  const { response } = await dialog.showMessageBox(window, {
    type: "question",
    title: "Select Bluetooth Keyboard",
    message: "Choose the keyboard to connect.",
    buttons,
    cancelId: devices.length,
    defaultId: 0,
    noLink: true,
  });
  return response < devices.length ? devices[response] : null;
}

function registerNativeBleHandlers(window: BrowserWindow) {
  // createWindow can run more than once (macOS re-activation); IPC handlers
  // are process-wide, so drop any earlier registration first.
  for (const channel of [
    "native-ble:connect",
    "native-ble:write",
    "native-ble:disconnect",
  ]) {
    ipcMain.removeHandler(channel);
  }

  ipcMain.handle("native-ble:connect", async () => {
    const listed = waitForBridge<BridgeEvent & { devices: BridgeDevice[] }>(
      "devices",
      15000,
    );
    sendToBridge({ cmd: "list" });
    const { devices } = await listed;

    const device = await chooseNativeDevice(window, devices);
    if (!device) {
      return null;
    }

    const connected = waitForBridge<BridgeEvent & { name: string }>(
      "connected",
      20000,
    );
    sendToBridge({ cmd: "connect", id: device.id });
    const { name } = await connected;
    return { label: name };
  });

  ipcMain.handle("native-ble:write", (_event, data: string) => {
    sendToBridge({ cmd: "write", data });
  });

  ipcMain.handle("native-ble:disconnect", () => {
    if (bridgeProcess) {
      sendToBridge({ cmd: "disconnect" });
    }
  });
}

app.on("will-quit", () => {
  const child = bridgeProcess;
  bridgeProcess = null;
  child?.kill();
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      // CommonJS: sandboxed renderers cannot load an ES module preload.
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  registerSerialHandlers(mainWindow.webContents.session, mainWindow);
  registerBluetoothHandlers(mainWindow);
  registerNativeBleHandlers(mainWindow);

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
