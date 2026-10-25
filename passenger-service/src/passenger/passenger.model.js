'use strict'

import { Schema, model } from 'mongoose';

const passengerSchema = new Schema(
{
    name: {
        type: String,
        required: true
    },

    userId: {
        type: String,
        required: true
    },

    status: {
        type: String,
        enum: ['PRESENT','AUSENT'],
        default: 'AUSENT'
    },

    absenceReason: {
        type: String,
        enum: ['SALUD', 'EMERGENCIA', 'EXTRACURRICULAR', 'OTRO', null],
        default: null
    },

    absenceReasonNote: {
        type: String,
        default: null
    },

    absenceReasonAt: {
        type: Date,
        default: null
    },

    isActive: {
        type: Boolean,
        default: true
    },

    groupId: {
        type: Schema.Types.ObjectId,
        ref: 'Group',
        default: null
    }

},
{
    timestamps: true,
    versionKey: false
});

// Una cuenta solo puede tener un perfil de pasajero activo y, por lo tanto,
// una sola membresía de grupo (groupId) a la vez
passengerSchema.index(
    { userId: 1 },
    { unique: true, partialFilterExpression: { isActive: true } }
);
passengerSchema.index({ groupId: 1 });

export default model('Passenger', passengerSchema);