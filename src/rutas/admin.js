import { DAY, E, J, MIN, PIN, PURGA, REF_MAX, RLOC, aj, borrarCuentaDefinitivo, iguales, limpiarBloq, log, mk } from '../comun.js';
import { avisar } from '../avisos.js';

export default async function admin(C) {
  const { D, b, ctx, env, ipk, m, now, p, q, req, tel, u } = C;
  if (p[0] === 'admin') {
    // Máximo 10 claves equivocadas por hora y por conexión (solo cuentan los errores)
    const ak = 'adm:' + (await ipk());
    if ((await q('SELECT COUNT(*) n FROM limites WHERE clave=? AND creado>?', ak, now - 60 * MIN).first()).n >= 10)
      return E('Demasiados intentos. Probá en un rato.', 429);
    if (!env.ADMIN_KEY || !iguales(req.headers.get('x-admin-key'), env.ADMIN_KEY)) {
      await q('INSERT INTO limites(clave,creado) VALUES(?,?)', ak, now).run();
      return E('Clave incorrecta', 401);
    }
    const all = async (s, ...a) =>
        (
          await D.prepare(s)
            .bind(...a)
            .all()
        ).results,
      z = p[1];
    // Paginación por cursor (?c=último registro que ya se vio: un id, o [rubro,nombre,id] / [fecha,id] donde el orden lo pide) y búsqueda en todos los registros (?q=texto). Si entran registros nuevos mientras se pagina, no se repite ni se saltea ninguno.
    const sp = u.searchParams,
      cur = (() => {
        try {
          return JSON.parse(sp.get('c'));
        } catch (e) {
          return null;
        }
      })(),
      cid = Number.isFinite(cur) && cur > 0 ? cur : 0,
      lc = Array.isArray(cur) && cur.length >= 2 ? cur : null,
      qs = String(sp.get('q') || '')
        .trim()
        .slice(0, 60),
      st = qs.replace(/[\\%_]/g, ''),
      lk = qs && !st ? '\u0001' : '%' + st + '%'; // sin comodines: un % o _ escrito por la persona no hace coincidir todo
    if (m === 'GET') {
      if (z === 'trabajadores')
        return J(
          await all(
            "SELECT u.id,u.nombre,u.telefono,u.pregunta,u.dni,u.direccion,u.mail,u.alertas_hasta,u.barrio,u.rubros,u.rubro_otro,u.suspendido,u.elim_pedida,u.creado,u.promos,u.pionero,(SELECT nombre FROM usuarios WHERE id=u.ref_por) ref_por_nombre,(SELECT COUNT(*) FROM usuarios WHERE ref_por=u.id) ref_n,(SELECT COUNT(*) FROM usuarios WHERE ref_por=u.id AND ref_ok=1 AND suspendido=0) ref_ok_n,(SELECT ROUND(AVG(estrellas),1) FROM puntuaciones WHERE trabajador_id=u.id) prom,(SELECT COUNT(*) FROM puntuaciones WHERE trabajador_id=u.id) n,(SELECT COUNT(*) FROM postulaciones WHERE trabajador_id=u.id) post FROM usuarios u WHERE u.tipo='trabajador' AND (?='' OR u.nombre LIKE ? OR u.telefono LIKE ? OR u.barrio LIKE ? OR u.mail LIKE ?) AND (?=0 OR u.id<?) ORDER BY u.id DESC LIMIT 100",
            qs,
            lk,
            lk,
            lk,
            lk,
            cid,
            cid,
          ),
        );
      if (z === 'clientes')
        return J(
          await all(
            "SELECT u.id,u.nombre,u.telefono,u.pregunta,u.dni,u.direccion,u.mail,u.barrio,u.suspendido,u.elim_pedida,u.creado,u.promos,u.pionero,(SELECT nombre FROM usuarios WHERE id=u.ref_por) ref_por_nombre,(SELECT COUNT(*) FROM usuarios WHERE ref_por=u.id) ref_n,(SELECT COUNT(*) FROM usuarios WHERE ref_por=u.id AND ref_ok=1 AND suspendido=0) ref_ok_n,(SELECT COUNT(*) FROM pedidos WHERE cliente_id=u.id) total,(SELECT COUNT(*) FROM pedidos WHERE cliente_id=u.id AND estado IN ('abierta','elegida')) activas FROM usuarios u WHERE u.tipo='cliente' AND (?='' OR u.nombre LIKE ? OR u.telefono LIKE ? OR u.barrio LIKE ? OR u.mail LIKE ?) AND (?=0 OR u.id<?) ORDER BY u.id DESC LIMIT 100",
            qs,
            lk,
            lk,
            lk,
            lk,
            cid,
            cid,
          ),
        );
      // Pedidos de cualquier estado. ?e= abierta | elegida | hecha | vencida | cancelada | dest. Un pedido abierto con la fecha pasada se cuenta como vencido aunque el cron diario todavía no lo haya marcado.
      if (z === 'pedidos') {
        const e = sp.get('e') || '',
          W = {
            abierta: "c.estado='abierta' AND c.vence>=?",
            elegida: "c.estado='elegida'",
            hecha: "c.estado='hecha'",
            cancelada: "c.estado='cancelada'",
            vencida: "(c.estado='vencida' OR (c.estado='abierta' AND c.vence<?))",
            dest: 'c.dest_hasta>?',
          },
          w = Object.hasOwn(W, e) ? W[e] : '1=1',
          nw = w.includes('?') ? [now] : [];
        return J({
          pedidos: await all(
            "SELECT c.id,c.titulo,c.rubro,c.rubro_otro,c.barrio,CASE WHEN c.estado='abierta' AND c.vence<? THEN 'vencida' ELSE c.estado END estado,c.creado,c.vence,c.dest_hasta,COALESCE(c.oculta,0) oculta,u.nombre cliente,u.telefono,(SELECT COUNT(*) FROM postulaciones WHERE pedido_id=c.id AND estado='activa') post,(SELECT COUNT(*) FROM postulaciones WHERE pedido_id=c.id) props,(SELECT COUNT(*) FROM pedido_fotos WHERE pedido_id=c.id) fotos FROM pedidos c JOIN usuarios u ON u.id=c.cliente_id WHERE " +
              w +
              " AND (?='' OR c.titulo LIKE ? OR u.nombre LIKE ? OR u.telefono LIKE ? OR c.barrio LIKE ?) AND (?=0 OR c.id<?) ORDER BY c.id DESC LIMIT 100",
            now,
            ...nw,
            qs,
            lk,
            lk,
            lk,
            lk,
            cid,
            cid,
          ),
        });
      }
      // Destacados que están corriendo ahora
      if (z === 'destacados')
        return J(
          await all(
            "SELECT c.id,c.titulo,c.rubro,c.rubro_otro,c.barrio,c.estado,c.vence,c.dest_desde,c.dest_hasta,u.nombre cliente,u.telefono,(SELECT COUNT(*) FROM postulaciones WHERE pedido_id=c.id AND estado='activa') post FROM pedidos c JOIN usuarios u ON u.id=c.cliente_id WHERE c.dest_hasta>? ORDER BY c.dest_hasta LIMIT 200",
            now,
          ),
        );
      // Todas las propuestas de un pedido (también las descartadas), con quién las hizo
      if (z === 'propuestas') {
        const id = +sp.get('pedido'),
          c = await q(
            'SELECT c.id,c.titulo,c.estado,c.vence,u.nombre cliente,u.telefono FROM pedidos c JOIN usuarios u ON u.id=c.cliente_id WHERE c.id=?',
            id,
          ).first();
        if (!c) return E('No existe ese pedido', 404);
        return J({
          pedido: c,
          items: await all(
            'SELECT p.id,p.mensaje,p.estado,p.creado,COALESCE(p.oculta,0) oculta,u.id tid,u.nombre,u.telefono,u.suspendido,(SELECT ROUND(AVG(estrellas),1) FROM puntuaciones WHERE trabajador_id=u.id) prom,(SELECT COUNT(*) FROM puntuaciones WHERE trabajador_id=u.id) n FROM postulaciones p JOIN usuarios u ON u.id=p.trabajador_id WHERE p.pedido_id=? ORDER BY p.id LIMIT 100',
            id,
          ),
          resena: await q('SELECT id,estrellas,comentario FROM puntuaciones WHERE pedido_id=?', id).first(),
        });
      }
      // Moderación: reseñas y fotos
      if (z === 'resenas')
        return J(
          await all(
            "SELECT s.id,s.pedido_id,s.estrellas,s.comentario,s.creado,t.nombre trabajador,t.telefono t_tel,cu.nombre cliente,cu.telefono c_tel,ch.titulo,(SELECT group_concat(id||'.'||k) FROM resena_fotos WHERE puntuacion_id=s.id) fotos FROM puntuaciones s LEFT JOIN usuarios t ON t.id=s.trabajador_id LEFT JOIN usuarios cu ON cu.id=s.cliente_id LEFT JOIN pedidos ch ON ch.id=s.pedido_id WHERE (?='' OR s.comentario LIKE ? OR t.nombre LIKE ? OR cu.nombre LIKE ? OR ch.titulo LIKE ?) AND (?=0 OR s.id<?) ORDER BY s.id DESC LIMIT 100",
            qs,
            lk,
            lk,
            lk,
            lk,
            cid,
            cid,
          ),
        );
      if (z === 'fotos') {
        const t = sp.get('t') || 'perfil',
          W = "WHERE (?='' OR u.nombre LIKE ? OR u.telefono LIKE ?) ",
          S = {
            perfil:
              'SELECT f.usuario_id id,f.k,f.actualizado creado,u.nombre,u.telefono FROM perfil_fotos f JOIN usuarios u ON u.id=f.usuario_id ' +
              W +
              'AND (?=0 OR (f.actualizado,f.usuario_id)<(?,?)) ORDER BY f.actualizado DESC,f.usuario_id DESC LIMIT 48',
            trabajos:
              'SELECT f.id,f.k,f.creado,u.nombre,u.telefono FROM trabajos_fotos f JOIN usuarios u ON u.id=f.usuario_id ' +
              W +
              'AND (?=0 OR f.id<?) ORDER BY f.id DESC LIMIT 48',
            resenas:
              'SELECT f.id,f.k,s.creado,u.nombre,u.telefono FROM resena_fotos f JOIN puntuaciones s ON s.id=f.puntuacion_id JOIN usuarios u ON u.id=s.cliente_id ' +
              W +
              'AND (?=0 OR f.id<?) ORDER BY f.id DESC LIMIT 48',
            pedidos:
              'SELECT f.id,f.k,c.creado,u.nombre,u.telefono FROM pedido_fotos f JOIN pedidos c ON c.id=f.pedido_id JOIN usuarios u ON u.id=c.cliente_id ' +
              W +
              'AND (?=0 OR f.id<?) ORDER BY f.id DESC LIMIT 48',
          };
        if (!Object.hasOwn(S, t)) return E('Tipo de foto desconocido');
        return J(
          await all(
            S[t],
            qs,
            lk,
            lk,
            ...(t === 'perfil' ? [lc ? 1 : 0, lc ? +lc[0] : 0, lc ? +lc[1] : 0] : [cid, cid]),
          ),
        );
      }
      if (z === 'locales') {
        await q("UPDATE locales SET codigo=lower(hex(randomblob(3))) WHERE codigo=''")
          .run()
          .catch(() => {}); // código del QR de cada local
        return J(
          await all(
            "SELECT l.id,l.nombre,l.rubro,l.direccion,l.barrio,l.telefono,l.whatsapp,l.horario,l.descripcion,l.activo,l.codigo,COALESCE((SELECT SUM(visitas) FROM origen_dias WHERE local_id=l.id),0) visitas,(SELECT COUNT(*) FROM usuarios WHERE origen=l.id) registros,(SELECT COUNT(*) FROM pedidos c JOIN usuarios u ON u.id=c.cliente_id WHERE u.origen=l.id) pedidos FROM locales l WHERE (?='' OR l.nombre LIKE ? OR l.direccion LIKE ? OR l.barrio LIKE ? OR l.telefono LIKE ? OR l.rubro LIKE ?) AND (?=0 OR (l.rubro,l.nombre,l.id)>(?,?,?)) ORDER BY l.rubro,l.nombre,l.id LIMIT 100",
            qs,
            lk,
            lk,
            lk,
            lk,
            lk,
            ...(lc && lc.length >= 3 ? [1, String(lc[0]), String(lc[1]), +lc[2]] : [0, '', '', 0]),
          ),
        );
      }
      // Historial de potenciaciones (todas gratuitas; quedan a la vista las solicitudes de pago viejas que nunca se activaron)
      if (z === 'pagos') {
        const sel =
          "SELECT a.id,a.tipo,a.estado,a.creado,a.activada_en,a.vence,a.pedido_id,u.nombre,u.telefono,COALESCE((SELECT titulo FROM pedidos WHERE id=a.pedido_id),'') titulo FROM activaciones a JOIN usuarios u ON u.id=a.usuario_id ";
        return J({
          hist: await all(
            sel +
              "WHERE (?='' OR u.nombre LIKE ? OR u.telefono LIKE ?) AND (?=0 OR a.id<?) ORDER BY a.id DESC LIMIT 50",
            qs,
            lk,
            lk,
            cid,
            cid,
          ),
        });
      }
      if (z === 'pend') {
        return J({
          n: 0,
          den: (await q("SELECT COUNT(*) n FROM denuncias WHERE estado='abierta'").first()).n,
        });
      }
      // Denuncias: qué se denunció (pedido o persona), quién denunció y cuántas veces se denunció lo mismo. Abiertas primero.
      if (z === 'denuncias') {
        const items = await all(
          "SELECT d.id,d.tipo,d.objetivo_id,d.motivo,d.estado,d.creado,a.nombre autor,a.telefono autor_tel,(SELECT COUNT(*) FROM denuncias x WHERE x.tipo=d.tipo AND x.objetivo_id=d.objetivo_id) veces,p.titulo p_titulo,p.estado p_estado,p.rubro p_rubro,pc.nombre p_cliente,pc.telefono p_tel,pc.suspendido p_susp,u.nombre u_nombre,u.telefono u_tel,u.tipo u_tipo,u.suspendido u_susp FROM denuncias d LEFT JOIN usuarios a ON a.id=d.autor_id LEFT JOIN pedidos p ON d.tipo='pedido' AND p.id=d.objetivo_id LEFT JOIN usuarios pc ON pc.id=p.cliente_id LEFT JOIN usuarios u ON d.tipo='usuario' AND u.id=d.objetivo_id ORDER BY (d.estado='abierta') DESC,d.id DESC LIMIT 200",
        );
        return J({ items, abiertas: (await q("SELECT COUNT(*) n FROM denuncias WHERE estado='abierta'").first()).n });
      }
      if (z === 'inicio') {
        const H24 = now - DAY,
          D7 = now - 7 * DAY,
          D30 = now - 30 * DAY,
          one = (s, ...a) => q(s, ...a).first(),
          AR = 3 * 60 * MIN; // fechas en hora de Argentina
        const us = await one(
          "SELECT COUNT(*) tot,COALESCE(SUM(tipo='trabajador'),0) trab,COALESCE(SUM(tipo='cliente'),0) cli,COALESCE(SUM(creado>?),0) h24,COALESCE(SUM(creado>?),0) d7,COALESCE(SUM(creado>? AND tipo='trabajador'),0) t7,COALESCE(SUM(creado>? AND tipo='cliente'),0) c7 FROM usuarios",
          H24,
          D7,
          D7,
          D7,
        );
        const pe = await one(
          "SELECT COUNT(*) tot,COALESCE(SUM(creado>?),0) h24,COALESCE(SUM(creado>?),0) d7,COALESCE(SUM(estado='abierta' AND vence>?),0) abiertos,COALESCE(SUM(estado='elegida'),0) marcha,COALESCE(SUM(estado='hecha'),0) hechos FROM pedidos",
          H24,
          D7,
          now,
        );
        const po = await one(
          'SELECT COUNT(*) tot,COALESCE(SUM(creado>?),0) h24,COALESCE(SUM(creado>?),0) d7 FROM postulaciones',
          H24,
          D7,
        );
        const activos = {
          alertas: (await one('SELECT COUNT(*) n FROM usuarios WHERE alertas_hasta>?', now)).n,
          destacados: (await one("SELECT COUNT(*) n FROM pedidos WHERE estado='abierta' AND dest_hasta>?", now)).n,
        };
        const denuncias = (await one("SELECT COUNT(*) n FROM denuncias WHERE estado='abierta'")).n;
        // Últimos 7 días (hoy incluido), por día
        const dias = [];
        for (let i = 6; i >= 0; i--) dias.push(new Date(now - AR - i * DAY).toISOString().slice(0, 10));
        const por = async (t) => {
          const m = {};
          for (const x of await all(
            "SELECT strftime('%Y-%m-%d',(creado-10800000)/1000,'unixepoch') d,COUNT(*) n FROM " +
              t +
              ' WHERE creado>? GROUP BY d',
            now - 8 * DAY,
          ))
            m[x.d] = x.n;
          return dias.map((d) => m[d] || 0);
        };
        const serie = {
          dias,
          usuarios: await por('usuarios'),
          pedidos: await por('pedidos'),
          post: await por('postulaciones'),
        };
        // Rendimiento de cada QR (solo los que ya movieron algo)
        const dia7 = new Date(now - AR - 7 * DAY).toISOString().slice(0, 10);
        const ls = await all(
          'SELECT l.id,l.nombre,l.rubro,l.activo,COALESCE((SELECT SUM(visitas) FROM origen_dias WHERE local_id=l.id),0) visitas,COALESCE((SELECT SUM(visitas) FROM origen_dias WHERE local_id=l.id AND dia>=?),0) v7,(SELECT COUNT(*) FROM usuarios WHERE origen=l.id) registros,(SELECT COUNT(*) FROM pedidos c JOIN usuarios u ON u.id=c.cliente_id WHERE u.origen=l.id) pedidos FROM locales l ORDER BY registros DESC,visitas DESC,l.nombre LIMIT 2000',
          dia7,
        );
        const mov = ls.filter((x) => x.visitas || x.registros || x.pedidos);
        const qr = {
          items: mov.slice(0, 12),
          locales: ls.length,
          activos: mov.length,
          visitas: mov.reduce((t, x) => t + x.visitas, 0),
          registros: mov.reduce((t, x) => t + x.registros, 0),
          pedidos: mov.reduce((t, x) => t + x.pedidos, 0),
        };
        return J({
          gen: now,
          usuarios: us,
          pedidos: pe,
          post: po,
          activos,
          denuncias,
          serie,
          qr,
          tel_on: await aj(D, 'tel_on', 0),
          avisos_n: (await q('SELECT COUNT(*) n FROM push_subs WHERE usuario_id=0').first()).n,
          push_ok: env.VAPID_PUBLIC && env.VAPID_PRIVATE ? 1 : 0,
          telpend: await all(
            'SELECT u.id,u.nombre,u.telefono,u.tipo,c.codigo,c.vence,c.intentos,c.creado FROM tel_codigos c JOIN usuarios u ON u.id=c.usuario_id WHERE u.tel_ok=0 ORDER BY c.creado DESC LIMIT 50',
          ),
        });
      }
      if (z === 'precios') return J({ ajustes: { primera_gratis: await aj(D, 'primera_gratis', 1) } });
      if (z === 'ajustes') {
        const ft = (t) => D.prepare('SELECT COUNT(*) n,COALESCE(SUM(LENGTH(img)),0) b FROM ' + t).first();
        const sz = (await D.prepare('SELECT COUNT(*) n FROM usuarios').all()).meta;
        return J({
          ajustes: {
            limite_otros: await aj(D, 'limite_otros', 3),
            limite_post: await aj(D, 'limite_post', 6),
            limite_mb: await aj(D, 'limite_mb', 500),
            primera_gratis: await aj(D, 'primera_gratis', 1),
          },
          db: (sz && sz.size_after) || null,
          fotos: {
            pedidos: await ft('pedido_fotos'),
            perfil: await ft('perfil_fotos'),
            resenas: await ft('resena_fotos'),
            trabajos: await ft('trabajos_fotos'),
          },
          usuarios: await D.prepare(
            "SELECT COALESCE(SUM(tipo='trabajador'),0) trabajadores,COALESCE(SUM(tipo='cliente'),0) clientes FROM usuarios",
          ).first(),
          pedidos: Object.fromEntries(
            (await all('SELECT estado,COUNT(*) n FROM pedidos GROUP BY estado')).map((x) => [x.estado, x.n]),
          ),
          logs: await all('SELECT creado,tipo,detalle FROM logs ORDER BY id DESC LIMIT 100'),
          errores: await all('SELECT id,creado,donde,mensaje,detalle FROM errores ORDER BY id DESC LIMIT 30'),
        });
      }
      return E('No existe', 404);
    }
    if ((z === 'suspender' || z === 'reset-pin' || z === 'eliminar-cuenta') && /^eliminada-/.test(String(b.telefono || '')))
      return E('Esa cuenta fue eliminada por su dueño');
    if (z === 'reset-pin') {
      if (!PIN.test(b.pin || '')) return E('El PIN tiene 6 números');
      await q('DELETE FROM sesiones WHERE usuario_id=(SELECT id FROM usuarios WHERE telefono=?)', tel).run();
      await q(
        'UPDATE usuarios SET pin_hash=?,intentos=0,bloqueado_hasta=0 WHERE telefono=?',
        await mk(b.pin),
        tel,
      ).run();
      await limpiarBloq(D, tel);
      await log(D, 'admin', 'PIN cambiado: ' + tel);
      return J({ ok: 1 });
    }
    if (z === 'ref-anular') {
      const u = await q('SELECT id FROM usuarios WHERE telefono=?', tel).first();
      if (!u) return E('No existe esa cuenta', 404);
      await q('UPDATE usuarios SET ref_por=0,ref_ok=0 WHERE ref_por=?', u.id).run();
      await q('UPDATE usuarios SET promos=0,ref_prem=? WHERE id=?', REF_MAX, u.id).run();
      await log(D, 'admin', 'Invitados y promociones por invitar anulados: ' + tel);
      return J({ ok: 1 });
    }
    // Cuenta que pidió eliminarse: el administrador la revisa y la borra por completo (o la reactiva con "Activar")
    if (z === 'eliminar-cuenta') {
      const x = await q('SELECT id,tipo,suspendido FROM usuarios WHERE telefono=?', tel).first();
      if (!x) return E('No existe esa cuenta', 404);
      if (!x.suspendido) return E('Primero suspendé la cuenta');
      await borrarCuentaDefinitivo(D, x.id);
      await log(D, 'admin', 'Cuenta eliminada por completo (#' + x.id + ', ' + x.tipo + ')');
      return J({ ok: 1 });
    }
    if (z === 'suspender') {
      await q('UPDATE usuarios SET suspendido=?,elim_pedida=CASE WHEN ?=0 THEN 0 ELSE elim_pedida END WHERE telefono=?', b.on ? 1 : 0, b.on ? 1 : 0, tel).run();
      await log(D, 'admin', (b.on ? 'Suspendido: ' : 'Reactivado: ') + tel);
      return J({ ok: 1 });
    }
    if (z === 'bajar') {
      await q("UPDATE pedidos SET estado='cancelada' WHERE id=?", b.id).run();
      await q('DELETE FROM pedido_fotos WHERE pedido_id=?', b.id).run();
      await log(D, 'admin', 'Pedido dado de baja: #' + +b.id);
      return J({ ok: 1 });
    }
    if (z === 'cerrar-denuncia') {
      await q("UPDATE denuncias SET estado='cerrada' WHERE id=?", b.id).run();
      await log(D, 'admin', 'Denuncia cerrada: #' + +b.id);
      return J({ ok: 1 });
    }
    if (z === 'local' || z === 'local-editar') {
      const n = String(b.nombre || '').trim();
      if (n.length < 2 || !RLOC.includes(b.rubro)) return E('Poné el nombre y elegí el rubro');
      const v = [
        n.slice(0, 80),
        b.rubro,
        String(b.direccion || '').slice(0, 100),
        String(b.barrio || '').slice(0, 40),
        String(b.telefono || '')
          .replace(/\D/g, '')
          .slice(0, 15),
        b.whatsapp ? 1 : 0,
        String(b.horario || '').slice(0, 100),
        String(b.descripcion || '').slice(0, 300),
      ];
      if (z === 'local')
        await q(
          'INSERT INTO locales(nombre,rubro,direccion,barrio,telefono,whatsapp,horario,descripcion,creado) VALUES(?,?,?,?,?,?,?,?,?)',
          ...v,
          now,
        ).run();
      else
        await q(
          'UPDATE locales SET nombre=?,rubro=?,direccion=?,barrio=?,telefono=?,whatsapp=?,horario=?,descripcion=? WHERE id=?',
          ...v,
          +b.id,
        ).run();
      await log(D, 'admin', (z === 'local' ? 'Local nuevo: ' : 'Local editado: ') + n.slice(0, 60));
      return J({ ok: 1 });
    }
    if (z === 'local-borrar') {
      await q('DELETE FROM locales WHERE id=?', b.id).run();
      await q('DELETE FROM origen_dias WHERE local_id=?', b.id).run();
      await q('UPDATE usuarios SET origen=0 WHERE origen=?', b.id).run();
      await log(D, 'admin', 'Local borrado: #' + +b.id);
      return J({ ok: 1 });
    }
    if (z === 'local-ocultar') {
      await q('UPDATE locales SET activo=1-activo WHERE id=?', b.id).run();
      await log(D, 'admin', 'Local mostrado u oculto: #' + +b.id);
      return J({ ok: 1 });
    }
    // Sacar un destacado que está corriendo (queda en el historial, con vencimiento ahora)
    if (z === 'quitar-destacado') {
      const c = await q('SELECT id,titulo,cliente_id,dest_hasta FROM pedidos WHERE id=?', +b.id).first();
      if (!c || !(c.dest_hasta > now)) return E('Ese pedido ya no está destacado');
      await q('UPDATE pedidos SET dest_desde=0,dest_hasta=0 WHERE id=?', c.id).run();
      await q(
        "UPDATE activaciones SET vence=? WHERE pedido_id=? AND tipo='destacado' AND estado='activa' AND vence>?",
        now,
        c.id,
        now,
      ).run();
      ctx.waitUntil(
        avisar(env, [
          [
            c.cliente_id,
            'Sacamos el destacado de tu pedido «' +
              c.titulo.slice(0, 60) +
              '». Si tenés dudas, escribinos por WhatsApp.',
          ],
        ]),
      );
      await log(D, 'admin', 'Destacado quitado: #' + c.id);
      return J({ ok: 1 });
    }
    // Moderación de reseñas: quitar solo el comentario y las fotos (queda el puntaje) o borrar la reseña entera
    if (z === 'resena-quitar' || z === 'resena-borrar') {
      const r = await q('SELECT id,cliente_id FROM puntuaciones WHERE id=?', +b.id).first();
      if (!r) return E('Esa reseña ya no existe');
      await q('DELETE FROM resena_fotos WHERE puntuacion_id=?', r.id).run();
      if (z === 'resena-borrar') await q('DELETE FROM puntuaciones WHERE id=?', r.id).run();
      else await q("UPDATE puntuaciones SET comentario='' WHERE id=?", r.id).run();
      ctx.waitUntil(
        avisar(env, [
          [
            r.cliente_id,
            z === 'resena-borrar'
              ? 'Sacamos tu reseña porque no cumplía las normas de Dicho y Hecho.'
              : 'Sacamos el comentario y las fotos de tu reseña porque no cumplían las normas de Dicho y Hecho.',
          ],
        ]),
      );
      await log(D, 'admin', (z === 'resena-borrar' ? 'Reseña borrada: #' : 'Reseña moderada: #') + r.id);
      return J({ ok: 1 });
    }
    // Moderación de fotos: perfil, trabajos, reseñas y pedidos
    if (z === 'foto-borrar') {
      const T = {
        perfil: [
          'SELECT usuario_id u FROM perfil_fotos WHERE usuario_id=?',
          'DELETE FROM perfil_fotos WHERE usuario_id=?',
        ],
        trabajos: ['SELECT usuario_id u FROM trabajos_fotos WHERE id=?', 'DELETE FROM trabajos_fotos WHERE id=?'],
        resenas: [
          'SELECT s.cliente_id u FROM resena_fotos f JOIN puntuaciones s ON s.id=f.puntuacion_id WHERE f.id=?',
          'DELETE FROM resena_fotos WHERE id=?',
        ],
        pedidos: [
          'SELECT c.cliente_id u FROM pedido_fotos f JOIN pedidos c ON c.id=f.pedido_id WHERE f.id=?',
          'DELETE FROM pedido_fotos WHERE id=?',
        ],
      };
      if (!Object.hasOwn(T, b.t)) return E('Tipo de foto desconocido');
      const o = await q(T[b.t][0], +b.id).first();
      if (!o) return E('Esa foto ya no existe');
      await q(T[b.t][1], +b.id).run();
      ctx.waitUntil(
        avisar(env, [
          [
            o.u,
            'Sacamos una foto tuya porque no cumplía las normas de Dicho y Hecho.' +
              (b.t === 'perfil' ? ' Subí otra para seguir usando la app.' : ''),
          ],
        ]),
      );
      await log(D, 'admin', 'Foto borrada (' + b.t + '): #' + +b.id);
      return J({ ok: 1 });
    }
    if (z === 'push') {
      // suscripción del celu de Gestión (usuario 0): recibe avisos de registros nuevos
      if (!/^https:\/\//.test(b.endpoint || '')) return E('Suscripción inválida');
      await q(
        'INSERT OR REPLACE INTO push_subs(endpoint,usuario_id,creado,p256dh,auth) VALUES(?,0,?,?,?)',
        b.endpoint,
        now,
        String(b.p256dh || ''),
        String(b.auth || ''),
      ).run();
      return J({ ok: 1 });
    }
    if (z === 'ajuste') {
      const r = {
          limite_otros: [0, 50],
          limite_post: [1, 100],
          limite_mb: [50, 1000000],
          tel_on: [0, 1],
          primera_gratis: [0, 1],
        }[b.clave],
        v = Math.round(+b.valor);
      if (!r || !(v >= r[0] && v <= r[1])) return E('Valor fuera de rango');
      await q('INSERT OR REPLACE INTO ajustes(clave,valor) VALUES(?,?)', b.clave, String(v)).run();
      await log(D, 'admin', 'Ajuste ' + b.clave + ' = ' + v);
      return J({ ok: 1 });
    }
    if (z === 'errores-borrar') {
      await q('DELETE FROM errores').run();
      await log(D, 'admin', 'Errores de la app borrados');
      return J({ ok: 1 });
    }
    if (z === 'purgar-fotos') {
      await q("UPDATE pedidos SET estado='vencida' WHERE estado='abierta' AND vence<?", now).run();
      const f = await q(PURGA).run(),
        n = (f.meta && f.meta.changes) || 0;
      await log(D, 'admin', 'Fotos de pedidos vencidos borradas: ' + n);
      return J({ borradas: n });
    }
    return E('No existe', 404);
  }
}
