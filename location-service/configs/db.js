import mongoose from 'mongoose';
import { ItineraryRoute, ItineraryTrip } from '../src/itinerary/itinerary.models.js';

export const dbConnection = async () => {
  const uri = process.env.URI_MONGODB;
  if (!uri) {
    throw new Error('URI_MONGODB es obligatorio para conservar recorridos entre reinicios.');
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10,
    autoIndex: false,
  });
  await Promise.all([ItineraryRoute.createIndexes(), ItineraryTrip.createIndexes()]);
};

export const closeDbConnection = async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
};
