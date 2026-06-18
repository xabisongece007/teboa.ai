const fallbackProfileUrl =
  process.env.GOOGLE_REVIEWS_PROFILE_URL ||
  "https://www.google.com/search?q=TeboaTech+reviews";

function json(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  res.end(JSON.stringify(body));
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

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { error: "Method not allowed" });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;

  if (!apiKey || !placeId) {
    return json(res, 200, {
      configured: false,
      name: "TeboaTech",
      url: fallbackProfileUrl,
      reviews: [],
      message: "Google reviews feed is not configured yet.",
    });
  }

  const params = new URLSearchParams({
    place_id: placeId,
    fields: "name,rating,user_ratings_total,reviews,url",
    reviews_sort: "newest",
    key: apiKey,
  });

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`
    );
    const payload = await response.json();

    if (!response.ok || payload.status !== "OK") {
      return json(res, 502, {
        configured: true,
        error: "Google reviews feed could not be loaded.",
        status: payload.status || response.status,
        message: payload.error_message || "Google Places request failed.",
      });
    }

    const result = payload.result || {};

    return json(res, 200, {
      configured: true,
      name: result.name || "TeboaTech",
      rating: result.rating || null,
      totalReviews: result.user_ratings_total || null,
      url: result.url || fallbackProfileUrl,
      reviews: Array.isArray(result.reviews)
        ? result.reviews.map(normalizeReview)
        : [],
    });
  } catch (error) {
    return json(res, 500, {
      configured: true,
      error: "Google reviews feed could not be loaded.",
      message: error.message,
    });
  }
};
