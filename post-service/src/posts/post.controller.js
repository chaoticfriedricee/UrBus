'use strict';

import Post from './post.model.js';
import { readableGroupIds } from './group-access.js';
import { deleteImageFromCloudinary } from './post.service.js';

const getRole = (req) => {
    return req.user.role;
};

const isAdmin = (req) => getRole(req) === 'ADMIN_ROLE';
const isDriver = (req) => getRole(req) === 'DRIVER_ROLE';

// Errores de datos del cliente (validación, ID mal formado) -> 400, el resto -> 500
const sendError = (res, err, message) => {
    if (err.name === 'ValidationError' || err.name === 'CastError') {
        return res.status(400).json({
            message: err.name === 'CastError' ? 'ID de post inválido' : message,
            error: err.message
        });
    }

    console.error(err);
    return res.status(500).json({
        message,
        error: err.message
    });
};

// Solo un admin o el conductor que creó el post pueden modificarlo
const canModify = (req, post) =>
    isAdmin(req) || (isDriver(req) && post.createdBy === req.user.id);

const OBJECT_ID = /^[a-f0-9]{24}$/i;

// undefined = no se envió; "", "null" o null = aviso general
const parseGroupId = (value) => {
    if (value === undefined) return undefined;
    if (value === null || value === '' || value === 'null') return null;
    return String(value).trim();
};

// Un conductor solo publica en sus propios grupos; el admin en cualquiera
const groupPublishError = (req, groupId) => {
    if (groupId === null) return null;
    if (!OBJECT_ID.test(groupId)) return { status: 400, message: 'groupId inválido' };
    if (isAdmin(req)) return null;
    if (!req.groupAccessAvailable) {
        return { status: 503, message: 'No se pudo verificar el grupo, intenta de nuevo' };
    }
    if (!req.groupAccess.ownedGroupIds.includes(groupId)) {
        return { status: 403, message: 'Solo puedes publicar en tus propios grupos' };
    }
    return null;
};

// Avisos generales + los de los grupos del usuario. El admin ve todo (incluso eliminados)
const visibilityFilter = (req) => {
    if (isAdmin(req)) return {};
    return {
        isDeleted: false,
        $or: [
            { groupId: null },
            { groupId: { $in: readableGroupIds(req.groupAccess) } }
        ]
    };
};

// La imagen ya se subió (multer corre antes del controlador): si se rechaza el post, se borra
const discardUpload = (req) => {
    if (req.file?.filename) {
        deleteImageFromCloudinary(req.file.filename).catch((err) => console.error(err));
    }
};

export const createPost = async (req, res) => {
    try {

        const role = getRole(req);

        if (!(role === 'ADMIN_ROLE' || role === 'DRIVER_ROLE')) {
            discardUpload(req);
            return res.status(403).json({
                message: 'No autorizado para crear posts'
            });
        }

        const { title, content, isUrgent } = req.body;
        const groupId = parseGroupId(req.body.groupId) ?? null;
        const groupError = groupPublishError(req, groupId);

        if (groupError) {
            discardUpload(req);
            return res.status(groupError.status).json({ message: groupError.message });
        }

        const post = new Post({
            title,
            content,
            isUrgent: isUrgent === true || isUrgent === 'true',
            createdBy: req.user.id,
            groupId
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
        sendError(res, err, 'Error creando post');
    }
};

export const getPosts = async (req, res) => {
    try {

        const filter = visibilityFilter(req);
        const groupId = parseGroupId(req.query.groupId);

        // ?groupId=... filtra por grupo; cambiar el parámetro no da acceso a grupos ajenos
        if (groupId !== undefined) {
            if (groupId !== null && !isAdmin(req) && !readableGroupIds(req.groupAccess).includes(groupId)) {
                return res.status(403).json({
                    message: 'No tienes acceso a las publicaciones de este grupo'
                });
            }
            filter.groupId = groupId;
        }

        const posts = await Post.find(filter).sort({ createdAt: -1 });

        res.json(posts);

    } catch (err) {
        sendError(res, err, 'Error obteniendo posts');
    }
};

export const getMyPosts = async (req, res) => {
    try {

        const posts = await Post.find({
            createdBy: req.user.id
        }).sort({ createdAt: -1 });

        res.json(posts);

    } catch (err) {
        sendError(res, err, 'Error obteniendo tus posts');
    }
};

export const getPostById = async (req, res) => {
    try {

        // Un post de otro grupo responde 404, igual que uno inexistente
        const post = await Post.findOne({
            _id: req.params.id,
            ...visibilityFilter(req)
        });

        if (!post) {
            return res.status(404).json({
                message: 'Post no encontrado'
            });
        }

        res.json(post);

    } catch (err) {
        sendError(res, err, 'Error obteniendo post');
    }
};

export const updatePost = async (req, res) => {
    try {

        const post = await Post.findById(req.params.id);

        if (!post) {
            discardUpload(req);
            return res.status(404).json({
                message: 'Post no encontrado'
            });
        }

        if (!canModify(req, post)) {
            discardUpload(req);
            return res.status(403).json({
                message: 'Solo puedes editar tus propios posts'
            });
        }

        const data = {
            title: req.body.title ?? post.title,
            content: req.body.content ?? post.content
        };

        const groupId = parseGroupId(req.body.groupId);

        if (groupId !== undefined) {
            const groupError = groupPublishError(req, groupId);

            if (groupError) {
                discardUpload(req);
                return res.status(groupError.status).json({ message: groupError.message });
            }

            data.groupId = groupId;
        }

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
        sendError(res, err, 'Error actualizando post');
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
        sendError(res, err, 'Error eliminando post');
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

        if (!post) {
            return res.status(404).json({
                message: 'Post no encontrado'
            });
        }

        res.json({
            message: 'Post reactivado',
            post
        });

    } catch (err) {
        sendError(res, err, 'Error reactivando post');
    }
};