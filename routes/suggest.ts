import express from 'express';
import * as suggestController from '@controllers/suggest';
const router = express.Router();

router.get('/', suggestController.getSuggests);

export default router;