
'use strict';
(() => {
const F=window.ChatrajnorakFiction;
if(!F||!window.ChatrajnorakChess)throw Error('Game content or chess rules failed to load.');
const TYPES={P:'Pawn',N:'Knight',B:'Bishop',R:'Rook',Q:'Queen',K:'King'};
const SYMBOL={w:{K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙'},b:{K:'♚',Q:'♛',R:'♜',B:'♝',N:'♞',P:'♟'}};
const WORTH={P:1,N:3,B:3,R:5,Q:9,K:1000};
const COST={P:1,N:2,B:2,R:3,Q:4};
const QUOTAS={P:5,N:2,B:2,R:2,Q:1};
const SAVE_KEY='chatrajnorak-v05a'; // A separate save slot keeps v0.4 campaigns intact.
const ENCOUNTERS=F.encounters;
const names=F.recruitNames;
const places=F.recruitPlaces;
const histories=F.recruitHistories;
const roleFaces={K:'♟',Q:'✦',R:'▣',B:'◇',N:'◆',P:'•'};
const doc=id=>document.getElementById(id);
let game=null, selectedStart=[], selectedUnit=null, selectedCell=null, legalForCell=[], deploy={}, kingPos={r:7,c:4}, current=null, lastMove=null, pendingPromotion=null, offers=[], lastReport='', aiThinking=false;
const initialPool=Object.values(F.survivors).map(u=>({id:u.id,name:u.name,age:u.age,type:u.type,origin:u.origin,history:u.history}));
const king={id:'king',name:'Our Leader',age:'unknown',type:'K',origin:'the highway',history:'Their history is still being written.',xp:0};
function fresh(){return {phase:'choose',roster:[],scrap:0,wins:0,losses:0,battles:0,mortalSecure:false,encounter:null,lastResult:null,records:[],nextEventId:1,offerNonce:0,moveHistory:[],battle:null,flavor:'',offers:[],reveals:{},captureActs:[]};}
function makeMember(src){return {...src,xp:src.xp||0,missions:src.missions||0};}
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(game));}catch(e){}}
function load(){try{const d=JSON.parse(localStorage.getItem(SAVE_KEY));if(d && d.phase && Array.isArray(d.roster)){d.reveals=d.reveals||{};d.captureActs=d.captureActs||[];return d;}}catch(e){}return null;}
function event(type,details={}){game.records.push({id:game.nextEventId||(game.records.at(-1)?.id||0)+1,type,day:'campaign',at:new Date().toISOString(),...details});game.nextEventId=game.records.at(-1).id+1;if(game.records.length>280)game.records=game.records.slice(-280);save();}
function ann(s){doc('announce').textContent=s;}
const {mkr,emptyBoard,cloneBoard,inside,getKing,attacked,inCheck,pseudo,apply,legal,hash,drawCause,insufficient}=window.ChatrajnorakChess;
function battleBoard(){const b=emptyBoard();b[kingPos.r][kingPos.c]=mkr('w','K','king');
  for(const [id,pos] of Object.entries(deploy)){const u=game.roster.find(a=>a.id===id);if(u)b[pos.r][pos.c]=mkr('w',u.type,id);}
  const enemies=game.encounter?.enemies||ENCOUNTERS.westRoad.enemies;
  for(const [i,[type,r,c,id]] of enemies.entries())b[r][c]=mkr('b',type,id||'enemy-'+i);
  const st={board:b,ep:null,turn:'w',halfmove:0,counts:{},ply:0};st.counts[hash(st)]=1;return st;
}
function rosterTypeCounts(ids){const counts={P:0,N:0,B:0,R:0,Q:0};for(const id of ids){const t=initialPool.find(p=>p.id===id)?.type;if(t)counts[t]++;}return counts;}
function chooseStart(id){if(selectedStart.includes(id))selectedStart=selectedStart.filter(x=>x!==id);else{if(selectedStart.length>=5){ann('Maximum five companions.');return;}const u=initialPool.find(x=>x.id===id);if(rosterTypeCounts(selectedStart)[u.type]>=QUOTAS[u.type]){ann('Piece cap reached.');return;}selectedStart.push(id);}render();}
function startCampaign(){
  if(selectedStart.length<1)return;
  const party=selectedStart.map(id=>initialPool.find(x=>x.id===id));
  const names=party.map(u=>u.name+' ('+TYPES[u.type]+')').join('\n');
  showConfirm('Begin the Chronicle?',names+'\n\nYour starting companions cannot be changed afterward.','Begin Chronicle',()=>{
    game.roster=party.map(makeMember);
    game.phase='campaign';
    event('party_founded',{members:game.roster.map(u=>({id:u.id,name:u.name,role:u.type}))});
    render();
  });
}
function enterDialogue(){
  const order=F.encounterOrder;
  const key=order[Math.min(game.battles,order.length-1)];
  game.encounter={...ENCOUNTERS[key],number:game.battles+1};
  game.phase='dialogue';game.flavor='start';save();render();
}
function dialogueChoice(which){
  const choice=game.encounter?.options?.find(o=>o.id===which);
  if(!choice)return;
  game.flavor=which;game.phase='dialogue_reply';
  event('negotiation_attempted',{encounterId:game.encounter.id,approach:which});render();
}
function beginDeploy(){game.phase='deploy';game.encounter=game.encounter||{...ENCOUNTERS.westRoad,number:game.battles+1};deploy={};kingPos={r:7,c:4};selectedUnit=null;selectedCell=null;current=null;pendingPromotion=null;game.battle=null;game.moveHistory=[];game.captureActs=[];save();render();}
// Deployment is not a chess move. Any piece may start on either home rank.
// Special moves are still checked later by the existing chess-rules engine.
function canDeploy(u,r,c){return !!u&&(r===6||r===7);}
function clickDeploy(r,c){
  if(kingPos.r===r&&kingPos.c===c){selectedUnit='king';render();return;}
  const existing=Object.entries(deploy).find(([id,pos])=>pos.r===r&&pos.c===c);
  if(existing){delete deploy[existing[0]];selectedUnit=existing[0];render();return;}
  if(!selectedUnit)return;
  const u=selectedUnit==='king'?king:game.roster.find(x=>x.id===selectedUnit);
  if(!canDeploy(u,r,c)){const message='Place units on rank 1 or rank 2.';ann(message);doc('boardHelp').textContent=message;return;}
  if(selectedUnit==='king')kingPos={r,c};
  else{delete deploy[selectedUnit];deploy[selectedUnit]={r,c};}
  selectedUnit=null;render();
}
function autoDeploy(){deploy={};const preferred={R:[[7,0],[7,7]],N:[[7,1],[7,6]],B:[[7,2],[7,5]],Q:[[7,3]],P:[]};
  const used=new Set([kingPos.r+','+kingPos.c]);for(const u of game.roster.slice(0,15)){let site;
    const candidates=[...(preferred[u.type]||[]),...Array.from({length:8},(_,c)=>[6,c]),...Array.from({length:8},(_,c)=>[7,c])];
    for(const [r,c] of candidates)if(!used.has(r+','+c)&&canDeploy(u,r,c)){site={r,c};break;}
    if(site){deploy[u.id]=site;used.add(site.r+','+site.c);}
  }selectedUnit=null;render();
}
function reveal(){
  if(!Object.keys(deploy).length){ann('Deploy at least one companion.');return;}
  const candidate=battleBoard();
  if(inCheck(candidate.board,'w')||inCheck(candidate.board,'b')){
    const message='Invalid formation: neither King may begin in check. Rearrange your team.';
    ann(message);doc('boardHelp').textContent=message;return;
  }
  current=candidate;game.battle=current;game.phase='reveal';
  event('formation_revealed',{kingSquare:sq(kingPos.r,kingPos.c),deployment:Object.entries(deploy).map(([id,s])=>({id,square:sq(s.r,s.c)})),encounter:game.encounter?.id});render();
}
// Deployment is committed when skirmish begins. No wagers and no retries.
function startFight(){
  game.phase='battle';game.battle=current;
  game.battleStartEventId=game.nextEventId; // Mark uncommitted attempt telemetry.
  current.counts=current.counts||{[hash(current)]:1};
  save();render();ann('Your move. Select a survivor, then a highlighted square.');
}
function sq(r,c){return 'abcdefgh'[c]+(8-r);}
function moveStr(m){return sq(m.r,m.c)+'→'+sq(m.tr,m.tc)+(m.promotion?'='+m.promotion:'')+(m.special==='castleK'?' (O-O)':m.special==='castleQ'?' (O-O-O)':m.special==='enpassant'?' (en passant)':'');}
function clickBattle(r,c){if(aiThinking||!current||current.turn!=='w'||game.phase!=='battle'||pendingPromotion)return;
  const p=current.board[r][c];if(selectedCell){const matches=legalForCell.filter(m=>m.tr===r&&m.tc===c);
    if(matches.length){const promos=matches.filter(x=>x.promotion);if(promos.length){pendingPromotion=promos;doc('promotion').hidden=false;doc('promotionButtons').innerHTML=promos.map(m=>`<button class="btn" data-promote="${m.promotion}">${SYMBOL.w[m.promotion]} ${TYPES[m.promotion]}</button>`).join('');doc('promotionButtons').querySelectorAll('button').forEach(b=>b.onclick=()=>choosePromotion(b.dataset.promote));return;}
      performMove(matches[0],'w');return;}}
  if(p?.side==='w'){selectedCell={r,c};legalForCell=legal(current.board,current,'w').filter(m=>m.r===r&&m.c===c);ann(TYPES[p.type]+': '+legalForCell.length+' legal destinations.');}else{selectedCell=null;legalForCell=[];}renderBoard();}
function choosePromotion(type){const m=pendingPromotion?.find(x=>x.promotion===type);if(!m)return;pendingPromotion=null;doc('promotion').hidden=true;performMove(m,'w');}
function performMove(m,side){const moving=current.board[m.r][m.c],next=apply(current.board,current,m);lastMove=m;current={...current,...next,ply:(current.ply||0)+1,counts:{...(current.counts||{})}};
  current.counts[hash(current)]=(current.counts[hash(current)]||0)+1;
  const message=moveStr(m)+(next.captured?' · captured '+TYPES[next.captured.type]:'');game.moveHistory.push((side==='w'?'Survivors: ':'Raiders: ')+message);
  if(next.captured){
    if(side==='w'&&moving.id!=='king')game.captureActs.push({actorId:moving.id,capturedId:next.captured.id});
    event('piece_captured',{capturedId:next.captured.id,actorId:moving.id,bySide:side,role:next.captured.type,move:moveStr(m)});
  }
  if(m.special==='castleK'||m.special==='castleQ')event('castled',{side,kingId:moving.id,wing:m.special==='castleK'?'kingside':'queenside'});
  if(m.special==='enpassant')event('en_passant',{side,actor:moving.id,captured:next.captured?.id});
  if(m.promotion)event('pawn_promoted_in_battle',{side,actor:moving.id,role:m.promotion});
  selectedCell=null;legalForCell=[];game.battle=current;save();render();
  const moves=legal(current.board,current,current.turn);
  if(!moves.length&&inCheck(current.board,current.turn)){if(current.turn==='b')win();else resolveBattle('defeat','checkmate');return;}
  const drawn=drawCause(current);if(drawn){resolveBattle('draw',drawn);return;}
  if(side==='w'){
    aiThinking=true;doc('boardHelp').textContent='The raiders are considering their move…';
    setTimeout(()=>{if(game.phase==='battle'){const reply=chooseEnemyMove();aiThinking=false;if(reply)performMove(reply,'b');else render();}else aiThinking=false;},220);
  }else{ann((inCheck(current.board,'w')?'CHECK. ':'')+'Your turn.');}
}
function chooseEnemyMove(){const moves=legal(current.board,current,'b');if(!moves.length)return null;
  let best=moves[0],bestScore=-1e12;
  for(const m of moves){const after=apply(current.board,current,m),captured=after.captured;
    let score=(captured?WORTH[captured.type]*120:0)+(m.promotion?WORTH[m.promotion]*75:0)+(m.special?.startsWith('castle')?24:0);
    if(inCheck(after.board,'w'))score+=32;
    const responses=legal(after.board,after,'w');if(!responses.length&&inCheck(after.board,'w'))score+=100000;
    if(!responses.length&&!inCheck(after.board,'w'))score-=500;
    if(responses.length){let biggest=0;for(const r of responses){const target=after.board[r.tr][r.tc],attacker=after.board[r.r][r.c];if(target?.side==='b')biggest=Math.max(biggest,(WORTH[target.type]-(WORTH[attacker.type]||1)*.15)*110);}
      score-=biggest*.85;
    }
    // Favor moving toward the center, but deliberately keep a beginner-like tactical weakness.
    score+=(3.5-Math.abs(3.5-m.tc))*1.8+(3.5-Math.abs(3.5-m.tr))*1.6;
    // Deterministic tie-breaking means retries preserve learnable enemy behavior.
    if(score>bestScore){bestScore=score;best=m;}
  }return best;
}
function survivalMet(board,encounter){
  if(encounter?.survivalRule==='enemy_count_below'){
    return board.flat().filter(p=>p?.side==='b').length <= encounter.maxEnemyPieces;
  }
  if(encounter?.survivalRule==='remove_targets'){
    return encounter.targetIds.every(id=>!board.flat().some(p=>p?.side==='b'&&p.id===id));
  }
  // Pre-update saved encounters may carry the old condition; honor it mid-battle.
  if(encounter?.survivalRule==='escort'){
    return board.flat().filter(p=>p?.side==='w'&&p.type!=='K').length >= (encounter.minAllies||1);
  }
  throw new Error('Encounter has no authored survival rule.');
}
function resolveBattle(result,reason){
  if(result==='draw'){
    // A stalemate/repetition is an unresolved attempt, not a historical battle.
    // Restore the pre-attempt history as well as the complete companion roster.
    if(Number.isInteger(game.battleStartEventId)){
      game.records=game.records.filter(e=>e.id<game.battleStartEventId);
      game.nextEventId=game.battleStartEventId;
    }
    game.battleStartEventId=null;
    game.drawReason=reason;
    game.drawRestorable=true;
    game.captureActs=[];
    game.phase='draw';
    game.battle=current; // Retain the final position for review until redeployment.
    save();render();
    return;
  }
  game.battleStartEventId=null; // Victory/defeat commits the attempt to history.
  const live=game.roster.filter(u=>Object.hasOwn(deploy,u.id)&&current.board.some(row=>row.some(p=>p?.side==='w'&&p.id===u.id)));
  const casualties=game.roster.filter(u=>Object.hasOwn(deploy,u.id)&&!live.some(v=>v.id===u.id));
  const friendlyRemaining=current.board.flat().filter(p=>p?.side==='w'&&p.type!=='K').length;
  const enemyRemaining=current.board.flat().filter(p=>p?.side==='b').length;
  const before=game.mortalSecure;
  // The first defeat can be fatal: mortal security is earned, never gifted.
  const leaderSurvived=result!=='defeat'||before||survivalMet(current.board,game.encounter);
  game.roster=game.roster.filter(u=>!casualties.some(k=>k.id===u.id));
  for(const u of live){
    const soldier=current.board.flat().find(p=>p?.side==='w'&&p.id===u.id);
    const saved=game.roster.find(x=>x.id===u.id);
    if(saved){
      const gain=1+(game.captureActs||[]).filter(a=>a.actorId===saved.id).length;
      const oldXP=saved.xp||0;
      saved.xp=oldXP+gain;saved.missions=(saved.missions||0)+1;
      event('survivor_xp_gained',{id:saved.id,name:saved.name,amount:gain,newXP:saved.xp,encounterId:game.encounter?.id});
    }
    if(saved&&soldier&&soldier.type!==saved.type){const old=saved.type;saved.type=soldier.type;event('promotion_persisted',{id:saved.id,from:old,to:saved.type});}
  }
  for(const u of casualties)event('companion_removed',{id:u.id,name:u.name,role:u.type,encounter:game.encounter?.id,disposition:'capture_or_death_undetermined'});
  if(result==='victory'){
    game.wins++;game.scrap+=3;game.mortalSecure=true;
  }else if(result==='defeat'){
    game.losses++;game.mortalSecure=false;
  }
  game.battles++;game.captureActs=[];
  game.lastResult={result,reason,encounter:game.encounter?.name||'Encounter',casualties:casualties.map(u=>u.name),friendlyRemaining,enemyRemaining,leaderSurvived,secureBefore:before,secureAfter:game.mortalSecure,plies:current.ply||0,turns:Math.ceil((current.ply||0)/2)};
  // History only records the decisive outcome. Individual chess moves remain telemetry.
  event('battle_resolved',{...game.lastResult,encounterId:game.encounter?.id,battleNumber:game.battles,casualtyIds:casualties.map(u=>u.id)});
  if(result==='victory'){
    game.phase='victory';game.flavor='won';generateOffers(0); // Legacy recruitment; redesign follows in v0.5b.
  }else if(result==='draw'){
    game.phase='draw';game.flavor='drawn';
  }else{
    game.phase=leaderSurvived?'defeat':'campaign_over';game.flavor=leaderSurvived?'defeated':'leader_died';
  }
  game.battle=current;lastReport=result==='victory'?'The settlement survived the encounter.':result==='draw'?'The battle ended without checkmate.':'The settlement suffered a decisive defeat.';
  save();render();
}
function win(){resolveBattle('victory','checkmate');}
function nextMember(type){const seed=game.offerNonce++;return makeMember({id:'recruit-'+Date.now()+'-'+seed,type,name:names[seed%names.length],age:'about '+(18+(seed*7)%51),origin:places[(seed+2)%places.length],history:histories[(seed+4)%histories.length],arrival:F.arrivals[seed%F.arrivals.length]});}
function rollPower(xp){const chance=Math.min(.82,.20+xp*.10);if(Math.random()<chance){const pool=xp>=4?['N','B','R','Q']:xp>=2?['N','B','R']:['N','B'];return pool[Math.floor(Math.random()*pool.length)];}return 'P';}
function generateOffers(xp){offers=[nextMember('P'),nextMember(rollPower(xp)),nextMember(rollPower(xp))];game.offers=offers;game.offerXP=xp;save();}
function recruit(id){const unit=(game.offers||[]).find(u=>u.id===id);if(!unit)return;if(game.scrap<COST[unit.type])return;
  game.scrap-=COST[unit.type];game.roster.push(unit);game.offers=game.offers.filter(u=>u.id!==id);
  event('survivor_recruited',{id:unit.id,name:unit.name,role:unit.type,cost:COST[unit.type],from:'raider aftermath',arrival:unit.arrival||F.arrivals[game.offerNonce%F.arrivals.length]});render();
}
function returnToCamp(){game.phase='campaign';game.flavor=game.lastResult?.result||'';game.offers=[];deploy={};kingPos={r:7,c:4};current=null;game.battle=null;selectedUnit=null;selectedCell=null;save();render();}
function replayDeadlock(){
  if(game.phase!=='draw')return;
  // The existing encounter stays selected. Redeployment is free and casualties
  // from a deadlocked attempt never reached the persistent roster.
  game.phase='deploy';game.drawReason=null;game.drawRestorable=false;
  deploy={};kingPos={r:7,c:4};current=null;lastMove=null;
  selectedUnit=null;selectedCell=null;legalForCell=[];pendingPromotion=null;
  game.battle=null;game.moveHistory=[];save();render();
}
function beginAgain(){showConfirm('Begin a new campaign?',
  'Erase this campaign and its recorded history? This cannot be undone.',
  'Erase & begin again',()=>{
    localStorage.removeItem(SAVE_KEY);selectedStart=[];deploy={};kingPos={r:7,c:4};
    current=null;lastMove=null;game=fresh();render();
    if(!doc('detailsModal').hidden)closeDetails();
  });}
function downloadEvents(){const lines=game.records.map(r=>JSON.stringify(r)).join('\n')+'\n';const blob=new Blob([lines],{type:'application/x-ndjson;charset=utf-8'}),url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='chatrajnorak-events-v05a.jsonl';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function playerText(p){if(!p)return '';return `<b>${p.name}</b><small>${TYPES[p.type]} · ${p.age} · met at ${p.origin}</small>`;}
function renderStory(){
 const e=game.encounter||ENCOUNTERS.westRoad;
 const outcome=game.lastResult;
 let h='';
 switch(game.phase){
 case 'choose':
   h=`<div class="eyebrow">Twenty years after the collapse</div><h2>WHO WALKS WITH OUR LEADER?</h2><p>${F.setting.opening}</p><div class="narrative">${F.setting.settlement}</div>`;break;
 case 'campaign':
   h=`<div class="eyebrow">The settlement · ${game.battles} recorded battles</div><h2>${outcome?.result==='defeat'?'AFTER THE DEFEAT':game.wins?'STILL STANDING':'A PLACE TO BEGIN'}</h2><p>${game.roster.length?F.setting.settlement:'The last defenders have not returned. The settlement has no party ready for another battle.'}</p><div class="hint">Our Leader: ${game.mortalSecure?'SECURE · one defeat can be survived':'VULNERABLE · checkmate may be fatal'}. ${game.wins} victories · ${game.losses} defeats.</div>`;break;
 case 'dialogue':
   h=`<div class="eyebrow">Encounter ${game.battles+1} · ${e.name}</div><h2>${e.title}</h2><p>${e.scene}</p><div class="narrative"><strong>${e.speaker}:</strong> ${e.openingLine}</div>`;break;
 case 'dialogue_reply':
   h=`<div class="eyebrow">The encounter cannot be avoided</div><h2>${e.title}</h2><p>${e.options.find(o=>o.id===game.flavor)?.reply||e.preparation}</p><div class="hint">${e.preparation}</div>`;break;
 case 'deploy':
   h=`<div class="eyebrow">Deployment · ${e.name}</div><h2>EVERY POSITION MATTERS</h2><p>${e.preparation} Place Our Leader and companions on either home rank.</p><div class="hint"><strong>Survival briefing:</strong> ${e.deployGuidance}</div><p>Our Leader is <strong>${game.mortalSecure?'secure':'vulnerable'}</strong>. The outcome will become history.</p>`;break;
 case 'reveal':
   h=`<div class="eyebrow">Enemy formation revealed</div><h2>${e.title}</h2><p>${e.scene}</p><div class="hint"><strong>Survival briefing:</strong> ${e.deployGuidance}</div>`;break;
 case 'battle':
   h=`<div class="eyebrow">Battle ${game.battles+1} · decisive</div><h2>${current?.turn==='w'?'OUR MOVE':'THE ENEMY RESPONDS'}</h2><p>${e.preparation}</p><div class="hint">${(current?.ply||0)>=1?e.firstMoveGuidance:e.deployGuidance}</div>`;break;
 case 'defeat':
   h=`<div class="eyebrow">Recorded defeat · Our Leader survived</div><h2>THE COST OF RETREAT</h2><p>${e.defeat}</p><p>${outcome?.casualties.length||0} companions lost. Mortal security is gone.</p><div class="narrative">${outcome?.secureBefore?'Our Leader survives this defeat, but has lost their protection.':'The battle ends in defeat, but the required escape conditions were met.'}</div>`;break;
 case 'campaign_over':
   h=`<div class="eyebrow">The Chronicle concludes</div><h2>OUR LEADER HAS FALLEN</h2><p>${e.death}</p><div class="narrative">The settlement must now be remembered without the person who led it.</div>`;break;
 case 'draw':
   h=`<div class="eyebrow">Unresolved encounter · ${game.drawReason||'draw'}</div><h2>THE FIGHT IS NOT FINISHED</h2><p>The standstill changes no history. Every companion is restored for a new attempt at the same encounter.</p>${game.drawRestorable?'':'<p class="hint">This draw was saved before the restoration fix. Earlier losses cannot be automatically recovered.</p>'}`;break;
 case 'victory':
   h=`<div class="eyebrow">Recorded victory · defenders endured</div><h2>${e.title}</h2><p>${e.victory}</p><p>Our Leader earned mortal security. ${outcome?.casualties.length||0} companions lost. +3 scrap.</p><div class="hint">Until v0.5b, survivor recruitment still uses the existing scrap-purchase rules.</div>`;break;
 }
 doc('story').innerHTML=h;
}
let selectionPage=0,previousPhase=null;
const PAGE_SIZE=4;
function listPage(items,makeButton){
  const total=Math.max(1,Math.ceil(items.length/PAGE_SIZE));
  selectionPage=Math.max(0,Math.min(total-1,selectionPage));
  const shown=items.slice(selectionPage*PAGE_SIZE,(selectionPage+1)*PAGE_SIZE);
  return `<div class="people">${shown.map(makeButton).join('')}</div><div class="pager"><button class="btn tiny" type="button" data-page="-1" ${selectionPage===0?'disabled':''}>◀ Previous</button><span>${selectionPage+1} / ${total}</span><button class="btn tiny" type="button" data-page="1" ${selectionPage===total-1?'disabled':''}>Next ▶</button></div>`;
}
function actionButtons(...buttons){return `<div class="actionrow">${buttons.join('')}</div>`;}
function cmdTitle(title,hint=''){return `<div class="cmd-head"><h2>${title}</h2></div>${hint?`<p class="cmd-hint">${hint}</p>`:''}`;}
function controlsHTML(){switch(game.phase){
  case 'choose':return cmdTitle(`Choose survivors · ${selectedStart.length}/5`,'Select 1–5 companions. Use Next for more.')+
    listPage(initialPool,u=>`<button class="person ${selectedStart.includes(u.id)?'sel':''}" data-start="${u.id}" aria-pressed="${selectedStart.includes(u.id)}"><span class="glyph">${SYMBOL.w[u.type]}</span><span class="detail">${playerText(u)}</span></button>`)+
    actionButtons(`<button class="btn primary" id="begin" ${selectedStart.length?'':'disabled'}>Start chronicle →</button>`);
  case 'campaign':return cmdTitle(`Settlement · ${game.mortalSecure?'SECURE':'VULNERABLE'}`,`${game.wins}W / ${game.losses}L`)+
    `<p class="cmd-narrative">${game.roster.length?F.setting.settlement:'The settlement has no deployable companions. The next recruitment system is still pending.'}</p>`+
    actionButtons(`<button class="btn primary" id="goRaid" ${game.roster.length?'':'disabled'}>Travel to next encounter →</button>`);
  case 'dialogue':return cmdTitle(game.encounter?.threat||'An encounter')+
    `<p class="cmd-narrative">${game.encounter?.openingLine||''}</p>`+
    actionButtons(...(game.encounter?.options||[]).map((o,i)=>`<button class="btn ${i===0?'primary':''}" data-talk="${o.id}">${o.label}</button>`));
  case 'dialogue_reply':return cmdTitle('Prepare to defend')+`<p class="cmd-narrative">${game.encounter?.preparation||''}</p>`+
    actionButtons('<button class="btn primary" id="toDeploy">Prepare the party →</button>');
  case 'deploy':return cmdTitle('Choose your formation',game.encounter?.shortGuidance||'Review survival conditions in Details.')+
    listPage([king,...game.roster],u=>`<button class="person ${selectedUnit===u.id?'sel':''} ${u.id==='king'||deploy[u.id]?'placed':''}" data-deploy="${u.id}" aria-pressed="${selectedUnit===u.id}"><span class="glyph">${SYMBOL.w[u.type]}</span><span class="detail"><b>${u.name}${u.id==='king'?' · '+sq(kingPos.r,kingPos.c):deploy[u.id]?' · '+sq(deploy[u.id].r,deploy[u.id].c):''}</b><small>${TYPES[u.type]}${u.id==='king'?' · mandatory':' · '+u.xp+' XP'}</small></span></button>`)+
    actionButtons('<button class="btn" id="autoDeploy">Auto-arrange</button>',`<button class="btn primary" id="toReveal" ${Object.keys(deploy).length?'':'disabled'}>Reveal enemy →</button>`);
  case 'reveal':return cmdTitle('Formation revealed',game.encounter?.shortGuidance||'Encounter')+
    `<p class="cmd-narrative">${game.encounter?.shortGuidance||game.encounter?.deployGuidance}</p>`+
    actionButtons('<button class="btn primary" id="toBattle">Begin skirmish →</button>');
  case 'battle':return cmdTitle(`${game.mortalSecure?'SECURE':'VULNERABLE'} · ${current?.turn==='w'?'Your move':'Raiders move'}`,`Battle ${game.battles+1}`)+
    `<p class="cmd-narrative">${(current?.ply||0)>=1?game.encounter?.firstMoveGuidance:game.moveHistory.slice(-2).join(' · ')||'Choose your first move.'}</p>`;
  case 'defeat':return cmdTitle('Defeat · Our Leader survives')+
    `<p class="cmd-narrative">${game.lastResult?.casualties.length||0} companions lost. Security is gone. The final board is preserved for review.</p>`+
    actionButtons('<button class="btn primary" id="returnCamp">Return to settlement →</button>');
  case 'campaign_over':return cmdTitle('Our Leader has fallen')+
    `<p class="cmd-narrative">Campaign ended. Review the final board or the Chronicle in Details.</p>`+
    actionButtons('<button class="btn primary" id="newCampaign">New campaign →</button>');
  case 'draw':return cmdTitle(`Deadlock · ${game.drawReason||'draw'}`)+
    `<p class="cmd-narrative">No decisive battle recorded. ${game.drawRestorable?'Your full pre-battle party is available.':'Older saved casualties may remain lost.'} Redeploy for the same encounter.</p>`+
    actionButtons('<button class="btn primary" id="replayDeadlock">Rearrange & replay →</button>');
  case 'victory':return cmdTitle(`Victory · ${game.scrap} scrap`,'Arrivals at the gate · temporary scrap purchase rules.')+
    `<div class="offer-container">${(game.offers||[]).map(u=>`<div class="offerline"><div><b>${SYMBOL.w[u.type]} ${u.name} · ${TYPES[u.type]}</b><small>${u.age} · ${u.origin} · ${u.arrival||F.arrivals[game.offerNonce%F.arrivals.length]}</small></div><button class="btn tiny" data-recruit="${u.id}" ${game.scrap>=COST[u.type]?'':'disabled'}>Recruit · ${COST[u.type]}</button></div>`).join('')||'<p>Recruitment complete.</p>'}</div>`+
    actionButtons('<button class="btn primary" id="returnCamp">Return to settlement →</button>');
  default:return '';
}}

function renderControls(){doc('controls').innerHTML=controlsHTML();const on=(id,func)=>{const b=doc(id);if(b)b.onclick=func;};
  doc('controls').querySelectorAll('[data-page]').forEach(el=>el.onclick=()=>{selectionPage+=Number(el.dataset.page);renderControls();});
  doc('controls').querySelectorAll('[data-start]').forEach(el=>el.onclick=()=>chooseStart(el.dataset.start));
  doc('controls').querySelectorAll('[data-talk]').forEach(el=>el.onclick=()=>dialogueChoice(el.dataset.talk));
  doc('controls').querySelectorAll('[data-deploy]').forEach(el=>el.onclick=()=>{selectedUnit=el.dataset.deploy;render();});
  doc('controls').querySelectorAll('[data-recruit]').forEach(el=>el.onclick=()=>recruit(el.dataset.recruit));
  on('begin',startCampaign);on('goRaid',enterDialogue);on('toDeploy',beginDeploy);on('autoDeploy',autoDeploy);on('toReveal',reveal);on('toBattle',startFight);on('returnCamp',returnToCamp);on('replayDeadlock',replayDeadlock);on('newCampaign',beginAgain);
}
function renderBoard(){const defeated=game.phase==='defeat'||game.phase==='campaign_over';
 const b=game.phase==='battle'||game.phase==='reveal'||game.phase==='victory'||game.phase==='draw'||defeated?current?.board:game.phase==='deploy'?deployBoard():null;
 doc('boardPanel').classList.toggle('is-defeated',defeated&&!!b);
 const board=doc('board');let html='';const allowed=legalForCell;for(let r=0;r<8;r++)for(let c=0;c<8;c++){
  const p=b?.[r]?.[c]||null;const home=game.phase==='deploy'&&(r===6||r===7);const sel=selectedCell?.r===r&&selectedCell?.c===c;const lm=lastMove&&(lastMove.tr===r&&lastMove.tc===c);const legalDest=allowed.some(m=>m.tr===r&&m.tc===c),check=p?.type==='K'&&b&&inCheck(b,p.side);const side=p?.side;
  const person=side==='w'?(p.id==='king'?king:game.roster.find(u=>u.id===p.id)):null;
  const label=p?`${sq(r,c)} ${side==='w'?'friendly':'raider'} ${TYPES[p.type]} ${person?.name||''}`:`${sq(r,c)} empty`;
  html+=`<button type="button" class="square ${(r+c)%2?'dark':'light'} ruined ${home?'validhome':''} ${sel?'focused':''} ${legalDest?'legal':''} ${legalDest&&p?'capture':''} ${lm?'lastmove':''} ${check?'check':''}" data-r="${r}" data-c="${c}" aria-label="${label}" aria-pressed="${!!sel}" title="${label}">${p?`<span class="sprite ${side==='b'?'enemy':''} ${p.type==='K'?'king':''}"><span class="head" aria-hidden="true">${side==='b'?'☠':'♟'}</span><span class="role" aria-hidden="true">${SYMBOL[side][p.type]}</span></span>`:''}<span class="coords" aria-hidden="true">${sq(r,c)}</span></button>`;
 }
 board.innerHTML=html;board.querySelectorAll('.square').forEach(el=>el.onclick=()=>{const r=Number(el.dataset.r),c=Number(el.dataset.c);if(game.phase==='deploy')clickDeploy(r,c);else if(game.phase==='battle')clickBattle(r,c);});
 let note='';if(defeated&&b)note='Final position — inspect the board, then continue.';else if(game.phase==='deploy')note=game.encounter?.shortGuidance||'Check the encounter survival briefing.';
 else if(game.phase==='battle')note='Select a survivor → choose a highlighted destination. Tap/click on either device.';
 else if(game.phase==='reveal')note='The enemy is revealed. This battle is decisive.';
 else if(b)note='Chess battlefield · 8 × 8 · top = raiders, bottom = survivors';else note='A standard 8 × 8 battlefield awaits your survivors.';
 doc('boardHelp').textContent=note;
}
function deployBoard(){const b=emptyBoard();b[kingPos.r][kingPos.c]=mkr('w','K','king');for(const [id,pos] of Object.entries(deploy)){const u=game.roster.find(u=>u.id===id);if(u)b[pos.r][pos.c]=mkr('w',u.type,id);}return b;}
function renderStats(){doc('stats').innerHTML=`<div class="statrow"><span class="pill gold">${game.scrap} scrap</span><span class="pill">${game.roster.length} companions</span><span class="pill">${game.wins} wins</span><span class="pill">${game.losses} losses</span><span class="pill">${game.mortalSecure?'SECURE':'VULNERABLE'}</span></div><p class="small muted" style="margin-top:10px">No wagers or defeat retries. Only decisive battles enter the Chronicle; deadlocks can be replayed. Our Leader begins vulnerable and earns security through victory.</p>`;}
function narrativeFor(u){return F.survivors[u.id]||null;}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function renderRoster(){
 doc('roster').innerHTML=game.roster.length?game.roster.map(u=>{
   const a=narrativeFor(u),did=game.reveals?.[u.id]||{};
   const ready=a&&((u.xp>=1&&!did.present)||(u.xp>=3&&!did.past));
   return `<div class="offerline"><div><b>${SYMBOL.w[u.type]} ${esc(u.name)} <span class="pill">${u.xp} XP</span></b><small>${TYPES[u.type]} · ${esc(u.age)} · ${esc(u.origin)}</small><small>${esc(a?.concern||u.history)}</small></div><button type="button" class="btn tiny ${ready?'primary':''}" data-talk-to="${esc(u.id)}">${ready?'Conversation ready':'Speak'}</button></div>`;
 }).join(''):'<p class="small muted">No companions yet.</p>';
}
function renderEvents(){
 const allowed=new Set(['party_founded','battle_resolved','survivor_recruited','survivor_recollection_shared','companion_removed','negotiation_attempted']);
 const history=game.records.filter(r=>allowed.has(r.type)&&(r.type!=='battle_resolved'||r.result!=='draw'));
 doc('events').innerHTML=history.slice(-18).reverse().map(r=>{
   if(r.type==='party_founded')return `<p><time>#${r.id}</time>The settlement's first defenders gathered: ${esc((r.members||[]).map(x=>x.name||F.survivors[x.id]?.name||x.id).join(', '))}.</p>`;
   if(r.type==='battle_resolved')return `<p><time>#${r.id}</time><b>${esc(r.encounter)}:</b> ${esc(r.result.toUpperCase())} · ${r.casualties?.length||0} companions lost · ${r.leaderSurvived?'Our Leader survived':'Our Leader fell'} · ${r.turns} turns</p>`;
   if(r.type==='companion_removed')return `<p><time>#${r.id}</time>${esc(r.name||F.survivors[r.id]?.name||'A companion')} was lost in battle. Whether captured or killed remains unknown.</p>`;
   if(r.type==='survivor_recruited')return `<p><time>#${r.id}</time>${esc(r.name||'A traveler')} joined the settlement. ${esc(r.arrival||'')}</p>`;
   if(r.type==='survivor_recollection_shared')return `<p><time>#${r.id}</time>${esc(r.name)} shared a ${r.tier==='past'?'recollection':'personal account'}. This is ${esc(r.name)}'s testimony, not verified world history.</p>`;
   if(r.type==='negotiation_attempted')return `<p><time>#${r.id}</time>Our Leader attempted to negotiate at ${esc(F.encounters[Object.keys(F.encounters).find(k=>F.encounters[k].id===r.encounterId)]?.name||'an encounter')}. The confrontation continued.</p>`;
   return '';
 }).join('')||'<p>The Chronicle will remember decisions, arrivals, battles and personal testimony.</p>';
}
function render(){document.body.dataset.phase=game.phase;if(previousPhase!==game.phase){selectionPage=0;previousPhase=game.phase;}renderStory();renderControls();renderBoard();renderStats();renderRoster();renderEvents();save();}
function showDetails(){
   doc('detailsTitle').textContent='Settlement Chronicle';
   doc('detailsExport').hidden=false;doc('detailsReset').hidden=false;
   const available=game.phase==='choose'?`<section class="details-section"><h3>People at the gate</h3>${initialPool.map(u=>`<div class="offerline"><div><b>${esc(u.name)} · ${TYPES[u.type]}</b><small>${esc(F.survivors[u.id]?.concern||u.history)}</small></div></div>`).join('')}</section>`:'<section class="details-section"><h3>People who are here</h3>'+doc('roster').innerHTML+'</section>';
   doc('detailsBody').innerHTML=`<section class="details-section"><h3>From the settlement</h3>${doc('story').innerHTML}</section><section class="details-section"><h3>Campaign state</h3>${doc('stats').innerHTML}</section>${available}<section class="details-section"><h3>What the world remembers</h3><p class="small muted">An individual's recollection is testimony, not established history.</p>${doc('events').innerHTML}</section>`;
   doc('detailsModal').hidden=false;doc('detailsClose').focus();
 }
 function showSurvivor(id){
   const u=game.roster.find(x=>x.id===id);if(!u)return;
   const a=narrativeFor(u);const seen=game.reveals?.[id]||{};
   doc('detailsTitle').textContent=u.name+' · '+TYPES[u.type];
   doc('detailsExport').hidden=true;doc('detailsReset').hidden=true;
   const block=(tier,label,xp,passage)=>{
      if(!a)return '';
      if(u.xp<xp)return `<p class="small muted">${label} · becomes available at ${xp} XP</p>`;
      return `<section class="recollection"><h3>${label}</h3>${seen[tier]?`<p class="narrative">${esc(passage)}</p><p class="small muted">Previously shared · personal testimony</p>`:`<button class="btn primary" type="button" data-hear="${tier}" data-person="${esc(id)}">Hear ${label.toLowerCase()} →</button>`}</section>`;
   };
   doc('detailsBody').innerHTML=`<button class="btn tiny" type="button" data-back-chronicle>← Back to Chronicle</button><p class="small muted">${esc(u.age)} · ${esc(u.origin)} · ${u.xp} XP · ${u.missions||0} battles survived</p><div class="narrative">${esc(a?.intro||'A new arrival is still finding their place among the settlement’s people.')}</div><p>${esc(a?.concern||u.history)}</p>${block('present','Present-day conversation',1,a?.present)}${block('past','A personal recollection',3,a?.past)}`;
   doc('detailsModal').hidden=false;
 }
 function hearSurvivor(id,tier){
   const u=game.roster.find(x=>x.id===id),a=narrativeFor(u);
   const minimum=tier==='present'?1:tier==='past'?3:null;
   if(!u||!a||minimum===null||u.xp<minimum)return;
   game.reveals=game.reveals||{};game.reveals[id]=game.reveals[id]||{};
   if(!game.reveals[id][tier]){
     game.reveals[id][tier]=true;
     event('survivor_recollection_shared',{survivorId:id,name:u.name,tier,passageId:id+'_'+tier,source:'personal_testimony'});
   }
   showSurvivor(id);renderEvents();save();
 }
 function closeDetails(){doc('detailsModal').hidden=true;doc('detailsBtn').focus();}

 document.addEventListener('click',ev=>{
   const talk=ev.target.closest('[data-talk-to]');if(talk){showSurvivor(talk.dataset.talkTo);return;}
   const hear=ev.target.closest('[data-hear]');if(hear){hearSurvivor(hear.dataset.person,hear.dataset.hear);return;}
   if(ev.target.closest('[data-back-chronicle]'))showDetails();
 });
 doc('detailsBtn').onclick=showDetails;
 doc('detailsClose').onclick=closeDetails;
 doc('detailsModal').addEventListener('click',e=>{if(e.target===doc('detailsModal'))closeDetails();});
 doc('detailsExport').onclick=downloadEvents;
 doc('detailsReset').onclick=beginAgain;
 let confirmAction=null,confirmReturnFocus=null;
 function showConfirm(title,message,acceptText,action){
   confirmReturnFocus=document.activeElement;
   confirmAction=action;
   doc('confirmTitle').textContent=title;
   doc('confirmBody').textContent=message;
   doc('confirmAccept').textContent=acceptText;
   doc('confirmModal').hidden=false;
   doc('confirmCancel').focus();
 }
 function closeConfirm(accepted=false){
   if(doc('confirmModal').hidden)return;
   const action=confirmAction,focus=confirmReturnFocus;
   doc('confirmModal').hidden=true;confirmAction=null;confirmReturnFocus=null;
   if(accepted){if(action)action();}
   else if(focus?.isConnected)focus.focus();
 }
 doc('confirmCancel').onclick=()=>closeConfirm(false);
 doc('confirmAccept').onclick=()=>closeConfirm(true);
 doc('confirmModal').addEventListener('click',e=>{if(e.target===doc('confirmModal'))closeConfirm(false);});
 document.addEventListener('keydown',e=>{
   if(e.key==='Escape'){
     if(!doc('confirmModal').hidden){closeConfirm(false);return;}
     if(!doc('detailsModal').hidden)closeDetails();
   }
 });
 doc('exportBtn').onclick=downloadEvents;doc('resetBtn').onclick=beginAgain;
doc('board').addEventListener('keydown',e=>{if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const node=e.target.closest('.square');if(!node)return;e.preventDefault();let r=Number(node.dataset.r),c=Number(node.dataset.c);if(e.key==='ArrowUp')r=Math.max(0,r-1);if(e.key==='ArrowDown')r=Math.min(7,r+1);if(e.key==='ArrowLeft')c=Math.max(0,c-1);if(e.key==='ArrowRight')c=Math.min(7,c+1);if(e.key==='Home')c=0;if(e.key==='End')c=7;doc('board').querySelector(`[data-r="${r}"][data-c="${c}"]`)?.focus();});
window.__AGDG_TEST__={emptyBoard,mkr,apply,pseudo,legal,inCheck,attacked,drawCause,hash,insufficient,battleBoard,survivalMet,resolveBattle,getGame:()=>game,getCurrent:()=>current,showSurvivor,hearSurvivor,enterDialogue,beginDeploy};
game=load()||fresh();if(['reveal','battle','victory','draw','defeat','campaign_over'].includes(game.phase))current=game.battle||null;
if(game.phase==='deploy')deploy={};if(game.phase==='choose')selectedStart=[];
if(game.phase==='victory')offers=game.offers||[];
render();
})();
