require("dotenv").config();
const sequelize = require("./db_connect");
const bcrypt = require('bcrypt');
const User = require('../model/User');
const Message = require('../model/Message');

const adminPassword = process.env.ADMIN_PWD;
const hashedPwd = bcrypt.hashSync(adminPassword, 4);

const admin = {
  id: process.env.ADMIN_ID,
  username: process.env.ADMIN_USERNAME,
  password: hashedPwd,
  role: "Admin"
}

User.hasMany(Message, { foreignKey: 'sender_id'});
User.hasMany(Message, { foreignKey: 'receiver_id'});

Message.belongsTo(User, { foreignKey: 'sender_id'});
Message.belongsTo(User, { foreignKey: 'receiver_id'});

const association = async()=>{
  try {
    await sequelize.sync({force: false});
    // User.create(admin);
    // await Message.create();
  } catch (error) {
    console.log(error.message);
  }
}

module.exports = association; 
