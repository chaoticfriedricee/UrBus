import mongoose from 'mongoose';

const coordinateSchema = new mongoose.Schema({
  lat: { type: Number, required: true, min: -90, max: 90 },
  lng: { type: Number, required: true, min: -180, max: 180 },
}, { _id: false });

const routeSchema = new mongoose.Schema({
  groupId: { type: String, required: true, unique: true },
  driverId: { type: String, default: null },
  destination: { type: coordinateSchema, required: true },
}, { timestamps: true });

const tripSchema = new mongoose.Schema({
  tripId: { type: String, required: true, unique: true },
  groupId: { type: String, required: true, index: true },
  driverId: { type: String, required: true },
  vehicleId: { type: String, default: null },
  origin: { type: coordinateSchema, required: true },
  destination: { type: coordinateSchema, required: true },
  geometry: { type: mongoose.Schema.Types.Mixed, required: true },
  distance: { type: Number, required: true },
  duration: { type: Number, required: true },
  currentLocation: { type: coordinateSchema, default: null },
  lastLocationAt: { type: Date, default: null },
  lastLocationTimestamp: { type: Number, default: null },
  gpsStatus: { type: String, enum: ['ESPERANDO_GPS', 'CONECTADO', 'DESCONECTADO'], default: 'ESPERANDO_GPS' },
  arrivalFixes: { type: Number, default: 0 },
  lastArrivalTimestamp: { type: Number, default: null },
  lastRerouteAt: { type: Date, default: null },
  track: {
    type: [{
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      timestamp: { type: Number, required: true },
    }],
    default: [],
  },
  status: { type: String, enum: ['PENDIENTE', 'EN_CURSO', 'COMPLETADO', 'INTERRUMPIDO'], required: true },
  startedAt: { type: Date, required: true },
  endedAt: { type: Date, default: null },
}, { timestamps: true });

tripSchema.index(
  { groupId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'EN_CURSO' } },
);

export const ItineraryRoute = mongoose.models.ItineraryRoute
  || mongoose.model('ItineraryRoute', routeSchema);
export const ItineraryTrip = mongoose.models.ItineraryTrip
  || mongoose.model('ItineraryTrip', tripSchema);
