const express = require("express");
const router = express.Router();
const {
    getAllUsers,
    postUser,
    deleteUser,
    loginHandler,
    getUserById
} = require("../controller/user");

//GET ALL USER (SHOW ALL CUSTOMER FOR ADMIN ONLY, SHOW ONLY ADMIN FOR CUSTOMER(S))
router.get('/users', getAllUsers);

// GET USER BY ID
router.get('/get-user/:id', getUserById);

// REGISTER NEW USER (EVERYBODY CAN SIGN UP)
router.post('/register', postUser);

// USER LOGIN
router.post('/login', loginHandler);

// DELETE USER ACCOUNT - ADMIN ONLY
router.delete('/admin/delete/:id', deleteUser);

module.exports = router;
