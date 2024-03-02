import { Router } from 'express';

import {
    signup,
    login,
    updateUserInfo,
    userSettings
} from '../controllers/userAccount.js';
const router = Router();

router.route('/signup').post(signup);
router.route('/login').post(login);
router.route('/user-settings').patch(userSettings);
router.route('/update-user').patch(updateUserInfo);

export default router;
