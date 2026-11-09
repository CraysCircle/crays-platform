/** Display only: original Core references and byte-transfer guards own authority. */
export function chuckFileSize(bytes:number):string {
 if(!Number.isSafeInteger(bytes)||bytes<0)return 'Size unavailable';
 if(bytes<1024)return `${bytes} B`;
 const unit=bytes<1024**2?'KB':bytes<1024**3?'MB':'GB';
 const divisor=unit==='KB'?1024:unit==='MB'?1024**2:1024**3;
 return `${new Intl.NumberFormat('en-GB',{maximumFractionDigits:1}).format(bytes/divisor)} ${unit}`;
}
export function chuckFileType(mime:string):string {
 const value=mime.split(';',1)[0].trim().toLowerCase();
 if(value==='application/pdf')return 'PDF';
 if(value.startsWith('image/'))return 'Image';
 if(value.startsWith('audio/'))return 'Audio';
 if(value.startsWith('video/'))return 'Video';
 if(value.startsWith('text/'))return 'Text document';
 if(value.includes('wordprocessingml')||value==='application/msword')return 'Word document';
 if(value.includes('spreadsheetml')||value==='application/vnd.ms-excel')return 'Spreadsheet';
 if(value.includes('presentationml')||value==='application/vnd.ms-powerpoint')return 'Presentation';
 if(['application/zip','application/x-7z-compressed','application/gzip'].includes(value))return 'Archive';
 return 'File';
}
