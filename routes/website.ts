import express from 'express';
import * as websiteController from '@controllers/website';
const router = express.Router();

router.get('/search', websiteController.search);

export default router;