import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { GameComponentProps } from '@rarefriends/friendsdk/runtime';
import { type GameSnapshot, maximumPrize } from '@rarefriends/friendsdk/game';
import { GameMenu } from '@rarefriends/friendsdk/frame';
import { formatGameAmount } from '@rarefriends/friendsdk/ui';
import { createFriendReader, spriteFrame } from '@rarefriends/friendsdk/sprites';
import { createFriendSoundKit, type FriendSoundKit } from '@rarefriends/friendsdk/sounds';
import garden from './assets/garden-pixel.png';
import flowers from './assets/flowers-pixel.png';
import './style.css';

type Plot = { stage: 'empty' | 'seed' | 'growing' | 'bloom'; playId?: bigint; outcomeId?: number; water: number; remaining: number };
type Menu = 'seeds' | 'journal' | 'settings' | 'help' | null;
const emptyPlot = (): Plot => ({ stage: 'empty', water: 0, remaining: 0 });
const lore = ['A little piece of moonlight, rooted in the earth.', 'It rings softly when the evening breeze passes.', 'Three fallen stars that decided to stay.', 'A quiet bloom that keeps the secrets of the night.', 'It remembers the sunshine, even after dark.', 'Some dreams only bloom once in a blue moon.'];
const rarity = ['Common', 'Common', 'Uncommon', 'Rare', 'Rare', 'Mythic'];
const amount = (v: bigint) => formatGameAmount(v, 18);

