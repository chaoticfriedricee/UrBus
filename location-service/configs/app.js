'use strict'

import http from 'http';
import { Server } from 'socket.io';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import engine from 'ejs-mate';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { corsOptions } from './cors.configuration.js';
import { helmetOptions } from './helmet.configuration.js';
import { requestLimit } from './rateLimit.configuration.js';
import { errorHandler } from '../middlewares/handle-errors.js';
import { registerLocationSocket } from '../src/location/location.socket.js';

const BASE_PATH = '/urbus/v1';
const swaggerDoc = parse(readFileSync('./swagger.yaml', 'utf8'));

const middlewares = (app) => {
    app.use(express.urlencoded({ extended: false, limit: '10mb' }));
    app.use(express.json({ limit: '10mb' }));
    app.use(cors(corsOptions));
    app.use(morgan('dev'));
    app.use(helmet(helmetOptions));
    app.use(requestLimit);
    app.engine('ejs', engine);
    app.set('view engine', 'ejs');
    app.set('views', './src/views');
    app.use(`${BASE_PATH}`, express.static('./src/public'));
};

const routes = (app) => {
    app.get(`${BASE_PATH}/health`, (req, res) => {
        res.status(200).json({
            status: 'healthy',
            service: 'UrBus Location Service'
        });
    });

    app.get(`${BASE_PATH}/`, (req, res) => {
        res.render('index');
    });
};

// Separado de initServer para poder montar el servidor en las pruebas sin abrir el puerto real
export const createServer = (socketOptions) => {
    const app = express();
    app.set('trust proxy', 1);

    app.use(`${BASE_PATH}/swagger`, swaggerUi.serve, swaggerUi.setup(swaggerDoc));
    middlewares(app);
    routes(app);
    app.use(errorHandler);

    const server = http.createServer(app);
    const io = new Server(server, { cors: { origin: "*" } });
    registerLocationSocket(io, socketOptions);

    return { app, server, io };
};

export const initServer = async () => {
    const PORT = process.env.PORT;

    try {
        const { server } = createServer();

        server.listen(PORT, () => {
            console.log(`UrBus Location Service running on port: ${PORT}`);
            console.log(`Health Check: http://localhost:${PORT}${BASE_PATH}/health`);
            console.log(`Documentation Check: http://localhost:${PORT}${BASE_PATH}/swagger`);
        });

    } catch (err) {
        console.error(`Error al iniciar el servidor: ${err.message}`);
        process.exit(1);
    }
};