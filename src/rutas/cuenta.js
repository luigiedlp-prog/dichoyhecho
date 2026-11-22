import R from '../../public/reglas.js';
import {
  DAY,
  E,
  J,
  MAILRE,
  MAXR,
  MIN,
  NOM,
  NR,
  PREG,
  REF_MAX,
  REF_N,
  RUBROS,
  cod6,
  faltan,
  lim,
  log,
  mk,
  ok,
  primeraDisp,
  refCod,
  rnd,
} from '../comun.js';
import { push } from '../avisos.js';

export default async function cuenta(C) {
  const { D, b, ctx, env, falta, m, me, now, p, q, refRev, telPend, tra } = C;
  if (p[0] === 'tel-codigo' && m === 'POST') {
    if (!telPend) return J({ ok: 1 });
    const c = await q('SELECT * FROM tel_codigos WHERE usuario_id=?', me.id).first();
    if (!c || c.vence < now) return E('El código venció. Pedí uno nuevo.', 410);
    if (c.intentos >= 5) return E('Probaste muchas veces. Pedí un código nuevo.', 429);
    if (String(b.codigo || '').replace(/\D/g, '') !== c.codigo) {
      await q('UPDATE tel_codigos SET intentos=intentos+1 WHERE usuario_id=?', me.id).run();
      return E('El código no es correcto', 400);
    }
    await D.batch([
      q('UPDATE usuarios SET tel_ok=1 WHERE id=?', me.id),
      q('DELETE FROM tel_codigos WHERE usuario_id=?', me.id),
    ]);
    await log(D, 'registro', 'Teléfono confirmado (usuario #' + me.id + ')');
    return J({ ok: 1 });
  }
  if (p[0] === 'tel-nuevo' && m === 'POST') {
    if (!telPend) return J({ ok: 1 });
    if (await lim(D, 'tn:' + me.id, 3, 60 * MIN, now)) return E('Pediste muchos códigos. Probá en un rato.', 429);
    await q(
      'INSERT OR REPLACE INTO tel_codigos(usuario_id,codigo,vence,intentos,creado) VALUES(?,?,?,0,?)',
      me.id,
      cod6(),
      now + 60 * MIN,
      now,
    ).run();
    ctx.waitUntil(push(env, [0], String(me.nombre).slice(0, 40) + ' pidió un código nuevo.'));
    return J({ ok: 1 });
  }
  if (p[0] === 'pregunta' && m === 'POST') {
    // cargar o cambiar la pregunta de seguridad: pide el PIN actual
    if (await lim(D, 'pg:' + me.id, 5, 60 * MIN, now)) return E('Demasiados intentos. Probá en un rato.', 429);
    if (!(await ok(String(b.pin || ''), me.pin_hash))) return E('Tu PIN no es correcto', 401);
    const pg = PREG(b.pregunta),
      rs = NR(b.respuesta);
    if (!R.PREGUNTAS.includes(pg)) return E('Elegí una pregunta de seguridad de la lista');
    {
      const er = R.errRespuesta(b.respuesta, pg);
      if (er) return E(er);
    }

    await q('UPDATE usuarios SET pregunta=?,resp_hash=? WHERE id=?', pg, await mk(rs), me.id).run();
    return J({ ok: 1 });
  }
  if (p[0] === 'yo') {
    const s = await q(
      'SELECT ROUND(AVG(estrellas),1) prom,COUNT(*) n,(SELECT k FROM perfil_fotos WHERE usuario_id=?) fv,(SELECT COUNT(*) FROM avisos WHERE usuario_id=? AND leido=0) av FROM puntuaciones WHERE trabajador_id=?',
      me.id,
      me.id,
      me.id,
    ).first();
    const { pin_hash, rec_hash, resp_hash, ref_por, ref_ok, reg_ip, ...x } = me;
    const rn = (await q('SELECT COUNT(*) n FROM usuarios WHERE ref_por=? AND ref_ok=1 AND suspendido=0', me.id).first())
        .n,
      pri = await primeraDisp(D, me.id);
    return J({
      ...x,
      ...s,
      ref_cod: await refCod(D, me),
      ref_n: rn,
      ref_de: REF_N,
      ref_max: REF_MAX,
      primera: pri ? 1 : 0,
      gratis: (me.promos || 0) + (pri ? 1 : 0),
      falta: await falta(),
      ver: me.dni && me.direccion && me.mail ? 1 : 0,
      alertas_act: me.alertas_hasta > now ? 1 : 0,
      tel_pend: telPend ? 1 : 0,
    });
  }
  if (p[0] === 'perfil-foto' && m === 'POST') {
    if (b.borrar) {
      await q('DELETE FROM perfil_fotos WHERE usuario_id=?', me.id).run();
      return J({ ok: 1 });
    }
    const f = b.foto;
    if (typeof f !== 'string' || !f.startsWith('data:image/jpeg;base64,') || f.length > 150000)
      return E('La foto no es válida o es muy pesada');
    // la primera foto de la cuenta es libre; después se puede cambiar una vez cada 24 horas
    if (
      (await q('SELECT 1 x FROM perfil_fotos WHERE usuario_id=?', me.id).first()) &&
      (await lim(D, 'foto:' + me.id, 1, DAY, now))
    )
      return E(
        'Ya cambiaste tu foto de perfil hoy. Podés volver a cambiarla en ' +
          (await faltan(D, 'foto:' + me.id, DAY, now)) +
          '.',
        429,
      );
    await q(
      'INSERT OR REPLACE INTO perfil_fotos(usuario_id,img,actualizado,k) VALUES(?,?,?,?)',
      me.id,
      f.slice(23),
      now,
      rnd(8),
    ).run();
    await refRev();
    return J({ ok: 1 });
  }
  if (p[0] === 'trabajos-fotos' && m === 'POST') {
    if (!tra) return E('Solo los trabajadores suben fotos de trabajos', 403);
    if (p[1] === 'borrar') {
      await q('DELETE FROM trabajos_fotos WHERE id=? AND usuario_id=?', +b.id, me.id).run();
      return J({ ok: 1 });
    }
    const f = b.foto;
    if (typeof f !== 'string' || !f.startsWith('data:image/jpeg;base64,') || f.length > 250000)
      return E('La foto no es válida o es muy pesada');
    if (await lim(D, 'tfoto:' + me.id, 5, DAY, now))
      return E(
        'Llegaste al límite de 5 fotos de trabajos por día. Podés subir más en ' +
          (await faltan(D, 'tfoto:' + me.id, DAY, now)) +
          '.',
        429,
      );
    if ((await q('SELECT COUNT(*) n FROM trabajos_fotos WHERE usuario_id=?', me.id).first()).n >= 12)
      return E('Llegaste al máximo de 12 fotos. Borrá alguna para subir otra.');
    await q(
      'INSERT INTO trabajos_fotos(usuario_id,img,creado,k) VALUES(?,?,?,?)',
      me.id,
      f.slice(23),
      now,
      rnd(8),
    ).run();
    return J({ ok: 1 });
  }
  if (p[0] === 'avisos') {
    if (m === 'POST') {
      await q('UPDATE avisos SET leido=1 WHERE usuario_id=? AND leido=0', me.id).run();
      return J({ ok: 1 });
    }
    return J(
      (await q('SELECT id,texto,creado,leido FROM avisos WHERE usuario_id=? ORDER BY id DESC LIMIT 30', me.id).all())
        .results,
    );
  }
  if (p[0] === 'perfil' && m === 'POST') {
    const r0 = [...new Set((Array.isArray(b.rubros) ? b.rubros : []).filter((x) => RUBROS.includes(x)))];
    if (r0.length > MAXR) return E('Elegí hasta ' + MAXR + ' rubros');
    const r = JSON.stringify(tra && !r0.length ? ['Otros'] : r0); // sin rubro elegido, el trabajador queda en "Otros"
    const nm = NOM(b.nombre || me.nombre);
    if (!nm) return E('Poné tu nombre y apellido, solo con letras');
    const ml =
      b.mail === undefined
        ? me.mail
        : String(b.mail || '')
            .trim()
            .toLowerCase()
            .slice(0, 100);
    if (ml && !MAILRE.test(ml)) return E('El mail no es válido');
    await q(
      'UPDATE usuarios SET nombre=?,barrio=?,rubros=?,bio=?,mail=? WHERE id=?',
      nm,
      String(b.barrio || '').slice(0, 40),
      r,
      String(b.bio || '').slice(0, 300),
      ml || '',
      me.id,
    ).run();
    await refRev();
    return J({ ok: 1 });
  }
  // Verificación opcional: con DNI, dirección y mail completos se muestra el sello azul. Nunca se muestran a otros usuarios.
  if (p[0] === 'verificacion' && m === 'POST') {
    const dni = String(b.dni || '').replace(/\D/g, ''),
      dir = String(b.direccion || '')
        .trim()
        .slice(0, 100),
      mail = String(b.mail || '')
        .trim()
        .toLowerCase()
        .slice(0, 100);
    if (dni && !/^\d{7,8}$/.test(dni)) return E('El DNI tiene 7 u 8 números');
    if (dir && dir.length < 5) return E('Poné la dirección completa (calle y número)');
    if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) return E('El mail no es válido');
    await q('UPDATE usuarios SET dni=?,direccion=?,mail=? WHERE id=?', dni, dir, mail, me.id).run();
    return J({ ok: 1, ver: dni && dir && mail ? 1 : 0 });
  }
  // Eliminar la cuenta: se borran el perfil, las fotos, los pedidos, las postulaciones y los avisos, y la fila queda anonimizada
  // (sin datos personales y con el teléfono liberado). Se conservan los cobros (contabilidad) y las reseñas que escribió, sin su nombre.
  if (p[0] === 'cuenta-borrar' && m === 'POST') {
    if (await lim(D, 'del:' + me.id, 5, 60 * MIN, now)) return E('Demasiados intentos. Probá en un rato.', 429);
    if (!(await ok(String(b.pin || ''), me.pin_hash))) return E('El PIN no es correcto', 401);
    const id = me.id,
      mios = 'SELECT id FROM pedidos WHERE cliente_id=?',
      conRes = 'SELECT pedido_id FROM puntuaciones';
    await D.batch([
      ...['pedido_fotos', 'postulaciones', 'invitaciones', 'avisados'].map((t) =>
        D.prepare('DELETE FROM ' + t + ' WHERE pedido_id IN (' + mios + ')').bind(id),
      ),
      D.prepare(
        "UPDATE pedidos SET titulo='Pedido eliminado',descripcion='',presupuesto='',oculta=1,estado=CASE WHEN estado IN ('abierta','elegida') THEN 'cancelada' ELSE estado END WHERE cliente_id=? AND id IN (" +
          conRes +
          ')',
      ).bind(id),
      D.prepare('DELETE FROM pedidos WHERE cliente_id=? AND id NOT IN (' + conRes + ')').bind(id),
      D.prepare(
        'DELETE FROM resena_fotos WHERE puntuacion_id IN (SELECT id FROM puntuaciones WHERE trabajador_id=?)',
      ).bind(id),
      D.prepare('DELETE FROM puntuaciones WHERE trabajador_id=?').bind(id),
      D.prepare('DELETE FROM postulaciones WHERE trabajador_id=?').bind(id),
      D.prepare('DELETE FROM invitaciones WHERE trabajador_id=? OR cliente_id=?').bind(id, id),
      D.prepare('DELETE FROM avisados WHERE usuario_id=?').bind(id),
      ...['perfil_fotos', 'trabajos_fotos', 'push_subs', 'avisos', 'sesiones'].map((t) =>
        D.prepare('DELETE FROM ' + t + ' WHERE usuario_id=?').bind(id),
      ),
      D.prepare('UPDATE usuarios SET ref_por=0 WHERE ref_por=?').bind(id),
      D.prepare(
        "UPDATE usuarios SET nombre='Cuenta eliminada',telefono=?,pin_hash=?,rec_hash=?,barrio='',rubros='[]',bio='',dni='',direccion='',mail='',suspendido=1,alertas_hasta=0,ref_cod='',ref_por=0,promos=0,reg_ip='',pregunta='',resp_hash='' WHERE id=?",
      ).bind('eliminada-' + id, await mk(rnd(12)), await mk(rnd(12)), id),
    ]);
    await log(D, 'cuenta', 'Cuenta eliminada por su dueño (#' + id + ', ' + me.tipo + ')');
    return J({ ok: 1 });
  }
  if (p[0] === 'push' && m === 'POST') {
    if (!/^https:\/\//.test(b.endpoint || '')) return E('Suscripción inválida');
    await q(
      'INSERT OR REPLACE INTO push_subs(endpoint,usuario_id,creado,p256dh,auth) VALUES(?,?,?,?,?)',
      b.endpoint,
      me.id,
      now,
      String(b.p256dh || ''),
      String(b.auth || ''),
    ).run();
    return J({ ok: 1 });
  }
}
