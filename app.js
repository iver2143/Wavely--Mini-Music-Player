/* Wavely*/
'use strict';

const DEMO = [
  {id:'demo-midnight',title:'Midnight Drive',artist:'Wavely Originals',duration:24,src:'audio/midnight-drive.wav',variant:'violet',demo:true},
  {id:'demo-lowtide',title:'Low Tide',artist:'Wavely Originals',duration:24,src:'audio/low-tide.wav',variant:'teal',demo:true},
  {id:'demo-pixel',title:'Pixel Sunrise',artist:'Wavely Originals',duration:24,src:'audio/pixel-sunrise.wav',variant:'orange',demo:true}
];
const VARIANTS = ['lime','blue','pink','violet','teal','orange'];
const $ = id => document.getElementById(id);
const audio = $('audio');
const state = {
  imported:new Map(), db:null, view:'home', search:'',
  favorites:new Set(loadJSON('wavely-favorites',[])),
  playlists:loadJSON('wavely-playlists',[]),
  currentId:DEMO[0].id,queue:DEMO.map(t=>t.id),isPlaying:false,
  shuffle:false,repeat:0,volume:.8,lastVolume:.8,objectURL:null,toastTimer:null,dragDepth:0
};
function loadJSON(key,fallback){try{const value=JSON.parse(localStorage.getItem(key));return Array.isArray(value)?value:fallback;}catch{return fallback;}}
function savePrefs(){try{localStorage.setItem('wavely-favorites',JSON.stringify([...state.favorites]));localStorage.setItem('wavely-playlists',JSON.stringify(state.playlists));}catch{toast('Lagring av spillelister er ikke tilgjengelig i denne nettleseren.',true);}}
function esc(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function icon(name){return `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;}
function time(n){if(!Number.isFinite(n)||n<0)return '0:00';return Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');}
function tracks(){return [...DEMO,...state.imported.values()].sort((a,b)=>a.demo===b.demo?(a.demo?0:b.addedAt-a.addedAt):a.demo?-1:1);}
function findTrack(id){return DEMO.find(t=>t.id===id)||state.imported.get(id)||null;}
function selectedPlaylist(){return state.view.startsWith('playlist:')?state.playlists.find(p=>p.id===state.view.substring(9)):null;}
function viewTracks(){const all=tracks();if(state.view==='liked')return all.filter(t=>state.favorites.has(t.id));const pl=selectedPlaylist();if(state.view.startsWith('playlist:'))return pl?pl.trackIds.map(findTrack).filter(Boolean):[];return all;}
function filteredTracks(){const q=state.search.trim().toLocaleLowerCase('no');return !q?viewTracks():viewTracks().filter(t=>`${t.title} ${t.artist}`.toLocaleLowerCase('no').includes(q));}
function setCover(node,variant){node.className=node.className.replace(/\bcover-(violet|teal|orange|lime|blue|pink)\b/g,'').trim()+' cover-'+(variant||'violet');}
function updateRange(el,pct){el.style.setProperty('--pct',`${Math.min(100,Math.max(0,pct))}%`);}
function toast(message,error=false){const el=$('toast');el.textContent=message;el.classList.toggle('error',error);el.classList.add('show');clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>el.classList.remove('show'),3800);}

function renderNavigation(){
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',state.view===el.dataset.view));
  $('likedCount').textContent=state.favorites.size;
  $('likedFeatureCount').textContent=`${state.favorites.size} lagrede låter`;
  $('importedCount').textContent=state.imported.size?`${state.imported.size} egne låter`:'Legg til egne låter';
  $('playlistNav').innerHTML=state.playlists.map(p=>`<button class="${state.view==='playlist:'+p.id?'active':''}" data-playlist="${esc(p.id)}"><span class="playlist-dot">${icon('music')}</span><span class="playlist-name">${esc(p.name)}</span></button>`).join('');
}
function renderHeader(){
  const pl=selectedPlaylist();
  const headings={home:['OPPDAG LYDEN','Spill noe bra','Tre korte demolåter er klare til avspilling. Du kan også legge til din egen musikk.'],library:['ALT PÅ ETT STED','Musikkbibliotek','Alle demolåtene og lydfilene du har lagt til.'],liked:['DINE FAVORITTER','Lik­te sanger','Samlingen av låter du har markert med et hjerte.']};
  const data=pl?['DIN SPILLELISTE',pl.name,`${pl.trackIds.length} låter i spillelisten`]:headings[state.view]||headings.home;
  $('sectionKicker').textContent=data[0];$('listTitle').textContent=data[1];$('listDescription').textContent=data[2];
  $('crumb').textContent=state.view==='home'?'HJEM':state.view==='library'?'BIBLIOTEK':state.view==='liked'?'LIKTE SANGER':pl?.name.toLocaleUpperCase('no')||'SPILLELISTE';
  $('hero').hidden=state.view!=='home';$('homeExtras').hidden=state.view!=='home';
  $('playlistAction').hidden=!pl;$('addToPlaylistAction').hidden=!pl;
}
function renderSongs(){
  const displayed=filteredTracks(),body=$('tracksBody');
  body.innerHTML=displayed.map((track,i)=>{
    const isCurrent=state.currentId===track.id,like=state.favorites.has(track.id);
    return `<div class="track-row ${isCurrent?'is-active':''}" data-id="${esc(track.id)}">
      <span class="track-number">${isCurrent&&state.isPlaying?'♫':i+1}</span>
      <div class="track-song" data-action="play" title="Spill ${esc(track.title)}"><div class="track-art cover-${track.variant}">${icon('music')}</div><div class="song-meta"><strong>${esc(track.title)}</strong><small>${track.demo?'DEMO · ORIGINAL':'EGEN LYDFIL'}</small></div></div>
      <span class="song-artist">${esc(track.artist)}</span><span class="song-duration">${time(track.duration)}</span>
      <div class="track-tools"><button class="mini-action ${like?'liked':''}" data-action="like" title="${like?'Fjern fra likte sanger':'Lik låten'}" aria-label="${like?'Fjern fra likte sanger':'Lik låten'}">${icon('heart')}</button><button class="mini-action" data-action="more" title="Flere valg" aria-label="Flere valg">${icon('more')}</button></div>
    </div>`;
  }).join('');
  const empty=!displayed.length;$('emptyState').hidden=!empty;
  if(empty){
    const noMatches=!!state.search.trim(),isFav=state.view==='liked',isPlaylist=state.view.startsWith('playlist:');
    $('emptyTitle').textContent=noMatches?'Ingen treff':isFav?'Ingen favoritter ennå':isPlaylist?'Spillelisten er tom':'Ingen låter her ennå';
    $('emptyDescription').textContent=noMatches?'Prøv et annet søkeord.':isFav?'Trykk på hjertet ved en låt for å lagre den.':isPlaylist?'Legg til låter fra biblioteket.':'Last opp din egen lydfil for å komme i gang.';
    $('emptyUpload').textContent=isPlaylist?'Legg til låter':'Last opp musikk';
    $('emptyUpload').hidden=noMatches||isFav;
  }
}
function renderNowPlaying(){
  const t=findTrack(state.currentId)||DEMO[0];const fav=state.favorites.has(t.id);
  $('nowTitle').textContent=$('playerTitle').textContent=t.title;
  $('nowArtist').textContent=$('playerArtist').textContent=t.artist;
  setCover($('nowArt'),t.variant);setCover($('playerArt'),t.variant);
  ['nowLike','barLike'].forEach(id=>$(id).classList.toggle('liked',fav));
  $('playIcon').innerHTML=`<use href="#i-${state.isPlaying?'pause':'play'}"/>`;
  $('playButton').setAttribute('aria-label',state.isPlaying?'Pause':'Spill av');
  $('nowStatus').textContent=state.isPlaying?'SPILLER':'PAUSE';
  $('liveDot').classList.toggle('on',state.isPlaying);
  $('eq').classList.toggle('playing',state.isPlaying);
  $('shuffleButton').classList.toggle('active',state.shuffle);
  $('repeatButton').classList.toggle('active',state.repeat!==0);
  $('repeatOne').hidden=state.repeat!==2;
  $('repeatButton').title=['Gjenta: av','Gjenta: alle','Gjenta: én'][state.repeat];
  $('timeDuration').textContent=time(Number.isFinite(audio.duration)?audio.duration:t.duration);
  renderQueue();
}
function renderQueue(){
  let queue=state.queue.filter(id=>!!findTrack(id));
  let index=queue.indexOf(state.currentId);
  let next=queue.slice(index+1,index+4);
  if(!next.length&&state.repeat===1)next=queue.slice(0,3).filter(id=>id!==state.currentId);
  $('queueCount').textContent=`${queue.length} LÅTER`;
  $('upNext').innerHTML=next.length?next.map(id=>{const t=findTrack(id);return `<button class="queue-song" data-queue-id="${esc(id)}"><div class="track-art cover-${t.variant}">${icon('music')}</div><div><strong>${esc(t.title)}</strong><small>${esc(t.artist)}</small></div></button>`;}).join(''):'<p class="queue-empty">Ingen flere låter i køen.<br>Velg en sang fra biblioteket.</p>';
}
function renderAll(){renderNavigation();renderHeader();renderSongs();renderNowPlaying();}
function navigate(view){state.view=view;state.search='';$('searchInput').value='';renderAll();$('mainScroll').scrollTop=0;$('sidebar').classList.remove('open');}

async function playTrack(id,queue=null){
  const t=findTrack(id);if(!t){toast('Fant ikke lydfilen.',true);return;}
  if(queue?.length)state.queue=queue.filter(x=>!!findTrack(x));
  if(!state.queue.includes(id))state.queue=[id,...state.queue];
  if(state.currentId!==id||!audio.src){
    audio.pause();if(state.objectURL){URL.revokeObjectURL(state.objectURL);state.objectURL=null;}
    state.currentId=id;
    if(t.demo){audio.src=t.src;}else if(t.blob){state.objectURL=URL.createObjectURL(t.blob);audio.src=state.objectURL;}else{toast('Finner ikke filen. Legg den til på nytt.',true);return;}
    audio.load();
  }
  try{await audio.play();}catch(error){state.isPlaying=false;toast('Kunne ikke spille av. Kontroller at nettleseren støtter lydformatet.',true);console.warn('Playback error:',error);}
  renderNowPlaying();renderSongs();
}
function togglePlay(){if(!audio.src){playTrack(state.currentId,state.queue);return;}if(audio.paused){audio.play().catch(()=>toast('Kunne ikke starte avspilling.',true));}else audio.pause();}
function nextTrack(fromEnded=false){
  const q=state.queue.filter(id=>!!findTrack(id));if(!q.length)return;
  if(fromEnded&&state.repeat===2){audio.currentTime=0;audio.play().catch(()=>{});return;}
  if(state.shuffle&&q.length>1){const others=q.filter(id=>id!==state.currentId);const next=others[Math.floor(Math.random()*others.length)];playTrack(next);return;}
  const pos=q.indexOf(state.currentId),next=q[pos+1];
  if(next){playTrack(next);return;}
  if(state.repeat===1){playTrack(q[0]);return;}
  if(!fromEnded){playTrack(q[0]);return;}
  state.isPlaying=false;renderNowPlaying();renderSongs();
}
function prevTrack(){if(audio.currentTime>3){audio.currentTime=0;return;}const q=state.queue.filter(id=>!!findTrack(id));const pos=q.indexOf(state.currentId);if(pos>0)playTrack(q[pos-1]);else if(q.length)playTrack(q[q.length-1]);}
function toggleLike(id){if(!findTrack(id))return;if(state.favorites.has(id))state.favorites.delete(id);else state.favorites.add(id);savePrefs();renderAll();}

function openDB(){return new Promise((resolve,reject)=>{if(!window.indexedDB){reject(new Error('IndexedDB is unavailable'));return;}const req=indexedDB.open('wavely-audio',1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('tracks'))req.result.createObjectStore('tracks',{keyPath:'id'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
function dbGetAll(db){return new Promise((resolve,reject)=>{const req=db.transaction('tracks','readonly').objectStore('tracks').getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
function dbPut(record){return new Promise((resolve,reject)=>{if(!state.db){resolve(false);return;}const req=state.db.transaction('tracks','readwrite').objectStore('tracks').put(record);req.onsuccess=()=>resolve(true);req.onerror=()=>reject(req.error);});}
function dbDelete(id){return new Promise((resolve,reject)=>{if(!state.db){resolve();return;}const req=state.db.transaction('tracks','readwrite').objectStore('tracks').delete(id);req.onsuccess=()=>resolve();req.onerror=()=>reject(req.error);});}
function audioDuration(file){return new Promise(resolve=>{const url=URL.createObjectURL(file),temp=new Audio(),timeout=setTimeout(()=>finish(0),8000);let done=false;function finish(sec){if(done)return;done=true;clearTimeout(timeout);temp.removeAttribute('src');temp.load();URL.revokeObjectURL(url);resolve(sec);}temp.onloadedmetadata=()=>finish(Number.isFinite(temp.duration)?temp.duration:0);temp.onerror=()=>finish(0);temp.src=url;temp.load();});}
function artistFromFilename(filename){const title=filename.replace(/\.[^.]+$/,'').replace(/[_]+/g,' ').trim();const split=title.split(/\s+-\s+/);return split.length>=2?{artist:split[0].trim(),title:split.slice(1).join(' - ').trim()}:{artist:'Min musikk',title:title||'Ukjent låt'};}
async function importFiles(files){
  const selected=[...files].filter(file=>file.type.startsWith('audio/')||/\.(mp3|wav|ogg|oga|m4a|flac|aac|opus|webm)$/i.test(file.name));
  if(!selected.length){toast('Velg en lydfil (f.eks. MP3 eller WAV).',true);return;}
  let success=0,failed=0;
  for(const file of selected){
    if(file.size>80*1024*1024){failed++;continue;}
    const name=artistFromFilename(file.name);const duration=await audioDuration(file);
    const id='upload-'+(crypto.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2));
    const record={id,...name,blob:file,duration,variant:VARIANTS[Math.floor(Math.random()*VARIANTS.length)],addedAt:Date.now()+success,demo:false};
    state.imported.set(id,record);success++;
    try{await dbPut(record);}catch(error){console.warn('Could not persist audio file:',error);failed++;}
  }
  renderAll();if(success){navigate('library');toast(`${success} ${success===1?'låt lagt':'låter lagt'} til i biblioteket!${failed?' Noen filer ble ikke lagret.':''}`);}
  else toast('Ingen filer ble lagt til. Prøv en mindre lydfil.',true);
  $('fileInput').value='';
}
async function removeUpload(id){const t=state.imported.get(id);if(!t)return;if(state.currentId===id){audio.pause();audio.removeAttribute('src');audio.load();state.currentId=DEMO[0].id;state.queue=DEMO.map(t=>t.id);state.isPlaying=false;if(state.objectURL){URL.revokeObjectURL(state.objectURL);state.objectURL=null;}}
  state.imported.delete(id);state.favorites.delete(id);state.playlists.forEach(p=>p.trackIds=p.trackIds.filter(tid=>tid!==id));savePrefs();try{await dbDelete(id);}catch{toast('Kunne ikke slette filen fra nettleserlagringen.',true);}renderAll();toast(`«${t.title}» fjernet fra biblioteket.`);
}

function showModal(title,html,onOpen){$('modalTitle').textContent=title;$('modalBody').innerHTML=html;$('modalBackdrop').hidden=false;onOpen?.();}
function closeModal(){$('modalBackdrop').hidden=true;$('modalBody').innerHTML='';}
function newPlaylistModal(){showModal('Ny spilleliste',`<form id="newPlaylistForm"><label class="modal-label" for="playlistName">NAVN PÅ SPILLELISTEN</label><input class="modal-input" id="playlistName" maxlength="45" placeholder="F.eks. Fredagsstemning" required/><div class="modal-actions"><button type="button" class="modal-secondary" id="cancelModal">Avbryt</button><button type="submit" class="btn-primary">Opprett spilleliste ${icon('plus')}</button></div></form>`,()=>{$('playlistName').focus();$('cancelModal').onclick=closeModal;$('newPlaylistForm').onsubmit=e=>{e.preventDefault();const name=$('playlistName').value.trim();if(!name)return;const id='pl-'+(crypto.randomUUID?.()||Date.now());state.playlists.push({id,name,trackIds:[]});savePrefs();closeModal();navigate('playlist:'+id);toast('Spillelisten er opprettet!');};});}
function addToPlaylistModal(trackId){
  const t=findTrack(trackId);if(!t)return;
  if(!state.playlists.length){showModal('Ingen spillelister',`<p class="modal-info">Du har ingen spillelister ennå. Opprett en spilleliste først.</p><button class="btn-primary" id="goCreate">Opprett spilleliste</button>`,()=>{$('goCreate').onclick=()=>{closeModal();newPlaylistModal();};});return;}
  showModal('Legg til i spilleliste',`<p class="modal-info">Velg en spilleliste for «${esc(t.title)}».</p>${state.playlists.map(p=>`<button class="modal-option" data-add-playlist="${esc(p.id)}">${icon(p.trackIds.includes(trackId)?'check':'plus')}<span>${esc(p.name)}</span></button>`).join('')}`,()=>{document.querySelectorAll('[data-add-playlist]').forEach(el=>el.onclick=()=>{const p=state.playlists.find(p=>p.id===el.dataset.addPlaylist);if(!p)return;if(!p.trackIds.includes(trackId))p.trackIds.push(trackId);savePrefs();closeModal();renderAll();toast(`Lagt til i «${p.name}»!`);});});
}
function chooseTracksModal(){const pl=selectedPlaylist();if(!pl)return;const all=tracks();showModal('Legg til låter',`<p class="modal-info">Trykk på en låt for å legge den til eller fjerne den fra «${esc(pl.name)}».</p><div class="modal-library">${all.map(t=>`<button class="modal-option" data-toggle-track="${esc(t.id)}"><span>${esc(t.title)} <span style="color:#9199a5;font-size:10px">– ${esc(t.artist)}</span></span>${icon(pl.trackIds.includes(t.id)?'check':'plus')}</button>`).join('')}</div>`,()=>{document.querySelectorAll('[data-toggle-track]').forEach(el=>el.onclick=()=>{const id=el.dataset.toggleTrack;if(pl.trackIds.includes(id))pl.trackIds=pl.trackIds.filter(x=>x!==id);else pl.trackIds.push(id);savePrefs();el.innerHTML=`<span>${esc(findTrack(id)?.title||'Låt')}</span>${icon(pl.trackIds.includes(id)?'check':'plus')}`;renderAll();});});}
function actionsModal(id){const t=findTrack(id),pl=selectedPlaylist();if(!t)return;showModal(t.title,`<p class="modal-info">${esc(t.artist)}</p><button class="modal-option" data-modal-action="like">${icon('heart')} ${state.favorites.has(id)?'Fjern fra likte sanger':'Legg til likte sanger'}</button><button class="modal-option" data-modal-action="playlist">${icon('plus')} Legg til i spilleliste</button>${pl&&pl.trackIds.includes(id)?`<button class="modal-option" data-modal-action="remove-from-list">${icon('close')} Fjern fra denne spillelisten</button>`:''}${!t.demo?`<button class="modal-option" data-modal-action="delete" style="color:#ffb1a9">${icon('trash')} Slett fra biblioteket</button>`:''}`,()=>{document.querySelectorAll('[data-modal-action]').forEach(el=>el.onclick=()=>{const action=el.dataset.modalAction;closeModal();if(action==='like')toggleLike(id);else if(action==='playlist')addToPlaylistModal(id);else if(action==='remove-from-list'){pl.trackIds=pl.trackIds.filter(x=>x!==id);savePrefs();renderAll();toast('Låten ble fjernet fra spillelisten.');}else if(action==='delete')confirmDelete(id);});});}
function confirmDelete(id){const t=findTrack(id);showModal('Slette lydfil?',`<p class="modal-info">Vil du fjerne «${esc(t?.title||'denne låten')}» fra dette musikkbiblioteket? Denne handlingen kan ikke angres.</p><div class="modal-actions"><button class="modal-secondary" id="cancelDelete">Avbryt</button><button class="btn-primary" id="confirmDelete">Slett låten</button></div>`,()=>{$('cancelDelete').onclick=closeModal;$('confirmDelete').onclick=()=>{closeModal();removeUpload(id);};});}
function confirmDeletePlaylist(){const pl=selectedPlaylist();if(!pl)return;showModal('Slette spilleliste?',`<p class="modal-info">Spillelisten «${esc(pl.name)}» slettes, men låtene beholdes i biblioteket.</p><div class="modal-actions"><button class="modal-secondary" id="cancelDelete">Avbryt</button><button class="btn-primary" id="confirmDelete">Slett spilleliste</button></div>`,()=>{$('cancelDelete').onclick=closeModal;$('confirmDelete').onclick=()=>{state.playlists=state.playlists.filter(x=>x.id!==pl.id);savePrefs();closeModal();navigate('library');toast('Spillelisten ble slettet.');};});}

function bindEvents(){
  document.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click',()=>navigate(el.dataset.view)));
  $('playlistNav').addEventListener('click',e=>{const button=e.target.closest('[data-playlist]');if(button)navigate('playlist:'+button.dataset.playlist);});
  document.querySelectorAll('[data-go]').forEach(el=>el.addEventListener('click',()=>navigate(el.dataset.go)));
  ['uploadButton','sideUploadButton','heroUpload','featureUpload'].forEach(id=>$(id).addEventListener('click',()=>$('fileInput').click()));
  $('emptyUpload').addEventListener('click',()=>state.view.startsWith('playlist:')?chooseTracksModal():$('fileInput').click());
  $('fileInput').addEventListener('change',e=>importFiles(e.target.files));
  $('newPlaylistButton').addEventListener('click',newPlaylistModal);$('playlistAction').addEventListener('click',confirmDeletePlaylist);$('addToPlaylistAction').addEventListener('click',chooseTracksModal);
  $('heroPlay').addEventListener('click',()=>{const first=filteredTracks()[0]||DEMO[0];playTrack(first.id,filteredTracks().map(t=>t.id));});
  $('searchInput').addEventListener('input',e=>{state.search=e.target.value;renderSongs();});
  $('tracksBody').addEventListener('click',e=>{const row=e.target.closest('[data-id]');if(!row)return;const action=e.target.closest('[data-action]')?.dataset.action||'play';if(action==='like')toggleLike(row.dataset.id);else if(action==='more')actionsModal(row.dataset.id);else playTrack(row.dataset.id,filteredTracks().map(t=>t.id));});
  $('upNext').addEventListener('click',e=>{const btn=e.target.closest('[data-queue-id]');if(btn)playTrack(btn.dataset.queueId);});
  $('nowLike').onclick=$('barLike').onclick=()=>toggleLike(state.currentId);
  $('playButton').addEventListener('click',togglePlay);$('prevButton').addEventListener('click',prevTrack);$('nextButton').addEventListener('click',()=>nextTrack(false));
  $('shuffleButton').addEventListener('click',()=>{state.shuffle=!state.shuffle;renderNowPlaying();toast(state.shuffle?'Tilfeldig avspilling er på.':'Tilfeldig avspilling er av.');});
  $('repeatButton').addEventListener('click',()=>{state.repeat=(state.repeat+1)%3;renderNowPlaying();toast(['Gjenta er av.','Gjenta hele spillekøen.','Gjenta én låt.'][state.repeat]);});
  $('seekBar').addEventListener('input',e=>{const pct=Number(e.target.value);if(Number.isFinite(audio.duration)&&audio.duration>0)audio.currentTime=pct*audio.duration/100;updateRange(e.target,pct);});
  $('volumeBar').addEventListener('input',e=>{state.volume=Number(e.target.value);audio.volume=state.volume;if(state.volume>0)state.lastVolume=state.volume;updateVolume();});
  $('muteButton').addEventListener('click',()=>{state.volume=state.volume>0?0:state.lastVolume||.8;audio.volume=state.volume;$('volumeBar').value=String(state.volume);updateVolume();});
  audio.addEventListener('play',()=>{state.isPlaying=true;renderNowPlaying();renderSongs();});
  audio.addEventListener('pause',()=>{state.isPlaying=false;renderNowPlaying();renderSongs();});
  audio.addEventListener('ended',()=>nextTrack(true));
  audio.addEventListener('timeupdate',()=>{const duration=audio.duration||0,pct=duration?100*audio.currentTime/duration:0;$('seekBar').value=String(pct);updateRange($('seekBar'),pct);$('timeCurrent').textContent=time(audio.currentTime);});
  audio.addEventListener('loadedmetadata',()=>{const t=findTrack(state.currentId);if(t&&Number.isFinite(audio.duration)){t.duration=audio.duration;renderSongs();}$('timeDuration').textContent=time(audio.duration);});
  audio.addEventListener('error',()=>{if(audio.src)toast('Lydfilen kan ikke leses. Prøv et annet format.',true);});
  $('modalClose').onclick=closeModal;$('modalBackdrop').addEventListener('click',e=>{if(e.target===$('modalBackdrop'))closeModal();});
  $('menuButton').onclick=()=>$('sidebar').classList.toggle('open');
  document.addEventListener('keydown',e=>{
    const inInput=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||document.activeElement?.isContentEditable;
    if(e.key==='Escape'){closeModal();$('sidebar').classList.remove('open');}
    if(!$('modalBackdrop').hidden||inInput)return;
    if(e.key===' '){e.preventDefault();togglePlay();}
    if(e.key==='/'){e.preventDefault();$('searchInput').focus();}
    if(e.key==='ArrowRight'&&e.altKey){e.preventDefault();nextTrack(false);}
    if(e.key==='ArrowLeft'&&e.altKey){e.preventDefault();prevTrack();}
  });
  document.addEventListener('dragenter',e=>{if(![...e.dataTransfer?.types||[]].includes('Files'))return;e.preventDefault();state.dragDepth++;$('dropOverlay').classList.add('show');});
  document.addEventListener('dragover',e=>{if([...e.dataTransfer?.types||[]].includes('Files'))e.preventDefault();});
  document.addEventListener('dragleave',e=>{e.preventDefault();state.dragDepth=Math.max(0,state.dragDepth-1);if(state.dragDepth===0)$('dropOverlay').classList.remove('show');});
  document.addEventListener('drop',e=>{e.preventDefault();state.dragDepth=0;$('dropOverlay').classList.remove('show');if(e.dataTransfer?.files?.length)importFiles(e.dataTransfer.files);});
}
function updateVolume(){const val=Math.round(state.volume*100);$('volumeText').textContent=val+'%';updateRange($('volumeBar'),val);$('volumeIcon').innerHTML=`<use href="#i-${val===0?'mute':'volume'}"/>`;$('muteButton').title=val===0?'Slå på lyd':'Demp lyd';}
async function init(){
  audio.volume=state.volume;updateVolume();updateRange($('seekBar'),0);bindEvents();
  try{state.db=await openDB();const saved=await dbGetAll(state.db);saved.forEach(t=>{if(t.blob)state.imported.set(t.id,t);});}
  catch(error){console.warn('Browser audio persistence is unavailable:',error);toast('Lydfiler kan spilles av, men lagres kanskje ikke etter at siden lukkes.',true);}
  // Prune references to tracks that have been deleted.
  const valid=new Set(tracks().map(t=>t.id));state.favorites=new Set([...state.favorites].filter(id=>valid.has(id)));state.playlists.forEach(p=>p.trackIds=p.trackIds.filter(id=>valid.has(id)));savePrefs();renderAll();
}
init();
