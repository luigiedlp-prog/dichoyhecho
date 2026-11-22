import { E, NOM, PURGA, REF_MAX, REF_N, aj, log, sha } from '../comun.js';
import { avisar } from '../avisos.js';

export async function autenticar(C) {
  const { D, ctx, env, now, p, q, req } = C;
  const tk = (req.headers.get('authorization') || '').slice(7);
  const me =
    tk &&
    (await q(
      'SELECT u.* FROM sesiones s JOIN usuarios u ON u.id=s.usuario_id WHERE s.token=? AND s.vence>?',
      await sha(tk),
      now,
    ).first());
  if (!me || me.suspendido) return E('Iniciá sesión', 401);
  const telPend = me.tel_ok === 0 && (await aj(D, 'tel_on', 0)) === 1; // cuenta nueva que todavía no confirmó el código de WhatsApp
  if (telPend && !['yo', 'tel-codigo', 'tel-nuevo'].includes(p[0])) return E('Falta confirmar tu teléfono', 403);
  const cli = me.tipo === 'cliente',
    tra = !cli;
  // Perfil mínimo: solo el nombre y apellido. Foto, barrio y rubros son opcionales (sin foto se ve el avatar genérico; sin rubro queda "Otros").
  const falta = async (u = me) => {
    const f = [];
    if (!NOM(u.nombre)) f.push('nombre');
    return f;
  };
  const pedirPerfil = async () => {
    const f = await falta();
    return f.length
      ? E(
          'Completá tu perfil para seguir (' +
            f.map((x) => (x === 'foto' ? 'foto de perfil' : x === 'nombre' ? 'nombre y apellido' : x)).join(', ') +
            ').',
          403,
        )
      : null;
  };
  // Referidos: un invitado cuenta cuando completa su perfil. Cada REF_N invitados, quien invitó gana una promoción gratis.
  const refRev = async () => {
    const u = await q('SELECT * FROM usuarios WHERE id=?', me.id).first();
    if (!u || !u.ref_por || u.ref_ok || (await falta(u)).length) return;
    // cuenta recién cuando hizo algo real: publicó un pedido o se postuló a uno (con perfil completo)
    if (
      !(await q(
        'SELECT 1 x FROM pedidos WHERE cliente_id=? UNION ALL SELECT 1 FROM postulaciones WHERE trabajador_id=? LIMIT 1',
        me.id,
        me.id,
      ).first())
    )
      return;
    const w = await q('UPDATE usuarios SET ref_ok=1 WHERE id=? AND ref_ok=0', me.id).run();
    if (!(w.meta && w.meta.changes)) return;
    const inv = await q('SELECT id,ref_prem FROM usuarios WHERE id=?', u.ref_por).first();
    if (!inv || inv.ref_prem >= REF_MAX) return;
    const n = (await q('SELECT COUNT(*) n FROM usuarios WHERE ref_por=? AND ref_ok=1 AND suspendido=0', inv.id).first())
      .n;
    if (Math.floor(n / REF_N) > inv.ref_prem) {
      const g = await q(
        'UPDATE usuarios SET promos=promos+1,ref_prem=ref_prem+1 WHERE id=? AND ref_prem=?',
        inv.id,
        inv.ref_prem,
      ).run();
      if (!(g.meta && g.meta.changes)) return;
      await log(
        D,
        'referido',
        'Potenciación regalada por ' +
          n +
          ' invitados (usuario #' +
          inv.id +
          ', premio ' +
          (inv.ref_prem + 1) +
          ' de ' +
          REF_MAX +
          ')',
      );
      ctx.waitUntil(
        avisar(env, [
          [
            inv.id,
            'Ya se sumaron ' +
              n +
              ' personas con tu link: te regalamos una potenciación gratis. Usala desde Perfil o desde tus pedidos.' +
              (inv.ref_prem + 1 >= REF_MAX ? ' Llegaste al máximo de potenciaciones por invitar.' : ''),
          ],
        ]),
      );
    } else {
      ctx.waitUntil(
        avisar(env, [
          [
            inv.id,
            'Alguien se unió con tu link y empezó a usar Dicho y Hecho. Llevás ' +
              (n % REF_N) +
              ' de ' +
              REF_N +
              ' para tu potenciación gratis.',
          ],
        ]),
      );
    }
  };
  const vencer = async () => {
    const r = await q("UPDATE pedidos SET estado='vencida' WHERE estado='abierta' AND vence<?", now).run();
    if (r.meta && r.meta.changes) await D.prepare(PURGA).run();
  };

  Object.assign(C, { tk, me, telPend, cli, tra, falta, pedirPerfil, refRev, vencer });
  return null;
}
