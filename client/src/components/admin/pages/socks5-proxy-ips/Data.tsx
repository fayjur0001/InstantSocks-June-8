


export const COUNTRY_REGION_MAP: Record<string, string> = {
  
  US: "usa",
  
  AG: "america", AR: "america", AW: "america", VG: "america",
  BS: "america", BB: "america", BZ: "america", BM: "america",
  BO: "america", BR: "america", CA: "america", KY: "america",
  CL: "america", CO: "america", CR: "america", CU: "america",
  CW: "america", DM: "america", DO: "america", EC: "america",
  SV: "america", GF: "america", GP: "america", GT: "america",
  GY: "america", HT: "america", HN: "america", JM: "america",
  MQ: "america", MX: "america", NI: "america", PA: "america",
  PY: "america", PE: "america", PR: "america", KN: "america",
  LC: "america", VC: "america", SR: "america", TT: "america",
  TC: "america", UY: "america", VE: "america", MF: "america",
  
  AL: "europe", AD: "europe", AM: "europe", AT: "europe",
  AZ: "europe", BY: "europe", BE: "europe", BA: "europe",
  BG: "europe", HR: "europe", CY: "europe", CZ: "europe",
  DK: "europe", EE: "europe", FI: "europe", FR: "europe",
  GE: "europe", DE: "europe", GR: "europe", HU: "europe",
  IS: "europe", IE: "europe", IT: "europe", KZ: "europe",
  XK: "europe", LV: "europe", LI: "europe", LT: "europe",
  LU: "europe", MK: "europe", MT: "europe", MD: "europe",
  MC: "europe", ME: "europe", NL: "europe", NO: "europe",
  PL: "europe", PT: "europe", RO: "europe", RU: "europe",
  SM: "europe", RS: "europe", SK: "europe", SI: "europe",
  ES: "europe", SE: "europe", CH: "europe", TR: "europe",
  UA: "europe", GB: "europe", VA: "europe",
  
  AF: "asia", BH: "asia", BD: "asia", BT: "asia",
  BN: "asia", KH: "asia", CN: "asia",
  HK: "asia", IN: "asia", ID: "asia", IR: "asia",
  IQ: "asia", IL: "asia", JP: "asia", JO: "asia",
  KW: "asia", KG: "asia", LA: "asia", LB: "asia",
  MO: "asia", MY: "asia", MV: "asia", MN: "asia",
  MM: "asia", NP: "asia", KP: "asia", OM: "asia",
  PK: "asia", PS: "asia", PH: "asia", QA: "asia",
  SA: "asia", SG: "asia", KR: "asia", LK: "asia",
  SY: "asia", TW: "asia", TJ: "asia", TH: "asia",
  TL: "asia", TM: "asia", AE: "asia", UZ: "asia",
  VN: "asia", YE: "asia",
  
  AU: "oceania", FJ: "oceania", GU: "oceania", KI: "oceania",
  MH: "oceania", FM: "oceania", NR: "oceania", NC: "oceania",
  NZ: "oceania", PW: "oceania", PG: "oceania", PF: "oceania",
  WS: "oceania", SB: "oceania", TO: "oceania", TV: "oceania",
  VU: "oceania",
  
  DZ: "africa", AO: "africa", BJ: "africa", BW: "africa",
  BF: "africa", BI: "africa", CM: "africa", CV: "africa",
  CF: "africa", TD: "africa", KM: "africa", CG: "africa",
  CD: "africa", CI: "africa", DJ: "africa", EG: "africa",
  GQ: "africa", ER: "africa", SZ: "africa", ET: "africa",
  GA: "africa", GM: "africa", GH: "africa", GN: "africa",
  GW: "africa", KE: "africa", LS: "africa", LR: "africa",
  LY: "africa", MG: "africa", MW: "africa", ML: "africa",
  MR: "africa", MU: "africa", YT: "africa", MA: "africa",
  MZ: "africa", NA: "africa", NE: "africa", NG: "africa",
  RW: "africa", ST: "africa", SN: "africa", SC: "africa",
  SL: "africa", SO: "africa", ZA: "africa", SS: "africa",
  SD: "africa", TZ: "africa", TG: "africa", TN: "africa",
  UG: "africa", EH: "africa", ZM: "africa", ZW: "africa",
};


