import { parseISO, format, differenceInSeconds } from 'date-fns';

export async function fetchJiraData(config, days = 30) {
  if (!config.email || !config.token) {
    throw new Error('Jira Email and Token are required.');
  }

  const authString = btoa(`${config.email}:${config.token}`);
  const headers = {
    'Authorization': `Basic ${authString}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  const jqlQuery = `(assignee = currentUser() OR worklogAuthor = currentUser() OR issue in updatedBy("${config.email}", "-${days}d")) AND updated >= '-${days}d'`;
  
  let allIssues = [];
  let nextPageToken = null;
  let isLast = false;

  while (!isLast) {
    const payload = {
      jql: jqlQuery,
      fields: ["summary", "worklog", "comment"],
      expand: "changelog",
      maxResults: 100
    };
    if (nextPageToken) {
      payload.nextPageToken = nextPageToken;
    }

    const response = await fetch('/jira-api/rest/api/3/search/jql', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errTxt = await response.text();
      throw new Error(`Jira API Error: ${response.status} ${response.statusText} - ${errTxt}`);
    }

    const data = await response.json();
    allIssues = allIssues.concat(data.issues || []);
    
    if (data.isLast !== undefined) {
      isLast = data.isLast;
    } else {
      isLast = true;
    }
    
    if (!isLast && data.nextPageToken) {
      nextPageToken = data.nextPageToken;
    } else {
      isLast = true;
    }
  }

  const groupedLogs = {};
  
  // Initialize date grouping
  for (let i = 0; i <= days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = format(d, 'yyyy-MM-dd');
    groupedLogs[dateStr] = {};
  }

  for (const issue of allIssues) {
    const issueKey = issue.key;
    const summary = issue.fields?.summary || 'No Title';

    const getOrInitTicket = (dateStr) => {
      if (!groupedLogs[dateStr]) groupedLogs[dateStr] = {};
      if (!groupedLogs[dateStr][issueKey]) {
        groupedLogs[dateStr][issueKey] = { hours: 0, summary, actions: new Set() };
      }
      return groupedLogs[dateStr][issueKey];
    };

    // 1. Worklogs
    const worklogs = issue.fields?.worklog?.worklogs || [];
    // If total > fetched, we might need a separate request, but typically 20 worklogs is enough.
    // Simplifying: just parse what is returned.
    worklogs.forEach(wl => {
      if (wl.author?.emailAddress?.toLowerCase() === config.email.toLowerCase()) {
        const wlCreated = parseISO(wl.started);
        if (wlCreated >= startDate && wlCreated <= endDate) {
          const dateStr = format(wlCreated, 'yyyy-MM-dd');
          const hours = wl.timeSpentSeconds / 3600;
          const ticket = getOrInitTicket(dateStr);
          ticket.hours += hours;
          ticket.actions.add('Logged Hours');
        }
      }
    });

    // 2. Comments
    const comments = issue.fields?.comment?.comments || [];
    comments.forEach(c => {
      if (c.author?.emailAddress?.toLowerCase() === config.email.toLowerCase()) {
        const cCreated = parseISO(c.created);
        if (cCreated >= startDate && cCreated <= endDate) {
          const dateStr = format(cCreated, 'yyyy-MM-dd');
          const ticket = getOrInitTicket(dateStr);
          ticket.actions.add('Commented');
        }
      }
    });

    // 3. Changelog
    const histories = issue.changelog?.histories || [];
    histories.forEach(h => {
      if (h.author?.emailAddress?.toLowerCase() === config.email.toLowerCase()) {
        const hCreated = parseISO(h.created);
        if (hCreated >= startDate && hCreated <= endDate) {
          const dateStr = format(hCreated, 'yyyy-MM-dd');
          const ticket = getOrInitTicket(dateStr);
          ticket.actions.add('Updated Ticket');
        }
      }
    });
  }

  // Pre-fetch BAU summary if not found
  let bauSummary = "BAU - Standard Maintenance";
  for (const dateStr in groupedLogs) {
    if (groupedLogs[dateStr][config.bauTicket]) {
      bauSummary = groupedLogs[dateStr][config.bauTicket].summary;
      break;
    }
  }

  // Inject BAU ticket into EVERY day
  for (const dateStr in groupedLogs) {
    if (!groupedLogs[dateStr][config.bauTicket]) {
      groupedLogs[dateStr][config.bauTicket] = {
        hours: 0,
        summary: bauSummary,
        actions: new Set(['Pinned'])
      };
    }
  }

  const result = {
    summary: { total_hours: 0, days_analyzed: days },
    days: []
  };

  let totalOverallHours = 0;
  
  // Sort dates descending
  const sortedDates = Object.keys(groupedLogs).sort((a, b) => b.localeCompare(a));

  for (const dateStr of sortedDates) {
    const dt = parseISO(dateStr);
    const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
    let dayTotalHours = 0;
    const tickets = [];

    for (const [issueKey, info] of Object.entries(groupedLogs[dateStr])) {
      dayTotalHours += info.hours;
      totalOverallHours += info.hours;
      tickets.push({
        issue_key: issueKey,
        hours: Math.round(info.hours * 100) / 100,
        summary: info.summary,
        actions: Array.from(info.actions)
      });
    }

    result.days.push({
      date: dateStr,
      is_weekend: isWeekend,
      total_hours: Math.round(dayTotalHours * 100) / 100,
      tickets: tickets.sort((a, b) => b.hours - a.hours)
    });
  }

  result.summary.total_hours = Math.round(totalOverallHours * 100) / 100;
  return result;
}

export async function logJiraHours(config, issueKey, dateStr, hours, commentText) {
  const authString = btoa(`${config.email}:${config.token}`);
  
  // Format started time to 09:00 AM of that date
  const started = `${dateStr}T09:00:00.000+0400`;
  
  const payload = {
    timeSpentSeconds: Math.floor(hours * 3600),
    started: started
  };

  if (commentText && commentText.trim()) {
    payload.comment = {
      type: "doc",
      version: 1,
      content: [{
        type: "paragraph",
        content: [{
          text: commentText.trim(),
          type: "text"
        }]
      }]
    };
  }

  const response = await fetch(`/jira-api/rest/api/3/issue/${issueKey}/worklog`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(`Failed to log hours: ${response.status} ${errData.errorMessages ? errData.errorMessages.join(', ') : response.statusText}`);
  }

  return response.json();
}
