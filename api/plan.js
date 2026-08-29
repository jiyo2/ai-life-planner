// =======================================================
// FOURSQUARE CONFIGURATION
// =======================================================

const FOURSQUARE_API_KEY =
  process.env.FOURSQUARE_API_KEY;

const FOURSQUARE_API_VERSION =
  "2025-06-17";


// =======================================================
// FOURSQUARE PLACE SEARCH
// =======================================================

async function findFoursquareRestaurant(
  restaurantName,
  latitude,
  longitude
) {

  try {

    if (
      !FOURSQUARE_API_KEY ||
      !restaurantName ||
      !Number.isFinite(Number(latitude)) ||
      !Number.isFinite(Number(longitude))
    ) {

      return null;

    }

    const url =
      "https://places-api.foursquare.com/places/search" +
      "?query=" +
      encodeURIComponent(restaurantName) +
      "&ll=" +
      encodeURIComponent(
        latitude + "," + longitude
      ) +
      "&radius=1000" +
      "&limit=5" +
      "&sort=DISTANCE" +
      "&fields=" +
      encodeURIComponent(
        "fsq_id,name,location,rating,stats,website,tel"
      );

    console.log(
      "Foursquare search:",
      restaurantName
    );

    const response =
      await fetch(
        url,
        {
          method: "GET",

          headers: {

            "Authorization":
              "Bearer " +
              FOURSQUARE_API_KEY,

            "X-Places-Api-Version":
              FOURSQUARE_API_VERSION,

            "Accept":
              "application/json"

          }

        }
      );

    if (!response.ok) {

      const errorText =
        await response.text();

      console.error(
        "Foursquare search error:",
        response.status,
        errorText
      );

      return null;

    }

    const data =
      await response.json();

    if (
      !data ||
      !Array.isArray(data.results) ||
      data.results.length === 0
    ) {

      console.log(
        "No Foursquare match:",
        restaurantName
      );

      return null;

    }

    const normalizedName =
      restaurantName
        .toLowerCase()
        .replace(
          /[^a-z0-9ğüşöçıİĞÜŞÖÇ\s]/gi,
          ""
        )
        .trim();

    let bestMatch =
      null;

    let bestScore =
      Infinity;

    for (
      const place
      of data.results
    ) {

      if (
        !place ||
        !place.fsq_id
      ) {

        continue;

      }

      const placeName =
        String(
          place.name || ""
        )
          .toLowerCase()
          .replace(
            /[^a-z0-9ğüşöçıİĞÜŞÖÇ\s]/gi,
            ""
          )
          .trim();

      let score =
        0;

      // ---------------------------------------------------
      // NAME MATCH
      // ---------------------------------------------------

      if (
        placeName ===
        normalizedName
      ) {

        score -= 100;

      } else if (
        placeName.includes(
          normalizedName
        ) ||
        normalizedName.includes(
          placeName
        )
      ) {

        score -= 50;

      }

      // ---------------------------------------------------
      // DISTANCE
      // ---------------------------------------------------

      const placeLat =
        Number(
          place?.geocodes?.main?.latitude ||
          place?.location?.latitude
        );

      const placeLon =
        Number(
          place?.geocodes?.main?.longitude ||
          place?.location?.longitude
        );

      if (
        Number.isFinite(placeLat) &&
        Number.isFinite(placeLon)
      ) {

        const distance =
          Math.sqrt(
            Math.pow(
              placeLat -
              Number(latitude),
              2
            ) +
            Math.pow(
              placeLon -
              Number(longitude),
              2
            )
          );

        score +=
          distance * 100000;

      }

      if (
        score <
        bestScore
      ) {

        bestScore =
          score;

        bestMatch =
          place;

      }

    }

    if (!bestMatch) {

      return null;

    }

    console.log(
      "Foursquare matched:",
      restaurantName,
      "=>",
      bestMatch.name,
      bestMatch.fsq_id
    );

    return bestMatch;

  } catch (error) {

    console.error(
      "Foursquare search exception:",
      error.message
    );

    return null;

  }

}


// =======================================================
// FOURSQUARE PLACE PHOTOS
// =======================================================

