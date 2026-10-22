'use strict';

import { Router } from 'express';

import {
    createPost,
    getPosts,
    getPostById,
    getMyPosts,
    updatePost,
    deletePost,
    reactivatePost
} from './post.controller.js';

import { validateJWT } from '../../middlewares/validate-JWT.js';
import { uploadFieldImage } from '../../middlewares/file-uploader.js';
import { loadGroupAccess } from './group-access.js';

const router = Router();

router.post(
    '/',
    validateJWT,
    loadGroupAccess,
    uploadFieldImage.single('image'),
    createPost
);

router.get(
    '/',
    validateJWT,
    loadGroupAccess,
    getPosts
);

router.get(
    '/my-posts',
    validateJWT,
    getMyPosts
);

router.get(
    '/:id',
    validateJWT,
    loadGroupAccess,
    getPostById
);

router.put(
    '/:id',
    validateJWT,
    loadGroupAccess,
    uploadFieldImage.single('image'),
    updatePost
);

router.delete(
    '/:id',
    validateJWT,
    deletePost
);

router.patch(
    '/:id/reactivate',
    validateJWT,
    reactivatePost
);

export default router;