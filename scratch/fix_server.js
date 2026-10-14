const fs = require('fs');
let c = fs.readFileSync('server/index.js', 'utf8');

// PATCH fix
const patchTarget = `            if (SERVER_SCOPED_TABLES.has(table) && !isAdmin) {
                if (field !== 'server_id') return res.status(403).json({ error: 'Forbidden' });
                const ok = (await getAccessibleServerIds(req.user)).includes(eqValue);
                if (!ok) return res.status(403).json({ error: 'Forbidden' });
            }`;

const patchReplacement = patchTarget + `
            if (table === 'support_tickets' && !isAdmin) {
                if (field !== 'id') return res.status(403).json({ error: 'Forbidden' });
                const [t] = await pool.query('SELECT user_id FROM support_tickets WHERE id = ?', [eqValue]);
                if (!t.length || t[0].user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
                const allowedKeys = ['status'];
                for (const k in data) if (!allowedKeys.includes(k)) delete data[k];
            }`;

// DELETE fix
const deleteTarget = `            if (SERVER_SCOPED_TABLES.has(table) && !isAdmin) {
                if (field !== 'server_id') return res.status(403).json({ error: 'Forbidden' });
                const ok = (await getAccessibleServerIds(req.user)).includes(eqValue);
                if (!ok) return res.status(403).json({ error: 'Forbidden' });
            }`;

// Note: Target is the same, but we need to find both occurrences.
// Actually, let's just do a blanket replacement if they are identical.

const finalContent = c.split(patchTarget).join(patchReplacement);
// Wait, splitting by same target will replace both. Is that okay?
// No, the DELETE one needs different logic (messages too).

const deleteReplacement = patchTarget + `
            if ((table === 'support_tickets' || table === 'support_ticket_messages') && !isAdmin) {
                if (table === 'support_tickets') {
                    if (field !== 'id') return res.status(403).json({ error: 'Forbidden' });
                    const [t] = await pool.query('SELECT user_id FROM support_tickets WHERE id = ?', [eqValue]);
                    if (!t.length || t[0].user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
                } else {
                    const query = field === 'ticket_id' 
                        ? 'SELECT user_id FROM support_tickets WHERE id = ?' 
                        : 'SELECT user_id FROM support_tickets WHERE id = (SELECT ticket_id FROM support_ticket_messages WHERE id = ?)';
                    const [t] = await pool.query(query, [eqValue]);
                    if (!t.length || t[0].user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
                }
            }`;

// Let's use a more robust regex-based or manual index approach.
let indexPatch = c.indexOf(patchTarget);
let indexDelete = c.lastIndexOf(patchTarget);

if (indexPatch !== -1 && indexDelete !== -1 && indexPatch !== indexDelete) {
    let part1 = c.substring(0, indexPatch + patchTarget.length);
    let part2 = c.substring(indexPatch + patchTarget.length, indexDelete + patchTarget.length);
    let part3 = c.substring(indexDelete + patchTarget.length);
    
    fs.writeFileSync('server/index.js', part1 + `
            if (table === 'support_tickets' && !isAdmin) {
                if (field !== 'id') return res.status(403).json({ error: 'Forbidden' });
                const [t] = await pool.query('SELECT user_id FROM support_tickets WHERE id = ?', [eqValue]);
                if (!t.length || t[0].user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
                const allowedKeys = ['status'];
                for (const k in data) if (!allowedKeys.includes(k)) delete data[k];
            }` + part2 + `
            if ((table === 'support_tickets' || table === 'support_ticket_messages') && !isAdmin) {
                if (table === 'support_tickets') {
                    if (field !== 'id') return res.status(403).json({ error: 'Forbidden' });
                    const [t] = await pool.query('SELECT user_id FROM support_tickets WHERE id = ?', [eqValue]);
                    if (!t.length || t[0].user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
                } else {
                    const query = field === 'ticket_id' 
                        ? 'SELECT user_id FROM support_tickets WHERE id = ?' 
                        : 'SELECT user_id FROM support_tickets WHERE id = (SELECT ticket_id FROM support_ticket_messages WHERE id = ?)';
                    const [t] = await pool.query(query, [eqValue]);
                    if (!t.length || t[0].user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
                }
            }` + part3);
    console.log('Success');
} else {
    console.log('Failed to find targets', indexPatch, indexDelete);
}
