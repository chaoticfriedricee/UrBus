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
import itineraryRoutes from '../src/itinerary/itinerary.routes.js';
import { registerItinerarySocket } from '../src/itinerary/itinerary.socket.js';
import { fetchGroupAccess } from '../src/itinerary/itinerary.auth.js';
import { closeDbConnection, dbConnection } from './db.js';

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
        res.render('index', {
            mapStyleUrl: process.env.MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty',
        });
    });

    app.use(`${BASE_PATH}`, itineraryRoutes);
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
    app.locals.io = io;
    app.locals.getGroupAccess = socketOptions?.getAccess ?? fetchGroupAccess;
    const socketLifecycle = registerItinerarySocket(io, socketOptions);
    io.on('close', socketLifecycle.dispose);

    return { app, server, io };
};

export const initServer = async () => {
      try {
          await dbConnection();
          const PORT = Number(process.env.PORT) || 3033;
        const { server } = createServer();

        server.listen(PORT, () => {
            console.log(`UrBus Location Service running on port: ${PORT}`);
            console.log(`Health Check: http://localhost:${PORT}${BASE_PATH}/health`);
            console.log(`Documentation Check: http://localhost:${PORT}${BASE_PATH}/swagger`);
        });

    } catch (err) {
        console.error(`Error al iniciar el servidor: ${err.message}`);
          await closeDbConnection();
          process.exit(1);
      }
};