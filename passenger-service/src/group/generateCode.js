'use strict'

import { randomBytes } from 'crypto';
import Group from './group.model.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

const randomCode = () => {
    const bytes = randomBytes(CODE_LENGTH);
    let code = '';

    for (let i = 0; i < CODE_LENGTH; i++) {
        code += ALPHABET[bytes[i] % ALPHABET.length];
    }

    return code;
};

export const generateUniqueCode = async () => {
    let code;
    let exists = true;

    while (exists) {
        code = randomCode();
        exists = await Group.exists({ code });
    }

    return code;
};

const MAX_CREATE_ATTEMPTS = 5;

// generateUniqueCode comprueba antes de insertar, pero dos peticiones simultáneas
// podrían obtener el mismo código: el índice único lo impide y aquí se reintenta
export const createGroupWithUniqueCode = async (data) => {
    for (let attempt = 1; ; attempt++) {
        const code = await generateUniqueCode();

        try {
            return await Group.create({ ...data, code });
        } catch (err) {
            const isCodeCollision = err.code === 11000 && err.keyPattern?.code;
            if (!isCodeCollision || attempt >= MAX_CREATE_ATTEMPTS) throw err;
        }
    }
};
