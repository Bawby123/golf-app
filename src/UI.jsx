import React from 'react';
import {Brand,Icon} from './Brand.jsx';
import {Link, useLocation} from 'react-router-dom';

export function Action({to,kind='primary',children,...props}) {
  const className=`action action-${kind}`;
  return to ? <Link className={className} to={to} {...props}>{children}</Link> : <button className={className} type="button" {...props}>{children}</button>;
}
export function Navigation(){
  const {pathname}=useLocation();
  const section=['/rounds','/progress','/bag','/profile'].find(p=>pathname.startsWith(p))||'/';
  return <nav aria-label="Main navigation">{[['/','Home'],['/rounds','Rounds'],['/progress','Progress'],['/bag','Bag'],['/profile','Profile']].map(([to,label])=><Link key={to} to={to} className={section===to?'active':''} aria-current={section===to?'page':undefined}><Icon name={label.toLowerCase()}/><span>{label}</span></Link>)}</nav>;
}
export function Page({title,children,showNav=true}){return <div className="app design-app"><header className="page-header"><Brand/><h1>{title}</h1></header><main className={`page-content${showNav?'':' no-nav'}`}>{children}</main>{showNav&&<Navigation/>}</div>}
export function Choices({label,options,value,onChange}){return <fieldset className="choices"><legend>{label}</legend><div>{options.map(option=><Action key={option} kind={value===option?'tonal':'outline'} aria-pressed={value===option} onClick={()=>onChange(option)}>{option}</Action>)}</div></fieldset>}
