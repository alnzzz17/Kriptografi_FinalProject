const Sequelize = require('sequelize');
require('dotenv').config()

const db_username = process.env.DB_USERNAME;
const db_password = process.env.DB_PASSWORD;
const db_host = process.env.DB_HOST

const db_name = "kriptografi"

const sequelize = new Sequelize(db_name, db_username, db_password, {
  host: db_host,
  dialect: 'mysql',
  //setting the timezone
  timezone: '+07:00'
});

module.exports = sequelize