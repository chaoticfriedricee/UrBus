import { Router } from 'express';
import { authorizeGroupItinerary, ensureAuthenticated } from './itinerary.auth.js';
import {
  getItinerary,
  getItineraryHistory,
  getMyItineraryAccess,
  interruptItineraryTrip,
  startItineraryTrip,
  updateItinerary,
} from './itinerary.controller.js';

const router = Router();

router.get('/itineraries/access', ensureAuthenticated, getMyItineraryAccess);
router.get('/itineraries/:groupId', ensureAuthenticated, authorizeGroupItinerary, getItinerary);
router.put('/itineraries/:groupId', ensureAuthenticated, authorizeGroupItinerary, updateItinerary);
router.get('/itineraries/:groupId/trips', ensureAuthenticated, authorizeGroupItinerary, getItineraryHistory);
router.post('/itineraries/:groupId/trips', ensureAuthenticated, authorizeGroupItinerary, startItineraryTrip);
router.post('/itineraries/:groupId/trips/interrupt', ensureAuthenticated, authorizeGroupItinerary, interruptItineraryTrip);

export default router;