export const REGION_LABELS: Record<string, string> = {
  usa:     "USA",
  america: "America",
  europe:  "Europe",
  oceania: "AU,Oceania",
  asia:    "Asia",
  africa:  "Africa",
};


export const REGION_ORDER = [
  "usa",
  "america",
  "europe",
  "oceania",
  "asia",
  "africa",
];


export const COUNTRY_NAMES: Record<string, string> = {
  US: "USA", AG: "Antigua", AR: "Argentina", AW: "Aruba", VG: "B.V.I.",
  BS: "Bahamas", BB: "Barbados", BZ: "Belize", BM: "Bermuda", BO: "Bolivia",
  BR: "Brazil", CA: "Canada", KY: "Cayman", CL: "Chile", CO: "Colombia",
  CR: "Costa Rica", CU: "Cuba", CW: "Curacao", DM: "Dominica",
  DO: "Dom. Rep.", EC: "Ecuador", SV: "Salvador", GF: "Fr. Guiana",
  GP: "Guadeloupe", GT: "Guatemala", GY: "Guyana", HT: "Haiti",
  HN: "Honduras", JM: "Jamaica", MQ: "Martinique", MX: "Mexico",
  NI: "Nicaragua", PA: "Panama", PY: "Paraguay", PE: "Peru",
  PR: "Puerto R.", KN: "S. Kitts", LC: "S. Lucia", VC: "S. Vincent",
  SR: "Suriname", TT: "Trinidad", UY: "Uruguay", VE: "Venezuela",
  GB: "United Kingdom", DE: "Germany", FR: "France", NL: "Netherlands",
  PL: "Poland", ES: "Spain", IT: "Italy", SE: "Sweden", UA: "Ukraine",
  RU: "Russia", TR: "Turkey", CH: "Switzerland", BE: "Belgium",
  AT: "Austria", PT: "Portugal", CZ: "Czech Rep.", RO: "Romania",
  HU: "Hungary", GR: "Greece", DK: "Denmark", FI: "Finland",
  NO: "Norway", SK: "Slovakia", BG: "Bulgaria", HR: "Croatia",
  LT: "Lithuania", LV: "Latvia", EE: "Estonia", IE: "Ireland",
  RS: "Serbia", BA: "Bosnia", AL: "Albania", MK: "N. Macedonia",
  JP: "Japan", CN: "China", IN: "India", KR: "South Korea",
  SG: "Singapore", TH: "Thailand", HK: "Hong Kong", TW: "Taiwan",
  ID: "Indonesia", MY: "Malaysia", VN: "Vietnam", PH: "Philippines",
  BD: "Bangladesh", PK: "Pakistan", AE: "UAE", SA: "Saudi Arabia",
  IL: "Israel", IQ: "Iraq", IR: "Iran", KW: "Kuwait", QA: "Qatar",
  BH: "Bahrain", OM: "Oman", JO: "Jordan", LB: "Lebanon",
  AU: "Australia", NZ: "New Zealand", FJ: "Fiji", PG: "Papua N.G.",
  WS: "Samoa", TO: "Tonga", VU: "Vanuatu", SB: "Solomon Is.",
  ZA: "South Africa", NG: "Nigeria", KE: "Kenya", EG: "Egypt",
  GH: "Ghana", ET: "Ethiopia", TZ: "Tanzania", UG: "Uganda",
  MA: "Morocco", DZ: "Algeria", TN: "Tunisia", LY: "Libya",
  SD: "Sudan", AO: "Angola", CM: "Cameroon", CI: "Ivory Coast",
  SN: "Senegal", MZ: "Mozambique", ZM: "Zambia", ZW: "Zimbabwe",
};


import type { Country } from "@/types/admin/socks5-proxy-ips";

export const COUNTRIES: Country[] = Object.entries(COUNTRY_REGION_MAP).map(
  ([code, regionId]) => ({
    code,
    name: COUNTRY_NAMES[code] ?? code,
    count: 0,   
    regionId,
  })
);