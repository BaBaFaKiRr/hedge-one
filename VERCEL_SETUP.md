# Vercel Environment Variables Setup Guide

This guide explains how to configure environment variables for your HedgeOne project on Vercel.

## Required Environment Variables

Your project requires the following environment variables to be set in Vercel:

1. **VITE_SUPABASE_PROJECT_ID**
   - Your Supabase project ID
   - Get it from: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/api
   - Example: `fbcequeftvgcysbrjuma`

2. **VITE_SUPABASE_ANON_KEY**
   - Your Supabase anonymous/public key
   - Get it from: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/api
   - This is the "anon" or "public" key (safe to expose in frontend code)

3. **VITE_TELEGRAM_BOT_TOKEN**
   - Your Telegram bot token
   - Get it from: https://t.me/BotFather on Telegram
   - Format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

4. **VITE_TELEGRAM_CHAT_ID**
   - Your Telegram chat ID where notifications should be sent
   - Get it from: https://t.me/userinfobot on Telegram
   - Or check your bot's API after sending a message

## How to Add Environment Variables in Vercel

### Step 1: Access Your Project Settings
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (hedge-one)
3. Click on **Settings** in the top navigation

### Step 2: Navigate to Environment Variables
1. In the Settings menu, click on **Environment Variables**
2. You'll see a section to add new environment variables

### Step 3: Add Each Variable
For each variable above:
1. Click **Add New**
2. Enter the **Name** (e.g., `VITE_SUPABASE_PROJECT_ID`)
3. Enter the **Value** (your actual credential)
4. **Important**: Select all three environments:
   - ☑ Production
   - ☑ Preview
   - ☑ Development
5. Click **Save**

### Step 4: Redeploy Your Application
After adding all environment variables:
1. Go to the **Deployments** tab
2. Find your latest deployment
3. Click the three dots (⋯) menu
4. Select **Redeploy**
5. Confirm the redeployment

**Note**: Environment variables are only available to new deployments. Existing deployments won't have access to newly added variables until you redeploy.

## Verifying Your Setup

After redeploying, you can verify that your environment variables are working:

1. Check the browser console for any warnings about missing environment variables
2. Test the Telegram notification feature on your marketing landing page
3. Verify that Supabase connections are working properly

## Security Best Practices

✅ **DO:**
- Use environment variables for all sensitive credentials
- Keep your `.env` file local and never commit it
- Use different credentials for development and production if possible
- Regularly rotate your API keys and tokens

❌ **DON'T:**
- Commit `.env` files to version control
- Share environment variables in chat or email
- Use production credentials in development
- Hardcode credentials in your source code

## Troubleshooting

### Variables not working after deployment?
- Make sure you selected all environments (Production, Preview, Development)
- Redeploy your application after adding variables
- Check that variable names start with `VITE_` (required for Vite projects)

### Still seeing warnings in console?
- Verify all variables are set correctly in Vercel
- Check for typos in variable names
- Ensure values don't have extra spaces or quotes

### Need to update a variable?
- Update it in Vercel Settings > Environment Variables
- Redeploy your application
- The old deployment will continue using old values until redeployed
