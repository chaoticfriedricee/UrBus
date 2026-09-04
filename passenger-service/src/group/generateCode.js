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
