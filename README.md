# nodejs-test

Do `npm install` and then `node index.js` to run.

# Working

The program fetches the country, city and categories from the endpoints and after fetching all the details it randomly selects country name, city name and category name and then calls the attraction end point to get attraci list.
If the attraction is found then it stores it in the database and if attraction is not found it retries again with new country, city and category.
If we get attraction list then it checks for price and availability of a randomly selected attraction list. If attraction is available then it proceeds with the booking.
