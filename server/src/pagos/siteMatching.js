import { supabase } from '../lib/supabaseClient.js';

const MIN_MATCH_SCORE = 50;

const normalizeText = (value) =>
  (value ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,#]/g, ' ')
    .replace(/\s+/g, ' ');

const scoreAddressMatch = (billAddress, siteAddress) => {
  const left = normalizeText(billAddress);
  const right = normalizeText(siteAddress);

  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 100;
  }

  if (left.includes(right) || right.includes(left)) {
    return 85;
  }

  const leftTokens = left.split(' ').filter((token) => token.length > 2);
  const rightTokens = new Set(right.split(' ').filter((token) => token.length > 2));
  if (!leftTokens.length || !rightTokens.size) {
    return 0;
  }

  const shared = leftTokens.filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return Math.round((shared / union) * 75);
};

const filterSites = (sites, city, businessGroup) => {
  let candidates = sites;

  if (city?.trim()) {
    const normalizedCity = normalizeText(city);
    const byCity = candidates.filter((site) => normalizeText(site.city) === normalizedCity);
    if (byCity.length) {
      candidates = byCity;
    }
  }

  if (businessGroup?.trim()) {
    const normalizedGroup = normalizeText(businessGroup);
    const byGroup = candidates.filter((site) => normalizeText(site.name) === normalizedGroup);
    if (byGroup.length) {
      candidates = byGroup;
    }
  }

  return candidates;
};

const pickBestSiteMatch = (sites, location) => {
  let bestSite = null;
  let bestScore = 0;

  for (const site of sites) {
    const score = scoreAddressMatch(location, site.location);
    if (score > bestScore) {
      bestScore = score;
      bestSite = site;
    }
  }

  return bestScore >= MIN_MATCH_SCORE ? bestSite?.id ?? null : null;
};

export const resolveBillSiteId = async ({ siteId, city, businessGroup, location }) => {
  if (siteId) {
    const { data: siteById } = await supabase.from('sites').select('id').eq('id', siteId).maybeSingle();
    if (siteById?.id) {
      return siteById.id;
    }
  }

  if (!location?.trim()) {
    return null;
  }

  const { data: sites, error } = await supabase.from('sites').select('id, name, location, city');
  if (error || !sites?.length) {
    return null;
  }

  const candidates = filterSites(sites, city, businessGroup);
  return pickBestSiteMatch(candidates, location);
};
