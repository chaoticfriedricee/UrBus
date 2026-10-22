import { Router } from 'express';

import {
  createPassenger,
  getPassengers,
  getMyPassenger,
  updatePassenger,
  updatePassengerStatus,
  setAbsenceReason,
  clearAbsenceReason,
  deletePassenger
} from './passenger.controller.js';

import { validateJWT } from '../../middlewares/validate-JWT.js';

const router = Router();

router.post(
  '/',
  validateJWT,
  createPassenger
);

router.get(
  '/',
  validateJWT,
  getPassengers
);

router.get(
  '/me',
  validateJWT,
  getMyPassenger
);

router.put(
  '/:id',
  validateJWT,
  updatePassenger
);

router.patch(
  '/:id/status',
  validateJWT,
  updatePassengerStatus
);

router.put(
  '/:id/absence-reason',
  validateJWT,
  setAbsenceReason
);

router.delete(
  '/:id/absence-reason',
  validateJWT,
  clearAbsenceReason
);

router.delete(
  '/:id',
  validateJWT,
  deletePassenger
);

export default router;