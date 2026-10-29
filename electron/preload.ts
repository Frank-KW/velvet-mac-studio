import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
});

// Strings only (base64) cross the bridge; the page decodes them.
contextBridge.exposeInMainWorld("nativeBle", {
  connect: (): Promise<{ label: string } | null> =>
    ipcRenderer.invoke("native-ble:connect"),
  write: (data: string): Promise<void> =>
    ipcRenderer.invoke("native-ble:write", data),
  disconnect: (): Promise<void> => ipcRenderer.invoke("native-ble:disconnect"),
  onData: (callback: (data: string) => void) => {
    const listener = (_event: unknown, data: string) => callback(data);
    ipcRenderer.on("native-ble:data", listener);
    return () => ipcRenderer.removeListener("native-ble:data", listener);
  },
  onClosed: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on("native-ble:closed", listener);
    return () => ipcRenderer.removeListener("native-ble:closed", listener);
  },
});
