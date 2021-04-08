const axios = require("axios").default;
var MongoClient = require("mongodb").MongoClient;
require("dotenv").config();

const api_key = process.env.API_KEY;

let countries = null;
let random_CountryName = null;
let random_CityName = null;
let random_Category = null;
let city = null;
let category = null;
let random_sub_Category = null;

let count = null;

const url = "mongodb://127.0.0.1:27017/myDatabase";
try {
  // Connect to the MongoDB
  MongoClient.connect(url, function (err, client) {
    if (err) throw err;
    console.log("Database created!");
    const db = client.db("myDatabase");
    db.listCollections().toArray(function (err, items) {
      // console.log(items);
      if (!items.name === "countries") {
        try {
          client.close();
          MongoClient.connect("mongodb://127.0.0.1:27017/", function (err, db) {
            var dbo = db.db("myDatabase");
            dbo.createCollection("attraction", function (err, res) {
              if (err) throw err;
              console.log("Collection created!");
              db.close();
            });
          });
        } catch {
          console.log("error");
        }
      }
    });
    client.close();
    fetchCountry();
  });
} catch (e) {
  console.error(e);
}

// Fetch ALl the Countries
function fetchCountry() {
  axios
    .get("https://test.agidmc.com/v1/countries", {
      headers: { "API-Key": api_key },
    })
    .then(function (response) {
      // handle success
      return response.data;
    })
    .then((data) => {
      countries = data;
      //Pick a random country name
      random_CountryName =
        countries.data[Math.floor(Math.random() * countries.data.length)]
          .country;
      console.log("Country:    " + random_CountryName);
      // Fetch City
      fetchCity();
    })
    .catch(function (error) {
      // handle error
      console.log(error);
    });
}

// Fetch ALl the cities for a randomly selected country
function fetchCity() {
  axios
    .get("https://test.agidmc.com/v1/cities?country=" + random_CountryName, {
      headers: { "API-Key": api_key },
    })
    .then(function (response) {
      // handle success
      return response.data;
    })
    .then((data) => {
      city = data;
      // console.log(city);
      if (!city.data) {
        // Recalculate Country name
        console.log("Recalculating Country name......");
        fetchCountry();
      } else {
        //Pick a random city name
        try {
          random_CityName =
            city.data[Math.floor(Math.random() * city.data.length)].city;
          console.log("City:    " + random_CityName);
          fetchCategory();
        } catch {
          console.log("Something Happened. Retrying...");
          fetchCountry();
        }
      }
    })
    .catch(function (error) {
      // handle error
      console.log("Error Occured");

      // Retry
      fetchCountry();
    });
}

// Fetch ALl the catagories
function fetchCategory() {
  axios
    .get("https://test.agidmc.com/v1/categories", {
      headers: { "API-Key": api_key },
    })
    .then(function (response) {
      // handle success
      return response.data;
    })
    .then((data) => {
      category = data;
      // console.log(category);
      //Pick a random sub category name
      random_Category =
        category.data[Math.floor(Math.random() * category.data.length)]
          .subcategories;
      // console.log(random_Category);
      random_sub_Category =
        random_Category[Math.floor(Math.random() * random_Category.length)]
          .subcategoryName;
      console.log("Sub Category:   " + random_sub_Category);
      // Now we got the category data also
      // Fetch the attraction lists for given country name and city name
      fetchAttractions(
        random_CityName,
        random_CountryName,
        random_sub_Category
      );
    })
    .catch(function (error) {
      // handle error
      console.log(error);
    });
}

