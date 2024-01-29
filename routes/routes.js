const router = require("express").Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const {
    signup,
    login,
    updateUserAvatar,
    updateUserInfo,
} = require("../controllers/userAccount");
router.route("/signup").post(signup);
router.route("/login").post(login);
router.route("/update-profile").post(upload.single("image"), updateUserAvatar);
router.route("/update-user").patch(updateUserInfo);

module.exports = router;
