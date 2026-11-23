import { DAY, DEMORA, E, J, PAG, RUBROS, aj, faltan, rnd, rubroOtro } from '../comun.js';
import { avisar, notificar } from '../avisos.js';

export default async function pedidos(C) {
  const { D, addF, b, cli, ctx, env, m, me, now, p, pedirPerfil, q, refRev, tra, u, vencer } = C;
  if (p[0] === 'pedidos' && !p[1] && m === 'GET') {
    await vencer();
    const r = u.searchParams.get('rubro') || '',
      ba = u.searchParams.get('barrio') || '',
      mi = u.searchParams.get('mis') === '1' && !r ? 1 : 0,
      mr = me.rubros || '[]';
    const qq = String(u.searchParams.get('q') || '')
        .trim()
        .slice(0, 60)
        .toLowerCase(),
      lk = '%' + qq.replace(/[\\%_]/g, '\\$&') + '%',
      TAIL =
        { nuevos: 'inv DESC,suyo DESC,c.creado DESC', vence: 'c.vence ASC', pocos: 'n ASC,c.creado DESC' }[
          u.searchParams.get('o')
        ] || 'inv DESC,suyo DESC,c.creado DESC';
    const W =
        "c.estado='abierta' AND (?='' OR c.rubro=?) AND (?='' OR c.barrio LIKE ?) AND (?=0 OR c.rubro IN (SELECT value FROM json_each(?))) AND (?='' OR lower(c.titulo) LIKE ? ESCAPE '\\' OR lower(c.descripcion) LIKE ? ESCAPE '\\')",
      WB = [r, r, ba, '%' + ba + '%', mi, mr, qq, lk, lk];
    const tot = (await q('SELECT COUNT(*) n FROM pedidos c WHERE ' + W, ...WB).first()).n,
      pags = Math.max(1, Math.ceil(tot / PAG)),
      pag = Math.min(Math.max(1, Math.floor(+u.searchParams.get('pag')) || 1), pags);
    const items = (
      await q(
        "SELECT c.id,c.titulo,c.rubro,c.rubro_otro,c.descripcion,c.barrio,c.presupuesto,c.creado,(SELECT group_concat(id||'.'||k) FROM pedido_fotos WHERE pedido_id=c.id) fotos,(SELECT COUNT(*) FROM postulaciones WHERE pedido_id=c.id AND estado='activa') n,(SELECT COUNT(*) FROM postulaciones WHERE pedido_id=c.id AND trabajador_id=?) ya,(SELECT COUNT(*) FROM invitaciones WHERE pedido_id=c.id AND trabajador_id=?) inv,(c.rubro IN (SELECT value FROM json_each(?))) suyo,(c.dest_hasta>?) dest,c.cliente_id cid,(SELECT nombre FROM usuarios WHERE id=c.cliente_id) cn,(SELECT k FROM perfil_fotos WHERE usuario_id=c.cliente_id) cfv,COALESCE((SELECT 1 FROM usuarios WHERE id=c.cliente_id AND dni!='' AND direccion!='' AND mail!=''),0) ver,(SELECT pionero FROM usuarios WHERE id=c.cliente_id) pio,(SELECT donador FROM usuarios WHERE id=c.cliente_id) don FROM pedidos c WHERE " +
          W +
          ' ORDER BY (c.dest_hasta>?) DESC,(CASE WHEN c.dest_hasta>? THEN c.dest_desde ELSE 0 END) DESC,' +
          TAIL +
          ' LIMIT ? OFFSET ?',
        me.id,
        me.id,
        mr,
        now,
        ...WB,
        now,
        now,
        PAG,
        (pag - 1) * PAG,
      ).all()
    ).results;
    items.forEach((c) => {
      c.cn = String(c.cn || '').split(' ')[0];
    });
    let cupo = null,
      lo = 0;
    if (tra) {
      lo = await aj(D, 'limite_otros', 3);
      cupo = Math.max(
        0,
        lo -
          (await q('SELECT COUNT(*) n FROM limites WHERE clave=? AND creado>?', 'otros:' + me.id, now - DAY).first()).n,
      );
    }
    return J({ items, tot, pag, pags, cupo, lim: lo });
  }
  if (p[0] === 'pedidos' && !p[1] && m === 'POST') {
    if (!cli) return E('Solo los clientes publican', 403);
    const t = String(b.titulo || '').trim();
    if (t.length < 3 || !RUBROS.includes(b.rubro)) return E('Poné un título y elegí un rubro');
    const pf = await pedirPerfil();
    if (pf) return pf;
    const h = await q('SELECT COUNT(*) n FROM pedidos WHERE cliente_id=? AND creado>?', me.id, now - DAY).first();
    if (h.n >= 5) return E('Llegaste al límite de 5 publicaciones por día');
    const ins = await q(
      'INSERT INTO pedidos(cliente_id,titulo,rubro,rubro_otro,descripcion,barrio,presupuesto,vence,creado,aviso_en,aviso_pend) VALUES(?,?,?,?,?,?,?,?,?,?,1)',
      me.id,
      t.slice(0, 80),
      b.rubro,
      rubroOtro(b.rubro, b.rubro_otro),
      String(b.descripcion || '').slice(0, 1000),
      String(b.barrio || '').slice(0, 40),
      String(b.presupuesto || '')
        .trim()
        .slice(0, 40) || 'A convenir',
      now + 7 * DAY,
      now,
      now + DEMORA,
    ).run();
    await addF(ins.meta.last_row_id, b.fotos);
    await refRev();
    ctx.waitUntil(
      notificar(
        env,
        { id: ins.meta.last_row_id, rubro: b.rubro, rubro_otro: rubroOtro(b.rubro, b.rubro_otro), titulo: t, dest_hasta: 0, aviso_en: now + DEMORA, aviso_pend: 1 },
        now,
      ),
    ); // alertas pagas: ya; el resto, a los 10 min
    return J({ ok: 1 });
  }
  if (p[0] === 'mis-pedidos') {
    await vencer();
    const cs = (
      await q(
        "SELECT c.*,(SELECT group_concat(id||'.'||k) FROM pedido_fotos WHERE pedido_id=c.id) fotos,(SELECT 1 FROM puntuaciones WHERE pedido_id=c.id) punt,(SELECT COUNT(*) FROM invitaciones WHERE pedido_id=c.id) ninv FROM pedidos c WHERE cliente_id=? AND estado!='cancelada' AND COALESCE(oculta,0)=0 ORDER BY id DESC LIMIT 50",
        me.id,
      ).all()
    ).results;
    const ps = (
      await q(
        "SELECT p.id,p.pedido_id,p.mensaje,p.estado,p.creado,u.id tid,(SELECT k FROM perfil_fotos WHERE usuario_id=u.id) fv,u.nombre,u.barrio,u.rubros,u.rubro_otro,(u.dni!='' AND u.direccion!='' AND u.mail!='') ver,u.pionero pio,u.donador don,CASE WHEN p.estado='elegida' THEN u.telefono END tel,CASE WHEN p.estado='elegida' THEN u.mail END mail,(SELECT ROUND(AVG(estrellas),1) FROM puntuaciones WHERE trabajador_id=u.id) prom,(SELECT COUNT(*) FROM postulaciones pp JOIN pedidos cc ON cc.id=pp.pedido_id WHERE pp.trabajador_id=u.id AND pp.estado='elegida' AND cc.estado='hecha') n FROM postulaciones p JOIN usuarios u ON u.id=p.trabajador_id WHERE p.estado!='descartada' AND p.pedido_id IN (SELECT id FROM pedidos WHERE cliente_id=?)",
        me.id,
      ).all()
    ).results;
    return J(cs.map((c) => ({ ...c, post: ps.filter((x) => x.pedido_id === c.id) })));
  }
  if (p[0] === 'pedidos' && p[1] && m === 'POST') {
    const c = await q('SELECT * FROM pedidos WHERE id=?', p[1]).first();
    if (!c) return E('No existe', 404);
    if (p[2] === 'postular') {
      if (!tra) return E('Solo los trabajadores se postulan', 403);
      const pf = await pedirPerfil();
      if (pf) return pf;
      if (c.estado !== 'abierta' || c.vence < now) return E('Este pedido ya no está abierto');
      const n = await q("SELECT COUNT(*) n FROM postulaciones WHERE pedido_id=? AND estado='activa'", c.id).first();
      if (n.n >= 10) return E('Este pedido ya tiene 10 postulantes');
      const invi = await q('SELECT 1 x FROM invitaciones WHERE pedido_id=? AND trabajador_id=?', c.id, me.id).first(),
        otro = !JSON.parse(me.rubros || '[]').includes(c.rubro) && !invi,
        lo = await aj(D, 'limite_otros', 3);
      if (
        otro &&
        (await q('SELECT COUNT(*) n FROM limites WHERE clave=? AND creado>?', 'otros:' + me.id, now - DAY).first()).n >=
          lo
      )
        return E(
          'Llegaste al límite de ' +
            lo +
            ' propuestas por día fuera de tus rubros. Probá mañana o cambiá tus rubros en el perfil.',
        );
      const lp = await aj(D, 'limite_post', 6);
      if (
        (await q('SELECT COUNT(*) n FROM limites WHERE clave=? AND creado>?', 'post:' + me.id, now - DAY).first()).n >=
        lp
      )
        return E(
          'Llegaste al límite de ' +
            lp +
            ' postulaciones por día. Podés seguir en ' +
            (await faltan(D, 'post:' + me.id, DAY, now)) +
            '.',
          429,
        );
      try {
        await q(
          'INSERT INTO postulaciones(pedido_id,trabajador_id,mensaje,creado) VALUES(?,?,?,?)',
          c.id,
          me.id,
          String(b.mensaje || '').slice(0, 300),
          now,
        ).run();
      } catch (e) {
        return E('Ya te postulaste a este pedido');
      }
      if (otro) await q('INSERT INTO limites(clave,creado) VALUES(?,?)', 'otros:' + me.id, now).run();
      await q('INSERT INTO limites(clave,creado) VALUES(?,?)', 'post:' + me.id, now).run();
      ctx.waitUntil(avisar(env, [[c.cliente_id, me.nombre + ' se postuló a «' + c.titulo + '».']]));
      await refRev();
      return J({ ok: 1 });
    }
    if (c.cliente_id !== me.id) return E('No es tu pedido', 403);
    const st = (e, v = c.vence) => q('UPDATE pedidos SET estado=?,vence=? WHERE id=?', e, v, c.id).run();
    if (p[2] === 'editar') {
      if (c.estado !== 'abierta') return E('Solo se puede editar un pedido abierto');
      const t = String(b.titulo || '').trim();
      if (t.length < 3 || !RUBROS.includes(b.rubro)) return E('Poné un título y elegí un rubro');
      await q(
        'UPDATE pedidos SET titulo=?,rubro=?,rubro_otro=?,descripcion=?,barrio=?,presupuesto=? WHERE id=?',
        t.slice(0, 80),
        b.rubro,
        rubroOtro(b.rubro, b.rubro_otro),
        String(b.descripcion || '').slice(0, 1000),
        String(b.barrio || '').slice(0, 40),
        String(b.presupuesto || '')
          .trim()
          .slice(0, 40) || 'A convenir',
        c.id,
      ).run();
      const ps = (await q("SELECT trabajador_id FROM postulaciones WHERE pedido_id=? AND estado='activa'", c.id).all())
        .results;
      ctx.waitUntil(
        avisar(
          env,
          ps.map((x) => [
            x.trabajador_id,
            'El cliente modificó «' + t.slice(0, 80) + '». Revisá los cambios antes de que te elija.',
          ]),
        ),
      );
      return J({ ok: 1 });
    }
    if (p[2] === 'cancelar') {
      await st('cancelada');
      await q('DELETE FROM pedido_fotos WHERE pedido_id=?', c.id).run();
      return J({ ok: 1 });
    }
    if (p[2] === 'eliminar') {
      if (!['vencida', 'hecha'].includes(c.estado))
        return E('Solo se pueden eliminar pedidos vencidos o terminados. Si está abierto, cancelalo.');
      await D.batch([
        q('UPDATE pedidos SET oculta=1 WHERE id=?', c.id),
        q('DELETE FROM pedido_fotos WHERE pedido_id=?', c.id),
      ]);
      return J({ ok: 1 });
    }
    if (p[2] === 'renovar') {
      if (!['abierta', 'vencida'].includes(c.estado)) return E('No se puede renovar');
      await st('abierta', now + 7 * DAY);
      await addF(c.id, b.fotos);
      return J({ ok: 1 });
    }
    if (p[2] === 'hecha') {
      if (c.estado !== 'elegida') return E('Primero elegí a alguien');
      await q("UPDATE pedidos SET estado='hecha',hecha_en=? WHERE id=?", now, c.id).run();
      const w = await q("SELECT trabajador_id FROM postulaciones WHERE pedido_id=? AND estado='elegida'", c.id).first();
      if (w)
        ctx.waitUntil(
          avisar(env, [
            [w.trabajador_id, '«' + c.titulo + '» quedó marcado como hecho. Ahora el cliente puede puntuarte.'],
          ]),
        );
      return J({ ok: 1 });
    }
    if (p[2] === 'reabrir') {
      if (c.estado !== 'elegida') return E('No hay nada para reabrir');
      const w = await q("SELECT trabajador_id FROM postulaciones WHERE pedido_id=? AND estado='elegida'", c.id).first();
      if (w)
        ctx.waitUntil(
          avisar(env, [
            [w.trabajador_id, 'El cliente reabrió «' + c.titulo + '» y ya no estás elegido para ese pedido.'],
          ]),
        );
      await q("UPDATE postulaciones SET estado='descartada' WHERE pedido_id=? AND estado='elegida'", c.id).run();
      await st('abierta', now + 7 * DAY);
      await q('UPDATE pedidos SET elegida_en=NULL,hecha_en=NULL WHERE id=?', c.id).run();
      return J({ ok: 1 });
    }
    if (p[2] === 'puntuar') {
      const e = Math.round(+b.estrellas);
      if (c.estado !== 'hecha' || !(e >= 1 && e <= 5)) return E('Puntaje de 1 a 5 en un pedido hecho');
      const w = await q("SELECT trabajador_id FROM postulaciones WHERE pedido_id=? AND estado='elegida'", c.id).first();
      if (!w) return E('No hay trabajador elegido');
      let pr;
      try {
        pr = await q(
          'INSERT INTO puntuaciones(pedido_id,trabajador_id,cliente_id,estrellas,comentario,creado) VALUES(?,?,?,?,?,?)',
          c.id,
          w.trabajador_id,
          me.id,
          e,
          String(b.comentario || '').slice(0, 300),
          now,
        ).run();
      } catch (x) {
        return E('Ya puntuaste este pedido');
      }
      for (const f of (Array.isArray(b.fotos) ? b.fotos : []).slice(0, 3))
        if (typeof f === 'string' && f.startsWith('data:image/jpeg;base64,') && f.length < 250000)
          await q(
            'INSERT INTO resena_fotos(puntuacion_id,img,k) VALUES(?,?,?)',
            pr.meta.last_row_id,
            f.slice(23),
            rnd(8),
          ).run();
      ctx.waitUntil(
        avisar(env, [
          [
            w.trabajador_id,
            'Te puntuaron con ' +
              e +
              (e === 1 ? ' estrella' : ' estrellas') +
              ' por «' +
              c.titulo +
              '»' +
              (b.comentario ? ': ' + String(b.comentario).slice(0, 100) : '.'),
          ],
        ]),
      );
      return J({ ok: 1 });
    }
  }
}
