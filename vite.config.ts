import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createRequire } from "module";
import { componentTagger } from "lovable-tagger";

// Optional build-time raster image compression. This is intentionally opt-in
// because the optimizer adds a slow, production-only build path and has caused
// Rollup regex parsing failures on some VPS installs after processing map tiles.
const require = createRequire(import.meta.url);
function optionalImageOptimizer(enabled: boolean) {
  if (!enabled) {
    return null;
  }

  try {
    const { ViteImageOptimizer } = require("vite-plugin-image-optimizer");
    return ViteImageOptimizer({
      // Cache optimized output so unchanged images (e.g. the thousands of static
      // map-tiles + leaves) are NOT re-compressed on every build. First build is
      // slow; subsequent builds reuse the cache and finish in seconds.
      cache: true,
      cacheLocation: "node_modules/.cache/vite-plugin-image-optimizer",
      png: { quality: 75 },
      jpeg: { quality: 75 },
      jpg: { quality: 75 },
      webp: { quality: 80, effort: 6 },
      avif: { quality: 60, effort: 4 },
    });
  } catch {
    return null;
  }
}

function fixInvalidQuestionMarkRegex() {
  return {
    name: "fix-invalid-question-mark-regex",
    enforce: "post" as const,
    transform(code: string, id: string) {
      if (!code.includes("/?/g")) {
        return null;
      }

      console.warn(`[build] Fixed invalid /?/g regex literal in ${id}`);
      return {
        code: code.replace(/\/\?\/g/g, "/\\?/g"),
        map: null,
      };
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxy = env.VITE_DEV_API_PROXY || 'http://127.0.0.1:5001';

  return {
    preview: {
        host: true,
        port: 5000,
        allowedHosts: [
            "aircore.xyz",
            "www.aircore.xyz",
            "144.91.69.111",
            "localhost",
            "127.0.0.1",
        ],
        proxy: {
            "/api": {
                target: apiProxy,
                changeOrigin: true,
                ws: true,
            },
        },
    },
    server: {
      host: "::",
      port: 5000,
      proxy: {
        "/api": {
          target: apiProxy,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    plugins: [
      react(),
      fixInvalidQuestionMarkRegex(),
      // mode === "development" && componentTagger(),
      mode !== "development" && optionalImageOptimizer(env.VITE_OPTIMIZE_IMAGES === "true"),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      // Prevent duplicate three.js copies (breaks react-globe.gl at runtime).
      dedupe: ["three"],
    },
    optimizeDeps: {
      include: ["react-globe.gl", "three", "three-globe", "globe.gl", "@vis.gl/react-maplibre", "maplibre-gl"],
    },
    build: {
      target: "es2020",
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          chunkFileNames: "assets/c-[hash].js",
          entryFileNames: "assets/e-[hash].js",
          assetFileNames: "assets/a-[hash][extname]",
          manualChunks(id) {
            if (!id.includes("node_modules")) {
              if (id.includes("/src/pages/Home")) return "home";
              return;
            }

            // React core (react, react-dom, scheduler) must live in its own
            // foundational chunk so it fully initializes before any consumer
            // chunk evaluates. Otherwise React-dependent libraries (e.g. Radix,
            // pulled in by cmdk/vaul) can read `React.forwardRef` at module
            // top-level while React is still mid-evaluation in a cyclic chunk,
            // throwing "Cannot read properties of undefined (reading 'forwardRef')".
            if (/node_modules[/\\](react|react-dom|scheduler)[/\\]/.test(id)) return "react";

            // three.js standard WebGL build (module + core).
            // Home page only needs this (~2MB raw) for the hero canvas.
            if (/node_modules[/\\]three[/\\]build[/\\]three\.(module|core)\.js/.test(id)) return "three";

            // three.js WebGPU build, TSL, and examples   only used by react-globe.gl.
            if (/node_modules[/\\]three[/\\]build[/\\]three\.(webgpu|tsl)/.test(id)) return "globe";
            if (/node_modules[/\\]three[/\\]examples[/\\]/.test(id)) return "globe";

            // globe.gl stack: only loaded on the Map / Analytics pages (lazy).
            const isGlobeStack =
              id.includes("react-globe.gl") ||
              id.includes("globe.gl") ||
              id.includes("three-globe") ||
              id.includes("three-render-objects") ||
              id.includes("three-conic-polygon-geometry") ||
              id.includes("three-geojson-geometry") ||
              id.includes("three-slippy-map-globe");

            if (isGlobeStack) return "globe";

            // h3-js is only used by three-globe for hex clustering.
            if (id.includes("h3-js")) return "globe";

            // peerjs is only used in ServerMonitoring (live stream viewer).
            if (id.includes("peerjs")) return "peer";

            if (id.includes("lucide-react")) return "lucide";
            if (id.includes("recharts")) return "charts";
            if (id.includes("@radix-ui")) return "radix";
            if (id.includes("i18next")) return "i18n";
            return "vendor";
          },
        },
      },
    },
  };
});
