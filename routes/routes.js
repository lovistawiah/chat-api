const router = require("express").Router();
const {
    signup,
    login,
    updateUserInfo,
    userSettings,
} = require("../controllers/userAccount");

router.route("/signup").post(signup);
router.route("/login").post(login);
router.route("/user-settings").patch(userSettings);
router.route("/update-user").patch(updateUserInfo);

module.exports = router;
