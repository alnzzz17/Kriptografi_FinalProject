require("dotenv").config();
const User = require("../model/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// GET ALL USERS - ADMIN ONLY
const getAllUsers = async (req, res, next) => {
  try {

    const users = await User.findAll({
      attributes: {
        exclude: ['password'] // Changed from `password_hash`
      }
    });
    res.status(200).json({
      status: "success",
      data: users
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

// REGISTER NEW USER
const postUser = async (req, res, next) => {
  try {
    const { username, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    // periksa apakah user sudah ada
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ status: "error",
        message: "User already exists" });
    }

    // create user baru
    const newUser = await User.create({
      username,
      password: hashedPassword, // password yang sudah di-hash
      role
    });

    // generate jwt token
    const token = jwt.sign({
      userId: newUser.id,
      role: newUser.role
    }, process.env.TOKEN_SECRET_KEY,{
      expiresIn: "1h"
    })

    res.status(201).json({
      status: "success",
      message: "User registered successfully",
      data: { id: newUser.id, username: newUser.username }
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// USER LOGIN
const loginHandler = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // periksa apakah user sudah ada
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }

    // validasi password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: "error",
        message: "Invalid password"
      });
    }

    // generate jwt token
    const token = jwt.sign({
        id: user.id,
        role: user.role
      },
      process.env.TOKEN_SECRET_KEY,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      status: "success",
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// DELETE USER ACCOUNT - ADMIN ONLY
const deleteUser = async (req, res, next) => {
  try {
    // Mengambil token
    const header = req.headers;
    const authorization = header.authorization;
    let token;

    if (authorization !== undefined && authorization.startsWith("Bearer ")) {
      token = authorization.substring(7);
    } else {
      const error = new Error("You need to login");
      error.statusCode = 403;
      throw error;
    }

    // Decode payload untuk mendapatkan userId dan role
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET_KEY);

    // Hanya admin yang dapat menghapus user
    if (decoded.role !== "Admin") {
      return res.status(403).json({ status: "error", message: "You don't have access!" });
    }

    const { id } = req.params;

    // Cek apakah user yang akan dihapus adalah admin
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }

    // Prevent admin dari menghapus diri sendiri
    if (decoded.id === parseInt(id)) {
      return res.status(403).json({ status: "error", message: "Cannot delete your own admin account" });
    }

    // Hapus user
    await User.destroy({ where: { id } });
    res.status(200).json({ status: "success", message: "User deleted successfully" });

  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // Cari user berdasarkan ID
    const user = await User.findOne({
      where: { id },
      attributes: ['id', 'username', 'role'] // Pilih field yang ingin ditampilkan
    });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found"
      });
    }

    res.status(200).json({
      status: "success",
      data: user
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};


module.exports = {
  getAllUsers,
  postUser,
  deleteUser,
  loginHandler,
  getUserById
};
