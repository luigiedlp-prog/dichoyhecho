import { DAY, E, J, faltan, lim, log } from '../comun.js';
import { avisar } from '../avisos.js';

export default async function interacciones(C) {
  const { D, b, cli, ctx, env, m, me, now, p, pedirPerfil, q } = C;
  // El cliente invita a un trabajador del directorio a postularse a uno de sus pedidos abiertos.
  // El trabajador recibe un aviso; el teléfono sigue sin verse hasta que lo eligen.
  if (p[0] === 'invitar' && m === 'POST') {
    if (!cli) return E('Solo quien publica puede invitar', 403);
    const pf = await pedirPerfil();
    if (pf) return pf;
    const c = await q('SELECT id,titulo,estado,vence,cliente_id FROM pedidos WHERE id=?', +b.pedido_id).first();
    if (!c || c.cliente_id !== me.id) return E('No es tu pedido', 403);
    if (c.estado !== 'abierta' || c.vence < now) return E('Solo podés invitar a un pedido abierto');
    const w = await q(
      "SELECT id,nombre FROM usuarios WHERE id=? AND tipo='trabajador' AND suspendido=0",
      +b.trabajador_id,
    ).first();
    if (!w) return E('Ese trabajador no está disponible');
    if (await q('SELECT 1 x FROM postulaciones WHERE pedido_id=? AND trabajador_id=?', c.id, w.id).first())
      return E('Ya se postuló a este pedido');
    if (await q('SELECT 1 x FROM invitaciones WHERE pedido_id=? AND trabajador_id=?', c.id, w.id).first())
      return E('Ya lo invitaste a este pedido');
    if (await lim(D, 'inv:' + me.id, 10, DAY, now)) return E('Hoy ya mandaste 10 invitaciones. Seguí mañana.', 429);
    await q(
      'INSERT INTO invitaciones(pedido_id,trabajador_id,cliente_id,creado) VALUES(?,?,?,?)',
      c.id,
      w.id,
      me.id,
      now,
    ).run();
    ctx.waitUntil(
      avisar(env, [
        [
          w.id,
          me.nombre.split(' ')[0] + ' te invitó a postularte a «' + c.titulo.slice(0, 60) + '». Lo ves en Pedidos.',
        ],
      ]),
    );
    await log(D, 'invitacion', 'Pedido #' + c.id + ' a ' + w.nombre.slice(0, 30));
    return J({ ok: 1 });
  }
  if (p[0] === 'denunciar' && m === 'POST') {
    if (await lim(D, 'den:' + me.id, 1, DAY, now))
      return E(
        'Estamos revisando tu denuncia anterior. Podés enviar otra en ' +
          (await faltan(D, 'den:' + me.id, DAY, now)) +
          '.',
        429,
      );
    await q(
      'INSERT INTO denuncias(autor_id,tipo,objetivo_id,motivo,creado) VALUES(?,?,?,?,?)',
      me.id,
      b.tipo === 'usuario' ? 'usuario' : 'pedido',
      +b.id || 0,
      String(b.motivo || '').slice(0, 300),
      now,
    ).run();
    await log(
      D,
      'denuncia',
      (b.tipo === 'usuario' ? 'usuario' : 'pedido') + ' #' + (+b.id || 0) + ': ' + String(b.motivo || '').slice(0, 80),
    );
    return J({ ok: 1 });
  }
}
