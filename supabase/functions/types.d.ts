/** Fallback types when the Deno VS Code extension is not active. */
declare namespace Deno {
  function serve(
    handler: (req: Request) => Response | Promise<Response>,
  ): void;
  const env: {
    get(key: string): string | undefined;
  };
}

declare module "https://esm.sh/@supabase/supabase-js@2.39.3" {
  export * from "@supabase/supabase-js";
}
