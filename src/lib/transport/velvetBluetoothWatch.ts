import type { RpcConnection } from "@zmkfirmware/zmk-studio-ts-client";
import { Request, Response } from "../../proto/zmk/device_info/device_info";
import { loggedCallRpc } from "../rpcLogging";

const CHECK_INTERVAL_MS = 5_000;
const REPLY_TIMEOUT_MS = 6_000;
const BUSY_TIMEOUT_MS = 30_000;

const DEVICE_INFO_REQUEST = Request.encode(
  Request.create({ getDeviceInfo: {} }),
).finish();

/**
 * ZMK sends Studio replies to the currently selected Bluetooth profile, even
 * if the previous host's link remains open. Periodic RPCs reset ZMK's idle
 * lock timer, so probe only the verified factory build that disables locking.
 */
export function watchVelvetBluetooth(
  connection: RpcConnection,
  deviceInfoSubsystem: number,
  lastPacketMs: (() => number) | null,
  onLost: () => void,
): () => void {
  let stopped = false;
  let firmwareVerified = false;
  let checkTimer: number | undefined;
  let replyTimer: number | undefined;
  let busySince: number | undefined;

  function stop() {
    stopped = true;
    window.clearTimeout(checkTimer);
    window.clearTimeout(replyTimer);
  }

  function lost() {
    if (stopped) return;
    stop();
    onLost();
  }

  function schedule() {
    checkTimer = window.setTimeout(() => void check(), CHECK_INTERVAL_MS);
  }

  async function check() {
    if (stopped) return;

    if (
      connection.request_response_readable.locked ||
      connection.request_writable.locked
    ) {
      // Wait for the current RPC instead of joining the SDK's request queue.
      // A stalled RPC must eventually release that queue for reconnection.
      const now = Date.now();
      busySince ??= now;
      const lastProgress = Math.max(busySince, lastPacketMs?.() ?? 0);
      if (now - lastProgress >= BUSY_TIMEOUT_MS) {
        lost();
      } else {
        schedule();
      }
      return;
    }

    busySince = undefined;
    replyTimer = window.setTimeout(lost, REPLY_TIMEOUT_MS);
    try {
      if (!firmwareVerified) {
        const reply = await loggedCallRpc(connection, {
          custom: {
            call: {
              subsystemIndex: deviceInfoSubsystem,
              payload: DEVICE_INFO_REQUEST,
            },
          },
        });
        const payload = reply.custom?.call?.payload;
        const build = payload
          ? Response.decode(payload).deviceInfo?.build
          : undefined;
        firmwareVerified =
          build?.board === "nice_nano" &&
          build.zmkVersion === "e5c9b69" &&
          build.moduleVersion === "8cedd2d" &&
          build.buildTimestamp === "2026-10-16T07:58:44Z";
        if (!firmwareVerified) stop();
      } else {
        const reply = await loggedCallRpc(connection, {
          core: { getLockState: true },
        });
        // If a matching build ever reports a locked state, let its firmware
        // control the lock timer. The probe has already proved reachability.
        if (reply.core?.getLockState === 0) {
          stop();
        } else if (reply.core?.getLockState !== 1) {
          lost();
        }
      }
    } catch {
      if (firmwareVerified) {
        lost();
      } else {
        stop();
      }
    } finally {
      window.clearTimeout(replyTimer);
      if (!stopped) schedule();
    }
  }

  schedule();
  return stop;
}
