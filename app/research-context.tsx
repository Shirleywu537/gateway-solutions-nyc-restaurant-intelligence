'use client';
import {createContext,useContext,useState,type ReactNode} from 'react';
export type ResearchContext={concept:string;borough:string;budget:number};
const initial:ResearchContext={concept:'Café & bakery',borough:'All boroughs',budget:8000};
const Context=createContext({research:initial,setResearch:(_v:ResearchContext)=>{}});
export function ResearchProvider({children}:{children:ReactNode}){const[research,setResearch]=useState(initial);return <Context.Provider value={{research,setResearch}}>{children}</Context.Provider>}
export function useResearch(){return useContext(Context)}
