const router = require("express").Router();
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const { signup, login, updateUserAvatar } = require("../controllers/userAccount");
const { authenticateUser } = require("../Middleware/userAuth");
router.route("/signup").post(signup);
router.route("/login").post(login);
router
  .route("/update-profile")
  .post(upload.single("image"), authenticateUser, updateUserAvatar);

module.exports = router;
