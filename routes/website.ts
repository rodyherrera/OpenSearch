import express from 'express';
import * as websiteController from '@controllers/website';
const router = express.Router();

router.get('/', websiteController.getWebsites);

export default router;