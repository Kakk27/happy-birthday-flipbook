(function(){
  var $=function(s,r){return (r||document).querySelector(s)};
  var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};

  /* ---------- state ---------- */
  var DEF={name:'Li Engg',nick:'my beloved',age:23,date:'2026-10-26',from:'',
    letter:"Thank you for every little moment, every laugh, and every memory we've shared. I hope this year is gentle with you and brings you closer to everything you've been wishing for. Stay healthy, stay happy, and keep being the amazing person you are."};
  var S={};for(var k in DEF)S[k]=DEF[k];
  try{var saved=JSON.parse(localStorage.getItem('flipbook-v1')||'null');if(saved)for(var k2 in saved)if(k2 in DEF)S[k2]=saved[k2]}catch(e){}
  var photos={};
  try{var savedPhotos=JSON.parse(localStorage.getItem('flipbook-photos')||'null');if(savedPhotos)photos=savedPhotos}catch(e){}
  var DB={
    open:function(cb){if(!window.indexedDB)return cb&&cb(null);var req=indexedDB.open('flipbook_db',1);req.onupgradeneeded=function(e){var db=e.target.result;if(!db.objectStoreNames.contains('photos'))db.createObjectStore('photos')};req.onsuccess=function(e){cb&&cb(e.target.result)};req.onerror=function(){cb&&cb(null)}},
    get:function(k,cb){DB.open(function(db){if(!db)return cb&&cb(null);try{var tx=db.transaction('photos','readonly'),req=tx.objectStore('photos').get(k);req.onsuccess=function(){cb&&cb(req.result)};req.onerror=function(){cb&&cb(null)}}catch(e){cb&&cb(null)}})},
    set:function(k,v,cb){DB.open(function(db){if(!db)return cb&&cb(false);try{var tx=db.transaction('photos','readwrite');tx.objectStore('photos').put(v,k);tx.oncomplete=function(){cb&&cb(true)};tx.onerror=function(){cb&&cb(false)}}catch(e){cb&&cb(false)}})}
  };
  DB.get('photos',function(val){if(val&&typeof val==='object'){for(var k in val)photos[k]=val[k];applyPhotos()}});

  var saveTimer = null;
  function syncToServer(patch) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function(){
      fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      }).catch(function(err){ console.error('[Server Save Error]', err); });
    }, 200);
  }

  function savePhotos(){
    try{localStorage.setItem('flipbook-photos',JSON.stringify(photos))}catch(e){}
    DB.set('photos',photos);
    syncToServer({photos: photos});
  }

  var ones=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
  var tens=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
  function words(n){n=Math.max(0,Math.min(99,parseInt(n,10)||0));if(n<20)return ones[n];return tens[Math.floor(n/10)]+(n%10?'-'+ones[n%10]:'')}
  function dateParts(){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(S.date||'');if(!m)m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(DEF.date);return{y:+m[1],m:+m[2],d:+m[3]}}

  /* ---------- page templates ---------- */
  var tones=['#b88a84','#a89079','#8f7b73','#6f5a55','#c4a58d','#9c8573'];
  function toneFor(id){var n=0;for(var i=0;i<id.length;i++)n+=id.charCodeAt(i);return tones[n%tones.length]}
  var HINT='<span class="ph-hint"><b>+</b><i>Add photo</i></span>';
  function ph(id,l,t,w,h,o){o=o||{};
    return '<div class="ph'+(w<30?' sm':'')+'" role="button" tabindex="0" data-id="'+id+'" aria-label="Add a photo" style="left:'+l+'cqw;top:'+t+'cqw;width:'+w+'cqw;height:'+h+'cqw;--tone:'+toneFor(id)+'">'+HINT+'</div>'}
  function fr(id,l,t,w,h,o){o=o||{};var p=o.pad!=null?o.pad:2.2,b=o.bottom!=null?o.bottom:p;
    return '<div class="fr" style="left:'+l+'cqw;top:'+t+'cqw;width:'+w+'cqw;height:'+h+'cqw;'+(o.rot?'transform:rotate('+o.rot+'deg);':'')+(o.bg?'background:'+o.bg+';':'')+'">'+
      '<div class="ph'+(w<30?' sm':'')+'" role="button" tabindex="0" data-id="'+id+'" aria-label="Add a photo" style="left:'+p+'cqw;top:'+p+'cqw;right:'+p+'cqw;bottom:'+b+'cqw;--tone:'+toneFor(id)+'">'+HINT+'</div></div>'}
  function star(cls,l,t,s,r){return '<i class="'+cls+'" style="left:'+l+'cqw;top:'+t+'cqw;width:'+s+'cqw;height:'+s+'cqw;'+(r?'transform:rotate('+r+'deg);':'')+'"></i>'}
  function burst(n,R,r){var p=[];for(var i=0;i<n*2;i++){var a=Math.PI*i/n-Math.PI/2,rad=i%2?r:R;p.push((50+rad*Math.cos(a)).toFixed(1)+','+(50+rad*Math.sin(a)).toFixed(1))}return p.join(' ')}
  function tape(l,t,r){return '<i class="tape" style="left:'+l+'cqw;top:'+t+'cqw;transform:rotate('+r+'deg)"></i>'}

  var PAGES=[
  /* 0 cover */
  {cls:'maroon',html:
    '<div class="dotbg dots-maroon"></div>'+
    star('st',43,12,14,0)+star('sp',16,30,5,0)+star('sp',80,26,6,0)+star('sp',10,100,4,0)+star('st',84,106,3.6,10)+
    '<div class="back-script" style="top:30cqw;font-size:19cqw;line-height:.95">Happy<br>Birthday</div>'+
    '<p class="back-from" style="top:84cqw;font-size:8.5cqw" data-b="name"></p>'+
    '<p class="open-hint">Turn the page <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></p>'},
  /* 1 cake */
  {cls:'',html:
    '<p class="hb"><b>Happy Birthday,</b><span data-b="nick"></span></p>'+
    '<svg class="burst" viewBox="0 0 100 100" style="left:-10cqw;top:32cqw;width:60cqw;height:60cqw" aria-hidden="true"><polygon points="'+burst(11,49,26)+'" fill="#5a0e12"/></svg>'+
    '<img class="hero" alt="A cat in a pink party hat with balloons, a birthday cake and flowers" src="assets/hero.png">'+
    '<svg viewBox="0 0 40 30" style="left:82cqw;top:62cqw;width:11cqw" aria-hidden="true"><path d="M8 20c-4-4-3-10 2-10 2.6 0 4.2 2 4.4 3.4.4-1.8 2.4-3.4 4.8-3.4 5 0 6 6 2 10l-6.6 6z" fill="none" stroke="#c0393f" stroke-width="1.6"/></svg>'+
    '<p class="script-line">A little older,<br>a lot more love</p>'},
  /* 2 deserve */
  {cls:'',html:
    '<p class="deserve">You deserve<br>every beautiful<br>thing —</p>'},
  /* 3 here */
  {cls:'imgpage',html:
    '<div class="fullimg ph" role="button" tabindex="0" data-id="page3" aria-label="Photo" style="background-image:url(assets/page3.jpg)">'+HINT+'</div>'+
    '<p class="here-turn side"><b data-b="name"></b> is turning<br><span data-b="ageWords"></span></p>'},
  /* 4 calendar */
  {cls:'maroon',html:
    '<div class="cal-month" data-b="monthName"></div>'+
    '<div class="cal-year" data-b="year"></div>'+
    '<div class="cal"><div class="cal-grid" data-cal></div></div>'},
  /* 5 letter */
  {cls:'',html:
    '<div class="letter-box"><h3 class="hb2">Happy Birthday</h3><p class="letter" data-b="letter"></p><p class="sign" data-b="fromLine"></p></div>'+
    ph('letter',0,86,100,47.4)},
  /* 6 dots */
  {cls:'',html:
    '<div class="dotbg dots-brown"></div>'+
    fr('p4a',8,9,56,43,{rot:-3,bottom:8})+fr('p4b',13,60,56,43,{rot:2.5,bottom:8})+
    tape(26,6,-6)+tape(34,57,4)+
    '<div class="strip" style="left:72cqw;top:7cqw;width:22cqw;height:112cqw;transform:rotate(3deg)">'+
      [0,1,2,3].map(function(i){return ph('p4s'+(i+1),2,2.4+i*27,18,24.5)}).join('')+'</div>'+
    tape(76,3,8)},
  /* 7 hearts */
  {cls:'hearts',html:
    fr('p5a',27,11,57,54,{pad:1.4})+fr('p5b',27,70,57,54,{pad:1.4})+
    '<svg viewBox="0 0 40 24" style="left:17cqw;top:6cqw;width:22cqw;transform:rotate(-24deg)" aria-hidden="true"><path d="M7 13a4.6 4.6 0 104.6 4.6V8H30a4 4 0 010 8H15" fill="none" stroke="#dfe1e7" stroke-width="2" stroke-linecap="round"/></svg>'+
    star('st silver',69,112,15,12)},
  /* 8 sky */
  {cls:'sky',html:
    (function(){
      var P={A:[70,16,.8],B:[74,25,1.1],C:[66,33,1.1],D:[80,34,.9],E:[60,46,1],F:[57,56,1.9],G:[55,65,.9],H:[47,77,1.1],I:[41,87,.9],J:[38,97,.9],K:[43,106,1],L:[53,112,1.2],M:[62,108,.9],N:[68,100,1],O:[71,91,1.2],Q:[66,92,.8]};
      var E='AB BC BD CE EF FG GH HI IJ JK KL LM MN NO OQ'.split(' ');
      var d=E.map(function(e){return 'M'+P[e[0]][0]+' '+P[e[0]][1]+'L'+P[e[1]][0]+' '+P[e[1]][1]}).join('');
      var c=Object.keys(P).map(function(k){var s=P[k];return k==='F'?'<circle cx="'+s[0]+'" cy="'+s[1]+'" r="3.6" style="fill:#8a1c22;opacity:.25"/><circle cx="'+s[0]+'" cy="'+s[1]+'" r="'+s[2]+'" style="fill:#8a1c22"/>':'<circle cx="'+s[0]+'" cy="'+s[1]+'" r="'+s[2]+'"/>'}).join('');
      return '<svg class="const" viewBox="0 0 100 133.33" width="100%" height="100%" aria-hidden="true"><path d="'+d+'"/><g>'+c+'</g></svg>';
    })()+
    '<div class="words">'+
      '<span style="left:10cqw;top:24cqw">Here’s</span><span style="left:30cqw;top:34cqw">to</span>'+
      '<span style="left:8cqw;top:47cqw">you</span><span style="left:25cqw;top:57cqw">and</span>'+
      '<span style="left:10cqw;top:68cqw">your</span><span style="left:34cqw;top:79cqw">new</span>'+
      '<span style="left:8cqw;top:93cqw">chapter</span></div>'+
    '<svg viewBox="0 0 40 34" style="left:8cqw;top:112cqw;width:13cqw" aria-hidden="true"><path d="M4 26V10M4 13q0-7 6-7t6 7v13M16 13q0-7 6-7t6 7v12q0 4 4 4h3" fill="none" stroke="#1f2c47" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M31 24l5 5-5 5" fill="none" stroke="#1f2c47" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'+
    '<p style="left:24cqw;top:118cqw;font-size:3cqw;letter-spacing:.3em;text-transform:uppercase;color:#1f2c47">Scorpio</p>'+
    '<i class="st" style="color:#5a0e12;left:84cqw;top:56cqw;width:5cqw;height:5cqw"></i>'},
  /* 9 scattered */
  {cls:'maroon',html:
    fr('p7a',35,2,34,22,{pad:.7,bg:'#f4ead9',rot:-2})+fr('p7b',72,18,28,27,{pad:.7,bg:'#f4ead9',rot:3})+
    fr('p7c',0,43,26,25,{pad:.7,bg:'#f4ead9',rot:-3})+fr('p7d',49,63,27,26,{pad:.7,bg:'#f4ead9',rot:2})+
    fr('p7e',11,101,31,27,{pad:.7,bg:'#f4ead9',rot:-2})+fr('p7f',80,97,20,29,{pad:.7,bg:'#f4ead9',rot:3})+
    '<span class="w" style="left:63cqw;top:10cqw">happy</span><span class="w" style="left:31cqw;top:54cqw">(beloved)</span><span class="w" style="left:86cqw;top:77cqw">fav</span>'+
    '<span class="w" style="left:4cqw;top:93cqw" data-b="ageWords"></span><span class="w" style="left:59cqw;top:118cqw">(mine)</span>'},
  /* 10 black */
  {cls:'',html:
    '<div class="dotbg dots-ink"></div>'+
    '<div class="fr" style="left:8cqw;top:23cqw;width:84cqw;height:100cqw;background:#141010">'+
      '<div class="ph" role="button" tabindex="0" data-id="p8a" aria-label="Add a photo" style="left:1.2cqw;top:1.2cqw;width:81.6cqw;height:41.5cqw;--tone:'+toneFor('p8a')+'">'+HINT+'</div>'+
      '<div class="ph" role="button" tabindex="0" data-id="p8b" aria-label="Add a photo" style="left:1.2cqw;top:44cqw;width:81.6cqw;height:54.8cqw;--tone:'+toneFor('p8b')+'">'+HINT+'</div>'+
    '</div>'},
  /* 11 love */
  {cls:'smudge',html:
    '<div class="stamp" style="left:6cqw;top:16cqw;width:51cqw;height:75cqw"><div class="core"></div><i class="e et"></i><i class="e eb"></i><i class="e el"></i><i class="e er"></i>'+ph('p9a',5.2,5.2,40.6,64.6)+'</div>'+
    '<p class="small-cap" style="left:61cqw;top:10cqw;width:32cqw">(1) To the one who makes my heart smile</p>'+
    ph('p9b',60,26,34,23)+
    '<div class="love" style="left:55cqw;top:51cqw">Love</div>'+
    '<p class="small-cap" style="left:88cqw;top:72cqw">(2)</p>'+
    ph('p9c',54,84,40,24)+
    '<p class="small-cap" style="left:6cqw;bottom:9cqw">Wishing you endless happiness</p>'},
  /* 12 navy */
  {cls:'navy',html:
    star('st',5,4,3,0)+star('st',90,6,4,12)+star('st',46,3,2.4,0)+star('sp',92,42,3.4,0)+star('st',4,74,3.4,-10)+star('st',84,76,2.6,0)+star('sp',60,88,3,0)+star('st',10,120,3,0)+star('st',88,124,3.6,8)+
    fr('n1',8,9,41,30,{pad:.9,bg:'#efe4d4'})+fr('n2',51,8,41,32,{pad:.9,bg:'#efe4d4'})+
    fr('n3',8,42,27,28,{pad:.9,bg:'#efe4d4'})+fr('n4',37,43,31,26,{pad:.9,bg:'#efe4d4'})+fr('n5',70,42,22,28,{pad:.9,bg:'#efe4d4'})+
    '<p class="dream">May your dreams find their way to you</p>'},
  /* 13 back */
  {cls:'maroon',html:
    '<div class="dotbg dots-maroon"></div>'+
    star('st',43,14,14,0)+star('sp',16,30,5,0)+star('sp',80,26,6,0)+
    '<div class="back-script">With love,</div>'+
    '<p class="back-from" data-b="from"></p>'+
    '<p class="back-foot">Happy birthday, <span data-b="name"></span></p>'}
  ];

  /* ---------- bind text ---------- */
  function calHTML(){var p=dateParts(),first=new Date(p.y,p.m-1,1).getDay(),n=new Date(p.y,p.m,0).getDate(),h='';
    for(var i=0;i<first;i++)h+='<span class="d"></span>';
    for(var d=1;d<=n;d++)h+='<span class="d'+(d===p.d?' today':'')+'">'+d+'</span>';return h}
  function applyState(){
    var p=dateParts();
    var map={name:S.name||DEF.name,nick:S.nick||'',age:S.age,ageWords:words(S.age),
      monthName:new Date(p.y,p.m-1,1).toLocaleString('en-US',{month:'long'}),year:String(p.y),
      from:S.from||'',fromLine:S.from?'With love, '+S.from:'',letter:S.letter||''};
    $$('[data-b]').forEach(function(el){el.textContent=map[el.getAttribute('data-b')]});
    $$('[data-cal]').forEach(function(el){el.innerHTML=calHTML()});
    var len=(S.letter||'').length;
    $$('.letter').forEach(function(el){
      if(len>500){el.style.fontSize='2.6cqw';el.style.lineHeight='1.36'}
      else if(len>350){el.style.fontSize='3.2cqw';el.style.lineHeight='1.42'}
      else{el.style.fontSize='4cqw';el.style.lineHeight='1.48'}
    });
  }
  function applyPhotos(){
    $$('.ph[data-id]').forEach(function(el){
      var id=el.getAttribute('data-id');
      var u=photos[id];
      if(u){
        el.style.backgroundImage='url("'+u.replace(/"/g, '\\"')+'")';
        el.classList.add('filled');
      } else {
        if(id==='page3'){
          el.style.backgroundImage='url("assets/page3.jpg")';
          el.classList.remove('filled');
        } else {
          el.style.backgroundImage='';
          el.classList.remove('filled');
        }
      }
    });
  }

  /* ---------- book ---------- */
  var stage=$('#stage'),book=$('#book'),prevB=$('#prev'),nextB=$('#next'),dotsEl=$('#dots');
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var T=reduce?30:950;
  book.style.setProperty('--flip',(T/1000)+'s');
  document.documentElement.style.setProperty('--flip',(T/1000)+'s');
  var mode='spread',s=0,minS=0,leaves=[],N=0,maxS=0,seq=null;

  function pageEl(i,side,front){return '<div class="face '+(front||i%2===0?'front':'back')+' side-'+side+'"><div class="pg"><div class="in '+PAGES[i].cls+'">'+PAGES[i].html+'</div></div></div>'}
  function build(){
    book.innerHTML='';leaves=[];
    book.classList.add('instant');
    if(mode==='spread'){
      N=PAGES.length/2;maxS=N;
      for(var k=0;k<N;k++){
        var lf=document.createElement('div');lf.className='leaf';
        lf.innerHTML=pageEl(2*k,'r')+pageEl(2*k+1,'l');
        book.appendChild(lf);leaves.push(lf)}
    }else{
      N=PAGES.length;maxS=N-1;
      for(var i=0;i<N;i++){
        var l2=document.createElement('div');l2.className='leaf';
        l2.innerHTML=pageEl(i,'r',true)+'<div class="face back paperback"></div>';
        book.appendChild(l2);leaves.push(l2)}
    }
    leaves.forEach(function(lf,i){var fl=i<s;lf.classList.toggle('flipped',fl);lf.style.zIndex=fl?i+1:N-i});
    applyState();applyPhotos();shift();buildDots();ui();
    void book.offsetWidth;book.classList.remove('instant');
  }
  function shift(){
    book.style.transform=mode==='spread'?(s===0?'translateX(-25%) rotate(-3deg) scale(.94)':s===maxS?'translateX(25%)':'translateX(0)'):(s===0?'rotate(-2.5deg) scale(.95)':'none');
  }
  function buildDots(){
    dotsEl.innerHTML='';
    for(var i=minS;i<=maxS;i++){var b=document.createElement('button');b.type='button';b.className='dot';b.setAttribute('aria-label',mode==='spread'?(i===0?'Cover':i===maxS?'Back cover':'Spread '+i):(i===0?'Cover':'Page '+i));
      (function(i){b.addEventListener('click',function(e){e.stopPropagation();goTo(i)})})(i);dotsEl.appendChild(b)}
  }
  function ui(){
    $$('.dot',dotsEl).forEach(function(d,i){d.classList.toggle('on',i+minS===s)});
    prevB.disabled=s<=minS;
    nextB.disabled=s>=maxS;
    nextB.setAttribute('aria-label','Next page');
  }
  var lastFlip=0, COOLDOWN=500;
  function flip(dir,force){
    if(!force){
      var now=Date.now();
      if(now-lastFlip<COOLDOWN)return false;
      lastFlip=now;
    }
    if(dir>0&&s>=maxS)return false;
    if(dir<0&&s<=minS)return false;

    prevB.classList.add('cooldown');
    nextB.classList.add('cooldown');
    setTimeout(function(){
      prevB.classList.remove('cooldown');
      nextB.classList.remove('cooldown');
    },COOLDOWN);

    var i=dir>0?s:s-1,lf=leaves[i];
    clearTimeout(lf._t);
    var D=(i===0?Math.round(T*1.45):T);
    book.style.setProperty('--flip',(D/1000)+'s');clearTimeout(book._r);book._r=setTimeout(function(){book.style.setProperty('--flip',(T/1000)+'s')},D+60);
    lf.style.zIndex=dir>0?200-i:100+i;
    lf.classList.remove('turning');void lf.offsetWidth;
    lf.classList.add('turning');lf.classList.toggle('flipped',dir>0);
    s+=dir;shift();ui();setTimeout(sfxFlip,40);
    lf._t=setTimeout(function(){lf.classList.remove('turning');lf.style.zIndex=lf.classList.contains('flipped')?i+1:N-i},D+20);
    return true;
  }
  function goTo(t){
    clearTimeout(seq);
    (function step(){if(s===t)return;flip(s<t?1:-1,true);seq=setTimeout(step,s===t?0:180)})();
  }
  function next(){if(s>=maxS)return;flip(1)}
  function prev(){flip(-1)}
  prevB.addEventListener('click',function(e){e.stopPropagation();prev()});
  nextB.addEventListener('click',function(e){e.stopPropagation();next()});

  /* ---------- fit to screen ---------- */
  function fit(){
    var cs=getComputedStyle(stage);
    var w=stage.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),
        h=stage.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);
    if(!w||!h)return;

    var isLandscape = (w > h);
    var m = (w >= 700 && isLandscape && (w/h >= 1.25)) ? 'spread' : 'single';
    var pw;

    if(m === 'spread'){
      var maxW = Math.max(120, (w - 136) / 2);
      var maxH = Math.max(120, (h - 24) * 0.75);
      pw = Math.floor(Math.min(maxW, maxH, 1000));
    } else {
      var maxW = Math.max(120, w - 24);
      var maxH = Math.max(120, (h - 20) * 0.75);
      pw = Math.floor(Math.min(maxW, maxH, 750));
    }
    pw = Math.max(120, pw);

    if(m!==mode||!leaves.length){
      if(leaves.length){
        if(m==='single'){s=(s===0)?0:(s===maxS)?PAGES.length-1:Math.max(1,2*s-1)}
        else{s=(s===0)?0:(s>=PAGES.length-1)?PAGES.length/2:Math.max(1,Math.floor((s+1)/2))}
      }
      mode=m;
      $('#app').classList.toggle('single',m==='single');
      document.body.classList.toggle('single',m==='single');
      book.style.setProperty('--pw',pw+'px');
      build();
    }else{
      book.style.setProperty('--pw',pw+'px');
    }
  }
  if(window.ResizeObserver)new ResizeObserver(fit).observe(stage);
  window.addEventListener('resize',fit);

  /* ---------- input: click, swipe, keys ---------- */
  var sx=0,sy=0,moved=false,down=false;
  stage.addEventListener('pointerdown',function(e){down=true;moved=false;sx=e.clientX;sy=e.clientY});
  stage.addEventListener('pointerup',function(e){
    if(!down)return;down=false;
    var dx=e.clientX-sx,dy=e.clientY-sy;
    if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)*1.3){moved=true;dx<0?next():prev()}
  });
  stage.addEventListener('pointercancel',function(){down=false});
  stage.addEventListener('click',function(e){
    if(moved){moved=false;return}
    if(e.target.closest('.ph'))return;
    var r=book.getBoundingClientRect(),x=e.clientX-r.left;
    if(mode==='spread'){x>r.width/2?next():prev()}
    else{x>r.width*0.4?next():prev()}
  });
  document.addEventListener('keydown',function(e){
    var tag=(e.target.tagName||'').toLowerCase();
    if(tag==='input'||tag==='textarea')return;
    if(e.key==='ArrowRight'||e.key==='PageDown'){e.preventDefault();next()}
    else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();prev()}
    else if(e.key==='Home'){goTo(minS)}
    else if(e.key==='End'){goTo(maxS)}
    else if(e.key==='Escape'&&!panel.hidden){closePanel()}
  });

  /* ---------- photos ---------- */
  var fileIn=$('#file'),slot=null;
  function pick(el){slot=el.getAttribute('data-id');fileIn.value='';fileIn.click()}
  book.addEventListener('click',function(e){var p=e.target.closest('.ph');if(p){e.stopPropagation();pick(p)}});
  book.addEventListener('keydown',function(e){var p=e.target.closest&&e.target.closest('.ph');if(p&&(e.key==='Enter'||e.key===' ')){e.preventDefault();pick(p)}});
  function uploadPhotoBlob(id, body, filename){
    fetch('/api/upload-image', {
      method: 'POST',
      headers: {
        'Content-Type': (body && body.type) || 'image/jpeg',
        'X-Slot': id,
        'X-Filename': encodeURIComponent(filename || (id + '.jpg'))
      },
      body: body
    })
    .then(function(res){
      if(!res.ok) throw new Error('Image upload failed');
      return res.json();
    })
    .then(function(data){
      photos[id] = data.url;
      savePhotos();
      applyPhotos();
    })
    .catch(function(err){
      console.error('[Image Upload Error]', err);
      savePhotos();
    });
  }

  fileIn.addEventListener('change',function(){
    var f=fileIn.files&&fileIn.files[0];if(!f||!slot)return;var id=slot;
    
    if(window.CropperModal){
      window.CropperModal.open({
        file: f,
        slot: id,
        onCrop: function(blob, previewUrl){
          if(previewUrl){
            photos[id] = previewUrl;
            applyPhotos();
          }
          uploadPhotoBlob(id, blob, f.name || (id + '.jpg'));
        },
        onCancel: function(){
          fileIn.value = '';
        }
      });
    } else {
      uploadPhotoBlob(id, f, f.name || (id + '.jpg'));
    }
  });

  /* ---------- personalize panel ---------- */
  var panel=$('#panel'),openB=$('#openPanel');
  function fill(){$$('[data-k]').forEach(function(el){el.value=S[el.getAttribute('data-k')]==null?'':S[el.getAttribute('data-k')]});count()}
  function count(){$('#count').textContent=($('#f-letter').value.length)+' / 650'}
  function save(){
    try{localStorage.setItem('flipbook-v1',JSON.stringify(S))}catch(e){}
    syncToServer({settings: S});
  }
  function openPanel(){panel.hidden=false;openB.setAttribute('aria-expanded','true');setTimeout(function(){$('#f-name').focus()},30)}
  function closePanel(){panel.hidden=true;openB.setAttribute('aria-expanded','false');openB.focus()}
  openB.addEventListener('click',function(e){e.stopPropagation();panel.hidden?openPanel():closePanel()});
  $('#closePanel').addEventListener('click',closePanel);
  $$('[data-k]').forEach(function(el){el.addEventListener('input',function(){
    var key=el.getAttribute('data-k'),v=el.value;
    if(key==='age'){v=v===''?DEF.age:Math.max(1,Math.min(99,parseInt(v,10)||DEF.age))}
    if(key==='date'&&!v)v=DEF.date;
    S[key]=v;if(key==='letter')count();applyState();save();
  })});


  /* ---------- sound ---------- */
  var A={track:'custom',vol:.6,music:true,sfx:true,customTrack:'/audio/audio-wedding_1793132271515.mp3',customTrackName:'audio-wedding.mp3'};
  try{
    var sv=JSON.parse(localStorage.getItem('flipbook-audio')||'null');
    if(sv){
      if(sv.track)A.track=sv.track;
      if(typeof sv.vol==='number')A.vol=sv.vol;
      if(typeof sv.music==='boolean')A.music=sv.music;
      if(typeof sv.sfx==='boolean')A.sfx=sv.sfx;
      if(sv.customTrack)A.customTrack=sv.customTrack;
      if(sv.customTrackName)A.customTrackName=sv.customTrackName;
    }
  }catch(e){}
  function saveA(){
    try{localStorage.setItem('flipbook-audio',JSON.stringify(A))}catch(e){}
    syncToServer({audio: A});
  }
  var customAudio = new Audio();
  customAudio.loop = true;
  customAudio.preload = 'auto';
  if(A.customTrack) customAudio.src = A.customTrack;

  var AC=null,master,musicBus,sfxBus,reverb,rvSend,noiseBuf,trackNode=null,timer=null,playing=false,lastSfx=0;
  var soundB=$('#sound');
  var ICON_ON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12"/></svg>';
  var ICON_OFF='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M17 9.5l5 5M22 9.5l-5 5"/></svg>';

  function updSound(){
    var isCustomPlaying = !!(customAudio && !customAudio.paused);
    var isSynthPlaying = !!(playing && AC && AC.state==='running' && A.track!=='custom');
    var on = !!(A.music && A.track!=='off' && (isCustomPlaying || isSynthPlaying || playing));
    soundB.classList.toggle('on',on);
    soundB.setAttribute('aria-pressed',on?'true':'false');
    soundB.setAttribute('aria-label',on?'Turn music off':'Turn music on');
    soundB.innerHTML=on?ICON_ON:ICON_OFF;
  }

  customAudio.addEventListener('play', function(){ playing=true; updSound(); });
  customAudio.addEventListener('pause', function(){ if(A.track==='custom'){ playing=false; updSound(); } });
  customAudio.addEventListener('ended', function(){ if(customAudio.loop){ customAudio.play().catch(function(){}); } });

  function level(){return A.vol*A.vol*1.25}
  function ensureAudio(){
    if(!AC){
      var C=window.AudioContext||window.webkitAudioContext;if(!C)return false;
      AC=new C();AC.addEventListener('statechange',function(){updSound();if(AC.state==='running')detach()});
      master=AC.createGain();master.gain.value=level();master.connect(AC.destination);
      musicBus=AC.createGain();musicBus.gain.value=.9;musicBus.connect(master);
      sfxBus=AC.createGain();sfxBus.gain.value=.8;sfxBus.connect(master);
      reverb=AC.createConvolver();var len=Math.floor(AC.sampleRate*1.5),ir=AC.createBuffer(1,len,AC.sampleRate);
      for(var c=0;c<1;c++){var d=ir.getChannelData(c);for(var i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6)}
      reverb.buffer=ir;rvSend=AC.createGain();rvSend.gain.value=.4;reverb.connect(rvSend);rvSend.connect(musicBus);
      noiseBuf=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);var nd=noiseBuf.getChannelData(0);for(var j=0;j<nd.length;j++)nd[j]=Math.random()*2-1;
    }
    if(AC.state==='suspended'){try{AC.resume()}catch(e){}}
    return true;
  }
  function env(g,t,vel,a,end){g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vel,t+a);g.gain.exponentialRampToValueAtTime(.0001,end)}
  function voice(dest,t,m,d,kind,vel){
    var f=440*Math.pow(2,(m-69)/12),g=AC.createGain(),oscs=[],end;
    function osc(type,fr,det,lv){var o=AC.createOscillator();o.type=type;o.frequency.value=fr;if(det)o.detune.value=det;var x=g;if(lv!=null){x=AC.createGain();x.gain.value=lv;x.connect(g)}o.connect(x);oscs.push(o)}
    if(kind==='box'){osc('sine',f);osc('triangle',f*2,0,.22);end=t+1.5;env(g,t,vel,.003,end)}
    else if(kind==='bell'){osc('sine',f);osc('sine',f*2.01,0,.25);end=t+2;env(g,t,vel,.004,end)}
    else if(kind==='pluck'){osc('triangle',f);osc('sine',f*2,0,.15);end=t+.5;env(g,t,vel,.005,end)}
    else if(kind==='bass'){osc('sine',f);osc('triangle',f,0,.3);end=t+Math.max(.7,d);env(g,t,vel,.01,end)}
    else{osc('triangle',f,-7);osc('triangle',f,7);osc('sine',f/2,0,.5);end=t+d+1.6;
      g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vel,t+.9);g.gain.setValueAtTime(vel,t+d);g.gain.exponentialRampToValueAtTime(.0001,end)}
    if(kind==='pad'){var lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1100;g.connect(lp);lp.connect(dest)}else g.connect(dest);
    oscs.forEach(function(o){o.start(t);o.stop(end+.05)});
  }
  function triad(r,minor){return [r,r+(minor?3:4),r+7]}
  var TRACKS={
    box:{bpm:100,beats:4,gen:function(i){
      var P=[[60,0],[57,1],[53,0],[55,0]][i%4],tn=triad(P[0],P[1]),ev=[[0,P[0]-24,2.5,'bass',.28]];
      [tn[0]+12,tn[1]+12,tn[2]+12,tn[0]+24,tn[2]+12,tn[1]+12,tn[2]+12,tn[1]+12].forEach(function(m,k){ev.push([k*.5,m,.5,'box',.17])});
      [[[0,84],[2,88],[4,86],[6,84]],[[0,81],[2,84],[4,83],[6,81]],[[0,84],[2,81],[4,89],[6,88]],[[0,86],[2,83],[4,79],[6,83]]][i%4].forEach(function(n){ev.push([n[0]*.5,n[1],1,'box',.24])});
      return ev}},
    pad:{bpm:66,beats:4,gen:function(i){
      var C=[[48,55,59,64],[45,55,60,64],[41,53,57,64],[43,55,59,62]][i%4],ev=[];
      C.forEach(function(m){ev.push([0,m,4,'pad',.09])});
      var B=[[84,88],[81,84],[84,89],[83,86]][i%4];
      ev.push([1,B[0],1,'bell',.12],[2.5,B[1],1,'bell',.1],[3.5,B[0]+7,1,'bell',.07]);return ev}},
    waltz:{bpm:132,beats:3,gen:function(i){
      var R=[[48,0],[43,0],[45,1],[41,0]][i%4],t=triad(R[0]+12,R[1]),ev=[[0,R[0],1,'bass',.3]];
      [1,2].forEach(function(b){t.forEach(function(m){ev.push([b,m,.5,'pluck',.1])})});
      [[[0,79],[1,81],[2,84]],[[0,83],[1,79],[2,74]],[[0,81],[1,84],[2,88]],[[0,86],[1,84],[2,81]]][i%4].forEach(function(n){ev.push([n[0],n[1],1,'box',.22])});
      return ev}}
  };

  function stopSynth(){
    clearInterval(timer);timer=null;
    if(trackNode&&AC){
      var tn=trackNode;trackNode=null;
      try{
        tn.gain.cancelScheduledValues(AC.currentTime);
        tn.gain.setValueAtTime(Math.max(tn.gain.value,.0001),AC.currentTime);
        tn.gain.linearRampToValueAtTime(.0001,AC.currentTime+.25);
      }catch(e){}
      setTimeout(function(){try{if(tn._src)tn._src.stop();tn.disconnect()}catch(e){}},450);
    }
  }

  function stopMusic(){
    stopSynth();
    if(customAudio&&!customAudio.paused){
      try{ customAudio.pause(); }catch(e){}
    }
    playing=false;
    updSound();
  }

  function startMusic(){
    if(!A.music||A.track==='off'){
      stopMusic();
      return;
    }

    // 1. User Custom Track (uploaded MP3/M4A/WAV)
    if(A.track==='custom'){
      stopSynth();
      if(A.customTrack){
        var fullUrl = A.customTrack;
        if(!customAudio.src || (!customAudio.src.endsWith(fullUrl) && customAudio.src!==fullUrl)){
          customAudio.src = fullUrl;
        }
        customAudio.volume = Math.max(0, Math.min(1, A.vol));
        customAudio.loop = true;
        var p = customAudio.play();
        if(p && p.catch){
          p.catch(function(err){
            console.log('[Admin Audio Note] Autoplay paused pending touch:', err.message);
          });
        }
        playing = true;
        updSound();
        return;
      }
    }

    // 2. Synthesizer Preset Tracks (box, pad, waltz)
    if(customAudio&&!customAudio.paused){
      try{ customAudio.pause(); }catch(e){}
    }
    if(!ensureAudio()) return;
    stopSynth();

    var tn=AC.createGain();tn.gain.setValueAtTime(.0001,AC.currentTime);tn.gain.linearRampToValueAtTime(1,AC.currentTime+.5);
    tn.connect(musicBus);trackNode=tn;
    tn.connect(reverb);
    var T=TRACKS[A.track]||TRACKS.box,spb=60/T.bpm,bar=0,next=AC.currentTime+.15;
    function pump(){while(next<AC.currentTime+.9){T.gen(bar).forEach(function(e){voice(tn,next+e[0]*spb,e[1],e[2]*spb,e[3],e[4])});next+=T.beats*spb;bar++}}
    pump();timer=setInterval(pump,200);playing=true;updSound();
  }

  function sfxFlip(){
    if(!A.sfx)return;var now=Date.now();if(now-lastSfx<110)return;lastSfx=now;
    if(!ensureAudio())return;var t=AC.currentTime+.01;
    var src=AC.createBufferSource();src.buffer=noiseBuf;src.loop=true;
    var bp=AC.createBiquadFilter();bp.type='bandpass';bp.Q.value=.9;bp.frequency.setValueAtTime(700,t);bp.frequency.exponentialRampToValueAtTime(3600,t+.32);
    var g=AC.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.55,t+.09);g.gain.exponentialRampToValueAtTime(.0001,t+.42);
    src.connect(bp);bp.connect(g);g.connect(sfxBus);src.start(t);src.stop(t+.45);
    var pent=[79,81,84,86,88,91];voice(sfxBus,t+.3,pent[Math.floor(Math.random()*pent.length)],.3,'bell',.1);
  }

  /* start on the first tap, since browsers block sound before that */
  var EVS=['pointerdown','touchend','click','keydown'];
  function unlock(){if(AC&&AC.state!=='running'){try{AC.resume()}catch(e){}}}
  function detach(){EVS.forEach(function(n){window.removeEventListener(n,onFirst,true)})}
  function onFirst(e){
    if(e.target&&e.target.closest&&e.target.closest('#sound'))return;
    ensureAudio();
    unlock();
    if(A.music&&A.track!=='off'){
      startMusic();
    }
    if((customAudio&&!customAudio.paused)||(AC&&AC.state==='running')){
      detach();
    }
  }
  EVS.forEach(function(n){window.addEventListener(n,onFirst,true)});
  document.addEventListener('visibilitychange',function(){
    if(document.hidden){
      if(customAudio&&!customAudio.paused){try{customAudio.pause()}catch(e){}}
      if(AC){try{AC.suspend()}catch(e){}}
    }else{
      if(A.music&&A.track!=='off'&&playing){
        startMusic();
      }
    }
  });

  soundB.addEventListener('click',function(e){
    e.stopPropagation();
    var isAudPlaying = (customAudio && !customAudio.paused);
    var isSynthActive = (playing && AC && AC.state==='running');
    if(isAudPlaying || isSynthActive || playing){
      A.music=false;
      saveA();
      stopMusic();
    }else{
      A.music=true;
      if(A.track==='off'){
        A.track = A.customTrack ? 'custom' : 'box';
      }
      saveA();
      syncAudioUI();
      ensureAudio();
      unlock();
      startMusic();
    }
  });

  var trackSel=$('#f-track'),volIn=$('#f-vol'),sfxIn=$('#f-sfx'),songIn=$('#song'),songNote=$('#songNote');
  function syncAudioUI(){
    if(A.customTrack){
      var opt=$('#opt-custom');
      opt.disabled=false;
      var dName=A.customTrackName||'Custom song';
      opt.textContent='My song: '+(dName.length>26?dName.slice(0,24)+'…':dName);
    }
    trackSel.value=A.music?A.track:'off';
    volIn.value=Math.round(A.vol*100);
    sfxIn.checked=A.sfx;
  }
  trackSel.addEventListener('change',function(){
    var v=trackSel.value;
    if(v==='off'){
      A.music=false;
      saveA();
      stopMusic();
      return;
    }
    A.track=v;
    A.music=true;
    saveA();
    startMusic();
  });
  volIn.addEventListener('input',function(){
    A.vol=volIn.value/100;
    saveA();
    if(customAudio) customAudio.volume = Math.max(0, Math.min(1, A.vol));
    if(master && AC) master.gain.setTargetAtTime(level(),AC.currentTime,.03);
  });
  sfxIn.addEventListener('change',function(){A.sfx=sfxIn.checked;saveA();if(A.sfx)sfxFlip()});
  $('#pickSong').addEventListener('click',function(){songIn.value='';songIn.click()});

  songIn.addEventListener('change',function(){
    var f=songIn.files&&songIn.files[0];if(!f)return;
    songNote.textContent='Uploading song to server audio/ folder…';

    fetch('/api/upload-audio', {
      method: 'POST',
      headers: {
        'Content-Type': f.type || 'application/octet-stream',
        'X-Filename': encodeURIComponent(f.name)
      },
      body: f
    })
    .then(function(res){
      if(!res.ok) throw new Error('Upload failed');
      return res.json();
    })
    .then(function(data){
      songNote.textContent='Song saved & playing!';
      A.customTrack = data.url;
      A.customTrackName = data.name;
      A.track = 'custom';
      A.music = true;
      saveA();
      syncAudioUI();

      customAudio.src = data.url;
      customAudio.volume = Math.max(0, Math.min(1, A.vol));
      startMusic();
    })
    .catch(function(err){
      console.error('[Upload Audio Error]', err);
      songNote.textContent='Upload failed. Try an MP3, M4A or WAV file.';
    });
  });

  syncAudioUI();updSound();
  setTimeout(function(){if(A.music&&A.track!=='off'&&!playing){if(ensureAudio())startMusic()}},500);

  fill();fit();

  /* ---------- lock portrait mode ---------- */
  var LOCK=false;try{LOCK=localStorage.getItem('flipbook-lock')==='1'}catch(e){}
  var gate=$('#gate'),lockB=$('#lock'),lockIn=$('#f-lock'),appEl=$('#app');
  function portrait(){return window.innerHeight>window.innerWidth}
  function applyLock(){
    var block=LOCK&&portrait();
    gate.hidden=!block;
    if(block&&!panel.hidden){panel.hidden=true;openB.setAttribute('aria-expanded','false')}
    try{appEl.inert=block}catch(e){}
    appEl.setAttribute('aria-hidden',block?'true':'false');
    lockB.classList.toggle('on',LOCK);lockB.setAttribute('aria-pressed',LOCK?'true':'false');lockIn.checked=LOCK;
    $('#prev').style.visibility=$('#next').style.visibility=block?'hidden':'';
  }
  function setLock(v){
    LOCK=v;
    try{localStorage.setItem('flipbook-lock',v?'1':'0')}catch(e){}
    applyLock();
    syncToServer({lock: v});
    if(!v)setTimeout(fit,30);
  }
  lockB.addEventListener('click',function(e){e.stopPropagation();setLock(!LOCK)});
  lockIn.addEventListener('change',function(){setLock(lockIn.checked)});
  $('#gateOff').addEventListener('click',function(){setLock(false)});
  window.addEventListener('resize',applyLock);window.addEventListener('orientationchange',function(){setTimeout(function(){applyLock();fit()},120)});
  applyLock();

  /* ---------- initial hydration from server database ---------- */
  fetch('/api/data')
    .then(function(r){ return r.json(); })
    .then(function(data){
      if(!data) return;
      var stateChanged = false;
      if(data.settings){
        for(var k in DEF){
          if(data.settings[k] != null) S[k] = data.settings[k];
        }
        stateChanged = true;
      }
      if(data.photos && typeof data.photos === 'object'){
        for(var pid in data.photos){
          if(data.photos[pid]) photos[pid] = data.photos[pid];
        }
        applyPhotos();
      }
      var unsynced = false;
      for(var k in photos){
        if(photos[k] && (!data.photos || !data.photos[k])){
          unsynced = true;
          break;
        }
      }
      if(unsynced){
        syncToServer({photos: photos});
      }
      if(typeof data.lock === 'boolean'){
        LOCK = data.lock;
        applyLock();
      }
      if(data.audio){
        for(var ak in data.audio) A[ak] = data.audio[ak];
        try{ localStorage.setItem('flipbook-audio', JSON.stringify(A)); }catch(e){}
        if(A.customTrack){
          if(!customAudio.src || (!customAudio.src.endsWith(A.customTrack) && customAudio.src !== A.customTrack)){
            customAudio.src = A.customTrack;
          }
          customAudio.volume = Math.max(0, Math.min(1, A.vol));
        }
        syncAudioUI();
        if(A.music && A.track !== 'off'){
          startMusic();
        } else {
          stopMusic();
        }
      }
      if(stateChanged){
        applyState();
        fill();
      }
    })
    .catch(function(err){
      console.log('[Admin] Initial server load fallback:', err);
    });

  /* ---------- real-time sync with server database (SSE) ---------- */
  if(window.EventSource){
    var sse = new EventSource('/api/sync');
    sse.onmessage = function(ev){
      try{
        var msg = JSON.parse(ev.data);
        if(!msg || !msg.data) return;
        var data = msg.data;
        var activeEl = document.activeElement;
        var isEditingPersonalize = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

        if(data.settings && !isEditingPersonalize){
          for(var k in DEF){
            if(data.settings[k] != null) S[k] = data.settings[k];
          }
          applyState();
          fill();
        }
        if(data.photos && typeof data.photos === 'object'){
          for(var pid in data.photos){
            if(data.photos[pid]) photos[pid] = data.photos[pid];
          }
          applyPhotos();
        }
        if(typeof data.lock === 'boolean' && data.lock !== LOCK){
          LOCK = data.lock;
          applyLock();
        }
        if(data.audio){
          var prevCustom = A.customTrack;
          var prevTrack = A.track;
          var prevMusic = A.music;
          for(var ak in data.audio) A[ak] = data.audio[ak];
          try{ localStorage.setItem('flipbook-audio', JSON.stringify(A)); }catch(e){}

          if(A.customTrack && (A.customTrack !== prevCustom || !customAudio.src)){
            customAudio.src = A.customTrack;
            customAudio.volume = Math.max(0, Math.min(1, A.vol));
          }
          syncAudioUI();
          if(A.music && A.track !== 'off'){
            startMusic();
          } else {
            stopMusic();
          }
        }
      }catch(err){}
    };
  }

  setTimeout(function(){
    $$('img.hero').forEach(function(im){if(im.decode)im.decode().catch(function(){})});
    $$('.fullimg').forEach(function(d){var m=/url\(["']?([^"')]+)/.exec(d.style.backgroundImage);if(m){var im=new Image();im.src=m[1];if(im.decode)im.decode().catch(function(){})}});
  },300);
})();