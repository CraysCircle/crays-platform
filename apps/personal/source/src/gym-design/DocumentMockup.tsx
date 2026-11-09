import {useEffect,useId,useRef,useState} from 'react';
import {ArrowRight,Download,FileText,UploadSimple} from '@phosphor-icons/react';
import {DesignDialog} from './DesignDialog';

type LocalDocument={id:string;file:File;url:string};
const accepted=new Set(['application/pdf','image/jpeg','image/png','text/plain']);

/** Exercises the document journey locally; never sends files or claims vault/scan/provider success. */
export function DocumentMockup(){
 const input=useRef<HTMLInputElement>(null);
 const [file,setFile]=useState<File|null>(null);
 const [documents,setDocuments]=useState<LocalDocument[]>([]);
 const [review,setReview]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const urls=useRef<string[]>([]);
 const id=useId();
 useEffect(()=>()=>{for(const url of urls.current)URL.revokeObjectURL(url)},[]);
 const valid=Boolean(file&&accepted.has(file.type)&&file.size>0&&file.size<=20*1024*1024);
 function select(next:File|null){
  setFile(next);setMessage('');setError('');
  if(next&&(!accepted.has(next.type)||next.size===0||next.size>20*1024*1024))setError('Choose a non-empty PDF, JPG, PNG or text file up to 20 MB.');
 }
 function saveExample(){
  if(!file||!valid)return;
  const url=URL.createObjectURL(file);urls.current.push(url);
  setDocuments(v=>[...v,{id:crypto.randomUUID(),file,url}]);
  setReview(false);setFile(null);if(input.current)input.current.value='';
  setMessage('File added to this design preview only. It was not uploaded, scanned, encrypted or stored in your original account.');
 }
 return <section><h2>Contracts & records</h2><p className="gym-design-muted">Your contracts, invoices and support documents keep their original relationships. This preview uses only files you select here.</p>
  <section className="gym-design-panel"><h3>Add a support document</h3><label className="gym-design-field" htmlFor={id}>Choose a file<input ref={input} id={id} type="file" accept="application/pdf,image/jpeg,image/png,text/plain" onChange={e=>select(e.target.files?.[0]||null)}/></label><p className="gym-design-muted">PDF, JPG, PNG or text · up to 20 MB · local design preview</p>{file&&<p><FileText size={18} aria-hidden/>{file.name} · {(file.size/1024).toFixed(1)} KB</p>}{error&&<p role="alert">{error}</p>}<button type="button" disabled={!valid} className="gym-design-action primary" onClick={()=>setReview(true)}><UploadSimple size={18}/>Review example upload</button></section>
  {message&&<p className="gym-design-notice" role="status">{message}</p>}
  <div className="gym-design-section-heading"><h3>Your example documents</h3><span>{documents.length}</span></div>
  {documents.length?documents.map(doc=><div className="gym-design-document-row" key={doc.id}><FileText size={25}/><span><strong>{doc.file.name}</strong><small>Local example · {doc.file.type} · {(doc.file.size/1024).toFixed(1)} KB</small></span><a className="gym-design-action" href={doc.url} download={doc.file.name}><Download size={18}/>Download local example</a></div>):<p className="gym-design-muted">No example documents added. Your original account documents have not been loaded into this prototype.</p>}
  {review&&file&&<DesignDialog titleId={id+'-review'} onClose={()=>setReview(false)}><h2 id={id+'-review'}>Review your file</h2><dl className="gym-design-review"><div><dt>File</dt><dd>{file.name}</dd></div><div><dt>Type</dt><dd>{file.type}</dd></div><div><dt>Size</dt><dd>{(file.size/1024).toFixed(1)} KB</dd></div><div><dt>Destination</dt><dd>This local design preview</dd></div></dl><p className="gym-design-muted">No provider upload or private-vault receipt will be created.</p><div className="gym-design-inline"><button type="button" className="gym-design-action" onClick={()=>setReview(false)}>Back</button><button type="button" className="gym-design-action primary" onClick={saveExample}>Add to design preview<ArrowRight size={18}/></button></div></DesignDialog>}
 </section>;
}
