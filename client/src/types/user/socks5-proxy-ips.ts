export interface Region {
  id: string;
  label: string;
  count: number;
}

export interface Country {
  code: string;
  name: string;
  count: number;
  regionId: string;
}

export interface ProxyItem {
  id: string;
  ip: string;
  domain?: string;        
  countryCode: string;
  country: string;
  state: string;
  city: string;
  isp: string;
  zip: string;
  speed: string;
  ping: number;
  type: string;
  added: string;
  price: number;
  originalPrice?: number; 
  
  org: string;
  zone?: string;          
  dns?: string;           
  blacklisted: boolean;
  usage?: string;         
  connectionString: string;
  udp?: boolean;
  rating?: number;
}

export interface FilterState {
  ip: string;
  domain: string;
  state: string;
  city: string;
  isp: string;
  zip: string;
  type: string;
}

export type ProxyTypeTab = "all" | "residential" | "hosting" | "non-backlisted";

export interface ProxySidebarProps {
  proxy: ProxyItem | null;
  cartCount: number;
  onShowCart: () => void;
}

export interface CartModalProps {
  items: ProxyItem[];
  onClose: () => void;
  onRemove: (id: string) => void;
  onBuyOne: (proxy: ProxyItem) => void;
  onBuyAll: () => void;
  onEmpty: () => void;
  isLoading?: boolean;
}