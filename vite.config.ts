import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import tailwindcss from "@tailwindcss/vite";

/**
 * `@keyboard-hub/adapter-zmk` is built against its own copy of the ZMK Studio
 * client, but `call_rpc` serializes through a module-level mutex. Two copies
 * means one `RpcConnection` guarded by two independent mutexes, and concurrent
 * calls corrupt the shared request/response streams. The two clients are the
 * same upstream with identical wire types, so collapse them onto the fork DYA
 * Studio already uses.
 *
 * Mirrored in `tsconfig.app.json` (`paths`) and `jest.config.ts`
 * (`moduleNameMapper`) — all three must agree.
 */
const ZMK_STUDIO_CLIENT_ALIAS = {
  "@keyboard-hub/zmk-studio-ts-client": "@zmkfirmware/zmk-studio-ts-client",
};

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    // `./` lets the Electron `file://` build resolve assets; web release sets `VITE_BASE=/`.
    base: env.VITE_BASE || "./",
    resolve: { alias: ZMK_STUDIO_CLIENT_ALIAS },
    plugins: [
      tailwindcss(),
      react({
        babel: {
          plugins: [["babel-plugin-react-compiler"]],
        },
      }),
      svgr(),
    ],
  };
});
