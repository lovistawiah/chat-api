const router = require("express").Router();
const {
  signup,
  login,
  UpdateProfilePic,
} = require("../controllers/userAccount");

router.route("/signup").post(signup);
router.route("/login").post(login);
router.route("/profile-pic").post(UpdateProfilePic)


module.exports = router;
