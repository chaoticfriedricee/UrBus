'use strict'

import { Schema, model } from 'mongoose';

const groupSchema = new Schema(
{
    name: {
        type: String,
        required: true
    },

    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },

    driverId: {
        type: String,
        required: true
    },

    isActive: {
        type: Boolean,
        default: true
    }

},
{
    timestamps: true,
    versionKey: false
});

export default model('Group', groupSchema);
