const router = require("express").Router();
const {
  signup,
  login,
  getAllUsers,
  verifyEmail,
  requestNewCode,
} = require("../controllers/userAccount");

router.route("/signup").post(signup);
router.route("/login").post(login);
router.route("/verify").post(verifyEmail);
router.route("/users").get(getAllUsers);
router.route("re-verify").post(requestNewCode)

module.exports = router;
