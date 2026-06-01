export let DB = { 
  Current: [], 
  Product: [], 
  Order: [], 
  OrderItem: [], 
  Payment: [], 
  CurrentGroup: [], 
  ProductGroup: [], 
  Offer: [],
  OfferItem: []  
};

export function loadDB() {
  const keys = ['Current', 'Product', 'Order', 'OrderItem', 'Payment', 'CurrentGroup', 'ProductGroup', 'Offer', 'OfferItem'];
  keys.forEach(k => {
    try { DB[k] = JSON.parse(localStorage.getItem('e3_' + k)) || []; } catch(e) { DB[k] = []; }
  });
}

export function saveDB() {
  Object.keys(DB).forEach(k => {
    localStorage.setItem('e3_' + k, JSON.stringify(DB[k]));
  });
}