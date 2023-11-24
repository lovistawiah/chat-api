const router = require("express").Router();
const {
  signup,
  login,
  getAllUsers,
} = require("../controllers/userAccount");

router.route("/signup").post(signup);
router.route("/login").post(login);
router.route("/users").get(getAllUsers);


module.exports = router;
