// const MongoConnectionString = "mongodb://localhost:27017/etherland";

const MongoConnectionString =
  'mongodb+srv://arapp:tech8580@gotchaapp.bscmggy.mongodb.net/GotchaApp?retryWrites=true&w=majority';

const Port = 8088;

const Mongo = {
  Connection: MongoConnectionString,
};

const MailCredentials = {
  Server: 'gmail',
  Email: 'app.parachute.ar@gmail.com',
  Password: 'parachute8580',
};

const JWT = {
  secret: "worldisfullofdevelopers",
};

module.exports = {
  Mongo,
  Port,
  MailCredentials,
  JWT
};
