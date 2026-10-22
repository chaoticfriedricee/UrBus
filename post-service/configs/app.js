'use strict';

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
import { helmetOptions } from './helmet.configuration.js';
import { corsOptions } from './cors.configuration.js';
import { requestLimit } from './rateLimit.configuration.js';
import postRoutes from '../src/posts/post.routes.js';

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
    app.use(`${BASE_PATH}/posts`, postRoutes);

    app.get(`${BASE_PATH}/health`, (req, res) => {
        res.status(200).json({
            status: 'healthy',
            service: 'UrBus Post Service'
        });
    });
};

export const initServer = async () => {
    const app = express();
    const PORT = process.env.PORT || 5001;
    app.set('trust proxy', 1);

    try {
        await dbConnection();
        middlewares(app);
        routes(app);
        app.use(`${BASE_PATH}/swagger`, swaggerUi.serve, swaggerUi.setup(swaggerDoc));

        app.use((req, res) => {
            res.status(404).json({
                success: false,
                message: 'Ruta no encontrada en el servidor.'
            });
        });

        // Errores lanzados por middlewares (p. ej. multer al subir la imagen)
        app.use((err, req, res, next) => {
            const status = err.name === 'MulterError' ? 400 : (err.statusCode || 500);
            if (status === 500) console.error(err);
            res.status(status).json({
                success: false,
                message: status === 500 ? 'Error interno del servidor' : err.message
            });
        });

        app.listen(PORT, () => {
            console.log(`Post Service ejecutándose en puerto: ${PORT}`);
            console.log(`Health: http://localhost:${PORT}${BASE_PATH}/health`);
            console.log(`Swagger: http://localhost:${PORT}${BASE_PATH}/swagger`);
        });

    } catch (err) {
        console.error(`Error iniciando servidor: ${err.message}`);
        process.exit(1);
    }
};