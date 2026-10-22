'use strict';

import Post from './post.model.js';

const getRole = (req) => {
    return req.user.role;
};

const isAdmin = (req) => getRole(req) === 'ADMIN_ROLE';
const isDriver = (req) => getRole(req) === 'DRIVER_ROLE';

// Solo un admin o el conductor que creó el post pueden modificarlo
const canModify = (req, post) =>
    isAdmin(req) || (isDriver(req) && post.createdBy === req.user.id);

export const createPost = async (req, res) => {
    try {

        const role = getRole(req);

        if (!(role === 'ADMIN_ROLE' || role === 'DRIVER_ROLE')) {
            return res.status(403).json({
                message: 'No autorizado para crear posts'
            });
        }

        const { title, content, isUrgent } = req.body;

        const post = new Post({
            title,
            content,
            isUrgent: isUrgent === true || isUrgent === 'true',
            createdBy: req.user.id
        });

        if (req.file) {
            post.imageUrl = req.file.path;
            post.imagePublicId = req.file.filename;
        }

        await post.save();

        res.status(201).json({
            message: 'Post creado',
            post
        });

    } catch (err) {
        res.status(500).json({
            message: 'Error creando post',
            error: err.message
        });
    }
};

export const getPosts = async (req, res) => {
    try {

        const role = getRole(req);

        let posts;

        if (role === 'ADMIN_ROLE') {
            posts = await Post.find().sort({ createdAt: -1 });
        } else {
            posts = await Post.find({
                isDeleted: false
            }).sort({ createdAt: -1 });
        }

        res.json(posts);

    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: 'Error obteniendo posts',
            error: err.message
        });
    }
};

export const getMyPosts = async (req, res) => {
    try {

        const posts = await Post.find({
            createdBy: req.user.id
        }).sort({ createdAt: -1 });

        res.json(posts);

    } catch (err) {
        res.status(500).json({
            message: 'Error obteniendo tus posts',
            error: err.message
        });
    }
};

export const getPostById = async (req, res) => {
    try {

        const role = getRole(req);

        let post;

        if (role === 'ADMIN_ROLE') {
            post = await Post.findById(req.params.id);
        } else {
            post = await Post.findOne({
                _id: req.params.id,
                isDeleted: false
            });
        }

        if (!post) {
            return res.status(404).json({
                message: 'Post no encontrado'
            });
        }

        res.json(post);

    } catch (err) {
        res.status(500).json({
            message: 'Error obteniendo post',
            error: err.message
        });
    }
};

export const updatePost = async (req, res) => {
    try {

        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({
                message: 'Post no encontrado'
            });
        }

        if (!canModify(req, post)) {
            return res.status(403).json({
                message: 'Solo puedes editar tus propios posts'
            });
        }

        const data = {
            title: req.body.title ?? post.title,
            content: req.body.content ?? post.content
        };

        if (req.body.isUrgent !== undefined) {
            data.isUrgent = req.body.isUrgent === true || req.body.isUrgent === 'true';
        }

        if (req.file) {
            data.imageUrl = req.file.path;
            data.imagePublicId = req.file.filename;
        }

        const updatedPost = await Post.findByIdAndUpdate(
            req.params.id,
            data,
            { new: true }
        );

        res.json({
            message: 'Post actualizado',
            post: updatedPost
        });

    } catch (err) {
        res.status(500).json({
            message: 'Error actualizando post',
            error: err.message
        });
    }
};

export const deletePost = async (req, res) => {
    try {

        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({
                message: 'Post no encontrado'
            });
        }

        if (!canModify(req, post)) {
            return res.status(403).json({
                message: 'Solo puedes eliminar tus propios posts'
            });
        }

        await Post.findByIdAndUpdate(req.params.id, {
            isDeleted: true
        });

        res.json({
            message: 'Post eliminado (soft delete)'
        });

    } catch (err) {
        res.status(500).json({
            message: 'Error eliminando post',
            error: err.message
        });
    }
};

export const reactivatePost = async (req, res) => {
    try {

        if (!isAdmin(req)) {
            return res.status(403).json({
                message: 'Solo admin puede reactivar posts'
            });
        }

        const post = await Post.findByIdAndUpdate(
            req.params.id,
            { isDeleted: false },
            { new: true }
        );

        res.json({
            message: 'Post reactivado',
            post
        });

    } catch (err) {
        res.status(500).json({
            message: 'Error reactivando post',
            error: err.message
        });
    }
};