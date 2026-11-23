import { E, J, PAG } from '../comun.js';

export default async function directorio(C) {
  const { cli, m, me, p, q, u, vencer } = C;
  if (p[0] === 'locales' && m === 'GET')
    return J(
      (
        await q(
          "SELECT l.id,l.nombre,l.rubro,l.tipo,l.direccion,l.barrio,l.telefono,l.whatsapp,l.horario,l.descripcion,(SELECT id||'.'||k FROM local_fotos WHERE local_id=l.id AND rol='perfil' ORDER BY id DESC LIMIT 1) fp,(SELECT group_concat(id||'.'||k) FROM (SELECT id,k FROM local_fotos WHERE local_id=l.id AND rol='muestra' ORDER BY id LIMIT 5)) fm FROM locales l WHERE l.activo=1 ORDER BY l.tipo,l.rubro,l.nombre LIMIT 200",
        ).all()
      ).results,
    );
  if (p[0] === 'trabajadores' && p[1] && m === 'GET') {
    const w = await q(
      "SELECT u.id,u.nombre,u.barrio,u.rubros,u.rubro_otro,u.bio,(u.dni!='' AND u.direccion!='' AND u.mail!='') ver,u.pionero pio,u.donador don,(SELECT k FROM perfil_fotos WHERE usuario_id=u.id) fv,(SELECT ROUND(AVG(estrellas),1) FROM puntuaciones WHERE trabajador_id=u.id) prom,(SELECT COUNT(*) FROM puntuaciones WHERE trabajador_id=u.id) n FROM usuarios u WHERE u.id=? AND u.tipo='trabajador' AND u.suspendido=0",
      +p[1],
    ).first();
    if (!w) return E('No existe', 404);
    const tf = (
      await q('SELECT id,k FROM trabajos_fotos WHERE usuario_id=? ORDER BY id DESC LIMIT 12', w.id).all()
    ).results.map((x) => x.id + '.' + x.k);
    const rs = (
      await q(
        "SELECT s.estrellas e,s.comentario c,s.creado f,(SELECT group_concat(id||'.'||k) FROM resena_fotos WHERE puntuacion_id=s.id) fo,cu.nombre quien,ch.titulo t FROM puntuaciones s JOIN usuarios cu ON cu.id=s.cliente_id JOIN pedidos ch ON ch.id=s.pedido_id WHERE s.trabajador_id=? ORDER BY s.id DESC LIMIT 30",
        w.id,
      ).all()
    ).results.map((x) => ({ ...x, quien: String(x.quien).split(' ')[0] }));
    return J({ ...w, fotos: tf, resenas: rs });
  }
  // Directorio de trabajadores para el cliente: filtra por rubro, barrio, verificados y puntaje. Sin teléfono ni datos privados.
  if (p[0] === 'directorio' && m === 'GET') {
    if (!cli) return E('El directorio es para quienes buscan trabajadores', 403);
    const sp = u.searchParams,
      r = sp.get('rubro') || '',
      ba = sp.get('barrio') || '',
      vr = sp.get('ver') === '1' ? 1 : 0,
      mn = [4, 4.5].includes(+sp.get('min')) ? +sp.get('min') : 0,
      nm = String(sp.get('q') || '')
        .trim()
        .slice(0, 40)
        .toLowerCase(),
      lk = '%' + nm.replace(/[\\%_]/g, '\\$&') + '%';
    const ORD =
      {
        puntaje: 'COALESCE(prom,0) DESC,n DESC,id DESC',
        trabajos: 'n DESC,COALESCE(prom,0) DESC,id DESC',
        nuevos: 'id DESC',
      }[sp.get('o')] || 'COALESCE(prom,0) DESC,n DESC,id DESC';
    const W =
        "u.tipo='trabajador' AND u.suspendido=0 AND (?='' OR EXISTS(SELECT 1 FROM json_each(u.rubros) WHERE value=?)) AND (?='' OR u.barrio=?) AND (?=0 OR (u.dni!='' AND u.direccion!='' AND u.mail!='')) AND (?='' OR lower(u.nombre) LIKE ? ESCAPE '\\')",
      WB = [r, r, ba, ba, vr, nm, lk];
    const tot = (
        await q(
          'SELECT COUNT(*) n FROM (SELECT u.id,(SELECT AVG(estrellas) FROM puntuaciones WHERE trabajador_id=u.id) prom FROM usuarios u WHERE ' +
            W +
            ') t WHERE (?=0 OR COALESCE(prom,0)>=?)',
          ...WB,
          mn,
          mn,
        ).first()
      ).n,
      pags = Math.max(1, Math.ceil(tot / PAG)),
      pag = Math.min(Math.max(1, Math.floor(+sp.get('pag')) || 1), pags);
    const items = (
      await q(
        "SELECT * FROM (SELECT u.id,u.nombre,u.barrio,u.rubros,u.rubro_otro,SUBSTR(u.bio,1,140) bio,(u.dni!='' AND u.direccion!='' AND u.mail!='') ver,u.pionero pio,u.donador don,(SELECT k FROM perfil_fotos WHERE usuario_id=u.id) fv,(SELECT ROUND(AVG(estrellas),1) FROM puntuaciones WHERE trabajador_id=u.id) prom,(SELECT COUNT(*) FROM puntuaciones WHERE trabajador_id=u.id) n FROM usuarios u WHERE " +
          W +
          ') t WHERE (?=0 OR COALESCE(prom,0)>=?) ORDER BY ' +
          ORD +
          ' LIMIT ? OFFSET ?',
        ...WB,
        mn,
        mn,
        PAG,
        (pag - 1) * PAG,
      ).all()
    ).results;
    return J({ items, tot, pag, pags });
  }
  if (p[0] === 'mapa' && m === 'GET') {
    await vencer();
    const r = u.searchParams.get('rubro') || '',
      mi = u.searchParams.get('mis') === '1' && !r ? 1 : 0;
    return J(
      Object.fromEntries(
        (
          await q(
            "SELECT c.barrio,COUNT(*) n FROM pedidos c WHERE c.estado='abierta' AND c.barrio!='' AND (?='' OR c.rubro=?) AND (?=0 OR c.rubro IN (SELECT value FROM json_each(?))) GROUP BY c.barrio",
            r,
            r,
            mi,
            me.rubros || '[]',
          ).all()
        ).results.map((x) => [x.barrio, x.n]),
      ),
    );
  }
}
