import { Suspense, lazy } from "react";
import { useEnable3D } from "@/components/home-3d/use-enable-3d";

const Hero3DCanvas = lazy(() => import("@/components/Hero3DCanvas"));

/** Fixed cinematic backdrop for the entire home page. */
export function HomeAmbientBackground() {
  const enable3D = useEnable3D();
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="home-ambient-grid absolute inset-0 opacity-[0.35]" />
      <div className="home-ambient-orb home-ambient-orb--a absolute -left-[15%] top-[8%] h-[42vmin] w-[42vmin] rounded-full bg-sky-500/10 blur-[100px]" />
      <div className="home-ambient-orb home-ambient-orb--b absolute -right-[10%] top-[35%] h-[38vmin] w-[38vmin] rounded-full bg-indigo-500/10 blur-[90px]" />
      <div className="home-ambient-orb home-ambient-orb--c absolute bottom-[5%] left-[30%] h-[32vmin] w-[32vmin] rounded-full bg-cyan-500/8 blur-[80px]" />
      {enable3D ? (
        <Suspense fallback={null}>
          <Hero3DCanvas className="absolute inset-0 opacity-[0.22]" />
        </Suspense>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 h-[38vh] bg-gradient-to-t from-black via-black/80 to-transparent" />
    </div>
  );
}