// Fetch all the attractions list from specified city, country name and category
function fetchAttractions(
  cityName = "Prague", // These are some hardcoded test values used for testing purposes
  countryName = "Czech Republic",
  category = "Archaeological Tours"
) {
  console.log("Fetching Attractions...");
  axios
    .get(
      "https://test.agidmc.com/v1/attractions?country=" +
        countryName +
        "&city=" +
        cityName +
        "&page=1&category=" +
        category +
        "&currency=INR",
      {
        headers: { "API-Key": api_key },
      }
    )
    .then(function (response) {
      // handle success
      return response.data;
    })
    .then((data) => {
      // console.log(data);
      if (!data.data.length) {
        // Recalculate everything
        console.log(
          "No attractions found for " +
            cityName +
            " " +
            countryName +
            " for category " +
            category
        );
        console.log("Retrying with new country.....");
        fetchCountry();
      } else {
        // Select a random attraction list from available list
        let random_AttractionList =
          data.data[Math.floor(Math.random() * data.data.length)];

        let random_ticket =
          random_AttractionList.ticketTypesAndPackages[
            Math.floor(
              Math.random() *
                random_AttractionList.ticketTypesAndPackages.length
            )
          ];

        let random_ticketId = random_ticket.id;

        // Store that List in Database
        // Save Data in Database
        try {
          // Connect to the MongoDB cluster
          MongoClient.connect("mongodb://127.0.0.1:27017/", function (err, db) {
            if (err) throw err;
            var dbo = db.db("myDatabase");
            dbo.collection("attraction").insertOne(data, function (err, res) {
              if (err) throw err;
              console.log("Attraction stored in database");
              db.close();
            });
          });
        } catch (e) {
          console.error(e);
        }

        console.log("Selected Random Ticket Id : " + random_ticketId);
        console.log(
          "Selected Random Attraction Id : " + random_AttractionList.id
        );
        console.log("Checking Price and Availability");
        // Find price and Availability for that attraction
        findPriceandAvailability(random_ticketId, random_AttractionList.id);
      }
    })
    .catch(function (error) {
      // handle error
      console.log(error);
    });
}

// Check availabilty for selected attraction
function findPriceandAvailability(
  ticketId = "HO103562", // Hardcoded values for testing purposes
  attractionId = "HO103562"
) {
  axios
    .post(
      "https://test.agidmc.com/v1/priceAndAvailability",
      {
        id: ticketId,
        start: "2021-04-10",
        end: "2021-04-30",
        types: [
          {
            type: "ADULT",
            count: 1, //Enter Number of people required should be Integer
          },
          {
            type: "CHILD",
            count: 1, //Enter Number of people required should be Integer
          },
        ],
        currency: "INR",
      },
      {
        headers: { "API-Key": api_key },
      }
    )
    .then((response) => {
      return response.data;
    })
    .then((data) => {
      // console.log(data);
      // If we get data, that means booking can be done
      if (data.data) {
        // console.log(data.data.prices[0]);
        console.log("Creating Booking for selected attraction");
        createBooking(data.data.id, ticketId, attractionId);
      } else {
        console.log(
          "Bookings not Available. Retrying with other combination....."
        );
        // Try with another attraction list
        fetchAttractions(
          random_CityName,
          random_CountryName,
          random_sub_Category
        );
      }
    })
    .catch(function (error) {
      // handle error
      // console.log(error);
      console.log(
        "Error Fetching price and Availability details. Retrying......"
      );
      fetchCountry();
    });
}

function createBooking(id, ticketId, attractionId) {
  axios
    .post(
      "https://test.agidmc.com/v1/createBooking",
      {
        firstName: "Hello",
        lastName: "AGi",
        personTitle: "Mr",
        email: "hello@agidmc.com",
        phone: "+1-541-754-3010",
        passport: "fasdfsa",
        date: "2021-04-10",
        pickup: "",
        protect: false,
        comments: "fsda",
        currency: "INR",
        bookings: [
          {
            id: id,
            type: "ADULT",
            ticketId: ticketId,
            attractionId: attractionId,
            questions: [
              {
                id: "TA1370",
                answer: "1997-10-12",
              },
              {
                id: "TA1371",
                answer: "1997-10-12",
              },
              {
                id: "TA1372",
                answer: "1997-10-12",
              },
              {
                id: "TA1373",
                answer: "1997-10-12",
              },
              {
                id: "TA1374",
                answer: "IN",
              },
              {
                id: "TA1375",
                answer: "MALE",
              },
              {
                id: "TA1376",
                answer: "Hotel",
              },
            ],
            isLead: "true",
          },
          {
            id: id,
            type: "CHILD",
            ticketId: ticketId,
            attractionId: attractionId,
            questions: [
              {
                id: "TA1370",
                answer: "1997-10-12",
              },
              {
                id: "TA1371",
                answer: "1997-10-12",
              },
              {
                id: "TA1372",
                answer: "1997-10-12",
              },
              {
                id: "TA1373",
                answer: "1997-10-12",
              },
              {
                id: "TA1374",
                answer: "IN",
              },
              {
                id: "TA1375",
                answer: "MALE",
              },
              {
                id: "TA1376",
                answer: "Hotel",
              },
            ],
            isLead: "false",
          },
        ],
      },
      {
        headers: { "API-Key": api_key },
      }
    )
    .then((response) => {
      return response.data;
    })
    .then((data) => {
      console.log(data);
    })
    .catch(function (error) {
      // handle error
      console.log(error.response.data.error);
      console.log("Use Ctrl+C to exit and then try again");
    });
}
