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
    },

    // Eliminado (soft delete): a diferencia de isActive=false, no se lista ni se puede reactivar
    isDeleted: {
        type: Boolean,
        default: false
    }

},
{
    timestamps: true,
    versionKey: false
});

export default model('Group', groupSchema);
