'use client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
export function Choice({label,value,onChange,options}:{label:string;value:string;onChange:(s:string)=>void;options:string[]}) {return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label} className="choice"><SelectValue /></SelectTrigger><SelectContent>{options.map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select>}
export function Metric({label,value,note,icon}:{label:string;value:string;note:string;icon:React.ReactNode}){return <div className="metric"><div className="metric-label">{label}{icon}</div><strong>{value}</strong><p>{note}</p></div>}
