'use strict';
/**
 * Google integration layer.
 *
 *  - Identity login        : OAuth 2.0 (openid email profile) → owners log in with Google.
 *  - Business connect      : OAuth 2.0 offline access with scope business.manage →
 *                            lists accounts + locations (Business Profile API).
 *  - Review fetch & reply  : mybusiness v4  (listReviews / reviews:reply).
 *  - Public search         : Places API (New) text search + reviews, for the landing page.
 *
 * Everything degrades gracefully: without credentials the app runs in Demo Mode
 * (see lib/demo.js) with a fully simulated Google surface.
 */

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const ACCOUNTS_API = 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts';
const LOCATIONS_API = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const REVIEWS_API = 'https://mybusiness.googleapis.com/v4';
const PLACES_API = 'https://places.googleapis.com/v1/places';

const cid = () => process.env.GOOGLE_CLIENT_ID || '';
const csec = () => process.env.GOOGLE_CLIENT_SECRET || '';
const googleConfigured = () => Boolean(cid() && csec());

/* ------------------------------------------------------------------ */
/* OAuth URLs                                                          */
/* ------------------------------------------------------------------ */
function loginUrl(redirectUri, state) {
  const p = new URLSearchParams({
    client_id: cid(), redirect_uri: redirectUri, response_type: 'code',
    scope: 'openid email profile', access_type: 'online', prompt: 'select_account', state,
  });
  return `${GOOGLE_AUTH}?${p}`;
}

function connectUrl(redirectUri, state) {
  const p = new URLSearchParams({
    client_id: cid(), redirect_uri: redirectUri, response_type: 'code',
    scope: 'https://www.googleapis.com/auth/business.manage',
    access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state,
  });
  return `${GOOGLE_AUTH}?${p}`;
}

async function exchangeCode(code, redirectUri) {
  const res = await fetch(GOOGLE_TOKEN, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: cid(), client_secret: csec(), redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  });
  if (!res.ok) throw new Error(`google token exchange failed: ${await res.text()}`);
  return res.json(); // { access_token, refresh_token?, id_token, expires_in, scope }
}

async function refreshToken(refresh_token) {
  const res = await fetch(GOOGLE_TOKEN, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ refresh_token, client_id: cid(), client_secret: csec(), grant_type: 'refresh_token' }),
  });
  if (!res.ok) throw new Error(`google token refresh failed: ${await res.text()}`);
  return res.json(); // { access_token, expires_in }
}

/* ------------------------------------------------------------------ */
/* Business Profile API                                                */
/* ------------------------------------------------------------------ */
async function listAccounts(accessToken) {
  const res = await fetch(ACCOUNTS_API, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`listAccounts failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return (data.accounts || []).map((a) => ({ name: a.name, accountName: a.accountName, type: a.type }));
}

async function listLocations(accessToken, accountName) {
  const url = `${LOCATIONS_API}/${accountName}/locations?readMask=name,title,metadata.placeId,storefrontAddress,categories&pageSize=50`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`listLocations failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return (data.locations || []).map((l) => ({
    name: l.name,                                             // locations/{id}
    title: l.title,
    placeId: l.metadata?.placeId || '',
    address: [l.storefrontAddress?.addressLines?.join(', '), l.storefrontAddress?.locality]
      .filter(Boolean).join(', '),
    category: l.categories?.primaryCategory?.displayName || '',
  }));
}

async function fetchReviews(accessToken, locationName, pageToken) {
  const url = `${REVIEWS_API}/${locationName}/reviews?pageSize=50${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`fetchReviews failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const starMap = { FIVE: 5, FOUR: 4, THREE: 3, TWO: 2, ONE: 1 };
  const reviews = (data.reviews || []).map((r) => ({
    googleReviewId: r.reviewId,
    authorName: r.reviewer?.displayName || 'Google user',
    authorPhoto: r.reviewer?.profilePhotoUrl || '',
    rating: starMap[r.starRating] || 0,
    text: r.comment || '',
    postedAt: r.createTime ? new Date(r.createTime).toISOString().replace('T', ' ').slice(0, 19) : null,
    replied: Boolean(r.reviewReply),
    replyText: r.reviewReply?.comment || '',
  }));
  return { reviews, nextPageToken: data.nextPageToken || null, average: data.averageRating || null, total: data.totalReviewCount || null };
}

async function postReply(accessToken, locationName, reviewId, comment) {
  const url = `${REVIEWS_API}/${locationName}/reviews/${encodeURIComponent(reviewId)}:reply`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment }),
  });
  if (!res.ok) throw new Error(`postReply failed: ${res.status} ${await res.text()}`);
  return true;
}

/* ------------------------------------------------------------------ */
/* Places API (New) — public shop search + reviews for perception      */
/* ------------------------------------------------------------------ */
async function placesSearch(query) {
  const key = process.env.PLACES_API_KEY || '';
  if (!key) return [];
  const res = await fetch(`${PLACES_API}:searchText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.primaryTypeDisplayName' },
    body: JSON.stringify({ textQuery: query, maxResultCount: 8 }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.places || []).map((p) => ({
    id: `g_${p.id}`, google: true, placeId: p.id,
    name: p.displayName?.text || query, address: p.formattedAddress || '',
    category: p.primaryTypeDisplayName?.text || 'Business',
    rating: p.rating || 0, ratingsCount: p.userRatingCount || 0,
  }));
}

async function placeReviews(placeId) {
  const key = process.env.PLACES_API_KEY || '';
  if (!key) return null;
  const res = await fetch(`${PLACES_API}/${encodeURIComponent(placeId)}?languageCode=en`, {
    headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'displayName,formattedAddress,rating,userRatingCount,reviews' },
  });
  if (!res.ok) return null;
  const p = await res.json();
  const starMap = { FIVE: 5, FOUR: 4, THREE: 3, TWO: 2, ONE: 1 };
  return {
    name: p.displayName?.text || '', address: p.formattedAddress || '',
    rating: p.rating || 0, ratingsCount: p.userRatingCount || 0,
    reviews: (p.reviews || []).map((r) => ({
      authorName: r.authorAttribution?.displayName || 'Google user',
      rating: starMap[r.rating] || 0, text: r.text?.text || '',
      postedAt: r.relativePublishTimeDescription || '',
    })),
  };
}

module.exports = {
  googleConfigured, loginUrl, connectUrl, exchangeCode, refreshToken,
  listAccounts, listLocations, fetchReviews, postReply, placesSearch, placeReviews,
};
