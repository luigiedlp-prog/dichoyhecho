// Uso: node tools/generar-vapid.mjs  -> copiá cada valor como secret del Worker
const k = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
console.log('VAPID_PUBLIC=' + Buffer.from(await crypto.subtle.exportKey('raw', k.publicKey)).toString('base64url'));
console.log('VAPID_PRIVATE=' + JSON.stringify(await crypto.subtle.exportKey('jwk', k.privateKey)));