async function getFoursquareRestaurantPhoto(
  fsqPlaceId
) {

  try {

    if (
      !FOURSQUARE_API_KEY ||
      !fsqPlaceId
    ) {

      return null;

    }

    const url =
      "https://places-api.foursquare.com/places/" +
      encodeURIComponent(
        fsqPlaceId
      ) +
      "/photos?limit=5&sort=POPULAR";

    console.log(
      "Foursquare photo request:",
      fsqPlaceId
    );

    const response =
      await fetch(
        url,
        {
          method: "GET",

          headers: {

            "Authorization":
              "Bearer " +
              FOURSQUARE_API_KEY,

            "X-Places-Api-Version":
              FOURSQUARE_API_VERSION,

            "Accept":
              "application/json"

          }

        }
      );

    if (!response.ok) {

      const errorText =
        await response.text();

      console.error(
        "Foursquare photo error:",
        response.status,
        errorText
      );

      return null;

    }

    const photos =
      await response.json();

    if (
      !Array.isArray(photos) ||
      photos.length === 0
    ) {

      console.log(
        "No Foursquare photos:",
        fsqPlaceId
      );

      return null;

    }

    const photo =
      photos[0];

    if (!photo) {

      return null;

    }

    // ---------------------------------------------------
    // FOURSQUARE PHOTO URL
    //
    // Current FSQ photo objects provide:
    // prefix + suffix
    // ---------------------------------------------------

    if (
      photo.prefix &&
      photo.suffix
    ) {

      const imageUrl =
        String(
          photo.prefix
        ) +
        "original" +
        String(
          photo.suffix
        );

      return {

        imageUrl,

        imageSource:
          "Foursquare",

        imageAttribution:
          "Photo via Foursquare",

        foursquarePhotoId:
          photo.id || ""

      };

    }

    // ---------------------------------------------------
    // SOME RESPONSES MAY CONTAIN URL DIRECTLY
    // ---------------------------------------------------

    if (
      photo.url &&
      /^https?:\/\//i.test(
        photo.url
      )
    ) {

      return {

        imageUrl:
          photo.url,

        imageSource:
          "Foursquare",

        imageAttribution:
          "Photo via Foursquare",

        foursquarePhotoId:
          photo.id || ""

      };

    }

    return null;

  } catch (error) {

    console.error(
      "Foursquare photo exception:",
      error.message
    );

    return null;

  }

}


// =======================================================
// ENRICH RESTAURANT WITH FOURSQUARE
// =======================================================

async function enrichRestaurantWithFoursquare(
  restaurant
) {

  try {

    if (
      !restaurant ||
      !restaurant.name
    ) {

      return restaurant;

    }

    const match =
      await findFoursquareRestaurant(
        restaurant.name,
        restaurant.latitude,
        restaurant.longitude
      );

    if (!match) {

      return {

        ...restaurant,

        foursquareId:
          "",

        imageUrl:
          "",

        imageSource:
          "",

        imageAttribution:
          ""

      };

    }

    const photo =
      await getFoursquareRestaurantPhoto(
        match.fsq_id
      );

    let rating =
      restaurant.rating;

    if (
      rating === null ||
      rating === undefined
    ) {

      const fsqRating =
        Number(
          match.rating
        );

      if (
        Number.isFinite(
          fsqRating
        )
      ) {

        rating =
          fsqRating;

      }

    }

    let reviewCount =
      restaurant.reviewCount;

    if (
      reviewCount === null ||
      reviewCount === undefined
    ) {

      const fsqStats =
        match.stats || {};

      const fsqReviews =
        Number(
          fsqStats.total_ratings ||
          fsqStats.total_reviews
        );

      if (
        Number.isFinite(
          fsqReviews
        )
      ) {

        reviewCount =
          fsqReviews;

      }

    }

    return {

      ...restaurant,

      foursquareId:
        match.fsq_id,

      foursquareName:
        match.name || "",

      rating,

      reviewCount,

      imageUrl:
        photo?.imageUrl || "",

      imageSource:
        photo?.imageSource || "",

      imageAttribution:
        photo?.imageAttribution || "",

      foursquarePhotoId:
        photo?.foursquarePhotoId || "",

      website:
        restaurant.website ||
        match.website ||
        "",

      phone:
        restaurant.phone ||
        match.tel ||
        ""

    };

  } catch (error) {

    console.error(
      "Foursquare enrichment error:",
      error.message
    );

    return restaurant;

  }

}


// =======================================================
// OPENSTREETMAP RESTAURANTS
// =======================================================

