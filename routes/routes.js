const router = require("express").Router();
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const { signup, login } = require("../controllers/userAccount");
const { updateProfilePic } = require("../utils/modifyProfilePic");
router.route("/signup").post(signup);
router.route("/login").post(login);
router.route("/profile-pic").post(upload.single("image"), updateProfilePic);

module.exports = router;
