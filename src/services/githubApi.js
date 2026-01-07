const GITHUB_API_BASE = 'https://api.github.com'

// Date range for filtering contributions
const START_DATE = new Date('2025-01-01T00:00:00Z')
const END_DATE = new Date() // Now

// Cache configuration
const CACHE_PREFIX = 'github_contributions_'
const CACHE_VERSION = 'v1'
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour in milliseconds

// Cache utility functions
function getCacheKey(repo, authors) {
  const authorsKey = authors.sort().join(',')
  return `${CACHE_PREFIX}${CACHE_VERSION}_${repo}_${authorsKey}`
}

function getCachedData(key) {
  try {
    const cached = localStorage.getItem(key)
    if (!cached) return null
    
    const { data, timestamp } = JSON.parse(cached)
    const now = Date.now()
    
    // Check if cache is expired
    if (now - timestamp > CACHE_DURATION) {
      localStorage.removeItem(key)
      console.log('Cache expired, fetching fresh data')
      return null
    }
    
    const ageMinutes = Math.floor((now - timestamp) / (60 * 1000))
    console.log(`Using cached data (${ageMinutes} minutes old)`)
    return data
  } catch (error) {
    console.error('Error reading cache:', error)
    localStorage.removeItem(key)
    return null
  }
}

function setCachedData(key, data) {
  try {
    const cacheEntry = {
      data,
      timestamp: Date.now()
    }
    localStorage.setItem(key, JSON.stringify(cacheEntry))
    console.log('Data cached successfully')
  } catch (error) {
    // Handle quota exceeded error
    if (error.name === 'QuotaExceededError') {
      console.warn('LocalStorage quota exceeded, clearing old cache entries')
      clearOldCacheEntries()
      // Try again
      try {
        localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }))
      } catch (retryError) {
        console.error('Failed to cache data after clearing:', retryError)
      }
    } else {
      console.error('Error caching data:', error)
    }
  }
}

function clearOldCacheEntries() {
  try {
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = JSON.parse(localStorage.getItem(key))
          const age = Date.now() - cached.timestamp
          // Remove entries older than 24 hours
          if (age > 24 * 60 * 60 * 1000) {
            keysToRemove.push(key)
          }
        } catch (e) {
          // Invalid cache entry, remove it
          keysToRemove.push(key)
        }
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
    if (keysToRemove.length > 0) {
      console.log(`Cleared ${keysToRemove.length} old cache entries`)
    }
  } catch (error) {
    console.error('Error clearing old cache:', error)
  }
}

// Export function to clear cache manually
export function clearContributionsCache(repo = null, authors = null) {
  try {
    if (repo && authors) {
      const key = getCacheKey(repo, authors)
      localStorage.removeItem(key)
      console.log('Cache cleared for:', repo, authors)
    } else {
      // Clear all contribution caches
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(CACHE_PREFIX)) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
      console.log(`Cleared ${keysToRemove.length} cache entries`)
    }
  } catch (error) {
    console.error('Error clearing cache:', error)
  }
}

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
  
  // Use Bearer token format (modern standard) and trim whitespace
  if (token) {
    const cleanToken = token.trim()
    if (cleanToken && cleanToken !== 'your_github_token_here') {
      headers['Authorization'] = `Bearer ${cleanToken}`
    } else {
      console.warn('GitHub token appears to be a placeholder. Please set a real token in .env file.')
    }
  }

  let allData = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    try {
      // Handle URLs that already have query parameters
      const separator = url.includes('?') ? '&' : '?'
      const response = await fetch(`${url}${separator}page=${page}&per_page=100`, { headers })
      
      // Check rate limit headers
      const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining')
      const rateLimitTotal = response.headers.get('X-RateLimit-Limit')
      
      if (rateLimitRemaining !== null) {
        console.log(`Rate limit: ${rateLimitRemaining}/${rateLimitTotal} remaining`)
        if (parseInt(rateLimitRemaining) < 10) {
          console.warn('Rate limit is running low!')
        }
      }
      
      if (!response.ok) {
        if (response.status === 403) {
          const rateLimitReset = response.headers.get('X-RateLimit-Reset')
          const resetTime = rateLimitReset ? new Date(parseInt(rateLimitReset) * 1000).toLocaleString() : 'unknown'
          const errorMsg = rateLimitRemaining === '0' 
            ? `GitHub API rate limit exceeded. Limit resets at ${resetTime}. Please check your token in .env file.`
            : `GitHub API error (403). Rate limit: ${rateLimitRemaining}/${rateLimitTotal}. Token may be invalid or missing required scopes.`
          throw new Error(errorMsg)
        }
        if (response.status === 401) {
          throw new Error('GitHub API authentication failed. Please check that your token in .env is valid and has the correct scopes.')
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

// Helper function to validate token by making a test API call
async function validateToken(token) {
  if (!token || token.trim() === '' || token.trim() === 'your_github_token_here') {
    return { valid: false, reason: 'No token provided' }
  }
  
  try {
    const cleanToken = token.trim()
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Accept': 'application/vnd.github.v3+json',
      }
    })
    
    if (response.status === 401) {
      return { valid: false, reason: 'Token is invalid or expired' }
    }
    if (response.status === 403) {
      return { valid: false, reason: 'Token lacks required permissions' }
    }
    if (response.ok) {
      const user = await response.json()
      const rateLimit = response.headers.get('X-RateLimit-Limit')
      console.log(`Token validated. Authenticated as: ${user.login}. Rate limit: ${rateLimit}/hour`)
      return { valid: true, user: user.login, rateLimit }
    }
    return { valid: false, reason: `Unexpected status: ${response.status}` }
  } catch (error) {
    return { valid: false, reason: `Validation error: ${error.message}` }
  }
}

// Main function to fetch all contributions
export async function fetchContributions(repo, authors, token = null, useCache = true) {
  // Check cache first
  const cacheKey = getCacheKey(repo, authors)
  if (useCache) {
    const cachedData = getCachedData(cacheKey)
    if (cachedData) {
      return cachedData
    }
  }
  
  // Get token from environment variable if not provided
  const githubToken = token || import.meta.env.VITE_GITHUB_TOKEN || null
  
  // Debug logging (only log if token exists, not the actual token value)
  if (githubToken) {
    const tokenPreview = githubToken.trim().substring(0, 8) + '...'
    console.log('Using GitHub token:', tokenPreview)
    
    // Validate token before making requests
    const validation = await validateToken(githubToken)
    if (!validation.valid) {
      console.error('Token validation failed:', validation.reason)
      console.error('Please check:')
      console.error('1. Token is correct (no extra spaces)')
      console.error('2. Token has "public_repo" scope (or "Contents: Read" for fine-grained tokens)')
      console.error('3. Token is not expired')
      console.error('4. You\'ve restarted the dev server after adding the token')
      // Continue anyway but warn user
    }
  } else {
    console.warn('No GitHub token found. Using unauthenticated requests (60 requests/hour limit).')
    console.warn('To increase rate limit, add VITE_GITHUB_TOKEN to your .env file.')
  }
  
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

    const result = {
      commits,
      pullRequests,
      issues,
      reviews,
      summary
    }
    
    // Cache the result
    if (useCache) {
      setCachedData(cacheKey, result)
    }
    
    return result
  } catch (error) {
    console.error('Error fetching contributions:', error)
    // If we have cached data, return it even if it's expired
    if (useCache) {
      const cachedData = getCachedData(cacheKey)
      if (cachedData) {
        console.warn('API request failed, returning stale cached data')
        return cachedData
      }
    }
    throw error
  }
}

