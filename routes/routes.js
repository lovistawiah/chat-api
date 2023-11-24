const router = require("express").Router();
const {
  signup,
  login,
} = require("../controllers/userAccount");

router.route("/signup").post(signup);
router.route("/login").post(login);


module.exports = router;
