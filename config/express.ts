import express, { Request, Response } from 'express';
import helmet from 'helmet';
import bodyParser from 'body-parser';

import { configureApp } from '@utilities/bootstrap';

const app = express();

configureApp({
    app,
    suffix: '/api/v1',
    routes: [],
    middlewares: [
        helmet(),
        bodyParser.json(),
        bodyParser.urlencoded({ extended: true })
    ]
});

app.all('*', (req: Request, res: Response): void => {
    const { CLIENT_APP_HOST } = process.env;
    if(req.path.startsWith('/api/v1/') || !CLIENT_APP_HOST){
        res.status(404).json({
            status: 'error',
            data: {
                message: 'INVALID_API_REQUEST',
                url: req.originalUrl
            }
        });
        return;
    }
    res.redirect(CLIENT_APP_HOST);
});

export default app;