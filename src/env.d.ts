/// <reference types="astro/client" />
/// <reference path="../.astro/types.d.ts" />
/// <reference types="@cloudflare/workers-types" />

import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database, Role } from '@/lib/supabase/types';
import type { AppEnv } from '@/lib/supabase/env';

type Runtime = import('@astrojs/cloudflare').Runtime<AppEnv>;

declare global {
  namespace App {
    interface Locals extends Runtime {
      supabase: SupabaseClient<Database>;
      user: User | null;
      role: Role | null;
    }
  }
}

// PUBLIC_ vars are inlined at build time; type them for import.meta.env.
interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
