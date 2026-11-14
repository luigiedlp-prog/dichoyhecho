import { DAY, E, J } from '../comun.js';
import { avisar } from '../avisos.js';

export default async function postulaciones(C) {
  const { D, ctx, env, m, me, now, p, q, tra, vencer } = C;
  if (p[0] === 'mis-postulaciones') {
    await vencer();
    return J(
      (
        await q(
          "SELECT p.id,p.estado,p.mensaje,p.creado,c.elegida_en,c.hecha_en,c.titulo,c.rubro,c.barrio,c.estado cestado,CASE WHEN p.estado='elegida' THEN cu.telefono END tel,CASE WHEN p.estado='elegida' THEN cu.mail END mail,cu.nombre cliente FROM postulaciones p JOIN pedidos c ON c.id=p.pedido_id JOIN usuarios cu ON cu.id=c.cliente_id WHERE p.trabajador_id=? AND COALESCE(p.oculta,0)=0 ORDER BY p.id DESC LIMIT 50",
          me.id,
        ).all()
      ).results,
    );
  }

  if (p[0] === 'postulaciones' && p[2] === 'retirar' && m === 'POST') {
    const x = await q(
      'SELECT p.*,c.cliente_id,c.estado ce,c.titulo ct FROM postulaciones p JOIN pedidos c ON c.id=p.pedido_id WHERE p.id=? AND p.trabajador_id=?',
      p[1],
      me.id,
    ).first();
    if (!x) return E('No encontrada', 404);
    if (x.ce === 'hecha') return E('El pedido ya está terminado');
    await q('DELETE FROM postulaciones WHERE id=?', x.id).run();
    if (x.estado === 'elegida') {
      await q(
        "UPDATE pedidos SET estado='abierta',vence=?,elegida_en=NULL WHERE id=?",
        now + 7 * DAY,
        x.pedido_id,
      ).run();
      ctx.waitUntil(
        avisar(env, [[x.cliente_id, me.nombre + ' se retiró de «' + x.ct + '» y el pedido volvió a estar abierto.']]),
      );
    }
    return J({ ok: 1 });
  }
  if (p[0] === 'postulaciones' && p[1] === 'limpiar' && m === 'POST') {
    if (!tra) return E('Solo los trabajadores tienen propuestas', 403);
    await vencer();
    await q(
      "UPDATE postulaciones SET oculta=1 WHERE trabajador_id=? AND COALESCE(oculta,0)=0 AND (estado='descartada' OR (estado='activa' AND pedido_id IN (SELECT id FROM pedidos WHERE estado!='abierta')))",
      me.id,
    ).run();
    return J({ ok: 1 });
  }
  if (p[0] === 'postulaciones' && p[2] === 'ocultar' && m === 'POST') {
    const x = await q(
      'SELECT p.*,c.estado ce FROM postulaciones p JOIN pedidos c ON c.id=p.pedido_id WHERE p.id=? AND p.trabajador_id=?',
      p[1],
      me.id,
    ).first();
    if (!x) return E('No encontrada', 404);
    const cerrada =
      x.estado === 'descartada' ||
      (x.estado === 'activa' && x.ce !== 'abierta') ||
      (x.estado === 'elegida' && x.ce === 'hecha');
    if (!cerrada) return E('Esta propuesta sigue en juego. Si ya no querés, retirala.');
    await q('UPDATE postulaciones SET oculta=1 WHERE id=?', x.id).run();
    return J({ ok: 1 });
  }
  if (p[0] === 'postulaciones' && m === 'POST') {
    const x = await q(
      'SELECT p.*,c.cliente_id,c.estado ce,c.titulo ct FROM postulaciones p JOIN pedidos c ON c.id=p.pedido_id WHERE p.id=?',
      p[1],
    ).first();
    if (!x || x.cliente_id !== me.id) return E('No encontrada', 404);
    if (p[2] === 'descartar') {
      if (x.estado === 'descartada') return J({ ok: 1 });
      await q("UPDATE postulaciones SET estado='descartada' WHERE id=?", x.id).run();
      ctx.waitUntil(avisar(env, [[x.trabajador_id, 'El cliente descartó tu propuesta a «' + x.ct + '».']]));
      return J({ ok: 1 });
    }
    if (p[2] === 'elegir') {
      if (x.ce !== 'abierta') return E('El pedido no está abierto');
      await D.batch([
        q("UPDATE postulaciones SET estado='elegida' WHERE id=?", x.id),
        q("UPDATE pedidos SET estado='elegida',elegida_en=? WHERE id=?", now, x.pedido_id),
      ]);
      ctx.waitUntil(
        avisar(env, [
          [
            x.trabajador_id,
            '¡Te eligieron para «' + x.ct + '»! Entrá a Propuestas y escribile al cliente por WhatsApp.',
          ],
        ]),
      );
      return J({ ok: 1 });
    }
  }
}
