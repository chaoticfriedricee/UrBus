import { Router } from 'express';

import {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  joinGroup,
  getGroupAccess,
  setGroupLimit,
  resetGroupLimit,
  getGroupLimit,
  getMyGroupLimit,
  getGroupSettings,
  updateGroupSettings
} from './group.controller.js';

import { validateJWT } from '../../middlewares/validate-JWT.js';

const router = Router();

router.post(
  '/',
  validateJWT,
  createGroup
);

router.get(
  '/',
  validateJWT,
  getGroups
);

router.post(
  '/join',
  validateJWT,
  joinGroup
);

router.get(
  '/access',
  validateJWT,
  getGroupAccess
);

router.get(
  '/settings',
  validateJWT,
  getGroupSettings
);

router.put(
  '/settings',
  validateJWT,
  updateGroupSettings
);

router.get(
  '/limit/me',
  validateJWT,
  getMyGroupLimit
);

router.get(
  '/limit/:driverId',
  validateJWT,
  getGroupLimit
);

router.put(
  '/limit/:driverId',
  validateJWT,
  setGroupLimit
);

router.delete(
  '/limit/:driverId',
  validateJWT,
  resetGroupLimit
);

router.get(
  '/:id',
  validateJWT,
  getGroupById
);

router.patch(
  '/:id',
  validateJWT,
  updateGroup
);

router.delete(
  '/:id',
  validateJWT,
  deleteGroup
);

export default router;
