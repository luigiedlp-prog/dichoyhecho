import { DAY, E, J, lim, log, primeraDisp } from '../comun.js';
import { activar } from '../avisos.js';

// Potenciaciones gratuitas: destacar un pedido (72 hs) o alertas inmediatas (7 días). No se cobra nada.
// Hoy se consiguen con la primera de cada cuenta y las ganadas por invitar. Los anuncios recompensados
// (pendientes) van a sumar acá otra fuente, siempre validada desde el servidor.
export default async function potenciaciones(C) {
  const { D, b, cli, ctx, env, m, me, now, p, pedirPerfil, q, tra } = C;
  if (p[0] === 'potenciar' && m === 'POST') {
    const tp = b.tipo;
    if (!['destacado', 'alertas'].includes(tp)) return E('Pedido inválido');
    const pf = await pedirPerfil();
    if (pf) return pf;
    let pid = 0,
      tit = '';
    if (tp === 'alertas') {
      if (!tra) return E('Las alertas son para trabajadores', 403);
    } else {
      if (!cli) return E('Solo quien publica puede destacar un pedido', 403);
      const c = await q('SELECT id,titulo,estado,vence,cliente_id FROM pedidos WHERE id=?', +b.pedido_id).first();
      if (!c || c.cliente_id !== me.id) return E('No es tu pedido', 403);
      if (c.estado !== 'abierta' || c.vence < now) return E('Solo se pueden destacar pedidos abiertos');
      pid = c.id;
      tit = c.titulo;
    }
    if (await lim(D, 'pot:' + me.id, 10, DAY, now)) return E('Hiciste muchos intentos hoy. Probá mañana.', 429);
    const pri = await primeraDisp(D, me.id);
    let cr = false;
    if (!pri && (me.promos || 0) > 0) {
      const d = await q('UPDATE usuarios SET promos=promos-1 WHERE id=? AND promos>0', me.id).run();
      cr = !!(d.meta && d.meta.changes);
    }
    if (!pri && !cr)
      return E('No tenés potenciaciones disponibles. Podés ganar una invitando a otras personas.', 403);
    const g = await q(
        'INSERT INTO activaciones(usuario_id,tipo,pedido_id,precio,creado) VALUES(?,?,?,0,?)',
        me.id,
        tp,
        pid,
        now,
      ).run(),
      a = { id: g.meta.last_row_id, usuario_id: me.id, tipo: tp, pedido_id: pid, precio: 0 };
    const er = await activar(env, ctx, a, now);
    if (er) {
      await q('DELETE FROM activaciones WHERE id=?', a.id).run();
      if (cr) await q('UPDATE usuarios SET promos=promos+1 WHERE id=?', me.id).run();
      return E(er);
    }
    await log(
      D,
      'potenciacion',
      'Potenciación gratis (' +
        (pri ? 'primera' : 'por invitados') +
        ') #' +
        a.id +
        ' de ' +
        tp +
        ' de ' +
        me.nombre.slice(0, 30),
    );
    return J({ id: a.id, gratis: 1, titulo: tit });
  }
}
