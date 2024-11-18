const express = require('express');
const app = express();
const path = require('path');

//import router user
const userRouter = require("./routes/user");
const messRouter = require("./routes/message");

//middleware untuk parse JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// user router
app.use(userRouter);
// message router
app.use(messRouter);

//konfigurasi CORS
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE, PATCH");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  next();
});

//default route
app.get("/", (req, res, next) => {
  try {
    res.json({
      message: "Hello from another service"
    });
  } catch (error) {
    console.log(error);
  }
});

const association = require('./util/dbAssoc'); //dbAssoc.js

association()
  .then(() => {
    app.listen(5000, () => {
      console.log("connected to db and server is running on port 5000");
    });
  })
  .catch((err) => {
    console.log(err.message);
  });

  // Serve static files dari folder client
app.use(express.static(path.join(__dirname, '../client')));

app.use('/temp', express.static(path.join(__dirname, 'temp')));

// Route untuk halaman login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/login.html'));
});