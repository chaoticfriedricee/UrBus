'use strict'

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { dbConnection } from './db.js';
import { corsOptions } from './cors.configuration.js';
import { helmetOptions } from './helmet.configuration.js';
import { requestLimit } from './rateLimit.configuration.js';
import { errorHandler } from '../middlewares/handle-errors.js';
import passengerRoutes from '../src/passenger/passenger.routes.js';
import groupRoutes from '../src/group/group.routes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_PATH = '/urbus/v1';
const swaggerDoc = parse(readFileSync(join(__dirname, '../swagger.yaml'), 'utf8'));

const middlewares = (app) => {
    app.use(express.urlencoded({ extended: false, limit: '10mb' }));
    app.use(express.json({ limit: '10mb' }));
    app.use(cors(corsOptions));
    app.use(morgan('dev'));
    app.use(helmet(helmetOptions));
    app.use(requestLimit);
};

const routes = (app) => {
    app.get(`${BASE_PATH}/health`, (req, res) => {
        res.status(200).json({
            status: 'healthy',
            service: 'Passenger Service'
        });
    });

    app.use(`${BASE_PATH}/passengers`, passengerRoutes);
    app.use(`${BASE_PATH}/groups`, groupRoutes);
};

export const initServer = async () => {
    const app = express();
    const PORT = process.env.PORT;
    app.set('trust proxy', 1);

    try {
        await dbConnection();
        middlewares(app);
        routes(app);
        app.use(`${BASE_PATH}/swagger`, swaggerUi.serve, swaggerUi.setup(swaggerDoc));
        app.use(errorHandler);

        app.listen(PORT, () => {
            console.log(`Passenger Server running on port: ${PORT}`);
            console.log(`Health Check: http://localhost:${PORT}${BASE_PATH}/health`);
            console.log(`Swagger: http://localhost:${PORT}${BASE_PATH}/swagger`);
        });

    } catch (err) {
        console.error(`Error al iniciar el servidor: ${err.message}`);
        process.exit(1);
    }
};