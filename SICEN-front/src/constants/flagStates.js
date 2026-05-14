/**
 * Estados de bandera (país) para el desplegable de alta de buque.
 */
const RAW_FLAG_STATES = `
Albania
Alemania
Angola
Antigua y Barbuda
Arabia Saudita
Argelia
Argentina
Armenia
Australia
Austria
Azerbaiyán
Bahamas
Bahrein
Bangladesh
Barbados
Bélgica
Belice
Benín
Bielorrusia
Bolivia
Bosnia y Herzegovina
Botsuana
Brasil
Brunei Darussalam
Bulgaria
Cabo Verde
Camboya
Camerún
Canadá
Chile
China
Chipre
Colombia
Comoras
Congo
Corea del Norte
Corea del Sur
Costa de Marfil
Costa Rica
Croacia
Cuba
Dinamarca
Dominica
Ecuador
Egipto
El Salvador
Emiratos Árabes Unidos
Eritrea
Eslovaquia
Eslovenia
España
Estados Unidos
Estonia
Etiopía
Federación de Rusia
Fiyi
Filipinas
Finlandia
Francia
Gabón
Gambia
Georgia
Ghana
Grecia
Granada
Guatemala
Guinea
Guinea-Bissau
Guinea Ecuatorial
Guyana
Haití
Honduras
Hungría
India
Indonesia
Irán
Iraq
Irlanda
Islandia
Islas Cook
Israel
Italia
Jamaica
Japón
Jordania
Kazajstán
Kenia
Kirguistán
Kiribati
Kuwait
Letonia
Líbano
Liberia
Libia
Lituania
Luxemburgo
Macedonia del Norte
Madagascar
Malasia
Malawi
Maldivas
Malta
Marruecos
Mauricio
Mauritania
México
Mónaco
Mongolia
Montenegro
Mozambique
Myanmar
Namibia
Nauru
Nepal
Nicaragua
Nigeria
Noruega
Nueva Zelanda
Omán
Países Bajos
Pakistán
Palau
Panamá
Papúa Nueva Guinea
Paraguay
Perú
Polonia
Portugal
Qatar
Reino Unido
República Centroafricana
República Checa
República Democrática del Congo
República Dominicana
República de Moldova
Rumanía
Samoa
San Cristóbal y Nieves
San Marino
San Vicente y las Granadinas
Santa Lucía
Santo Tomé y Príncipe
Senegal
Serbia
Seychelles
Sierra Leona
Singapur
Siria
Somalia
Sri Lanka
Sudáfrica
Sudán
Suecia
Suiza
Surinam
Tailandia
Tanzania
Timor Oriental
Togo
Tonga
Trinidad y Tobago
Túnez
Türkiye
Turkmenistán
Tuvalu
Ucrania
Uganda
Uruguay
Vanuatu
Venezuela
Vietnam
Yemen
Yibuti
Zambia
Zimbabue
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

export const FLAG_STATE_OPTIONS = parseLines(RAW_FLAG_STATES);
