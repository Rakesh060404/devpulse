# DevPulse Production Deployment Guide

This guide provides step-by-step instructions to deploy the **DevPulse** application:
1. **Backend Server** on [Render](https://render.com)
2. **Frontend Client** on [Vercel](https://vercel.com)

---

## Step 1: Update/Create GitHub OAuth App

Since the application uses GitHub OAuth for login, you need a public redirect URI. 

1. Go to your **GitHub Settings** -> **Developer Settings** -> **OAuth Apps**.
2. Click **New OAuth App** (or edit your existing one).
3. Set the following values:
   - **Application Name:** `DevPulse Production`
   - **Homepage URL:** `https://<your-vercel-app-name>.vercel.app` (You can update this after Vercel deployment if you don't know it yet)
   - **Authorization callback URL:** `https://<your-render-app-name>.onrender.com/api/auth/github/callback` (You can update this after Render deployment)
4. Click **Register Application**.
5. Generate a new **Client Secret** and copy both the **Client ID** and **Client Secret**.

---

## Step 2: Deploy Backend to Render

1. Log in to [Render](https://render.com).
2. Click **New** -> **Web Service**.
3. Connect your GitHub repository (`Deeapk883/devpulse`).
4. Configure the service:
   - **Name:** `devpulse-backend` (or similar)
   - **Language:** `Node`
   - **Branch:** `main` (or whichever branch you are using)
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `node src/app.js`
5. Expand **Advanced** and add the following **Environment Variables**:

| Key | Value / Source | Description |
|---|---|---|
| `NODE_ENV` | `production` | Enables production mode |
| `DB_HOST` | `gateway01.ap-southeast-1.prod.aws.tidbcloud.com` | TiDB host |
| `DB_PORT` | `4000` | TiDB port |
| `DB_USER` | `39tAXC1sVvWPRRD.root` | TiDB user |
| `DB_PASSWORD` | `CozC2O0qYtQFq4fM` | TiDB password |
| `DB_NAME` | `devpulse` | TiDB database name |
| `DB_SSL` | `true` | Required for secure cloud connection |
| `JWT_SECRET` | *(Create a long random string)* | Used to sign login tokens |
| `GITHUB_CLIENT_ID` | *(Your GitHub OAuth Client ID)* | From Step 1 |
| `GITHUB_CLIENT_SECRET` | *(Your GitHub OAuth Client Secret)* | From Step 1 |
| `GITHUB_CALLBACK_URL` | `https://<your-render-app-name>.onrender.com/api/auth/github/callback` | Callback URL |
| `CLIENT_URL` | `https://<your-vercel-app-name>.vercel.app` | Vercel frontend URL |
| `GEMINI_API_KEY` | *(Your Gemini API Key)* | Your Gemini API key |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model name |
| `WEBHOOK_SECRET` | *(Create a random webhook token)* | Used to secure GitHub webhooks |

6. Click **Create Web Service**. Note the backend URL provided by Render (e.g. `https://devpulse-backend.onrender.com`).

---

## Step 3: Deploy Frontend to Vercel

1. Log in to [Vercel](https://vercel.com).
2. Click **Add New** -> **Project**.
3. Import the `devpulse` repository (as shown in your screenshot).
4. Configure the Project:
   - **Framework Preset:** `Create React App`
   - **Root Directory:** Click `Edit` and select `client`
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`
5. Expand **Environment Variables** and add:

| Key | Value | Description |
|---|---|---|
| `REACT_APP_API_URL` | `https://<your-render-app-name>.onrender.com` | The URL of your Render backend |

6. Click **Deploy**. Vercel will build and deploy your React frontend. Note the Vercel URL (e.g., `https://devpulse-client.vercel.app`).

---

## Step 4: Link/Sync OAuth Credentials

1. Go back to your GitHub OAuth App settings.
2. Update the **Homepage URL** with your Vercel URL.
3. Update the **Authorization callback URL** with your Render backend callback URL.
4. In your Render environment variables, make sure `CLIENT_URL` matches your Vercel URL, and `GITHUB_CALLBACK_URL` matches the Render backend callback URL. (Render will redeploy automatically when env variables are updated).

Your application is now deployed and ready!
