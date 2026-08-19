// Jira ticket extraction and utility helpers

// Common prefixes / words to ignore when scanning text for Jira ticket keys
const JIRA_NOISE_PREFIXES = new Set([
  'V', 'RC', 'RELEASE', 'REL', 'VER', 'VERSION',
  'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL',
  'STEP', 'SUB', 'RUN', 'NODE', 'JDK', 'SHA', 'FEAT', 'FEATURE', 'FIX', 'HOTFIX', 'PATCH',
  'BUILD', 'ENV', 'DEV', 'PROD', 'STAGE', 'TEST', 'QA', 'UAT', 'REV', 'PORT', 'HTTP', 'HTTPS'
]);

/**
 * Extracts normalized Jira ticket keys (e.g. CS-34744) from any arbitrary text string.
 * Handles formats:
 * - cs-34744, CS-34744
 * - cs 34744, CS 34744
 * - cs_34744, CS_34744
 * - hotfix-cs-34744
 * - cs34744, CS34744
 *
 * @param {string} text
 * @returns {string[]} Array of unique, uppercase Jira keys (e.g. ['CS-34744'])
 */
export function extractJiraKeysFromText(text) {
  if (!text || typeof text !== 'string') return [];
  const found = new Set();

  // Pattern 1: Standard with separator: Prefix + (dash / underscore / space / slash) + Digits
  // e.g. CS-34744, cs 34744, CS_34744, cs/34744, hotfix-cs-34744
  const sepRegex = /(?:^|[^a-zA-Z0-9])([a-zA-Z]{2,10})[-_\s/]+(\d{2,7})(?=[^a-zA-Z0-9]|$)/g;
  let match;
  while ((match = sepRegex.exec(text)) !== null) {
    const prefix = match[1].toUpperCase();
    const num = match[2];
    if (!JIRA_NOISE_PREFIXES.has(prefix)) {
      found.add(`${prefix}-${num}`);
    }
  }

  // Pattern 2: Direct concatenation without separator: Prefix + Digits
  // e.g. CS34744, cs34744, OMAN1234
  const concatRegex = /(?:^|[^a-zA-Z0-9])([a-zA-Z]{2,6})(\d{3,7})(?=[^a-zA-Z0-9]|$)/g;
  while ((match = concatRegex.exec(text)) !== null) {
    const prefix = match[1].toUpperCase();
    const num = match[2];
    if (!JIRA_NOISE_PREFIXES.has(prefix)) {
      found.add(`${prefix}-${num}`);
    }
  }

  return Array.from(found);
}

/**
 * Extracts all unique Jira ticket keys associated with a Merge Request
 * by inspecting title, source branch, target branch, and description.
 *
 * @param {Object} mr
 * @returns {string[]}
 */
export function extractJiraKeysFromMR(mr) {
  if (!mr) return [];
  const allText = [
    mr.title || '',
    mr.source_branch && mr.source_branch !== 'unknown' ? mr.source_branch : '',
    mr.target_branch && mr.target_branch !== 'unknown' ? mr.target_branch : '',
    mr.description || ''
  ].join(' ');

  return extractJiraKeysFromText(allText);
}

/**
 * Generates the full browser URL for a Jira ticket.
 *
 * @param {string} ticketKey
 * @returns {string}
 */
export function getJiraBrowseUrl(ticketKey) {
  return `https://omantel-om.atlassian.net/browse/${ticketKey}`;
}
