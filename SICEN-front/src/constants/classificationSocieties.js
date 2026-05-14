/**
 * Sociedades de clasificación para el desplegable de alta de buque.
 * Orden alfabético (español) tras deduplicar.
 */
const RAW_CLASSIFICATION_SOCIETIES = `
American Bureau of Shipping (ABS)
Bureau Veritas (BV)
China Classification Society (CCS)
Croatian Register of Shipping (CRS)
Indian Register of Shipping (IRS / IRClass)
Korean Register (KR)
Lloyd’s Register (LR)
Nippon Kaiji Kyokai (ClassNK / NK)
Polish Register of Shipping (PRS)
Registro Italiano Navale (RINA)
Türk Loydu (TL)
Russian Maritime Register of Shipping (RMRS / RS)
Hellenic Register of Shipping (HRS)
Phoenix Register of Shipping (PHRS)
International Naval Surveys Bureau (INSB)
Bureau Colombo (BC)
Shipping Register of Ukraine (SRU)
Vietnam Register (VR)
Biro Klasifikasi Indonesia (BKI)
Tasneef Emirates Classification Society (TASNEEF)
Registro Cubano de Buques (RCB)
Shipping Register of Serbia (SRS)
Registro Internacional Naval (RINAVE)
Overseas Marine Certification Services (OMCS)
Isthmus Bureau of Shipping (IBS)
Ships Classification Malaysia (SCM)
Naval Register of Shipping (NRS)
Universal Shipping Bureau (USB)
Ukrainian Register of Shipping (URS)
Bulgarian Register of Shipping (BRS)
Registro Naval Venezolano (RNV)
Registro Naval Argentino (RNA)
Germanischer Lloyd (GL)
Det Norske Veritas (DNV)
Austrian Veritas (AV)
Adriatic Veritas (ADV)
Yugoslav Register of Shipping (YRS)
International Register of Shipping (IRS)
Panama Register Corporation (PRC)
Mediterranean Shipping Register (MSR)
Maritime Lloyd Georgia (MLG)
Registro Brasileiro de Navios e Aeronaves (RBNA)
Indian Maritime Register (IMR)
European Bureau of Shipping (EBS)
Global Marine Bureau (GMB)
Cosmos Marine Bureau (CMB)
Alpha Marine Surveyors (AMS)
Continental Register of Shipping (CRS)
International Maritime Classification Society (IMCS)
Royal Marine Classification Society (RMCS)
Oceanic Marine Classification Society (OMCS)
Maritime Bureau of Shipping (MBS)
International Ship Classification (ISC)
Naval Technical Bureau (NTB)
World Marine Classification Society (WMCS)
Sea Transport Classification Society (STCS)
Asian Classification Society (ACS)
African Register of Shipping (AFRS)
Middle East Classification Society (MECS)
Baltic Register of Shipping (BRS)
Global Register of Shipping (GRS)
International Bureau of Classification (IBC)
Universal Classification Society (UCS)
Marine Technical Bureau (MTB)
Ocean Register of Shipping (ORS)
National Shipping Register (NSR)
Prime Marine Classification Society (PMCS)
International Marine Certification Institute (IMCI)
Otra
`;

function parseLines(raw) {
  const lines = raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const line of lines) {
    if (seen.has(line)) continue;
    seen.add(line);
    out.push(line);
  }
  return out;
}

export const CLASSIFICATION_SOCIETY_OPTIONS = parseLines(
  RAW_CLASSIFICATION_SOCIETIES
).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
