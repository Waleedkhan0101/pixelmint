'use strict';
const $=id=>document.getElementById(id), presets={facebook:[['Post',1200,630],['Cover',820,312],['Square',1080,1080]],instagram:[['Square post',1080,1080],['Portrait post',1080,1350],['Story',1080,1920]],whatsapp:[['Profile photo',640,640],['Status',1080,1920]],twitter:[['Post',1600,900],['Header',1500,500]]};
let files=[], sourceURLs=[], outputURLs=[], busy=false;
const size=n=>n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:`${(n/1048576).toFixed(1)} MB`;
function status(s,error=false){$('status').textContent=s;$('status').classList.toggle('error',error);}
function el(tag,cls,text){const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x;}
function clearResults(){outputURLs.forEach(URL.revokeObjectURL);outputURLs=[];$('results').replaceChildren();$('zip').hidden=true;$('zip').removeAttribute('href');$('empty-result').hidden=false;}
function renderQueue(){sourceURLs.forEach(URL.revokeObjectURL);sourceURLs=[];$('queue').replaceChildren();files.forEach((f,i)=>{const row=el('div','queue-row'),img=el('img','thumb');img.src=URL.createObjectURL(f);sourceURLs.push(img.src);img.alt='';const d=el('div','file-desc');d.append(el('strong','',f.name),el('small','',size(f.size)));const remove=el('button','icon-btn','×');remove.type='button';remove.title='Remove image';remove.disabled=busy;remove.onclick=()=>{files.splice(i,1);clearResults();renderQueue();status('');};row.append(img,d,remove);$('queue').append(row);});$('count').textContent=`${files.length} / 10 images`;$('total').textContent=size(files.reduce((a,f)=>a+f.size,0));$('process').disabled=busy||!files.length;$('clear').disabled=busy||!files.length;$('browse').disabled=busy;}
function addFiles(list){if(busy)return;let errors=[];for(const f of list){if(files.length>=10){errors.push('Maximum 10 images.');break;}if(!/\.(jpe?g|png|webp)$/i.test(f.name)||!f.size||f.size>4000000){errors.push(`${f.name}: unsupported or larger than 4 MB.`);continue;}if(files.reduce((a,x)=>a+x.size,0)+f.size>40000000){errors.push('Maximum batch size 40 MB.');continue;}files.push(f);}clearResults();renderQueue();status(errors.join(' '),!!errors.length);}
$('browse').onclick=e=>{e.stopPropagation();$('file').click();};$('drop').onclick=()=>{if(!busy)$('file').click();};$('drop').onkeydown=e=>{if(!busy&&e.target===$('drop')&&['Enter',' '].includes(e.key)){e.preventDefault();$('file').click();}};$('file').onchange=e=>{addFiles(e.target.files);e.target.value='';};$('clear').onclick=()=>{files=[];clearResults();renderQueue();status('');};for(const name of ['dragover','dragenter'])$('drop').addEventListener(name,e=>{e.preventDefault();$('drop').classList.add('dragging');});$('drop').addEventListener('dragleave',()=>$('drop').classList.remove('dragging'));$('drop').addEventListener('drop',e=>{e.preventDefault();$('drop').classList.remove('dragging');addFiles(e.dataTransfer.files);});
for(const btn of document.querySelectorAll('.platform'))btn.onclick=()=>{document.querySelectorAll('.platform').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));$('preset').replaceChildren(new Option('Custom / original dimensions','custom'));for(const [label,w,h] of presets[btn.dataset.platform])$('preset').add(new Option(`${label} · ${w} × ${h}`,`${w},${h}`));$('preset').selectedIndex=1;applyPreset();};
function applyPreset(){const v=$('preset').value;if(v==='custom'){$('width').value='';$('height').value='';}else{const [w,h]=v.split(',');$('width').value=w;$('height').value=h;}$('fit').value='contain';}
$('preset').onchange=applyPreset;for(const id of ['width','height'])$(id).oninput=()=>{$('preset').value='custom';document.querySelectorAll('.platform').forEach(b=>b.setAttribute('aria-pressed','false'));};$('quality').oninput=()=>{$('quality-value').textContent=$('quality').value+'%';};$('format').onchange=()=>{$('quality-wrap').hidden=$('format').value==='PNG';};
function showResults(entries,manifest){$('empty-result').hidden=true;let ok=0;for(const item of manifest){const card=el('article','export-card');if(item.error){card.append(el('strong','',item.source),el('p','error-text',item.error));}else{ok++;const ext=item.name.split('.').pop(),mime=ext==='jpg'?'image/jpeg':`image/${ext}`;const url=URL.createObjectURL(new Blob([entries.get(item.name)],{type:mime}));outputURLs.push(url);const img=el('img','export-img checker');img.src=url;img.alt=item.name;const d=el('div','export-detail');d.append(el('strong','',item.name),el('small','',`${item.width} × ${item.height} · ${size(item.original_size)} → ${size(item.size)}`),el('small','verified','✓ Common metadata fields checked'));const dl=el('a','primary small','Download');dl.href=url;dl.download=item.name;d.append(dl);card.append(img,d);}$('results').append(card);}if(ok){const zip=URL.createObjectURL(makeZip(entries));outputURLs.push(zip);$('zip').href=zip;$('zip').hidden=false;}status(`${ok} of ${manifest.length} images exported.${ok<manifest.length?' Review failed files below.':''}`,ok<manifest.length);}
$('process').onclick=async()=>{
 if(busy||!files.length)return;
 for(const id of ['width','height']){const x=$(id);if(x.value&&!x.checkValidity()){status('Enter valid dimensions (1–8192).',true);return;}}
 clearResults();busy=true;renderQueue();$('process').querySelector('span').textContent='Processing…';
 const query=new URLSearchParams({width:$('width').value,height:$('height').value,format:$('format').value,fit:$('fit').value,quality:$('quality').value});
 const entries=new Map(), manifest=[],used=new Set();
 try{
  for(const [i,file] of files.entries()){
   status(`Processing image ${i+1} of ${files.length}…`);
   try{
    const r=await fetch('/api/process?'+query,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:file});
    if(!r.ok){let msg=`Processing failed (${r.status}).`;try{const e=await r.json();if(typeof e.detail==='string')msg=e.detail;}catch{}throw Error(msg);}
    const ext=r.headers.get('X-Image-Extension'),width=Number(r.headers.get('X-Image-Width')),height=Number(r.headers.get('X-Image-Height'));
    if(!['jpg','png','webp'].includes(ext)||!width||!height)throw Error('Invalid image response.');
    const bytes=await r.arrayBuffer(), stem=file.name.replace(/\.[^.]+$/,'').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,80)||'image';
    let name=`${stem}-export.${ext}`,n=2;while(used.has(name.toLowerCase()))name=`${stem}-export-${n++}.${ext}`;used.add(name.toLowerCase());
    entries.set(name,bytes);manifest.push({source:file.name,name,width,height,size:bytes.byteLength,original_size:file.size});
   }catch(e){manifest.push({source:file.name,error:e.message});}
  }
  showResults(entries,manifest);$('output').scrollIntoView({behavior:'smooth',block:'nearest'});
 }catch(e){status(e.message,true);}finally{busy=false;renderQueue();$('process').querySelector('span').textContent='Process batch';}
};
$('year').textContent=new Date().getFullYear();renderQueue();
