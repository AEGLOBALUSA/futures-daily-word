import{j as t}from"./index-1sau-2ot.js";import{a as e,a7 as i}from"./vendor-icons-BxM4ouND.js";import{o as n,s as r}from"./audioPlayer-B9vKSrZQ.js";function f(){const[s,a]=e.useState(!1);return e.useEffect(()=>n(o=>{a(o==="playing")}),[]),s?t.jsxs("button",{onClick:o=>{o.stopPropagation(),r()},style:{position:"fixed",bottom:"calc(80px + env(safe-area-inset-bottom, 0px))",right:16,zIndex:999,display:"flex",alignItems:"center",gap:8,background:"#6B1A22",color:"#fff",border:"none",borderRadius:999,padding:"10px 18px",fontSize:13,fontWeight:700,fontFamily:"var(--font-sans)",cursor:"pointer",boxShadow:"0 4px 20px rgba(107,26,34,0.4)",animation:"stopAllPulse 2s ease-in-out infinite",letterSpacing:"0.02em"},children:[t.jsx(i,{size:18}),"Stop All Audio",t.jsx("style",{children:`
        @keyframes stopAllPulse {
          0%, 100% { box-shadow: 0 4px 20px rgba(107,26,34,0.4); }
          50% { box-shadow: 0 4px 28px rgba(107,26,34,0.65); }
        }
      `})]}):null}export{f as S};
