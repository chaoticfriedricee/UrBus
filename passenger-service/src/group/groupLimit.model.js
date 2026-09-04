'use strict'

import { Schema, model } from 'mongoose';

const groupLimitSchema = new Schema(
{
    driverId: {
        type: String,
        required: true,
        unique: true
    },

    maxGroups: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    }

},
{
    timestamps: true,
    versionKey: false
});

export default model('GroupLimit', groupLimitSchema);