async function getRestaurantsFromOSM(
  destination
) {

  try {

    console.log(
      "OpenStreetMap restaurant search:",
      destination
    );

    // ---------------------------------------------------
    // GEOCODE DESTINATION
    // ---------------------------------------------------

    const geocodeURL =
      "https://nominatim.openstreetmap.org/search" +
      "?format=json" +
      "&limit=1" +
      "&q=" +
      encodeURIComponent(
        destination
      );

    const geocodeResponse =
      await fetch(
        geocodeURL,
        {
          method: "GET",

          headers: {

            "User-Agent":
              "AI-Life-Planner/1.0",

            "Accept":
              "application/json"

          }

        }
      );

    if (!geocodeResponse.ok) {

      console.error(
        "Nominatim error:",
        geocodeResponse.status
      );

      return [];

    }

    const locations =
      await geocodeResponse.json();

    if (
      !Array.isArray(locations) ||
      locations.length === 0
    ) {

      console.log(
        "Destination not found:",
        destination
      );

      return [];

    }

    const lat =
      Number(
        locations[0].lat
      );

    const lon =
      Number(
        locations[0].lon
      );

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon)
    ) {

      return [];

    }

    console.log(
      "Destination coordinates:",
      lat,
      lon
    );


    // ---------------------------------------------------
    // OVERPASS
    // ---------------------------------------------------

    const overpassQuery = `
[out:json][timeout:30];

(
  node["amenity"="restaurant"](around:15000,${lat},${lon});
  way["amenity"="restaurant"](around:15000,${lat},${lon});
  relation["amenity"="restaurant"](around:15000,${lat},${lon});
);

out center tags;
`;

    const osmResponse =
      await fetch(
        "https://overpass-api.de/api/interpreter",
        {
          method: "POST",

          headers: {

            "Content-Type":
              "application/x-www-form-urlencoded",

            "User-Agent":
              "AI-Life-Planner/1.0",

            "Accept":
              "application/json"

          },

          body:
            "data=" +
            encodeURIComponent(
              overpassQuery
            )

        }
      );

    if (!osmResponse.ok) {

      console.error(
        "Overpass error:",
        osmResponse.status
      );

      return [];

    }

    const osmData =
      await osmResponse.json();

    if (
      !osmData ||
      !Array.isArray(
        osmData.elements
      )
    ) {

      return [];

    }

    console.log(
      "OSM restaurants found:",
      osmData.elements.length
    );


    // ---------------------------------------------------
    // BUILD RESTAURANTS
    // ---------------------------------------------------

    const restaurants = [];

    for (
      const item
      of osmData.elements
    ) {

      const tags =
        item.tags || {};

      const name =
        tags.name ||
        tags["name:en"] ||
        tags["name:tr"];

      if (!name) {

        continue;

      }

      let restaurantLat =
        item.lat;

      let restaurantLon =
        item.lon;

      if (
        restaurantLat === undefined &&
        item.center
      ) {

        restaurantLat =
          item.center.lat;

        restaurantLon =
          item.center.lon;

      }


      // -------------------------------------------------
      // ADDRESS
      // -------------------------------------------------

      const addressParts = [];

      const addressFields = [

        "addr:housenumber",
        "addr:street",
        "addr:suburb",
        "addr:district",
        "addr:city"

      ];

      for (
        const field
        of addressFields
      ) {

        if (
          tags[field]
        ) {

          addressParts.push(
            tags[field]
          );

        }

      }

      const address =
        addressParts.length
          ? addressParts.join(
              ", "
            )
          : destination;


      // -------------------------------------------------
      // CUISINE
      // -------------------------------------------------

      const cuisine =
        tags.cuisine ||
        "Local cuisine";


      // -------------------------------------------------
      // PRICE
      // -------------------------------------------------

      const priceLevel =
        tags["price:level"] ||
        tags["price_range"] ||
        "$$";


      // -------------------------------------------------
      // CONTACT
      // -------------------------------------------------

      const website =
        tags.website ||
        tags["contact:website"] ||
        "";

      const phone =
        tags.phone ||
        tags["contact:phone"] ||
        "";

      const openingHours =
        tags.opening_hours ||
        "";


      // -------------------------------------------------
      // RATING
      // -------------------------------------------------

      let rating =
        null;

      if (
        tags.rating
      ) {

        const value =
          Number(
            tags.rating
          );

        if (
          Number.isFinite(value)
        ) {

          rating =
            value;

        }

      }


      // -------------------------------------------------
      // REVIEW COUNT
      // -------------------------------------------------

      let reviewCount =
        null;

      const reviewValue =
        tags["review:count"] ||
        tags.reviews ||
        "";

      if (
        reviewValue
      ) {

        const value =
          Number(
            String(
              reviewValue
            ).replace(
              /[^\d]/g,
              ""
            )
          );

        if (
          Number.isFinite(value) &&
          value > 0
        ) {

          reviewCount =
            value;

        }

      }


      // -------------------------------------------------
      // GOOGLE MAPS
      // -------------------------------------------------

      let mapsUrl = "";

      if (
        Number.isFinite(
          Number(
            restaurantLat
          )
        ) &&
        Number.isFinite(
          Number(
            restaurantLon
          )
        )
      ) {

        mapsUrl =
          "https://www.google.com/maps/search/?api=1&query=" +
          encodeURIComponent(
            restaurantLat +
            "," +
            restaurantLon
          );

      } else {

        mapsUrl =
          "https://www.google.com/maps/search/?api=1&query=" +
          encodeURIComponent(
            name +
            " " +
            destination
          );

      }


      // -------------------------------------------------
      // OSM URL
      // -------------------------------------------------

      let osmUrl = "";

      if (
        item.type &&
        item.id
      ) {

        osmUrl =
          "https://www.openstreetmap.org/" +
          encodeURIComponent(
            item.type
          ) +
          "/" +
          encodeURIComponent(
            item.id
          );

      }


      // -------------------------------------------------
      // RESTAURANT OBJECT
      // -------------------------------------------------

      restaurants.push({

        name:
          String(name),

        cuisine:
          String(cuisine),

        priceLevel:
          String(priceLevel),

        rating,

        reviewCount,

        address:
          String(address),

        description:
          `${name} is a real local restaurant in ${destination}, listed in OpenStreetMap.`,

        imageUrl:
          "",

        imageSource:
          "",

        imageAttribution:
          "",

        mapsUrl,

        osmUrl,

        website,

        phone,

        openingHours,

        latitude:
          Number.isFinite(
            Number(
              restaurantLat
            )
          )
            ? Number(
                restaurantLat
              )
            : null,

        longitude:
          Number.isFinite(
            Number(
              restaurantLon
            )
          )
            ? Number(
                restaurantLon
              )
            : null,

        osmType:
          item.type ||
          "",

        osmId:
          item.id ||
          null

      });

      if (
        restaurants.length >= 20
      ) {

        break;

      }

    }


    // ---------------------------------------------------
    // REMOVE DUPLICATES
    // ---------------------------------------------------

    const uniqueRestaurants = [];

    const restaurantNames =
      new Set();

    for (
      const restaurant
      of restaurants
    ) {

      const key =
        restaurant.name
          .toLowerCase()
          .trim();

      if (
        restaurantNames.has(
          key
        )
      ) {

        continue;

      }

      restaurantNames.add(
        key
      );

      uniqueRestaurants.push(
        restaurant
      );

    }


    // ---------------------------------------------------
    // FOURSQUARE ENRICHMENT
    // ---------------------------------------------------

    console.log(
      "Starting Foursquare restaurant enrichment..."
    );

    const enrichedRestaurants =
      await Promise.all(
        uniqueRestaurants.map(
          restaurant =>
            enrichRestaurantWithFoursquare(
              restaurant
            )
        )
      );


    // ---------------------------------------------------
    // PREFER RESTAURANTS WITH
    // VERIFIED FOURSQUARE PHOTOS
    // ---------------------------------------------------

    enrichedRestaurants.sort(
      (a, b) => {

        const aImage =
          a.imageUrl
            ? 1
            : 0;

        const bImage =
          b.imageUrl
            ? 1
            : 0;

        if (
          bImage !==
          aImage
        ) {

          return (
            bImage -
            aImage
          );

        }

        const aRating =
          Number(
            a.rating || 0
          );

        const bRating =
          Number(
            b.rating || 0
          );

        return (
          bRating -
          aRating
        );

      }
    );


    // ---------------------------------------------------
    // LIMIT 10
    // ---------------------------------------------------

    return enrichedRestaurants.slice(
      0,
      10
    );

  } catch (error) {

    console.error(
      "OpenStreetMap restaurant error:",
      error
    );

    return [];

  }

}


// =======================================================
// RESTAURANTS
// =======================================================

console.log(
  "Starting OpenStreetMap + Foursquare restaurant search..."
);

travelData.restaurants =
  await getRestaurantsFromOSM(
    destination
  );

console.log(
  "Restaurants returned:",
  travelData.restaurants.length
);

console.log(
  "Restaurants with verified photos:",
  travelData.restaurants.filter(
    restaurant =>
      Boolean(
        restaurant.imageUrl
      )
  ).length
);
