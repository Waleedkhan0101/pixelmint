'use strict';

function makeZip(entries) {

    const encoder = new TextEncoder();

    const local = [];

    const central = [];

    let offset = 0;

    let centralSize = 0;

    function crc32(bytes) {

        let crc = 0xffffffff;

        for (const byte of bytes) {

            crc ^= byte;

            for (let i = 0; i < 8; i++) {

                crc = (crc >>> 1) ^

                    ((crc & 1) ? 0xedb88320 : 0);
            }
        }

        return (crc ^ 0xffffffff) >>> 0;
    }

    for (const [name, buffer] of entries) {

        const filename = encoder.encode(name);

        const bytes = new Uint8Array(buffer);

        const crc = crc32(bytes);

        const header = new Uint8Array(
            30 + filename.length
        );

        const view = new DataView(header.buffer);

        view.setUint32(0, 0x04034b50, true);

        view.setUint16(4, 20, true);

        view.setUint16(6, 0x800, true);

        view.setUint16(12, 33, true);

        view.setUint32(14, crc, true);

        view.setUint32(18, bytes.length, true);

        view.setUint32(22, bytes.length, true);

        view.setUint16(26, filename.length, true);

        header.set(filename, 30);

        const centralHeader = new Uint8Array(

            46 + filename.length
        );

        const centralView = new DataView(

            centralHeader.buffer
        );

        centralView.setUint32(0, 0x02014b50, true);

        centralView.setUint16(4, 20, true);

        centralView.setUint16(6, 20, true);

        centralView.setUint16(8, 0x800, true);

        centralView.setUint16(14, 33, true);

        centralView.setUint32(16, crc, true);

        centralView.setUint32(20, bytes.length, true);

        centralView.setUint32(24, bytes.length, true);

        centralView.setUint16(28, filename.length, true);

        centralView.setUint32(42, offset, true);

        centralHeader.set(filename, 46);

        local.push(header, bytes);

        central.push(centralHeader);

        offset += header.length + bytes.length;

        centralSize += centralHeader.length;
    }

    const end = new Uint8Array(22);

    const endView = new DataView(end.buffer);

    endView.setUint32(0, 0x06054b50, true);

    endView.setUint16(8, entries.size, true);

    endView.setUint16(10, entries.size, true);

    endView.setUint32(12, centralSize, true);

    endView.setUint32(16, offset, true);

    return new Blob(

        [...local, ...central, end],

        { type: 'application/zip' }
    );
}