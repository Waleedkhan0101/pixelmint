'use strict';
// ZIP store method (no compression), with CRC32 and central directory.
function makeZip(entries) {
  const enc=new TextEncoder(), local=[], central=[];
  let offset=0, centralSize=0;
  const crc32=bytes=>{let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;};
  for(const [name,buffer] of entries){
    const n=enc.encode(name), b=new Uint8Array(buffer), crc=crc32(b), l=new Uint8Array(30+n.length), d=new DataView(l.buffer);
    d.setUint32(0,0x04034b50,true);d.setUint16(4,20,true);d.setUint16(6,0x800,true);d.setUint16(12,33,true);d.setUint32(14,crc,true);d.setUint32(18,b.length,true);d.setUint32(22,b.length,true);d.setUint16(26,n.length,true);l.set(n,30);
    const h=new Uint8Array(46+n.length),v=new DataView(h.buffer);v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x800,true);v.setUint16(14,33,true);v.setUint32(16,crc,true);v.setUint32(20,b.length,true);v.setUint32(24,b.length,true);v.setUint16(28,n.length,true);v.setUint32(42,offset,true);h.set(n,46);
    local.push(l,b);central.push(h);offset+=l.length+b.length;centralSize+=h.length;
  }
  const end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,entries.size,true);v.setUint16(10,entries.size,true);v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);
  return new Blob([...local,...central,end],{type:'application/zip'});
}
