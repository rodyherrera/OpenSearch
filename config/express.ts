import express, { Request, Response } from 'express';
import helmet from 'helmet';
import bodyParser from 'body-parser';

import { configureApp } from '@utilities/bootstrap';

const app = express();

configureApp({
    app,
    suffix: '/api/v1/',
    routes: [
        'website',
        'suggest'
    ],
    middlewares: [
        helmet(),
        bodyParser.json(),
        bodyParser.urlencoded({ extended: true })
    ]
});

export default app;