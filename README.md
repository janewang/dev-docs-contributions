# Stellar Docs Contribution Visualizer

A web application that visualizes GitHub contributions to the [stellar-docs](https://github.com/stellar/stellar-docs) repository by specific owners.

## Features

- 📊 **Interactive Charts**: Visualize contributions using bar charts, line charts, and doughnut charts
- 📈 **Commits Over Time**: Track commit activity trends by month
- 🔍 **Detailed Breakdown**: View commits, pull requests, issues, and code reviews
- 👥 **Multi-User Support**: Compare contributions across multiple GitHub users
- 🎨 **Modern UI**: Beautiful, responsive design with gradient backgrounds

## Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone or navigate to this directory:
```bash
cd product-contribution
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Create a `.env` file with your GitHub token to increase API rate limits:
```
VITE_GITHUB_TOKEN=your_github_token_here
```

To create a GitHub token:
- Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
- Generate a new token with `public_repo` scope
- Add it to the `.env` file

**Note**: The app works without a token, but GitHub's unauthenticated API has rate limits (60 requests/hour). With a token, you get 5,000 requests/hour.

### Running the App

Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the port shown in the terminal).

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Configuration

To change the repository or owners, edit `src/App.jsx`:

```javascript
const REPO = 'stellar/stellar-docs'
const OWNERS = [
  'janewang',
  'torisamples',
  'brunomuler',
  'johncanneto',
  'nickgilbert',
  'tomerweller',
  'Keeeeeeeks',
  'minkyeongshin',
  'sdfcharles',
  'Kellyhendricks-cmd'
]
```

## Technologies Used

- **React** - UI framework
- **Vite** - Build tool and dev server
- **Chart.js** - Charting library
- **GitHub API** - Fetching contribution data

## Data Sources

The app fetches the following data from GitHub API:

- **Commits**: All commits authored by the specified users
- **Pull Requests**: PRs created by the specified users
- **Issues**: Issues created by the specified users (excluding PRs)
- **Reviews**: Code reviews submitted by the specified users

## Date Range

The app currently filters contributions to show only those from **January 1, 2025** to the present date. This date range is configured in `src/services/githubApi.js` and can be modified by changing the `START_DATE` constant.

## Deployment

The app can be deployed to various platforms. Configuration files are already included for:

### Option 1: Vercel (Recommended - Easiest)

1. **Install Vercel CLI** (optional, or use web interface):
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```
   Or visit [vercel.com](https://vercel.com) and import your repository.

3. **Set Environment Variable**:
   - In Vercel dashboard, go to Project Settings → Environment Variables
   - Add `VITE_GITHUB_TOKEN` with your GitHub token value
   - Redeploy after adding the variable

**Note**: Vercel automatically detects the `vercel.json` configuration file.

### Option 2: Netlify

1. **Install Netlify CLI** (optional):
   ```bash
   npm i -g netlify-cli
   ```

2. **Deploy**:
   ```bash
   netlify deploy --prod
   ```
   Or visit [netlify.com](https://netlify.com) and drag & drop your `dist` folder after building.

3. **Set Environment Variable**:
   - In Netlify dashboard, go to Site Settings → Environment Variables
   - Add `VITE_GITHUB_TOKEN` with your GitHub token value
   - Redeploy after adding the variable

### Option 3: GitHub Pages

1. **Update `vite.config.js`** with your repository name:
   ```javascript
   export default defineConfig({
     plugins: [react()],
     base: '/your-repo-name/'  // Replace with your actual repo name
   })
   ```

2. **Build and deploy**:
   ```bash
   npm run build
   ```
   Then push the `dist` folder to the `gh-pages` branch, or use the included GitHub Actions workflow.

3. **Enable GitHub Pages**:
   - Go to your repository Settings → Pages
   - Select source: GitHub Actions

The included `.github/workflows/deploy.yml` will automatically deploy on push to main.

### Environment Variables for Production

For all platforms, make sure to set the `VITE_GITHUB_TOKEN` environment variable in your deployment platform's settings. This is important to avoid rate limiting.

## Limitations

- GitHub API rate limits apply (60 requests/hour without token, 5,000/hour with token)
- Large repositories may take time to fetch all data
- Review data is limited to the first 50 PRs to prevent excessive API calls

## License

MIT

