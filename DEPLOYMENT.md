# Deployment Guide - Adding GitHub Token

## Local Development

### Step 1: Create a `.env` file

In the root directory of your project (same folder as `package.json`), create a file named `.env`:

```bash
# In the project root directory
touch .env
```

### Step 2: Add your token

Open the `.env` file and add:

```
VITE_GITHUB_TOKEN=your_actual_github_token_here
```

**Important**: Replace `your_actual_github_token_here` with your real GitHub token.

### Step 3: Get a GitHub Token

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name (e.g., "Stellar Docs Visualizer")
4. Select the `public_repo` scope
5. Click "Generate token"
6. **Copy the token immediately** (you won't see it again!)
7. Paste it into your `.env` file

### Step 4: Restart your dev server

If your dev server is running, stop it (Ctrl+C) and restart:

```bash
npm run dev
```

The `.env` file is already in `.gitignore`, so your token won't be committed to Git.

---

## Production Deployment

### Vercel

1. Go to your project on [vercel.com](https://vercel.com)
2. Click on your project → **Settings**
3. Go to **Environment Variables**
4. Click **Add New**
5. Name: `VITE_GITHUB_TOKEN`
6. Value: Your GitHub token
7. Environment: Select all (Production, Preview, Development)
8. Click **Save**
9. **Redeploy** your project (go to Deployments → click the three dots → Redeploy)

### Netlify

1. Go to your site on [netlify.com](https://netlify.com)
2. Go to **Site Settings**
3. Click **Environment Variables** (under Build & deploy)
4. Click **Add variable**
5. Key: `VITE_GITHUB_TOKEN`
6. Value: Your GitHub token
7. Scope: Select all (Production, Deploy previews, Branch deploys)
8. Click **Save**
9. **Trigger a new deploy** (go to Deploys → Trigger deploy → Deploy site)

### GitHub Pages (GitHub Actions)

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `VITE_GITHUB_TOKEN`
5. Secret: Your GitHub token
6. Click **Add secret**
7. The next push to main will automatically deploy with the token

---

## Verify It's Working

After adding the token, you should see:
- No rate limit errors in the console
- Faster API responses
- Ability to fetch more data

If you still see rate limit errors, make sure:
1. The token is correct (no extra spaces)
2. The token has the `public_repo` scope
3. You've restarted the dev server (for local) or redeployed (for production)




