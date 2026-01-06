const GITHUB_API_BASE = 'https://api.github.com'

// Date range for filtering contributions
const START_DATE = new Date('2024-01-01T00:00:00Z')
const END_DATE = new Date() // Now

// Helper function to check if a date is within the range
function isDateInRange(dateString) {
  if (!dateString) return false
  const date = new Date(dateString)
  return date >= START_DATE && date <= END_DATE
}

// Helper function to fetch with pagination
async function fetchAllPages(url, token = null) {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
  }
  
  if (token) {
    headers['Authorization'] = `token ${token}`
  }

  let allData = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    try {
      // Handle URLs that already have query parameters
      const separator = url.includes('?') ? '&' : '?'
      const response = await fetch(`${url}${separator}page=${page}&per_page=100`, { headers })
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('GitHub API rate limit exceeded. Please add a GitHub token in the .env file.')
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.length === 0) {
        hasMore = false
      } else {
        allData = allData.concat(data)
        page++
        // Limit to prevent excessive requests
        if (page > 10) {
          hasMore = false
        }
      }
    } catch (error) {
      console.error('Error fetching page:', error)
      throw error
    }
  }

  return allData
}

// Get commits by author
async function getCommitsByAuthor(repo, authors, token = null) {
  const commitsByAuthor = {}
  
  // Format date for GitHub API (ISO 8601 format)
  const sinceParam = START_DATE.toISOString()
  
  for (const author of authors) {
    try {
      // Use 'since' parameter to filter commits by date
      const url = `${GITHUB_API_BASE}/repos/${repo}/commits?since=${sinceParam}`
      const allCommits = await fetchAllPages(url, token)
      
      // Filter commits by author and date range
      const authorCommits = allCommits.filter(commit => {
        const authorLogin = commit.author?.login?.toLowerCase()
        const committerLogin = commit.committer?.login?.toLowerCase()
        const authorName = author.toLowerCase()
        const commitDate = commit.commit.author.date
        return (authorLogin === authorName || committerLogin === authorName) && 
               isDateInRange(commitDate)
      })

      commitsByAuthor[author] = authorCommits.map(commit => ({
        sha: commit.sha,
        message: commit.commit.message.split('\n')[0],
        date: commit.commit.author.date,
        url: commit.html_url,
        author: commit.author?.login || commit.commit.author.name
      }))
    } catch (error) {
      console.error(`Error fetching commits for ${author}:`, error)
      commitsByAuthor[author] = []
    }
  }

  return commitsByAuthor
}

// Get pull requests by author
async function getPullRequestsByAuthor(repo, authors, token = null) {
  const prsByAuthor = {}
  
  for (const author of authors) {
    try {
      const url = `${GITHUB_API_BASE}/repos/${repo}/pulls`
      const allPRs = await fetchAllPages(url, token)
      
      // Filter PRs by author and date range
      const authorPRs = allPRs.filter(pr => {
        const prAuthor = pr.user?.login?.toLowerCase()
        const authorName = author.toLowerCase()
        return prAuthor === authorName && isDateInRange(pr.created_at)
      })

      prsByAuthor[author] = authorPRs.map(pr => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        date: pr.created_at,
        url: pr.html_url,
        merged: pr.merged_at !== null
      }))
    } catch (error) {
      console.error(`Error fetching PRs for ${author}:`, error)
      prsByAuthor[author] = []
    }
  }

  return prsByAuthor
}

// Get issues by author
async function getIssuesByAuthor(repo, authors, token = null) {
  const issuesByAuthor = {}
  
  for (const author of authors) {
    try {
      const url = `${GITHUB_API_BASE}/repos/${repo}/issues`
      const allIssues = await fetchAllPages(url, token)
      
      // Filter issues by author (excluding PRs) and date range
      const authorIssues = allIssues.filter(issue => {
        const issueAuthor = issue.user?.login?.toLowerCase()
        const authorName = author.toLowerCase()
        const isPR = issue.pull_request !== undefined
        return !isPR && issueAuthor === authorName && isDateInRange(issue.created_at)
      })

      issuesByAuthor[author] = authorIssues.map(issue => ({
        number: issue.number,
        title: issue.title,
        state: issue.state,
        date: issue.created_at,
        url: issue.html_url
      }))
    } catch (error) {
      console.error(`Error fetching issues for ${author}:`, error)
      issuesByAuthor[author] = []
    }
  }

  return issuesByAuthor
}

// Get reviews by author
async function getReviewsByAuthor(repo, authors, token = null) {
  const reviewsByAuthor = {}
  
  for (const author of authors) {
    try {
      // First get all PRs
      const url = `${GITHUB_API_BASE}/repos/${repo}/pulls`
      const allPRs = await fetchAllPages(url, token)
      
      const authorReviews = []
      
      // For each PR, get reviews
      for (const pr of allPRs.slice(0, 50)) { // Limit to prevent too many requests
        try {
          const reviewsUrl = `${GITHUB_API_BASE}/repos/${repo}/pulls/${pr.number}/reviews`
          const reviews = await fetchAllPages(reviewsUrl, token)
          
          const prReviews = reviews.filter(review => {
            const reviewer = review.user?.login?.toLowerCase()
            const authorName = author.toLowerCase()
            return reviewer === authorName && isDateInRange(review.submitted_at)
          })

          authorReviews.push(...prReviews.map(review => ({
            prNumber: pr.number,
            prTitle: pr.title,
            state: review.state,
            date: review.submitted_at,
            url: pr.html_url,
            body: review.body
          })))
        } catch (error) {
          console.error(`Error fetching reviews for PR ${pr.number}:`, error)
        }
      }

      reviewsByAuthor[author] = authorReviews
    } catch (error) {
      console.error(`Error fetching reviews for ${author}:`, error)
      reviewsByAuthor[author] = []
    }
  }

  return reviewsByAuthor
}

// Main function to fetch all contributions
export async function fetchContributions(repo, authors, token = null) {
  // Get token from environment variable if not provided
  const githubToken = token || import.meta.env.VITE_GITHUB_TOKEN || null
  
  console.log('Fetching contributions for:', repo, authors)
  
  try {
    const [commits, pullRequests, issues, reviews] = await Promise.all([
      getCommitsByAuthor(repo, authors, githubToken),
      getPullRequestsByAuthor(repo, authors, githubToken),
      getIssuesByAuthor(repo, authors, githubToken),
      getReviewsByAuthor(repo, authors, githubToken)
    ])

    // Calculate summary
    const summary = {}
    authors.forEach(author => {
      summary[author] = {
        commits: commits[author]?.length || 0,
        pullRequests: pullRequests[author]?.length || 0,
        issues: issues[author]?.length || 0,
        reviews: reviews[author]?.length || 0,
        total: (commits[author]?.length || 0) +
               (pullRequests[author]?.length || 0) +
               (issues[author]?.length || 0) +
               (reviews[author]?.length || 0)
      }
    })

    return {
      commits,
      pullRequests,
      issues,
      reviews,
      summary
    }
  } catch (error) {
    console.error('Error fetching contributions:', error)
    throw error
  }
}

