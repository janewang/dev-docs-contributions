import React, { useState, useEffect } from 'react'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement } from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'
import './App.css'
import { fetchContributions, clearContributionsCache } from './services/githubApi'

// GitHub icon component
const GitHubIcon = ({ size = 20, className = '' }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      clipRule="evenodd"
    />
  </svg>
)

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

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

// Color palette for charts (supports up to 10 contributors)
const CHART_COLORS = [
  { border: 'rgb(75, 192, 192)', background: 'rgba(75, 192, 192, 0.2)' },
  { border: 'rgb(255, 99, 132)', background: 'rgba(255, 99, 132, 0.2)' },
  { border: 'rgb(54, 162, 235)', background: 'rgba(54, 162, 235, 0.2)' },
  { border: 'rgb(255, 206, 86)', background: 'rgba(255, 206, 86, 0.2)' },
  { border: 'rgb(153, 102, 255)', background: 'rgba(153, 102, 255, 0.2)' },
  { border: 'rgb(255, 159, 64)', background: 'rgba(255, 159, 64, 0.2)' },
  { border: 'rgb(199, 199, 199)', background: 'rgba(199, 199, 199, 0.2)' },
  { border: 'rgb(83, 102, 255)', background: 'rgba(83, 102, 255, 0.2)' },
  { border: 'rgb(255, 99, 255)', background: 'rgba(255, 99, 255, 0.2)' },
  { border: 'rgb(50, 205, 50)', background: 'rgba(50, 205, 50, 0.2)' },
]

const DOUGHNUT_COLORS = [
  'rgba(75, 192, 192, 0.6)',
  'rgba(255, 99, 132, 0.6)',
  'rgba(54, 162, 235, 0.6)',
  'rgba(255, 206, 86, 0.6)',
  'rgba(153, 102, 255, 0.6)',
  'rgba(255, 159, 64, 0.6)',
  'rgba(199, 199, 199, 0.6)',
  'rgba(83, 102, 255, 0.6)',
  'rgba(255, 99, 255, 0.6)',
  'rgba(50, 205, 50, 0.6)',
]

const DOUGHNUT_BORDER_COLORS = [
  'rgba(75, 192, 192, 1)',
  'rgba(255, 99, 132, 1)',
  'rgba(54, 162, 235, 1)',
  'rgba(255, 206, 86, 1)',
  'rgba(153, 102, 255, 1)',
  'rgba(255, 159, 64, 1)',
  'rgba(199, 199, 199, 1)',
  'rgba(83, 102, 255, 1)',
  'rgba(255, 99, 255, 1)',
  'rgba(50, 205, 50, 1)',
]

// Gradient colors for summary cards
const CARD_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
]

