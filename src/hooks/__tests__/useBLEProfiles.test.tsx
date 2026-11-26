import { act, renderHook } from "@testing-library/react";
import { useBLEProfiles } from "../useBLEProfiles";

const mockCall = jest.fn();

jest.mock("../useCustomSubsystem", () => ({
  ...jest.requireActual("../useCustomSubsystem"),
  useCustomSubsystem: () => ({
    subsystem: { identifier: "cormoran_ble" },
    ready: true,
    call: mockCall,
  }),
}));

describe("useBLEProfiles unpair errors", () => {
  beforeEach(() => {
    mockCall.mockReset().mockResolvedValue({});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it.each(["No response", new Error("Bluetooth connection lost.")])(
    "preserves the rejected RPC's reason (%s)",
    async (reason) => {
      const { result } = renderHook(() => useBLEProfiles());
      mockCall.mockRejectedValueOnce(reason);

      await act(async () => result.current.unpairProfile(1));

      expect(result.current.error).toBe(
        `Failed to unpair profile: ${typeof reason === "string" ? reason : reason.message}`,
      );
      expect(mockCall).toHaveBeenLastCalledWith(
        expect.objectContaining({ unpairProfile: { index: 1 } }),
        undefined,
      );
    },
  );

  it.each([
    [null, "Failed to unpair profile: No response from device"],
    [
      { error: { message: "Profile is unavailable" } },
      "Profile is unavailable",
    ],
  ])("shows an RPC failure response", async (response, message) => {
    const { result } = renderHook(() => useBLEProfiles());
    mockCall.mockResolvedValueOnce(response);

    await act(async () => result.current.unpairProfile(1));

    expect(result.current.error).toBe(message);
  });
});
