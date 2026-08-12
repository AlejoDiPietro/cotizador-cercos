import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // El dominio es codigo puro: no necesita DOM ni servidor para probarse.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
