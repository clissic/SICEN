import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["src/test/setup.js"],
    include: [
      "src/utils/mfa.test.js",
      "src/api/client.mfa.test.js",
      "src/components/mfa/**/*.test.{js,jsx}",
    ],
  },
});
