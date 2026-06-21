const fallbackProfileUrl =
  process.env.GOOGLE_REVIEWS_PROFILE_URL ||
  "https://www.google.com/search?q=TeboaTech+reviews";

const businessProfileScope = "https://www.googleapis.com/auth/business.manage";
const starRatingMap = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

function json(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  res.end(JSON.stringify(body));
}

function normalizeResourceId(value) {
  const raw = String(value || "").trim();
  if (!raw) return raw;

  const parts = raw.split("/").filter(Boolean);
  return parts[parts.length - 1] || raw;
}

function normalizeReview(review) {
  return {
    authorName: review.author_name || "Google reviewer",
    profilePhotoUrl: review.profile_photo_url || "",
    rating: review.rating || null,
    relativeTimeDescription: review.relative_time_description || "",
    text: review.text || "",
    time: review.time || null,
  };
}

function normalizeBusinessProfileReview(review) {
  const createdAt = review.createTime ? Date.parse(review.createTime) : null;

  return {
    authorName: review.reviewer?.displayName || "Google reviewer",
    profilePhotoUrl: review.reviewer?.profilePhotoUrl || "",
    rating: starRatingMap[review.starRating] || null,
    relativeTimeDescription: review.updateTime ? "Published on Google" : "",
    text: review.comment || "",
    time: Number.isFinite(createdAt) ? Math.floor(createdAt / 1000) : null,
  };
}

async function getBusinessProfileAccessToken({ clientId, clientSecret, refreshToken }) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: businessProfileScope,
    }),
  });

  const payload = await response.json();

  if (!response.ok || !payload.access_token) {
    throw new Error(
      payload.error_description ||
        payload.error ||
        "Google Business Profile OAuth token request failed."
    );
  }

  return payload.access_token;
}

async function loadBusinessProfileReviews({
  accountId,
  locationId,
  clientId,
  clientSecret,
  refreshToken,
}) {
  const accessToken = await getBusinessProfileAccessToken({
    clientId,
    clientSecret,
    refreshToken,
  });

  const account = encodeURIComponent(normalizeResourceId(accountId));
  const location = encodeURIComponent(normalizeResourceId(locationId));
  const params = new URLSearchParams({
    pageSize: "10",
    orderBy: "updateTime desc",
  });

  const response = await fetch(
    `https://mybusiness.googleapis.com/v4/accounts/${account}/locations/${location}/reviews?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(
      payload.error?.message || "Google Business Profile reviews request failed."
    );
  }

  return {
    configured: true,
    source: "business-profile",
    name: "TeboaTech",
    rating: payload.averageRating || null,
    totalReviews: payload.totalReviewCount || null,
    url: fallbackProfileUrl,
    reviews: Array.isArray(payload.reviews)
      ? payload.reviews.map(normalizeBusinessProfileReview)
      : [],
  };
}

async function loadPlacesReviews(apiKey, placeId) {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: "name,rating,user_ratings_total,reviews,url",
    reviews_sort: "newest",
    key: apiKey,
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`
  );
  const payload = await response.json();

  if (!response.ok || payload.status !== "OK") {
    throw new Error(
      payload.error_message ||
        payload.status ||
        "Google Places request failed."
    );
  }

  const result = payload.result || {};

  return {
    configured: true,
    source: "places",
    name: result.name || "TeboaTech",
    rating: result.rating || null,
    totalReviews: result.user_ratings_total || null,
    url: result.url || fallbackProfileUrl,
    reviews: Array.isArray(result.reviews)
      ? result.reviews.map(normalizeReview)
      : [],
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { error: "Method not allowed" });
  }

  const businessProfileConfig = {
    accountId: process.env.GOOGLE_BUSINESS_ACCOUNT_ID,
    locationId: process.env.GOOGLE_BUSINESS_LOCATION_ID,
    clientId: process.env.GOOGLE_BUSINESS_CLIENT_ID,
    clientSecret: process.env.GOOGLE_BUSINESS_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_BUSINESS_REFRESH_TOKEN,
  };
  const businessProfileRequired = [
    ["accountId", "GOOGLE_BUSINESS_ACCOUNT_ID"],
    ["locationId", "GOOGLE_BUSINESS_LOCATION_ID"],
    ["clientId", "GOOGLE_BUSINESS_CLIENT_ID"],
    ["clientSecret", "GOOGLE_BUSINESS_CLIENT_SECRET"],
    ["refreshToken", "GOOGLE_BUSINESS_REFRESH_TOKEN"],
  ];
  const missingBusinessProfileEnv = businessProfileRequired
    .filter(([key]) => !businessProfileConfig[key])
    .map(([, name]) => name);
  const hasBusinessProfileConfig = missingBusinessProfileEnv.length === 0;
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;

  if (hasBusinessProfileConfig) {
    try {
      return json(res, 200, await loadBusinessProfileReviews(businessProfileConfig));
    } catch (error) {
      return json(res, 502, {
        configured: true,
        source: "business-profile",
        error: "Google reviews feed could not be loaded.",
        message: error.message,
      });
    }
  }

  if (apiKey && placeId) {
    try {
      return json(res, 200, await loadPlacesReviews(apiKey, placeId));
    } catch (error) {
      return json(res, 502, {
        configured: true,
        source: "places",
        error: "Google reviews feed could not be loaded.",
        message: error.message,
      });
    }
  }

  return json(res, 200, {
    configured: false,
    name: "TeboaTech",
    url: fallbackProfileUrl,
    reviews: [],
    message: missingBusinessProfileEnv.length
      ? `Google reviews feed is waiting for: ${missingBusinessProfileEnv.join(", ")}.`
      : "Add Google Business Profile OAuth credentials or Google Places API credentials.",
  });
};
