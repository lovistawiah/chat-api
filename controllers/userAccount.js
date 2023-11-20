const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/Users");
const { expiryDate, generateSixRandomNumbers } = require("./emailUtils");

// ? signup controller
const signup = async (req, res) => {
  let message = "";
  try {
    let { username, email, password, confirmPassword } = req.body;
    if (!username || !email || !password || !confirmPassword) {
      message = "all fields are required";
      res.status(400).json({ message });
      return;
    }

    if (password !== confirmPassword) {
      message = "passwords do not match";
      res.status(400).json({ message });
      return;
    }

    password = await bcrypt.hash(password, 10);
    const account = { username, email, password, username };
    const user = await User.create(account);

    if (!user) {
      message = "account cannot be created, try again later";
      res.status(400).json({ message });
      return;
    }

    // adding six code to the user info
    const code = generateSixRandomNumbers();
    user.verification.code = code;
    user.verification.expires = expiryDate();

    // ? skipping code verification now
    // sendEmailCode(user.email, code, verifyMessage(code));

    const userId = user._id;
    await user.save();

    message = "ok";
    res.status(200).json({ message, userId });
    return;
  } catch (err) {
    console.log(err);
    let StatusCode = 500;
    message = "Internal Server Error";

    if (err.code == 11000) {
      const errValue = Object.keys(err.keyValue);
      message = `${errValue} already exists`;
      StatusCode = 400;
    }
    res.status(StatusCode).json({ message });
  }
};

const verifyEmail = async (req, res) => {
  try {
    let message = "";
    const { id, code } = req.body;
    const user = await User.findOne({ _id: id });
    if (!user) return;

    const expiryDate = new Date(user.verification.expires);
    const date = new Date();
    if (date === expiryDate) {
      res.status(400).json({
        message: "verification code is expired, request for new code",
      });
      return;
    }

    const userCode = user.verification.code;
    if (code !== userCode) {
      message = "code is invalid";
      res.status(400).json({ message });
      return;
    }

    user.verification.verified = true;
    user.verification.expires = "";
    await user.save(true);

    message = "ok";
    res.status(202).json({ message });
    return;
  } catch (err) {
    const message = err.message;
    res.status(500).json({ message });
  }
};

//? login controller
const login = async (req, res) => {
  let message = "";
  let verifiedMessage = true;
  try {
    const { usernameEmail, password } = req.body;
    if (!usernameEmail || !password) {
      message = "username, email or password required";
      res.status(400).json({ message });
      return;
    }
    const user = await User.findOne({
      $or: [{ username: usernameEmail }, { email: usernameEmail }],
    });
    // handle if no user exists
    if (!user) {
      message = `${usernameEmail} does not exist`;
      res.status(400).json({ message });
      return;
    }

    const comparePassword = await bcrypt.compare(password, user.password);
    if (!comparePassword) {
      message = "incorrect password";
      res.status(400).json({ message });
      return;
    }
    const token = jwt.sign(
      { userInfo: { userId: user._id, username: user.username } },
      process.env.JWT_SECRET,
      {
        expiresIn: "30d",
      }
    );
    if (!user.verification.verified) {
      verifiedMessage = false;
    }
    res.cookie("authToken", token, { httpOnly: true, secure: true });
    res.status(200).json({ message: "ok", token });
    return;
  } catch (err) {
    console.log(err);
    message = "Internal Server Error";
    res.status(500).json({ message });
  }
};

const userInfo = async (req, res) => {
  try {
    let message = "";
    const userId = req.user.userId;
    const userDetails = await User.findById(userId).select("username,bio");
    message = "ok";
    res.status(200).json({ userDetails, message });
  } catch (err) {
    console.log(err);
  }
};

const requestNewCode = async (req, res) => {
  let message = "";
  const { id } = req.body;
  if (!id) {
    message = "user identification does not exist";
    res.status(400).json({ message });
    return;
  }
  const user = await User.findOne({ _id: id });

  if (!user) {
    res.status(400).json({ message: "user does not exist" });
    return;
  }
  const newCode = generateSixRandomNumbers();
  user.verification.code = newCode;
  user.verification.expires = expiryDate();
  sendEmailCode(
    process.env.GMAIL_CLIENT,
    user.email,
    newCode,
    verifyMessage(newCode)
  );
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({});
    res.status(200).json({ users });
  } catch (e) {
    console.log(e);
  }
};

module.exports = {
  login,
  signup,
  userInfo,
  getAllUsers,
  verifyEmail,
  requestNewCode,
};
