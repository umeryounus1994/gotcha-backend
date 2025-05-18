const { SquareClient, SquareEnvironment, SquareError } = require("square");

const client = new SquareClient({
  environment: SquareEnvironment.Sandbox,
  applicationId: 'sandbox-sq0idb-U2p7my96QjlO2iro0UI0DQ',
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

module.exports = client; 
