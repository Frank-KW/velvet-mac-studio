import type { RpcConnection } from "@zmkfirmware/zmk-studio-ts-client";
import { Response } from "../../../proto/zmk/device_info/device_info";
import { loggedCallRpc } from "../../rpcLogging";
import { watchVelvetBluetooth } from "../velvetBluetoothWatch";

jest.mock("../../rpcLogging", () => ({ loggedCallRpc: jest.fn() }));

const rpc = jest.mocked(loggedCallRpc);

function firmwareInfo(buildTimestamp = "2026-10-16T07:58:44Z") {
  return {
    requestId: 0,
    custom: {
      call: {
        payload: Response.encode(
          Response.create({
            deviceInfo: {
              build: {
                board: "nice_nano",
                zmkVersion: "e5c9b69",
                moduleVersion: "8cedd2d",
                buildTimestamp,
              },
            },
          }),
        ).finish(),
      },
    },
  };
}

function createConnection(): RpcConnection {
  return {
    label: "Velvet46",
    request_response_readable: new ReadableStream(),
    request_writable: new WritableStream(),
    notification_readable: new ReadableStream(),
    current_request: 0,
  };
}

describe("Velvet46 Bluetooth reply monitoring", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    rpc.mockReset();
  });

  afterEach(() => jest.useRealTimers());

  it("detects missing Studio replies even when the Bluetooth stream stays open", async () => {
    rpc.mockResolvedValueOnce(firmwareInfo());
    rpc.mockResolvedValueOnce({ requestId: 1, core: { getLockState: 1 } });
    rpc.mockImplementation(() => new Promise(() => {}));
    const connection = createConnection();
    const onLost = jest.fn();
    watchVelvetBluetooth(connection, 4, null, onLost);

    await jest.advanceTimersByTimeAsync(10_000);
    expect(rpc).toHaveBeenLastCalledWith(connection, {
      core: { getLockState: true },
    });
    expect(onLost).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(10_999);
    expect(onLost).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(onLost).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(60_000);
    expect(rpc).toHaveBeenCalledTimes(3);
  });

  it("does not keep probing an unverified firmware build", async () => {
    rpc.mockResolvedValueOnce(firmwareInfo("2026-10-17T00:00:00Z"));
    const onLost = jest.fn();
    watchVelvetBluetooth(createConnection(), 4, null, onLost);

    await jest.advanceTimersByTimeAsync(60_000);

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(onLost).not.toHaveBeenCalled();
  });

  it("stops probing if the keyboard reports that Studio is locked", async () => {
    rpc.mockResolvedValueOnce(firmwareInfo());
    rpc.mockResolvedValueOnce({ requestId: 1, core: { getLockState: 0 } });
    const onLost = jest.fn();
    watchVelvetBluetooth(createConnection(), 4, null, onLost);

    await jest.advanceTimersByTimeAsync(60_000);

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(onLost).not.toHaveBeenCalled();
  });

  it("waits for an ongoing RPC and reports loss only after 30 seconds without progress", async () => {
    rpc.mockResolvedValueOnce(firmwareInfo());
    const connection = createConnection();
    const onLost = jest.fn();
    let lastPacketMs = Date.now();
    watchVelvetBluetooth(connection, 4, () => lastPacketMs, onLost);

    await jest.advanceTimersByTimeAsync(5_000);
    const reader = connection.request_response_readable.getReader();
    await jest.advanceTimersByTimeAsync(30_000);
    expect(onLost).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledTimes(1);

    lastPacketMs = Date.now();
    await jest.advanceTimersByTimeAsync(29_999);
    expect(onLost).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(onLost).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledTimes(1);
    reader.releaseLock();
  });

  it("detects a stalled user RPC before the first firmware check", async () => {
    const connection = createConnection();
    const reader = connection.request_response_readable.getReader();
    const onLost = jest.fn();
    watchVelvetBluetooth(connection, 4, null, onLost);

    await jest.advanceTimersByTimeAsync(35_000);

    expect(onLost).toHaveBeenCalledTimes(1);
    expect(rpc).not.toHaveBeenCalled();
    reader.releaseLock();
  });

  it("ignores the timeout of a session that was already closed", async () => {
    rpc.mockResolvedValueOnce(firmwareInfo());
    rpc.mockImplementation(() => new Promise(() => {}));
    const onLost = jest.fn();
    const stop = watchVelvetBluetooth(createConnection(), 4, null, onLost);

    await jest.advanceTimersByTimeAsync(10_000);
    stop();
    await jest.advanceTimersByTimeAsync(60_000);

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(onLost).not.toHaveBeenCalled();
  });
});
