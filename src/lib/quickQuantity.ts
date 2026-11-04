// Inventory API supports positive quantities with at most three decimal places.
export function parseQuantity(value: string): {amount:number; unit:string} | null {
  const match=value.trim().match(/^(\d+(?:\.\d{1,3})?)\s+(.+)$/); // can turn this into a const
  if(!match)return null;
  const amount=Number(match[1]);
  if(!Number.isFinite(amount)||amount<=0||amount>999999999.999)return null; // turn this 999999999.999 into a const
  return {amount,unit:match[2]};
}
export function adjustQuantity(amount:number, delta:1|-1):number {
  return Math.max(0,Math.round((amount+delta)*1000)/1000);
}