function Icon({ name }: { name: 'seed' | 'water' | 'book' | 'sound' | 'mute' | 'settings' | 'spark' | 'plus' }) {
  const shapes = {
    seed: <><path d="M12 21V11M12 15C3 15 3 7 3 7s9-1 9 8ZM12 11c0-8 9-9 9-9s1 9-9 9Z" /></>,
    water: <><path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z"/><path d="M9 15a3 3 0 0 0 3 3"/></>,
    book: <><path d="M12 5v16M12 5C9 2 3 3 3 3v16s6-1 9 2c3-3 9-2 9-2V3s-6-1-9 2Z"/></>,
    sound: <><path d="m10 4-5 4H2v8h3l5 4l0-16ZM14 8a6 6 0 0 1 0 8M17 4a11 11 0 0 1 0 16"/></>,
    mute: <><path d="m10 4-5 4H2v8h3l5 4l0-16ZM16 9l6 6M22 9l-6 6"/></>,
    settings: <><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="8" cy="18" r="2"/></>,
    spark: <path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>,
    plus: <path d="M12 5v14M5 12h14"/>
  };
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">{shapes[name]}</svg>;
}
function Flower({ id, className = '' }: { id: number; className?: string }) {
  return <span aria-hidden="true" className={`flower-art ${className}`} style={{ backgroundImage: `url(${flowers})`, backgroundPosition: `${((id - 1) % 3) * 50}% ${id > 3 ? 100 : 0}%` }} />;
}
function Friend({ friendId, still }: { friendId: bigint; still: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState('Loading Friend…');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true, timer: ReturnType<typeof setInterval> | undefined;
    setStatus('Loading Friend…');
    void createFriendReader().read(friendId).then(sprites => {
      if (!active) return;
      const ctx = canvas.current?.getContext('2d');
      if (!ctx) { setStatus('Artwork unavailable'); return; }
      let n = 0;
      const draw = () => {
        const rows = spriteFrame(sprites, 'down', false, still ? 0 : n++ % 8).frame.rows;
        ctx.clearRect(0, 0, 90, 90); ctx.imageSmoothingEnabled = false;
        const pixels = rows.flatMap((row, y) => [...row].flatMap((pixel, x) => pixel === '#' ? [[x, y]] : []));
        ctx.fillStyle = '#fff';
        for (const [x, y] of pixels) ctx.fillRect(x * 5, y * 5, 15, 15);
        ctx.fillStyle = '#111';
        for (const [x, y] of pixels) ctx.fillRect(x * 5 + 5, y * 5 + 5, 5, 5);
      };
      draw(); if (!still) timer = setInterval(draw, 180); setStatus('');
    }).catch(() => { if (active) setStatus('Artwork unavailable'); });
    return () => { active = false; clearInterval(timer); };
  }, [friendId, still, revision]);
  return <div className="friend"><canvas ref={canvas} width="90" height="90" role="img" aria-label={`Your Rare Friend #${friendId}`} /><span>Friend #{friendId.toString()}</span>{status && <button onClick={() => setRevision(n => n + 1)} disabled={status.startsWith('Loading')}>{status}{!status.startsWith('Loading') && ' · Retry'}</button>}</div>;
}
export default function DreamGarden({ friendId, client, paused }: GameComponentProps) {
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [plots, setPlots] = useState<Plot[]>(() => Array.from({ length: 6 }, emptyPlot));
  const [selected, setSelected] = useState(0), [menu, setMenu] = useState<Menu>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [notice, setNotice] = useState('Your little patch of possibility. Start with a dream seed.');
  const [muted, setMuted] = useState(true);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [reveal, setReveal] = useState<number | null>(null);
  const [discovered, setDiscovered] = useState<number[]>([]);
  const epoch = useRef(0), lock = useRef(false), sound = useRef<FriendSoundKit | null>(null);
  const definition = client.definition;
  useEffect(() => {
    const e = ++epoch.current;
    setSnapshot(null); setPlots(Array.from({ length: 6 }, emptyPlot)); setDiscovered([]); setMenu(null); setReveal(null); setBusy(false); lock.current = false; setError('');
    sound.current = createFriendSoundKit({ muted: true }); setMuted(true);
    void client.read().then(value => { if (epoch.current === e) setSnapshot(value); }).catch(cause => { if (epoch.current === e) setError(cause instanceof Error ? cause.message : 'Could not load your garden.'); });
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(preference.matches); preference.addEventListener('change', update);
    return () => { ++epoch.current; sound.current?.dispose(); preference.removeEventListener('change', update); };
  }, [client, friendId]);
  useEffect(() => {
    if (paused || menu || reveal || busy) return;
    const timer = setInterval(() => { if (!document.hidden) setPlots(current => current.map(p => p.stage === 'growing' && p.remaining > 0 ? { ...p, remaining: Math.max(0, p.remaining - 0.25) } : p)); }, 250);
    return () => clearInterval(timer);
  }, [paused, menu, reveal, busy]);
  async function act(work: () => Promise<void>) {
    if (lock.current || paused) return;
    const e = epoch.current; lock.current = true; setBusy(true); setError('');
    try { await work(); }
    catch (cause) { if (epoch.current === e) setError(cause instanceof Error ? cause.message : 'That action did not finish. Please try again.'); }
    finally {
      // Read even after cancellation or a partially completed request.
      try { const value = await client.read(); if (epoch.current === e) setSnapshot(value); }
      catch { if (epoch.current === e) setError('Could not refresh your garden. Use Retry sync before another action.'); }
      if (epoch.current === e) { lock.current = false; setBusy(false); }
    }
  }
  const chooseMenu = (next: Menu) => { if (!busy && !paused) { setMenu(next); setError(''); } };
  const cue = (name: 'purchase' | 'reward' | 'reveal-common') => { void sound.current?.unlock().then(() => sound.current?.play(name)).catch(() => {}); };
  const toggleSound = () => { const next = !muted; setMuted(next); sound.current?.setMuted(next); if (!next) cue('reveal-common'); };
  const updatePlot = (index: number, p: Plot) => setPlots(current => current.map((old, i) => i === index ? p : old));
  async function plant() {
    const index = selected, e = epoch.current;
    await act(async () => {
      const current = await client.read();
      const existingIds = new Set(plots.map(p => p.playId));
      const pending = current.plays.find(p => p.outcomeId === null && !existingIds.has(p.id));
      const play = pending ?? (await client.play(1n))[0];
      if (epoch.current !== e) return;
      updatePlot(index, { stage: 'seed', playId: play.id, water: 0, remaining: 0 });
      setNotice('A dream is planted. Give it two gentle waterings.'); cue('purchase');
    });
  }
  function water() {
    if (paused || busy || lock.current || menu || reveal) return;
    const p = plots[selected]; if (p.stage !== 'seed') return;
    const next = p.water + 1;
    updatePlot(selected, { ...p, water: next, stage: next === 2 ? 'growing' : 'seed', remaining: next === 2 ? 5 : 0 });
    setNotice(next === 2 ? 'Something lovely is taking root…' : 'One more sip of water.'); cue('reveal-common');
  }
  async function bloom() {
    const index = selected, p = plots[index], e = epoch.current;
    if (p.playId === undefined) return;
    await act(async () => {
      const current = await client.read();
      const saved = current.plays.find(play => play.id === p.playId);
      const result = saved?.outcomeId ? saved : await client.settle(p.playId!);
      if (epoch.current !== e) return;
      if (result.outcomeId === null) { setNotice('Your flower is still dreaming. Try revealing it again.'); return; }
      updatePlot(index, { ...p, stage: 'bloom', outcomeId: result.outcomeId });
      setDiscovered(ids => ids.includes(result.outcomeId!) ? ids : [...ids, result.outcomeId!]);
      setReveal(result.outcomeId); setNotice(`${definition.outcomes[result.outcomeId - 1].name} has found a home in your garden.`); cue('reward');
    });
  }
  if (!snapshot) return <section className="garden-loading"><span className="eyebrow">DREAM GARDEN</span><h1>A little magic is taking root.</h1><p role={error ? 'alert' : 'status'}>{error || 'Opening your garden…'}</p>{error && <button onClick={() => void act(async () => {})} disabled={busy || paused}>Retry</button>}</section>;
  if (snapshot.friendId !== friendId || client.mode !== 'preview') return <p role="alert">Dream Garden requires the matching Friend in simulated preview mode.</p>;
  const p = plots[selected];
  const pending = snapshot.plays.find(play => play.outcomeId === null && !plots.some(plot => plot.playId === play.id));
  const canBuy = snapshot.rfBalance >= definition.price && snapshot.freeStake >= maximumPrize(definition);
  const known = [...new Set([...discovered, ...snapshot.plays.flatMap(play => play.outcomeId ? [play.outcomeId] : [])])];
  const disabled = busy || paused;
  const blooming = plots.filter(plot => plot.stage === 'bloom').length;
  return <section className={`dream-garden ${reduced ? 'still' : ''}`} aria-label="Dream Garden" aria-busy={busy} style={{ '--garden': `url(${garden})` } as CSSProperties}>
    <div className="garden-surface" inert={Boolean(menu || reveal || paused) || undefined}>
      <header className="garden-header"><div><span className="eyebrow">RARE FRIENDS · A LITTLE NIGHT MAGIC</span><h1>Dream Garden<span>✧</span></h1></div><div className="header-tools"><button className="icon-button" aria-label={muted ? 'Turn sound on' : 'Turn sound off'} aria-pressed={!muted} onClick={toggleSound}><Icon name={muted ? 'mute' : 'sound'} /></button><button className="icon-button" aria-label="Settings" onClick={() => chooseMenu('settings')}><Icon name="settings" /></button></div></header>
      <div className="garden-stats"><span><Icon name="spark"/><strong>{amount(snapshot.rfBalance)}</strong> simulated RF</span><span><Icon name="seed"/><strong>{snapshot.consumables.toString()}</strong> seeds</span><button onClick={() => chooseMenu('journal')}><Icon name="book"/>{known.length} / 6 discovered</button></div>
      <div className="scene" aria-label="Your six planting spots">
        <div className="scene-caption"><span className="eyebrow">THE MOONLIT PATCH</span><span>{blooming ? `${blooming} ${blooming === 1 ? 'flower' : 'flowers'} at home` : 'Small seeds. Lovely surprises.'}</span></div>
        <div className="plots">{plots.map((plot, i) => <button key={i} className={`plot ${plot.stage} ${selected === i ? 'selected' : ''}`} aria-label={`Plot ${i + 1}: ${plot.stage === 'bloom' ? definition.outcomes[plot.outcomeId! - 1].name : plot.stage === 'growing' && plot.remaining === 0 ? 'ready to bloom' : plot.stage}`} aria-pressed={selected === i} onClick={() => { if (!disabled) setSelected(i); }} disabled={disabled}>
          {plot.stage === 'bloom' ? <Flower id={plot.outcomeId!}/> : <span className="plot-marker"><Icon name={plot.stage === 'empty' ? 'plus' : plot.stage === 'growing' && plot.remaining === 0 ? 'spark' : 'seed'}/></span>}
          <span className="plot-label">{plot.stage === 'empty' ? 'Plant here' : plot.stage === 'seed' ? `Water ${plot.water}/2` : plot.stage === 'growing' ? plot.remaining > 0 ? 'Growing…' : 'Ready to bloom' : definition.outcomes[plot.outcomeId! - 1].name}</span><span className="plot-number">{i + 1}</span>
        </button>)}</div>
        <Friend friendId={friendId} still={reduced || paused || busy || Boolean(menu || reveal)}/>
      </div>
      <div className="garden-bottom"><div className="selected-info"><span className="eyebrow">PLOT {selected + 1} · {p.stage === 'bloom' ? 'IN BLOOM' : 'MAKE SOMETHING GROW'}</span><h2>{p.stage === 'empty' ? 'A dream starts here.' : p.stage === 'seed' ? 'Just add a little care.' : p.stage === 'growing' ? p.remaining > 0 ? 'Let it take its time.' : 'Your dream is ready.' : definition.outcomes[p.outcomeId! - 1].name}</h2><p>{p.stage === 'bloom' ? lore[p.outcomeId! - 1] : p.stage === 'empty' ? 'Choose a spot and plant a mystery seed.' : p.stage === 'seed' ? 'Water twice, then watch your flower wake up.' : p.remaining > 0 ? `${Math.ceil(p.remaining)} seconds until reveal. No need to rush.` : 'Reveal the flower hiding inside your seed.'}</p></div>
        <div className="primary-actions">{p.stage === 'empty' ? snapshot.consumables > 0n || pending ? <button className="primary" disabled={disabled} onClick={() => void plant()}><Icon name="seed"/>{pending ? 'Resume planted seed' : 'Plant a seed'}</button> : <button className="primary" disabled={disabled} onClick={() => chooseMenu('seeds')}><Icon name="seed"/>Get dream seeds</button> : p.stage === 'seed' ? <button className="primary" disabled={disabled} onClick={water}><Icon name="water"/>Water · {p.water}/2</button> : p.stage === 'growing' ? <button className="primary" disabled={disabled || p.remaining > 0} onClick={() => void bloom()}><Icon name="spark"/>{p.remaining > 0 ? 'Growing…' : 'Reveal flower'}</button> : <button className="primary" disabled={disabled} onClick={() => { updatePlot(selected, emptyPlot()); setNotice('Flower kept in your journal. This spot is ready for another dream.'); }}>Keep & replant</button>}<button className="secondary" disabled={disabled} onClick={() => chooseMenu('journal')}><Icon name="book"/>Flower journal</button></div>
      </div>
      <div className="garden-feedback" role={error ? 'alert' : 'status'}>{error || (busy ? 'Waiting for your confirmation…' : notice)}{error && <button disabled={disabled} onClick={() => void act(async () => {})}>Retry sync</button>}</div>
      <footer className="garden-footer"><span>Simulated play · Resets on reload</span><div><button disabled={disabled} onClick={() => chooseMenu('seeds')}>Seed shop</button><button onClick={() => chooseMenu('help')}>How to grow</button></div></footer>
    </div>
    {menu && <GameMenu title={menu === 'seeds' ? 'A pocketful of possibility' : menu === 'journal' ? 'Your flower journal' : menu === 'settings' ? 'Garden settings' : 'A small guide to growing'} onClose={disabled ? undefined : () => chooseMenu(null)}>
      {menu === 'seeds' ? <><span className="eyebrow">DREAM SEEDS</span><h3>One seed. A lovely surprise.</h3><p>Each seed costs <strong>1 simulated RF</strong> and grows one flower. Watering is free. Every variety can appear in any spot.</p><button className="primary wide" disabled={disabled || !canBuy} onClick={() => void act(async () => { const e = epoch.current; await client.buy(1n); if (epoch.current === e) { setNotice('One dream seed is ready. Choose a planting spot.'); setMenu(null); cue('purchase'); } })}><Icon name="seed"/>Buy 1 dream seed · 1 RF</button>{!canBuy && <p>{snapshot.rfBalance < definition.price ? 'Not enough simulated RF. You can redeem a collected flower in the journal.' : 'Seed sales are paused: not enough simulated prize backing.'}</p>}<table><caption>Every seed uses these same odds</caption><thead><tr><th>Flower</th><th>Chance</th><th>Redeems for</th></tr></thead><tbody>{definition.outcomes.map(o => <tr key={o.name}><td>{o.name}</td><td>{o.chanceBps / 100}%</td><td>{amount(o.reward)} RF</td></tr>)}</tbody></table><p className="fine">All values are simulated. Each seed reserves 5 RF of simulated prize backing. Flowers retain their fixed redemption value until redeemed, with no expiry during this session.</p></> :
      menu === 'journal' ? <><p>{known.length === 6 ? 'Every dream has bloomed. Your collection is complete!' : `${known.length} of 6 varieties discovered. Every new bloom leaves a memory here.`}</p><div className="journal-grid">{definition.outcomes.map((o, i) => <article className={`journal-entry ${known.includes(i + 1) ? 'found' : 'undiscovered'}`} key={o.name}><Flower id={i + 1}/><span className="eyebrow">{rarity[i]} · {o.chanceBps / 100}%</span><h3>{o.name}</h3><p>{known.includes(i + 1) ? lore[i] : 'Waiting to be discovered.'}</p><span className="owned">{snapshot.inventory[i].toString()} owned · {amount(o.reward)} RF each</span><button disabled={disabled || snapshot.inventory[i] === 0n} onClick={() => void act(async () => { const e = epoch.current; await client.redeem(i + 1, 1n); if (epoch.current === e) { setNotice(`${o.name} redeemed for ${amount(o.reward)} simulated RF.`); cue('reward'); } })}>Redeem one</button></article>)}</div><p className="fine">Redeeming removes one owned flower and credits simulated RF. Its discovery and any decorative garden display remain for this session. “Keep & replant” frees a spot without redeeming the flower.</p></> :
      menu === 'settings' ? <><button className="secondary wide" aria-pressed={!muted} onClick={toggleSound}>{muted ? 'Sound off — turn on' : 'Sound on — turn off'}</button><label className="setting"><input type="checkbox" checked={reduced} onChange={e => setReduced(e.target.checked)}/> Reduce motion</label><p>This garden lives for one session. Reloading clears your plots, flowers, and simulated RF. Changing Friends starts a new garden layout.</p><p>Wallet connection and Friend ownership checks are handled by FriendSDK. This game does not send transactions.</p></> : <><ol className="steps"><li><strong>Pick a dream seed.</strong> Open the seed shop. Each seed costs 1 simulated RF.</li><li><strong>Choose a spot.</strong> Tap any of the six plots, then Plant a seed. Confirm the simulated action.</li><li><strong>Give it some care.</strong> Water twice. Wait five seconds, then reveal your flower.</li><li><strong>Make room for another dream.</strong> Keep & replant stores the flower in your journal and clears the spot.</li></ol><p>Use touch or a mouse. With a keyboard, Tab moves between controls and Enter or Space activates them. Escape closes menus.</p><p>Watering and plot choice do not change the odds. Growth pauses while menus are open or the page is hidden.</p></>}
      {error && <p role="alert">{error}</p>}
    </GameMenu>}
    {reveal && <GameMenu title="Something lovely has bloomed" onClose={disabled ? undefined : () => setReveal(null)}><div className="reveal"><Flower id={reveal}/><span className="eyebrow">{rarity[reveal - 1]} · {definition.outcomes[reveal - 1].chanceBps / 100}% CHANCE</span><h2>{definition.outcomes[reveal - 1].name}</h2><p>{lore[reveal - 1]}</p><p className="fine">Added to your journal · {amount(definition.outcomes[reveal - 1].reward)} simulated RF redemption value</p><button className="primary wide" disabled={disabled} onClick={() => setReveal(null)}>Let it bloom</button></div></GameMenu>}
  </section>;
}

