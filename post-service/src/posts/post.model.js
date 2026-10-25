'use strict';

import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String
    },
    imagePublicId: {
        type: String
    },
    isUrgent: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: String,
        required: true
    },
    // Grupo de passenger-service al que va dirigido. null = aviso general (visible para todos)
    groupId: {
        type: String,
        default: null,
        index: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

postSchema.methods.toJSON = function () {
    const { __v, ...post } = this.toObject();
    return post;
};

export default mongoose.model('Post', postSchema);