/* Pure chess rules; kept independent from campaign and fiction. */
'use strict';
window.ChatrajnorakChess = (() => {
function mkr(side,type,id,moved=false){return {side,type,id,moved};}
const emptyBoard=()=>Array.from({length:8},()=>Array(8).fill(null));
const cloneBoard=b=>b.map(row=>row.slice());
const inside=(r,c)=>r>=0&&r<8&&c>=0&&c<8;
function getKing(b,s){for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(b[r][c]?.type==='K'&&b[r][c]?.side===s)return {r,c};return null;}
function attacked(b,r,c,by){
  for(let a=0;a<8;a++)for(let d=0;d<8;d++){
    const p=b[a][d];if(!p||p.side!==by)continue;const dr=r-a,dc=c-d;
    if(p.type==='P'&&dr===(by==='w'?-1:1)&&Math.abs(dc)===1)return true;
    if(p.type==='N'&&((Math.abs(dr)===1&&Math.abs(dc)===2)||(Math.abs(dr)===2&&Math.abs(dc)===1)))return true;
    if(p.type==='K'&&Math.max(Math.abs(dr),Math.abs(dc))===1)return true;
    const slide=(p.type==='Q'||(p.type==='B'&&Math.abs(dr)===Math.abs(dc))||(p.type==='R'&&(dr===0||dc===0)));
    if(slide&&(dr===0||dc===0||Math.abs(dr)===Math.abs(dc))&&(dr!==0||dc!==0)){
      const vr=Math.sign(dr),vc=Math.sign(dc);let tr=a+vr,tc=d+vc,clear=true;
      while(tr!==r||tc!==c){if(b[tr][tc]){clear=false;break;}tr+=vr;tc+=vc;}if(clear)return true;
    }
  }return false;
}
function inCheck(b,s){const k=getKing(b,s);return !k||attacked(b,k.r,k.c,s==='w'?'b':'w');}
function pseudo(b,st,r,c){
  const p=b[r][c];if(!p)return [];const moves=[];const enemy=p.side==='w'?'b':'w';
  function add(rr,cc,special){if(!inside(rr,cc))return false;const target=b[rr][cc];if(target?.side===p.side)return false;if(target?.type==='K')return false;
    if(p.type==='P'&&(rr===0||rr===7)){for(const q of ['Q','R','B','N'])moves.push({r,c,tr:rr,tc:cc,special,promotion:q});}
    else moves.push({r,c,tr:rr,tc:cc,special});return !target;
  }
  if(p.type==='P'){
    const dir=p.side==='w'?-1:1,first=p.side==='w'?6:1;
    if(inside(r+dir,c)&&!b[r+dir][c]){add(r+dir,c);if(r===first&&!p.moved&&!b[r+2*dir][c])add(r+2*dir,c,'double');}
    for(const dc of [-1,1]){const rr=r+dir,cc=c+dc;if(!inside(rr,cc))continue;if(b[rr][cc]?.side===enemy)add(rr,cc);
      else if(st.ep&&st.ep.r===rr&&st.ep.c===cc&&b[r][cc]?.type==='P'&&b[r][cc]?.side===enemy)add(rr,cc,'enpassant');}
  }else if(p.type==='N'){
    for(const [a,d] of [[1,2],[1,-2],[-1,2],[-1,-2],[2,1],[2,-1],[-2,1],[-2,-1]])add(r+a,c+d);
  }else if(p.type==='K'){
    for(let a=-1;a<=1;a++)for(let d=-1;d<=1;d++)if(a||d)add(r+a,c+d);
    const home=p.side==='w'?7:0;
    if(r===home&&c===4&&!p.moved&&!inCheck(b,p.side)){
      for(const rookC of [7,0]){const rook=b[home][rookC],step=rookC===7?1:-1;
        if(!rook||rook.type!=='R'||rook.side!==p.side||rook.moved)continue;
        let open=true;for(let col=4+step;col!==rookC;col+=step)if(b[home][col]){open=false;break;}
        if(open&&!attacked(b,home,4+step,enemy)&&!attacked(b,home,4+2*step,enemy))add(home,4+2*step,rookC===7?'castleK':'castleQ');
      }
    }
  }else{
    const dirs=p.type==='B'?[[1,1],[1,-1],[-1,1],[-1,-1]]:p.type==='R'?[[1,0],[-1,0],[0,1],[0,-1]]:[[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
    for(const [vr,vc] of dirs){let rr=r+vr,cc=c+vc;while(inside(rr,cc)){const shouldContinue=add(rr,cc);if(!shouldContinue)break;rr+=vr;cc+=vc;}}
  }return moves;
}
function apply(b,st,m){
 const next=cloneBoard(b),p=b[m.r][m.c];const capture=m.special==='enpassant'?b[m.r][m.tc]:b[m.tr][m.tc];
 next[m.r][m.c]=null;next[m.tr][m.tc]={...p,moved:true,type:m.promotion||p.type};
 if(m.special==='enpassant')next[m.r][m.tc]=null;
 if(m.special==='castleK'||m.special==='castleQ'){
   const rc=m.special==='castleK'?7:0,to=m.special==='castleK'?5:3;
   next[m.r][rc]=null;next[m.r][to]={...b[m.r][rc],moved:true};
 }
 const ep=m.special==='double'?{r:(m.r+m.tr)/2,c:m.c}:null;
 const halfmove=p.type==='P'||capture?0:(st.halfmove||0)+1;
 return {board:next,ep,turn:p.side==='w'?'b':'w',halfmove,captured:capture||null};
}
function legal(b,st,side){let out=[];for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(b[r][c]?.side===side){for(const m of pseudo(b,st,r,c)){const nb=apply(b,st,m);if(!inCheck(nb.board,side))out.push(m);}}return out;}
function hash(st){let s='';for(const row of st.board)for(const p of row)s+=p?p.side+p.type+(p.moved?'1':'0'):'.';return s+'|'+st.turn+'|'+(st.ep?st.ep.r+','+st.ep.c:'-');}
function drawCause(st){const possible=legal(st.board,st,st.turn);if(!possible.length&&!inCheck(st.board,st.turn))return 'stalemate';if(st.halfmove>=100)return 'fifty-move rule';if((st.counts?.[hash(st)]||0)>=3)return 'threefold repetition';if(insufficient(st.board))return 'insufficient mating material';return null;}
function insufficient(b){const a=[];for(const row of b)for(const p of row)if(p&&p.type!=='K')a.push(p);if(a.length===0)return true;if(a.length===1&&['B','N'].includes(a[0].type))return true;return false;}

return {mkr,emptyBoard,cloneBoard,inside,getKing,attacked,inCheck,pseudo,apply,legal,hash,drawCause,insufficient};
})();
