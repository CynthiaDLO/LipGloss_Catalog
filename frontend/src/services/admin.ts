import { fetchWithAuth } from "../utils/api";

export interface AdminDashboard {
  brands:number; products:number; active_products:number; low_stock_products:number;
  users:number; orders:number; pending_orders:number; sales_total:string;
}
export interface AdminUser {
  id:number; username:string; email:string; is_active:boolean; is_staff:boolean;
  first_name:string; last_name:string; date_joined:string;
}
export interface AdminBrand {id:number;name:string;description:string}
export interface AdminProduct {id:number; name:string;shade:string;price:string;description:string;stock:number|null;is_active:boolean;brand:{id:number;name:string};image:string|null}
export const getDashboard=()=>fetchWithAuth<AdminDashboard>("/api/admin/dashboard/");
export const getAdminUsers=()=>fetchWithAuth<AdminUser[]>("/api/admin/users/");
export const setUserActive=(id:number,is_active:boolean)=>fetchWithAuth<AdminUser>(`/api/admin/users/${id}/status/`,{method:"PATCH",body:JSON.stringify({is_active})});
export const getAdminBrands=()=>fetchWithAuth<AdminBrand[]>("/api/brands/");
export const createBrand=(name:string,description:string)=>fetchWithAuth<AdminBrand>("/api/brands/",{method:"POST",body:JSON.stringify({name,description})});
export const getAdminProducts=async()=>{
  const data=await fetchWithAuth<{results:AdminProduct[]}|AdminProduct[]>("/api/lipglosses/?page_size=30&page=1");
  return Array.isArray(data)?data:data.results;
};
export const createProduct=(data:{brand_id:number;name:string;shade:string;price:string;stock:number|null;description:string;is_active:boolean})=>fetchWithAuth<AdminProduct>("/api/lipglosses/",{method:"POST",body:JSON.stringify(data)});
export const updateProduct=(id:number,data:Partial<{price:string;stock:number|null;is_active:boolean}>)=>fetchWithAuth<AdminProduct>(`/api/lipglosses/${id}/`,{method:"PATCH",body:JSON.stringify(data)});

export const getAdminBrand=(id:number)=>fetchWithAuth<AdminBrand>(`/api/brands/${id}/`);
export const updateBrand=(id:number,data:Partial<Pick<AdminBrand,"name"|"description">>)=>fetchWithAuth<AdminBrand>(`/api/brands/${id}/`,{method:"PATCH",body:JSON.stringify(data)});
export const deleteBrand=(id:number)=>fetchWithAuth<void>(`/api/brands/${id}/`,{method:"DELETE"});
export const deleteProduct=(id:number)=>fetchWithAuth<void>(`/api/lipglosses/${id}/`,{method:"DELETE"});
export const editProduct=(id:number,data:Partial<{brand_id:number;name:string;shade:string;price:string;description:string;stock:number|null;is_active:boolean}>)=>fetchWithAuth<AdminProduct>(`/api/lipglosses/${id}/`,{method:"PATCH",body:JSON.stringify(data)});
