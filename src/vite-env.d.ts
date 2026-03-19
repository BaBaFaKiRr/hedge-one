/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_PROJECT_ID?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_TELEGRAM_BOT_TOKEN?: string
  readonly VITE_TELEGRAM_CHAT_ID?: string
  readonly VITE_NODE_BACKEND_URL?: string
  readonly VITE_RESTART_URL?: string
  readonly VITE_TASK_RESTART_URL?: string
  // Add other env variables as needed
  [key: string]: any
}

declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.jpeg' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  const value: string;
  export default value;
}

declare module '*.gif' {
  const value: string;
  export default value;
}

declare module '*.webp' {
  const value: string;
  export default value;
}