function App() {
  const [contributions, setContributions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadContributions()
  }, [])

  const loadContributions = async (forceRefresh = false) => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchContributions(REPO, OWNERS, null, !forceRefresh)
      setContributions(data)
    } catch (err) {
      setError(err.message)
      console.error('Error loading contributions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleForceRefresh = () => {
    clearContributionsCache(REPO, OWNERS)
    loadContributions(true)
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Loading contribution data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app">
        <div className="error">
          <h2>Error loading data</h2>
          <p>{error}</p>
          <button onClick={loadContributions}>Retry</button>
        </div>
      </div>
    )
  }

  if (!contributions) {
    return null
  }

  const { commits, pullRequests, issues, reviews, summary } = contributions

  // Sort owners by total contributions (descending order)
  const ownerNames = [...OWNERS].sort((a, b) => {
    const totalA = summary[a]?.total || 0
    const totalB = summary[b]?.total || 0
    return totalB - totalA // Descending order
  })

  // Prepare data for charts
  const commitsData = ownerNames.map(owner => commits[owner]?.length || 0)
  const prsData = ownerNames.map(owner => pullRequests[owner]?.length || 0)
  const issuesData = ownerNames.map(owner => issues[owner]?.length || 0)
  const reviewsData = ownerNames.map(owner => reviews[owner]?.length || 0)

  // Commits over time
  const commitsByMonth = {}
  ownerNames.forEach(owner => {
    commits[owner]?.forEach(commit => {
      const month = new Date(commit.date).toISOString().slice(0, 7)
      if (!commitsByMonth[month]) {
        commitsByMonth[month] = {}
        ownerNames.forEach(o => commitsByMonth[month][o] = 0)
      }
      commitsByMonth[month][owner] = (commitsByMonth[month][owner] || 0) + 1
    })
  })

  const sortedMonths = Object.keys(commitsByMonth).sort()
  const commitsOverTimeData = {
    labels: sortedMonths,
    datasets: ownerNames.map((owner, idx) => {
      const color = CHART_COLORS[idx % CHART_COLORS.length]
      return {
        label: owner,
        data: sortedMonths.map(month => commitsByMonth[month][owner] || 0),
        borderColor: color.border,
        backgroundColor: color.background,
        tension: 0.1
      }
    })
  }

  const barChartData = {
    labels: ownerNames,
    datasets: [
      {
        label: 'Commits',
        data: commitsData,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
      {
        label: 'Pull Requests',
        data: prsData,
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
      },
      {
        label: 'Issues',
        data: issuesData,
        backgroundColor: 'rgba(255, 206, 86, 0.6)',
      },
      {
        label: 'Reviews',
        data: reviewsData,
        backgroundColor: 'rgba(153, 102, 255, 0.6)',
      },
    ],
  }

  const totalContributions = ownerNames.reduce((acc, owner) => {
    return acc + (summary[owner]?.total || 0)
  }, 0)

  const doughnutData = {
    labels: ownerNames,
    datasets: [
      {
        data: ownerNames.map(owner => summary[owner]?.total || 0),
        backgroundColor: ownerNames.map((_, idx) => DOUGHNUT_COLORS[idx % DOUGHNUT_COLORS.length]),
        borderColor: ownerNames.map((_, idx) => DOUGHNUT_BORDER_COLORS[idx % DOUGHNUT_BORDER_COLORS.length]),
        borderWidth: 2,
      },
    ],
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Stellar Docs Contribution Visualizer</h1>
        <p className="subtitle">Repository: <a href={`https://github.com/${REPO}`} target="_blank" rel="noopener noreferrer">{REPO}</a></p>
        <p className="date-range">Showing contributions from January 1, 2025 to {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </header>

      <div className="summary-cards">
        {ownerNames.map((owner, idx) => (
          <div 
            key={owner} 
            className="summary-card"
            style={{ background: CARD_GRADIENTS[idx % CARD_GRADIENTS.length] }}
          >
            <h3>
              <a 
                href={`https://github.com/${owner}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="owner-link"
              >
                {owner}
                <GitHubIcon size={26} className="github-icon" />
              </a>
            </h3>
            <div className="stats">
              <div className="stat">
                <a
                  href={`https://github.com/stellar/stellar-docs/commits?author=${owner}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="stat-link"
                >
                  <span className="stat-value">{summary[owner]?.commits || 0}</span>
                  <span className="stat-label">Commits</span>
                </a>
              </div>
              <div className="stat">
                <a
                  href={`https://github.com/stellar/stellar-docs/pulls/${owner}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="stat-link"
                >
                  <span className="stat-value">{summary[owner]?.pullRequests || 0}</span>
                  <span className="stat-label">PRs</span>
                </a>
              </div>
              <div className="stat">
                <a
                  href={`https://github.com/stellar/stellar-docs/issues?q=is%3Aissue%20state%3Aopen%20author%3A${owner}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="stat-link"
                >
                  <span className="stat-value">{summary[owner]?.issues || 0}</span>
                  <span className="stat-label">Issues</span>
                </a>
              </div>
              <div className="stat">
                <span className="stat-value">{summary[owner]?.reviews || 0}</span>
                <span className="stat-label">Reviews</span>
              </div>
              <div className="stat total">
                <span className="stat-value">{summary[owner]?.total || 0}</span>
                <span className="stat-label">Total</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <h2>Total Contributions</h2>
          <Doughnut data={doughnutData} options={{
            responsive: true,
            plugins: {
              legend: {
                position: 'bottom',
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const label = context.label || ''
                    const value = context.parsed || 0
                    const percentage = totalContributions > 0 
                      ? ((value / totalContributions) * 100).toFixed(1) 
                      : 0
                    return `${label}: ${value} (${percentage}%)`
                  }
                }
              }
            }
          }} />
        </div>

        <div className="chart-container">
          <h2>Contributions by Type</h2>
          <Bar data={barChartData} options={{
            responsive: true,
            plugins: {
              legend: {
                position: 'top',
              },
            },
            scales: {
              y: {
                beginAtZero: true,
              },
            },
          }} />
        </div>

        <div className="chart-container full-width">
          <h2>Commits Over Time</h2>
          <Line data={commitsOverTimeData} options={{
            responsive: true,
            plugins: {
              legend: {
                position: 'top',
              },
            },
            scales: {
              y: {
                beginAtZero: true,
              },
            },
          }} />
        </div>
      </div>

      <div className="details-section">
        <h2>Recent Activity</h2>
        {ownerNames.map(owner => (
          <div key={owner} className="owner-details">
            <h3>
              <a 
                href={`https://github.com/${owner}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="owner-link-details"
              >
                {owner}
                <GitHubIcon size={26} className="github-icon-details" />
             </a>
            </h3>
            <div className="activity-list">
              <div className="activity-group">
                <h4>Recent Commits ({commits[owner]?.length || 0})</h4>
                <ul>
                  {(commits[owner] || []).slice(0, 5).map((commit, idx) => (
                    <li key={idx}>
                      <a href={commit.url} target="_blank" rel="noopener noreferrer">
                        {commit.message.substring(0, 60)}...
                      </a>
                      <span className="date">{new Date(commit.date).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="activity-group">
                <h4>Pull Requests ({pullRequests[owner]?.length || 0})</h4>
                <ul>
                  {(pullRequests[owner] || []).slice(0, 5).map((pr, idx) => (
                    <li key={idx}>
                      <a href={pr.url} target="_blank" rel="noopener noreferrer">
                        {pr.title}
                      </a>
                      <span className="date">{new Date(pr.date).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      <footer className="footer">
        <p>Data fetched from GitHub API</p>
        <button onClick={loadContributions} className="refresh-btn">Refresh Data</button>
      </footer>
    </div>
  )
}

export default App

