export async function fetchMergeRequests(instance, timeframe, deepSearch = false) {
  if (instance.provider === 'gitlab') {
    return fetchGitLabMRs(instance, timeframe, deepSearch);
  } else if (instance.provider === 'github') {
    return fetchGitHubPRs(instance, timeframe, deepSearch);
  }
  throw new Error('Unknown provider');
}

function getDateLimit(timeframe) {
  const days = parseInt(timeframe.replace('d', ''), 10);
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

async function fetchGitLabMRs(instance, timeframe, deepSearch) {
  const dateLimit = getDateLimit(timeframe);
  let allMRs = [];
  let page = 1;
  const maxPages = deepSearch ? 20 : 1; // Fetch up to 2000 MRs on deep search, otherwise 100

  while (page <= maxPages) {
    // order_by=updated_at ensures we get the most recent ones first
    const url = `${instance.url}/api/v4/merge_requests?scope=all&order_by=updated_at&sort=desc&per_page=100&page=${page}&updated_after=${dateLimit}`;
    
    const response = await fetch(url, {
      headers: { 'PRIVATE-TOKEN': instance.token }
    });

    if (!response.ok) {
      throw new Error(`GitLab API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (data.length === 0) break;

    allMRs = allMRs.concat(data);

    // If we received less than 100 items, we've hit the end of the results
    if (data.length < 100) break;
    
    page++;
  }
  
  const fixAvatarUrl = (avatarUrl) => {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith('/')) {
      return `${instance.url}${avatarUrl}`;
    }
    if (avatarUrl.startsWith('http') && !avatarUrl.includes('gravatar.com')) {
      try {
        const urlObj = new URL(avatarUrl);
        const instanceUrlObj = new URL(instance.url);
        urlObj.protocol = instanceUrlObj.protocol;
        urlObj.host = instanceUrlObj.host;
        urlObj.port = instanceUrlObj.port;
        return urlObj.toString();
      } catch (e) {
        return avatarUrl;
      }
    }
    return avatarUrl;
  };

  return allMRs.map(mr => {
    // Strip group namespace, e.g. 'group/subgroup/project' -> 'project'
    let projectName = mr.references && mr.references.full ? mr.references.full.split('!')[0] : 'Unknown';
    if (projectName.includes('/')) {
      projectName = projectName.split('/').pop();
    }

    return {
      id: `gl-${mr.id}`,
      iid: mr.iid,
      title: mr.title,
      description: mr.description || '',
      state: mr.state, // 'opened', 'closed', 'merged'
      web_url: mr.web_url,
      source_branch: mr.source_branch,
      target_branch: mr.target_branch,
      author: {
        name: mr.author.name,
        username: mr.author.username,
        avatar_url: fixAvatarUrl(mr.author.avatar_url)
      },
      merged_by: mr.merged_by ? {
        name: mr.merged_by.name,
        username: mr.merged_by.username,
        avatar_url: fixAvatarUrl(mr.merged_by.avatar_url)
      } : null,
      updated_at: mr.updated_at,
      project_name: projectName,
      project_id: `gl-${mr.project_id}`,
      comments_count: mr.user_notes_count
    };
  });
}

async function fetchGitHubPRs(instance, timeframe, deepSearch) {
  const dateLimit = getDateLimit(timeframe).split('T')[0]; // GitHub format: YYYY-MM-DD
  // Search for PRs updated after date Limit. Using 'involves:@me' to scope it to the authenticated user.
  const query = encodeURIComponent(`is:pr involves:@me updated:>=${dateLimit}`);
  const url = `${instance.url}/search/issues?q=${query}&per_page=100`;

  const response = await fetch(url, {
    headers: { 
      'Authorization': `Bearer ${instance.token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  return data.items.map(pr => {
    // Extract repository name from repository_url
    // e.g. "https://api.github.com/repos/facebook/react" -> "react"
    let projectName = 'Unknown';
    if (pr.repository_url) {
      projectName = pr.repository_url.split('/').pop();
    }

    // Map GitHub state to our unified format ('opened', 'merged', 'closed')
    let state = 'opened';
    if (pr.state === 'closed') {
      state = pr.pull_request && pr.pull_request.merged_at ? 'merged' : 'closed';
    }
    if (pr.draft) state = 'draft';

    return {
      id: `gh-${pr.id}`,
      iid: pr.number,
      title: pr.title,
      state: state,
      web_url: pr.html_url,
      source_branch: 'unknown', // Search API doesn't return branches directly
      target_branch: 'unknown',
      author: {
        name: pr.user.login, // Search API only returns login, not full name
        username: pr.user.login,
        avatar_url: pr.user.avatar_url
      },
      merged_by: null, // Search API doesn't return merged_by directly without fetching each PR
      updated_at: pr.updated_at,
      project_name: projectName,
      project_id: `gh-${projectName}`,
      comments_count: pr.comments
    };
  });
}
