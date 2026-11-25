import R from '../../public/reglas.js';
import {
  DAY,
  E,
  J,
  MAILRE,
  MIN,
  NOM,
  NR,
  PGEN,
  PIN,
  PIONEROS,
  PREG,
  REFRE,
  RUBROS,
  aj,
  cod6,
  lim,
  limpiarBloq,
  log,
  mk,
  ok,
  regError,
  rnd,
  rubroOtro,
  sesion,
  sha,
} from '../comun.js';
import { avisar, push } from '../avisos.js';

export default async function publicas(C) {
  const { D, b, ctx, env, ipk, m, now, p, q, req, tel, u } = C;
  // Visita que llega desde el QR de un local: solo suma 1 al contador del día (sin datos personales)
  if (p[0] === 'origen' && m === 'POST') {
    const c = String(b.c || '');
    if (!/^[a-f0-9]{6}$/.test(c)) return J({ ok: 1 });
    if (await lim(D, 'org:' + (await ipk()), 30, 60 * MIN, now)) return J({ ok: 1 });
    const l = await q('SELECT id FROM locales WHERE codigo=? AND activo=1', c).first();
    if (l)
      await q(
        'INSERT INTO origen_dias(local_id,dia,visitas) VALUES(?,?,1) ON CONFLICT(local_id,dia) DO UPDATE SET visitas=visitas+1',
        l.id,
        new Date(now).toISOString().slice(0, 10),
      ).run();
    return J({ ok: 1 });
  }
  // Números reales de la zona para la portada (solo cantidades, sin datos de nadie). Se guardan 60 s en caché.
  if (p[0] === 'zona' && m === 'GET') {
    const n = async (s, ...a) => (await q(s, ...a).first()).n;
    const z = {
      pedidos: await n(
        "SELECT COUNT(*) n FROM pedidos WHERE estado='abierta' AND vence>? AND COALESCE(oculta,0)=0",
        now,
      ),
      trabajadores: await n(
        "SELECT COUNT(*) n FROM usuarios u WHERE u.tipo='trabajador' AND u.suspendido=0",
      ),
      hechos: await n("SELECT COUNT(*) n FROM pedidos WHERE estado='hecha'"),
      // lugares Pionero que quedan (0 cuando se llenaron)
      pioneros: Math.max(0, PIONEROS - (await n('SELECT COUNT(*) n FROM usuarios WHERE pionero=1'))),
    };
    return new Response(JSON.stringify(z), {
      headers: { 'content-type': 'application/json', 'cache-control': 'public,max-age=60' },
    });
  }
  if (p[0] === 'registro' && m === 'POST') {
    if (!['cliente', 'trabajador'].includes(b.tipo)) return E('Elegí si sos cliente o trabajador');
    if (!b.acepto) return E('Tenés que aceptar el aviso legal');
    if (!NOM(b.nombre)) return E('Poné tu nombre y apellido, solo con letras');
    const ml = String(b.mail || '')
      .trim()
      .toLowerCase()
      .slice(0, 100);
    if (ml && !MAILRE.test(ml)) return E('El mail no es válido');
    if (!R.telValido(tel)) return E('Teléfono inválido');
    // Rubro del trabajador (el registro nuevo lo pide). Si no viene (app vieja en caché), queda en "Otros" como antes.
    let rubro = '',
      rubroEsp = '';
    if (b.tipo === 'trabajador' && b.rubro) {
      if (!RUBROS.includes(b.rubro)) return E('Elegí a qué te dedicás');
      rubro = b.rubro;
      rubroEsp = rubroOtro(rubro, b.rubro_otro);
      if (rubro === 'Otros' && !rubroEsp) return E('Contanos a qué te dedicás');
    }
    if (!PIN.test(b.pin || '')) return E('El PIN tiene 6 números');
    const pg = PREG(b.pregunta),
      rs = NR(b.respuesta);
    if (!R.PREGUNTAS.includes(pg)) return E('Elegí una pregunta de seguridad de la lista');
    {
      const er = R.errRespuesta(b.respuesta, pg);
      if (er) return E(er);
    }

    const ik = await ipk();
    if (
      (await lim(D, 'reg:h:' + ik, 4, 60 * MIN, now)) ||
      (await lim(D, 'reg:d:' + ik, 10, DAY, now)) ||
      (await lim(D, 'reg:all', 300, DAY, now))
    )
      return E('Hubo muchos registros desde tu conexión. Probá más tarde.', 429);
    const rec = rnd(4).toUpperCase();
    let r;
    const lo = /^[a-f0-9]{6}$/.test(String(b.origen || ''))
      ? await q('SELECT id FROM locales WHERE codigo=?', String(b.origen)).first()
      : null;
    const ip = await ipk(),
      rf0 = REFRE.test(String(b.ref || ''))
        ? await q('SELECT id,reg_ip FROM usuarios WHERE ref_cod=?', String(b.ref)).first()
        : null,
      rf = rf0 && rf0.reg_ip !== ip ? rf0 : null; // misma conexión que quien invita: no cuenta
    const conf = (await aj(D, 'tel_on', 0)) === 1; // confirmación manual del teléfono: la prende o apaga Gestión
    // Si ese teléfono quedó con una cuenta que nunca confirmó, no tiene datos: se libera para que su verdadero dueño pueda registrarse
    const viejo = await q('SELECT id FROM usuarios WHERE telefono=? AND tel_ok=0', tel).first();
    if (viejo)
      await D.batch([
        q('DELETE FROM sesiones WHERE usuario_id=?', viejo.id),
        q('DELETE FROM tel_codigos WHERE usuario_id=?', viejo.id),
        q('DELETE FROM usuarios WHERE id=?', viejo.id),
      ]);
    try {
      r = await q(
        'INSERT INTO usuarios(tipo,nombre,telefono,pin_hash,rec_hash,barrio,origen,mail,ref_por,reg_ip,tel_ok,pregunta,resp_hash,creado,rubros,rubro_otro,pionero) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,(SELECT CASE WHEN COUNT(*)<? THEN 1 ELSE 0 END FROM usuarios WHERE pionero=1))',
        b.tipo,
        NOM(b.nombre),
        tel,
        await mk(b.pin),
        await mk(rec),
        String(b.barrio || '').slice(0, 40),
        lo ? lo.id : 0,
        ml,
        rf ? rf.id : 0,
        ip,
        conf ? 0 : 1,
        pg,
        await mk(rs),
        now,
        b.tipo === 'trabajador' ? JSON.stringify([rubro || 'Otros']) : '[]',
        b.tipo === 'trabajador' ? rubroEsp : '',
        PIONEROS,
      ).run();
    } catch (e) {
      return E('Ese teléfono ya está registrado', 409);
    }
    if (conf) {
      await q(
        'INSERT OR REPLACE INTO tel_codigos(usuario_id,codigo,vence,intentos,creado) VALUES(?,?,?,0,?)',
        r.meta.last_row_id,
        cod6(),
        now + 60 * MIN,
        now,
      ).run();
      ctx.waitUntil(
        push(
          env,
          [0],
          'Nuevo registro: ' +
            NOM(b.nombre).slice(0, 40) +
            ' (' +
            (b.tipo === 'trabajador' ? 'trabajador' : 'cliente') +
            ') espera su código de WhatsApp.',
        ),
      );
    } // usuario 0 = el celu de Gestión
    await log(
      D,
      'registro',
      b.tipo + ' nuevo: ' + NOM(b.nombre).slice(0, 40) + (rf ? ' (invitado por #' + rf.id + ')' : ''),
    );
    return J({ token: await sesion(D, r.meta.last_row_id, now), confirmar: conf ? 1 : 0 });
  }
  if (p[0] === 'login' && m === 'POST') {
    if (await lim(D, 'log:' + (await ipk()), 40, 60 * MIN, now))
      return E('Demasiados intentos. Probá en un rato.', 429);
    const x = await q('SELECT * FROM usuarios WHERE telefono=?', tel).first();
    // Una cuenta que no existe se trata igual que una que sí: mismos bloqueos, mismo mensaje y mismo tiempo (se calcula un hash de mentira).
    // La cuenta suspendida solo se avisa a quien acertó el PIN.
    // Bloqueo por conexión: quien se equivoca 5 veces queda bloqueado ÉL (15 minutos, 1 hora y 24 horas si repite), pero el dueño de la cuenta entra normal desde su celu.
    const ip = await ipk(),
      kb = 'lb:' + tel + ':' + ip,
      kf = 'lf:' + tel + ':' + ip,
      dur = (n) => (n <= 1 ? 15 * MIN : n === 2 ? 60 * MIN : DAY);
    const bk = await q(
      'SELECT COUNT(*) n,COALESCE(MAX(creado),0) m FROM limites WHERE clave=? AND creado>?',
      kb,
      now - 2 * DAY,
    ).first();
    if (bk.n && bk.m + dur(bk.n) > now) {
      const f = bk.m + dur(bk.n) - now;
      return E(
        'Demasiados intentos desde tu conexión. Probá en ' +
          (f > 2 * 60 * MIN ? 'un día' : f > 20 * MIN ? 'una hora' : 'unos minutos') +
          '.',
        429,
      );
    }
    // Si fallan muchas conexiones distintas a la vez (30 errores en un día) se frena la cuenta una hora; el dueño igual puede entrar con "Olvidé mi PIN"
    if (x && x.bloqueado_hasta > now)
      return E('Hubo muchos intentos fallidos en esta cuenta. Probá en un rato o usá "Olvidé mi PIN".', 429);
    const bien = await ok(String(b.pin || ''), x ? x.pin_hash : '0000000000000000:' + '0'.repeat(64));
    if (!x || !bien) {
      await D.batch([
        q('INSERT INTO limites(clave,creado) VALUES(?,?)', kf, now),
        q('INSERT INTO limites(clave,creado) VALUES(?,?)', 'fa:' + tel, now),
      ]);
      const nf = (
        await q('SELECT COUNT(*) n FROM limites WHERE clave=? AND creado>?', kf, Math.max(bk.m, now - 2 * DAY)).first()
      ).n;
      if (nf >= 5) await q('INSERT INTO limites(clave,creado) VALUES(?,?)', kb, now).run();
      const na = (await q('SELECT COUNT(*) n FROM limites WHERE clave=? AND creado>?', 'fa:' + tel, now - DAY).first())
        .n;
      if (x && na >= 30) await q('UPDATE usuarios SET bloqueado_hasta=? WHERE id=?', now + 60 * MIN, x.id).run();
      return E('Teléfono o PIN incorrectos', 401);
    }
    if (x.suspendido)
      return E(
        x.elim_pedida
          ? 'Tu cuenta está suspendida y se va a eliminar cuando un administrador la revise.'
          : 'Cuenta suspendida',
        403,
      );
    await q('DELETE FROM limites WHERE clave=?', kf).run();
    await q('UPDATE usuarios SET intentos=0 WHERE id=?', x.id).run();
    return J({ token: await sesion(D, x.id, now) });
  }
  if (p[0] === 'recuperar-pregunta' && m === 'POST') {
    if (await lim(D, 'rq:' + (await ipk()), 20, 60 * MIN, now)) return E('Demasiados intentos. Probá en un rato.', 429);
    const x = tel ? await q('SELECT pregunta FROM usuarios WHERE telefono=?', tel).first() : null;
    return J({
      pregunta: x && x.pregunta ? x.pregunta : PGEN[parseInt((await sha('q' + tel)).slice(0, 2), 16) % PGEN.length],
    });
  }
  if (p[0] === 'recuperar' && m === 'POST') {
    if (await lim(D, 'rec:' + (await ipk()), 10, 60 * MIN, now))
      return E('Demasiados intentos. Probá en un rato.', 429);
    if (!PIN.test(b.pin || '')) return E('El PIN nuevo tiene 6 números');
    // Por teléfono (una respuesta se adivina más fácil que un PIN): 5 respuestas equivocadas → 1 hora, después 6 horas y después 24 horas
    const kb = 'rb:' + tel,
      kf = 'rf:' + tel,
      dur = (n) => (n <= 1 ? 60 * MIN : n === 2 ? 6 * 60 * MIN : DAY);
    const bk = await q(
      'SELECT COUNT(*) n,COALESCE(MAX(creado),0) m FROM limites WHERE clave=? AND creado>?',
      kb,
      now - 2 * DAY,
    ).first();
    if (bk.n && bk.m + dur(bk.n) > now) {
      const f = bk.m + dur(bk.n) - now;
      return E(
        'Demasiados intentos con ese teléfono. Probá en ' +
          (f > 6 * 60 * MIN ? 'un día' : f > 60 * MIN ? 'unas horas' : 'un rato') +
          '.',
        429,
      );
    }
    const x = await q('SELECT * FROM usuarios WHERE telefono=?', tel).first();
    if (!(x && x.resp_hash && (await ok(NR(b.respuesta), x.resp_hash)))) {
      // un teléfono que no existe falla igual que una respuesta mala
      await q('INSERT INTO limites(clave,creado) VALUES(?,?)', kf, now).run();
      const nf = (
        await q('SELECT COUNT(*) n FROM limites WHERE clave=? AND creado>?', kf, Math.max(bk.m, now - 2 * DAY)).first()
      ).n;
      if (nf >= 5) await q('INSERT INTO limites(clave,creado) VALUES(?,?)', kb, now).run();
      return E('La respuesta no es correcta', 401);
    }
    await D.batch([
      q('DELETE FROM sesiones WHERE usuario_id=?', x.id),
      q('UPDATE usuarios SET pin_hash=?,intentos=0,bloqueado_hasta=0 WHERE id=?', await mk(b.pin), x.id),
    ]);
    await limpiarBloq(D, tel);
    await log(D, 'cuenta', 'PIN recuperado con la pregunta de seguridad: ' + tel);
    ctx.waitUntil(
      avisar(env, [
        [x.id, 'Se cambió tu PIN con la pregunta de seguridad. Si no fuiste vos, pedinos ayuda por WhatsApp.'],
      ]),
    );
    return J({ token: await sesion(D, x.id, now) });
  }

  // Las fotos se piden con una clave al azar (foto/12.a1b2c3d4), así no se pueden recorrer por número.
  const IMG = {
    foto: ['pedido_fotos', 'id'],
    pfoto: ['perfil_fotos', 'usuario_id'],
    rfoto: ['resena_fotos', 'id'],
    tfoto: ['trabajos_fotos', 'id'],
    lfoto: ['local_fotos', 'id'],
  };
  if (IMG[p[0]]) {
    const [i, kk] = p[0] === 'pfoto' ? [p[1], u.searchParams.get('v') || ''] : String(p[1]).split('.');
    if (!kk) return E('No existe', 404);
    const f = await q('SELECT img FROM ' + IMG[p[0]][0] + ' WHERE ' + IMG[p[0]][1] + '=? AND k=?', +i, kk).first();
    if (!f) return E('No existe', 404);
    return new Response(
      Uint8Array.from(atob(f.img), (c) => c.charCodeAt(0)),
      {
        headers: {
          'content-type': 'image/jpeg',
          'cache-control': 'public,max-age=86400',
          'x-content-type-options': 'nosniff',
          'content-security-policy': "default-src 'none'",
        },
      },
    );
  }
  if (p[0] === 'push-key') return J({ key: env.VAPID_PUBLIC || '' });
  if (p[0] === 'error' && m === 'POST') {
    // reporte de errores desde la app: sin sesión obligatoria y sin avisar si se pasa del límite
    if ((await lim(D, 'err:' + (await ipk()), 20, 60 * MIN, now)) || (await lim(D, 'err:all', 500, DAY, now)))
      return J({ ok: 1 });
    const t0 = (req.headers.get('authorization') || '').slice(7),
      u0 = t0 && (await q('SELECT usuario_id id FROM sesiones WHERE token=? AND vence>?', await sha(t0), now).first());
    await regError(
      D,
      'app',
      b.msg,
      String(b.src || '').slice(0, 200) +
        ' | ' +
        String(b.pag || '').slice(0, 80) +
        ' | ' +
        String(req.headers.get('user-agent') || '').slice(0, 120),
      u0 ? u0.id : 0,
    );
    return J({ ok: 1 });
  }
}
