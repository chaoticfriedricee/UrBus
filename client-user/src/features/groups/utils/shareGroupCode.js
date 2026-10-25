// src/features/groups/utils/shareGroupCode.js
// En el teléfono es más útil compartir el código (WhatsApp, SMS...) que copiarlo;
// la hoja de compartir de Android también ofrece "Copiar".
import { Share } from 'react-native';

export const shareGroupCode = (group) =>
  Share.share({
    message: `Únete a mi grupo «${group.name}» en UrBus con el código ${group.code}. `
      + 'Ábrelo en la app, ve a Pasajeros e ingrésalo en «Unirme a un grupo».',
  }).catch(() => {});
