'use strict'

import { Schema, model } from 'mongoose';

// Configuración general del servicio editable por un administrador (clave/valor).
// Si una clave no existe se usa el valor por defecto definido en el código.
const settingSchema = new Schema(
{
    key: {
        type: String,
        required: true,
        unique: true
    },

    value: {
        type: Schema.Types.Mixed,
        required: true
    }

},
{
    timestamps: true,
    versionKey: false
});

export default model('Setting', settingSchema);
