import { getOrdersForUser } from './mockOrders'

const TABLES_KEY='mr-biriyani-demo-tables'
const read=(key,fallback)=>{try{const value=JSON.parse(localStorage.getItem(key)||'null');return value??fallback}catch{return fallback}}
const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value))
export const POS_MENU=[
 {id:'pos-biryani-1',name:'Hyderabadi Dum Biryani',price:170,category:'Biryani'},
 {id:'pos-biryani-2',name:'Mr. Biryani Special',price:200,category:'Biryani'},
 {id:'pos-biryani-3',name:'Fry-Piece Chicken Biryani',price:180,category:'Biryani'},
 {id:'pos-biryani-4',name:'Mutton Biryani',price:240,category:'Biryani'},
 {id:'pos-biryani-5',name:'Egg Biryani',price:130,category:'Biryani'},
 {id:'pos-biryani-6',name:'Paneer Biryani',price:160,category:'Biryani'},
 {id:'pos-starter-1',name:'Andhra Chicken Fry',price:180,category:'Starters'},
 {id:'pos-starter-2',name:'Chicken Ghee Roast',price:180,category:'Starters'},
 {id:'pos-starter-3',name:'Apollo Fish Fry',price:220,category:'Starters'},
 {id:'pos-starter-4',name:'Mutton Pepper Dry',price:240,category:'Starters'},
 {id:'pos-drink-1',name:'Soft Drink',price:40,category:'Beverages'},
 {id:'pos-drink-2',name:'Water Bottle',price:20,category:'Beverages'}
]
const seedTables=Array.from({length:12},(_,i)=>({id:'T'+String(i+1).padStart(2,'0'),seats:i<4?2:i<10?4:6,status:'Available'}))
export const getTables=()=>read(TABLES_KEY,null)|| (write(TABLES_KEY,seedTables),seedTables)
export const updateTableStatus=(id,status)=>{const tables=getTables().map(table=>table.id===id?{...table,status}:table);write(TABLES_KEY,tables);return tables}
export const getAllDemoOrders=()=>read('mr-biriyani-mock-orders',[])
export const updateDemoOrder=(id,patch)=>{const orders=getAllDemoOrders().map(order=>order.id===id?{...order,...patch,updatedAt:new Date().toISOString()}:order);write('mr-biriyani-mock-orders',orders);return orders}
export const getAllDemoReservations=()=>read('mr-biriyani-mock-reservations',[])
export const getDashboardMetrics=()=>{const orders=getAllDemoOrders(),today=new Date().toDateString(),todayOrders=orders.filter(o=>new Date(o.createdAt).toDateString()===today);return {totalOrders:orders.length,todayOrders:todayOrders.length,revenue:orders.filter(o=>o.status!=='Cancelled').reduce((sum,o)=>sum+Number(o.total||0),0),pending:orders.filter(o=>!['Completed','Cancelled'].includes(o.status)).length,activeTables:getTables().filter(t=>t.status==='Occupied').length,tableCount:getTables().length}}
export const createPosOrder=({items,total,fulfilment,tableId,customerName,phone,payment,staffId})=>{const orders=getAllDemoOrders();const order={id:globalThis.crypto?.randomUUID?.()||'pos-'+Date.now(),userId:staffId,customerName:customerName||'Walk-in customer',phone:phone||'',items,total,subtotal:total,fulfilment,tableId:tableId||null,payment,status:'Received',source:'POS',createdAt:new Date().toISOString()};write('mr-biriyani-mock-orders',[...orders,order]);if(tableId)updateTableStatus(tableId,'Occupied');return order}
