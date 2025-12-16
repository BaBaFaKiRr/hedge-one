
  # Web App with Dashboard

  This is a code bundle for Web App with Dashboard. The original project is available at https://www.figma.com/design/cAB9KzFd8cusGkhDnqzs87/Web-App-with-Dashboard.

  ## Environment Variables Setup

  This project requires environment variables to be configured for secure credential management.

  ### Local Development

  1. Copy the example environment file:
     ```bash
     cp .env.example .env
     ```

  2. Fill in your actual credentials in the `.env` file:
     - `VITE_SUPABASE_PROJECT_ID`: Your Supabase project ID (get from [Supabase Dashboard](https://supabase.com/dashboard))
     - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous/public key (get from Supabase Dashboard > Settings > API)
     - `VITE_TELEGRAM_BOT_TOKEN`: Your Telegram bot token (get from [@BotFather](https://t.me/BotFather) on Telegram)
     - `VITE_TELEGRAM_CHAT_ID`: Your Telegram chat ID (get from [@userinfobot](https://t.me/userinfobot) or check your bot's API)

  ### Vercel Deployment

  To configure environment variables in Vercel:

  1. Go to your project in the [Vercel Dashboard](https://vercel.com/dashboard)
  2. Navigate to **Settings** > **Environment Variables**
  3. Add the following variables (make sure to select all environments: Production, Preview, and Development):
     - `VITE_SUPABASE_PROJECT_ID`
     - `VITE_SUPABASE_ANON_KEY`
     - `VITE_TELEGRAM_BOT_TOKEN`
     - `VITE_TELEGRAM_CHAT_ID`
  4. After adding the variables, **redeploy your application** for the changes to take effect

  **Important Security Notes:**
  - Never commit your `.env` file to version control (it's already in `.gitignore`)
  - Always use environment variables for sensitive credentials
  - The `.env.example` file is safe to commit as it contains only placeholder values

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.
  